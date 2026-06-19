# Protocol — Card Dossier Corpus v0.1

**A sourced depth layer: "an expert collector you can rely on."**
Author: Claude (surface / judged-layer lane) · For: Codex (catalog data lane) · 2026-06-18 · status: spec for build

## 0. North star

Give the judged-layer agent a **deep, sourced knowledge base** over the earliest-era
cards so it can speak to the art, the artist, and how each card was released — with the
authority of an expert collector and the honesty of the protocol. Reliability is the whole
point: **every fact carries a source; the agent narrates only from retrieved sources and
invents nothing.** Depth without provenance is just confident hallucination at higher
resolution — this spec exists to prevent exactly that.

This is the **legible** layer of the trichotomy: enforced (the catalog row) → **legible
(sourced dossier facts)** → judged (the agent's narration over them). It is the input the
agent reasons from; it is not itself judgment.

## 1. Scope (the bound)

- **In:** the earliest Japanese era — **pre-Base promotional cards → the No Rarity Base
  Set** (PMCG1 no-rarity print). Concretely: the promo/campaign slices already in the
  catalog (CoroCoro, Trade Please, ANA "Get in a Jet", Kamex Mega Battle, Parent-Child
  Tournament, etc.) plus No Rarity Base.
- **Pilot first:** the *alpha few cards* (§3) — 3–5 marquee cards to lock the schema before
  scaling.
- **Out (v0.1):** Jungle and later sets, English / WotC cards, pricing (separate thread),
  grading / condition. Don't drift past the bound; **log anything deferred** rather than
  quietly skip it.

## 2. The dossier schema

One dossier per catalog `uid`. The unit of truth is the **claim**: an atomic, retrievable,
*sourced* statement. Everything the agent is allowed to say must be a claim with ≥1 source.

```jsonc
{
  "uid": "no_rarity_base_set:021",          // FK to the catalog row (the enforced anchor)
  "card": { "name_ja": "…", "name_en": "…", "set": "…", "number": "…" }, // denormalized context; catalog stays canonical
  "special_identification_instructions": [   // legible trap rails; checked before narrative or matching
    {
      "id": "no_rarity_lower_right_region_v0.1",
      "authority_label": "legible",
      "trigger": "Identifying a claimed Japanese No Rarity card.",
      "summary": "Inspect the lower-right rarity-symbol region and keep set/row identity attached.",
      "steps": ["…"],
      "not_claiming": ["seller possession", "authenticity", "condition", "image-only proof"]
    }
  ],
  "claims": [
    {
      "id": "c1",
      "field": "art.illustrator",            // controlled vocab, see below
      "text": "Illustrated by Mitsuhiro Arita.",
      "sources": ["s1"],                     // >=1 required, else it is NOT a claim
      "tier": "A"                            // source-reliability tier (§4)
    },
    { "id": "c2", "field": "release.vehicle", "text": "…", "sources": ["s2","s3"], "tier": "B" }
  ],
  "sources": [
    { "id": "s1", "type": "wiki|scan|official|forum", "ref": "<url or in-repo path>",
      "title": "…", "retrieved": "2026-06-18", "tier": "A" }
  ],
  "agent_notes": [],                         // OPTIONAL, explicitly-judged framing — NOT facts, never cited as one
  "coverage": { "art": "A", "release": "B", "history": "none" } // honest per-field source coverage
}
```

**Field vocabulary** (what an expert collector knows about a card):

- `art.illustrator`, `art.depiction` (what is shown / pose / scene), `art.style_note`
- `release.date`, `release.vehicle` (booster / starter / magazine insert / tournament prize /
  campaign), `release.distribution` (the story of how it got out), `release.print_note`
  (No-Rarity / first-print markers)
- `history.significance` (why collectors care), `history.lineage` (the JP→EN relationship),
  `history.variant` (print variants)
- `identification.special_instructions` (trap-aware instructions for exact-row identity:
  lower-right no-rarity region, glossy/non-glossy route, issue insert, source row, owner name,
  card number, conflicting provider metadata, or any other cue an agent must preserve before
  treating two similar-looking cards as the same object)

**Hard rules:**

- No claim without ≥1 `source`. A fact with no source is **omitted**, not asserted.
- `text` is a single narrow statement — atomic enough to cite cleanly.
- `special_identification_instructions` is not a claim that the physical card is authentic,
  possessed, correctly graded, correctly photographed, or spendable. It is a legible checklist
  for avoiding catalog laundering before the agent makes a match, narrates a card, or advances
  a buyer/seller workflow.
- If a row has a known confusion surface, the dossier must include either a non-empty
  `special_identification_instructions` packet or an explicit claim explaining why the confusion
  surface is out of scope for that dossier.
- `agent_notes` is the only home for unsourced framing, and it is explicitly judged — never
  promoted to a claim.

## 3. Pilot — the alpha few cards

Build complete dossiers for ~3 first; **do not scale until the schema survives them.**

1. **No Rarity Charizard** (No Rarity Base) — the marquee: the art, the No-Rarity-print story.
2. **A Nishida / Sugimori piece** (e.g. the early Pikachu) — exercises illustrator + early-art.
3. **One pure pre-Base promo** (e.g. a CoroCoro or campaign card) — exercises the promo
   `release.distribution` path (the hardest sourcing).

(Final picks are Codex's call from the in-scope set — choose cards that actually have source
coverage.) Pilot is **done** when: 3 dossiers exist, every field is either sourced or honestly
`none`, the schema didn't change for the last card, and a Claude/Qwen faithfulness check (§6)
passes.

## 4. Sourcing & provenance (the no-overclaim core)

Mirror the image-provenance discipline already in the binder (exact vs provider-path),
extended to text. Every source gets a tier:

- **A** — primary / authoritative: the actual scan, an official source, a cited wiki passage.
- **B** — secondary / community: uncited wiki, reputable forum, aggregator.
- **C** — inferred / uncertain: flagged; the agent must hedge ("reportedly", "per community").

Sources carry `retrieved` dates (facts get corrected). **Reuse what's already in-repo first:**
the catalog already has illustrator credits and the promo source-slices — cite those as
Tier-A/B sources before reaching outward.

## 5. Storage & retrieval (right-sized — do NOT over-build)

- Dossiers live in **Codex's data lane**: `data/japanese-pre-english/dossiers/` (one JSON per
  uid or per set), with a build script in the existing style
  (`scripts/build_card_dossiers.py`) emitting one consumable artifact (`dossiers.json` or a
  small sqlite).
