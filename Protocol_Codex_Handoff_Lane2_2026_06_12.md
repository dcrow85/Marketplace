# Codex Handoff — Lane 2: Off-Chain Hardening

Generated 2026-06-12. For a Codex session; read standalone. This is the off-chain
half of the launch gate (the MEASURE / FALSIFY items) — not contract work. All
five items are Python tools, drills, and catalog data.

Read first: `Protocol_Architecture_Boundary_v0.1.md` (these are the "off-chain
fix" rows of the deferred cluster). Author != verifier: you implement; a reviewer
re-runs the key cases before any disposition flips. Do NOT touch `mockups/` or
`/Users/che/.claude/launch.json`.

Two of these (2B, 2C) both touch the catalog layer and 2C re-pins the catalog —
do 2C and 2B together and re-pin once. Items 2A, 2D, 2E are independent.

---

## 2A. AUD-D5-001 — wire `cost_to_fake` into the exit-scam EV

Problem: `simulations/external_trust_import_drill.py` computes
`exit_scam_ev = trade_value - remaining_bond - acquisition_cost` (~line 317),
which OMITS `cost_to_fake` — the protocol's primary deterrent. Because bond is
10–25% of value, the modeled EV is structurally positive on nearly every trade,
so `positive_exit_scam_ev` fires on everything and cannot discriminate a
cheap-to-fake card (dangerous) from an expensive-to-fake one (safe).

Do: incorporate `cost_to_fake` (from the legibility vector's `cost_to_fake` band)
into the EV so the signal discriminates:

```text
exit_scam_ev ≈ trade_value - cost_to_fake_floor - remaining_bond - acquisition_cost
```

```text
DESIGN CHOICE (flag): the band->dollar mapping. Recommended = conservative
dollar FLOORS per band (cheap / moderate / high / very_high), sourced from the
legibility vector's cost_to_fake band for the trade's evidence profile. Keep it
conservative (under-estimate cost_to_fake) so the EV still over-flags in the safe
direction — it just stops firing on EVERY trade.
```

Acceptance: add drill cases proving discrimination — a high-value but
expensive-to-fake trade now yields NEGATIVE EV (not flagged), and a cheap-to-fake
trade yields positive EV (flagged). The existing import-cap and surfacing cases
stay green. Ledger AUD-D5-001 -> fixed_in_code.

---

## 2B. AUD-D8-001 — derive `variant_traps` from the overlap matrix

Problem: the `prints_without_rarity_symbol` overlap matrix lives only in
`Japanese_Pre_English_Release_Map_v0.1.md` (the symbol-status matrix); it is NOT
wired into the catalog tool. A missing-symbol No Rarity claim is gated by five
hand-flagged Quick Starter rows + the `unexamined_or_no_cataloged_trap` status,
not by systematic clearance. A blank `variant_traps` must mean "checked against
every yes/mixed symbol-less family and ruled out," and it cannot yet.

Do:
```text
1. Extract the symbol-status / overlap matrix into a machine-readable data file
   (a JSON peer to the catalog), with each release family's
   prints_without_rarity_symbol = yes | no | mixed | unverified.
2. In agent_tools/no_rarity_catalog_tools.py, derive variant_trap_status from the
   matrix: for a row whose missing-symbol claim could collide with a yes/mixed
   family that is not ruled out, status = uncleared (not "clean"). Only when
   every overlapping yes/mixed family is ruled out is a blank trap list "cleared".
```

```text
DESIGN CHOICE (flag): the overlap rule — which families count as a collision
source for a given row (by section/era/product). Recommended = any pre-cutoff
family with prints_without_rarity_symbol in {yes, mixed} whose contents overlap
the row's card. Conservative: unverified families count as not-ruled-out.
```

Acceptance: a missing-symbol claim on a row with an unruled yes/mixed overlap now
surfaces `uncleared`, not clean. The catalog evolution drill + probe stay green.
Ledger AUD-D8-001 -> fixed_in_code.

---

## 2C. AUD-D7-002 — finish the fact/policy unbundling

Problem: row-level `agent_decision_profile` (baseline_evidence_profile_id,
escalation_triggers, recommended_evidence, conditional_overlays, etc.) still
lives INSIDE the hashed fact catalog `data/no-rarity-base-set.json`. The D7 fix
blocked policy CHANGES from hardening, but the policy data is still structurally
co-located in the fact hash.

Do: move `agent_decision_profile` (and any other policy-shaped row fields) OUT of
the fact catalog and INTO the policy artifact (`no-rarity-catalog-policy.json` or
a per-row policy file). The fact catalog hash then contains only FACTS; the tools
read both and merge for output.

```text
CONSEQUENCE (must handle): this re-pins the catalog — catalog_hash changes when
agent_decision_profile is removed. Regenerate via scripts/pin_no_rarity_catalog.py,
update data/no-rarity-catalog-manifest.json, and confirm catalog_citation now
cites the new hash. There are no real historical trades yet, so re-pinning is
safe; do it deliberately and report the old/new hashes.
```

Acceptance: `policy_field_paths` finds no policy fields inside the fact catalog
bytes; the catalog evolution drill (fact/policy separation case) and the probe
pass; the manifest reproduces the new pin. Ledger AUD-D7-002 -> fixed_in_code
(residual resolved).

---

## 2D. AUD-D3-001 — add the G4 and G7 gap negative cases

Problem: `chain/script/protocol_gap_negative_drill.py` exercises gaps G1, G2, G3,
G5, G6 — but G4 (Identity: a key is not a person) and G7 (Time: evidence is a
snapshot, the object is a process) have no runnable negative case. Two documented
gaps are asserted but not falsified.

Do: add two scenarios in the existing inverted style (a protocol-compliant flow
settles while the hidden oracle preserves the gap; no packet overclaims):
```text
- G4 (Identity): a compliant settlement where the signing key is not the
  named/real seller (key transferred or controlled by another), and the protocol
  attributes to the key, not the person — the identity gap is open.
- G7 (Time): a compliant settlement where evidence/nonce was valid at
  fingerprint-commit (a true snapshot) but the object changed between commit and
  delivery — the snapshot did not bind the process.
```

Acceptance: the gap drill now exercises all seven gaps; each new case reports the
gap path and an overclaim scan. Ledger AUD-D3-001 -> fixed_in_code.

---

## 2E. AUD-D10-001 — mutation-test the two weak drills

Problem: the suite is broadly falsifiable, but two drills are weak on the Domain
10 axis: `simulations/no_rarity_trader_tournament.py` grades against co-authored
expected labels (self-grading risk), and `simulations/seller_bootstrap_drill.py`
has the thinnest adversarial coverage.

Do:
```text
- For each, run an explicit mutation pass: weaken one real check/clause in a
  scratch edit, confirm at least one case FAILS, then revert. Record the mutation
  and the failing case (a guard that cannot fail guards nothing).
- For seller_bootstrap_drill, add adversarial cases so it has a real failure mode
  beyond the mutation (e.g., an under-priced bond relief, a bond-as-honesty
  overclaim that must be rejected).
```

Acceptance: a recorded mutation proof for both drills (the mutated target, the
failing case). Ledger AUD-D10-001 -> fixed_in_code.

---

## Cross-cutting acceptance

```text
- Each item: the relevant drill/probe passes AND the finding is genuinely closed
  (the EV discriminates; the trap status reflects matrix clearance; no policy in
  the fact hash; the gap drill covers 7/7; both weak drills have a mutation proof).
- 2B + 2C re-pin the catalog once between them — do them together; report old/new
  catalog_hash and confirm the manifest + citations are consistent (this is a
  Domain 9 drift risk — keep the docs that cite the hash current).
- Do not weaken a drill to make it pass. Do not touch Solidity (Lane 1 is done).
- On landing, flip the ledger rows (D5-001, D8-001, D7-002, D3-001, D10-001) to
  fixed_in_code with the guarding case/test names.
```

## Standing rules / hand-back

```text
- Independence: author cases against source, not copied from existing fixtures.
- Honesty: a blank trap list, a negative EV, a cleared gap, a passing mutation —
  each must mean the asserted thing, not a weakened assertion.
- Surface, don't decide: implement the recommended default for each flagged
  DESIGN CHOICE but mark it for human confirmation.
- Push focused commits (one per item is fine). Report per-item case/test names,
  the old/new catalog_hash for 2B/2C, the mutation proofs for 2E, and the ledger
  rows moved.
- The reviewer will independently re-run the EV discrimination case, the
  overlap-matrix clearance case, the re-pin, and the two mutation proofs before
  endorsing the disposition flips.
```
