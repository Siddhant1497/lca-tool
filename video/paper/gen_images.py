#!/usr/bin/env python3
"""Paper-relief scene art, free, from AI Horde (anonymous key) using Flux.1-Schnell (Apache-2.0).

  python3 paper/gen_images.py                 # one image per scene  -> paper/gen/<name>.jpg (skips existing)
  python3 paper/gen_images.py --variants 2 --out /some/dir   # candidates <name>_0.jpg, <name>_1.jpg to choose from

Anonymous jobs wait in a shared queue (about 5-15 minutes). Output is upscaled 2x to 1536x2688.
Requests go through curl because Cloudflare in front of aihorde.net rejects Python's HTTP client.
After adding images, run paper/depth.py to make the depth maps.
"""
import argparse
import json
import os
import subprocess
import time

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://aihorde.net/api/v2"
HEAD = ["-H", "apikey: 0000000000", "-H", "Client-Agent: green-building-video-builder:1.0:anonymous", "-H", "Content-Type: application/json"]


def curl(method, path, body=None):
    cmd = ["curl", "-sS", "-m", "60", "-X", method, API + path] + HEAD + (["-d", json.dumps(body)] if body else [])
    try:
        return json.loads(subprocess.run(cmd, capture_output=True, text=True).stdout)
    except ValueError:
        return {}


def submit(prompt, seed, spec):
    body = {"prompt": f"{prompt}, {spec['style']}",
            "params": {"width": spec["width"], "height": spec["height"], "steps": 4, "cfg_scale": 1, "sampler_name": "k_euler",
                       "seed": str(seed), "post_processing": ["RealESRGAN_x2plus"], "n": 1},
            "models": [spec["model"]], "nsfw": False, "censor_nsfw": True, "r2": True, "shared": False}
    return curl("POST", "/generate/async", body).get("id")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", default=os.path.join(HERE, "images.json"))
    ap.add_argument("--out", default=os.path.join(HERE, "gen"))
    ap.add_argument("--variants", type=int, default=1)
    args = ap.parse_args()
    spec = json.load(open(args.spec, encoding="utf-8"))
    os.makedirs(args.out, exist_ok=True)
    jobs = {}  # file stem -> (job id, prompt, seed)
    for item in spec["images"]:
        for v in range(args.variants):
            stem = item["name"] if args.variants == 1 else f"{item['name']}_{v}"
            if os.path.exists(os.path.join(args.out, stem + ".jpg")):
                continue
            seed = item["seed"] + v * 100
            jid = submit(item["prompt"], seed, spec)
            print("queued" if jid else "submit failed", stem, flush=True)
            if jid:
                jobs[stem] = (jid, item["prompt"], seed)
            time.sleep(2)
    while jobs:
        time.sleep(20)
        for stem, (jid, prompt, seed) in list(jobs.items()):
            st = curl("GET", f"/generate/check/{jid}")
            if st.get("faulted"):
                print("faulted, resubmitting", stem, flush=True)
                jobs[stem] = (submit(prompt, seed, spec), prompt, seed)
            elif st.get("done"):
                gens = curl("GET", f"/generate/status/{jid}").get("generations") or []
                if not gens:
                    continue
                tmp = os.path.join(args.out, stem + ".webp")
                subprocess.run(["curl", "-sS", "-m", "180", "-o", tmp, gens[0]["img"]], check=True)
                im = Image.open(tmp).convert("RGB")
                os.remove(tmp)
                if gens[0].get("censored") or im.width < 700:  # false-positive safety block: try another seed
                    print("blocked, retrying", stem, flush=True)
                    jobs[stem] = (submit(prompt, seed + 1000, spec), prompt, seed + 1000)
                    continue
                im.save(os.path.join(args.out, stem + ".jpg"), quality=93)
                print("saved", stem, im.size, flush=True)
                del jobs[stem]
    print("ALL-DONE", flush=True)


if __name__ == "__main__":
    main()
