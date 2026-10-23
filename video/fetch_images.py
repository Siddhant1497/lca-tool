#!/usr/bin/env python3
"""Download freely licensed photos for each scene from Wikimedia Commons into assets/.

Only CC0, public domain and CC BY files are kept (CC BY-SA too with --allow-sa); author, licence and
file page go to assets/credits.json, which the videos' credits files are built from. Requests are
paced and back off on HTTP 429, per Wikimedia's API etiquette. Needs commons.wikimedia.org and
upload.wikimedia.org.

  python3 fetch_images.py                  # fetch every photo key that has no photo yet
  python3 fetch_images.py --only timber --count 3 --force
  python3 fetch_images.py --backfill       # fill in missing author/licence for listed photos
  python3 fetch_images.py --from-credits   # re-download the exact files in credits.json
                                           # (needs only upload.wikimedia.org)

Your own photos work too: drop them in assets/ named by key (e.g. retrofit_1.jpg).
"""
import argparse
import glob
import hashlib
import html
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "green-building-video-builder/1.0 (https://github.com/siddhant1497/lca-tool; educational videos)"}
MIN_INTERVAL = 2.5  # seconds between requests to Wikimedia

# photo key -> (search queries tried in order, how many photos)
QUERIES = {
    # net-zero video
    "skyline_open": (["city skyline dawn fog", "skyline sunrise mist skyscrapers"], 2),
    "skyline_open_day": (["city skyline clear day skyscrapers", "skyline daylight blue sky"], 2),
    "window": (["window night city lights bokeh", "city lights through window night"], 1),
    "bars": (["cement plant", "construction site concrete pouring"], 1),
    "growth": (["construction cranes city skyline", "tower cranes high rise construction"], 3),
    "opcarbon_left": (["office building lit windows night", "illuminated office windows night"], 1),
    "opcarbon_right": (["rebar concrete construction", "steel reinforcement bars concrete"], 1),
    "oldnew_left": (["old apartment block", "1960s apartment building facade"], 1),
    "oldnew_right": (["glass skyscraper facade", "modern glass office tower"], 1),
    "retrofit": (["external wall insulation installation", "building insulation renovation facade"], 3),
    "gap": (["coal power station chimney", "power plant emissions"], 1),
    "g20": (["earth at night city lights", "black marble nasa earth night"], 1),
    "tasks": (["city aerial dense buildings", "aerial view old city rooftops"], 1),
    "skyline_warm": (["city skyline sunny morning", "green city skyline park"], 1),
    "certified": (["green building solar panels roof", "green roof building"], 3),
    "timber": (["cross laminated timber construction", "mass timber building construction"], 3),
    "heatpump": (["air source heat pump", "heat pump outdoor unit house"], 2),
    "pullback": (["aerial city sunrise", "city aerial view dawn"], 2),
    # script pack
    "ac_facade": (["air conditioners on building facade", "air conditioning units apartment wall"], 2),
    "ac_unit": (["air conditioner outdoor unit", "split air conditioner condenser"], 1),
    "hot_city": (["Delhi smog skyline", "hot sun city skyline summer", "heatwave city street"], 1),
    "hvac_tech": (["HVAC technician refrigerant", "air conditioning technician repair"], 1),
    "car_road": (["traffic highway cars", "car traffic jam city"], 1),
    "heat_pump": (["air source heat pump house", "heat pump outdoor unit garden"], 2),
    "old_building": (["1980s office building", "old office building facade concrete"], 2),
    "new_green_building": (["green building vertical garden facade", "sustainable office building solar facade"], 2),
    "renovation": (["building renovation scaffolding facade", "facade renovation apartment block"], 2),
    "demolition": (["building demolition excavator", "demolition of building rubble"], 1),
    "site_inspection": (["construction site inspection engineer", "engineer hard hat construction site"], 2),
    "blueprints": (["architectural drawings blueprint", "construction plans drawings table"], 1),
    "occupancy_sensor": (["occupancy sensor ceiling", "motion sensor ceiling light"], 1),
    "faucet": (["water tap faucet", "bathroom faucet water flow"], 1),
    "solar_roof": (["rooftop solar panels building", "solar panels roof installation"], 2),
    "subcontractors": (["construction workers India building site", "construction workers scaffolding"], 2),
    "tablet_site": (["tablet construction site", "engineer checking plans construction"], 1),
    "street_food": (["Indian street food stall", "street food vendor Mumbai"], 1),
    "us_skyline": (["Manhattan skyline", "Chicago skyline day"], 1),
    "emerging_housing": (["affordable housing construction Africa", "social housing project Latin America"], 1),
    "india_office": (["Bengaluru office building", "Hyderabad HITEC City buildings"], 1),
    "india_gov": (["New Delhi government building", "Indian government office building"], 1),
    "biryani": (["biryani"], 1),
    "sushi": (["sushi bar"], 1),
    "concrete_texture": (["concrete wall texture", "raw concrete surface"], 1),
    "cement_plant": (["cement plant", "cement factory kiln"], 1),
    "steel_mill": (["steel mill blast furnace", "steelworks molten steel"], 1),
    "airplane": (["airplane takeoff", "passenger jet taking off"], 1),
    "concrete_pour": (["concrete pouring construction", "concrete pump truck pouring"], 1),
    "scrap_steel": (["steel scrap recycling", "scrap metal yard"], 1),
    "lobby": (["office building lobby interior", "modern lobby atrium"], 2),
    "mega_tower": (["skyscraper at night", "office tower night lights"], 1),
    "housing_block": (["apartment building balconies shading", "residential building sun shading facade"], 2),
    "nutrition_label": (["nutrition facts label"], 1),
    "world_map": (["Blue Marble NASA", "earth from space"], 1),
    "mumbai_monsoon": (["Mumbai monsoon skyline", "Mumbai rain buildings"], 1),
    "dubai_construction": (["Dubai construction cranes", "Dubai desert construction"], 1),
    "developing_construction": (["housing construction Kenya", "construction site Vietnam apartments"], 1),
    "india_skyline": (["Mumbai skyline", "Gurgaon skyline"], 2),
    "checklist": (["inspection checklist clipboard", "clipboard checklist"], 1),
    "ceiling_mep": (["building services ceiling ducts pipes", "ceiling ductwork construction"], 1),
    "finished_building_people": (["people walking office plaza", "office building entrance people"], 1),
    "site_walk": (["construction site interior concrete columns", "building under construction interior"], 1),
    "sunset_site": (["construction site sunset", "crane sunset construction"], 1),
}

