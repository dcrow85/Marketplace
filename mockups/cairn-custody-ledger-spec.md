# Cairn — Chain-of-Custody Ledger (design spec v0.1)

Second design probe in the Cairn forensic-record language. The specimen plate
(`cairn-specimen-plate.html`) proved the voice on a static object; this proves it
on a process over time. If the cert/forensic grammar holds for a temporal log,
the aesthetic is a system, not a one-off.

## The reframe (what makes this Cairn, not a timeline)

A chain of custody normally *promises* an unbroken chain of trust. Cairn's cannot
and must not. The component pivots on one honest line:

```text
A chain of custody is a chain of signatures, not a chain of truth.
Each link names who acted, when, and what they anchored. The marks say which
links the contract enforced, which are only legible, and which a human judged.
```

Two consequences drive the whole design:

1. Every link carries an authority mark: `enforced` / `legible` / `judged`. The
   ledger is the enforced/legible/judged trichotomy rendered as a sequence.
2. The physical world crosses into the record at specific links (fingerprint
   commit = ingress; carrier handoff = continuity; buyer accept = egress to
   judgment). Those are **seams** — drawn as visible joints in the chain where
   continuity is attested, not proven. The gap taxonomy, inline. A custody chain
   that shows its own breaks is the thesis as a moving object.

## What it renders (the real protocol, like the plate rendered a real card)

The actual escrow gate sequence, each row an event the contract or harness
emitted. Grounded in the contract state machine:

| # | gate | actor | → state | authority | seam |
|---|---|---|---|---|---|
| 1 | escrow terms created | buyer + seller | Offered | enforced (signed) | — |
| 2 | seller bond posted | seller | Bonded | enforced | — |
| 3 | item evidence attached | seller | EvidencePending | legible | — |
| 4 | item fingerprint committed | seller | — | enforced (signature) | ↯ ingress — bytes name a claim, not the atoms |
| 5 | verifier scope / attestation | verifier | — | legible → judged | — |
| 6 | inventory lock committed | seller | — | enforced (bound to fingerprint) | — |
| 7 | route committed (witness + spendability digest) | seller | RouteLocked | enforced | — |
| 8 | delivery witnessed | seller / carrier | InspectionOpen | enforced (witness) | ↯ continuity — carrier handoff, custody not proven |
| 9 | buyer accept | buyer | Settled | judged | ↯ egress — the human decided; physical truth the contract can't reach |
| (alt) | claim opened → arbiter ruling | buyer → arbiter | Settled w/ remedy | judged | — |
| last | receipt anchored | contract | — | enforced | — |

Entry anatomy (the columns): `timestamp` (mono) · the chain spine · `gate`
(name) · `actor` + signature glyph · `anchor` (truncated hash, mono) · `→ state`
· authority mark · optional seam annotation.

## Visual grammar

Inherits from the specimen plate, unchanged:
```text
- black bench, bone ink, hairline rules, registration marks
- editorial serif (EB Garamond) for the two reverence moments only; monospace
  (IBM Plex Mono) for all record data — timestamps, hashes, actors, states
- the contour seal at the colophon; the same record header (id, hash, gate)
- no nav, no cards, no pills; it is a record, not a page
```

New to this component:

1. **The chain spine.** A thin vertical bone rule down the left gutter linking
   every entry's node. Each node is a small mark on the spine. This is the
   literal "chain."

2. **Color encodes where the human entered** (keeps the limited-red discipline
   AND carries the trichotomy):
   ```text
   enforced  → bone node, solid     (the contract did it)
   legible   → bone-dim node, open  (recorded, unverified)
   judged    → oxblood node          (a human decided — the red marks the human touch-points)
   ```
   Red is reserved for the moments a person's judgment entered, which are also
   the decision points and the gap-adjacent links. One accent, made to mean
   exactly one thing.

3. **Seam glyphs.** At a seam, the spine breaks to a short dashed segment with a
   right-margin note in oxblood: `↯ ingress — the card entered the record here;
   continuity is attested, not proven.` The break is deliberate and labeled —
   never smoothed.

4. **The current gate** (for an in-progress trade) is the one node drawn solid
   oxblood with a hairline box and a `you are here` mono tag in the margin. This
   makes the ledger double as the "know exactly where you stand" view — the
   confident hero line made literal.

## Layout sketch

```text
┌ + ─────────────────────────────────────────────────── + ┐
│  Cairn                              record  crn·…·4a7f   │
│  custody ledger                     gate    inspection   │
│ ─────────────────────────────────────────────────────── │
│  14:02:07Z  ●─ escrow terms        buyer+seller   ✓enf   │
│  14:05:18Z  ●─ seller bond         seller         ✓enf   │
│  14:31:55Z  ○─ item evidence       seller          ·leg  │
│  14:33:02Z  ●─ item fingerprint    seller   0x9f3a ✓enf  │
│             ┊  ↯ ingress — bytes name a claim, not atoms │
│  15:10:44Z  ◍─ route committed     seller   0x42db ✓enf  │
│  …delivery…                                              │
│  16:20:01Z  ◆─ buyer accept    ◀ you are here   ?judged  │  ← oxblood
│ ─────────────────────────────────────────────────────── │
│  (seal)  cairn · crn-021-4a7f      not affiliated …      │
└ + ─────────────────────────────────────────────────── + ┘
```

## States / variants the build must cover

```text
1. Settled happy path (created → accept → receipt).
2. Claim path (delivery → claim opened → arbiter ruling → settled w/ remedy):
   the dispute renders as additional judged links, not a hidden branch.
3. In-progress trade: gates done + the current gate highlighted; pending gates
   shown dim below the line as "not yet" (the chain isn't finished).
4. The three seams always visible and labeled.
```

## Honest framing copy (replaces a "fully tracked / secure chain" claim)

```text
Header sublabel:  custody ledger
Colophon line:    A chain of signatures, not a chain of truth.
Seam note style:  ↯ <crossing> — continuity is attested, not proven.
Authority key:    enforced = contract checked it · legible = recorded, not
                  verified · judged = a person decided
```

No tagline. The key and the seam notes do the honesty; the record doesn't argue.

## Composition with the specimen plate

The plate is the *object* record (PLATE I — what the card is). The ledger is the
*process* record (how the trade moved). They share the frame, header, and seal,
and should read as two faces of one Cairn provenance record — eventually two
sections of a single document: plate, then ledger, then seal.

## Open questions for the build

```text
- Authority key as a small legend, or inferred from the node marks alone?
- Show truncated hashes on every enforced row, or only at the seams and the
  capstone (receipt)? (Density vs. completeness.)
- Render the spine seam-break as dashed, or as an actual visual gap with the
  node detached? The detached-node reads the "break" harder.
- One sample trade (the $6,400 No Rarity Charizard, matching the plate) so the
  two components share a subject.
```
