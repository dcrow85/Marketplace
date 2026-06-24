# Protocol — Catalog Evidence (community specimens) v0.2  (alpha — post-Kepler: anchor & scope tightened)

> **Status:** alpha. Revises v0.1 after **Kepler's pass** (SYNC, 2026-06-23, `d97580f`).
> **Verdict held:** survives, gates intact (G6 preserved; Verifier §6/A1/A6 reused, not weakened),
> drill real. v0.2 lands the **four promotions**: (1) tighten the **`settled_trade` anchor** (a clean
> settlement is not a resolved-genuine outcome unless it adjudicated row/variant/authenticity *and*
> finality/tail elapsed); (2) promote the public-corpus decision to a required **`CorpusVisibilityPolicy`
> gate** (CE9); (3) **CE4 must key on registry-canonical labels**, not contributor-supplied (the same
> rotation lesson as the A1 cluster/custodian fix); (4) add the missing **row/variant-scope poisoning**
> attack → **CE10**.
> **The point is still §4 (Poisoning) + the gates §5. Gates intact — nothing here lowers a wall.**
> On-chain anchor binds + the catalog data pipeline are **Codex's lane**; the binder surface is mine.
> **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Reviewed artifact:** `Protocol_Catalog_Evidence_v0.1.md` @ `c8a7106` (frozen; diff target).
> **Freeze:** v0.2 = the v0.3 diff target. **Reviewer:** Codex/Kepler.
> **Drill:** `simulations/catalog_evidence_drill.py` — gates **CE1–CE10**, per-subguard teeth.

## What changed (four promotions → dispositions)

| # | Kepler finding | v0.2 disposition | anchor |
|---|---|---|---|
| 1 | `settled_trade` too broad as a reference anchor | **CE1 tightened** — a `settled_trade` anchor requires the settlement to have **covered row/variant/authenticity scope** AND **finality + tail elapsed** | §3 / CE1 |
| 2 | public high-res corpus can't be a soft choice | **new CE9 `CorpusVisibilityPolicy`** — a bound visibility policy; full-res anchored + high-discriminating views are **verifier-only**, not public | §4.E / CE9 |
| 3 | CE4 used contributor-supplied labels (rotatable) | **CE4 keys on registry-canonical** contributor/control-cluster labels (the **A1 cluster/custodian rotation lesson**, reused) | CE4 |
| 4 | missing attack: row/variant-scope poisoning | **new CE10** — a specimen must anchor to an **exact single-variant** row at matching scope; broad/parent/nearby rows can't weight a variant's distribution | §4.H / CE10 |

## 0–2. Reframe · honest core · trichotomy  (unchanged from v0.1, compressed)

The catalog becomes a **living, provenance-tiered distribution of community specimens** (variance is the
feature; copyright-clean; a non-financial cold-start path). **Bright line preserved (G6 = CE2):** a
specimen match is **legible evidence, never authentication.** Submission is free and **zero-weight**;
reference authority is **earned** through anchors (§3). Ownership is **decoupled** from contribution.

## 3. The provenance ladder — with the tightened anchor  (finding 1)

Weight in the genuine distribution = **f(provenance anchor), never f(submission).** Anchors:
- **grader_cert** — an audit-anchor genuineness cert.
- **bonded_verifier_attestation** — a bonded physical verifier handled the card at the specimen's scope.
- **settled_trade — NARROWED (finding 1).** A clean settlement is **not** a resolved-genuine outcome by
  itself. It anchors a specimen as genuine **only if** the trade's JSC/route/evidence-floor **actually
  adjudicated row/variant/authenticity at the specimen's scope** *and* **finality + the bond tail have
  elapsed** (so a late-surfacing fraud could still have unwound it — ties G1 tail / G5.5 appeal-finality
  / the Insurance window). A low-value trade that settled without authenticity ever in scope **does not
  anchor.**

## 4. Poisoning — the attack surface (+ H)

A distribution poisoning → CE1 (zero weight) + CE3 (anchored only, self/related excluded) + CE4 (caps).
· B anchor laundering → CE3. · C Sybil flooding → CE4 (now **registry-canonical**, finding 3). · D
pay-for-poison → CE8. · **E the dark mirror → CE9 `CorpusVisibilityPolicy` (finding 2):** a public
high-res anchored corpus *is* forger training data; the most discriminating views must be
**verifier-only**, public views **down-res/watermarked/sampled**. A *legibility amplifier, not an
authenticity oracle* — the residual stays priced/insured. · F theft-map leak → CE6. · G overclaim →
CE2 (= G6). · **H. Row/variant-scope poisoning (NEW, finding 4):** images anchored to a **nearby or
overly-broad** catalog row teach the *wrong* distribution — e.g., a common-variant photo anchored to a
rare-variant row, or anchored to a parent row spanning N print variants, polluting the rare variant's
"genuine" range. → **CE10** (exact single-variant row + anchor-scope match + cross-variant exclusion).
*Push hardest on A and H.*

