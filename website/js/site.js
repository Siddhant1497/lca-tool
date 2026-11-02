(function () {
  var header = document.querySelector(".header");
  function onScroll() { if (header && !header.classList.contains("always")) header.classList.toggle("solid", window.scrollY > 40); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var btn = document.querySelector(".menu-btn"), nav = document.querySelector(".nav");
  if (btn && nav) btn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.textContent = open ? "Close" : "Menu";
    header.classList.add("solid");
  });

  // Fade sections in as they arrive. Anything already on screen stays visible.
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
      io.observe(el);
    });
  }

  // Enquiry form: opens the visitor's email app with the request filled in.
  var form = document.getElementById("enquiry");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = document.getElementById("form-msg");
    if (!form.name.value.trim() || !form.email.value.trim()) { msg.textContent = "Please add your name and email so we can reply."; return; }
    var body = "Name: " + form.name.value + "\nEmail: " + form.email.value + "\nCompany: " + form.company.value +
      "\nService: " + form.service.value + "\nLocation and size: " + form.size.value + "\n\n" + form.message.value;
    msg.textContent = "Your email app should open with the request filled in. If it doesn't, write to info@verdeaxis.com.";
    window.location.href = "mailto:info@verdeaxis.com?subject=" + encodeURIComponent("Feasibility review request") + "&body=" + encodeURIComponent(body);
  });
})();

/* ---------- Rating system finder ---------- */
(function () {
  var root = document.getElementById("finder");
  if (!root) return;
  var state = { type: "office", goal: "global", stage: "design" };
  var NAMES = {
    leedNew: ["LEED BD+C", "The most recognised rating among multinational tenants, global investors and their RFPs."],
    leedOM: ["LEED O+M", "Certifies how an operating building performs, using a year of real energy, water and waste data."],
    igbcNew: ["IGBC Green New Buildings", "One of India's most widely used ratings, run by CII, with strong recognition among Indian developers, banks and buyers."],
    igbcFactory: ["IGBC Green Factory Buildings", "Written for manufacturing plants, covering process energy, water and the working environment, not only the building."],
    igbcHomes: ["IGBC Green Homes", "The common choice for Indian housing projects and the buyers who compare them."],
    igbcExisting: ["IGBC Green Existing Buildings", "Certifies operating buildings in India based on measured performance and upgrades."],
    griha: ["GRIHA", "India's national rating, developed with the Ministry of New and Renewable Energy and often specified for government and public buildings."],
    edge: ["EDGE", "IFC's rating: at least 20% less energy, water and embodied energy than a local baseline, assessed in a free online app. Quick, low-cost and recognised by green lenders."],
    well: ["WELL", "Focused on the health of the people inside: air, water, light, comfort and mind. Usually paired with a green rating."],
    fitwel: ["Fitwel", "A lighter health and wellbeing certification, practical for existing offices and portfolios."]
  };
  function pick() {
    var t = state.type, g = state.goal, s = state.stage, main, also;
    var operating = s === "operating";
    if (g === "health") { main = t === "office" && !operating ? "well" : "fitwel"; also = main === "well" ? "fitwel" : "well"; }
    else if (t === "public") { main = "griha"; also = operating ? "igbcExisting" : "igbcNew"; }
    else if (g === "global") { main = operating ? "leedOM" : "leedNew"; also = t === "factory" ? "igbcFactory" : (operating ? "igbcExisting" : "edge"); }
    else if (g === "cost") { main = "edge"; also = t === "factory" ? "igbcFactory" : (t === "homes" ? "igbcHomes" : (operating ? "igbcExisting" : "igbcNew")); }
    else { // India-wide recognition
      if (t === "factory") main = "igbcFactory"; else if (t === "homes") main = "igbcHomes"; else main = operating ? "igbcExisting" : "igbcNew";
      also = t === "homes" ? "edge" : "griha";
    }
    return { main: main, also: also };
  }
  function render() {
    var r = pick();
    document.getElementById("finder-name").textContent = NAMES[r.main][0];
    document.getElementById("finder-why").textContent = NAMES[r.main][1];
    document.getElementById("finder-also").innerHTML = "<b>Also worth comparing:</b> " + NAMES[r.also][0] + ". " + NAMES[r.also][1];
  }
  root.querySelectorAll(".opts").forEach(function (group) {
    var key = group.dataset.key;
    group.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        group.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true"); state[key] = b.dataset.v; render();
      });
    });
  });
  render();
})();

