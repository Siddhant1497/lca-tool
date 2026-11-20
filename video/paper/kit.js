// Paper Earth shared kit: depth camera, paper textures, labels, ink, headlines, captions, torn pages.
// Used by ep.html. (film.html keeps its own copy so the finished film never changes.)
const W = 1080, H = 1920, cv = document.getElementById('c'), ctx = cv.getContext('2d');
const P = { paper: '#F3ECDD', white: '#FBF7EE', ink: '#1F2A24', forest: '#1D4636', moss: '#7F9C5C', terra: '#C5623B', ochre: '#DDA53C', clay: '#8B5B45', sand: '#F1D9A0' };
let D = null, S = [], T = {}, EV = [], CAPS = [], IMG = {}, TEX = {}, NOW = 0;
let PAGE_CREAM, PAGE_FOREST, GRAIN, PAT, FRAME, OFF, OG;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - x, 3);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const lerp = (a, b, k) => a + (b - a) * k;
const sp = s => s <= 0 ? 0 : 1 - Math.exp(-8.5 * s) * Math.cos(13 * s);  // closed-form spring: overshoots a hair, then settles
const snap = (t, div = 1) => Math.round(t / (D.beat / div)) * (D.beat / div);  // nearest beat (or fraction) of the score
const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const snoise = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, s), hash(i + 1, s), u); };
function at(phrase, off = 0) {
  const p = phrase.toLowerCase();
  for (const s of D.sentences) { const i = s.text.toLowerCase().indexOf(p); if (i >= 0) return s.t0 + (s.t1 - s.t0) * i / Math.max(1, s.text.length) + off; }
  console.warn('phrase not found: ' + phrase); return 0;
}

// ───────────── WebGL: 2.5D depth camera with tilt-shift focus ─────────────
const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
const gl = glc.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
const VS = `#version 300 es
in vec2 a; out vec2 v; void main(){ v = a*.5+.5; v.y = 1.-v.y; gl_Position = vec4(a,0.,1.); }`;
const FS = `#version 300 es
precision highp float;
uniform sampler2D uC, uD; uniform vec2 uShift, uPan, uCover; uniform float uZoom, uFocus, uDof, uSat, uSky; uniform vec3 uTint, uOrbCol; uniform vec4 uOrb; uniform float uLayer;
in vec2 v; out vec4 o;
void main(){
  vec2 uv = (v-.5)*uCover/uZoom + .5 + uPan, p = uv;
  for(int i=0;i<4;i++){ float d = texture(uD,p).r; p = uv + uShift*(d-uFocus); }
  float d = texture(uD,p).r;
  vec3 c = textureLod(uC, p, clamp(abs(d-uFocus)*uDof, 0., 3.5)).rgb;
  // paper layers: nearer layers cast a soft shadow down-right onto farther ones (light from the upper left),
  // their lit edges catch a little light, and far layers sit in a faint warm haze
  if(uLayer > 0.){
    float dl = texture(uD, p + vec2(-.009,-.012)).r;
    float shadow = smoothstep(.03, .12, dl - d);
    float rim = smoothstep(.04, .12, d - texture(uD, p + vec2(-.0025,-.0035)).r);
    c *= 1. - .34*shadow*uLayer;
    c = mix(c, c*1.08 + .02, .4*rim*uLayer);
    c = mix(c, vec3(.95,.92,.86), (1. - smoothstep(.12, .65, d))*.16*uLayer);
  }
  float l = dot(c, vec3(.299,.587,.114));
  c = mix(vec3(l), c, uSat) * uTint;
  if(uOrb.w > 0.){
    vec2 q = v - uOrb.xy; q.y *= ${(H / W).toFixed(4)};
    float sky = 1. - smoothstep(uSky, uSky+.07, d);
    vec2 q2 = q - vec2(.010,.012);
    c = mix(c, c*.62, (1.-smoothstep(uOrb.z*.9, uOrb.z*1.25, length(q2)))*.55*sky*uOrb.w);
    c = mix(c, uOrbCol, (1.-smoothstep(uOrb.z-.002, uOrb.z+.002, length(q)))*sky*uOrb.w);
  }
  o = vec4(c,1.);
}`;
let prog, U = {};
function glInit() {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  for (const n of ['uLayer', 'uC', 'uD', 'uShift', 'uPan', 'uCover', 'uZoom', 'uFocus', 'uDof', 'uSat', 'uSky', 'uTint', 'uOrbCol', 'uOrb']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(U.uC, 0); gl.uniform1i(U.uD, 1); gl.viewport(0, 0, W, H);
}
function tex(src, mip) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}
function plate(g, name, c) {
  const im = IMG[name], cA = W / H, iA = im.width / im.height;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TEX[name].c); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, TEX[name].d);
  gl.uniform2f(U.uCover, Math.min(1, cA / iA), Math.min(1, iA / cA)); gl.uniform2f(U.uShift, c.shift[0], c.shift[1]); gl.uniform2f(U.uPan, c.pan[0], c.pan[1]);
  gl.uniform1f(U.uZoom, c.zoom); gl.uniform1f(U.uFocus, c.focus); gl.uniform1f(U.uDof, c.dof); gl.uniform1f(U.uSat, c.sat); gl.uniform1f(U.uSky, c.sky ?? .12); gl.uniform1f(U.uLayer, c.layer ?? 1);
  gl.uniform3f(U.uTint, ...c.tint); const o = c.orb || [0, 0, 0, 0]; gl.uniform4f(U.uOrb, ...o); gl.uniform3f(U.uOrbCol, ...(c.orbCol || [1, 1, 1]));
  gl.drawArrays(gl.TRIANGLES, 0, 3); g.drawImage(glc, 0, 0);
}
// slow orbit + push-in + a rack focus as each scene opens
function cam(t, t0, o = {}) {
  const lt = t - t0, ph = o.ph || 0;
  return { zoom: lerp(o.z0 ?? 1.10, o.z1 ?? 1.19, seg(lt, -1, o.dur || 11)), shift: [(o.ax ?? .06) * Math.sin(lt * .5 + ph), (o.ay ?? .022) * Math.cos(lt * .37 + ph)],
    focus: lerp(o.f0 ?? 1.0, o.f1 ?? .5, eio(seg(lt, -.3, 1.6))), dof: o.dof ?? 3.2, pan: [o.px || 0, (o.py || 0) + (o.drift || 0) * seg(lt, -1, o.dur || 11)], tint: o.tint || [1, 1, 1], sat: o.sat ?? 1.05, orb: o.orb, orbCol: o.orbCol, sky: o.sky };
}

