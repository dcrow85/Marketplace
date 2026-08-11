# THE TARGET — what the character should actually look like

`character-animation.mp4` (Crowley, 2026-08-11) is the reference. Every static
pose I produced fell short of it, and the reasons are specific and reusable:

1. **THE EYES EMIT.** They are lamps, not green dots — they glow, bloom, and
   CAST LIGHT into the surrounding scene (see REF-eyes-emitting.png, where the
   beams are visible in the room). This one quality carries "the life force is
   inside them" better than any marking.
2. **THE BODY HAS VOLUME.** Subtle sheen and roundness; a soft solid object you
   could pick up. Flat matte cutouts are wrong.
3. **THE CHEST MARKS GLOW** rather than sitting as paint.
4. **THE WORLD IS THICK BRUSHWORK** — directional, alive, textured. A flat bone
   field is wrong.
5. **IT IS ANIMATE.** It holds, reads, looks up, breathes. The character's charm
   lives in MOTION.

**Implication: this is a rigged/animated character, not a PNG library.** The
qualities above (glow spill, breathing, eye-tracking) only exist in motion, so
the build path is a Rive rig or a video pipeline — not static exports.

## The pipeline (tested 2026-08-11, all on the existing DeepInfra key)

canon still -> **google/veo-3.1-fast** (motion) -> **Bria/video_remove_background**
(transparency) -> composite over painted scenes, or slice to a sprite sheet.

- **Veo 3.1 HOLDS THE CHARACTER** — no invented features, ears and proportions
  and paint all preserved; it only breathes and glows. ~60s per generation, 8s
  clip. This is the same family Crowley used via Gemini.
- **Pixverse-6-I2V DRIFTED OFF-MODEL** — cheaper ($0.045/s vs Veo) and faster
  (37s), but it invented a MOUTH and eyelids. Rejected.
- **Guard the face explicitly**: "NO mouth, NO nose, NO eyelids — only two
  glowing green circles for eyes, always fully open and round." Without this,
  models add a face.
- **"The camera is locked and does not move"** keeps it character animation
  rather than a movie.
- Download note: Veo returns a SIGNED Google URL — fetch it WITHOUT the
  DeepInfra Authorization header or it 401s.
- Delivery: WebM+alpha plays in browsers with transparency; a sprite sheet gives
  total control, caches forever, needs no decoder, and can hold a pose.
- Budget guidance: spend motion on the COMPANION ONLY — its reveal at the bond
  (one beautiful clip) and a short idle loop beside the collector. The village
  stays still silhouettes and carried lights.
