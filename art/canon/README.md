# CANON — do not regenerate, only edit

`CHARACTER-MASTER.png` is THE character sheet. Crowley chose it; it is the
reference for proportion, weight, texture and restraint.

**Never re-prompt the character.** Two attempts to "improve" it by prompting
degraded it — once toward chibi (head grew, weight rose), once toward squat
(head/body distinction collapsed). The design has no drift-resistance in a
fresh generation.

**Instead, EDIT this file** with `scripts/waystone_art.py --model qwenedit
--edit art/canon/CHARACTER-MASTER.png "change ONLY <the one thing>"`. Every
other pixel survives. Proven: an ear-variant pass changed only the ears and
preserved bodies, poses, eyes, tallies and brushwork exactly.

Why it works (recorded in Waystone_World, and true for a human illustrator too):
small in frame with air around it; painted black with brush texture, never flat
vector; two green dots and nothing else on the face; one unbroken rounded mass;
chunky proportions; and THE WEIGHT SITS LOW — head ~40% of height, pear body
widening to the base, slightly taller than wide. Cute by weight and stance, not
by an oversized head.
