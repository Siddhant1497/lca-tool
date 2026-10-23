"""Scene-script video engine: projects/<slug>/script.md -> narrated, captioned MP4.

Handles 9:16 shorts (1080x1920, 30 fps) and 16:9 long-form (1920x1080, 24 fps). See projects/README.md for
the script format. Voices come from the script header (`voice:`, `voices:`) and can be overridden from
make.py, so a voice change is a re-render with nothing else touched.
"""
import hashlib
import json
import math
import os
import re
import subprocess
from multiprocessing import Pool

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw

import visuals as V
from visuals import AMBER, DIM, INK, RED, TEAL, F, ease, mix, panel, pill, prog, text, wrap

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "cache")
MODEL_DIR = os.environ.get("KOKORO_DIR", "/tmp/kokoro")
SR = 24000
DARK = (8, 11, 18)

PRONOUNCE = [(r"\bU\.S\.", "U S"), (r"\bCO2\b", "C O two"), (r"\bLEED\b", "Leed"), (r"\bEDGE\b", "Edge"), (r"\bIGBC\b", "I G B C"),
             (r"\bGRIHA\b", "Gri-ha"), (r"\bTERI\b", "Terry"), (r"\bCII\b", "C I I"), (r"\bIFC\b", "I F C"),
             (r"\bR-410A\b", "R four-ten A"), (r"\bAC\b", "A C"), (r"\bHVAC\b", "H-vac"), (r"\b1987\b", "nineteen eighty-seven"),
             (r"\b1850\b", "eighteen fifty"), (r"\b2050\b", "twenty fifty"), (r"\bG20\b", "G twenty")]

FORMATS = {
    "9:16": dict(W=1080, H=1920, fps=30, lead=0.2, gap=0.16, para=0.32, tail=0.35, xfade=0.3, short=True),
    "16:9": dict(W=1920, H=1080, fps=24, lead=0.5, gap=0.3, para=0.7, tail=0.7, xfade=0.8, short=False),
}
SPEAKER_COLORS = [(244, 176, 66), (72, 201, 176), (150, 170, 255), (236, 92, 84)]


# ───────────────────────────── parsing ─────────────────────────────
def parse(path):
    raw = open(path, encoding="utf-8").read()
    raw = re.sub(r"<!--.*?-->", "", raw, flags=re.S)
    head, body = re.match(r"---\n(.*?)\n---\n(.*)", raw, re.S).groups()
    cfg = {}
    for line in head.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            cfg[k.strip()] = v.strip()
    cfg["voices"] = dict(p.split("=") for p in re.split(r",\s*", cfg.get("voices", "")) if "=" in p)
    publish = ""
    if "## PUBLISH" in body:
        body, publish = body.split("## PUBLISH", 1)
    scenes = []
    for line in body.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("# scene"):
            attrs = dict(a.split("=", 1) for a in line.split()[2:])
            scenes.append({"attrs": attrs, "items": [], "overlays": []})
            continue
        sc = scenes[-1]
        m = re.match(r">\s*(\w+):\s*(.*)", line)
        if m:
            kind, payload = m.groups()
            anchor = None
            if " @ " in payload:
                payload, anchor = payload.rsplit(" @ ", 1)
            sc["overlays"].append({"kind": kind, "text": payload.strip(), "anchor": anchor, "after": len(sc["items"])})
            continue
        m = re.match(r"\(pause ([\d.]+)\)", line)
        if m:
            sc["items"].append(("pause", float(m.group(1)), None))
            continue
        m = re.match(r"([A-Z]+):\s+(.*)", line)
        if m and m.group(1) in cfg["voices"]:
            sc["items"].append(("say", m.group(2), m.group(1)))
            continue
        sc["items"].append(("say", line, None))
    return cfg, scenes, publish.strip()


def sentences(p):
    return [s for s in re.split(r'(?<![A-Z]\.[A-Z]\.)(?<=[.!?])\s+(?=[A-Z"“‘\'])', p) if s]


