"""Scene renderers (PIL). `render(scene, t)` returns a 1280x720 RGB frame.

Each scene kind has a background and an overlay. The background is a real photo when one is present in
assets/ (named `<photo key>.jpg` or `<photo key>_1.jpg`, `_2`, ...; see PHOTO_KEYS), shown with a slow
Ken Burns move and a colour grade; otherwise it is drawn procedurally. Overlays (stat callouts, charts,
labels) are drawn on top either way.

`when(scene, "phrase")` gives the time (seconds into the scene) at which the narration reaches that
phrase, so on-screen callouts land with the voice.
"""
import glob
import json
import math
import os
import random
import zlib
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
INK, DIM, TEAL, AMBER, RED = (240, 242, 246), (140, 150, 166), (72, 201, 176), (244, 176, 66), (236, 92, 84)
BG = (9, 13, 21)
FONT_DIR = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")


@lru_cache(None)
def F(size, weight="Regular"):
    try:
        return ImageFont.truetype(FONT_DIR.format(weight), size)
    except OSError:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def lerp(a, b, t):
    return a + (b - a) * t


def prog(t, t0, d=0.8):
    return ease((t - t0) / d)


def mix(c1, c2, a):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * a) for i in range(3))


def when(sc, phrase, default=0.0):
    """Seconds into the scene at which the narration reaches `phrase`."""
    p = phrase.lower()
    for s in sc.get("sentences", []):
        i = s["text"].lower().find(p)
        if i >= 0:
            return s["t0"] + (s["t1"] - s["t0"]) * i / max(1, len(s["text"]))
    return default


def wrap(d, s, f, maxw):
    lines, cur = [], ""
    for w_ in s.split():
        nxt = (cur + " " + w_).strip()
        if d.textlength(nxt, font=f) > maxw and cur:
            lines.append(cur)
            cur = w_
        else:
            cur = nxt
    return lines + [cur]


# ───────────────────────────── drawing helpers ─────────────────────────────
@lru_cache(None)
def _round_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], r, fill=255)
    return m


def panel(img, box, a=0.6, color=(6, 9, 15), r=18):
    """Translucent rounded panel, for legible text over photos."""
    if a <= 0.01:
        return
    x0, y0, x1, y1 = (int(v) for v in box)
    w, h = x1 - x0, y1 - y0
    mask = _round_mask(w, h, r).point(lambda v: int(v * a))
    img.paste(Image.new("RGB", (w, h), color), (x0, y0), mask)


def text(img, xy, s, size, fill, weight="Regular", anchor="la", a=1.0):
    """Text with true alpha (composited), so it fades cleanly over any background."""
    if a <= 0.01:
        return
    f = F(size, weight)
    d = ImageDraw.Draw(img)
    if a >= 0.99:
        d.text(xy, s, font=f, fill=fill, anchor=anchor)
        return
    l, t_, r_, b = d.textbbox(xy, s, font=f, anchor=anchor)
    l, t_ = int(l) - 2, int(t_) - 2
    w, h = int(r_) - l + 4, int(b) - t_ + 4
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).text((xy[0] - l, xy[1] - t_), s, font=f, fill=int(255 * a), anchor=anchor)
    img.paste(Image.new("RGB", (w, h), fill), (l, t_), m)


def pill(img, cx, cy, s, size, fg, bgc, a=1.0, weight="SemiBold", pad=(22, 12)):
    if a <= 0.01:
        return
    d = ImageDraw.Draw(img)
    w = d.textlength(s, font=F(size, weight))
    panel(img, (cx - w / 2 - pad[0], cy - size / 2 - pad[1], cx + w / 2 + pad[0], cy + size / 2 + pad[1]), a * 0.92,
          bgc, 14)
    text(img, (cx, cy), s, size, fg, weight, "mm", a)


def kicker(img, x, y, s, a=1.0, col=AMBER):
    """Small amber section label with a rule, used on chart cards."""
    if a <= 0.01:
        return
    ImageDraw.Draw(img).rectangle([x, y + 4, x + 3, y + 22], fill=mix(BG, col, a))
    text(img, (x + 16, y), s, 17, col, "SemiBold", "la", a)


@lru_cache(None)
def _gradient(stops):
    ys = np.linspace(0, 1, H)
    arr = np.zeros((H, 3))
    for c in range(3):
        arr[:, c] = np.interp(ys, [s[0] for s in stops], [s[1][c] for s in stops])
    return Image.fromarray(np.repeat(arr[:, None, :].astype(np.uint8), W, axis=1))


def gradient(stops):
    return _gradient(stops).copy()


