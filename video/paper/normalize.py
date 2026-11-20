#!/usr/bin/env python3
"""Set finished videos to -14 LUFS (YouTube / Instagram playback level) without re-encoding the picture.

  python3 paper/normalize.py out/paper-series/*.mp4      # files are replaced in place
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice  # noqa: E402

for f in sys.argv[1:]:
    wav, tmp = f + ".norm.wav", f + ".norm.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f, "-vn", "-ac", "2", wav], check=True)
    before = voice.loudnorm(wav, wav + ".ln.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f, "-i", wav + ".ln.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, f)
    for x in (wav, wav + ".ln.wav"):
        os.remove(x)
    print(f"{f}: {before:.1f} -> -14.0 LUFS")
