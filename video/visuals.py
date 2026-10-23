"""Procedural scene renderers (PIL). Each renderer takes (scene, t) and returns a 1280x720 RGB image.

`scene` is the dict built by build_video.py; `when(scene, "phrase")` gives the time (seconds into the
scene) at which the narration reaches that phrase, so on-screen callouts land with the voice.
"""
import math
import random
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
INK, DIM, TEAL, AMBER, RED = (236, 239, 243), (122, 132, 148), (72, 201, 176), (244, 176, 66), (236, 92, 84)
BG = (10, 14, 22)
FONT_DIR = "/usr/share/fonts/opentype/inter/Inter-{}.otf"


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


def text(d, xy, s, size, fill, weight="Regular", anchor="la", a=1.0, bg=BG):
    if a <= 0.01:
        return
    d.text(xy, s, font=F(size, weight), fill=mix(bg, fill, min(1, a)), anchor=anchor)


def pill(d, cx, cy, s, size, fg, bgc, a=1.0, weight="SemiBold", pad=(22, 12), under=BG):
    if a <= 0.01:
        return
    f = F(size, weight)
    w = d.textlength(s, font=f)
    box = [cx - w / 2 - pad[0], cy - size / 2 - pad[1], cx + w / 2 + pad[0], cy + size / 2 + pad[1]]
    d.rounded_rectangle(box, 14, fill=mix(under, bgc, a))
    d.text((cx, cy), s, font=f, fill=mix(bgc, fg, a), anchor="mm")


@lru_cache(None)
def _gradient(stops):
    ys = np.linspace(0, 1, H)
    arr = np.zeros((H, 3))
    for c in range(3):
        arr[:, c] = np.interp(ys, [s[0] for s in stops], [s[1][c] for s in stops])
    return Image.fromarray(np.repeat(arr[:, None, :].astype(np.uint8), W, axis=1))


def gradient(stops):
    return _gradient(stops).copy()