# ───────────────────────────── narration ─────────────────────────────
_kokoro = None


def tts(s, voice, speed):
    global _kokoro
    spoken = s
    for pat, rep in PRONOUNCE:
        spoken = re.sub(pat, rep, spoken)
    lang = "en-gb" if voice.startswith("b") else "en-us"
    key = hashlib.md5(f"{voice}|{speed}|{spoken}".encode()).hexdigest()
    path = os.path.join(CACHE, f"{key}.npy")
    if os.path.exists(path):
        return np.load(path)
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(os.path.join(MODEL_DIR, "k.onnx"), os.path.join(MODEL_DIR, "v.bin"))
    audio, sr = _kokoro.create(spoken, voice=voice, speed=speed, lang=lang)
    assert sr == SR
    np.save(path, audio.astype(np.float32))
    return audio


def when(sc, phrase, default):
    p = phrase.lower()
    for s in sc["sentences"]:
        i = s["text"].lower().find(p)
        if i >= 0:
            return s["t0"] + (s["t1"] - s["t0"]) * i / max(1, len(s["text"]))
    return default


def caption_chunks(sents, short):
    """Shorts: 1-3 word punchy chunks. Long-form: two-line subtitles. Timed by character share."""
    out = []
    for s in sents:
        if short:
            words, groups, cur = s["text"].split(), [], []
            for w in words:
                cur.append(w)
                if len(cur) == 3 or w[-1] in ",.!?:;" or len(" ".join(cur)) > 16:
                    groups.append(" ".join(cur))
                    cur = []
            if cur:
                groups.append(" ".join(cur))
        else:
            d = ImageDraw.Draw(Image.new("RGB", (8, 8)))
            lines = wrap(d, s["text"], F(44, "Medium"), 1500)
            groups = [" ".join(lines[i:i + 2]) for i in range(0, len(lines), 2)]
        total, t0 = sum(len(g) + 2 for g in groups), s["t0"]
        for g in groups:
            dt = (s["t1"] - s["t0"]) * (len(g) + 2) / total
            out.append({"text": g, "t0": t0, "t1": t0 + dt, "speaker": s["speaker"]})
            t0 += dt
    return out


def build_timeline(cfg, scenes, fmt, voice_override=None, voices_override=None):
    narrator = voice_override or cfg.get("voice", "bm_george")
    voices = {**cfg["voices"], **(voices_override or {})}
    speed = float(cfg.get("speed", 1.0))
    t, chunks = 0.0, []
    for i, sc in enumerate(scenes):
        sc["start"], local, sc["sentences"] = t, fmt["lead"], []
        for kind, val, who in sc["items"]:
            sc.setdefault("item_t", []).append(local)
            if kind == "pause":
                local += val
                continue
            for s in sentences(val):
                a = tts(s, voices.get(who, narrator), speed)
                d = len(a) / SR
                sc["sentences"].append({"text": s, "t0": local, "t1": local + d, "speaker": who})
                chunks.append((t + local, a))
                local += d + fmt["gap"]
            local += fmt["para"] - fmt["gap"]
        sc.setdefault("item_t", []).append(local)  # end of narration
        tail = fmt["tail"] + (1.8 if i == len(scenes) - 1 else 0)
        sc["dur"] = math.ceil(max(local + tail, 1.5) * fmt["fps"]) / fmt["fps"]
        for ov in sc["overlays"]:
            base = sc["item_t"][min(ov["after"], len(sc["item_t"]) - 1)]
            ov["t"] = when(sc, ov["anchor"], base) if ov["anchor"] else base
            if ov["after"] == 0 and not ov["anchor"]:
                ov["t"] = 0.15 if fmt["short"] else 0.6
        sc["captions"] = caption_chunks(sc["sentences"], fmt["short"])
        sc["index"] = i
        t += sc["dur"]
    return t, chunks


