#!/usr/bin/env python3
"""Paper Earth film builder: narration -> timings -> canvas/WebGL frames (Chromium) -> MP4 with an original score.

  python3 paper/build.py                       # full render -> out/<out>/<out>.mp4 + captions.srt
  python3 paper/build.py --still 12.5          # one frame   -> out/<out>/still.png
  python3 paper/build.py --voice bf_emma --speed 0.98
  python3 paper/build.py --timing              # print sentence timings only
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
REPO = os.path.dirname(VIDEO)
sys.path.insert(0, VIDEO)
sys.path.insert(0, HERE)
import engine  # noqa: E402  (narration + sentence splitting, shared with the other films)
import sound  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default=os.path.join(HERE, "story.json"))
    ap.add_argument("--voice")
    ap.add_argument("--speed", type=float)
    ap.add_argument("--still", type=float)
    ap.add_argument("--timing", action="store_true")
    args = ap.parse_args()
    proj = json.load(open(args.project, encoding="utf-8"))
    voice, speed, fps = args.voice or proj["voice"], args.speed or proj["speed"], int(proj["fps"])
    out = os.path.join(VIDEO, "out", proj["out"])
    os.makedirs(out, exist_ok=True)
    os.makedirs(engine.CACHE, exist_ok=True)

    t, sents, chunks = 0.7, [], []
    for pi, para in enumerate(proj["narration"]):
        for s in engine.sentences(para):
            a = engine.tts(s, voice, speed)
            d = len(a) / engine.SR
            sents.append({"text": s, "t0": round(t, 3), "t1": round(t + d, 3), "para": pi})
            chunks.append((t, a))
            t += d + 0.26
        t += 0.55
    total = round(t + proj.get("outro", 4), 2)
    if args.timing:
        for s in sents:
            print(f"{s['t0']:6.2f} {s['t1']:6.2f}  {s['text']}")
        print("total", total)
        return
    data = {"total": total, "sentences": sents, "size": proj["size"]}
    dpath = os.path.join(out, "data.json")
    json.dump(data, open(dpath, "w"))

    node = ["node", os.path.join(VIDEO, "kurz", "render.cjs"), os.path.join(HERE, proj["html"]), dpath]
    if args.still is not None:
        subprocess.run(node + ["x", str(fps), "--still", str(args.still), os.path.join(out, "still.png")], check=True, cwd=REPO)
        return
    silent = os.path.join(out, "video.mp4")
    subprocess.run(node + [silent, str(fps)], check=True, cwd=REPO)

    n = int(total * engine.SR)
    narration = np.zeros(n, dtype=np.float32)
    for start, a in chunks:
        k = int(start * engine.SR)
        narration[k:k + len(a)] += a[:n - k]
    narration *= 0.85 / (np.abs(narration).max() + 1e-9)
    events = json.load(open(dpath.replace(".json", ".events.json")))
    mixed = narration + sound.score(total, narration, engine.SR) + sound.sfx(events, n, engine.SR)
    wav = os.path.join(out, "audio.wav")
    sf.write(wav, mixed / max(1.0, np.abs(mixed).max()), engine.SR)

    final = os.path.join(out, f"{proj['out']}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "20",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final], check=True)
    os.remove(silent)
    with open(os.path.join(out, "captions.srt"), "w", encoding="utf-8") as fh:
        f = lambda x: f"{int(x // 3600):02}:{int(x % 3600 // 60):02}:{int(x % 60):02},{int(x % 1 * 1000):03}"
        for i, s in enumerate(sents, 1):
            fh.write(f"{i}\n{f(s['t0'])} --> {f(s['t1'])}\n{s['text']}\n\n")
    print("done ->", final, f"({total:.1f}s)")


if __name__ == "__main__":
    main()