# ───────────────────────────── city skyline ─────────────────────────────
PAL = {
    "dawn": dict(sky=((0, (10, 16, 38)), (0.5, (72, 66, 108)), (0.85, (214, 140, 120)), (1, (246, 190, 140))),
                 layers=[(98, 88, 124), (58, 56, 90), (24, 26, 44)], win=(255, 214, 140), fog=(214, 184, 190),
                 glow=(255, 170, 110, 170)),
    "day": dict(sky=((0, (96, 152, 206)), (0.7, (190, 214, 230)), (1, (246, 232, 200))),
                layers=[(160, 178, 200), (112, 132, 156), (62, 78, 98)], win=(226, 240, 250), fog=(236, 236, 236),
                glow=(255, 240, 200, 150)),
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
        while x < width:
            bw, bh = rnd.randint(bw0, bw1), rnd.randint(hmin, hmax)
            top = H - bh
            d.rectangle([x, top, x + bw, H], fill=col + (255,))
            if rnd.random() < 0.35:
                d.rectangle([x + bw * 0.4, top - rnd.randint(20, 50), x + bw * 0.6, top], fill=col + (255,))
            if li >= 1:
                sx, sy = (12, 16) if li == 1 else (16, 22)
                for wx in range(int(x) + 6, int(x + bw) - 10, sx):
                    for wy in range(top + 10, H - 10, sy):
                        if rnd.random() < 0.30:
                            wins.append((wx, wy, sx - 7, sy - 9, rnd.random()))
            x += bw + rnd.randint(0, 10)
        layers.append((img, wins))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([W * 0.62 - 420, H * 0.76 - 190, W * 0.62 + 420, H * 0.76 + 190], fill=P["glow"])
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    rng = np.random.default_rng(seed)
    fog = Image.fromarray((rng.random((6, 18)) * 255).astype(np.uint8)).resize((W * 2, H), Image.BICUBIC)
    fog = fog.filter(ImageFilter.GaussianBlur(40))
    ys = np.arange(H)[:, None]
    weight = np.exp(-(((ys - 0.68 * H) / (0.18 * H)) ** 2))
    fogL = Image.fromarray((np.asarray(fog).astype(np.float32) / 255 * weight * 190).clip(0, 255).astype(np.uint8))
    return layers, glow, fogL


def city_frame(seed, pal, p, t, z0=1.0, z1=1.2, pan=(0.1, 0.5), fog=1.0, off=None, sky_blend=0.0):
    P = PAL[pal]
    layers, glow, fogL = city(seed, pal)
    sky = gradient(P["sky"])
    if sky_blend > 0:
        sky = Image.blend(sky, gradient(PAL["day"]["sky"]), sky_blend)
    img = sky.convert("RGBA")
    img.alpha_composite(glow)
    pp = lerp(pan[0], pan[1], ease(p))
    fx = int((t * 14) % W)
    fog_mask = fogL.crop((fx, 0, fx + W, H)).point(lambda v: int(v * fog))
    for li, (layer, wins) in enumerate(layers):
        ox = int((layer.width - W) * pp * (0.35 + 0.3 * li))
        img.alpha_composite(layer, (0, 0), (ox, 0, ox + W, H))
        if li >= 1:
            d = ImageDraw.Draw(img)
            fill = P["win"] if pal == "dawn" else mix(P["layers"][li], P["win"], 0.45)
            for wx, wy, ww, wh, r in wins:
                x = wx - ox
                if x < -20 or x > W or (off is not None and r < off):
                    continue
                d.rectangle([x, wy, x + ww, wy + wh], fill=fill)
        if li < 2:
            img.paste(P["fog"], (0, 0), fog_mask.point(lambda v: int(v * (0.6 if li == 0 else 1.0))))
    z = lerp(z0, z1, ease(p))
    cw, ch = W / z, H / z
    cx, cy = W * 0.5, H * 0.6
    top = clamp(cy - ch / 2, 0, H - ch)
    box = (max(0, cx - cw / 2), top, min(W, cx + cw / 2), min(H, top + ch))
    return img.convert("RGB").resize((W, H), Image.BILINEAR, box=box)


def r_skyline_open(sc, t):
    return city_frame(1, "dawn", t / sc["dur"], t, 1.0, 1.28, (0.15, 0.55))


def r_skyline_warm(sc, t):
    return city_frame(7, "day", t / sc["dur"], t, 1.05, 1.0, (0.2, 0.7), fog=0.25)


def r_skyline_day(sc, t):
    return city_frame(1, "day", t / sc["dur"], t, 1.28, 1.0, (0.55, 0.15), fog=lerp(0.5, 0.1, t / sc["dur"]))


def r_pullback(sc, t):
    p = t / sc["dur"]
    return city_frame(1, "dawn", p, t, 1.6, 1.0, (0.4, 0.4), fog=0.3, off=lerp(-0.1, 1.05, ease((p - 0.1) / 0.8)),
                      sky_blend=0.55 * ease((p - 0.15) / 0.8))


def r_dim(sc, t):
    p = t / sc["dur"]
    img = city_frame(1, "dawn", p, t, 1.28, 1.1, (0.55, 0.7), fog=0.8)
    return Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), img, lerp(0.12, 0.4, ease(p)))


