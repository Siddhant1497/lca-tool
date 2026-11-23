# Paper Earth: "The Life of a Building"

A vertical (1080×1920, 60 fps) film in its own style: paper-relief dioramas filmed with a moving 3D camera,
torn-page transitions, hand-inked notes, placed paper labels and an original score.

## Rebuild

```
python3 paper/build.py                  # full film -> out/life-of-a-building/life-of-a-building.mp4 + captions.srt
python3 paper/build.py --still 24.8     # one frame -> out/life-of-a-building/still.png
python3 paper/build.py --voice bf_emma  # another narrator (any Kokoro voice); --speed 1.0 to slow down
```

## Your own voice and music

```
python3 paper/build.py --project paper/episodes/g60_1.json --recording g60_1.m4a              # your narration (one take)
python3 paper/build.py --project paper/episodes/g60_1.json --recording takes/ --music track.mp3 # folder of paragraph files + your track
python3 paper/script_sheet.py paper/episodes/g60_1.json > sheet.md                            # what to record
```

A take is cleaned (rumble filter, noise reduction, compression), cut at its longest pauses into paragraphs and then sentences, and the visuals are re-timed to it. A music file is looped or trimmed, faded and ducked under the voice; its tempo is estimated so scene changes land on its beats (set `music_bpm` in the episode file to override). Both can also be set in the episode file as `recording` and `music_file`. See `video/RECORDING_GUIDE.md`.

## Files

| File | What it is |
|---|---|
| `story.json` | Narration, voice, speed. Edit the words here. |
| `film.html` | The animation. Scenes are the `s…` functions; timings follow narration phrases via `at('phrase')`. |
| `sound.py` | The score and sound effects, all synthesised. |
| `images.json`, `gen_images.py` | Scene art prompts and the free generator (AI Horde, Flux.1-Schnell). |
| `depth.py` | Depth maps that drive the 3D camera (Depth Anything V2 Small). |
| `gen/` | Scene art (`*.jpg`) and depth maps (`*_d.png`). |
| `fonts/` | Fraunces and Caveat (SIL Open Font License). |

If you change the narration, check that every phrase used in `at('…')` in `film.html` still appears in it;
a missing phrase prints `phrase not found` during the render.

## Facts on screen

| Claim | Source |
|---|---|
| Cement ≈ 7% and steel ≈ 8% of global CO₂ (≈ 15% together) | IEA report for the 2022 G7 presidency |
| Clinker is fired at about 1,450 °C | IEA / standard cement chemistry |
| Life-cycle stages A1–A3, A4–A5, B1–B7, C1–C4 and D | EN 15978 |
| Upfront carbon is expected to be about half of new construction's carbon footprint between now and 2050 | WorldGBC, *Bringing Embodied Carbon Upfront* (2019) |

## Facts on screen: Green Building in 60 Seconds, week 2

| Claim | Source |
|---|---|
| Star-labelled room ACs must ship with a 24 °C default (from 1 Jan 2020) | BEE energy performance standards for room ACs; PIB / Ministry of Power |
| Moving from 20 °C to 24 °C can cut AC electricity use by about 24% | BEE estimate (Ministry of Power advisory, 2018) |
| IGBC AP exam is not tied to a single rating system; IGBC AP Associate for students and freshers | igbc.in |
| LEED AP specialty credentials build on LEED Green Associate (GBCI) | USGBC / GBCI credential pages |
| EDGE Certified ≥20% energy, water and embodied energy in materials; EDGE Advanced ≥40% energy; Zero Carbon adds renewables | edgebuildings.com, EDGE certification protocol |

## Credits

Scene art: generated with Flux.1-Schnell (Apache-2.0) via AI Horde. Depth: Depth Anything V2 Small (Apache-2.0).
Fonts: Fraunces, Caveat (OFL), Inter. Animated emoji: Noto Emoji Animation by Google (CC BY 4.0), played with lottie-web (MIT). Narration: Kokoro (AI voice). Music and effects: original.