// ───────────── paper textures ─────────────
function makePage(base, fiber, blot) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 150; i++) { g.fillStyle = `rgba(${blot},${.012 + hash(i, 1) * .022})`; g.beginPath(); g.ellipse(hash(i, 2) * W, hash(i, 3) * H, 80 + hash(i, 4) * 260, 60 + hash(i, 5) * 200, hash(i, 6) * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 3200; i++) {
    const x = hash(i, 7) * W, y = hash(i, 8) * H, a = hash(i, 9) * 6.28, l = 5 + hash(i, 10) * 24;
    g.strokeStyle = `rgba(${fiber},${.04 + hash(i, 11) * .10})`; g.lineWidth = .6 + hash(i, 12) * .9; g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * .5 + (hash(i, 13) - .5) * 8, y + Math.sin(a) * l * .5 + (hash(i, 14) - .5) * 8, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}
function makeGrain() {
  const c = document.createElement('canvas'); c.width = 360; c.height = 640; const g = c.getContext('2d'), d = g.createImageData(360, 640);
  for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (hash(i, 3) - .5) * 150; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return c;
}
const FB = 26, FR = 38;  // frame border and inner radius
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function makeFrame() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.save(); rr(g, FB, FB, W - 2 * FB, H - 2 * FB, FR); g.clip(); g.shadowColor = 'rgba(10,22,15,.6)'; g.shadowBlur = 34; g.shadowOffsetY = 8; g.lineWidth = 30; g.strokeStyle = '#000';
  rr(g, FB - 15, FB - 15, W - 2 * FB + 30, H - 2 * FB + 30, FR + 15); g.stroke(); g.restore();
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.roundRect(FB, FB, W - 2 * FB, H - 2 * FB, FR); g.clip('evenodd'); g.drawImage(PAGE_CREAM, 0, 0); g.restore();
  return c;
}