# ───────────────────────────── window close-up ─────────────────────────────
@lru_cache(None)
def _window():
    w, h = 1920, 1080
    ys = np.linspace(0, 1, h)[:, None, None]
    top, bot = np.array([14, 20, 40]), np.array([64, 52, 76])
    base = Image.fromarray((top + (bot - top) * ys).repeat(w, axis=1).astype(np.uint8)).convert("RGBA")
    rnd = random.Random(3)
    bok = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(bok)
    for _ in range(170):
        x, y, r = rnd.randint(0, w), rnd.randint(int(h * 0.35), h), rnd.randint(6, 34)
        c = rnd.choice([(255, 206, 130), (255, 170, 100), (170, 210, 255), (255, 240, 200)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=c + (rnd.randint(70, 170),))
    base.alpha_composite(bok.filter(ImageFilter.GaussianBlur(5)))
    fd = ImageDraw.Draw(base)
    for box in ([0, 0, w, 90], [0, h - 90, w, h], [0, 0, 110, h], [w - 110, 0, w, h], [w // 2 - 16, 0, w // 2 + 16, h],
                [0, int(h * 0.58), w, int(h * 0.58) + 28]):
        fd.rectangle(box, fill=(5, 7, 11, 255))
    return base.convert("RGB")


def r_window(sc, t):
    z = 1.0 + 0.42 * ease(t / sc["dur"])
    cw, ch = 1920 / z, 1080 / z
    cx, cy = 960 + min(40 * (t / sc["dur"]), 960 - cw / 2), 540
    return _window().resize((W, H), Image.BILINEAR, box=(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2))


# ───────────────────────────── simple scenes ─────────────────────────────
def r_black(sc, t):
    return Image.new("RGB", (W, H), (0, 0, 0))


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


def r_title(sc, t):
    img = Image.new("RGB", (W, H), (4, 6, 10))
    d = ImageDraw.Draw(img)
    a = min(prog(t, 0.6, 1.4), 1 - prog(t, sc["dur"] - 1.2, 1.0))
    f = F(54, "Light")
    for i, line in enumerate(wrap(d, sc["text"], f, 980)):
        text(d, (W / 2, 290 + i * 74), line, 54, INK, "Light", "mm", a, (4, 6, 10))
    d.line([(W / 2 - 40, 460), (W / 2 + 40, 460)], fill=mix((4, 6, 10), AMBER, a), width=2)
    text(d, (W / 2, 495), "A VIDEO ESSAY", 18, DIM, "Medium", "mm", a, (4, 6, 10))
    return img


def r_endcard(sc, t):
    img = Image.new("RGB", (W, H), (4, 6, 10))
    d = ImageDraw.Draw(img)
    a = min(prog(t, 0.4, 1.2), 1 - prog(t, sc["dur"] - 1.0, 0.8))
    text(d, (W / 2, 300), "Thanks for watching", 46, INK, "Light", "mm", a, (4, 6, 10))
    pill(d, W / 2, 400, "SUBSCRIBE", 24, (4, 6, 10), AMBER, a, under=(4, 6, 10))
    text(d, (W / 2, 480), "What Happens When Every Building on Earth Has to Hit Net Zero?", 18, DIM, "Regular", "mm", a * 0.8,
         (4, 6, 10))
    return img


def base_card():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    for x in range(0, W, 80):
        d.line([(x, 0), (x, H)], fill=(15, 20, 30))
    for y in range(0, H, 80):
        d.line([(0, y), (W, y)], fill=(15, 20, 30))
    return img, d


def r_bars(sc, t):
    img, d = base_card()
    text(d, (80, 60), "WHERE GLOBAL EMISSIONS COME FROM", 18, DIM, "Medium")
    text(d, (W - 80, 60), "Source: UNEP GlobalABC", 16, DIM, "Regular", "ra")
    t37, t28 = when(sc, "37 percent", 0.8), when(sc, "28 percent", 4.0)
    for y, label, val, tt, sub in ((190, "Buildings & construction", 37, t37, "of global CO₂ emissions"),
                                   (400, "Buildings & construction", 28, t28, "of global energy use")):
        a = prog(t, tt - 0.6, 0.6)
        text(d, (120, y - 56), label, 26, INK, "SemiBold", "la", a)
        x0, w_, h_ = 120, 1040, 64
        d.rounded_rectangle([x0, y, x0 + w_, y + h_], 12, fill=mix(BG, (28, 36, 50), a))
        fill = ease((t - tt) / 1.6)
        if fill > 0:
            d.rounded_rectangle([x0, y, x0 + max(24, w_ * val / 100 * fill), y + h_], 12, fill=AMBER)
        n = int(val * fill)
        text(d, (x0, y + h_ + 16), f"{n}%", 64, AMBER if y < 300 else TEAL, "Bold", "la", a)
        text(d, (x0 + 150, y + h_ + 44), sub, 24, DIM, "Regular", "la", a)
        text(d, (x0 + w_ - 16, y + h_ / 2), "everything else", 18, DIM, "Regular", "rm", a * fill)
    return img


def r_growth(sc, t):
    img = gradient(((0, (22, 28, 50)), (0.8, (104, 90, 112)), (1, (150, 112, 108))))
    d = ImageDraw.Draw(img)
    rnd = random.Random(11)
    base_y = 620
    for i in range(42):
        x, bw, bh = 20 + i * 30, rnd.randint(24, 34), rnd.randint(90, 380)
        k = ease((t - 0.2 - i * 0.07) / 2.6)
        top = base_y - bh * k
        d.rectangle([x, top, x + bw, base_y], fill=(30 + i % 4 * 6, 34 + i % 4 * 6, 56 + i % 4 * 6))
        for wy in range(int(top) + 8, base_y - 8, 14):
            if rnd.random() < 0.4 and k > 0.95:
                d.rectangle([x + 5, wy, x + bw - 5, wy + 6], fill=(255, 210, 140))
    for cx, hh in ((330, 430), (760, 470), (1110, 410)):
        sway = 8 * math.sin(t * 0.8 + cx)
        d.line([(cx, base_y), (cx, base_y - hh)], fill=(210, 160, 60), width=4)
        d.line([(cx - 90, base_y - hh), (cx + 130, base_y - hh)], fill=(210, 160, 60), width=4)
        d.line([(cx + 90, base_y - hh), (cx + 90 + sway, base_y - hh + 90)], fill=(160, 160, 160), width=1)
        d.rectangle([cx + 80 + sway, base_y - hh + 90, cx + 100 + sway, base_y - hh + 108], fill=(160, 160, 160))
    d.rectangle([0, base_y, W, H], fill=(14, 16, 24))
    tp, t20 = when(sc, "new Paris", 1.5), when(sc, "20 percent", 9.0)
    pill(d, W / 2, 110, "A NEW PARIS EVERY WEEK", 30, (12, 14, 20), AMBER, prog(t, tp, 0.6), under=(60, 56, 80))
    a = prog(t, t20, 0.6)
    n = int(20 * ease((t - t20) / 1.8))
    text(d, (W / 2, 205), f"+{n}%", 96, INK, "Bold", "mm", a, (60, 56, 80))
    text(d, (W / 2, 275), "global floor area, 2015 → 2024", 24, INK, "Regular", "mm", a, (60, 56, 80))
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
        d.ellipse([x, y, x + 8, y + 8], fill=mix(img.getpixel((5, 5)), AMBER, clamp(1 - (150 - y) / 130)))
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
    for i in range(12):
        x = 90 + i * 40
        d.line([(x, 250), (x + 20, 330)], fill=(214, 120, 60), width=3)
    for y in (255, 285, 315):
        d.line([(80, y), (560, y)], fill=(214, 120, 60), width=3)
    return img


def r_opcarbon(sc, t):
    img = Image.new("RGB", (W, H), BG)
    top, tb = when(sc, "operational carbon", 6.0), when(sc, "embodied carbon", 20.0)
    ta = when(sc, "18 percent", 30.0)
    for half, (x0, pic, t0) in enumerate(((0, _interior(t), top), (640, _concrete(t), tb))):
        k = 0.35 + 0.65 * prog(t, t0 - 0.5, 0.8)
        img.paste(Image.blend(Image.new("RGB", pic.size, BG), pic, k), (x0, 0))
    d = ImageDraw.Draw(img)
    d.line([(640, 40), (640, H - 40)], fill=(40, 48, 62), width=2)
    for cx, label, sub, t0, col in ((320, "OPERATIONAL CARBON", "Energy burned every day the building exists", top, AMBER),
                                     (960, "EMBODIED CARBON", "Emissions baked into the materials before opening day", tb, TEAL)):
        a = prog(t, t0 - 0.2, 0.6)
        pill(d, cx, 70, label, 26, (10, 14, 22), col, a)
        text(d, (cx, 124), sub, 19, INK, "Regular", "mm", prog(t, t0 + 0.8, 0.6), (30, 28, 40))
    pill(d, 960, 560, "Cement + steel ≈ 18% of ALL global emissions", 22, INK, (60, 40, 20), prog(t, ta, 0.6))
    return img


def r_oldnew(sc, t):
    img = gradient(((0, (28, 34, 54)), (1, (96, 84, 100))))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 620, W, H], fill=(14, 16, 24))
    d.rectangle([150, 400, 520, 620], fill=(128, 84, 70))
    for r in range(4):
        for c in range(6):
            d.rectangle([172 + c * 56, 420 + r * 50, 172 + c * 56 + 30, 420 + r * 50 + 32], fill=(236, 200, 140) if (r + c) % 3 else (60, 54, 62))
    d.rectangle([150, 392, 520, 404], fill=(90, 58, 50))
    d.rectangle([700, 180, 1060, 620], fill=(70, 116, 150))
    for i in range(12):
        d.line([(700, 180 + i * 40), (1060, 180 + i * 40)], fill=(150, 196, 226), width=1)
    for i in range(7):
        d.line([(700 + i * 60, 180), (700 + i * 60, 620)], fill=(150, 196, 226), width=1)
    d.polygon([(700, 180), (860, 180), (700, 330)], fill=(120, 168, 200))
    a = prog(t, 0.6, 0.8)
    text(d, (335, 660), "built before 2000", 22, DIM, "Regular", "mm", a, (14, 16, 24))
    text(d, (880, 660), "built last year", 22, DIM, "Regular", "mm", a, (14, 16, 24))
    t50 = when(sc, "2050", 2.0)
    pill(d, W / 2, 90, "Most of 2050's buildings are already standing", 30, (10, 14, 22), AMBER, prog(t, t50 - 0.3, 0.7),
         under=(40, 46, 66))
    return img