@lru_cache(None)
def _vignette(strength):
    ys, xs = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xs - W / 2) / (W / 2)) ** 2 + ((ys - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
    return Image.fromarray((np.clip((r - 0.45) / 0.55, 0, 1) ** 1.6 * 255 * strength).astype(np.uint8))


def vignette(img, strength=0.65):
    img.paste((0, 0, 0), (0, 0), _vignette(strength))
    return img


@lru_cache(None)
def card_bg():
    """Deep navy chart card with a soft off-centre glow and fine texture."""
    ys, xs = np.mgrid[0:H, 0:W]
    g = np.exp(-(((xs - W * 0.3) / (W * 0.55)) ** 2 + ((ys - H * 0.25) / (H * 0.7)) ** 2))
    base = np.array(BG, dtype=np.float32)[None, None, :] + g[..., None] * np.array([16, 26, 40], dtype=np.float32)
    base += np.random.default_rng(2).normal(0, 2.2, (H, W, 1))
    return vignette(Image.fromarray(base.clip(0, 255).astype(np.uint8)), 0.5)


# ───────────────────────────── photos ─────────────────────────────
# scene kind -> photo key (file stem in assets/). Split-screen kinds use <key>_left / <key>_right.
PHOTO_KEYS = {"dim": "skyline_open", "skyline_day": "skyline_open_day"}
# scene kind -> colour grade
GRADES = {"skyline_open": "dawn", "window": "night", "dim": "night", "pullback": "dawn", "bars": "card", "gap": "card",
          "g20": "card", "tasks": "card", "opcarbon": "night"}
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")


@lru_cache(None)
def photos(key):
    files = [f for f in glob.glob(os.path.join(ASSETS, key + ".*")) + glob.glob(os.path.join(ASSETS, key + "_[0-9]*.*"))
             if f.lower().endswith(IMG_EXT)]
    return tuple(sorted(files))


def _grade(arr, grade):
    a = arr.astype(np.float32) / 255
    if grade == "dawn":
        a = a * np.array([1.02, 0.93, 0.92]) + np.array([0.02, 0.03, 0.08]) * (1 - a)
    elif grade == "night":
        a = a * np.array([0.82, 0.86, 1.0]) * 0.85
    elif grade == "day":
        a = a * np.array([1.04, 1.0, 0.94])
    elif grade == "card":
        a = a * np.array([0.25, 0.29, 0.36])
    a = 0.5 + (a - 0.5) * 1.08  # gentle contrast
    return (a.clip(0, 1) * 255).astype(np.uint8)


@lru_cache(maxsize=24)
def _photo(path, w, h, grade):
    im = Image.open(path).convert("RGB")
    s = max(w / im.width, h / im.height)
    im = im.resize((math.ceil(im.width * s), math.ceil(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    im = Image.fromarray(_grade(np.asarray(im.crop((x, y, x + w, y + h))), grade))
    if grade == "card":
        im = im.filter(ImageFilter.GaussianBlur(4))
    return im


def ken_burns(path, p, w=W, h=H, grade="day", z=(1.0, 1.12), drift=(0.6, 0.3)):
    base = _photo(path, int(w * 1.2), int(h * 1.2), grade)
    bw, bh = base.size
    zz = lerp(z[0], z[1], p)
    cw, ch = bw / (1.08 * zz), bh / (1.08 * zz)
    cx = bw / 2 + lerp(-drift[0], drift[0], p) * (bw - cw) / 2
    cy = bh / 2 + lerp(-drift[1], drift[1], p) * (bh - ch) / 2
    return base.resize((w, h), Image.BILINEAR, box=(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2))


def photo_bg(key, sc, t, w=W, h=H, grade="day", z=(1.0, 1.12)):
    """Ken Burns through all photos for `key`, cross-dissolving between them. None if there are none."""
    files = photos(key)
    if not files:
        return None
    n, dur, xf = len(files), sc["dur"], 0.8
    seg = dur / n
    i = min(n - 1, int(t / seg))
    rnd = random.Random(zlib.crc32(files[i].encode()))
    drift = (rnd.choice((-0.6, 0.6)), rnd.uniform(-0.3, 0.3))
    img = ken_burns(files[i], (t - i * seg) / seg, w, h, grade, z, drift)
    if i + 1 < n and t > (i + 1) * seg - xf:
        rnd2 = random.Random(zlib.crc32(files[i + 1].encode()))
        nxt = ken_burns(files[i + 1], 0, w, h, grade, z, (rnd2.choice((-0.6, 0.6)), rnd2.uniform(-0.3, 0.3)))
        img = Image.blend(img, nxt, ease((t - ((i + 1) * seg - xf)) / xf))
    return img


# ───────────────────────────── city skyline (procedural) ─────────────────────────────
PAL = {
    "dawn": dict(sky=((0, (8, 12, 30)), (0.45, (52, 50, 92)), (0.78, (196, 120, 116)), (1, (250, 186, 128))),
                 layers=[(104, 92, 128), (58, 56, 92), (22, 24, 42)], win=((255, 214, 140), (255, 190, 110), (210, 226, 255)),
                 fog=(220, 186, 192), glow=(255, 170, 100, 190), sun=(255, 214, 160)),
    "day": dict(sky=((0, (78, 138, 200)), (0.65, (176, 206, 230)), (1, (248, 234, 204))),
                layers=[(168, 184, 204), (118, 138, 162), (64, 80, 102)], win=((226, 240, 250), (200, 222, 240), (240, 246, 252)),
                fog=(238, 238, 240), glow=(255, 244, 210, 150), sun=(255, 250, 230)),
}


@lru_cache(None)
def city(seed, pal, width=2600):
    rnd, P = random.Random(seed), PAL[pal]
    layers = []
    for li, col in enumerate(P["layers"]):
        img = Image.new("RGBA", (width, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        wins = []
        x = -rnd.randint(0, 80)
        hmin, hmax = [(150, 330), (200, 430), (260, 520)][li]
        bw0, bw1 = [(60, 110), (80, 150), (100, 190)][li]
        rim = mix(col, P["sun"], 0.35 if pal == "dawn" else 0.2)
        shade = mix(col, (0, 0, 0), 0.22)
        while x < width:
            bw, bh = rnd.randint(bw0, bw1), rnd.randint(hmin, hmax)
            top = H - bh
            d.rectangle([x, top, x + bw, H], fill=col + (255,))
            d.rectangle([x + bw * 0.72, top, x + bw, H], fill=shade + (255,))  # side in shadow
            style = rnd.random()
            if style < 0.3:
                d.rectangle([x + bw * 0.4, top - rnd.randint(24, 60), x + bw * 0.6, top], fill=col + (255,))
                d.line([(x + bw * 0.5, top - 60), (x + bw * 0.5, top - 100)], fill=col + (255,), width=2)
            elif style < 0.5:
                d.polygon([(x, top), (x + bw, top), (x + bw, top - bw * 0.25)], fill=col + (255,))
            d.line([(x, top), (x + bw * 0.72, top)], fill=rim + (255,), width=2)  # rim light
            if li >= 1:
                sx, sy = (12, 16) if li == 1 else (16, 22)
                for wx in range(int(x) + 6, int(x + bw) - 10, sx):
                    for wy in range(top + 10, H - 10, sy):
                        if rnd.random() < 0.30:
                            wins.append((wx, wy, sx - 7, sy - 9, rnd.random(), rnd.choice(P["win"]), rnd.uniform(0.55, 1)))
            x += bw + rnd.randint(0, 10)
        arr = np.asarray(img).astype(np.float32)  # darken towards the ground for depth
        arr[..., :3] *= np.linspace(1.0, 0.62, H)[:, None, None]
        layers.append((Image.fromarray(arr.astype(np.uint8)), wins))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W * 0.62 - 460, H * 0.74 - 210, W * 0.62 + 460, H * 0.74 + 210], fill=P["glow"])
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    ImageDraw.Draw(glow).ellipse([W * 0.62 - 46, H * 0.6 - 46, W * 0.62 + 46, H * 0.6 + 46], fill=P["sun"] + (235,))
    stars = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if pal == "dawn":
        sd = ImageDraw.Draw(stars)
        for _ in range(140):
            sx, sy, b = rnd.randint(0, W), rnd.randint(0, int(H * 0.38)), rnd.randint(70, 200)
            sd.point((sx, sy), fill=(255, 255, 255, int(b * (1 - sy / (H * 0.38)))))
    rng = np.random.default_rng(seed)
    fog = Image.fromarray((rng.random((6, 18)) * 255).astype(np.uint8)).resize((W * 2, H), Image.BICUBIC)
    fog = fog.filter(ImageFilter.GaussianBlur(40))
    ys = np.arange(H)[:, None]
    weight = np.exp(-(((ys - 0.68 * H) / (0.18 * H)) ** 2))
    fogL = Image.fromarray((np.asarray(fog).astype(np.float32) / 255 * weight * 190).clip(0, 255).astype(np.uint8))
    return layers, glow, stars, fogL


def city_frame(seed, pal, p, t, z0=1.0, z1=1.2, pan=(0.1, 0.5), fog=1.0, off=None, sky_blend=0.0):
    P = PAL[pal]
    layers, glow, stars, fogL = city(seed, pal)
    sky = gradient(P["sky"])
    if sky_blend > 0:
        sky = Image.blend(sky, gradient(PAL["day"]["sky"]), sky_blend)
    img = sky.convert("RGBA")
    if sky_blend < 0.5:
        img.alpha_composite(stars)
    img.alpha_composite(glow)
    pp = lerp(pan[0], pan[1], ease(p))
    fx = int((t * 14) % W)
    fog_mask = fogL.crop((fx, 0, fx + W, H)).point(lambda v: int(v * fog))
    for li, (layer, wins) in enumerate(layers):
        ox = int((layer.width - W) * pp * (0.35 + 0.3 * li))
        img.alpha_composite(layer, (0, 0), (ox, 0, ox + W, H))
        if li >= 1:
            d = ImageDraw.Draw(img)
            for wx, wy, ww, wh, r, wc, b in wins:
                x = wx - ox
                if x < -20 or x > W or (off is not None and r < off):
                    continue
                c = mix(P["layers"][li], wc, b if pal == "dawn" else 0.45 * b)
                d.rectangle([x, wy, x + ww, wy + wh], fill=c)
        if li < 2:
            img.paste(P["fog"], (0, 0), fog_mask.point(lambda v: int(v * (0.6 if li == 0 else 1.0))))
    z = lerp(z0, z1, ease(p))
    cw, ch = W / z, H / z
    cx, cy = W * 0.5, H * 0.6
    top = clamp(cy - ch / 2, 0, H - ch)
    box = (max(0, cx - cw / 2), top, min(W, cx + cw / 2), min(H, top + ch))
    return img.convert("RGB").resize((W, H), Image.BILINEAR, box=box)


# ───────────────────────────── backgrounds ─────────────────────────────
def bg_skyline_open(sc, t):
    return city_frame(1, "dawn", t / sc["dur"], t, 1.0, 1.28, (0.15, 0.55))


def bg_dim(sc, t):
    p = t / sc["dur"]
    img = city_frame(1, "dawn", p, t, 1.28, 1.1, (0.55, 0.7), fog=0.8)
    return Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), img, lerp(0.15, 0.45, ease(p)))


def bg_skyline_warm(sc, t):
    return city_frame(7, "day", t / sc["dur"], t, 1.05, 1.0, (0.2, 0.7), fog=0.25)


def bg_skyline_day(sc, t):
    return city_frame(1, "day", t / sc["dur"], t, 1.28, 1.0, (0.55, 0.15), fog=lerp(0.5, 0.1, t / sc["dur"]))


def bg_pullback(sc, t):
    p = t / sc["dur"]
    return city_frame(1, "dawn", p, t, 1.6, 1.0, (0.4, 0.4), fog=0.3, off=lerp(-0.1, 1.05, ease((p - 0.1) / 0.8)),
                      sky_blend=0.55 * ease((p - 0.15) / 0.8))


@lru_cache(None)
def _window():
    w, h = 1920, 1080
    ys = np.linspace(0, 1, h)[:, None, None]
    top, bot = np.array([12, 18, 38]), np.array([70, 54, 80])
    base = Image.fromarray((top + (bot - top) * ys).repeat(w, axis=1).astype(np.uint8)).convert("RGBA")
    rnd = random.Random(3)
    for blur, count, rmax in ((14, 60, 70), (5, 170, 34), (1.5, 120, 6)):
        bok = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(bok)
        for _ in range(count):
            x, y, r = rnd.randint(0, w), rnd.randint(int(h * 0.3), h), rnd.randint(3, rmax)
            c = rnd.choice([(255, 206, 130), (255, 170, 100), (170, 210, 255), (255, 240, 200), (255, 120, 90)])
            d.ellipse([x - r, y - r, x + r, y + r], fill=c + (rnd.randint(60, 170),))
        base.alpha_composite(bok.filter(ImageFilter.GaussianBlur(blur)))
    refl = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(refl).polygon([(300, 0), (520, 0), (180, h), (-40, h)], fill=(255, 255, 255, 14))
    base.alpha_composite(refl.filter(ImageFilter.GaussianBlur(30)))
    fd = ImageDraw.Draw(base)
    for box in ([0, 0, w, 90], [0, h - 90, w, h], [0, 0, 110, h], [w - 110, 0, w, h], [w // 2 - 16, 0, w // 2 + 16, h],
                [0, int(h * 0.58), w, int(h * 0.58) + 28]):
        fd.rectangle(box, fill=(5, 7, 11, 255))
    return base.convert("RGB")


def bg_window(sc, t):
    z = 1.0 + 0.42 * ease(t / sc["dur"])
    cw, ch = 1920 / z, 1080 / z
    cx, cy = 960 + min(40 * (t / sc["dur"]), 960 - cw / 2), 540
    return _window().resize((W, H), Image.BILINEAR, box=(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2))


def bg_growth(sc, t):
    img = gradient(((0, (20, 26, 50)), (0.75, (110, 92, 116)), (1, (196, 138, 112))))
    d = ImageDraw.Draw(img)
    rnd = random.Random(11)
    base_y = 620
    for i in range(42):
        x, bw, bh = 20 + i * 30, rnd.randint(24, 34), rnd.randint(90, 380)
        k = ease((t - 0.2 - i * 0.07) / 2.6)
        top = base_y - bh * k
        shade = 30 + i % 4 * 6
        d.rectangle([x, top, x + bw, base_y], fill=(shade, shade + 4, shade + 22))
        d.rectangle([x + bw * 0.7, top, x + bw, base_y], fill=(shade - 8, shade - 4, shade + 12))
        d.line([(x, top), (x + bw * 0.7, top)], fill=(196, 140, 120), width=1)
        for wy in range(int(top) + 8, base_y - 8, 14):
            if rnd.random() < 0.4 and k > 0.95:
                d.rectangle([x + 5, wy, x + bw - 9, wy + 6], fill=(255, 210, 140))
    for cx, hh in ((330, 430), (760, 470), (1110, 410)):
        sway = 8 * math.sin(t * 0.8 + cx)
        for k in range(0, hh, 18):
            d.line([(cx - 5, base_y - k), (cx + 5, base_y - k - 18)], fill=(190, 140, 54), width=1)
        d.line([(cx - 5, base_y), (cx - 5, base_y - hh)], fill=(214, 160, 60), width=2)
        d.line([(cx + 5, base_y), (cx + 5, base_y - hh)], fill=(214, 160, 60), width=2)
        d.line([(cx - 90, base_y - hh), (cx + 130, base_y - hh)], fill=(214, 160, 60), width=4)
        d.line([(cx, base_y - hh - 40), (cx + 130, base_y - hh)], fill=(214, 160, 60), width=1)
        d.line([(cx, base_y - hh - 40), (cx - 90, base_y - hh)], fill=(214, 160, 60), width=1)
        d.line([(cx + 90, base_y - hh), (cx + 90 + sway, base_y - hh + 90)], fill=(170, 170, 170), width=1)
        d.rectangle([cx + 80 + sway, base_y - hh + 90, cx + 100 + sway, base_y - hh + 108], fill=(170, 170, 170))
    d.rectangle([0, base_y, W, H], fill=(14, 16, 24))
    return img


def _interior(t):
    img = Image.new("RGB", (640, H), (16, 14, 22))
    d = ImageDraw.Draw(img)
    d.rectangle([150, 150, 490, 700], fill=(30, 28, 40))
    for r in range(8):
        for c in range(4):
            lit = 0.65 + 0.35 * math.sin(t * 2 + r * 1.3 + c)
            d.rectangle([168 + c * 80, 170 + r * 66, 168 + c * 80 + 58, 170 + r * 66 + 42], fill=mix((30, 28, 40), (255, 205, 120), lit))
    for i in range(16):
        x = 190 + (i * 53) % 280
        y = 150 - ((t * 60 + i * 41) % 130)
        d.ellipse([x, y, x + 8, y + 8], fill=mix((16, 14, 22), AMBER, clamp(1 - (150 - y) / 130)))
    return img


def _concrete(t):
    img = Image.new("RGB", (640, H), (18, 18, 22))
    d = ImageDraw.Draw(img)
    rnd = random.Random(5)
    for r in range(5):
        for c in range(6):
            off = 30 if r % 2 else 0
            g = rnd.randint(86, 118)
            d.rectangle([80 + c * 80 + off, 330 + r * 62, 80 + c * 80 + off + 76, 330 + r * 62 + 58], fill=(g, g, g + 4))
            d.line([(80 + c * 80 + off, 330 + r * 62), (80 + c * 80 + off + 76, 330 + r * 62)], fill=(g + 30,) * 3, width=1)
    for i in range(12):
        x = 90 + i * 40
        d.line([(x, 250), (x + 20, 330)], fill=(214, 120, 60), width=3)
    for y in (255, 285, 315):
        d.line([(80, y), (560, y)], fill=(214, 120, 60), width=3)
    return img


def bg_opcarbon(sc, t):
    img = Image.new("RGB", (W, H), BG)
    top, tb = when(sc, "operational carbon", 6.0), when(sc, "embodied carbon", 20.0)
    for x0, side, proc, t0 in ((0, "left", _interior, top), (640, "right", _concrete, tb)):
        pic = photo_bg("opcarbon_" + side, sc, t, 640, H, "night", (1.0, 1.08)) or proc(t)
        k = 0.3 + 0.7 * prog(t, t0 - 0.5, 0.8)
        img.paste(Image.blend(Image.new("RGB", pic.size, BG), pic, k), (x0, 0))
    ImageDraw.Draw(img).line([(640, 0), (640, H)], fill=(0, 0, 0), width=4)
    return img


def bg_oldnew(sc, t):
    l, r = photo_bg("oldnew_left", sc, t, 640, H), photo_bg("oldnew_right", sc, t, 640, H)
    if l and r:
        img = Image.new("RGB", (W, H))
        img.paste(l, (0, 0))
        img.paste(r, (640, 0))
        ImageDraw.Draw(img).line([(640, 0), (640, H)], fill=(0, 0, 0), width=4)
        return img
    img = gradient(((0, (28, 34, 60)), (0.8, (104, 90, 108)), (1, (150, 116, 110))))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 620, W, H], fill=(14, 16, 24))
    d.rectangle([150, 400, 520, 620], fill=(128, 84, 70))
    d.rectangle([430, 400, 520, 620], fill=(108, 70, 60))
    for r in range(4):
        for c in range(6):
            d.rectangle([172 + c * 56, 420 + r * 50, 172 + c * 56 + 30, 420 + r * 50 + 32],
                        fill=(236, 200, 140) if (r + c) % 3 else (60, 54, 62))
    d.rectangle([150, 392, 520, 404], fill=(90, 58, 50))
    tower = np.zeros((440, 360, 3), dtype=np.float32)
    tower[:] = np.linspace(0, 1, 360)[None, :, None] * np.array([-30, -30, -20]) + np.array([86, 136, 176])
    img.paste(Image.fromarray(tower.clip(0, 255).astype(np.uint8)), (700, 180))
    for i in range(12):
        d.line([(700, 180 + i * 40), (1060, 180 + i * 40)], fill=(150, 196, 226), width=1)
    for i in range(7):
        d.line([(700 + i * 60, 180), (700 + i * 60, 620)], fill=(150, 196, 226), width=1)
    d.polygon([(700, 180), (860, 180), (700, 330)], fill=(140, 184, 214))
    return img


def bg_retrofit(sc, t):
    ph = photo_bg("retrofit", sc, t)
    if ph:
        return ph
    img = gradient(((0, (22, 30, 50)), (1, (66, 70, 90))))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 640, W, H], fill=(14, 16, 24))
    ain, ahp, agl = (prog(t, when(sc, k, v), 1.0) for k, v in (("insulating", 2), ("heat pumps", 4), ("glazing", 6)))
    x0, x1, y0 = 170, 520, 190
    d.rectangle([x0 - 16, y0 - 16, x1 + 16, 640], fill=mix((64, 70, 88), (232, 186, 90), ain))
    d.rectangle([x0, y0, x1, 640], fill=(52, 56, 74))
    for r in range(6):
        for c in range(4):
            d.rectangle([x0 + 20 + c * 82, y0 + 24 + r * 70, x0 + 20 + c * 82 + 56, y0 + 24 + r * 70 + 46],
                        fill=mix((86, 70, 62), (130, 214, 230), agl))
    cx, cy = 345, y0 - 40
    d.rectangle([cx - 50, cy - 20 - 10 * (1 - ahp), cx + 50, cy + 30], fill=mix((50, 56, 70), (170, 180, 190), ahp))
    if ahp > 0.3:
        for k in range(4):
            a_ = t * 9 + k * math.pi / 2
            d.line([(cx, cy + 5), (cx + 28 * math.cos(a_), cy + 5 + 12 * math.sin(a_))], fill=(40, 46, 60), width=4)
    return img


