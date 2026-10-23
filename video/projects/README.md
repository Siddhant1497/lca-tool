# Video projects

Each folder here is one video: a `script.md` that `make.py` turns into a narrated, captioned MP4 with photos, animated callouts and music.

```
cd video
python3 make.py --list
python3 make.py all                          # render everything -> out/<slug>/<slug>.mp4
python3 make.py s4-certs-street-food         # just one
python3 make.py s1-ac-supervillain --still 10   # preview one frame at 10 s
```

Each render writes these files to `out/<slug>/`:
- the MP4
- `captions.srt`, to upload as subtitles
- `description.txt`, a ready-to-paste title, description, sources, tags, chapters and photo credits
- `credits.txt`

## Changing the voice

Changing the narrator is a re-render; nothing else about the video changes.
- **Permanently:** edit `voice:` (the narrator) or `voices:` (characters) in the script header.
- **For one render:** `python3 make.py all --voice am_michael`, or `--voices OLD=am_eric NEW=bm_daniel`.

| Voice | IDs |
|---|---|
| British male | `bm_george` (default), `bm_lewis`, `bm_daniel`, `bm_fable` |
| British female | `bf_emma`, `bf_isabella`, `bf_alice`, `bf_lily` |
| American male | `am_michael`, `am_adam`, `am_eric`, `am_liam`, `am_onyx` |
| American female | `af_heart`, `af_bella`, `af_nova`, `af_sarah` |

Narration is cached per sentence and voice, so switching back and forth is fast.

## Script format

```
---
title: Video title
aspect: 9:16            # 9:16 = Short/Reel (1080x1920), 16:9 = long-form (1920x1080)
voice: bm_george        # narrator
voices: OLD=am_adam, NEW=bm_lewis      # optional characters
names: OLD=OLD BUILDING · 1987         # optional on-screen speaker tags
speed: 1.0
music: pulse            # pulse (shorts), drone (long-form) or none
---

# scene photos=heat_pump,solar_roof grade=day zoom=in dim=0.3
> stat: 3–4× | heat per unit of electricity | IEA @ three to four
Narration paragraph. Every line that isn't markup is spoken.
OLD: A line spoken by the OLD character.
(pause 1.0)

## PUBLISH
Everything after this line is the YouTube title, description and tags. It isn't spoken.
```

`# scene` options:
- `photos=` takes one or more keys from `assets/`. Multiple keys cross-fade within the scene.
- `grade=` is the colour look: `day`, `dawn`, `night` or `card`.
- `zoom=` is the camera move: `in` or `out`.
- `dim=` darkens the background, from 0 to 1.

Overlays are lines starting with `>`. Add `@ phrase` to make one appear when the voice reaches that phrase. Without it, the overlay appears where it sits in the scene.

| Overlay | Example |
|---|---|
| hook | `> hook: Your AC is lying to you.` |
| title | `> title: LEED` |
| stat | `> stat: ~15% \| of global CO₂ \| IEA` (counts up when it's a single number) |
| label | `> label: Embodied carbon` |
| item | `> item: Blended cements @ blended` (stacks into a checklist) |
| quote | `> quote: Ask boring questions early.` |
| versus | `> versus: OPERATIONAL \| EMBODIED` |
| review | `> review: 5 \| Building name \| Review text \| Earth` |
| chapter | `> chapter: 2 · What "certified" means` (long-form; also becomes a YouTube chapter) |
| cta | `> cta: Follow for more` |

## Photos

`photos=` keys map to `assets/<key>_1.jpg`, `_2`, and so on. There are three ways to get them:
- Run `python3 fetch_images.py`. It downloads CC0, public domain and CC BY photos from Wikimedia Commons for every key in its `QUERIES` list, and records author and licence in `assets/credits.json`.
- Run `python3 fetch_images.py --from-credits`. It re-downloads exactly the photos already listed.
- Drop in your own photos, such as `assets/site_inspection_1.jpg`. Your own photos need no credit.

For the fact-check log and legal notes, see `FACT_CHECK.md`.