def r_retrofit(sc, t):
    img = gradient(((0, (22, 30, 48)), (1, (60, 66, 84))))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 640, W, H], fill=(14, 16, 24))
    tin, thp, tgl, tco = (when(sc, "insulating", 2), when(sc, "heat pumps", 4), when(sc, "glazing", 6),
                          when(sc, "no energy code", 12))
    ain, ahp, agl = prog(t, tin, 1.0), prog(t, thp, 1.0), prog(t, tgl, 1.0)
    x0, x1, y0 = 170, 520, 190
    ins = mix((64, 70, 88), (232, 186, 90), ain)
    d.rectangle([x0 - 16, y0 - 16, x1 + 16, 640], fill=ins)
    d.rectangle([x0, y0, x1, 640], fill=(52, 56, 74))
    for r in range(6):
        for c in range(4):
            glass = mix((86, 70, 62), (130, 214, 230), agl)
            d.rectangle([x0 + 20 + c * 82, y0 + 24 + r * 70, x0 + 20 + c * 82 + 56, y0 + 24 + r * 70 + 46], fill=glass)
    cx, cy = 345, y0 - 40
    d.rectangle([cx - 50, cy - 20 - 10 * (1 - ahp), cx + 50, cy + 30], fill=mix((50, 56, 70), (170, 180, 190), ahp))
    if ahp > 0.3:
        ang = t * 9
        for k in range(4):
            a_ = ang + k * math.pi / 2
            d.line([(cx, cy + 5), (cx + 28 * math.cos(a_), cy + 5 + 12 * math.sin(a_))], fill=(40, 46, 60), width=4)
    x = 700
    for i, (lab, t0, col) in enumerate((("Re-insulate walls", tin, AMBER), ("Replace gas boilers with heat pumps", thp, TEAL),
                                        ("Swap out old glazing", tgl, (130, 214, 230)))):
        a = prog(t, t0, 0.6)
        d.ellipse([x, 190 + i * 76, x + 34, 190 + i * 76 + 34], fill=mix(BG, col, a))
        text(d, (x + 56, 207 + i * 76), lab, 28, INK, "Medium", "lm", a, (40, 46, 62))
    pill(d, 900, 480, "½ of new buildings: no energy code at all", 24, (255, 235, 230), (140, 40, 36), prog(t, tco - 0.3, 0.7),
         under=(40, 46, 62))
    return img