/* ---------- Shading lab: real sun angles for Ahmedabad ---------- */
(function () {
  var svg = document.getElementById("lab-svg");
  if (!svg) return;
  var rad = Math.PI / 180, LAT = 23.02 * rad, DOY = [21, 52, 80, 111, 141, 172, 202, 233, 264, 294, 325, 355];
  var st = { hour: 17, month: 4, facade: 270 };
  function sun(m, h) {
    var dec = 23.45 * Math.sin(2 * Math.PI * (284 + DOY[m]) / 365) * rad, H = 15 * (h - 12) * rad;
    var s = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(H), alt = Math.asin(s);
    var c = (Math.sin(dec) - s * Math.sin(LAT)) / (Math.cos(alt) * Math.cos(LAT));
    var az = Math.acos(Math.max(-1, Math.min(1, c))) / rad; if (H > 0) az = 360 - az;
    return { alt: alt / rad, az: az };
  }
  var NS = "http://www.w3.org/2000/svg";
  function el(t, a) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; }
  function fmt(h) { var a = Math.floor(h), m = Math.round((h - a) * 60) % 60; return (a < 10 ? "0" : "") + a + ":" + (m < 10 ? "0" : "") + m; }
  function render() {
    var s = sun(st.month, st.hour), g = ((s.az - st.facade + 540) % 360) - 180, prof = null, sh, note;
    if (s.alt <= 0) { sh = 1; note = "The sun is below the horizon."; }
    else if (Math.abs(g) >= 90) { sh = 1; note = "The sun is behind this façade, so the glass sits in its own shade."; }
    else {
      var t = Math.tan(s.alt * rad) / Math.cos(g * rad); prof = Math.atan(t) / rad; sh = Math.min(1, t);
      note = sh > 0.9 ? "High sun: horizontal fins this deep block nearly all of it." :
        sh < 0.5 ? "Low sun: horizontal fins shade less than half the glass. This façade needs vertical fins, a jaali or a deeper screen." :
        "Partly shaded. The model tells us whether deeper fins or better glass pays back.";
    }
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var gx = 250, top = 30, gap = 52, depth = 52, n = 5, i;
    for (i = 0; i < n - 1; i++) {
      var y0 = top + i * gap + 4, h = gap - 4;
      el("rect", { x: gx, y: y0, width: 6, height: h, fill: "#E9A23B" });
      el("rect", { x: gx, y: y0, width: 6, height: h * sh, fill: "#5F5A54" });
      if (prof !== null && sh < 1) { var lt = y0 + h * sh, dy = 70 * Math.tan(prof * rad); el("polygon", { points: (gx + 6) + "," + lt + " " + (gx + 6) + "," + (y0 + h) + " " + (gx + 76) + "," + (y0 + h + dy) + " " + (gx + 76) + "," + (lt + dy), fill: "#E9A23B", opacity: 0.22 }); }
    }
    for (i = 0; i < n; i++) el("rect", { x: gx - depth, y: top + i * gap, width: depth, height: 4, fill: "#B4532A" });
    if (prof !== null) {
      var tp = Math.tan(prof * rad);
      for (i = 0; i < n - 1; i++) { var tx = gx - depth, ty = top + i * gap + 4; el("line", { x1: tx - 170, y1: ty - 170 * tp, x2: gx, y2: Math.min(ty + depth * tp, top + (i + 1) * gap), stroke: "#E9A23B", "stroke-dasharray": "3 4" }); }
      var x0 = gx - depth, yy = top + gap + 4, cp = Math.cos(prof * rad), sp = Math.sin(prof * rad), d = Math.min(170, (yy - 16) / Math.max(sp, .01), (x0 - 22) / Math.max(cp, .01));
      el("circle", { cx: x0 - d * cp, cy: yy - d * sp, r: 13, fill: "#E9A23B" });
    }
    el("text", { x: 20, y: 280, fill: "#5F5A54", "font-size": 12, "font-family": "Figtree, Arial" }).textContent = "Outside";
    el("text", { x: 320, y: 280, fill: "#5F5A54", "font-size": 12, "font-family": "Figtree, Arial" }).textContent = "Inside";
    el("text", { x: gx - depth, y: 262, fill: "#5F5A54", "font-size": 12, "font-family": "Figtree, Arial" }).textContent = "300 mm fins";
    document.getElementById("lab-hour").textContent = fmt(st.hour);
    document.getElementById("lab-alt").textContent = s.alt > 0 ? s.alt.toFixed(0) + "°" : "–";
    document.getElementById("lab-az").textContent = s.az.toFixed(0) + "°";
    document.getElementById("lab-prof").textContent = prof === null ? "–" : prof.toFixed(0) + "°";
    document.getElementById("lab-shade").textContent = Math.round(sh * 100) + "%";
    document.getElementById("lab-note").textContent = note;
  }
  document.getElementById("lab-range").addEventListener("input", function (e) { st.hour = +e.target.value; render(); });
  document.getElementById("lab-month").addEventListener("change", function (e) { st.month = +e.target.value; render(); });
  document.querySelectorAll("#lab-orient button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("#lab-orient button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true"); st.facade = +b.dataset.az; render();
    });
  });
  render();
})();