- Retrieval: at this scale (~hundreds of cards × a few claims) a **local embedding model +
  sqlite/numpy cosine** is plenty. No external vector DB, no cloud. Embedding model runs on
  the Mac (same box as Qwen).
- Retrieval API (the seam Claude consumes): `get_dossier(uid)` and
  `search_claims(uid | query, k)` → return claims **with their sources**.

## 6. Generation contract & acceptance (the "reliable expert" bar)

- The agent narrates a card **only from retrieved claims**; every factual sentence maps to ≥1
  `source_id`. Output keeps **legible (cited facts) separate from judged (its framing / voice).**
- Before the agent identifies, compares, narrates, or recommends action on a card, it checks
  `special_identification_instructions` first. A famous species name, matching artwork,
  matching cert label, or provider title is never enough when the dossier says the exact row has
  a trap rail.
- **Faithfulness probe** (author ≠ verifier): a battery like the interrupt-bar probe — feed the
  agent a dossier and check (a) every factual statement is grounded in a claim, (b) nothing
  invented, (c) source tiers honored (C-tier hedged). Qwen drafts; a stronger model
  spot-checks gate-critical cards.
- **Coverage map:** report which in-scope cards have dossiers and the per-field source-tier
  distribution. **No silent gaps** — an unsourced card is listed as a gap, never filled with
  vibes.

Done (v0.1) = pilot complete (§3) + No Rarity Base and the in-catalog pre-Base promos covered,
retrieval API live, faithfulness probe green, coverage map published.

## 7. Lanes & seams

- **Codex (this build):** dossier schema, sourcing, the data + build script, the retrieval API.
  An extension of the catalog data pipeline.
- **Claude:** consumes the retrieval API — wires the deep-dive into the browse agent + the
  detail-modal UI, owns the agent voice / narration contract (the personality thread feeds on
  this).
- **Shared seam:** the **dossier schema + retrieval API shape** (like `catalog-sample.json` is
  a seam). Codex owns the data shape and notes schema changes in `SYNC`; Claude re-wires.
  Claude doesn't hand-edit dossiers; Codex doesn't change the agent contract unilaterally.
- **Discipline:** author ≠ verifier on faithfulness; path-scoped commits; every claim sourced;
  coverage gaps logged, not hidden.

## 8. Phasing

- **P0** — schema + pilot (alpha few, §3). Lock the contract.
- **P1** — No Rarity Base + the in-catalog pre-Base promos (the bound). Build the corpus, sourced.
- **P2** — retrieval API wired into the agent + faithfulness probe + coverage map. Hand the
  seam to Claude for the deep-dive UI + voice.