def r_gap(sc, t):
    img, d = base_card()
    text(d, (80, 60), "BUILDINGS: WHERE WE ARE vs WHERE WE NEED TO BE", 18, DIM, "Medium")
    text(d, (W - 80, 60), "Illustrative, not to scale", 16, DIM, "Regular", "ra")
    x0, x1, y0, y1 = 110, 640, 170, 560
    d.line([(x0, y1), (x1, y1)], fill=DIM, width=2)
    d.line([(x0, y0), (x0, y1)], fill=DIM, width=2)
    for i, yr in enumerate(("now", "2027", "2030")):
        text(d, (x0 + (x1 - x0) * i / 2, y1 + 14), yr, 18, DIM, "Regular", "ma")
    yv = lambda v: y1 - (v / 120) * (y1 - y0)
    xv = lambda f: x0 + (x1 - x0) * f
    treq, tact = when(sc, "fall by more than half", 1.5), when(sc, "new record high", 8.0)
    ka, kb = ease((t - treq) / 2.0), ease((t - tact) / 1.8)
    pts = [(xv(f * ka), yv(lerp(100, 44, f * ka))) for f in np.linspace(0, 1, 30)] if ka > 0 else []
    if len(pts) > 1:
        d.line(pts, fill=TEAL, width=5)
        text(d, (pts[-1][0] - 10, pts[-1][1] + 22), "needed: −56% by 2030", 20, TEAL, "SemiBold", "ra", ka)
    pts2 = [(xv(f * kb), yv(lerp(100, 108, f * kb))) for f in np.linspace(0, 1, 30)] if kb > 0 else []
    if len(pts2) > 1:
        d.line(pts2, fill=RED, width=5)
        text(d, (pts2[-1][0] - 10, pts2[-1][1] - 38), "actual: record high", 20, RED, "SemiBold", "ra", kb)
    tr = when(sc, "renewable share", 16.0)
    for i, (lab, v, col) in enumerate((("Today", 17, DIM), ("2030 target", 46, TEAL))):
        a = prog(t, tr + i * 1.4, 0.8)
        bx = 800 + i * 190
        h_ = (y1 - y0) * v / 50 * a
        d.rectangle([bx, y1 - h_, bx + 120, y1], fill=mix(BG, col, 1))
        text(d, (bx + 60, y1 - h_ - 12), f"{int(v * a)}%", 44, INK, "Bold", "ms", a)
        text(d, (bx + 60, y1 + 14), lab, 18, DIM, "Regular", "ma", a)
    text(d, (925, 130), "Renewable share of building energy", 20, INK, "Medium", "ma", prog(t, tr, 0.6))
    return img