def _daysky():
    return gradient(((0, (104, 164, 214)), (0.7, (196, 214, 226)), (1, (240, 230, 208))))


def bg_certified(sc, t):
    ph = photo_bg("certified", sc, t, grade="day")
    if ph:
        return ph
    img = _daysky()
    d = ImageDraw.Draw(img)
    d.rectangle([0, 620, W, H], fill=(70, 94, 84))
    d.rectangle([160, 240, 520, 620], fill=(206, 214, 222))
    d.rectangle([420, 240, 520, 620], fill=(184, 192, 202))
    for r in range(5):
        for c in range(4):
            d.rectangle([184 + c * 84, 270 + r * 66, 184 + c * 84 + 56, 270 + r * 66 + 44], fill=(96, 138, 170))
    for k in range(5):
        d.polygon([(170 + k * 70, 240), (225 + k * 70, 240), (210 + k * 70, 205), (155 + k * 70, 205)], fill=(30, 52, 98))
        glint = 0.5 + 0.5 * math.sin(t * 1.5 + k)
        d.line([(180 + k * 70, 235), (200 + k * 70, 210)], fill=mix((30, 52, 98), (190, 220, 255), glint), width=2)
    for x in range(560, 1280, 90):  # street trees
        d.ellipse([x, 560, x + 70, 630], fill=(64, 112, 80))
    return img


