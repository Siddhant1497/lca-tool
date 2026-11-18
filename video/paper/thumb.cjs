// Render paper/thumb.html to out/paper-series/thumbnail.png (1280x720)
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
(async () => {
  const exe = fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {};
  const b = await chromium.launch(exe), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto("file://" + path.join(__dirname, "thumb.html")); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const out = path.join(__dirname, "..", "out", "paper-series", "thumbnail.png");
  await p.screenshot({ path: out }); await b.close(); console.log("->", out);
})();