// ───────────── drawing kit ─────────────
function paperShape(g, path, fill, sh = 8) {
  g.save(); g.shadowColor = 'rgba(12,24,17,.42)'; g.shadowBlur = sh * 2.4; g.shadowOffsetY = sh; g.shadowOffsetX = sh * .4; g.fillStyle = fill; g.fill(path); g.restore();
  g.save(); g.clip(path); g.globalAlpha *= .16; g.globalCompositeOperation = 'multiply'; g.fillStyle = PAT; g.fillRect(-2000, -2000, 5000, 5000); g.restore();
}
function rectPath(x, y, w, h, r) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }
// paper is "set down": it arrives larger with a long shadow, then lands
function placed(g, t, t0, x, y, rot, fn, out) {
  const p = seg(t, t0, t0 + .12); if (p <= 0) return false;
  const e = sp(t - t0), q = out ? eio(seg(t, out, out + .3)) : 0; if (q >= 1) return false;
  g.save(); g.globalAlpha *= p * (1 - q); g.translate(x, y - (1 - e) * 50 - q * 36); g.rotate(rot + (1 - e) * .1); const s = 1 + (1 - e) * .24; g.scale(s, s); fn(7 + (1 - e) * 34); g.restore(); return true;
}
function tag(g, t, t0, x, y, text, o = {}) {
  const size = o.size || 30, font = o.font || `800 ${size}px Inter`;
  g.save(); g.font = font; g.letterSpacing = o.ls || '0px'; const tw = g.measureText(text).width - parseFloat(o.ls || 0); g.restore();
  const w = tw + (o.padX ?? 48) + (o.chip ? 30 : 0), h = size + (o.padY ?? 34), ax = o.ax ?? 0;
  placed(g, t, t0, x, y, o.rot || 0, sh => {
    paperShape(g, rectPath(-w * ax, -h / 2, w, h, o.r ?? 9), o.bg || P.white, sh);
    if (o.chip) { g.fillStyle = o.chip; g.beginPath(); g.arc(-w * ax + 28, 0, 9, 0, 7); g.fill(); }
    g.font = font; g.letterSpacing = o.ls || '0px'; g.fillStyle = o.fg || P.ink; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(text, -w * ax + (w - tw) / 2 + (o.chip ? 17 : 0), size * .06); g.letterSpacing = '0px';
  }, o.out);
}
function inkLine(g, pts, p, o = {}) {
  if (p <= 0 || pts.length < 2) return;
  const w = o.w || 7, seed = o.seed || 1, bf = Math.floor(NOW * 8), L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const lim = L[L.length - 1] * p;
  g.save(); g.strokeStyle = o.color || P.white; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w;
  if (o.shadow !== false) { g.shadowColor = 'rgba(8,20,14,.5)'; g.shadowBlur = 8; g.shadowOffsetY = 3; }
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    let [x, y] = pts[i];
    if (L[i] > lim) { const k = (lim - L[i - 1]) / (L[i] - L[i - 1] + 1e-6); x = lerp(pts[i - 1][0], x, k); y = lerp(pts[i - 1][1], y, k); }
    x += (hash(i * 1.3 + seed, bf) - .5) * w * .4; y += (hash(i * 1.7 + seed, bf + 9) - .5) * w * .4;  // hand-drawn "boil"
    i ? g.lineTo(x, y) : g.moveTo(x, y); if (L[i] > lim) break;
  }
  g.stroke(); g.restore();
}
const quad = (a, c, b, n = 36) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n; return [(1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1]]; });
const ell = (cx, cy, rx, ry, turns = 1.12, a0 = -2.2, n = 80) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n, a = a0 + k * turns * 6.283, r = 1 + .05 * k; return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]; });
const wave = (x0, x1, y, amp = 5, n = 30) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n; return [lerp(x0, x1, k), y + Math.sin(k * 7) * amp - k * amp]; });
function arrow(g, a, c, b, p, o = {}) {
  const pts = quad(a, c, b); inkLine(g, pts, seg(p, 0, .8), o);
  if (p > .7) { const k = seg(p, .7, 1), [x1, y1] = pts[pts.length - 3], [x2, y2] = pts[pts.length - 1], an = Math.atan2(y2 - y1, x2 - x1), hl = (o.head || 28) * k;
    for (const s of [-1, 1]) inkLine(g, [[x2, y2], [x2 - Math.cos(an + s * .5) * hl, y2 - Math.sin(an + s * .5) * hl]], 1, Object.assign({}, o, { seed: 5 + s })); }
}
function note(g, t, t0, text, x, y, size, o = {}) {
  const p = seg(t, t0, t0 + (o.dur || .55)); if (p <= 0) return; const q = o.out ? seg(t, o.out, o.out + .3) : 0; if (q >= 1) return;
  g.save(); g.globalAlpha *= 1 - q; g.translate(x, y); g.rotate(o.rot ?? -.04); g.font = `700 ${size}px Caveat`; const tw = g.measureText(text).width, ax = o.align === 'center' ? .5 : o.align === 'right' ? 1 : 0;
  g.beginPath(); g.rect(-tw * ax - 12, -size * 1.1, (tw + 24) * (p < 1 ? p * .98 : 1), size * 1.6); g.clip();
  if (o.shadow !== false) { g.shadowColor = 'rgba(8,20,14,.6)'; g.shadowBlur = 10; g.shadowOffsetY = 3; }
  g.fillStyle = o.color || P.white; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(text, -tw * ax, 0); g.restore();
}
function fit(text, max, size, font = '900', fam = 'Fraunces') { ctx.save(); ctx.font = `${font} ${size}px ${fam}`; const w = ctx.measureText(text).width; ctx.restore(); return w > max ? size * max / w : size; }
// editorial headline: each line rises out of a mask
function headline(g, t, t0, lines, x, y, o = {}) {
  const q = o.out ? eio(seg(t, o.out, o.out + .3)) : 0; if (q >= 1) return; let yy = y;
  lines.forEach((ln, i) => {
    const size = ln.size || o.size || 120; if (i) yy += size * (o.lh || 1.0);
    const p = seg(t, t0 + i * (o.stagger ?? .11), t0 + i * (o.stagger ?? .11) + .62); if (p <= 0) return; const e = eo(p);
    g.save(); g.globalAlpha *= 1 - q; g.font = `${ln.italic ? 'italic ' : ''}${ln.w || 900} ${size}px Fraunces`; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
    g.beginPath(); g.rect(-50, yy - size * 1.02, W + 100, size * 1.36); g.clip();
    if (o.shadow !== false) { g.shadowColor = 'rgba(8,22,15,.55)'; g.shadowBlur = 26; g.shadowOffsetY = 6; }
    g.fillStyle = ln.color || o.color || P.white; g.fillText(ln.s, x, yy + (1 - e) * size * 1.12 - q * 30); g.restore();
  });
}
function caps(g, t, t0, text, x, y, o = {}) {
  const p = seg(t, t0, t0 + .5); if (p <= 0) return; const q = o.out ? seg(t, o.out, o.out + .3) : 0; if (q >= 1) return;
  g.save(); g.globalAlpha *= eo(p) * (1 - q); g.font = `800 ${o.size || 28}px Inter`; g.letterSpacing = o.ls || '8px'; g.textAlign = o.align || 'left'; g.fillStyle = o.color || P.white;
  if (o.shadow !== false) { g.shadowColor = 'rgba(8,22,15,.6)'; g.shadowBlur = 14; g.shadowOffsetY = 3; }
  g.fillText(text, x + (1 - eo(p)) * -24, y); g.letterSpacing = '0px'; g.restore();
}
function scrim(g, top = .7, bottom = .45, th = 720) {
  let gr = g.createLinearGradient(0, 0, 0, th); gr.addColorStop(0, `rgba(14,32,24,${top})`); gr.addColorStop(.55, `rgba(14,32,24,${top * .5})`); gr.addColorStop(1, 'rgba(14,32,24,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, th);
  gr = g.createLinearGradient(0, 1150, 0, H); gr.addColorStop(0, 'rgba(14,32,24,0)'); gr.addColorStop(1, `rgba(14,32,24,${bottom})`); g.fillStyle = gr; g.fillRect(0, 1150, W, H - 1150);
}
function lightSweep(g, t) {
  const x = ((t * 55) % (W * 2.4)) - W * .7; g.save(); g.globalCompositeOperation = 'soft-light';
  const gr = g.createLinearGradient(x, 0, x + 520, 300); gr.addColorStop(0, 'rgba(255,236,200,0)'); gr.addColorStop(.5, 'rgba(255,236,200,.22)'); gr.addColorStop(1, 'rgba(255,236,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}
// CO2 as small dark paper confetti drifting up
function confetti(g, t, o) {
  const life = o.life || 3.4, n = Math.floor((o.t1 - o.t0) * o.rate);
  for (let i = 0; i < n; i++) {
    const age = t - (o.t0 + i / o.rate); if (age <= 0 || age >= life) continue; const k = age / life;
    const x = o.x + (hash(i, 1) - .5) * o.spread + Math.sin(age * 1.4 + hash(i, 2) * 6.28) * 46 * k + (hash(i, 6) - .5) * 160 * k, y = o.y - age * (o.speed || 150) * (.65 + hash(i, 3) * .7), s = 9 + hash(i, 4) * 13;
    g.save(); g.globalAlpha *= Math.min(1, k * 6) * (1 - seg(k, .6, 1)) * .92; g.translate(x, y); g.rotate(age * (hash(i, 5) - .5) * 5 + hash(i, 7) * 6);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6; g.shadowOffsetY = 3; g.fillStyle = hash(i, 8) > .3 ? '#2A2F2C' : '#4A4038'; g.scale(1, .55 + .45 * Math.abs(Math.cos(age * 3 + i)));
    g.beginPath(); g.moveTo(-s / 2, -s / 2.4); g.lineTo(s / 2, -s / 2); g.lineTo(s / 2.3, s / 2); g.lineTo(-s / 2, s / 2.6); g.closePath(); g.fill(); g.restore();
  }
}
function chapter(g, t, t0, num, title, code, color, fg) {
  caps(g, t, t0, 'CHAPTER ' + num, 88, 262);
  inkLine(g, wave(88, 430, 288, 2), eo(seg(t, t0 + .15, t0 + .7)), { w: 4, seed: 3 });
  headline(g, t, t0 - .1, [{ s: title, size: fit(title, 840, 172) }], 82, 452, {});
  tag(g, t, t0 + .8, 88, 536, code, { bg: color, fg: fg || P.white, rot: -.018, size: 31, ls: '3px' });
}

function buildCaps() {
  CAPS = [];
  for (const s of D.sentences) {
    const words = s.text.split(' '), total = s.text.length + 1; let t0 = s.t0, cur = [], groups = [];
    const ws = words.map(w => { const dt = (s.t1 - s.t0) * (w.length + 1) / total, o = { w, t0, t1: t0 + dt }; t0 += dt; return o; });
    for (const w of ws) { cur.push(w); const len = cur.map(x => x.w).join(' ').length; if ((len >= 16 && /[,.:;!?]$/.test(w.w)) || len >= 26) { groups.push(cur); cur = []; } }
    if (cur.length) { if (groups.length && cur.map(x => x.w).join(' ').length < 10) groups[groups.length - 1].push(...cur); else groups.push(cur); }
    for (const gp of groups) CAPS.push({ words: gp, t0: gp[0].t0, t1: gp[gp.length - 1].t1 });
  }
}
function captions(g, t) {
  let c = null; for (const k of CAPS) if (k.t0 - .06 <= t) c = k; if (!c || t > c.t1 + .4) return;
  const p = seg(t, c.t0 - .06, c.t0 + .1), q = seg(t, c.t1 + .2, c.t1 + .4);
  g.save(); g.font = '700 46px Inter'; const sp = g.measureText(' ').width, ws = c.words.map(w => g.measureText(w.w).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1), w = tw + 84;
  g.globalAlpha = eo(p) * (1 - q); g.translate(W / 2, 1436); g.rotate(-.01); g.scale(1, .7 + .3 * eo(p));
  paperShape(g, rectPath(-w / 2, -50, w, 100, 10), P.white, 9);
  let x = -tw / 2; g.textAlign = 'left'; g.textBaseline = 'middle';
  c.words.forEach((wd, i) => { g.fillStyle = t >= wd.t1 ? P.ink : t >= wd.t0 - .03 ? '#B4481F' : 'rgba(31,42,36,.34)'; g.fillText(wd.w, x, 3); x += ws[i] + sp; });
  g.restore();
}
function tear(g, B, p, dir, seed) {
  const e = eio(p), path = new Path2D(), jag = v => (hash(Math.round(v / 13), seed) - .5) * 22 + (snoise(v / 85, seed + 3) - .5) * 70;
  if (dir === 'up') { const y0 = lerp(H + 170, -170, e); path.moveTo(-60, H + 300); for (let x = -60; x <= W + 60; x += 13) path.lineTo(x, y0 + (x - W / 2) * .05 + jag(x)); path.lineTo(W + 60, H + 300); }
  else { const x0 = lerp(W + 170, -170, e); path.moveTo(W + 300, -60); for (let y = -60; y <= H + 60; y += 13) path.lineTo(x0 + (y - H / 2) * .06 + jag(y), y); path.lineTo(W + 300, H + 60); }
  path.closePath();
  g.save(); g.shadowColor = 'rgba(6,16,10,.6)'; g.shadowBlur = 50; g.shadowOffsetX = dir === 'up' ? 0 : -18; g.shadowOffsetY = dir === 'up' ? -18 : 0; g.fillStyle = '#FFFDF6'; g.translate(dir === 'up' ? 0 : -10, dir === 'up' ? -10 : 0); g.fill(path); g.restore();
  g.save(); g.clip(path); g.drawImage(B, 0, 0); g.restore();
}

