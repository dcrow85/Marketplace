#!/usr/bin/env python3
"""Waystone concept-art generator — DeepInfra image models from the repo.

INTERNAL CONCEPT ART ONLY (Waystone_World_v0.1 boundary): generated images are
mood/composition studies and artist-brief material. They are never the shipped
public face; the final village is commissioned from a human artist.

Usage:
  python3 scripts/waystone_art.py "prompt text" [--model MODEL] [--w 1344] [--h 768]
      [--name slug] [--seed N] [--n 1]
  python3 scripts/waystone_art.py --edit input.png "edit instruction" [--name slug]

Models (via the existing deepinfra-api-key in the macOS Keychain):
  flux2max  -> black-forest-labs/FLUX-2-max      (best quality)
  flux2pro  -> black-forest-labs/FLUX-2-pro      (default)
  flux11    -> black-forest-labs/FLUX-1.1-pro
  schnell   -> black-forest-labs/FLUX-1-schnell   (cheap plumbing tests)
  seedream  -> ByteDance/Seedream-4.5
  qwenedit  -> Qwen/Qwen-Image-Edit               (image editing, --edit mode)

Outputs to art/concepts/<name>-<k>.png plus a .json sidecar recording the exact
prompt, model, seed, and date — provenance, like everything else in this repo.
"""
import argparse, base64, datetime, json, pathlib, re, subprocess, sys, urllib.request

MODELS = {
    'flux2max': 'black-forest-labs/FLUX-2-max',
    'flux2pro': 'black-forest-labs/FLUX-2-pro',
    'flux11': 'black-forest-labs/FLUX-1.1-pro',
    'schnell': 'black-forest-labs/FLUX-1-schnell',
    'seedream': 'ByteDance/Seedream-4.5',
    'qwenedit': 'Qwen/Qwen-Image-Edit',
}
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'art' / 'concepts'

def key():
    return subprocess.run(['security', 'find-generic-password', '-s', 'deepinfra-api-key', '-w'],
                          capture_output=True, text=True, check=True).stdout.strip()

def call(model, body):
    req = urllib.request.Request(
        f'https://api.deepinfra.com/v1/inference/{model}',
        data=json.dumps(body).encode(),
        headers={'Authorization': f'Bearer {key()}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)

def save_images(resp, name, meta):
    OUT.mkdir(parents=True, exist_ok=True)
    imgs = resp.get('images') or resp.get('image_url') or resp.get('output') or []
    if isinstance(imgs, str):
        imgs = [imgs]
    paths = []
    for k, im in enumerate(imgs):
        p = OUT / f'{name}-{k}.png'
        if isinstance(im, str) and im.startswith('data:'):
            p.write_bytes(base64.b64decode(im.split(',', 1)[1]))
        elif isinstance(im, str) and im.startswith('http'):
            urllib.request.urlretrieve(im, p)
        else:
            print('unrecognized image payload:', str(im)[:80]); continue
        p.with_suffix('.json').write_text(json.dumps(meta, indent=2))
        paths.append(p)
        print(p)
    if not paths:
        print('no images in response; keys:', list(resp.keys()), file=sys.stderr)
        print(json.dumps(resp, default=str)[:600], file=sys.stderr)
    return paths

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('prompt')
    ap.add_argument('--model', default='flux2pro', choices=MODELS)
    ap.add_argument('--w', type=int, default=1344)
    ap.add_argument('--h', type=int, default=768)
    ap.add_argument('--name', default=None)
    ap.add_argument('--seed', type=int, default=None)
    ap.add_argument('--n', type=int, default=1)
    ap.add_argument('--edit', default=None, help='input image path -> edit mode (use qwenedit)')
    a = ap.parse_args()
    model = MODELS[a.model]
    name = a.name or re.sub(r'[^a-z0-9]+', '-', a.prompt.lower())[:40].strip('-')
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M')
    name = f'{stamp}-{name}'
    body = {'prompt': a.prompt, 'width': a.w, 'height': a.h, 'num_images': a.n}
    if a.seed is not None:
        body['seed'] = a.seed
    if a.edit:
        img = pathlib.Path(a.edit).read_bytes()
        body['image'] = 'data:image/png;base64,' + base64.b64encode(img).decode()
    meta = {'model': model, 'prompt': a.prompt, 'seed': a.seed, 'date': stamp,
            'size': [a.w, a.h], 'policy': 'internal concept art only — never the shipped public face'}
    resp = call(model, body)
    save_images(resp, name, meta)

if __name__ == '__main__':
    main()