_last = [0.0]


def _get(url, attempts=5):
    """GET with pacing and exponential backoff on 429/5xx."""
    for i in range(attempts):
        wait = MIN_INTERVAL - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or i == attempts - 1:
                raise
            time.sleep(30 * (i + 1))
        except (urllib.error.URLError, TimeoutError, ConnectionError):  # proxy/network hiccup
            if i == attempts - 1:
                raise
            time.sleep(15 * (i + 1))


def api(**params):
    params.update(format="json", formatversion="2")
    return json.loads(_get(API + "?" + urllib.parse.urlencode(params)))


def clean(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def licence_ok(lic, allow_sa):
    l = lic.lower()
    if any(x in l for x in ("nc", "nd", "fair use", "copyrighted")):
        return False
    if "sa" in l.replace("-", " ").split() and not allow_sa:
        return False
    return l.startswith(("cc0", "public domain", "pd", "cc by", "cc-by"))


def search(query, allow_sa, limit=25):
    data = api(action="query", generator="search", gsrsearch=f"{query} filetype:bitmap", gsrnamespace=6, gsrlimit=limit,
               prop="imageinfo", iiprop="url|extmetadata|size", iiurlwidth=1920,
               iiextmetadatafilter="LicenseShortName|Artist|Credit")
    pages = sorted(data.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0))
    out = []
    for p in pages:
        info = (p.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        lic = clean(meta.get("LicenseShortName", {}).get("value", ""))
        w, h = info.get("width", 0), info.get("height", 0)
        if not licence_ok(lic, allow_sa) or w <= 1280 or min(w, h) < 900:
            continue
        out.append({"title": p["title"], "width": w, "page": info.get("descriptionurl"),
                    "author": clean(meta.get("Artist", {}).get("value", "")) or clean(meta.get("Credit", {}).get("value", ""))
                    or "Unknown", "license": lic})
    return out


def fetch(key, queries, count, credits, allow_sa):
    got = 0
    seen = {c["title"] for c in credits}
    for q in queries:
        for cand in search(q, allow_sa):
            if got >= count:
                return got
            if cand["title"] in seen:
                continue
            dest = os.path.join(ASSETS, f"{key}_{got + 1}.jpg")
            try:
                # thumbnails come back on thumb.wikimedia.org; fetch the same image via upload.wikimedia.org
                # standard thumbnail widths only: originals and odd sizes are heavily rate-limited
                data = _get(original_url(cand["title"], 1920 if cand["width"] > 1920 else 1280)[0])
            except (urllib.error.URLError, OSError) as e:
                print(f"  {key}: skipped {cand['title']} ({e})", flush=True)
                continue
            with open(dest, "wb") as fh:
                fh.write(data)
            credits.append({k: v for k, v in {**cand, "file": os.path.basename(dest)}.items() if k != "width"})
            seen.add(cand["title"])
            got += 1
            print(f"  {key}: {cand['title']} — {cand['author']} ({cand['license']})", flush=True)
    return got


def backfill(credits, save):
    """Fill in author/licence for entries recorded without them, saving after each batch."""
    todo = [c for c in credits if c["author"].startswith("see") or c["license"].startswith("see")]
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        data = api(action="query", titles="|".join(c["title"] for c in batch), prop="imageinfo", iiprop="extmetadata",
                   iiextmetadatafilter="LicenseShortName|Artist|Credit")
        meta = {p["title"]: (p.get("imageinfo") or [{}])[0].get("extmetadata", {}) for p in data["query"]["pages"]}
        norm = {n["from"]: n["to"] for n in data["query"].get("normalized", [])}
        for c in batch:
            m = meta.get(norm.get(c["title"], c["title"]), {})
            author = clean(m.get("Artist", {}).get("value", "")) or clean(m.get("Credit", {}).get("value", ""))
            lic = clean(m.get("LicenseShortName", {}).get("value", ""))
            if author:
                c["author"] = " ".join(author.split("(Original text")[0].split())
            if lic:
                c["license"] = lic
            print(f"  {c['file']}: {c['author']} ({c['license']})", flush=True)
        save()


def original_url(name, width=1920):
    """upload.wikimedia.org path for a Commons file name (MD5-based), as a thumbnail of `width`."""
    n = name.removeprefix("File:").replace(" ", "_")
    h = hashlib.md5(n.encode()).hexdigest()
    q = urllib.parse.quote(n)
    base = f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}"
    return f"{base}/{width}px-{q}", f"https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{q}"


