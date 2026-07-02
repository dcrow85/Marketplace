# Design Audit — cairn.cards (2026-07-02)

Auditor: Claude (surface lane), invited by Crowley to take the floor. Standard audited
against: the project's **own** written constitution — `Protocol_Human_Surface_v0.2.md`
(visual registers, color discipline, ambient glance, resting surface) and the c(ai)rn
brand rules. Method: walked every live surface (landing, binder glance, card modal,
trade panel, scan sheet, dark mode) in the running app; inspected computed styles;
cross-checked source. Review artifact, not a spec head — the judged-layer freeze is
untouched.

**Verdict up front:** the surface has the *ethics* right — the honesty copy, the
enforced/judged tags, the witness-not-proof boundaries are present and often excellent —
but it has not adopted its own visual constitution. The three loudest rules in
Human_Surface v0.2 (one-hue color discipline, weight-not-color wordmark, altitude
separation) are all written down and all unimplemented. Memory already knew this
("forensic-record aesthetic … not yet in production code"); this audit itemizes it.

---

## Findings, ranked

### 1. The color discipline is written but not practiced — production runs a three-hue system
**Spec (hard rule):** "Only two things on a surface may carry color: the card image, and
one risk hue (oxblood). … Spending the risk hue anywhere that is not a risk devalues it
everywhere."
**Production:** three signal hues — blue `--agent` (#2C5B8C/#7BA7D6), green `--have`
(#3E7D52/#5FA877), oxblood `--signal` — plus blue spent *decoratively* everywhere:
active catalog pill, Ask button, scan FAB, active nav item, trade tabs, links, "Add your
photo," enforced-tags. Landing alone shows 10 blue elements vs 2 oxblood. Green is spent
on have-stance, scan "recognized" glows, ✓ badges, commit buttons, the Settled pill, and
the record's "✓ verified" badge (the Fable review independently flagged the green-check
posture — two reviews now converge here).
**The decision this forces (Crowley's call, not mine):** either **(a)** enforce the spec
— repaint agent-chrome to ink (hierarchy by weight/value, as the landing's own "Start a
hunt" button already does correctly), keep oxblood as the only hue; or **(b)** amend the
spec to a *three-signal* constitution (blue = agent action, green = recorded-good,
oxblood = risk) and then police it as hard as the one-hue rule. What's untenable is the
current state: a written hard rule the product visibly ignores — the same
record-vs-reality gap the Fable review found in the test counts, in visual form.

### 2. Audit material leaks into Glance — hashes and packet labels on the card modal
**Spec:** Glance is a specimen sheet: "No hashes, no packet labels, no certificate
posture." Audit lives on the dark bench, behind "open the record."
**Production (Penny modal, one screen):** a truncated catalog hash (`catalog
69e165a34594…`), machine row IDs (`row azuki_tcg_official_gallery:S1-AZK01-001_Penny_E_C_die`),
and a raw warning code (`gates_awakened_row_inherits_alpha_stamp`) — protocol-internal
language at the collector's glance, the spec's verbatim "bad resting copy" failure mode.
**Fix (cheap):** keep every fact, move the machine forms behind one "open the record"
disclosure styled as the forensic register; the human-readable warning sentence (which is
good) stays.

### 3. The provenance badge marks the default, not the exception
**Production:** every one of 143 Gates Awakened cards wears an "EXACT" chip — 143
identical labels carrying zero glance information.
**Spec:** "the one risk worth noting now — a flag, only if there is one"; counts/labels
only when they change a decision.
**Fix (trivial + it *strengthens* honesty):** badge only the exceptions (reference
image, no-rarity reference, master-sheet stopgap). Silence = exact source. The rare
badge then actually means something.

### 4. The ambient glance line doesn't exist — and now there's real state to feed it
**Spec:** one quiet line above the cards — "One hunt needs you. Two are on track.
Nothing else is asking for attention." Never analytics.
**Production:** "0 have · 0 want · 336 in catalog" tallies (counts that change no
decision) and a search bar.
**Why now:** before trades, there was nothing cross-trade to say. Today there are funded
trades, inspection windows with deadlines, disputes awaiting an arbiter — exactly the
states the spec's line was designed for ("One arrival needs your eyes before tomorrow at
4:12 PM"). This is the highest-*value* build in the audit (the others are corrections);
it's also the piece trade #1's participants would actually use.

### 5. Dark mode spends the altitude shift as a preference toggle
**Spec:** dark is the **Audit register** — "Opening the record literally drops the human
from the light glance into the dark bench — the value shift *is* the altitude shift. It
does not leak upward into ordinary browsing."
**Production:** a 🌙 header toggle makes *browsing* dark; the trade record panel renders
in the same light paper as everything else.
**Decision to make:** (a) drop the global toggle and reserve dark for the record/audit
surfaces (bold, spec-pure, users may miss dark mode); or (b) keep the comfort toggle but
give the audit register its *own* unmistakable treatment (black bench + bone + mono
ledger rules) so the altitude shift survives inside either theme. I lean (b) —
pragmatic, keeps the spec's core trick alive.

### 6. The wordmark inverts its own rule
**Spec:** "the mark is monochrome … the 'ai' stands out by weight, not color."
**Production (landing + app):** the "ai" is `rgb(44,91,140)` blue at weight **400** —
color, no weight. The exact inverse. One-line CSS fix; do it regardless of how finding
#1 is decided.

### 7. Decide surfaces: the primary action isn't "the darkest thing on the screen"
**Spec:** "the primary action is the darkest thing on the screen by value alone."
**Production:** the app's Fund/Ask/commit buttons are blue; the landing's "Start a hunt"
is near-black ink — the repo's own correct example. Repaint app primaries to the
landing's posture (rolls into #1a; standalone if #1b wins, blue then being reserved for
*agent* actions specifically — but Fund is a human commit, not an agent action, so it
should be ink either way).

### 8. Copy drift + small craft
- Landing: "Starting with vintage Pokémon" — the live product is Azuki-first and the
  pilot is Azuki-gated. Stale first impression; one-line fix.
- Label microtype runs 9.5–11px mono; `--dim` (#85827A) on white is ≈3.5:1 — below AA
  for the 11–12px sizes it's used at. Nudge `--dim` darker or sizes up.
- "ARBITER WALLET NOT YOU" crams a rule into a label; move "not you" to helper text
  (the G5.1 inline warning already exists and is better).
- Grid card names truncate mid-word without ellipsis at some widths.
- The scan FAB (blue, pulsing ring, double shadow) is the loudest object on the resting
  surface; under the spec it should earn attention by weight/position, not animation +
  hue. (If scanning is genuinely the #1 action right now, this is a defensible
  temporary exception — but then it's the *only* one allowed.)

---

## What is already right (and should be defended)
- **The boundary copy.** "Cairn escrows the funds and records the claim (enforced). It
  can't confirm the card is authentic or its grade — a witness, not proof." This is the
  spec's voice, live, on the money screen. Rare and precious.
- **The trichotomy tags** (enforced/judged) as quiet chips in real UI — the audit found
  the trichotomy decorative in most *specs*; in the *product* it's load-bearing copy.
- **Instrument typography discipline** — Plex Sans for reading, Plex Mono for
  labels/codes, uppercase-tracked eyebrows — consistently applied everywhere.
- **Card-first grid** — images never covered; stance controls above, not over, the art.
- **The landing page** — ink-on-paper, monochrome glyph, darkest-action button, honest
  hero ("Your agent hunts. The protocol holds. You decide."). Closest surface to spec;
  it should be the reference, not the exception.
- **Honest empty/edge states** — "no signer — sign in to act (reads work)".

## Suggested sequence (if adopted)
1. **Decide #1 and #5** — the two constitutional questions (one hue vs three; dark as
   register vs theme). Everything else follows mechanically.
2. Trivial regardless of decisions: wordmark weight-not-color (#6), EXACT→exception
   badging (#3), Pokémon line (#8), `--dim` contrast (#8).
3. Move modal machine-forms behind "open the record" (#2) — pairs naturally with giving
   the trade-record panel the forensic treatment (#5b).
4. Build the ambient glance line (#4) — ideally before trade #1, so the pilot's
   participants feel the protocol watching for them.
5. Repaint primaries to ink per the decision (#7).

*Numbers 2–5 are all surface-lane work; none touch chain/ or the frozen spec heads.*
