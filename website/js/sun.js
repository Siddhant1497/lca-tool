/* Sun study: a small campus model lit by the real sun position for Ahmedabad.
   Solar geometry uses declination, the equation of time and the IST meridian. */
(function () {
  var cv = document.getElementById("sun-canvas");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d");
  var hero = document.getElementById("sunhero");
  var RAD = Math.PI / 180, LAT = 23.02 * RAD, LON = 72.57;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // camera: looking from the south-east, 30 degrees above the ground
  var AC = 150 * RAD, PHI = 30 * RAD;
  var RX = -Math.cos(AC), RY = Math.sin(AC);
  var UX = -Math.sin(AC) * Math.sin(PHI), UY = -Math.cos(AC) * Math.sin(PHI), UZ = Math.cos(PHI);
  var DX = Math.sin(AC) * Math.cos(PHI), DY = Math.cos(AC) * Math.cos(PHI), DZ = Math.sin(PHI);
  var RD = 98, RG = 80;                    // dome and ground radius, metres
  var W = 0, H = 0, S = 1, CX = 0, CY = 0;

  function P(x, y, z) { return [CX + S * (x * RX + y * RY), CY - S * (x * UX + y * UY + z * UZ)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return "rgba(" + Math.round(clamp(c[0], 0, 255)) + "," + Math.round(clamp(c[1], 0, 255)) + "," + Math.round(clamp(c[2], 0, 255)) + "," + (a === undefined ? 1 : a) + ")"; }

  function sunAt(n, clock) {
    var B = 2 * Math.PI * (n - 81) / 364;
    var eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    var Hh = 15 * (clock + (4 * (LON - 82.5) + eot) / 60 - 12) * RAD;
    var dec = 23.45 * Math.sin(2 * Math.PI * (284 + n) / 365) * RAD;
    var s = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(Hh);
    var alt = Math.asin(s);
    var c = (Math.sin(dec) - s * Math.sin(LAT)) / (Math.cos(alt) * Math.cos(LAT));
    var az = Math.acos(clamp(c, -1, 1)); if (Hh > 0) az = 2 * Math.PI - az;
    return { alt: alt / RAD, az: az / RAD, v: [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)] };
  }
  function dayOfYear(d) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5); }

  // ---- the campus (metres; x east, y north, z up) ----
  var boxes = [
    { x0: -42, x1: -2, y0: -10, y1: 30, z0: 0, z1: 8, c: [214, 210, 200], k: "podium" },
    { x0: -36, x1: -12, y0: -2, y1: 24, z0: 8, z1: 68, c: [226, 223, 215], k: "tower" },
    { x0: -30, x1: -20, y0: 6, y1: 16, z0: 68, z1: 72, c: [188, 185, 178], k: "plain" },
    { x0: 14, x1: 30, y0: -26, y1: 34, z0: 0, z1: 26, c: [190, 98, 60], k: "brick" },
    { x0: -40, x1: -14, y0: -46, y1: -30, z0: 0, z1: 7, c: [234, 231, 223], k: "pav" },
    { x0: 20, x1: 30, y0: -48, y1: -40, z0: 0, z1: 4.5, c: [203, 164, 110], k: "plain" }
  ];
  var trees = [[6, -18], [6, -6], [6, 6], [6, 18], [6, 30], [-4, -22], [-8, -54], [3, -46], [-50, -16], [-52, 4], [-50, 22],
    [40, -10], [42, 8], [40, 26], [-20, 44], [0, 46], [20, 48], [44, -30], [-30, -58], [-56, -34]];
  var objs = boxes.slice();
  trees.forEach(function (t, i) {
    var r = 3 + (i * 7 % 5) * 0.3, h = 6.5 + (i * 5 % 4) * 0.7;
    objs.push({ tree: true, x: t[0], y: t[1], r: r, h: h, x0: t[0] - r, x1: t[0] + r, y0: t[1] - r, y1: t[1] + r, z0: 0, z1: h + r });
  });
  // painter's order: far objects first (the camera sees the top, east and south faces)
  (function () {
    function inFront(a, b) { return a.x0 >= b.x1 || a.y1 <= b.y0 || a.z0 >= b.z1; }
    var rest = objs.slice(), out = [];
    while (rest.length) {
      var pick = 0;
      for (var i = 0; i < rest.length; i++) {
        var ok = true;
        for (var j = 0; j < rest.length && ok; j++) if (i !== j && inFront(rest[i], rest[j]) && !inFront(rest[j], rest[i])) ok = false;
        if (ok) { pick = i; break; }
      }
      out.push(rest.splice(pick, 1)[0]);
    }
    objs = out;
    objs.forEach(function (o, i) { o.delay = i * 45; o.g = reduce ? 1 : 0; });
  })();

  function hull(pts) {
    pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var n = pts.length, h = [], i, k = 0, t;
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    for (i = 0; i < n; i++) { while (k >= 2 && cr(h[k - 2], h[k - 1], pts[i]) <= 0) k--; h[k++] = pts[i]; }
    for (i = n - 2, t = k + 1; i >= 0; i--) { while (k >= t && cr(h[k - 2], h[k - 1], pts[i]) <= 0) k--; h[k++] = pts[i]; }
    h.length = k - 1; return h;
  }
  function addPoly(pts) { if (pts.length < 3) return; ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  function hash(a, b, c) { var x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); }

  // ---- lighting state for the current frame ----
  var L = { v: [0, 0, 1], alt: 45, az: 180, beam: 1, day: 1, warm: 0, night: false, hi: "22,21,20" };
  function lit(c, nd, k) {
    var f = (k || 0.6) + 0.44 * L.beam * Math.max(0, nd), w = L.warm * L.beam * (nd > 0 ? 1 : 0.35);
    var r = c[0] * f * (1 + 0.05 * w), g = c[1] * f * (1 - 0.02 * w), b = c[2] * f * (1 - 0.15 * w);
    if (L.day < 1) { var n = 1 - L.day; r += (c[0] * 0.2 + 10 - r) * n; g += (c[1] * 0.21 + 12 - g) * n; b += (c[2] * 0.27 + 22 - b) * n; }
    return css([r, g, b]);
  }

  // ---- drawing ----
  function quad(a, b, c, d, fill) { ctx.beginPath(); addPoly([a, b, c, d]); ctx.fillStyle = fill; ctx.fill(); }
  function line(a, b, stroke, w) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke(); }
  // a rectangle on a south face (y fixed) or an east face (x fixed)
  function sRect(y, xa, xb, za, zb, fill) { quad(P(xa, y, za), P(xb, y, za), P(xb, y, zb), P(xa, y, zb), fill); }
  function eRect(x, ya, yb, za, zb, fill) { quad(P(x, ya, za), P(x, yb, za), P(x, yb, zb), P(x, ya, zb), fill); }
  var GLASS = [112, 142, 158], DARKGLASS = [62, 72, 82], BRICK = [180, 83, 42], SAGE = [150, 168, 120], PV = [40, 54, 74];
  function windowFill(c, nd, i, j, seed, share) {
    if (L.day < 0.6 && hash(i, j, seed) < share) return css([246, 199, 107], 0.35 + 0.65 * (1 - L.day));
    return lit(c, nd, 0.62);
  }

  // shadows that other buildings cast on one face of box b (f: 0 top, 1 east, 2 south)
  function faceShadow(b, f, zt, pts) {
    var v = L.v, n = f === 0 ? v[2] : f === 1 ? v[0] : -v[1];
    if (n < 0.03 || L.beam <= 0.02) return;
    ctx.save(); ctx.beginPath(); addPoly(pts); ctx.clip(); ctx.beginPath();
    for (var q = 0; q < boxes.length; q++) {
      var c = boxes[q]; if (c === b || c.g <= 0.01) continue;
      var x0 = c.x0, x1 = c.x1, y0 = c.y0, y1 = c.y1, z0 = c.z0, z1 = c.z0 + (c.z1 - c.z0) * c.g, plane;
      if (f === 0) { plane = zt; if (z1 <= plane + 0.01) continue; z0 = Math.max(z0, plane); }
      else if (f === 1) { plane = b.x1; if (x1 <= plane + 0.01) continue; x0 = Math.max(x0, plane); }
      else { plane = b.y0; if (y0 >= plane - 0.01) continue; y1 = Math.min(y1, plane); }
      var out = [];
      for (var m = 0; m < 8; m++) {
        var px = m & 1 ? x1 : x0, py = m & 2 ? y1 : y0, pz = m & 4 ? z1 : z0;
        var d = (f === 0 ? pz - plane : f === 1 ? px - plane : plane - py) / n;
        out.push(P(px - v[0] * d, py - v[1] * d, pz - v[2] * d));
      }
      addPoly(hull(out));
    }
    ctx.fillStyle = "rgba(26,24,44," + (0.34 * L.beam * L.day).toFixed(3) + ")"; ctx.fill(); ctx.restore();
  }

  function drawBox(b) {
    if (b.g <= 0.01) return;
    var v = L.v, x0 = b.x0, x1 = b.x1, y0 = b.y0, y1 = b.y1, z0 = b.z0, zt = b.z0 + (b.z1 - b.z0) * b.g, c = b.c, k = b.k, i, j, z, a;
    var edge = "rgba(" + L.hi + ",0.22)", lw = Math.max(1, S * 0.3);
    var top = [P(x0, y0, zt), P(x1, y0, zt), P(x1, y1, zt), P(x0, y1, zt)];
    var east = [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, zt), P(x1, y0, zt)];
    var south = [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, zt), P(x0, y0, zt)];
    var ne = v[0], ns = -v[1], nt = v[2];

    // east face
    ctx.beginPath(); addPoly(east); ctx.fillStyle = lit(c, ne); ctx.fill();
    if (k === "tower") {
      for (i = 0, z = z0; z + 3.4 <= zt; z += 4, i++) for (j = 0, a = y0 + 1; a + 3 <= y1; a += 4, j++) eRect(x1, a, Math.min(a + 4, y1 - 1), z + 0.9, z + 3.4, windowFill(GLASS, ne, i, j, 1, 0.42));
      for (a = y0 + 1; a <= y1 - 0.9; a += 2.6) line(P(x1, a, z0), P(x1, a, zt), lit(BRICK, ne, 0.72), lw);
    } else if (k === "brick") {
      for (i = 0, z = z0 + 1.2; z + 2.4 <= zt; z += 4.2, i++) for (j = 0, a = y0 + 1.4; a + 2.2 <= y1; a += 4, j++) eRect(x1, a, a + 2.2, z, z + 2.3, windowFill(DARKGLASS, ne, i, j, 2, 0.34));
    } else if (k === "podium" || k === "pav") {
      if (zt - z0 > 5) { eRect(x1, y0 + 2, y1 - 2, z0 + 1, zt - 1.6, windowFill(GLASS, ne, 0, 0, 3, 0.9)); for (a = y0 + 2; a <= y1 - 2; a += 4) line(P(x1, a, z0 + 1), P(x1, a, zt - 1.6), lit(c, ne), 1); }
    }
    faceShadow(b, 1, zt, east);
    ctx.beginPath(); addPoly(east); ctx.strokeStyle = edge; ctx.lineWidth = 0.8; ctx.stroke();

    // south face
    ctx.beginPath(); addPoly(south); ctx.fillStyle = lit(c, ns); ctx.fill();
    if (k === "tower") {
      for (i = 0, z = z0; z + 3.4 <= zt; z += 4, i++) {
        for (j = 0, a = x0 + 1; a + 3 <= x1; a += 4, j++) sRect(y0, a, Math.min(a + 4, x1 - 1), z + 0.9, z + 3.4, windowFill(GLASS, ns, i, j, 4, 0.42));
        line(P(x0 + 0.6, y0, z + 3.5), P(x1 - 0.6, y0, z + 3.5), lit(BRICK, ns, 0.72), lw);
        if (S > 2.5) line(P(x0 + 0.6, y0, z + 2.2), P(x1 - 0.6, y0, z + 2.2), lit(BRICK, ns, 0.72), lw);
      }
    } else if (k === "brick") {
      for (i = 0, z = z0 + 1.2; z + 2.4 <= zt; z += 4.2, i++) for (j = 0, a = x0 + 1.4; a + 2.2 <= x1; a += 3.7, j++) sRect(y0, a, a + 2.2, z, z + 2.3, windowFill(DARKGLASS, ns, i, j, 5, 0.34));
    } else if (k === "podium" || k === "pav") {
      if (zt - z0 > 5) { sRect(y0, x0 + 2, x1 - 2, z0 + 1, zt - 1.6, windowFill(GLASS, ns, 0, 1, 6, 0.9)); for (a = x0 + 2; a <= x1 - 2; a += 4) line(P(a, y0, z0 + 1), P(a, y0, zt - 1.6), lit(c, ns), 1); }
    }
    faceShadow(b, 2, zt, south);
    ctx.beginPath(); addPoly(south); ctx.strokeStyle = edge; ctx.lineWidth = 0.8; ctx.stroke();

    // top
    ctx.beginPath(); addPoly(top); ctx.fillStyle = lit(c, nt); ctx.fill();
    if (b.g > 0.98) {
      if (k === "brick") {
        quad(P(x0 + 1, y0 + 1, zt), P(x1 - 1, y0 + 1, zt), P(x1 - 1, y1 - 1, zt), P(x0 + 1, y1 - 1, zt), lit([196, 192, 184], nt));
        for (a = y0 + 3; a + 2.4 <= y1 - 2; a += 4) quad(P(x0 + 2.4, a, zt), P(x1 - 2.4, a, zt), P(x1 - 2.4, a + 2.4, zt), P(x0 + 2.4, a + 2.4, zt), lit(PV, nt, 0.8));
      } else if (k === "pav") {
        quad(P(x0 + 1.2, y0 + 1.2, zt), P(x1 - 1.2, y0 + 1.2, zt), P(x1 - 1.2, y1 - 1.2, zt), P(x0 + 1.2, y1 - 1.2, zt), lit(SAGE, nt));
      } else if (k === "podium") {
        quad(P(x0 + 4, y0 + 1.6, zt), P(x1 - 4, y0 + 1.6, zt), P(x1 - 4, y0 + 5.6, zt), P(x0 + 4, y0 + 5.6, zt), lit(SAGE, nt));
        quad(P(x1 - 8, y0 + 9, zt), P(x1 - 2, y0 + 9, zt), P(x1 - 2, y1 - 3, zt), P(x1 - 8, y1 - 3, zt), lit(SAGE, nt));
      }
    }
    faceShadow(b, 0, zt, top);
    ctx.beginPath(); addPoly(top); ctx.strokeStyle = edge; ctx.lineWidth = 0.8; ctx.stroke();
  }

  function drawTree(o) {
    if (o.g <= 0.01) return;
    var h = o.h * o.g, r = o.r * (0.4 + 0.6 * o.g) * S, base = P(o.x, o.y, 0), c = P(o.x, o.y, h);
    line(base, c, lit([92, 76, 60], 0.3), Math.max(1, S * 0.5));
    ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, 6.2832); ctx.fillStyle = lit([104, 128, 92], 0, 0.72); ctx.fill();
    if (L.beam > 0.05) {
      var sx = L.v[0] * RX + L.v[1] * RY, sy = -(L.v[0] * UX + L.v[1] * UY + L.v[2] * UZ), m = Math.sqrt(sx * sx + sy * sy) || 1;
      ctx.beginPath(); ctx.arc(c[0] + sx / m * r * 0.3, c[1] + sy / m * r * 0.3, r * 0.64, 0, 6.2832); ctx.fillStyle = lit([132, 156, 106], 1, 0.66); ctx.fill();
    }
  }

  function groundEllipse(r, dy) { ctx.beginPath(); ctx.ellipse(CX, CY + (dy || 0), r * S, r * S * Math.sin(PHI), 0, 0, 6.2832); }
  function gRect(x0, x1, y0, y1, fill) { quad(P(x0, y0, 0), P(x1, y0, 0), P(x1, y1, 0), P(x0, y1, 0), fill); }

  function drawGround() {
    var v = L.v, i, o;
    groundEllipse(RD); ctx.strokeStyle = "rgba(" + L.hi + ",0.2)"; ctx.lineWidth = 1; ctx.stroke();
    for (i = 0; i < 360; i += 15) {
      var a = i * RAD, r1 = i % 90 === 0 ? RD - 4 : RD - (i % 45 === 0 ? 2.6 : 1.4);
      line(P(Math.sin(a) * r1, Math.cos(a) * r1, 0), P(Math.sin(a) * RD, Math.cos(a) * RD, 0), "rgba(" + L.hi + ",0.4)", 1);
    }
    groundEllipse(RG, 5); ctx.fillStyle = lit([176, 172, 162], 0, 0.9); ctx.fill();
    groundEllipse(RG); ctx.fillStyle = lit([222, 219, 210], v[2], 0.74); ctx.fill();
    ctx.save(); groundEllipse(RG); ctx.clip();
    gRect(1, 11, -80, 80, lit([234, 231, 223], v[2], 0.74));
    gRect(-80, 80, -29, -26.5, lit([234, 231, 223], v[2], 0.74));
    gRect(-46, -1, -25, -12.5, lit([178, 192, 150], v[2], 0.74));
    gRect(34, 52, -24, 38, lit([178, 192, 150], v[2], 0.74));
    gRect(-60, -44, -44, 34, lit([178, 192, 150], v[2], 0.74));
    gRect(-26, 28, 38, 60, lit([178, 192, 150], v[2], 0.74));
    var pc = P(-6, -38, 0);
    ctx.beginPath(); ctx.ellipse(pc[0], pc[1], 6.5 * S, 6.5 * S * Math.sin(PHI), 0, 0, 6.2832); ctx.fillStyle = lit([150, 192, 208], v[2], 0.74); ctx.fill();
    // ground shadows, drawn as one shape so overlaps do not double up
    if (L.beam > 0.02 && v[2] > 0.005) {
      var vz = Math.max(v[2], 0.035); ctx.beginPath();
      for (i = 0; i < objs.length; i++) {
        o = objs[i]; if (o.g <= 0.01) continue; var out = [], m, d;
        if (o.tree) {
          var h = o.h * o.g, gx = o.x - v[0] * h / vz, gy = o.y - v[1] * h / vz, hl = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1, ux = v[0] / hl, uy = v[1] / hl, maj = Math.min(o.r / vz, o.r * 7);
          for (m = 0; m < 10; m++) { var th = m * 0.6283, ca = Math.cos(th) * maj, sa = Math.sin(th) * o.r; out.push(P(gx + ux * ca - uy * sa, gy + uy * ca + ux * sa, 0)); }
          out.push(P(o.x, o.y, 0));
        } else {
          var z1 = o.z0 + (o.z1 - o.z0) * o.g;
          for (m = 0; m < 8; m++) { var px = m & 1 ? o.x1 : o.x0, py = m & 2 ? o.y1 : o.y0, pz = m & 4 ? z1 : o.z0; d = pz / vz; out.push(P(px - v[0] * d, py - v[1] * d, 0)); }
        }
        addPoly(hull(out));
      }
      ctx.fillStyle = "rgba(26,24,44," + (0.3 * L.beam * L.day).toFixed(3) + ")"; ctx.fill();
    }
    ctx.restore();
    groundEllipse(RG); ctx.strokeStyle = "rgba(" + L.hi + ",0.3)"; ctx.lineWidth = 1; ctx.stroke();
  }

  // ---- sun paths, the sun itself and the page around it ----
  var today = dayOfYear(new Date());
  var st = { n: today, t: 16.5 }, arcs = {}, dragging = false, dpr = 1;
  function arc(n) {
    if (!arcs[n]) { var out = []; for (var h = 4.5; h <= 20.501; h += 1 / 12) { var s = sunAt(n, h); out.push({ t: h, alt: s.alt, v: s.v }); } arcs[n] = out; }
    return arcs[n];
  }
  function depth(v) { return v[0] * DX + v[1] * DY + v[2] * DZ; }
  function drawArc(n, front, main) {
    var a = arc(n), i, p, q;
    ctx.beginPath();
    for (i = 1; i < a.length; i++) {
      if (a[i].alt <= 0 || a[i - 1].alt <= 0) continue;
      if ((depth(a[i].v) >= 0) !== front) continue;
      p = P(a[i - 1].v[0] * RD, a[i - 1].v[1] * RD, a[i - 1].v[2] * RD); q = P(a[i].v[0] * RD, a[i].v[1] * RD, a[i].v[2] * RD);
      ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    }
    ctx.strokeStyle = "rgba(" + L.hi + "," + (main ? 0.62 : 0.17) + ")"; ctx.lineWidth = main ? 1.4 : 1; ctx.setLineDash(main ? [2, 5] : []); ctx.lineCap = "round"; ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = "butt";
    if (!main) return;
    ctx.font = "500 10.5px 'Geist Mono', ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (var h = 6; h <= 19; h++) {
      var s = sunAt(n, h); if (s.alt <= 1.5 || (depth(s.v) >= 0) !== front) continue;
      p = P(s.v[0] * RD, s.v[1] * RD, s.v[2] * RD);
      ctx.beginPath(); ctx.arc(p[0], p[1], h % 3 === 0 ? 2.6 : 1.6, 0, 6.2832); ctx.fillStyle = "rgba(" + L.hi + ",0.8)"; ctx.fill();
      if (h % 3 === 0) { var dx = p[0] - CX, dy = p[1] - (CY - 30 * S), m = Math.sqrt(dx * dx + dy * dy) || 1; ctx.fillStyle = "rgba(" + L.hi + ",0.62)"; ctx.fillText((h < 10 ? "0" : "") + h, p[0] + dx / m * 14, p[1] + dy / m * 13); }
    }
  }
  function sunXY() { return P(L.v[0] * RD, L.v[1] * RD, L.v[2] * RD); }
  function drawSun() {
    if (L.alt <= -0.6) return;
    var p = sunXY(), foot = P(L.v[0] * RD, L.v[1] * RD, 0), r = dragging ? 11 : 9;
    ctx.setLineDash([3, 4]); line(foot, p, "rgba(" + L.hi + ",0.45)", 1); ctx.setLineDash([]);
    var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 44);
    g.addColorStop(0, "rgba(233,162,59,0.55)"); g.addColorStop(1, "rgba(233,162,59,0)");
    ctx.beginPath(); ctx.arc(p[0], p[1], 44, 0, 6.2832); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.2832); ctx.fillStyle = "#E9A23B"; ctx.fill(); ctx.strokeStyle = "rgba(" + L.hi + ",0.9)"; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function drawCompass() {
    ctx.font = "600 11px 'Geist Mono', ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    [["N", 0, 1], ["E", 1, 0], ["S", 0, -1], ["W", -1, 0]].forEach(function (c) {
      var p = P(c[1] * (RD + 9), c[2] * (RD + 9), 0);
      ctx.fillStyle = c[0] === "N" ? (L.night ? "#E9A23B" : "#8E3D1C") : "rgba(" + L.hi + ",0.7)"; ctx.fillText(c[0], p[0], p[1]);
    });
  }

  var PAPER = [240, 239, 235], out = {
    time: document.getElementById("sun-time"), alt: document.getElementById("sun-alt"), az: document.getElementById("sun-az"), sh: document.getElementById("sun-shadow"),
    f: [document.getElementById("sf-n"), document.getElementById("sf-e"), document.getElementById("sf-s"), document.getElementById("sf-w")]
  };
  var range = document.getElementById("sun-range"), hint = document.getElementById("sun-hint");
  var PTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  function setText(el, s) { if (el && el.textContent !== s) el.textContent = s; }
  function render() {
    var s = sunAt(st.n, st.t), i;
    L.v = s.v; L.alt = s.alt; L.az = s.az;
    L.beam = clamp(s.alt / 9, 0, 1); L.day = clamp((s.alt + 4.5) / 5.5, 0, 1); L.warm = 0;
    var w = clamp(1 - s.alt / 14, 0, 1); w = w * w * (3 - 2 * w);
    var nf = clamp((-1 - s.alt) / 3.5, 0, 1);
    var top = mix(mix(PAPER, PAPER, w), [18, 21, 33], nf), bot = mix(mix(PAPER, PAPER, w), [46, 44, 70], nf);
    L.night = nf > 0.5; L.hi = L.night ? "243,238,230" : "22,21,20";
    if (hero) { hero.style.setProperty("--sky-top", css(top)); hero.style.setProperty("--sky-bot", css(bot)); }
    document.body.classList.toggle("sun-night", L.night);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    drawGround();
    if (s.alt > 0) line(P(0, 0, 0), P(s.v[0] * RD, s.v[1] * RD, 0), "rgba(" + L.hi + ",0.3)", 1);
    var others = [172, 355].filter(function (d) { return d !== st.n; });
    others.forEach(function (d) { drawArc(d, false, false); });
    drawArc(st.n, false, true);
    var behind = depth(s.v) < 0;
    if (behind) drawSun();
    for (i = 0; i < objs.length; i++) { if (objs[i].tree) drawTree(objs[i]); else drawBox(objs[i]); }
    others.forEach(function (d) { drawArc(d, true, false); });
    drawArc(st.n, true, true);
    if (!behind) drawSun();
    drawCompass();

    var hh = Math.floor(st.t + 1e-6), mm = Math.round((st.t - hh) * 60); if (mm === 60) { hh++; mm = 0; }
    setText(out.time, (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm);
    setText(out.alt, (s.alt < 0 ? "−" : "") + Math.abs(s.alt).toFixed(0) + "°");
    setText(out.az, s.az.toFixed(0) + "° " + PTS[Math.round(s.az / 22.5) % 16]);
    var len = s.alt > 0.5 ? 10 / Math.tan(s.alt * RAD) : -1;
    setText(out.sh, len < 0 ? "No sun" : len > 150 ? "150 m+" : len < 10 ? len.toFixed(1) + " m" : len.toFixed(0) + " m");
    [0, 90, 180, 270].forEach(function (fa, k) {
      var e = s.alt > 0 ? Math.max(0, Math.cos(s.alt * RAD) * Math.cos((s.az - fa) * RAD)) : 0;
      if (out.f[k]) out.f[k].style.width = (e * 100).toFixed(0) + "%";
    });
  }

  // ---- frame loop: runs only while something is changing ----
  var queued = false, t0 = 0, sweep = null;
  function ease(k) { return 1 - Math.pow(1 - k, 3); }
  function frame(ts) {
    queued = false; var busy = false, i;
    if (!t0) t0 = ts;
    for (i = 0; i < objs.length; i++) if (objs[i].g < 1) { objs[i].g = ease(clamp((ts - t0 - 150 - objs[i].delay) / 850, 0, 1)); if (objs[i].g < 1) busy = true; }
    if (sweep) {
      var k = clamp((ts - t0 - 500) / 2600, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      st.t = sweep.from + (sweep.to - sweep.from) * e; if (range) range.value = st.t;
      if (k >= 1) sweep = null; else busy = true;
    }
    render();
    if (busy) schedule();
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  function size() {
    var r = cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    S = Math.min((W - 40) / (2 * RD), (H - 48) / 134);
    var up = RD * UZ * S, down = RD * Math.sin(PHI) * S;
    CX = W / 2; CY = (H - up - down) / 2 + up + 6;
    schedule();
  }
  function afternoon(n) { var a = arc(n); for (var i = 0; i < a.length; i++) if (a[i].t > 13 && a[i].alt <= 24) return clamp(Math.round(a[i].t * 12) / 12, 5, 20); return 16.5; }
  function touched() { sweep = null; if (hint) hint.classList.add("gone"); }

  st.t = afternoon(st.n);
  if (!reduce) { var a0 = arc(st.n), from = 8; for (var q = 0; q < a0.length; q++) if (a0[q].alt > 8) { from = a0[q].t; break; } sweep = { from: from, to: st.t }; st.t = from; }
  if (range) { range.value = st.t; range.addEventListener("input", function () { touched(); st.t = +range.value; schedule(); }); }
  document.querySelectorAll(".sun-days button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".sun-days button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true"); touched();
      st.n = b.dataset.day === "today" ? today : +b.dataset.day; schedule();
    });
  });

  function nearest(e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, a = arc(st.n), best = null, bd = 1e9;
    for (var i = 0; i < a.length; i++) {
      if (a[i].alt < -3 || a[i].t < 5 || a[i].t > 20) continue;
      var p = P(a[i].v[0] * RD, a[i].v[1] * RD, a[i].v[2] * RD), d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
      if (d < bd) { bd = d; best = a[i]; }
    }
    return { s: best, d: Math.sqrt(bd) };
  }
  cv.addEventListener("pointerdown", function (e) {
    var n = nearest(e); if (!n.s || n.d > (e.pointerType === "mouse" ? 70 : 40)) return;
    dragging = true; cv.classList.add("drag"); touched();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    st.t = n.s.t; if (range) range.value = st.t; schedule();
  });
  cv.addEventListener("pointermove", function (e) {
    if (!dragging) return; var n = nearest(e); if (!n.s) return;
    st.t = n.s.t; if (range) range.value = st.t; schedule();
  });
  function drop() { if (dragging) { dragging = false; cv.classList.remove("drag"); schedule(); } }
  cv.addEventListener("pointerup", drop); cv.addEventListener("pointercancel", drop);

  if ("ResizeObserver" in window) new ResizeObserver(size).observe(cv); else window.addEventListener("resize", size);
  size();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
})();
