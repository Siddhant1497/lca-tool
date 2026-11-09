#!/usr/bin/env python3
"""Animated explainer: narration -> timings -> canvas frames (Chromium) -> MP4 with music and SFX.

  python3 kurz/build.py                                  # 30 s demo -> out/kurz-demo/kurz-demo.mp4
  python3 kurz/build.py --project kurz/concrete60.json    # 1-minute film -> out/<project out>/<out>.mp4
  python3 kurz/build.py --project kurz/concrete60.json --still 9   # one frame -> out/<out>/still.png
  python3 kurz/build.py --project kurz/concrete60.json --voice am_michael
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
import engine  # noqa: E402

DEMO = {
    "html": "scene.html", "out": "kurz-demo", "fps": 30, "music": "drone", "voice": "bm_george", "speed": 0.95,
    "narration": [
        "The concrete in this building finished polluting, before anyone moved in.",
        "Zoom into the walls. Cement is made by heating limestone in a kiln, and that chemistry alone releases carbon dioxide.",
        "Add the steel in the frame, and together they make around fifteen percent of the world's CO2.",
        "It's called embodied carbon. The carbon you can't see.",
    ],
}


def sfx(events, n):
    """Synthesised sound cues: pop (something appears), whoosh (transition), ding (a number lands), boom (title)."""
    sr, out, rng = engine.SR, np.zeros(n, dtype=np.float32), np.random.default_rng(3)
    for e in events:
        i = int(e["t"] * sr)
        if i >= n:
            continue
        kind = e["kind"]
        if kind == "pop":
            k = np.arange(int(0.12 * sr)) / sr
            s = np.sin(2 * np.pi * (520 + 900 * k / 0.12) * k) * np.exp(-k * 38) * 0.2
        elif kind == "ding":
            k = np.arange(int(1.2 * sr)) / sr
            s = (np.sin(2 * np.pi * 1318.5 * k) + 0.4 * np.sin(2 * np.pi * 2637 * k)) * np.exp(-k * 4.5) * 0.12
        elif kind == "boom":
            k = np.arange(int(1.6 * sr)) / sr
            s = np.sin(2 * np.pi * (70 - 25 * k) * k) * np.exp(-k * 2.6) * 0.5
            s += np.convolve(rng.normal(size=len(k)), np.ones(200) / 200, mode="same") * np.exp(-k * 6) * 1.2
        else:  # whoosh
            k = np.arange(int(0.7 * sr)) / sr
            s = np.convolve(rng.normal(size=len(k)), np.ones(30) / 30, mode="same") * np.sin(np.pi * k / 0.7) ** 2 * 0.5
        s = s[:n - i]
        out[i:i + len(s)] += s.astype(np.float32)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", help="JSON with html, out, fps, music, voice, speed, narration")
    ap.add_argument("--voice")
    ap.add_argument("--speed", type=float)
    ap.add_argument("--still", type=float)
    args = ap.parse_args()
    proj = dict(DEMO)
    if args.project:
        proj.update(json.load(open(args.project, encoding="utf-8")))
    voice, speed, fps = args.voice or proj["voice"], args.speed or proj["speed"], int(proj["fps"])
    out = os.path.join(os.path.dirname(HERE), "out", proj["out"])
    os.makedirs(out, exist_ok=True)
    os.makedirs(engine.CACHE, exist_ok=True)

    t, sents, chunks = 0.8, [], []
    for para in proj["narration"]:
        for s in engine.sentences(para):
            a = engine.tts(s, voice, speed)
            d = len(a) / engine.SR
            sents.append({"text": s, "t0": t, "t1": t + d, "speaker": None})
            chunks.append((t, a))
            t += d + 0.35
        t += 0.6
    total = round(t + 2.2, 2)
    data = {"total": total, "sentences": sents, "captions": engine.caption_chunks(sents, False)}
    dpath = os.path.join(out, "data.json")
    json.dump(data, open(dpath, "w"))

    node = ["node", os.path.join(HERE, "render.cjs"), os.path.join(HERE, proj["html"]), dpath]
    if args.still is not None:
        subprocess.run(node + ["x", str(fps), "--still", str(args.still), os.path.join(out, "still.png")], check=True, cwd=REPO)
        return

    silent = os.path.join(out, "video.mp4")
    subprocess.run(node + [silent, str(fps)], check=True, cwd=REPO)

    narration = np.zeros(int(total * engine.SR), dtype=np.float32)
    for start, a in chunks:
        k = int(start * engine.SR)
        narration[k:k + len(a)] += a[:len(narration) - k]
    narration *= 0.85 / (np.abs(narration).max() + 1e-9)
    events = json.load(open(dpath.replace(".json", ".events.json")))
    mixed = narration + engine.music(proj["music"], total, narration) + sfx(events, len(narration))
    wav = os.path.join(out, "audio.wav")
    sf.write(wav, mixed / max(1.0, np.abs(mixed).max()), engine.SR)

    final = os.path.join(out, f"{proj['out']}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    os.remove(silent)
    with open(os.path.join(out, "captions.srt"), "w", encoding="utf-8") as fh:
        f = lambda x: f"{int(x // 3600):02}:{int(x % 3600 // 60):02}:{int(x % 60):02},{int(x % 1 * 1000):03}"
        for i, s in enumerate(sents, 1):
            fh.write(f"{i}\n{f(s['t0'])} --> {f(s['t1'])}\n{s['text']}\n\n")
    print("done ->", final, f"({total:.1f}s)")


if __name__ == "__main__":
    main()
