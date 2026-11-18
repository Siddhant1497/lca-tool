---
name: paper-video
description: Make a vertical "Paper Earth" explainer video (paper-relief art, depth camera, AI narration, original score) about a sustainability or green-building topic. Use when asked for a new short video, episode or explainer in the house style.
---

# Paper Earth video

Usage: `/paper-video <topic or script>, <length, default 60 s>`

Follow `video/CLAUDE.md` (studio rules) throughout.

1. **Script.** Write 6–8 short paragraphs (about 150 words for 60 s): a hook in the first sentence, one idea per paragraph, a closing line. Check every number and log its source in `video/projects/FACT_CHECK.md`. Show the script to the user and wait for OK.
2. **Episode file.** Copy `video/paper/episodes/ep1.json` to a new file. Set `out`, `narration`, and `spec.scenes`: one scene per paragraph, each with a `plate` (art name) or `page` (`cream`/`forest`), and items (`kicker`, `head`, `tag`, `note`, `check`, `dial`, `big`, `bars`, `card`, `ribbon`, `confetti`, `circle`, `wave`, `line`, `arrow`). Item `at` is a narration phrase. Check phrases with `python3 video/paper/build.py --project <file> --timing`.
3. **Art.** Add one prompt per new plate to a copy of `video/paper/episodes/images.json`, run `python3 video/paper/gen_images.py --spec <that file>` (free queue, 5–20 min), then `python3 video/paper/depth.py <depth-model.onnx>` (download link in `depth.py`).
4. **Stills.** `--still <seconds>` at 3–4 moments; look for missing phrases ("phrase not found"), overlaps and low contrast.
5. **Render.** `python3 video/paper/build.py --project <file>` writes `video/out/<out>/<out>.mp4` and `captions.srt`. With the user's own narration add `--recording <take>` (make the sheet with `video/paper/script_sheet.py`), and with their music `--music <file>`.
6. **Second look.** Contact sheet, score, fix the 3 worst problems, re-render (rules in `video/CLAUDE.md`).
7. **Publish pack.** Add title (question first), answer-first description, sources, tags, pinned comment and LinkedIn text to `video/PUBLISHING_PLAN.md`.