# ───────────────────────────── audio ─────────────────────────────
def music(kind, total, narration):
    n = int(total * SR)
    t = np.arange(n) / SR
    if kind == "none":
        return np.zeros(n, dtype=np.float32)
    if kind == "drone":
        m = np.zeros(n)
        for f, a in ((55.0, 1.0), (82.41, 0.6), (110.0, 0.5), (164.81, 0.22), (220.0, 0.1)):
            m += a * np.sin(2 * np.pi * f * t + 0.8 * np.sin(2 * np.pi * 0.05 * t)) * (1 + 0.25 * np.sin(2 * np.pi * 0.03 * t + f))
        m += 4 * np.convolve(np.random.default_rng(1).normal(size=n), np.ones(400) / 400, mode="same")
        level = 0.07
    else:  # pulse: soft plucked arpeggio, Am-F-C-G at 96 bpm
        m = np.zeros(n)
        beat = 60 / 96 / 2
        chords = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (261.63, 329.63, 392.0), (196.0, 246.94, 293.66)]
        k = 0
        while k * beat < total:
            chord = chords[int(k // 8) % 4]
            f = chord[k % 3] * (2 if k % 8 in (3, 7) else 1)
            i0 = int(k * beat * SR)
            seg = np.arange(min(int(SR * 0.6), n - i0)) / SR
            m[i0:i0 + len(seg)] += np.sin(2 * np.pi * f * seg) * np.exp(-seg * 7) * 0.6
            if k % 8 == 0:  # bass
                seg2 = np.arange(min(int(SR * 1.6), n - i0)) / SR
                m[i0:i0 + len(seg2)] += np.sin(2 * np.pi * chord[0] / 2 * seg2) * np.exp(-seg2 * 1.5)
            k += 1
        level = 0.06
    env = np.minimum(1, t / 1.5) * np.minimum(1, (total - t) / 2.5)
    voice_env = np.convolve(np.abs(narration), np.ones(4800) / 4800, mode="same")
    duck = 1 - 0.45 * np.clip(voice_env / (voice_env.max() + 1e-9) * 4, 0, 1)
    m = m * env * duck
    return (m / (np.abs(m).max() + 1e-9) * level).astype(np.float32)


# ───────────────────────────── visuals ─────────────────────────────
_vig = {}


def vignette(img, strength):
    W, H = img.size
    if (W, H, strength) not in _vig:
        ys, xs = np.mgrid[0:H, 0:W]
        r = np.sqrt(((xs - W / 2) / (W / 2)) ** 2 + ((ys - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
        _vig[(W, H, strength)] = Image.fromarray((np.clip((r - 0.4) / 0.6, 0, 1) ** 1.5 * 255 * strength).astype(np.uint8))
    img.paste((0, 0, 0), (0, 0), _vig[(W, H, strength)])


_shade = {}


def legibility(img, short):
    """Darken the regions where overlays and captions sit."""
    W, H = img.size
    if (W, H) not in _shade:
        ys = np.linspace(0, 1, H)[:, None]
        if short:
            a = 0.30 + 0.25 * np.exp(-((ys - 0.3) / 0.22) ** 2) + 0.35 * np.clip((ys - 0.55) / 0.3, 0, 1)
        else:
            a = 0.18 + 0.45 * np.clip((ys - 0.72) / 0.28, 0, 1)
        _shade[(W, H)] = Image.fromarray(np.repeat((np.clip(a, 0, 0.85) * 255).astype(np.uint8), W, axis=1))
    img.paste((0, 0, 0), (0, 0), _shade[(W, H)])


def background(sc, t, W, H):
    attrs = sc["attrs"]
    keys = [k for k in attrs.get("photos", "").split(",") if k]
    files = []
    for k in keys:
        fs = V.photos(k)
        if fs:
            files.append(fs[sc["index"] % len(fs)])
    grade = attrs.get("grade", "day")
    zoom = attrs.get("zoom", "in" if sc["index"] % 2 == 0 else "out")
    z = (1.0, 1.1) if zoom == "in" else (1.1, 1.0)
    if not files:
        img = Image.new("RGB", (W, H), DARK)
        ImageDraw.Draw(img).ellipse([W * 0.1, H * 0.1, W * 0.9, H * 0.6], fill=(18, 26, 42))
        return img
    n, dur, xf = len(files), sc["dur"], 0.5
    seg = dur / n
    i = min(n - 1, int(t / seg))
    drift = ((-0.5, 0.5)[sc["index"] % 2], 0.2)
    img = V.ken_burns(files[i], (t - i * seg) / seg, W, H, grade, z, drift)
    if i + 1 < n and t > (i + 1) * seg - xf:
        nxt = V.ken_burns(files[i + 1], 0, W, H, grade, z, drift)
        img = Image.blend(img, nxt, ease((t - ((i + 1) * seg - xf)) / xf))
    if "dim" in attrs:
        img = Image.blend(Image.new("RGB", (W, H)), img, 1 - float(attrs["dim"]))
    return img


def star(d, cx, cy, r, fill):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=fill)


def count_text(value, k):
    m = re.fullmatch(r"([~>≈]?\s*)([\d,]+(?:\.\d+)?)(.*)", value)
    if not m or k >= 1:
        return value
    pre, num, post = m.groups()
    v = float(num.replace(",", "")) * k
    s = f"{v:,.0f}" if "," in num or "." not in num else f"{v:.1f}"
    return f"{pre}{s}{post}"


def draw_overlays(img, sc, t, fmt, cfg):
    W, H = img.size
    short = fmt["short"]
    u = (W if short else H) / 1080
    items = [o for o in sc["overlays"] if o["kind"] == "item" and t >= o["t"]]
    for o in sc["overlays"]:
        if t < o["t"] or o["kind"] == "item":
            continue
        k, a = t - o["t"], prog(t, o["t"], 0.35)
        a = min(a, 1 - prog(t, sc["dur"] - 0.3, 0.3))
        kind, s = o["kind"], o["text"]
        if kind in ("hook", "title"):
            size = int((86 if kind == "hook" else 120) * u) if short else int((76 if kind == "title" else 70) * u)
            f = F(size, "ExtraBold")
            d = ImageDraw.Draw(img)
            lines = wrap(d, s, f, W * (0.86 if short else 0.7))
            y0 = (H * (0.24 if kind == "hook" else 0.2)) if short else H * 0.42 - len(lines) * size * 0.6
            y0 += (1 - ease(k / 0.35)) * 30 * u
            for i, ln in enumerate(lines):
                cy = y0 + i * size * 1.12
                if kind == "hook":
                    w = d.textlength(ln, font=f)
                    panel(img, (W / 2 - w / 2 - 22 * u, cy - size * 0.62, W / 2 + w / 2 + 22 * u, cy + size * 0.62), a * 0.92,
                          AMBER if i == 0 else (12, 14, 20), int(10 * u))
                    text(img, (W / 2, cy), ln, size, (12, 14, 20) if i == 0 else INK, "ExtraBold", "mm", a)
                else:
                    text(img, (W / 2 + 3, cy + 3), ln, size, (0, 0, 0), "ExtraBold", "mm", a * 0.6)
                    text(img, (W / 2, cy), ln, size, INK, "ExtraBold", "mm", a)
            if kind == "title":
                yy = y0 + len(lines) * size * 1.12 - size * 0.35
                ImageDraw.Draw(img).rectangle([W / 2 - 60 * u * ease(k / 0.5), yy, W / 2 + 60 * u * ease(k / 0.5), yy + 6 * u],
                                              fill=AMBER)
        elif kind == "stat":
            parts = [p.strip() for p in s.split("|")]
            value, cap = parts[0], parts[1] if len(parts) > 1 else ""
            src = parts[2] if len(parts) > 2 else ""
            cx = W / 2 if short else W * 0.07
            anchor = "mm" if short else "lm"
            y = H * 0.36 if short else H * 0.32
            big = int((150 if short else 130) * u)
            if not short:
                panel(img, (W * 0.05, y - big * 0.8, W * 0.5, y + big * 1.35), a * 0.6, r=int(18 * u))
                cx = W * 0.075
            text(img, (cx, y), count_text(value, ease(k / 1.1)), big, AMBER, "ExtraBold", anchor, a)
            d = ImageDraw.Draw(img)
            capw = W * (0.84 if short else 0.4)
            for i, ln in enumerate(wrap(d, cap, F(int(44 * u), "SemiBold"), capw)):
                text(img, (cx, y + big * 0.78 + i * 54 * u), ln, int(44 * u), INK, "SemiBold", anchor, a)
            if src:
                text(img, (cx, y + big * 0.78 + 54 * u * len(wrap(d, cap, F(int(44 * u), "SemiBold"), capw)) + 10 * u),
                     "Source: " + src, int(26 * u), DIM, "Regular", anchor, a)
        elif kind == "label":
            pill(img, W / 2 if short else W * 0.5, H * (0.135 if short else 0.1), s, int(40 * u), (12, 14, 20), AMBER, a,
                 "Bold", (int(26 * u), int(14 * u)))
        elif kind == "quote":
            d = ImageDraw.Draw(img)
            size = int((70 if short else 64) * u)
            lines = wrap(d, s, F(size, "Bold"), W * (0.84 if short else 0.66))
            y0 = H * (0.34 if short else 0.4) - len(lines) * size * 0.55
            text(img, (W / 2, y0 - size * 0.9), "“", int(size * 1.6), AMBER, "Bold", "mm", a)
            for i, ln in enumerate(lines):
                text(img, (W / 2 + 3, y0 + i * size * 1.15 + 3), ln, size, (0, 0, 0), "Bold", "mm", a * 0.6)
                text(img, (W / 2, y0 + i * size * 1.15), ln, size, INK, "Bold", "mm", a)
        elif kind == "versus":
            left, right = [p.strip() for p in s.split("|")]
            y = H * (0.3 if short else 0.45)
            off = W * (0.24 if short else 0.2)
            pill(img, W / 2 - off, y, left, int(46 * u), (12, 14, 20), AMBER, a, "ExtraBold", (int(24 * u), int(16 * u)))
            pill(img, W / 2 + off, y, right, int(46 * u), (12, 14, 20), TEAL, a, "ExtraBold", (int(24 * u), int(16 * u)))
            text(img, (W / 2, y), "vs", int(40 * u), INK, "Bold", "mm", a)
        elif kind == "review":
            stars_n, head, body, sig = [p.strip() for p in s.split("|")]
            cw = W * (0.86 if short else 0.5)
            x0 = (W - cw) / 2
            y0 = H * (0.16 if short else 0.14)
            d = ImageDraw.Draw(img)
            body_lines = wrap(d, body, F(int(38 * u)), cw - 70 * u)
            ch = (200 + 50 * len(body_lines) + 80) * u
            y0 += (1 - ease(k / 0.4)) * 40 * u
            panel(img, (x0, y0, x0 + cw, y0 + ch), a * 0.96, (250, 250, 252), int(26 * u))
            for i in range(5):
                star(d, x0 + 60 * u + i * 62 * u, y0 + 62 * u, 26 * u,
                     mix((250, 250, 252), (245, 166, 35) if i < int(stars_n) else (210, 212, 218), a))
            text(img, (x0 + 36 * u, y0 + 120 * u), head, int(40 * u), (20, 24, 32), "Bold", "la", a)
            for i, ln in enumerate(body_lines):
                text(img, (x0 + 36 * u, y0 + (186 + i * 50) * u), ln, int(38 * u), (52, 58, 70), "Regular", "la", a)
            text(img, (x0 + cw - 36 * u, y0 + ch - 50 * u), "— " + sig, int(36 * u), (20, 24, 32), "SemiBold", "ra", a)
            text(img, (x0 + 36 * u, y0 + ch - 50 * u), "Fictional review", int(24 * u), (140, 146, 158), "Regular", "la", a)
        elif kind == "cta":
            bounce = 1 + 0.04 * math.sin(k * 5) * (1 - ease(k / 2))
            pill(img, W / 2, H * (0.6 if short else 0.78), s, int(44 * u * bounce), (12, 14, 20), AMBER, a, "Bold",
                 (int(30 * u), int(18 * u)))
        elif kind == "chapter":
            ca = min(prog(t, o["t"], 0.5), 1 - prog(t, o["t"] + 4.0, 0.6))
            if ca > 0.01:
                panel(img, (W * 0.04, H * 0.07, W * 0.04 + 640 * u, H * 0.07 + 96 * u), ca * 0.7, r=int(12 * u))
                ImageDraw.Draw(img).rectangle([W * 0.04, H * 0.07, W * 0.04 + 6 * u, H * 0.07 + 96 * u], fill=mix((0, 0, 0), AMBER, ca))
                text(img, (W * 0.04 + 28 * u, H * 0.07 + 48 * u), s, int(36 * u), INK, "SemiBold", "lm", ca)
    if items:
        d = ImageDraw.Draw(img)
        size = int((42 if short else 36) * u)
        rows = [wrap(d, o["text"], F(size, "SemiBold"), W * (0.68 if short else 0.36)) for o in items]
        x0 = W * (0.07 if short else 0.55)
        y = H * (0.2 if short else 0.24) + (200 * u if short and any(o["kind"] == "title" for o in sc["overlays"]) else 0)
        for o, lines in zip(items, rows):
            ia = min(prog(t, o["t"], 0.3), 1 - prog(t, sc["dur"] - 0.3, 0.3))
            h_ = (len(lines) * size * 1.2 + 30 * u)
            slide = (1 - ease((t - o["t"]) / 0.3)) * 40 * u
            panel(img, (x0 - slide, y, x0 + W * (0.86 if short else 0.4) - slide, y + h_), ia * 0.75, r=int(16 * u))
            d.ellipse([x0 + 20 * u - slide, y + h_ / 2 - 18 * u, x0 + 56 * u - slide, y + h_ / 2 + 18 * u], fill=mix((10, 12, 18), TEAL, ia))
            for i, ln in enumerate(lines):
                text(img, (x0 + 76 * u - slide, y + 15 * u + size * 0.6 + i * size * 1.2), ln, size, INK, "SemiBold", "lm", ia)
            y += h_ + 16 * u


def draw_speaker(img, sc, t, fmt, cfg):
    cap = next((c for c in sc["captions"] if c["t0"] <= t < c["t1"] + 0.3), None)
    if not cap or not cap["speaker"]:
        return
    W, H = img.size
    u = (W if fmt["short"] else H) / 1080
    names = dict(p.split("=") for p in re.split(r",\s*", cfg.get("names", "")) if "=" in p)
    who = cap["speaker"]
    col = SPEAKER_COLORS[list(cfg["voices"]).index(who) % len(SPEAKER_COLORS)]
    pill(img, W / 2, H * (0.1 if fmt["short"] else 0.12), names.get(who, who), int(38 * u), (12, 14, 20), col, 1.0, "ExtraBold",
         (int(26 * u), int(14 * u)))


def draw_captions(img, sc, t, fmt):
    cap = next((c for c in sc["captions"] if c["t0"] <= t < c["t1"]), None)
    if not cap:
        return
    W, H = img.size
    d = ImageDraw.Draw(img)
    if fmt["short"]:
        u = W / 1080
        size = int(74 * u)
        f = F(size, "ExtraBold")
        s = cap["text"].upper()
        lines = wrap(d, s, f, W * 0.84)
        pop = 1 - ease((t - cap["t0"]) / 0.12)
        y0 = H * 0.7 - pop * 10 * u
        for i, ln in enumerate(lines):
            col = AMBER if re.search(r"\d", ln) else (255, 255, 255)
            d.text((W / 2, y0 + i * size * 1.1), ln, font=f, fill=col, anchor="mm", stroke_width=int(7 * u), stroke_fill=(0, 0, 0))
    else:
        u = H / 1080
        f = F(int(44 * u), "Medium")
        lines = wrap(d, cap["text"], f, 1500 * u)
        y = H - 60 * u - 58 * u * len(lines)
        for i, ln in enumerate(lines):
            d.text((W / 2, y + i * 58 * u), ln, font=f, fill=(255, 255, 255), anchor="ma", stroke_width=int(3 * u),
                   stroke_fill=(0, 0, 0))


def endcard(t, dur, W, H, credits_line):
    img = Image.new("RGB", (W, H), DARK)
    vignette(img, 0.6)
    u = H / 1080
    a = min(prog(t, 0.3, 0.8), 1 - prog(t, dur - 0.8, 0.6))
    text(img, (W / 2, H * 0.36), "Thanks for watching", int(72 * u), INK, "Light", "mm", a)
    pill(img, W / 2, H * 0.5, "SUBSCRIBE", int(40 * u), (12, 14, 20), AMBER, a, "Bold", (int(30 * u), int(16 * u)))
    if credits_line:
        text(img, (W / 2, H * 0.68), credits_line, int(26 * u), DIM, "Regular", "mm", a)
        text(img, (W / 2, H * 0.72), "Full photo credits and sources in the description", int(26 * u), DIM, "Regular", "mm", a)
    return img


def frame(ctx, i, t):
    fmt, cfg, scenes = ctx["fmt"], ctx["cfg"], ctx["scenes"]
    W, H = fmt["W"], fmt["H"]
    sc = scenes[i]
    if sc.get("endcard"):
        return endcard(t, sc["dur"], W, H, ctx["credits_line"])
    img = background(sc, t, W, H)
    legibility(img, fmt["short"])
    vignette(img, 0.5)
    draw_overlays(img, sc, t, fmt, cfg)
    draw_speaker(img, sc, t, fmt, cfg)
    if i > 0 and t < fmt["xfade"] and not scenes[i - 1].get("endcard"):
        prev = scenes[i - 1]
        pimg = background(prev, prev["dur"] + t, W, H)
        legibility(pimg, fmt["short"])
        vignette(pimg, 0.5)
        draw_overlays(pimg, prev, prev["dur"] - 0.01, fmt, cfg)
        img = Image.blend(pimg, img, ease(t / fmt["xfade"]))
    if i == 0 and not fmt["short"]:
        img = Image.blend(Image.new("RGB", (W, H)), img, min(1, t / 0.6))
    if i == len(scenes) - 1 or scenes[i + 1].get("endcard"):
        img = Image.blend(Image.new("RGB", (W, H)), img, min(1, max(0, (sc["dur"] - t) / 0.6)))
    draw_captions(img, sc, t, fmt)
    if fmt["short"]:  # progress bar
        p = (sc["start"] + t) / ctx["total"]
        ImageDraw.Draw(img).rectangle([0, 0, W * p, 8], fill=AMBER)
    return img


CTX = {}


def render_scene(args):
    i, out = args
    ctx = CTX
    fmt = ctx["fmt"]
    sc = ctx["scenes"][i]
    seg = os.path.join(out, f"seg_{i:03d}.mp4")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{fmt['W']}x{fmt['H']}",
           "-r", str(fmt["fps"]), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", seg]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for k in range(round(sc["dur"] * fmt["fps"])):
        p.stdin.write(frame(ctx, i, k / fmt["fps"]).tobytes())
    p.stdin.close()
    p.wait()
    return i, seg


# ───────────────────────────── build ─────────────────────────────
def used_credits(scenes):
    path = os.path.join(V.ASSETS, "credits.json")
    allc = {c["file"]: c for c in json.load(open(path, encoding="utf-8"))} if os.path.exists(path) else {}
    files = []
    for sc in scenes:
        for k in sc["attrs"].get("photos", "").split(","):
            fs = V.photos(k) if k else ()
            if fs:
                f = os.path.basename(fs[sc["index"] % len(fs)])
                if f not in files:
                    files.append(f)
    return [allc[f] for f in files if f in allc], [f for f in files if f not in allc]


def ts(x):
    return f"{int(x // 60):02}:{int(x % 60):02}"


def build(slug, voice=None, voices=None, still=None, workers=4):
    global CTX
    proj = os.path.join(HERE, "projects", slug)
    out = os.path.join(HERE, "out", slug)
    os.makedirs(out, exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)
    cfg, scenes, publish = parse(os.path.join(proj, "script.md"))
    fmt = FORMATS[cfg.get("aspect", "9:16")]
    total, chunks = build_timeline(cfg, scenes, fmt, voice, voices)
    creds, own = used_credits(scenes)
    if not fmt["short"]:
        scenes.append({"endcard": True, "dur": 6.0, "start": total, "attrs": {}, "overlays": [], "captions": [], "index": len(scenes)})
        total += 6.0
    CTX = {"fmt": fmt, "cfg": cfg, "scenes": scenes, "total": total,
           "credits_line": "Photos: Wikimedia Commons contributors" if creds else ""}
    print(f"[{slug}] {len(scenes)} scenes, {total:.1f}s, voice={voice or cfg.get('voice')}", flush=True)

    if still is not None:
        i = next(k for k, s in enumerate(scenes) if s["start"] <= still < s["start"] + s["dur"])
        path = os.path.join(out, "still.png")
        frame(CTX, i, still - scenes[i]["start"]).save(path)
        return path

    # audio
    narration = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for start, a in chunks:
        k = int(start * SR)
        narration[k:k + len(a)] += a
    narration = narration[:int(total * SR)]
    narration *= 0.85 / (np.abs(narration).max() + 1e-9)
    mixed = narration + music(cfg.get("music", "pulse"), total, narration)
    wav = os.path.join(out, "audio.wav")
    sf.write(wav, mixed / max(1.0, np.abs(mixed).max()), SR)

    with Pool(workers) as pool:
        segs = dict(pool.imap_unordered(render_scene, [(i, out) for i in range(len(scenes))]))
    lst = os.path.join(out, "segments.txt")
    with open(lst, "w") as fh:
        fh.writelines(f"file '{segs[i]}'\n" for i in range(len(scenes)))
    mp4 = os.path.join(out, f"{slug}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav, "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", mp4], check=True)
    for s in segs.values():
        os.remove(s)
    os.remove(lst)

    # captions, chapters, credits, description
    with open(os.path.join(out, "captions.srt"), "w", encoding="utf-8") as fh:
        n = 0
        for sc in scenes:
            for s in sc.get("sentences", []):
                n += 1
                a, b = sc["start"] + s["t0"], sc["start"] + s["t1"]
                fmt_t = lambda x: f"{int(x // 3600):02}:{int(x % 3600 // 60):02}:{int(x % 60):02},{int(x % 1 * 1000):03}"
                fh.write(f"{n}\n{fmt_t(a)} --> {fmt_t(b)}\n{s['text']}\n\n")
    chapters = [(0.0, "Intro")] + [(sc["start"] + o["t"], o["text"].split("·", 1)[-1].strip())
                                   for sc in scenes for o in sc.get("overlays", []) if o["kind"] == "chapter"]
    credit_lines = [f"- \"{c['title'].removeprefix('File:')}\" by {c['author']}, {c['license']}, {c['page']}" for c in creds]
    credit_lines += [f"- {f} (your own photo)" for f in own]
    desc = publish
    if not fmt["short"]:
        desc = re.sub(r"Chapters:.*?\n\n", "Chapters:\n" + "\n".join(f"{ts(t)} {name}" for t, name in chapters) + "\n\n",
                      desc, flags=re.S)
    desc += "\n\nPhoto credits (Wikimedia Commons):\n" + "\n".join(credit_lines) + "\n" if credit_lines else ""
    with open(os.path.join(out, "description.txt"), "w", encoding="utf-8") as fh:
        fh.write(desc)
    with open(os.path.join(out, "credits.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(credit_lines) + "\n")
    print(f"[{slug}] done -> {mp4}", flush=True)
    return mp4