def bg_timber(sc, t):
    ph = photo_bg("timber", sc, t, grade="day")
    if ph:
        return ph
    img = _daysky()
    d = ImageDraw.Draw(img)
    d.rectangle([0, 620, W, H], fill=(86, 92, 78))
    wood = (196, 150, 98)
    for f in range(4):
        y = 560 - f * 120
        k = prog(t, 1.0 + f * 1.6, 1.4)
        if k <= 0:
            continue
        for c in range(3):
            d.rectangle([120 + c * 170, y - 100 * k, 140 + c * 170, y], fill=(150, 108, 66))
        d.rectangle([110, y - 100 * k - 14, 480, y - 100 * k], fill=wood)
        for gx in range(120, 480, 18):
            d.line([(gx, y - 100 * k - 14), (gx, y - 100 * k)], fill=(170, 124, 78), width=1)
    cx = 640
    d.line([(cx, 620), (cx, 90)], fill=(220, 168, 70), width=5)
    d.line([(cx - 40, 90), (cx - 560, 90)], fill=(220, 168, 70), width=5)
    px, py = 300 + 40 * math.sin(t * 0.6), 170 + 30 * math.sin(t * 0.9)
    d.line([(px, 90), (px, py)], fill=(60, 60, 60), width=1)
    d.rectangle([px - 70, py, px + 70, py + 16], fill=wood)
    return img


