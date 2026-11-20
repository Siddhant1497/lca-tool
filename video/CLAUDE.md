# Video studio rules (read before any video work in this folder)

## Render contract
- Every frame is a pure function of time: `window.render(t)` draws second t. No CSS transitions, timers or Math.random; use `hash()`/seeded noise.
- Timing follows the narration: anchor visuals to phrases with `at('phrase')`. Every paragraph starts on a beat of the score (`sound.BEAT`); big numbers land on a beat.
- Narration: Kokoro voices (default `bm_george`, speed 1.06). Music and sound effects are synthesised in `paper/sound.py`.
- Every final mix is normalised to -14 LUFS, true peak -1.5 dB (`paper/voice.py: loudnorm`). Fix older files with `paper/normalize.py`.
- Plates get the paper-layer lighting from the depth map (cast shadows, lit edges, far haze); set `cam.layer` to 0 to turn it off.

## Look (house style: "Paper Earth")
- Paper-relief dioramas (Flux.1-Schnell via AI Horde, prompts in `paper/images.json` / `paper/episodes/images.json`), moved with the depth camera.
- Fonts: Fraunces (headlines, labels), Caveat (handwritten notes), Inter (small caps, captions). Palette: forest, moss, terra, ochre, clay, sand, cream.
- Motion: springs (small overshoot, then settle), torn-page transitions, ink that draws itself, paper labels that are set down.
- Something new on screen every 2 to 4 seconds. No headline alone for more than 4 seconds.
- Text over art must be white or cream with a shadow. Never put gold or orange text on orange art.
- Banned: centred title on a gradient, everything fading in, glow, particle explosions, a whoosh on every cut.

## Facts and legal
- Every on-screen number needs a source in `projects/FACT_CHECK.md` or the film's README.
- Certification names are text only, never logos, with a "not affiliated" line in the description.
- No client, project or location names. Audit examples stay generic.

## Before showing anything
1. Make a contact sheet: `ffmpeg -i X.mp4 -vf "fps=1/2,scale=150:266,tile=12x3" -frames:v 1 sheet.jpg`
2. Judge only the frames. Score 1-10: hook in 2 s, phone readability, motion, variety, sound sync.
3. Fix the 3 worst problems, re-render, repeat until every score is 8+.