def r_g20(sc, t):
    img, d = base_card()
    t1, t2 = when(sc, "G20", 1.0), when(sc, "Two countries", 9.0)
    k1, k2 = prog(t, t1 - 0.5, 0.8), prog(t, t2 - 0.4, 0.8)
    a1 = k1 * (1 - k2)
    if a1 > 0:
        for i in range(20):
            x, y = 400 + (i % 5) * 100, 170 + (i // 5) * 100
            d.rounded_rectangle([x, y, x + 76, y + 76], 10, outline=mix(BG, DIM, a1), width=2)
        text(d, (W / 2, 110), "0 of 20", 64, RED, "Bold", "mm", a1)
        text(d, (W / 2, 580), "G20 countries with a detailed national strategy for buildings", 22, DIM, "Regular", "mm", a1)
    if k2 > 0:
        for i in range(200):
            x, y = 190 + (i % 20) * 44, 190 + (i // 20) * 38
            lit = i in (23, 87)
            d.ellipse([x, y, x + 24, y + 24], fill=mix(BG, TEAL if lit else (44, 54, 70), k2))
        text(d, (W / 2, 110), "2 of ~200", 64, TEAL, "Bold", "mm", k2)
        text(d, (W / 2, 590), "countries with building codes aligned to zero emissions", 22, DIM, "Regular", "mm", k2)
    return img


def r_tasks(sc, t):
    img, d = base_card()
    items = (("retrofit a hundred", "Retrofit a century of existing buildings", INK),
             ("rebuild the entire", "Rebuild the cement and steel supply chain", INK),
             ("rewrite building codes", "Rewrite building codes in ~200 countries", INK),
             ("twenty-five years", "…in about 25 years", RED))
    for i, (kw, lab, col) in enumerate(items):
        a = prog(t, when(sc, kw, 1.0 + i * 3), 0.8)
        text(d, (160, 160 + i * 100), f"{i + 1}", 22, DIM, "Medium", "la", a)
        text(d, (210, 150 + i * 100), lab, 42, col, "Light", "la", a)
    a = prog(t, when(sc, "twenty-five years", 12), 0.8)
    d.rounded_rectangle([210, 570, 1070, 590], 10, fill=mix(BG, (28, 36, 50), a))
    d.rounded_rectangle([210, 570, 210 + 860 * 0.88 * ease((t - when(sc, "twenty-five years", 12)) / 5), 590], 10, fill=mix(BG, RED, a))
    text(d, (210, 604), "most of the time has already gone", 18, DIM, "Regular", "la", a)
    return img


def _daysky():
    return gradient(((0, (120, 176, 218)), (1, (236, 228, 206))))


def r_certified(sc, t):
    img = _daysky()
    d = ImageDraw.Draw(img)
    d.rectangle([0, 620, W, H], fill=(70, 94, 84))
    d.rectangle([160, 240, 520, 620], fill=(206, 214, 222))
    for r in range(5):
        for c in range(4):
            d.rectangle([184 + c * 84, 270 + r * 66, 184 + c * 84 + 56, 270 + r * 66 + 44], fill=(96, 138, 170))
    for k in range(5):
        d.polygon([(170 + k * 70, 240), (225 + k * 70, 240), (210 + k * 70, 205), (155 + k * 70, 205)], fill=(30, 52, 98))
        glint = 0.5 + 0.5 * math.sin(t * 1.5 + k)
        d.line([(180 + k * 70, 235), (200 + k * 70, 210)], fill=mix((30, 52, 98), (190, 220, 255), glint), width=2)
    tl = when(sc, "LEED", 3.0)
    for i, name in enumerate(("LEED", "EDGE", "IGBC", "GRIHA")):
        pill(d, 820, 220 + i * 78, name, 30, (10, 40, 30), (120, 214, 168), prog(t, tl + 0.5 * i, 0.5), under=(190, 214, 220))
    pill(d, 860, 560, "Operational + embodied, checked before it opens", 22, (16, 24, 34), (255, 255, 255),
         prog(t, when(sc, "before it ever opens", 7.0), 0.6), under=(210, 222, 226))
    pill(d, 860, 625, "One developer builds to standard → the market follows", 20, (16, 24, 34), (255, 236, 190),
         prog(t, when(sc, "competitors have to follow", 14.0), 0.6), under=(214, 220, 214))
    return img


def r_timber(sc, t):
    img = _daysky()
    d = ImageDraw.Draw(img)
    d.rectangle([0, 620, W, H], fill=(86, 92, 78))
    wood = (196, 150, 98)
    n = 4
    for f in range(n):
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
    px = 300 + 40 * math.sin(t * 0.6)
    py = 130 + 30 * math.sin(t * 0.9) + 40
    d.line([(px, 90), (px, py)], fill=(60, 60, 60), width=1)
    d.rectangle([px - 70, py, px + 70, py + 16], fill=wood)
    for i, (kw, lab) in enumerate((("mass timber", "Mass timber replaces steel + concrete where viable"),
                                    ("30 to 70", "Low-carbon & geopolymer concrete: cement footprint −30 to −70%"),
                                    ("recycled steel", "Recycled steel: far less carbon than virgin steel"))):
        pill(d, 880, 250 + i * 92, lab, 20, (22, 28, 36), (255, 255, 255), prog(t, when(sc, kw, 2 + 4 * i), 0.6),
             under=(206, 214, 214), pad=(18, 12))
    return img


def r_heatpump(sc, t):
    img = _daysky()
    d = ImageDraw.Draw(img)
    p = t / sc["dur"]
    d.rectangle([0, 620, W, H], fill=(96, 118, 90))
    d.polygon([(130, 360), (330, 240), (530, 360)], fill=(120, 72, 62))
    d.rectangle([160, 360, 500, 620], fill=(236, 226, 206))
    d.rectangle([220, 430, 300, 520], fill=(255, 226, 150))
    d.rectangle([360, 430, 440, 520], fill=(255, 226, 150))
    d.rounded_rectangle([540, 520, 650, 620], 8, fill=(200, 206, 212))
    d.ellipse([560, 536, 630, 606], outline=(80, 86, 94), width=3)
    ang = t * 9
    for k in range(3):
        a_ = ang + k * 2.09
        d.line([(595, 571), (595 + 32 * math.cos(a_), 571 + 32 * math.sin(a_))], fill=(60, 64, 70), width=5)
    d.line([(540, 580), (500, 580)], fill=TEAL, width=4)
    ta = when(sc, "A heat pump", 1.0)
    a = prog(t, ta, 0.8)
    pill(d, 940, 190, "Grid getting cleaner →", 22, (16, 24, 34), (255, 255, 255), a, under=(200, 214, 224))
    for i, (lab, h_, col) in enumerate((("Gas boiler", 1.0, (150, 150, 156)), ("Heat pump", lerp(0.62, 0.18, ease(p)), TEAL))):
        bx = 820 + i * 170
        hh = 260 * h_ * a
        d.rectangle([bx, 560 - hh, bx + 110, 560], fill=col)
        text(d, (bx + 55, 574), lab, 20, (30, 40, 52), "Medium", "ma", a, (96, 118, 90))
    text(d, (940, 240), "emissions per unit of heat (illustrative)", 17, (30, 40, 52), "Regular", "ma", a, (200, 214, 224))
    return img


RENDER = {
    "title": r_title, "skyline_open": r_skyline_open, "window": r_window, "black": r_black, "bars": r_bars,
    "growth": r_growth, "opcarbon": r_opcarbon, "oldnew": r_oldnew, "retrofit": r_retrofit, "gap": r_gap,
    "g20": r_g20, "tasks": r_tasks, "skyline_warm": r_skyline_warm, "certified": r_certified, "timber": r_timber,
    "heatpump": r_heatpump, "dim": r_dim, "skyline_day": r_skyline_day, "pullback": r_pullback, "endcard": r_endcard,
}
