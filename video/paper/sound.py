"""Original score and sound effects for the Paper Earth films (numpy only, nothing sampled).

Score: a warm, slow piece in D major at 76 bpm. Felt-piano style notes over a soft pad and a
low bass note per bar, with the music dipping under the narrator.
Effects: paper swish, pencil scratch, wooden tock, kalimba chime, soft thump.
"""
import numpy as np

A4 = 440.0
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name):
    return A4 * 2 ** ((NOTE[name[:-1]] + 12 * (int(name[-1]) + 1) - 69) / 12)


def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same") if k > 1 else x


def felt(f, dur, sr, vel=1.0):
    """Soft piano-like note: a few decaying harmonics with a gentle attack."""
    t = np.arange(int(dur * sr)) / sr
    s = np.zeros_like(t)
    for h, a, d in ((1, 1.0, 2.2), (2, 0.42, 3.4), (3, 0.16, 5.0), (4, 0.06, 7.0)):
        s += a * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h)) * np.exp(-t * d)
    return s * np.minimum(1, t / 0.012) * np.minimum(1, (dur - t) / 0.08) * vel


def kalimba(f, dur, sr, vel=1.0):
    t = np.arange(int(dur * sr)) / sr
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 4.2) + 0.22 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 22)
    return s * np.minimum(1, t / 0.004) * vel


def pad(freqs, dur, sr):
    t = np.arange(int(dur * sr)) / sr
    s = np.zeros_like(t)
    for i, f in enumerate(freqs):
        for det in (-0.35, 0.3):
            s += np.sin(2 * np.pi * (f + det) * t + i) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t + i * 1.7))
    env = np.minimum(1, t / 1.6) * np.minimum(1, (dur - t) / 1.6)
    return s * env / len(freqs)


def add(buf, i, s):
    if i >= len(buf) or i < 0:
        return
    s = s[:len(buf) - i]
    buf[i:i + len(s)] += s


def score(total, narration, sr):
    n = int(total * sr)
    m, p = np.zeros(n), np.zeros(n)
    beat = 60 / 76
    bar = beat * 4
    chords = [  # bass, pad tones, arpeggio notes
        ("D2", ["D3", "A3", "F#4"], ["D4", "A4", "E5", "F#5", "A4", "E5", "D5", "A4"]),
        ("B1", ["B2", "F#3", "D4"], ["B3", "F#4", "D5", "F#5", "A4", "D5", "F#4", "A4"]),
        ("G2", ["G2", "D3", "B3"], ["G3", "D4", "B4", "D5", "F#5", "D5", "B4", "D4"]),
        ("A2", ["A2", "E3", "C#4"], ["A3", "E4", "A4", "C#5", "E5", "C#5", "B4", "E4"]),
    ]
    rng = np.random.default_rng(5)
    k = 0
    while k * bar < total - 3.0:
        bass, tones, arp = chords[k % 4]
        i0 = int(k * bar * sr)
        add(p, i0, pad([hz(x) for x in tones], bar + 1.8, sr))
        add(m, i0, felt(hz(bass), 3.0, sr, 0.9))
        sparse = k < 2  # intro: half-time, then the full eighth-note figure
        lift = k * bar > total * 0.62  # final third: add an octave sparkle
        for e in range(8):
            if sparse and e % 2:
                continue
            vel = (0.62 if e % 2 == 0 else 0.42) * (0.9 + 0.2 * rng.random())
            j = i0 + int((e * beat / 2 + rng.normal(0, 0.006)) * sr)
            add(m, j, felt(hz(arp[e]), 1.7, sr, vel))
            if lift and e in (2, 6):
                add(m, j, kalimba(hz(arp[e]) * 2, 1.2, sr, 0.22))
        k += 1
    i0 = int(k * bar * sr)  # closing chord
    for x, v in (("D2", 0.9), ("A3", 0.5), ("D4", 0.55), ("F#4", 0.5), ("A4", 0.45), ("D5", 0.4)):
        add(m, i0 + int(rng.random() * 0.03 * sr), felt(hz(x), 3.2, sr, v))
    m = lowpass(m, 3) * 0.55 + lowpass(p, 9) * 0.5
    t = np.arange(n) / sr
    env = np.minimum(1, t / 1.2) * np.minimum(1, (total - t) / 2.2)
    voice_env = np.convolve(np.abs(narration), np.ones(sr // 4) / (sr // 4), mode="same")
    duck = 1 - 0.5 * np.clip(voice_env / (voice_env.max() + 1e-9) * 5, 0, 1)
    duck = lowpass(duck, sr // 6)
    m = m * env * duck
    return (m / (np.abs(m).max() + 1e-9) * 0.11).astype(np.float32)


def sfx(events, n, sr):
    out, rng = np.zeros(n, dtype=np.float32), np.random.default_rng(9)
    for e in events:
        i, kind = int(e["t"] * sr), e["kind"]
        if kind == "paper":  # page swish: bright noise with a fluttering envelope
            k = np.arange(int(0.55 * sr)) / sr
            x = rng.normal(size=len(k))
            x = x - lowpass(x, 6)
            s = x * np.sin(np.pi * k / 0.55) ** 1.5 * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * k)) * 0.16
        elif kind == "scratch":  # pencil on paper
            d = float(e.get("dur", 0.5))
            k = np.arange(int(d * sr)) / sr
            x = rng.normal(size=len(k))
            x = lowpass(x - lowpass(x, 5), 2)
            s = x * np.minimum(1, k / 0.03) * np.minimum(1, (d - k) / 0.08) * (0.55 + 0.45 * np.sin(2 * np.pi * 31 * k) ** 2) * 0.075
        elif kind == "tock":  # a paper label set down
            k = np.arange(int(0.16 * sr)) / sr
            s = (np.sin(2 * np.pi * 620 * k) * np.exp(-k * 55) + 0.5 * np.sin(2 * np.pi * 1240 * k) * np.exp(-k * 80)) * 0.16
            s += lowpass(rng.normal(size=len(k)), 4) * np.exp(-k * 90) * 0.12
        elif kind == "chime":  # a number lands
            s = kalimba(hz("A5"), 1.4, sr)
            add(s, int(0.09 * sr), 0.7 * kalimba(hz("D6"), 1.3, sr))
            s = s * 0.13
        else:  # thump: chapter heading
            k = np.arange(int(0.5 * sr)) / sr
            s = np.sin(2 * np.pi * (95 - 40 * k) * k) * np.exp(-k * 12) * 0.34
            s += lowpass(rng.normal(size=len(k)), 12) * np.exp(-k * 40) * 0.25
        add(out, i, s.astype(np.float32))
    return out
