# The character LoRA — dataset and recipe

**Trigger token: `wystkin`**

## What's here
`images/` — 32 image+caption pairs, resized to 1024px long edge.

| source | count | why it's in |
|---|---|---|
| frames from `animated/character-animation.mp4` (Gemini) | 10 | the richest variety of pose, angle and light; the eyes EMIT here |
| frames from `animated/test-veo-scene.mp4` | 6 | the card action, painted-room depth, camera push |
| frames from `animated/test-veo.mp4` | 3 | calm idle against a plain wall |
| `BODY-HIRES.png` + the five POSE-*.png | 6 | the flat matte register, clean poses |
| six gear states from the maker's bench | 6 | carrying/wearing variation |
| `CHARACTER-MASTER.png` | 1 | the canonical sheet |

Video frames are the backbone deliberately: every frame of a clip is the same
character by construction, which is exactly the consistency a LoRA needs, and
they supply angles and lighting no still ever gave us.

## Captions
Captions name only what should stay VARIABLE (pose, action, background, gear) and
deliberately omit the invariants (body shape, proportions, ear form, the two green
eyes) — those are what the LoRA must absorb as identity rather than as options.

## Training recipe
- Base: FLUX.1-dev (the 2026 default for character LoRAs).
- 1024px, ~1500–2000 steps, LR 1e-4, rank 16–32.
- Services: fal.ai or Replicate flux-lora-trainer (an afternoon, a few dollars).
- Use at strength 0.6–0.8; higher tends to flatten pose variety.

## Acceptance test — DO NOT SKIP
This character's charm is a proportion, not a silhouette. Before trusting the
LoRA, generate it standing plainly and check against `Waystone_World`'s law:
**the weight sits low** — head ~40% of height, pear body widening to the base,
slightly taller than wide, small ears, tiny short feet. If the LoRA returns a
big-headed chibi or a squat blob, it learned "black shape with green dots" and
must be retrained with more of the flat-matte stills weighted in.

Also check the face: **two green dots and nothing else.** Any model that adds a
mouth or eyelids has failed (Pixverse did exactly this in video).
