#!/usr/bin/env python3
"""Recording sheet for an episode: what to read, where to pause, how to send it.

  python3 paper/script_sheet.py paper/episodes/g60_1.json [more.json ...] > sheet.md
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import engine  # noqa: E402

SAY = {"CO2": "C-O-two", "EPD": "E-P-D", "EPDs": "E-P-Ds", "LEED": "leed (rhymes with 'need')", "USGBC": "U-S-G-B-C", "AAC": "A-A-C",
       "EN 15804": "E-N fifteen-eight-oh-four", "LCA": "L-C-A", "GRIHA": "gree-ha", "IGBC": "I-G-B-C"}

for path in sys.argv[1:]:
    d = json.load(open(path, encoding="utf-8"))
    stem = os.path.splitext(os.path.basename(path))[0]
    words = sum(len(p.split()) for p in d["narration"])
    print(f"## {d.get('spec', {}).get('seriesName', 'Episode').title()} · {stem}\n")
    print(f"Save the take as **{stem}.m4a** (any phone format works). About {words} words, aim for {round(words / 2.6)}–{round(words / 2.3)} seconds.\n")
    found = [k for k in SAY if any(re.search(r'\b' + re.escape(k) + r'\b', p) for p in d["narration"])]
    if found:
        print("Say it like this: " + "; ".join(f"**{k}** = {SAY[k]}" for k in found) + "\n")
    for i, para in enumerate(d["narration"], 1):
        print(f"**{i}.** " + "  /  ".join(engine.sentences(para)))
        print("\n*(pause 2 seconds)*\n" if i < len(d["narration"]) else "\n*(stop)*\n")
    print("---\n")
