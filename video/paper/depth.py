#!/usr/bin/env python3
"""Depth maps for the 2.5D camera: gen/<name>.jpg -> gen/<name>_d.png (white = near).

Uses Depth Anything V2 Small (Apache-2.0) as ONNX. Download once:
  curl -L -o /tmp/dav2s.onnx https://github.com/fabio-sim/Depth-Anything-ONNX/releases/download/v2.0.0/depth_anything_v2_vits.onnx
  python3 paper/depth.py /tmp/dav2s.onnx            # all images without a depth map
"""
import glob
import os
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.join(HERE, "gen")


def main():
    sess = ort.InferenceSession(sys.argv[1], providers=["CPUExecutionProvider"])
    name = sess.get_inputs()[0].name
    for path in sorted(glob.glob(os.path.join(GEN, "*.jpg"))):
        out = path[:-4] + "_d.png"
        if os.path.exists(out) and "--force" not in sys.argv:
            continue
        im = Image.open(path).convert("RGB")
        x = np.asarray(im.resize((518, 518), Image.LANCZOS), dtype=np.float32) / 255  # the model takes a fixed square
        x = ((x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]).transpose(2, 0, 1)[None].astype(np.float32)
        d = np.squeeze(sess.run(None, {name: x})[0])
        lo, hi = np.percentile(d, 1), np.percentile(d, 99)
        d = np.clip((d - lo) / (hi - lo + 1e-9), 0, 1)
        img = Image.fromarray((d * 255).astype(np.uint8)).resize((432, round(432 * im.height / im.width)), Image.BICUBIC)
        img = img.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(3))  # grow near shapes, soften edges
        img.save(out)
        print("depth", os.path.basename(out), img.size, flush=True)


if __name__ == "__main__":
    main()
