#!/usr/bin/env python3
"""Render one, several or all scripts in projects/.

  python3 make.py --list
  python3 make.py all                                  # every project
  python3 make.py s1-ac-supervillain s5-concrete-secret
  python3 make.py s2-buildings-argue --still 12        # one frame at 12 s -> out/<slug>/still.png
  python3 make.py all --voice am_michael               # change the narrator everywhere for this render
  python3 make.py s2-buildings-argue --voices OLD=am_eric NEW=bm_daniel

A permanent voice change goes in the script header (`voice:` / `voices:`). Voices available:
American  af_heart af_bella af_nova af_sarah am_adam am_michael am_eric am_liam am_onyx
British   bf_emma bf_isabella bf_alice bf_lily bm_george bm_lewis bm_daniel bm_fable
"""
import argparse
import os
import sys

import engine

PROJECTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "projects")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--voice", help="narrator voice override")
    ap.add_argument("--voices", nargs="*", default=[], help="character voice overrides, e.g. OLD=am_eric")
    ap.add_argument("--still", type=float)
    args = ap.parse_args()
    available = sorted(d for d in os.listdir(PROJECTS) if os.path.exists(os.path.join(PROJECTS, d, "script.md")))
    if args.list or not args.slugs:
        print("\n".join(available))
        return
    slugs = available if args.slugs == ["all"] else args.slugs
    unknown = [s for s in slugs if s not in available]
    if unknown:
        sys.exit(f"unknown project(s): {', '.join(unknown)}")
    voices = dict(v.split("=", 1) for v in args.voices)
    for slug in slugs:
        engine.build(slug, voice=args.voice, voices=voices, still=args.still)


if __name__ == "__main__":
    main()