def bg_heatpump(sc, t):
    ph = photo_bg("heatpump", sc, t, grade="day")
    if ph:
        return ph
    img = _daysky()
    d = ImageDraw.Draw(img)
    d.rectangle([0, 620, W, H], fill=(96, 118, 90))
    d.polygon([(130, 360), (330, 240), (530, 360)], fill=(120, 72, 62))
    d.rectangle([160, 360, 500, 620], fill=(236, 226, 206))
    d.rectangle([220, 430, 300, 520], fill=(255, 226, 150))
    d.rectangle([360, 430, 440, 520], fill=(255, 226, 150))
    d.rounded_rectangle([540, 520, 650, 620], 8, fill=(200, 206, 212))
    d.ellipse([560, 536, 630, 606], outline=(80, 86, 94), width=3)
    for k in range(3):
        a_ = t * 9 + k * 2.09
        d.line([(595, 571), (595 + 32 * math.cos(a_), 571 + 32 * math.sin(a_))], fill=(60, 64, 70), width=5)
    d.line([(540, 580), (500, 580)], fill=TEAL, width=4)
    return img


def bg_card(sc, t):
    return card_bg().copy()


# ───────────────────────────── overlays ─────────────────────────────
def ov_bars(img, sc, t, photo):
    ka = prog(t, 4.4 if sc.get("act_title") else 0.2, 0.6)  # wait for the act title to clear
    kicker(img, 80, 56, "WHERE GLOBAL EMISSIONS COME FROM", ka)
    text(img, (W - 80, 58), "Source: UNEP GlobalABC", 15, DIM, "Regular", "ra", ka)
    d = ImageDraw.Draw(img)
    t37, t28 = when(sc, "37 percent", 0.8), when(sc, "28 percent", 4.0)
    for y, val, tt, sub, col in ((190, 37, t37, "of global CO₂ emissions", AMBER), (400, 28, t28, "of global energy use", TEAL)):
        a = prog(t, tt - 0.6, 0.6)
        text(img, (120, y - 50), "Buildings & construction", 24, INK, "SemiBold", "la", a)
        x0, w_, h_ = 120, 1040, 56
        panel(img, (x0, y, x0 + w_, y + h_), 0.85 * a, (30, 38, 54), 12)
        fill = ease((t - tt) / 1.6)
        if fill > 0:
            d.rounded_rectangle([x0, y, x0 + max(24, w_ * val / 100 * fill), y + h_], 12, fill=col)
        text(img, (x0, y + h_ + 14), f"{int(val * fill)}%", 64, col, "Bold", "la", a)
        text(img, (x0 + 150, y + h_ + 42), sub, 24, DIM, "Regular", "la", a)
        text(img, (x0 + w_ - 16, y + h_ / 2), "everything else", 17, DIM, "Regular", "rm", a * fill)


