/* Home page: the six-step story, its sample figures, and small page behaviours. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function onScroll(fn) { var q = false; function run() { q = false; fn(); } function ask() { if (!q) { q = true; requestAnimationFrame(run); } } window.addEventListener("scroll", ask, { passive: true }); window.addEventListener("resize", ask); fn(); }

  // one shared tooltip for the figures
  var tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "status"); document.body.appendChild(tip);
  function showTip(e, text) { tip.textContent = text; tip.classList.add("on"); var x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8); tip.style.transform = "translate(" + Math.max(8, x) + "px," + (e.clientY - 34) + "px)"; }
  function hideTip() { tip.classList.remove("on"); }
  // pointer position inside a canvas drawn with object-fit: contain, left aligned
  function canvasPoint(cv, e) {
    var r = cv.getBoundingClientRect(), s = Math.min(r.width / cv.width, r.height / cv.height), oy = (r.height - cv.height * s) / 2;
    return [(e.clientX - r.left) / s, (e.clientY - r.top - oy) / s];
  }

  /* ---------- sticky pane ---------- */
  var story = document.querySelector(".story"), wind = null;
  if (story) {
    var pane = document.getElementById("story-pane"), steps = [].slice.call(story.querySelectorAll(".step"));
    var plates = steps.map(function (s) { return s.querySelector(".plate"); });
    var mq = window.matchMedia("(min-width: 961px) and (min-height: 600px)"), active = -1, dots = document.createElement("div");
    dots.className = "pane-dots"; dots.setAttribute("aria-hidden", "true"); dots.innerHTML = steps.map(function () { return "<i></i>"; }).join("");
    function setActive(i) {
      if (i === active) return; active = i;
      steps.forEach(function (s, k) { s.classList.toggle("on", k === i); });
      plates.forEach(function (p, k) { p.classList.toggle("on", k === i); });
      [].forEach.call(dots.children, function (d, k) { d.classList.toggle("on", k === i); });
      if (plates[i]) plates[i].classList.add("seen");
    }
    function pick() {
      if (!story.classList.contains("paned")) return;
      var mid = window.innerHeight * 0.5, best = 0, bd = 1e9;
      steps.forEach(function (s, k) { var r = s.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = k; } });
      var sr = story.getBoundingClientRect();
      if (sr.top < window.innerHeight * 0.9 && sr.bottom > 0) setActive(best);
    }
    function layout() {
      if (mq.matches) {
        story.classList.add("paned"); plates.forEach(function (p) { pane.appendChild(p); }); pane.appendChild(dots); active = -1; pick();
      } else {
        story.classList.remove("paned"); plates.forEach(function (p, k) { steps[k].appendChild(p); p.classList.remove("on"); });
        steps.forEach(function (s) { s.classList.remove("on"); }); if (dots.parentNode) dots.parentNode.removeChild(dots);
      }
    }
    if (mq.addEventListener) mq.addEventListener("change", layout); else mq.addListener(layout);
    layout(); onScroll(pick);
    if ("IntersectionObserver" in window) {
      var seen = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !story.classList.contains("paned")) e.target.classList.add("seen"); }); }, { threshold: 0.3 });
      plates.forEach(function (p) { seen.observe(p); });
    } else plates.forEach(function (p) { p.classList.add("seen"); });
  }

  /* ---------- Fig. 02: daylight on a floor plate ---------- */
  (function () {
    var cv = document.getElementById("cv-daylight"); if (!cv) return;
    var c = cv.getContext("2d"), FW = 48, FD = 30, PX = 18, OX = 48, OY = 30, N = 2;            // 2 cells per metre
    var core = { x0: 16, x1: 32, y0: 11, y1: 19 };
    var STOPS = [[31, 29, 27], [107, 46, 26], [180, 83, 42], [233, 162, 59], [251, 233, 183]];
    function lux(x, y) { return 60 + 1100 * Math.exp(-y / 3.6) + 2600 * Math.exp(-(FD - y) / 3.6) + 1800 * Math.exp(-x / 3.6) + 1800 * Math.exp(-(FW - x) / 3.6); }
    function ramp(v) { var t = clamp(Math.log(v / 100) / Math.log(20), 0, 1) * 4, i = Math.min(3, Math.floor(t)), f = t - i, a = STOPS[i], b = STOPS[i + 1]; return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * f) + "," + Math.round(a[1] + (b[1] - a[1]) * f) + "," + Math.round(a[2] + (b[2] - a[2]) * f) + ")"; }
    var cols = FW * N, rows = FD * N, i, j, lit = 0, occ = 0, cell = PX / N;
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var x = (i + 0.5) / N, y = (j + 0.5) / N, v = lux(x, y);
      c.fillStyle = ramp(v); c.fillRect(OX + i * cell, OY + j * cell, cell + 0.6, cell + 0.6);
      if (!(x > core.x0 && x < core.x1 && y > core.y0 && y < core.y1)) { occ++; if (v >= 300) lit++; }
    }
    // 300 lux contour (marching squares with linear interpolation)
    c.beginPath();
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var x0 = i / N, y0 = j / N, x1 = (i + 1) / N, y1 = (j + 1) / N, a = lux(x0, y0) - 300, b = lux(x1, y0) - 300, d = lux(x1, y1) - 300, e = lux(x0, y1) - 300, pts = [];
      if ((a > 0) !== (b > 0)) pts.push([x0 + (x1 - x0) * a / (a - b), y0]);
      if ((b > 0) !== (d > 0)) pts.push([x1, y0 + (y1 - y0) * b / (b - d)]);
      if ((e > 0) !== (d > 0)) pts.push([x0 + (x1 - x0) * e / (e - d), y1]);
      if ((a > 0) !== (e > 0)) pts.push([x0, y0 + (y1 - y0) * a / (a - e)]);
      if (pts.length >= 2) { c.moveTo(OX + pts[0][0] * PX, OY + pts[0][1] * PX); c.lineTo(OX + pts[1][0] * PX, OY + pts[1][1] * PX); }
    }
    c.setLineDash([7, 6]); c.strokeStyle = "#fff"; c.lineWidth = 2.5; c.stroke(); c.setLineDash([]);
    // core, columns, outline, labels
    c.fillStyle = "#F4F2EC"; c.fillRect(OX + core.x0 * PX, OY + core.y0 * PX, (core.x1 - core.x0) * PX, (core.y1 - core.y0) * PX);
    c.strokeStyle = "#161514"; c.lineWidth = 1.5; c.strokeRect(OX + core.x0 * PX, OY + core.y0 * PX, (core.x1 - core.x0) * PX, (core.y1 - core.y0) * PX);
    c.fillStyle = "rgba(255,255,255,.55)";
    for (i = 8; i < FW; i += 8) for (j = 7.5; j < FD; j += 7.5) if (!(i >= core.x0 && i <= core.x1 && j >= core.y0 && j <= core.y1)) c.fillRect(OX + i * PX - 4, OY + j * PX - 4, 8, 8);
    c.strokeStyle = "#161514"; c.lineWidth = 3; c.strokeRect(OX, OY, FW * PX, FD * PX);
    c.font = "500 19px 'Geist Mono', ui-monospace, monospace"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#161514"; c.fillText("Core", OX + 24 * PX, OY + 15 * PX);
    c.fillStyle = "#fff"; c.fillText("300 lux", OX + 24 * PX, OY + 25.4 * PX);
    c.fillStyle = "#5B5954"; c.fillText("N", OX + FW * PX + 24, OY + 30); c.fillText("S", OX + FW * PX + 24, OY + FD * PX - 14);
    c.beginPath(); c.moveTo(OX + FW * PX + 24, OY + 2); c.lineTo(OX + FW * PX + 18, OY + 14); c.lineTo(OX + FW * PX + 30, OY + 14); c.closePath(); c.fill();
    c.fillRect(OX, OY + FD * PX + 14, 10 * PX, 3); c.textAlign = "left"; c.fillText("10 m", OX + 10 * PX + 10, OY + FD * PX + 16);
    var kpi = document.getElementById("dl-kpi"); if (kpi && occ) kpi.textContent = Math.round(lit / occ * 100) + "%";
    cv.addEventListener("pointermove", function (ev) {
      var p = canvasPoint(cv, ev), mx = (p[0] - OX) / PX, my = (p[1] - OY) / PX;
      if (mx < 0 || mx > FW || my < 0 || my > FD) return hideTip();
      if (mx > core.x0 && mx < core.x1 && my > core.y0 && my < core.y1) return showTip(ev, "Core: lifts, stairs and services");
      var l = lux(mx, my); showTip(ev, (l >= 1000 ? Math.round(l / 50) * 50 : Math.round(l / 10) * 10).toLocaleString("en-IN") + " lux");
    });
    cv.addEventListener("pointerleave", hideTip);
  })();

  /* ---------- Fig. 03: wind around a campus (2D potential flow) ---------- */
  (function () {
    var cv = document.getElementById("cv-wind"); if (!cv) return;
    var c = cv.getContext("2d"), WW = cv.width, HH = cv.height, G = 10, nx = WW / G + 1, ny = HH / G + 1, i, j, k;
    var blocks = [[250, 120, 380, 230], [250, 330, 380, 440], [540, 200, 640, 360], [760, 90, 860, 190]];
    var psi = new Float32Array(nx * ny), solid = new Uint8Array(nx * ny);
    function inBlock(x, y) { for (var b = 0; b < blocks.length; b++) { var q = blocks[b]; if (x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3]) return b + 1; } return 0; }
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) { k = j * nx + i; psi[k] = j * G; var b = inBlock(i * G, j * G); if (b) { solid[k] = 1; psi[k] = (blocks[b - 1][1] + blocks[b - 1][3]) / 2; } }
    for (var it = 0; it < 900; it++) for (j = 1; j < ny - 1; j++) for (i = 1; i < nx - 1; i++) { k = j * nx + i; if (!solid[k]) psi[k] += 1.9 * ((psi[k - 1] + psi[k + 1] + psi[k - nx] + psi[k + nx]) / 4 - psi[k]); }
    function vel(x, y) {
      var fi = clamp(x / G, 0, nx - 2.001), fj = clamp(y / G, 1, ny - 2.001), i0 = Math.floor(fi), j0 = Math.floor(fj), a = fi - i0, b = fj - j0;
      function at(ii, jj) { var kk = jj * nx + ii; return [(psi[kk + nx] - psi[kk - nx]) / (2 * G), -(psi[kk + 1] - psi[Math.max(kk - 1, jj * nx)]) / (ii ? 2 * G : G)]; }
      var p = at(i0, j0), q = at(i0 + 1, j0), r = at(i0, j0 + 1), s = at(i0 + 1, j0 + 1);
      return [(p[0] * (1 - a) + q[0] * a) * (1 - b) + (r[0] * (1 - a) + s[0] * a) * b, (p[1] * (1 - a) + q[1] * a) * (1 - b) + (r[1] * (1 - a) + s[1] * a) * b];
    }
    function spd(x, y) { var v = vel(x, y); return Math.sqrt(v[0] * v[0] + v[1] * v[1]); }
    // background: speed shading, single blue hue light to dark
    var bg = document.createElement("canvas"); bg.width = WW; bg.height = HH; var bc = bg.getContext("2d");
    var A = [238, 243, 245], B = [156, 195, 212], C = [31, 127, 166], D = [15, 77, 105], peak = 0;
    for (j = 0; j < HH; j += 5) for (i = 0; i < WW; i += 5) {
      if (inBlock(i + 2.5, j + 2.5)) continue;
      var sp = spd(i + 2.5, j + 2.5), t = sp < 1 ? clamp(sp, 0, 1) : clamp(1 + (sp - 1) / 0.35, 1, 3), n = Math.min(2, Math.floor(t)), f = t - n, P0 = [A, B, C, D][n], P1 = [A, B, C, D][n + 1];
      bc.fillStyle = "rgb(" + Math.round(P0[0] + (P1[0] - P0[0]) * f) + "," + Math.round(P0[1] + (P1[1] - P0[1]) * f) + "," + Math.round(P0[2] + (P1[2] - P0[2]) * f) + ")"; bc.fillRect(i, j, 5.5, 5.5);
      var near = false; for (var q = 0; q < blocks.length && !near; q++) { var bb = blocks[q]; if (i > bb[0] - 36 && i < bb[2] + 36 && j > bb[1] - 36 && j < bb[3] + 36) near = true; }
      if (!near && sp > peak) peak = sp;
    }
    blocks.forEach(function (q, n) {
      bc.fillStyle = "#3A3632"; bc.fillRect(q[0], q[1], q[2] - q[0], q[3] - q[1]);
      bc.fillStyle = "rgba(255,255,255,.8)"; bc.font = "500 17px 'Geist Mono', ui-monospace, monospace"; bc.textAlign = "center"; bc.textBaseline = "middle";
      bc.fillText("B" + (n + 1), (q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
    });
    bc.fillStyle = "#161514"; bc.font = "500 17px 'Geist Mono', ui-monospace, monospace"; bc.textAlign = "left"; bc.fillText("Wind →", 16, 22);
    var kpi = document.getElementById("wind-kpi"); if (kpi && peak) kpi.textContent = "×" + peak.toFixed(1);

    var parts = [], NP = 300;
    function seed(p, anywhere) { p.x = anywhere ? Math.random() * WW : Math.random() * 20; p.y = 10 + Math.random() * (HH - 20); p.age = 0; p.life = 120 + Math.random() * 160; p.tr = [[p.x, p.y]]; }
    for (k = 0; k < NP; k++) { var p0 = {}; seed(p0, true); while (inBlock(p0.x, p0.y)) seed(p0, true); parts.push(p0); }
    function step() {
      parts.forEach(function (p) {
        var v = vel(p.x, p.y); p.x += v[0] * 2.4; p.y += v[1] * 2.4; p.age++;
        p.tr.push([p.x, p.y]); if (p.tr.length > 16) p.tr.shift();
        if (p.x > WW || p.y < 2 || p.y > HH - 2 || p.age > p.life || inBlock(p.x, p.y)) seed(p, false);
      });
    }
    function draw() {
      c.drawImage(bg, 0, 0); c.lineCap = "round";
      parts.forEach(function (p) {
        if (p.tr.length < 2) return; c.beginPath(); c.moveTo(p.tr[0][0], p.tr[0][1]);
        for (var m = 1; m < p.tr.length; m++) c.lineTo(p.tr[m][0], p.tr[m][1]);
        var a = Math.min(1, p.age / 20, (p.life - p.age) / 20); c.strokeStyle = "rgba(22,21,20," + (0.5 * a).toFixed(2) + ")"; c.lineWidth = 1.4; c.stroke();
      });
    }
    function streamlines() {
      c.drawImage(bg, 0, 0); c.strokeStyle = "rgba(22,21,20,.5)"; c.lineWidth = 1.4;
      for (var y = 25; y < HH; y += 30) { var x = 2, yy = y; c.beginPath(); c.moveTo(x, yy); for (var s = 0; s < 500 && x < WW; s++) { var v = vel(x, yy); x += v[0] * 3; yy += v[1] * 3; if (inBlock(x, yy)) break; c.lineTo(x, yy); } c.stroke(); }
    }
    var running = false, visible = false;
    function loop() { if (!visible) { running = false; return; } step(); draw(); requestAnimationFrame(loop); }
    if (reduce || !("IntersectionObserver" in window)) streamlines();
    else {
      for (k = 0; k < 8; k++) step(); draw();
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting && cv.offsetParent !== null; if (visible && !running) { running = true; requestAnimationFrame(loop); } }, { threshold: 0.05 }).observe(cv);
      wind = function () { var r = cv.getBoundingClientRect(); var vis = r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && getComputedStyle(cv.closest(".plate")).visibility !== "hidden"; visible = vis; if (vis && !running) { running = true; requestAnimationFrame(loop); } };
      onScroll(wind);
    }
    cv.addEventListener("pointermove", function (ev) {
      var p = canvasPoint(cv, ev); if (p[0] < 0 || p[0] > WW || p[1] < 0 || p[1] > HH) return hideTip();
      var b = inBlock(p[0], p[1]); showTip(ev, b ? "Building B" + b : "Wind speed ×" + spd(p[0], p[1]).toFixed(1) + " of the approach flow");
    });
    cv.addEventListener("pointerleave", hideTip);
  })();

  /* ---------- Fig. 05: decarbonisation wedges ---------- */
  (function () {
    var box = document.getElementById("sv-carbon"); if (!box) return;
    var NS = "http://www.w3.org/2000/svg", Wv = 640, Hv = 340, L0 = 40, R0 = 470, T0 = 14, B0 = 300, Y0 = 2024, Y1 = 2030, MAXV = 14;
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 " + Wv + " " + Hv); svg.setAttribute("preserveAspectRatio", "xMinYMid meet"); box.appendChild(svg);
    function el(t, a, txt) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; }
    function X(y) { return L0 + (y - Y0) / (Y1 - Y0) * (R0 - L0); } function Y(v) { return B0 - v / MAXV * (B0 - T0); }
    var years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
    // measure ramps: share of the 2030 saving delivered in each year
    var W = [
      { n: "Energy efficiency", v: 1.3, c: "#1F7FA6", r: [0, .25, .45, .65, .8, .92, 1] },
      { n: "Rooftop solar", v: 1.1, c: "#D9962B", r: [0, .1, .45, .7, .85, 1, 1] },
      { n: "Green power purchase", v: 2.1, c: "#3E9463", r: [0, 0, .2, .45, .7, .9, 1] },
      { n: "Fuel switch", v: 0.7, c: "#7B5FC4", r: [0, 0, 0, .3, .6, .85, 1] }
    ];
    var tot = years.map(function (y, i) { return W.reduce(function (s, w) { return s + w.v * w.r[i]; }, 0); });
    var rem = tot.map(function (t) { return 12.4 - t; });
    [0, 4, 8, 12].forEach(function (v) { el("line", { x1: L0, x2: R0, y1: Y(v), y2: Y(v), stroke: v ? "#E6E3DC" : "#161514", "stroke-width": 1 }); el("text", { x: L0 - 8, y: Y(v) + 4, "text-anchor": "end", class: "ax" }, v); });
    years.forEach(function (y) { el("text", { x: X(y), y: B0 + 20, "text-anchor": "middle", class: "ax" }, y); });
    function area(lo, hi) { var d = "M" + years.map(function (y, i) { return X(y) + "," + Y(hi[i]); }).join("L"); for (var i = years.length - 1; i >= 0; i--) d += "L" + X(years[i]) + "," + Y(lo[i]); return d + "Z"; }
    var marks = [];
    marks.push({ d: area(years.map(function () { return 0; }), rem), c: "#4A4643", n: "Remaining emissions", vals: rem });
    var lo = rem.slice();
    W.forEach(function (w) { var hi = lo.map(function (v, i) { return v + w.v * w.r[i]; }); marks.push({ d: area(lo, hi), c: w.c, n: w.n, w: w, mid: (lo[6] + hi[6]) / 2 }); lo = hi; });
    marks.forEach(function (m) {
      var p = el("path", { d: m.d, fill: m.c, stroke: "#fff", "stroke-width": 2, "stroke-linejoin": "round", class: "wedge" });
      var text = m.w ? m.n + ": −" + m.w.v.toFixed(1) + " ktCO₂e a year by 2030" : "Remaining Scope 1 and 2: " + m.vals[6].toFixed(1) + " ktCO₂e in 2030";
      p.addEventListener("pointermove", function (e) { showTip(e, text); }); p.addEventListener("pointerleave", hideTip);
    });
    el("line", { x1: X(Y0), x2: X(Y1), y1: Y(12.4), y2: Y(12.4), stroke: "#161514", "stroke-dasharray": "4 4", "stroke-width": 1.2 });
    el("text", { x: X(Y0) + 4, y: Y(12.4) - 8, class: "lb" }, "Business as usual 12.4");
    el("text", { x: X(Y0) + 12, y: Y(4), class: "lb inv" }, "Remaining emissions");
    // direct labels at the right edge, nudged apart so they never collide
    var labs = W.map(function (w, i) { return { y: Y(marks[i + 1].mid), t: w.n + "  −" + w.v.toFixed(1), c: w.c }; });
    labs.sort(function (a, b) { return a.y - b.y; }); for (var i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 17) labs[i].y = labs[i - 1].y + 17;
    labs.forEach(function (l) { el("rect", { x: R0 + 12, y: l.y - 5, width: 10, height: 10, rx: 2, fill: l.c }); el("text", { x: R0 + 28, y: l.y + 4, class: "lb" }, l.t); });
    el("text", { x: R0 + 12, y: Y(rem[6] / 2) + 4, class: "lb" }, "7.2 in 2030");
  })();

  /* ---------- count-up numbers ---------- */
  (function () {
    var els = document.querySelectorAll("[data-count]"); if (!els.length || reduce || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        var el = e.target, n = +el.dataset.count, suf = el.dataset.suffix || "", t0 = performance.now();
        (function tick(t) { var k = clamp((t - t0) / 1400, 0, 1), v = Math.round(n * (1 - Math.pow(1 - k, 3))); el.textContent = v + suf; if (k < 1) requestAnimationFrame(tick); })(t0);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { el.textContent = "0" + (el.dataset.suffix || ""); io.observe(el); });
  })();

  /* ---------- parallax on a few photos ---------- */
  (function () {
    if (reduce) return; var els = [].slice.call(document.querySelectorAll("[data-par]")); if (!els.length) return;
    onScroll(function () {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = (el.parentNode).getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
        var off = (r.top + r.height / 2 - vh / 2) * +el.dataset.par;
        el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)" + (el.tagName === "IMG" ? " scale(1.14)" : "");
      });
    });
  })();

  /* ---------- manifesto: words light up as it scrolls through ---------- */
  (function () {
    var p = document.getElementById("mani-text"); if (!p || reduce) return;
    var words = p.textContent.trim().split(/\s+/), keys = { "actually": 1, "does.": 1 };
    p.innerHTML = words.map(function (w) { return '<span class="w' + (keys[w] ? " key" : "") + '">' + w + "</span>"; }).join(" ");
    p.setAttribute("aria-label", words.join(" ")); p.classList.add("words");
    var spans = p.querySelectorAll(".w");
    onScroll(function () {
      var r = p.getBoundingClientRect(), vh = window.innerHeight, k = clamp((vh * 0.88 - r.top) / (vh * 0.5), 0, 1), n = Math.round(k * spans.length);
      spans.forEach(function (s, i) { s.classList.toggle("lit", i < n); });
    });
  })();

  /* ---------- SustainHub screens ---------- */
  (function () {
    var img = document.getElementById("hub-img"), cap = document.getElementById("hub-cap"), btns = document.querySelectorAll(".hubtabs button"); if (!img || !btns.length) return;
    btns.forEach(function (b) {
      var pre = new Image(); pre.src = b.dataset.src;
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        img.classList.add("swap");
        setTimeout(function () { img.src = b.dataset.src; img.alt = b.dataset.alt; if (cap) cap.textContent = b.dataset.cap; img.classList.remove("swap"); }, reduce ? 0 : 220);
      });
    });
  })();

  /* ---------- sector panels ---------- */
  (function () {
    var items = document.querySelectorAll(".acc-item"); if (!items.length) return;
    function open(it) { items.forEach(function (x) { x.classList.toggle("on", x === it); }); }
    items.forEach(function (it) { it.addEventListener("mouseenter", function () { open(it); }); it.addEventListener("focus", function () { open(it); }); });
  })();
})();
