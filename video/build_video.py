#!/usr/bin/env python3
"""Build the net-zero buildings video from script.md, entirely locally.

Narration: Kokoro (ONNX) TTS. Visuals: procedural PIL scenes (visuals.py). Mux/encode: ffmpeg.

  python3 build_video.py                    # full 1280x720 render -> out/net_zero_buildings.mp4
  python3 build_video.py --quick            # 8 fps preview
  python3 build_video.py --scenes 0:6       # only scenes 0..5
  python3 build_video.py --still 12.5       # dump one frame (seconds) to out/still.png

Needs: pip install kokoro-onnx soundfile pillow numpy ; ffmpeg ; Kokoro model files (see MODEL_DIR).
"""
import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
from multiprocessing import Pool

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw

import visuals as V

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE, OUT = os.path.join(HERE, "cache"), os.path.join(HERE, "out")
MODEL_DIR = os.environ.get("KOKORO_DIR", "/tmp/kokoro")
VOICE, SPEED, LANG = "bm_george", 0.9, "en-gb"
SR, W, H = 24000, V.W, V.H
LEAD, TAIL, GAP, PARA_GAP, FADE, XFADE = 0.5, 0.6, 0.30, 0.75, 0.45, 0.9
FPS = 24

PRONOUNCE = [(r"\bCO2\b", "C O two"), (r"\bLEED\b", "Leed"), (r"\bEDGE\b", "Edge"), (r"\bIGBC\b", "I G B C"),
             (r"\bGRIHA\b", "Gri-ha"), (r"\bG20\b", "G twenty"), (r"\b2050\b", "twenty fifty")]

KINDS = [("dense city skyline", "skyline_open"), ("single window", "window"), ("bar breaking", "bars"),
         ("timelapse", "growth"), ("two labeled halves", "opcarbon"), ("an old low-rise", "oldnew"),
         ("retrofit", "retrofit"), ("line graph", "gap"), ("slow pan across a map", "g20"),
         ("shift in tone", "skyline_warm"), ("certified green", "certified"), ("mass timber", "timber"),
         ("heat pump", "heatpump"), ("return to the opening", "skyline_day"), ("slow pull back", "pullback")]


# ───────────────────────────── parsing ─────────────────────────────
def parse(path):
    scenes = [{"kind": "title", "text": "What Happens When Every Building on Earth Has to Hit Net Zero?", "items": [],
               "fixed": 6.0, "act": 0}]
    act, pending = 0, None
    cur = None

    def new(kind, **kw):
        nonlocal cur, pending
        cur = {"kind": kind, "items": [], "act": act, "act_title": pending, **kw}
        pending = None
        scenes.append(cur)

    for raw in open(path, encoding="utf-8"):
        line = raw.strip()
        if line.startswith("## PRODUCTION"):
            break
        m = re.match(r"## ACT (\d+) — (.+?) \(", line)
        if m:
            act, pending = int(m.group(1)), (f"ACT {m.group(1)}", m.group(2).title())
            continue
        m = re.match(r"\*\*\[VISUAL: (.+)\]\*\*", line)
        if m:
            cue = m.group(1)
            kind = next((k for pat, k in KINDS if pat in cue.lower()), None)
            if kind is None:
                sys.exit(f"No renderer for cue: {cue}")
            new(kind, cue=cue)
            continue
        m = re.match(r"\*\*\[(BEAT|HOLD ON BLACK|END CARD)(.*)\]\*\*", line)
        if m:
            tag, rest = m.group(1), m.group(2).lower()
            if tag == "END CARD":
                new("endcard", fixed=6.5)
            elif tag == "HOLD ON BLACK":
                new("black", fixed=2.5)
            elif "hold on black" in rest:
                new("dim")
            elif "emotional" in rest:
                new("tasks")
            elif cur:
                cur["items"].append(("pause", 1.6))
            continue
        if not line or line[0] in "#*-" or not cur:
            continue
        cur["items"].append(("p", line.replace("*", "")))
    return scenes


def sentences(p):
    return [s for s in re.split(r'(?<=[.!?])\s+(?=[A-Z"“‘\'])', p) if s]


# ───────────────────────────── narration ─────────────────────────────
_kokoro = None


def tts(s):
    global _kokoro
    spoken = s
    for pat, rep in PRONOUNCE:
        spoken = re.sub(pat, rep, spoken)
    key = hashlib.md5(f"{VOICE}|{SPEED}|{spoken}".encode()).hexdigest()
    path = os.path.join(CACHE, f"{key}.npy")
    if os.path.exists(path):
        return np.load(path)
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(os.path.join(MODEL_DIR, "k.onnx"), os.path.join(MODEL_DIR, "v.bin"))
    audio, sr = _kokoro.create(spoken, voice=VOICE, speed=SPEED, lang=LANG)
    assert sr == SR
    np.save(path, audio.astype(np.float32))
    return audio