def ov_growth(img, sc, t, photo):
    tp, t20 = when(sc, "new Paris", 1.5), when(sc, "20 percent", 9.0)
    pill(img, W / 2, 110, "A NEW PARIS EVERY WEEK", 30, (12, 14, 20), AMBER, prog(t, tp, 0.6))
    a = prog(t, t20, 0.6)
    panel(img, (W / 2 - 260, 160, W / 2 + 260, 300), 0.55 * a)
    text(img, (W / 2, 210), f"+{int(20 * ease((t - t20) / 1.8))}%", 84, INK, "Bold", "mm", a)
    text(img, (W / 2, 272), "global floor area, 2015 → 2024", 22, INK, "Regular", "mm", a)


def ov_opcarbon(img, sc, t, photo):
    top, tb, ta = when(sc, "operational carbon", 6.0), when(sc, "embodied carbon", 20.0), when(sc, "18 percent", 30.0)
    for cx, label, sub, t0, col in ((320, "OPERATIONAL CARBON", "Energy burned every day the building exists", top, AMBER),
                                     (960, "EMBODIED CARBON", "Emissions baked into the materials before opening day", tb, TEAL)):
        pill(img, cx, 70, label, 26, (10, 14, 22), col, prog(t, t0 - 0.2, 0.6))
        a = prog(t, t0 + 0.8, 0.6)
        w_ = ImageDraw.Draw(img).textlength(sub, font=F(19)) / 2 + 16
        panel(img, (cx - w_, 106, cx + w_, 142), 0.5 * a, r=10)
        text(img, (cx, 124), sub, 19, INK, "Regular", "mm", a)
    pill(img, 960, 560, "Cement + steel ≈ 18% of ALL global emissions", 22, INK, (90, 54, 22), prog(t, ta, 0.6))


def ov_oldnew(img, sc, t, photo):
    a = prog(t, 0.6, 0.8)
    for cx, s in ((320 if photo else 335, "built decades ago"), (960 if photo else 880, "built last year")):
        pill(img, cx, 160, s, 18, INK, (10, 14, 22), a * 0.9, "Medium", (14, 8))
    pill(img, W / 2, 90, "Most of 2050's buildings are already standing", 30, (10, 14, 22), AMBER,
         prog(t, when(sc, "2050", 2.0) - 0.3, 0.7))


def ov_retrofit(img, sc, t, photo):
    tin, thp, tgl, tco = (when(sc, "insulating", 2), when(sc, "heat pumps", 4), when(sc, "glazing", 6),
                          when(sc, "no energy code", 12))
    x = 680
    panel(img, (x - 30, 160, 1220, 420), 0.6 * prog(t, tin - 0.4, 0.6))
    d = ImageDraw.Draw(img)
    for i, (lab, t0, col) in enumerate((("Re-insulate walls", tin, AMBER), ("Replace gas boilers with heat pumps", thp, TEAL),
                                        ("Swap out old glazing", tgl, (130, 214, 230)))):
        a = prog(t, t0, 0.6)
        if a > 0.01:
            d.ellipse([x, 190 + i * 76, x + 34, 190 + i * 76 + 34], fill=mix((20, 26, 38), col, a))
            d.line([(x + 9, 208 + i * 76), (x + 15, 214 + i * 76), (x + 26, 200 + i * 76)], fill=mix(col, (10, 14, 22), a), width=3)
        text(img, (x + 56, 207 + i * 76), lab, 26, INK, "Medium", "lm", a)
    pill(img, 935, 490, "½ of new buildings: no energy code at all", 24, (255, 235, 230), (150, 40, 36),
         prog(t, tco - 0.3, 0.7))