## 5. The gates (falsifiable, per-subguard — §10)

- **CE1 — Zero weight until anchored, with a tight anchor.** raw ⇒ weight 0 · tiered ⇒ valid `anchor_ref`
  · anchor type ∈ {grader_cert, settled_trade, bonded_verifier_attestation} · a `settled_trade` anchor
  **covered row/variant/authenticity scope** · a `settled_trade` anchor is **final (tail elapsed)**. *(5)*
- **CE2 — Specimen match never authentication (= G6).** *(1)*
- **CE3 — Anchor integrity.** attestor ≠ contributor · ≠ related party · anomaly outlier flagged. *(3)*
- **CE4 — Sybil/flood caps on REGISTRY-CANONICAL labels.** contributor label registry-resolved ·
  cluster label registry-canonical · per-contributor share ≤ cap · per-cluster share ≤ cap. *(4)*
- **CE5 — Claim boundary.** `not_claiming ⊇ {possession, authenticity, condition}` · no authenticity claim. *(2)*
- **CE6 — Privacy / theft (A6).** location stripped/encrypted · pseudonymous handle. *(2)*
- **CE7 — Display license + tier floor.** granted license for trade use · tier ≥ gate floor. *(2)*
- **CE8 — Incentive anti-poison.** credit only on anchored, never raw. *(1)*
- **CE9 — CorpusVisibilityPolicy (NEW).** a visibility policy is bound · full-res anchored specimens are
  not public without down-res/watermark · high-discriminating (forger-valuable) views are verifier-only. *(3)*
- **CE10 — Row/variant-scope precision (NEW).** `row_ref` resolves to a **single variant** (not a
  broad/parent row) · the anchor's adjudicated scope **matches** the specimen's row/variant · a specimen
  whose content matches a **different** variant than its `row_ref` is excluded/flagged. *(3)*

## 6–8. Agent upgrade · composition · schema  (unchanged from v0.1; schema additions noted)

The `LegibilityAgentAttestor` reports **within vs outside the anchored distribution = a legible anomaly
score, never a verdict** (right side of G6/CE2). **Gates intact:** CE2 = G6; CE1/CE3 reuse Verifier §6;
CE4 reuses A1 caps **on canonical keys**; CE6 reuses A6; **CE9** reuses the A6/trusted-base "don't leak
the substrate" discipline; **CE10** reuses the catalog `row_hash`/variant precision. Schema gains:
`anchor.adjudicated_scope`, `anchor.finality_tail_elapsed`, `contributor.registry_id`,
`cluster.canonical_id`, `visibility:{policy_ref, public_resolution, verifier_only}`,
`row_ref.single_variant`.

## 9. Maturity / open

- **Design only.** On-chain anchor binds + the catalog data pipeline (and the **CorpusVisibilityPolicy**
  + **contributor/cluster registry** surfaces) are **Codex's lane** (shared seam).
- the **anomaly/distribution model** (CE3 outlier, CE10 cross-variant, §6) is unspecced.
- **Numbers unspecced:** the caps, tier floors, the public-resolution / verifier-only thresholds, the
  settled-trade tail length.
- **Recurring principle noted:** "self-asserted labels are rotatable → key on registry-canonical
  identities" now appears in **A1 (cluster/custodian)** and **CE4** — a structural law of the protocol,
  not a per-module quirk.

## 10. Falsification

`simulations/catalog_evidence_drill.py` — gates **CE1–CE10**, each compound guard mutated per-subguard.
v0.2 tightens **CE1** (settled-trade scope + finality subguards), makes **CE4** key on registry-canonical
labels, and adds **CE9** (visibility policy) + **CE10** (row/variant scope). **Result: 10/10 gates ·
26/26 subguards with independent teeth** (py_compile clean).

## 11. Changelog
- **v0.2 (post-Kepler `d97580f`):** narrowed the **settled_trade anchor** (covered-scope + finality/tail,
  CE1); promoted the public-corpus decision to **CE9 `CorpusVisibilityPolicy`** (full-res/high-discriminating
  = verifier-only); made **CE4** key on **registry-canonical** contributor/cluster labels (the A1
  rotation lesson); added **CE10** + **Attack H** (row/variant-scope poisoning). Gates **CE1–CE10**.
  Gates still intact; verdict held.
- **v0.1** (`c8a7106`, frozen): the community-specimen reframe + provenance ladder + CE1–CE8. Diff target.
