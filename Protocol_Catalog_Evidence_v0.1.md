# Protocol — Catalog Evidence (community specimens) v0.1  (alpha — built for adversarial review)

> **Status:** alpha design spec. Authored by Claude (surface/design lane), 2026-06-23.
> **The point of this doc is §4 (Poisoning — the attack surface).** Hit it hard.
> **Design constraint (the user's words): "keeping the gates intact."** This spec **adds no gate
> relief** — it preserves **G6** (a catalog/specimen match never renders as authentication) and
> *reuses* the existing anti-poison machinery (Verifier §6 outcome-provenance, A1 aggregate caps,
> A6 theft-sensitivity, the Tier-0 zero-weight rule). Nothing here lowers a wall.
> On-chain anchor binds + the catalog data pipeline are **Codex's lane**; the binder surface is mine.
> **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Freeze:** v0.1 = the v0.2 diff target. **Reviewer:** Codex/Kepler.
> **Drill:** `simulations/catalog_evidence_drill.py` — gates **CE1–CE8**, per-subguard teeth.
> **Related:** `Protocol_Verifier_v0.4 §6` (outcome-poisoning), `Protocol_Consolidated_Spec_v0.2`
> (G6, A1, A6), `Protocol_Bootstrap_v0.1` (cold-start), `Protocol_Human_Surface_v0.2` (pseudonymity),
> the catalog substrate (`cairn-inventory.html`, `catalog_hash/row_id/row_hash`).

## 0. The reframe

Today the catalog is a **fixed reference** — one stock image per row, provenance-badged, with **G6**
ensuring a match never reads as authentication. v0.1 turns it into a **living, provenance-tiered
distribution of community specimens**: anyone (sellers showing inventory *and* non-sellers showing
their collection) can photograph their card and attach it to the row as **evidence**. The corpus is
eventually **more honest than one stock image** — but only if it **earns** its honesty through the
provenance ladder (§3), or it becomes a poisoned ground truth (§4).

## 1. The honest core (why a distribution beats a point)

A stock image is the platonic ideal; it **hides variance**. A corpus of N real specimens shows the
**range** — how the holo actually catches light, how centering legitimately varies, what genuine wear
looks like, the real spread of print variation. The variance **is the feature**: a single idealized
image implies one correct appearance, so a genuine-but-variant card reads as wrong; the corpus removes
that false precision. Two free wins: it is **copyright-clean** (the contributor's own photo of their
own card, with a granted display license — not a scraped stock image), and it is a **non-financial
cold-start path** (a reason for non-sellers to show up, seeding the reference substrate before there is
liquidity — Bootstrap).

## 2. Trichotomy placement

**ENFORCED:** content-address of the photo (`image_hash`) · contributor signature · timestamp · the
catalog `row_ref` it attaches to · the **provenance tier** label · the **anchor_ref binding** for a
tiered specimen · the **display license** grant · per-contributor / per-cluster **contribution caps**.
(The contract can bind "contributor X submitted hash H against row R at time T, tier=raw.")

**LEGIBLE:** the specimen's **claim** ("a reference photo of this card", with `not_claiming[]`) · the
contributor's **reputation vector** · the EXIF/capture provenance · the **anomaly score** vs the
anchored distribution.

**JUDGED:** whether the photo **actually depicts a genuine card**, whether it is **representative**,
whether it should be promoted to **reference quality**.

**THE BRIGHT LINE (G6, preserved verbatim):** a catalog/specimen match is **legible evidence, never
authentication.** No surface may render a specimen match as "authentic / genuine / real / is that
card." The corpus tells you the **observed range**; matching the range is evidence, not proof.

## 3. The provenance ladder (the poison defense, lifted from Verifier §6)

A photo's **weight in the genuine distribution = f(its provenance anchor), never f(it being
submitted).** Submission is free and legible; *reference authority* is earned:

- **Tier 0 — raw.** Anyone submits. Legible, attributed, anomaly-scored — **zero reference weight**
  (the Verifier Tier-0 zero-weight-until-anchored rule).
