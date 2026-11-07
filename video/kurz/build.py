#!/usr/bin/env python3
"""Animated (flat-vector, explainer-style) demo: narration -> timings -> canvas frames -> MP4.

  python3 kurz/build.py                 # out/kurz-demo/kurz-demo.mp4
  python3 kurz/build.py --still 9       # one frame at 9 s -> out/kurz-demo/still.png
  python3 kurz/build.py --voice am_michael
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import engine  # noqa: E402

NARRATION = [
    "This building finished most of its polluting, before anyone moved in.",
    "Zoom into the walls. Cement is made by heating limestone in a kiln, and that chemistry alone releases carbon dioxide.",
    "Add the steel in the frame, and together they make around fifteen percent of the world's CO2.",
    "It's called embodied carbon. The carbon you can't see.",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="bm_george")
    ap.add_argument("--speed", type=float, default=0.95)
    ap.add_argument("--still", type=float)
    args = ap.parse_args()
    out = os.path.join(os.path.dirname(HERE), "out", "kurz-demo")
    os.makedirs(out, exist_ok=True)
    os.makedirs(engine.CACHE, exist_ok=True)

    t, sents, chunks = 0.8, [], []
    for para in NARRATION:
        for s in engine.sentences(para):
            a = engine.tts(s, args.voice, args.speed)
            d = len(a) / engine.SR
            sents.append({"text": s, "t0": t, "t1": t + d, "speaker": None})
            chunks.append((t, a))
            t += d + 0.35
        t += 0.6
    total = round(t + 1.6, 2)
    data = {"total": total, "sentences": sents, "captions": engine.caption_chunks(sents, False)}
    dpath = os.path.join(out, "data.json")
    json.dump(data, open(dpath, "w"))

    node = ["node", os.path.join(HERE, "render.cjs"), os.path.join(HERE, "scene.html"), dpath]
    if args.still is not None:
        subprocess.run(node + ["x", "30", "--still", str(args.still), os.path.join(out, "still.png")], check=True,
                       cwd=os.path.dirname(os.path.dirname(HERE)))
        return

    narration = np.zeros(int(total * engine.SR), dtype=np.float32)
    for start, a in chunks:
        k = int(start * engine.SR)
        narration[k:k + len(a)] += a[:len(narration) - k]
    narration *= 0.85 / (np.abs(narration).max() + 1e-9)
    mixed = narration + engine.music("drone", total, narration)
    wav = os.path.join(out, "audio.wav")
    sf.write(wav, mixed / max(1.0, np.abs(mixed).max()), engine.SR)

    silent = os.path.join(out, "video.mp4")
    subprocess.run(node + [silent, "30"], check=True, cwd=os.path.dirname(os.path.dirname(HERE)))
    final = os.path.join(out, "kurz-demo.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    os.remove(silent)
    print("done ->", final, f"({total:.1f}s)")


if __name__ == "__main__":
    main()