def caption_chunks(sents):
    """Two-line caption chunks, timed by character share of each sentence."""
    d = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    f = V.F(30, "Medium")
    out = []
    for s in sents:
        lines = V.wrap(d, s["text"], f, 1040)
        groups = [" ".join(lines[i:i + 2]) for i in range(0, len(lines), 2)]
        total, t0 = sum(len(g) for g in groups), s["t0"]
        for g in groups:
            dt = (s["t1"] - s["t0"]) * len(g) / total
            out.append({"text": g, "t0": t0, "t1": t0 + dt + (0.25 if g is groups[-1] else 0)})
            t0 += dt
    return out


def timeline(scenes):
    t, chunks = 0.0, []
    for sc in scenes:
        sc["start"], local, sc["sentences"] = t, LEAD, []
        for kind, val in sc["items"]:
            if kind == "pause":
                local += val
                continue
            for s in sentences(val):
                a = tts(s)
                d = len(a) / SR
                sc["sentences"].append({"text": s, "t0": local, "t1": local + d})
                chunks.append((t + local, a))
                local += d + GAP
            local += PARA_GAP - GAP
        dur = max(local + TAIL if sc["items"] else 0, sc.get("fixed", 0))
        sc["dur"] = math.ceil(dur * FPS) / FPS
        sc["captions"] = caption_chunks(sc["sentences"])
        t += sc["dur"]
    return t, chunks


def narration_track(total, chunks):
    track = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for start, a in chunks:
        i = int(start * SR)
        track[i:i + len(a)] += a
    return track[:int(total * SR)]


def music_track(total, swell_from):
    n = int(total * SR)
    t = np.arange(n) / SR
    m = np.zeros(n)
    for f, a in ((55.0, 1.0), (82.41, 0.6), (110.0, 0.5), (164.81, 0.22), (220.0, 0.1)):
        lfo = 1 + 0.25 * np.sin(2 * np.pi * (0.03 + (f % 7) * 0.004) * t + f)
        m += a * np.sin(2 * np.pi * f * t + 0.8 * np.sin(2 * np.pi * 0.05 * t)) * lfo
    noise = np.convolve(np.random.default_rng(1).normal(size=n), np.ones(400) / 400, mode="same")
    m += 4 * noise
    env = np.minimum(1, t / 4) * np.minimum(1, (total - t) / 5)
    swell = 1 + 1.6 * np.clip((t - swell_from) / max(1, total - swell_from), 0, 1) ** 1.5
    m = m * env * swell
    return (m / np.abs(m).max() * 0.07).astype(np.float32)


# ───────────────────────────── rendering ─────────────────────────────
SCENES = []
BAND = Image.fromarray(np.tile(np.linspace(0, 215, 190, dtype=np.uint8)[:, None], (1, W)))
BLACK = Image.new("RGB", (W, 190), (0, 0, 0))


def draw_caption(img, sc, t):
    cap = next((c for c in sc["captions"] if c["t0"] <= t < c["t1"]), None)
    if not cap:
        return
    img.paste(BLACK, (0, H - 190), BAND)
    d = ImageDraw.Draw(img)
    f = V.F(30, "Medium")
    lines = V.wrap(d, cap["text"], f, 1040)
    y = H - 36 - 40 * len(lines)
    for i, ln in enumerate(lines):
        d.text((W / 2 + 2, y + i * 40 + 2), ln, font=f, fill=(0, 0, 0), anchor="ma")
        d.text((W / 2, y + i * 40), ln, font=f, fill=(255, 255, 255), anchor="ma")


def draw_act_title(img, sc, t):
    if not sc.get("act_title") or sc["kind"] in ("title", "black"):
        return
    a = min(V.prog(t, 0.5, 0.6), 1 - V.prog(t, 3.6, 0.6))
    if a <= 0.01:
        return
    band = Image.new("RGB", (460, 90), (0, 0, 0))
    img.paste(band, (60, 50), Image.new("L", (460, 90), int(110 * a)))
    d = ImageDraw.Draw(img)
    d.rectangle([60, 56, 64, 128], fill=V.mix((0, 0, 0), V.AMBER, a))
    d.text((84, 62), sc["act_title"][0], font=V.F(16, "SemiBold"), fill=V.mix((0, 0, 0), V.AMBER, a))
    d.text((84, 88), sc["act_title"][1], font=V.F(26, "Medium"), fill=V.mix((0, 0, 0), V.INK, a))


HARD_CUT = ("title", "black", "endcard")