- **Tier 1 — anchored.** Tied to a **resolved genuine outcome** — a grader/audit-anchor cert, a
  **settled clean trade**, or a **bonded verifier's** physical attestation. Carries reference weight,
  **censoring-/provenance-weighted** (Verifier §6); **self- and related-party anchors excluded.**
- **Tier 2 — curated.** Expert-curated canonical reference (the existing "exact" badge). Few, high-trust.

## 4. Poisoning — the attack surface  ⟵ REVIEW HERE

- **A. Distribution poisoning (the central one).** A counterfeiter floods the row with photos of their
  **fakes labeled genuine**, dragging the "genuine distribution" toward the fakes so real cards read as
  outliers. → **CE1** (raw = zero weight) + **CE3** (only provenance-anchored specimens weight the
  distribution; self/related-party anchors excluded) + **CE4** (Sybil/flood caps). The corpus is the
  **verifier's outcome-provenance model applied to images** — poison-resistant by the same mechanism.
- **B. Anchor laundering.** A contributor "anchors" their own fake (self-attestation, or a friendly
  related party). → **CE3** self-/related-party-anchor exclusion (the G5 separation, applied to anchors).
- **C. Sybil flooding.** Many handles / one cluster flood the corpus. → **CE4** per-contributor +
  per-cluster **weighted-influence** caps (the A1 aggregate-exposure shape applied to *corpus influence*).
- **D. Pay-for-poison.** A contribution credit incentivizes flooding. → **CE8** credit attaches only to
  **anchored/corroborated** specimens, never raw submissions.
