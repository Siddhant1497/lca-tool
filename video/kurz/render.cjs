// Render a canvas scene page to MP4 frames: node render.cjs <scene.html> <data.json> <out.mp4> [fps] [--still t out.png]
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

(async () => {
  const [page_, dataPath, out, fpsArg] = process.argv.slice(2);
  const stillAt = process.argv.indexOf("--still");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const fps = parseInt(fpsArg || "30", 10);
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });  // lets WebGL use local images
  const [vw, vh] = data.size || [1920, 1080];
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  page.on("console", m => { if (m.type() === "warning" || m.type() === "error") console.log("[page]", m.text()); });
  await page.goto("file://" + path.resolve(page_));
  const events = await page.evaluate(async d => { window.setData(d); await document.fonts.load("800 40px Inter"); await document.fonts.load("500 40px Inter");
    await document.fonts.load("700 40px Inter"); await document.fonts.load("600 40px Inter"); await document.fonts.load("900 40px Inter");
    if (window.loadAssets) await window.loadAssets();
    return window.events ? window.events() : []; }, data);
  fs.writeFileSync(dataPath.replace(/\.json$/, ".events.json"), JSON.stringify(events));
  const canvas = await page.$("#c");
  if (stillAt > 0) {
    const t = parseFloat(process.argv[stillAt + 1]);
    await page.evaluate(t => window.render(t), t);
    await canvas.screenshot({ path: process.argv[stillAt + 2] });
    await browser.close();
    return;
  }
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", out], { stdio: ["pipe", "inherit", "inherit"] });
  const n = Math.round(data.total * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.render(t), i / fps);
    const buf = await canvas.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  await browser.close();
})();