def frame(sc, t, prev=None, nxt=None):
    """One frame. Scenes cross-dissolve: the first XFADE seconds blend in the previous scene running on
    past its end; scenes next to a title/black/end card dip to black instead."""
    img = V.render(sc, t)
    if t < XFADE and prev is not None and sc["kind"] not in HARD_CUT and prev["kind"] not in HARD_CUT:
        img = Image.blend(V.render(prev, prev["dur"] + t), img, V.ease(t / XFADE))
    else:
        f_in = 1 if prev is not None and prev["kind"] not in HARD_CUT and sc["kind"] not in HARD_CUT else t / FADE
        f_out = 1 if nxt is not None and nxt["kind"] not in HARD_CUT and sc["kind"] not in HARD_CUT else (sc["dur"] - t) / FADE
        f = min(1, f_in, f_out) if sc["kind"] != "black" else 1
        if f < 1:
            img = Image.blend(Image.new("RGB", img.size, (0, 0, 0)), img, max(0, f))
    draw_act_title(img, sc, t)
    draw_caption(img, sc, t)
    return img


def render_scene(args):
    i, fps, scale = args
    sc = SCENES[i]
    prev = SCENES[i - 1] if i > 0 else None
    nxt = SCENES[i + 1] if i + 1 < len(SCENES) else None
    seg = os.path.join(OUT, f"seg_{i:03d}.mp4")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps),
           "-i", "-", "-vf", f"scale={int(W * scale)}:{int(H * scale)}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
           "-pix_fmt", "yuv420p", seg]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for k in range(round(sc["dur"] * fps)):
        p.stdin.write(frame(sc, k / fps, prev, nxt).tobytes())
    p.stdin.close()
    p.wait()
    return i, seg


def srt(scenes, path):
    def ts(x):
        return f"{int(x // 3600):02}:{int(x % 3600 // 60):02}:{int(x % 60):02},{int(x % 1 * 1000):03}"
    n = 0
    with open(path, "w", encoding="utf-8") as fh:
        for sc in scenes:
            for c in sc["captions"]:
                n += 1
                fh.write(f"{n}\n{ts(sc['start'] + c['t0'])} --> {ts(sc['start'] + c['t1'])}\n{c['text']}\n\n")


def main():
    global FPS, SCENES
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--scenes", help="a:b slice of scene indices")
    ap.add_argument("--still", type=float)
    ap.add_argument("--script", default=os.path.join(HERE, "script.md"))
    args = ap.parse_args()
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    fps, scale = (8, 0.5) if args.quick else (24, 1.0)

    scenes = parse(args.script)
    total, chunks = timeline(scenes)
    print(f"{len(scenes)} scenes, {total / 60:.1f} min", flush=True)
    srt(scenes, os.path.join(OUT, "captions.srt"))
    if V.credits():
        with open(os.path.join(OUT, "credits.txt"), "w", encoding="utf-8") as fh:
            fh.write("Photos via Wikimedia Commons:\n")
            for c in json.load(open(os.path.join(V.ASSETS, "credits.json"), encoding="utf-8")):
                fh.write(f"- {c['title']} — {c['author']} — {c['license']} — {c['page']}\n")
    for i, sc in enumerate(scenes):
        print(f"{i:2} {sc['start']:7.1f}s {sc['dur']:5.1f}s {sc['kind']}")

    if args.still is not None:
        sc = next(s for s in scenes if s["start"] <= args.still < s["start"] + s["dur"])
        frame(sc, args.still - sc["start"]).save(os.path.join(OUT, "still.png"))
        return

    lo, hi = (map(int, args.scenes.split(":")) if args.scenes else (0, len(scenes)))
    SCENES = scenes
    with Pool(min(4, hi - lo)) as pool:
        segs = {}
        for i, seg in pool.imap_unordered(render_scene, [(i, fps, scale) for i in range(lo, hi)]):
            segs[i] = seg
            print(f"rendered scene {i} ({len(segs)}/{hi - lo})", flush=True)

    t0, t1 = scenes[lo]["start"], scenes[hi - 1]["start"] + scenes[hi - 1]["dur"]
    swell = next((s["start"] for s in scenes if s["act"] == 5), total)
    mix_ = narration_track(total, chunks) * 0.9 + music_track(total, swell)
    mix_ = mix_[int(t0 * SR):int(t1 * SR)]
    wav = os.path.join(OUT, "audio.wav")
    sf.write(wav, mix_ / max(1.0, np.abs(mix_).max()), SR)
    lst = os.path.join(OUT, "segments.txt")
    with open(lst, "w") as fh:
        fh.writelines(f"file '{segs[i]}'\n" for i in range(lo, hi))
    name = "net_zero_buildings_preview.mp4" if (args.quick or args.scenes) else "net_zero_buildings.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav, "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest", os.path.join(OUT, name)], check=True)
    for s in segs.values():
        os.remove(s)
    print("done ->", os.path.join(OUT, name))


if __name__ == "__main__":
    main()