- **E. The dark mirror (price it, don't hide it).** A public corpus of genuine specimens is also a
  **counterfeiter's training set** — it hands forgers the target distribution. Honest framing: the
  corpus **raises the floor for casual fakes** but **does not defeat the state-of-the-art forger** → it
  is a **legibility amplifier, not an authenticity oracle**; the sophisticated-fake residual is still
  priced/insured (Verifier §8 / Insurance). **Open design decision:** how much of the anchored corpus is
  public vs verifier-only.
- **F. Theft-map leak.** A non-seller's collection photo advertises they **own** valuable cards. → **CE6**
  EXIF/location stripped-or-encrypted + **pseudonymous** contributor + **ownership decoupled from
  contribution** (you may submit a reference photo without claiming current possession).
- **G. Overclaim leak.** A specimen rendered as authentication. → **CE2** (= G6, preserved).

## 5. The gates (falsifiable — §10)

- **CE1 — Zero weight until anchored.** raw ⇒ reference_weight 0 · a tiered specimen requires a valid
  `anchor_ref` · the anchor type ∈ {grader_cert, settled_trade, bonded_verifier_attestation}. *(3)*
- **CE2 — Specimen match never authentication (= G6).** a specimen-derived render in the auth-label set
  is rejected. *(1)*
- **CE3 — Anchor integrity (poison/§6).** anchor attestor ≠ contributor · ≠ related party · an
  anomaly-outlier is flagged for review, never silently absorbed into the distribution. *(3)*
- **CE4 — Sybil/flood caps.** per-contributor weighted share ≤ cap · per-control-cluster weighted share
  ≤ cap. *(2)*
- **CE5 — Claim boundary.** `not_claiming ⊇ {possession, authenticity, condition}` · no specimen claim
  asserts authenticity (ownership decoupled — a "seen/reference" claim with no possession admits). *(2)*
- **CE6 — Privacy / theft (A6).** location stripped/encrypted/redacted · contributor is a pseudonymous
  handle, not a legal identity. *(2)*
- **CE7 — Display license + tier floor.** a specimen used in a trade carries a granted display license ·
  its provenance tier meets the gate's floor (e.g., a settlement-grade comparison needs ≥ anchored). *(2)*
- **CE8 — Incentive anti-poison.** a contribution credit attaches only to anchored specimens, never raw. *(1)*

## 6. The agent upgrade (the no-overclaim form of "AI authentication")

The Qwen `LegibilityAgentAttestor` today matches an image to a single reference. A provenance-anchored
distribution lets it compute **"this submission is within vs outside the known-genuine distribution"**
on holo-pattern / aspect / registration → a **legible anomaly score, never a verdict.** This is the
honest version of AI authentication: not "the AI says it's real," but **"the AI says it's a statistical
outlier vs the anchored genuine corpus — worth a human look."** It stays the right side of G6/CE2, and
it is a concrete upgrade to `cairn_browse` (and its `commentary_flags` no-overclaim post-check still applies).

## 7. Composition (gates intact — the explicit constraint)

- **G6 is preserved verbatim as CE2** — the design adds *no* path from specimen-match to authentication.
- **Verifier §6 (outcome-poisoning)** is reused as CE1+CE3 — anchored, censoring-weighted, self/related
  excluded. The corpus is its image analog.
- **A1 aggregate caps** are reused as CE4 — corpus *influence* is capped per contributor/cluster the way
  value exposure is capped per principal/cluster.
- **A6 theft-sensitivity** is reused as CE6; **Human Surface pseudonymity** as the contributor identity rule.
- **Bootstrap cold-start** gains a non-financial contribution path; **the `cairn-inventory` binder** is
  the surface (specimens shown provenance-badged: raw / anchored / curated, with the distribution and the
  per-row anomaly outliers — never a single "this is authentic" image).

## 8. Schema (content-addressed)

```
CommunitySpecimen = {
  row_ref:        { catalog_hash, row_id, row_hash },        # which card (enforced anchor)
  image_hash,                                                # content-addressed photo (enforced)
  contributor_id,                                            # pseudonymous handle, signed (enforced)
  capture:        { fresh_nonce?, device_attest?, timestamp, location_disclosure }, # legible
  claim:          { kind: reference|owned-now|seen, not_claiming: [possession, authenticity, condition] },
  provenance_tier: raw | anchored | curated,                 # earns up via anchors (CE1)
  anchor_ref?:    { type: grader_cert|settled_trade|bonded_verifier_attestation, attestor },  # CE1/CE3
  reference_weight,                                          # 0 unless anchored (CE1)
  display_license: granted,                                  # copyright-clean (CE7)
  anomaly_score,                                             # legible vs the anchored distribution
}
```
Plus per-row corpus stats (N specimens, tier breakdown, outliers) and the contributor reputation vector.

## 9. Maturity / open (be honest)

- **Design only — nothing built.** On-chain anchor binds + the catalog data pipeline are **Codex's lane**
  (shared seam with `data/japanese-pre-english/` + `no_rarity_catalog_tools`); the `cairn-inventory`
  surface is mine.
- **The anomaly/distribution model is unspecced** (named, not built) — it powers CE3's outlier flag and §6.
- **Public-vs-verifier-only corpus** (§4.E) is an unresolved product decision.
- **Numbers unspecced:** the per-contributor/cluster influence caps, the tier floors per gate, any credit size.
- **The corpus does not authenticate** — it amplifies legibility; the state-of-the-art-fake residual stays
  priced/insured (Verifier §8 / Insurance).

## 10. Falsification

`simulations/catalog_evidence_drill.py` — deterministic, model-free; gates **CE1–CE8**, each compound
guard mutated **per-subguard** (the Insurance/G5 standard). **Result: 8/8 gates · 16/16 subguards
with independent teeth.**

## 11. Changelog
- **v0.1:** the catalog reframed from a fixed reference to a **provenance-tiered community-specimen
  distribution** — submission free + zero-weight, reference authority earned through the verifier's
  anchors. The poisoning attack surface (§4) with the provenance ladder (§3) as its answer; gates
  **CE1–CE8** preserving **G6** and reusing **Verifier §6 / A1 / A6**; the agent anomaly upgrade (§6);
  the `CommunitySpecimen` schema (§8). **Gates intact:** nothing here lowers a wall. Built for
  adversarial review; freeze = the v0.2 diff target.
