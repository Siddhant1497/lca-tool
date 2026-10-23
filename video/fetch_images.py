#!/usr/bin/env python3
"""Download freely licensed photos for each scene from Wikimedia Commons into assets/.

Only CC0 / public domain / CC BY / CC BY-SA files are kept; author and licence go to assets/credits.json,
which the end card and out/credits.txt use for attribution. Needs network access to commons.wikimedia.org
and upload.wikimedia.org.

  python3 fetch_images.py              # fetch every scene that has no photo yet
  python3 fetch_images.py --force      # re-fetch everything
  python3 fetch_images.py --only timber --count 3

Your own photos work too: drop them in assets/ named by key (e.g. retrofit_1.jpg); see visuals.PHOTO_KEYS.
"""
import argparse
import glob
import html
import json
import os
import re
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "net-zero-video-builder/1.0 (educational video; contact via repository)"}
OK_LICENSES = ("cc0", "public domain", "pd", "cc by", "cc-by")

# photo key -> (search queries tried in order, how many photos)
QUERIES = {
    "skyline_open": (["city skyline dawn fog", "skyline sunrise mist skyscrapers"], 2),
    "skyline_open_day": (["city skyline clear day skyscrapers", "skyline daylight blue sky"], 2),
    "window": (["window night city lights bokeh", "city lights through window night"], 1),
    "bars": (["cement plant", "construction site concrete pouring"], 1),
    "growth": (["construction cranes city skyline", "tower cranes high rise construction"], 3),
    "opcarbon_left": (["office building lit windows night", "illuminated office windows night"], 1),
    "opcarbon_right": (["rebar concrete construction", "steel reinforcement bars concrete"], 1),
    "oldnew_left": (["old apartment block", "1960s apartment building facade"], 1),
    "oldnew_right": (["glass skyscraper facade", "modern glass office tower"], 1),
    "retrofit": (["external wall insulation installation", "building insulation renovation facade", "air source heat pump installation"], 3),
    "gap": (["coal power station chimney", "power plant emissions"], 1),
    "g20": (["earth at night city lights", "black marble nasa earth night"], 1),
    "tasks": (["city aerial dense buildings", "aerial view old city rooftops"], 1),
    "skyline_warm": (["city skyline sunny morning", "green city skyline park"], 1),
    "certified": (["green building solar panels roof", "LEED certified building", "green roof building"], 3),
    "timber": (["cross laminated timber construction", "mass timber building construction", "CLT panels building"], 3),
    "heatpump": (["air source heat pump", "heat pump outdoor unit house"], 2),
    "pullback": (["aerial city sunrise", "city aerial view dawn"], 2),
}


def api(**params):
    params.update(format="json", formatversion="2")
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def clean(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def search(query, limit=20):
    data = api(action="query", generator="search", gsrsearch=f"{query} filetype:bitmap", gsrnamespace=6, gsrlimit=limit,
               prop="imageinfo", iiprop="url|extmetadata|size", iiurlwidth=1920)
    pages = sorted(data.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0))
    out = []
    for p in pages:
        info = (p.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        lic = clean(meta.get("LicenseShortName", {}).get("value", ""))
        if not lic.lower().startswith(OK_LICENSES) or "nc" in lic.lower().split() or "nd" in lic.lower().split():
            continue
        if info.get("width", 0) < 1280 or info.get("width", 0) < info.get("height", 1):  # landscape, HD or better
            continue
        out.append({"title": p["title"], "url": info.get("thumburl") or info["url"], "page": info.get("descriptionurl"),
                    "author": clean(meta.get("Artist", {}).get("value", "")) or "Unknown", "license": lic})
    return out


def fetch(key, queries, count, credits):
    got = 0
    seen = {c["title"] for c in credits}
    for q in queries:
        for cand in search(q):
            if got >= count:
                return got
            if cand["title"] in seen:
                continue
            ext = os.path.splitext(urllib.parse.urlparse(cand["url"]).path)[1].lower() or ".jpg"
            dest = os.path.join(ASSETS, f"{key}_{got + 1}{ext}")
            req = urllib.request.Request(cand["url"], headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as fh:
                fh.write(r.read())
            credits.append({**cand, "file": os.path.basename(dest)})
            seen.add(cand["title"])
            got += 1
            print(f"  {key}: {cand['title']} — {cand['author']} ({cand['license']})")
    return got


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only")
    ap.add_argument("--count", type=int)
    args = ap.parse_args()
    os.makedirs(ASSETS, exist_ok=True)
    cpath = os.path.join(ASSETS, "credits.json")
    credits = json.load(open(cpath, encoding="utf-8")) if os.path.exists(cpath) else []
    for key, (queries, count) in QUERIES.items():
        if args.only and key != args.only:
            continue
        existing = glob.glob(os.path.join(ASSETS, key + "_[0-9]*.*")) + glob.glob(os.path.join(ASSETS, key + ".*"))
        if existing and not args.force:
            continue
        for f in existing:
            os.remove(f)
        credits = [c for c in credits if not c["file"].startswith(key + "_")]
        n = fetch(key, queries, args.count or count, credits)
        print(f"{key}: {n} photo(s)")
        json.dump(credits, open(cpath, "w", encoding="utf-8"), indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