def ov_gap(img, sc, t, photo):
    kicker(img, 80, 56, "BUILDINGS: WHERE WE ARE vs WHERE WE NEED TO BE")
    text(img, (W - 80, 58), "Illustrative, not to scale", 15, DIM, "Regular", "ra")
    d = ImageDraw.Draw(img)
    x0, x1, y0, y1 = 110, 640, 170, 540
    for k in range(5):
        yy = y0 + (y1 - y0) * k / 4
        d.line([(x0, yy), (x1, yy)], fill=(26, 34, 48), width=1)
    d.line([(x0, y1), (x1, y1)], fill=DIM, width=2)
    for i, yr in enumerate(("now", "2027", "2030")):
        text(img, (x0 + (x1 - x0) * i / 2, y1 + 12), yr, 17, DIM, "Regular", "ma")
    yv = lambda v: y1 - (v / 120) * (y1 - y0)
    xv = lambda f: x0 + (x1 - x0) * f
    ka = ease((t - when(sc, "fall by more than half", 1.5)) / 2.0)
    kb = ease((t - when(sc, "new record high", 8.0)) / 1.8)
    if ka > 0.02:
        pts = [(xv(f * ka), yv(lerp(100, 44, f * ka))) for f in np.linspace(0, 1, 30)]
        d.line(pts, fill=TEAL, width=5, joint="curve")
        text(img, (pts[-1][0] - 6, pts[-1][1] + 20), "needed: −56% by 2030", 19, TEAL, "SemiBold", "ra", ka)
    if kb > 0.02:
        pts = [(xv(f * kb), yv(lerp(100, 108, f * kb))) for f in np.linspace(0, 1, 30)]
        poly = pts + [(xv(f * kb), yv(lerp(100, 44, f * kb))) for f in np.linspace(1, 0, 30)]
        shade = Image.new("L", (W, H), 0)
        ImageDraw.Draw(shade).polygon(poly, fill=int(70 * kb))
        img.paste(RED, (0, 0), shade)
        d.line(pts, fill=RED, width=5, joint="curve")
        text(img, (pts[-1][0] - 6, pts[-1][1] - 34), "actual: record high", 19, RED, "SemiBold", "ra", kb)
    tr = when(sc, "renewable share", 16.0)
    panel(img, (760, 110, 1200, 600), 0.45 * prog(t, tr - 0.5, 0.6), (20, 28, 42))
    text(img, (980, 140), "Renewable share of building energy", 19, INK, "Medium", "ma", prog(t, tr, 0.6))
    for i, (lab, v, col) in enumerate((("Today", 17, DIM), ("2030 target", 46, TEAL))):
        a = prog(t, tr + i * 1.4, 0.8)
        bx = 830 + i * 190
        h_ = (y1 - 200) * v / 50 * a
        if h_ > 1:
            d.rounded_rectangle([bx, y1 - h_, bx + 110, y1], 8, fill=col)
        text(img, (bx + 55, y1 - h_ - 12), f"{int(v * a)}%", 42, INK, "Bold", "ms", a)
        text(img, (bx + 55, y1 + 12), lab, 17, DIM, "Regular", "ma", a)


