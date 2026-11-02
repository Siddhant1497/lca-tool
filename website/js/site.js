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
