"""Your own voice and your own music for Paper Earth films.

Recording: one take per video from a phone (m4a, mp3, ogg/opus, wav, amr), reading each paragraph of the
script sheet with a clear pause (about 2 seconds) between paragraphs and a short breath between sentences.
The take is cleaned (rumble filter, noise reduction, gentle compression), then cut at its longest pauses:
first into paragraphs, then each paragraph into sentences, so captions and visuals stay timed to your words.
A folder of one file per paragraph (sorted by name) also works.

Music: any track (e.g. from the YouTube Audio Library). It is looped or trimmed to length, faded,
and ducked under the voice. Its tempo is estimated so the visuals can still land on its beats.
"""
import glob
import os
import subprocess

import numpy as np

CLEAN = "highpass=f=80,afftdn=nr=12:nf=-50,acompressor=threshold=-21dB:ratio=3:attack=5:release=120"  # no low-pass: at 24 kHz it would sit on the Nyquist limit


def load(path, sr, clean=True):
    """Decode any audio file to mono float32 at sr, optionally with voice clean-up."""
    cmd = ["ffmpeg", "-v", "error", "-i", path] + (["-af", CLEAN] if clean else []) + ["-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    a = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).copy()
    if not len(a):
        raise SystemExit(f"no audio decoded from {path}")
    return a


def _quiet(a, sr, hop=0.01):
    """Per-10 ms frame: is it quiet? Threshold adapts to the recording's own noise floor and speech level."""
    h = int(sr * hop)
    rms = np.sqrt(np.convolve(a.astype(np.float64) ** 2, np.ones(h) / h, mode="same")[::h] + 1e-12)
    db = 20 * np.log10(rms)
    floor, speech = np.percentile(db, 10), np.percentile(db, 90)
    return db < floor + 0.35 * (speech - floor), h


def trim(a, sr, pad=0.06):
    q, h = _quiet(a, sr)
    loud = np.where(~q)[0]
    if not len(loud):
        return a
    i0, i1 = max(0, loud[0] * h - int(pad * sr)), min(len(a), (loud[-1] + 1) * h + int(pad * sr))
    return a[i0:i1]


def split(a, sr, n, min_gap):
    """Cut audio into n pieces at its n-1 longest pauses (each at least min_gap seconds)."""
    if n <= 1:
        return [trim(a, sr)]
    q, h = _quiet(a, sr)
    runs, i = [], 0
    while i < len(q):
        if q[i]:
            j = i
            while j < len(q) and q[j]:
                j += 1
            if i > 0 and j < len(q) and (j - i) * h / sr >= min_gap:  # interior pauses only
                runs.append((j - i, (i + j) // 2))
            i = j
        else:
            i += 1
    if len(runs) < n - 1:
        raise SystemExit(f"found {len(runs)} pauses, need {n - 1}: leave a clear pause between "
                         f"{'paragraphs' if min_gap > 0.5 else 'sentences'} and record again")
    cuts = sorted(c for _, c in sorted(runs, reverse=True)[:n - 1])
    edges = [0] + [c * h for c in cuts] + [len(a)]
    return [trim(a[edges[k]:edges[k + 1]], sr) for k in range(n)]


def paragraphs(path, sr, n):
    """Paragraph clips from one take, or from a folder of one file per paragraph."""
    if os.path.isdir(path):
        files = sorted(f for f in glob.glob(os.path.join(path, "*")) if os.path.isfile(f))
        if len(files) != n:
            raise SystemExit(f"{path}: {len(files)} files for {n} paragraphs")
        return [trim(load(f, sr), sr) for f in files]
    return split(load(path, sr), sr, n, min_gap=0.8)


def bpm(a, sr):
    """Rough tempo from onset-strength autocorrelation, 70–160 bpm."""
    h = 512
    frames = len(a) // h
    if frames < 64:
        return None
    env = np.sqrt(np.add.reduceat(a[:frames * h].astype(np.float64) ** 2, np.arange(0, frames * h, h)))
    onset = np.maximum(0, np.diff(np.log(env + 1e-9)))
    onset -= onset.mean()
    ac = np.correlate(onset, onset, mode="full")[len(onset) - 1:]
    fps = sr / h
    lo, hi = int(fps * 60 / 160), int(fps * 60 / 70)
    lag = lo + int(np.argmax(ac[lo:hi]))
    return 60 * fps / lag


def music_bed(path, total, narration, sr, level=0.12):
    """Your track, looped or trimmed to the film's length, faded and ducked under the voice."""
    m = load(path, sr, clean=False)
    n = int(total * sr)
    m = np.tile(m, int(np.ceil(n / len(m))))[:n].astype(np.float64)
    t = np.arange(n) / sr
    env = np.minimum(1, t / 1.5) * np.minimum(1, (total - t) / 3.0)
    win = sr // 4
    voice_env = np.convolve(np.abs(narration), np.ones(win) / win, mode="same")
    duck = 1 - 0.55 * np.clip(voice_env / (voice_env.max() + 1e-9) * 5, 0, 1)
    duck = np.convolve(duck, np.ones(sr // 6) / (sr // 6), mode="same")
    m = m * env * duck
    return (m / (np.abs(m).max() + 1e-9) * level).astype(np.float32)