def from_credits(credits):
    for c in credits:
        dest = os.path.join(ASSETS, c["file"])
        if os.path.exists(dest):
            continue
        for url in original_url(c["title"]):
            try:
                with open(dest, "wb") as fh:
                    fh.write(_get(url))
                print("ok", c["file"], flush=True)
                break
            except urllib.error.HTTPError:
                continue


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only")
    ap.add_argument("--count", type=int)
    ap.add_argument("--allow-sa", action="store_true", help="also accept CC BY-SA photos")
    ap.add_argument("--backfill", action="store_true")
    ap.add_argument("--from-credits", action="store_true")
    args = ap.parse_args()
    os.makedirs(ASSETS, exist_ok=True)
    cpath = os.path.join(ASSETS, "credits.json")
    credits = json.load(open(cpath, encoding="utf-8")) if os.path.exists(cpath) else []

    def save():
        json.dump(credits, open(cpath, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    if args.from_credits:
        return from_credits(credits)
    if args.backfill:
        return backfill(credits, save)
    for key, (queries, count) in QUERIES.items():
        if args.only and key != args.only:
            continue
        existing = glob.glob(os.path.join(ASSETS, key + "_[0-9]*.*")) + glob.glob(os.path.join(ASSETS, key + ".*"))
        if existing and not args.force:
            continue
        for f in existing:
            os.remove(f)
        credits[:] = [c for c in credits if not re.fullmatch(re.escape(key) + r"_\d+\.\w+", c["file"])]
        try:
            n = fetch(key, queries, args.count or count, credits, args.allow_sa)
        except (urllib.error.URLError, OSError) as e:
            print(f"{key}: failed ({e})", flush=True)
            continue
        print(f"{key}: {n} photo(s)", flush=True)
        save()


if __name__ == "__main__":
    main()