def ov_g20(img, sc, t, photo):
    t1, t2 = when(sc, "G20", 1.0), when(sc, "Two countries", 9.0)
    k1, k2 = prog(t, t1 - 0.5, 0.8), prog(t, t2 - 0.4, 0.8)
    a1 = k1 * (1 - k2)
    d = ImageDraw.Draw(img)
    if a1 > 0.01:
        for i in range(20):
            x, y = 400 + (i % 5) * 100, 170 + (i // 5) * 100
            d.rounded_rectangle([x, y, x + 76, y + 76], 12, outline=mix(BG, (90, 102, 120), a1), width=2)
            d.line([(x + 24, y + 38), (x + 52, y + 38)], fill=mix(BG, (90, 102, 120), a1), width=2)
        text(img, (W / 2, 110), "0 of 20", 64, RED, "Bold", "mm", a1)
        text(img, (W / 2, 580), "G20 countries with a detailed national strategy for buildings", 21, DIM, "Regular", "mm", a1)
    if k2 > 0.01:
        for i in range(200):
            x, y = 190 + (i % 20) * 44, 190 + (i // 20) * 38
            lit = i in (23, 87)
            r = 12 + (4 * math.sin(t * 3) if lit else 0)
            d.ellipse([x + 12 - r, y + 12 - r, x + 12 + r, y + 12 + r], fill=mix(BG, TEAL if lit else (40, 50, 66), k2))
        text(img, (W / 2, 110), "2 of ~200", 64, TEAL, "Bold", "mm", k2)
        text(img, (W / 2, 590), "countries with building codes aligned to zero emissions", 21, DIM, "Regular", "mm", k2)


def ov_tasks(img, sc, t, photo):
    items = (("retrofit a hundred", "Retrofit a century of existing buildings", INK),
             ("rebuild the entire", "Rebuild the cement and steel supply chain", INK),
             ("rewrite building codes", "Rewrite building codes in ~200 countries", INK),
             ("twenty-five years", "…in about 25 years", RED))
    for i, (kw, lab, col) in enumerate(items):
        a = prog(t, when(sc, kw, 1.0 + i * 3), 0.8)
        text(img, (160, 166 + i * 100), f"0{i + 1}", 20, AMBER, "SemiBold", "la", a)
        text(img, (215, 150 + i * 100), lab, 42, col, "Light", "la", a)
    t25 = when(sc, "twenty-five years", 12)
    a = prog(t, t25, 0.8)
    panel(img, (215, 565, 1075, 583), a, (30, 38, 54), 9)
    w_ = 860 * 0.88 * ease((t - t25) / 5)
    if w_ > 18:
        panel(img, (215, 565, 215 + w_, 583), a, RED, 9)
    text(img, (215, 596), "most of that time has already gone", 17, DIM, "Regular", "la", a)


def ov_certified(img, sc, t, photo):
    tl = when(sc, "LEED", 3.0)
    for i, name in enumerate(("LEED", "EDGE", "IGBC", "GRIHA")):
        pill(img, 820 + (i % 2) * 170, 230 + (i // 2) * 84, name, 30, (8, 40, 28), (128, 220, 172), prog(t, tl + 0.5 * i, 0.5))
    pill(img, 905, 450, "Operational + embodied, checked before it opens", 21, (16, 24, 34), (250, 252, 255),
         prog(t, when(sc, "before it ever opens", 7.0), 0.6))
    pill(img, 905, 512, "One developer builds to standard → the market follows", 20, (16, 24, 34), (255, 236, 190),
         prog(t, when(sc, "competitors have to follow", 14.0), 0.6))


def ov_timber(img, sc, t, photo):
    for i, (kw, lab) in enumerate((("mass timber", "Mass timber replaces steel + concrete where viable"),
                                    ("30 to 70", "Low-carbon & geopolymer concrete: cement footprint −30 to −70%"),
                                    ("recycled steel", "Recycled steel: far less carbon than virgin steel"))):
        pill(img, 880, 250 + i * 92, lab, 20, (22, 28, 36), (252, 252, 252), prog(t, when(sc, kw, 2 + 4 * i), 0.6),
             pad=(18, 12))


def ov_heatpump(img, sc, t, photo):
    p = t / sc["dur"]
    a = prog(t, when(sc, "A heat pump", 1.0), 0.8)
    panel(img, (760, 150, 1130, 610), 0.82 * a, (248, 250, 252))
    text(img, (945, 186), "Emissions per unit of heat", 20, (20, 28, 40), "SemiBold", "mm", a)
    text(img, (945, 212), "illustrative · grid getting cleaner →", 15, (90, 100, 116), "Regular", "mm", a)
    d = ImageDraw.Draw(img)
    for i, (lab, h_, col) in enumerate((("Gas boiler", 1.0, (150, 150, 158)), ("Heat pump", lerp(0.62, 0.18, ease(p)), TEAL))):
        bx = 810 + i * 160
        hh = 280 * h_ * a
        if hh > 1:
            d.rounded_rectangle([bx, 560 - hh, bx + 110, 560], 8, fill=col)
        text(img, (bx + 55, 574), lab, 18, (30, 40, 52), "Medium", "ma", a)


def r_title(sc, t):
    img = vignette(gradient(((0, (6, 8, 14)), (1, (16, 18, 30)))), 0.7)
    d = ImageDraw.Draw(img)
    a = min(prog(t, 0.6, 1.4), 1 - prog(t, sc["dur"] - 1.2, 1.0))
    for i, line in enumerate(wrap(d, sc["text"], F(56, "Light"), 980)):
        text(img, (W / 2, 290 + i * 76), line, 56, INK, "Light", "mm", a)
    d.line([(W / 2 - 40, 460), (W / 2 + 40, 460)], fill=mix((10, 12, 20), AMBER, a), width=2)
    text(img, (W / 2, 495), "A VIDEO ESSAY", 17, DIM, "Medium", "mm", a)
    return img


@lru_cache(None)
def credits():
    path = os.path.join(ASSETS, "credits.json")
    if not os.path.exists(path):
        return ()
    out = []
    for c in json.load(open(path, encoding="utf-8")):
        s = c["title"].removeprefix("File:").rsplit(".", 1)[0]
        if not c["author"].startswith("see"):
            s += f" by {c['author']}"
        if not c["license"].startswith("see"):
            s += f" ({c['license']})"
        if s not in out:
            out.append(s)
    return tuple(out)


def r_endcard(sc, t):
    img = vignette(gradient(((0, (6, 8, 14)), (1, (16, 18, 30)))), 0.7)
    a = min(prog(t, 0.4, 1.2), 1 - prog(t, sc["dur"] - 1.0, 0.8))
    text(img, (W / 2, 250), "Thanks for watching", 46, INK, "Light", "mm", a)
    pill(img, W / 2, 340, "SUBSCRIBE", 24, (6, 8, 14), AMBER, a)
    text(img, (W / 2, 415), "What Happens When Every Building on Earth Has to Hit Net Zero?", 18, DIM, "Regular", "mm", a * 0.8)
    if credits():
        text(img, (W / 2, 560), "Photos: Wikimedia Commons contributors (CC0 / CC BY / CC BY-SA)", 15, DIM, "Regular", "mm", a * 0.8)
        text(img, (W / 2, 584), "Full photo credits in the description", 15, DIM, "Regular", "mm", a * 0.8)
    return img


def r_black(sc, t):
    return Image.new("RGB", (W, H), (0, 0, 0))


# kind -> (procedural background, overlay)
SCENES = {
    "skyline_open": (bg_skyline_open, None), "window": (bg_window, None), "dim": (bg_dim, None),
    "bars": (bg_card, ov_bars), "growth": (bg_growth, ov_growth), "opcarbon": (bg_opcarbon, ov_opcarbon),
    "oldnew": (bg_oldnew, ov_oldnew), "retrofit": (bg_retrofit, ov_retrofit), "gap": (bg_card, ov_gap),
    "g20": (bg_card, ov_g20), "tasks": (bg_card, ov_tasks), "skyline_warm": (bg_skyline_warm, None),
    "certified": (bg_certified, ov_certified), "timber": (bg_timber, ov_timber), "heatpump": (bg_heatpump, ov_heatpump),
    "skyline_day": (bg_skyline_day, None), "pullback": (bg_pullback, None),
}
# kinds whose bg functions look for their own photos (split screens and procedural fallbacks with photo hooks)
SELF_PHOTO = {"opcarbon", "oldnew", "retrofit", "certified", "timber", "heatpump"}
SPECIAL = {"title": r_title, "endcard": r_endcard, "black": r_black}


def scene_photo(sc, t):
    kind = sc["kind"]
    key = PHOTO_KEYS.get(kind, kind)
    grade = GRADES.get(kind, "day")
    img = photo_bg(key, sc, t, grade=grade, z=(1.12, 1.0) if kind in ("pullback", "skyline_day") else (1.0, 1.12))
    if img is not None and kind == "dim":
        img = Image.blend(Image.new("RGB", (W, H)), img, lerp(0.3, 0.6, ease(t / sc["dur"])))
    if img is not None and kind == "pullback":
        img = Image.blend(img, Image.new("RGB", (W, H), (255, 236, 210)), 0.12 * ease(t / sc["dur"]))
    return img


def render(sc, t):
    kind = sc["kind"]
    if kind in SPECIAL:
        return SPECIAL[kind](sc, t)
    bg, ov = SCENES[kind]
    img = None if kind in SELF_PHOTO else scene_photo(sc, t)
    photo = img is not None or any(photos(f"{kind}_{s}") for s in ("left", "right")) or bool(photos(kind))
    if img is None:
        img = bg(sc, t)
    vignette(img, 0.55 if photo else 0.4)
    if ov:
        ov(img, sc, t, photo)
    return img
