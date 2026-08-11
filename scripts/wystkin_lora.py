#!/usr/bin/env python3
"""Train and use the Waystone character LoRA on fal.ai.

Prerequisite (one time, Crowley's action):
  1. make an account at https://fal.ai and create an API key
  2. store it:  security add-generic-password -a fal -s fal-api-key -w '<KEY>' -U

Then:
  python3 scripts/wystkin_lora.py train
      Publishes the dataset zip to the Pages site (temporarily), starts a
      flux-lora-fast-training run, polls until done, and writes the resulting
      LoRA URL to art/canon/lora/LORA.json. REMEMBER to run `untrain-cleanup`
      afterwards to unpublish the dataset.

  python3 scripts/wystkin_lora.py test
      Runs the ACCEPTANCE TEST from the dataset README — a plain standing shot
      to check the proportion law survived training.

  python3 scripts/wystkin_lora.py gen "prompt text" [--name slug] [--n 2]
      Generates with the trained LoRA. The trigger word is added for you.

Costs roughly $2-5 per training run; generations are cents.
"""
import argparse, json, pathlib, subprocess, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
LORA_DIR = ROOT / 'art' / 'canon' / 'lora'
LORA_JSON = LORA_DIR / 'LORA.json'
ZIP = LORA_DIR / 'wystkin-dataset.zip'
PUB = ROOT / 'web' / 'public' / 'dset'          # temporary public home for the zip (no leading _: Pages reserves those)
ZIP_URL = 'https://cairn.cards/app/dset/wystkin-dataset.zip'
TRIGGER = 'wystkin'
QUEUE = 'https://queue.fal.run'


def key():
    r = subprocess.run(['security', 'find-generic-password', '-s', 'fal-api-key', '-w'],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit('No fal key. Create one at https://fal.ai then:\n'
                 "  security add-generic-password -a fal -s fal-api-key -w '<KEY>' -U")
    return r.stdout.strip()


def call(path, body):
    req = urllib.request.Request(f'{QUEUE}/{path}', data=json.dumps(body).encode(),
                                 headers={'Authorization': f'Key {key()}', 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=120))


def poll(model, req_id, label):
    url = f'{QUEUE}/{model}/requests/{req_id}'
    while True:
        s = json.load(urllib.request.urlopen(urllib.request.Request(
            url + '/status', headers={'Authorization': f'Key {key()}'}), timeout=60))
        st = s.get('status')
        print(f'  {label}: {st}', flush=True)
        if st == 'COMPLETED':
            return json.load(urllib.request.urlopen(urllib.request.Request(
                url, headers={'Authorization': f'Key {key()}'}), timeout=120))
        if st in ('FAILED', 'CANCELLED'):
            sys.exit(f'{label} {st}: {json.dumps(s)[:400]}')
        time.sleep(10)


def deploy_site(msg):
    """Build + deploy the Pages site so the zip (or its removal) goes live."""
    env = subprocess.run(['bash', '-lc',
        'export CLOUDFLARE_API_TOKEN=$(security find-generic-password -s cloudflare-api-token -w) '
        'CLOUDFLARE_ACCOUNT_ID=$(security find-generic-password -s cloudflare-account-id -w); '
        f'cd {ROOT}/web && VITE_API_BASE=https://api.cairn.cards npm run build >/dev/null 2>&1 && '
        'cp wrangler-pages.toml wrangler.toml && '
        'npx wrangler pages deploy --branch=main --commit-dirty=true 2>&1 | tail -2; rm -f wrangler.toml'],
        capture_output=True, text=True)
    print(f'  {msg}: {env.stdout.strip().splitlines()[-1] if env.stdout.strip() else "deployed"}')


def cmd_train(a):
    PUB.mkdir(parents=True, exist_ok=True)
    (PUB / ZIP.name).write_bytes(ZIP.read_bytes())
    print('publishing dataset…')
    deploy_site('dataset live')
    # give the edge a moment, then confirm it is actually fetchable
    for _ in range(10):
        try:
            with urllib.request.urlopen(ZIP_URL, timeout=30) as r:
                if r.status == 200:
                    break
        except Exception:
            time.sleep(6)
    else:
        sys.exit(f'dataset not reachable at {ZIP_URL}')
    print('starting training…')
    sub = call('fal-ai/flux-lora-fast-training', {
        'images_data_url': ZIP_URL, 'trigger_word': TRIGGER,
        'steps': a.steps, 'create_masks': False, 'is_style': False,
    })
    res = poll('fal-ai/flux-lora-fast-training', sub['request_id'], 'training')
    lora = res.get('diffusers_lora_file', {}).get('url')
    LORA_JSON.write_text(json.dumps({'lora_url': lora, 'trigger': TRIGGER,
                                     'steps': a.steps, 'trained': time.strftime('%Y-%m-%d')}, indent=2))
    print('\nLoRA:', lora)
    print('written to', LORA_JSON)
    print('\nNOW RUN:  python3 scripts/wystkin_lora.py cleanup     (unpublishes the dataset)')
    print('THEN RUN: python3 scripts/wystkin_lora.py test        (the acceptance test)')


def cmd_cleanup(_a):
    p = PUB / ZIP.name
    if p.exists():
        p.unlink()
    if PUB.exists() and not any(PUB.iterdir()):
        PUB.rmdir()
    deploy_site('dataset unpublished')


def generate(prompt, name, n):
    cfg = json.loads(LORA_JSON.read_text())
    print('generating…')
    sub = call('fal-ai/flux-lora', {
        'prompt': f'{cfg["trigger"]} {prompt}',
        'loras': [{'path': cfg['lora_url'], 'scale': 0.75}],
        'image_size': 'square_hd', 'num_images': n, 'enable_safety_checker': False,
    })
    res = poll('fal-ai/flux-lora', sub['request_id'], 'generating')
    out = ROOT / 'art' / 'concepts'
    for i, im in enumerate(res.get('images', [])):
        p = out / f'{time.strftime("%Y%m%d-%H%M")}-{name}-{i}.png'
        urllib.request.urlretrieve(im['url'], p)
        print(' ', p)


def cmd_test(_a):
    generate('creature standing plainly facing forward on a plain pale painted background, full body, '
             'flat matte painted style', 'lora-acceptance', 2)
    print('\nACCEPTANCE TEST — check against the proportion law:')
    print('  head ~40% of height · pear body widening to the base · slightly taller than wide')
    print('  small ears · tiny short feet · TWO GREEN DOTS AND NOTHING ELSE on the face')
    print('  A big-headed chibi, a squat blob, or any mouth = retrain.')


def cmd_gen(a):
    generate(a.prompt, a.name or 'lora', a.n)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    t = sub.add_parser('train'); t.add_argument('--steps', type=int, default=1500); t.set_defaults(f=cmd_train)
    sub.add_parser('cleanup').set_defaults(f=cmd_cleanup)
    sub.add_parser('test').set_defaults(f=cmd_test)
    g = sub.add_parser('gen'); g.add_argument('prompt'); g.add_argument('--name'); g.add_argument('--n', type=int, default=2)
    g.set_defaults(f=cmd_gen)
    a = ap.parse_args(); a.f(a)
