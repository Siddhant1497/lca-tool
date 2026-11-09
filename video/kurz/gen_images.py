#!/usr/bin/env python3
"""Generate scene illustrations for free with AI Horde (community-run open models, anonymous key).

All images are submitted at once and polled; anonymous jobs wait in a shared queue (often 10-20 min).
Output is upscaled 2x (RealESRGAN) to 2048x1152. Requests go through curl, because Cloudflare in
front of aihorde.net rejects Python's HTTP client.

  python3 kurz/gen_images.py kurz/concrete60_images.json    # writes kurz/gen/<name>.png, skips existing
"""
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "gen")
API = "https://aihorde.net/api/v2"
HEAD = ["-H", "apikey: 0000000000", "-H", "Client-Agent: green-building-video-builder:1.0:anonymous", "-H", "Content-Type: application/json"]
NEGATIVE = "text, letters, words, watermark, logo, signature, photo, photorealistic, blurry, low quality, deformed, people, person"


def curl(method, path, body=None):
    cmd = ["curl", "-sS", "-m", "60", "-X", method, API + path] + HEAD + (["-d", json.dumps(body)] if body else [])
    return json.loads(subprocess.run(cmd, capture_output=True, text=True, check=True).stdout)


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    jobs = {}
    for item in spec["images"]:
        if os.path.exists(os.path.join(OUT, item["name"] + ".png")):
            continue
        body = {"prompt": f"{item['prompt']}, {spec['style']} ### {NEGATIVE}",
                "params": {"width": 1024, "height": 576, "steps": 30, "cfg_scale": 6, "sampler_name": "k_dpmpp_2m", "karras": True,
                           "seed": str(item.get("seed", 7)), "post_processing": ["RealESRGAN_x2plus"], "n": 1},
                "models": [spec.get("model", "AlbedoBase XL (SDXL)")], "nsfw": False, "censor_nsfw": True, "r2": True, "shared": False}
        r = curl("POST", "/generate/async", body)
        if "id" not in r:
            print("submit failed", item["name"], r, flush=True)
            continue
        jobs[item["name"]] = r["id"]
        print("queued", item["name"], r["id"], flush=True)
        time.sleep(2)
    while jobs:
        time.sleep(20)
        for name, jid in list(jobs.items()):
            st = curl("GET", f"/generate/check/{jid}")
            if st.get("faulted"):
                print("faulted", name, flush=True)
                del jobs[name]
            elif st.get("done"):
                gen = curl("GET", f"/generate/status/{jid}")["generations"][0]
                tmp = os.path.join(OUT, name + ".webp")
                subprocess.run(["curl", "-sS", "-m", "120", "-o", tmp, gen["img"]], check=True)
                from PIL import Image
                Image.open(tmp).convert("RGB").save(os.path.join(OUT, name + ".png"))
                os.remove(tmp)
                print("saved", name, gen.get("model"), flush=True)
                del jobs[name]
        print("waiting:", ", ".join(f"{n}" for n in jobs), flush=True) if jobs else None
    print("ALL-DONE", flush=True)


if __name__ == "__main__":
    main()
