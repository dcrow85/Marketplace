# Protocol Audit Execution Domains 3, 8, 10 v0.1

Generated 2026-06-12.

Final execution slice against `Protocol_Audit_v0.1.md`. Covers the three
remaining domains — 3 (Physical Gap Negative Space), 8 (Catalog Identity and
Confusion), 10 (The Drills Themselves). Run by the reviewer chair directly as
code sweeps. With this slice, all ten domains have an execution record.

## Domain 3 — Physical Gap Negative Space

Claim under test: the gap taxonomy names every place physical truth can cross,
and the protocol does not silently bridge any of them.

```text
PASS: the gap negative drill is honest. Its pass_definition is "protocol-
  compliant EVM flows settled while the hidden physical oracle preserved a
  fake/swap truth the protocol cannot enforce, and no packet overclaimed
  authenticity." Passed=True means compliant-fraud-completed, not fraud-blocked,
  and it includes an overclaim scan. It runs both oracle states (counterfeit
  not-detected -> settles; counterfeit discovered-at-inspection -> caught).
PASS: no code path bridges a gap. A grep for any source setting authenticity,
  possession, or condition truth (oracle / "= authentic" / condition_truth=)
  returned nothing. No undisclosed trusted party. Consistent with Domain 4.
```

### AUD-D3-001 — two documented gaps have no negative case

- Severity: medium. Type: coverage gap (citation).
- Observed: the taxonomy names seven gaps (G1 Binding, G2 Sensor, G3 Continuity,
  G4 Identity, G5 Judgment, G6 Egress Remedy, G7 Time). The negative drill
  exercises G1, G2, G3, G5, G6 — but **G4 (Identity: a key is not a person) and
  G7 (Time: evidence is a snapshot, the object is a process) have no runnable
  negative case.** Domain 3's fail condition includes "a physical crossing has
  no negative case," so two documented-open gaps are asserted but not falsified.
- Disposition: `deferred_with_owner_and_trigger`. Add G4 and G7 scenarios to the
  gap negative drill (e.g., a key-controls-but-is-not-the-named-seller case; an
  evidence-fresh-at-T-but-object-changed-by-T+n case) before the gap taxonomy is
  presented to the network as complete.

## Domain 8 — Catalog Identity and Confusion

Claim under test: the catalog identifies known prints correctly and refuses to
bind intent to the wrong row, including non-TCG confusion and missing-symbol
traps.

```text
PASS: off-set named wants return no_in_set_match (AUD-D7-007).
PASS: cross-set and the major non-TCG confusion sources (carddass, topsun, meiji,
  plus fossil/jungle/gym/rocket/neo/southern/vending) are caught affirmatively by
  CROSS_SET_QUALIFIER_TERMS -> no_in_set_match (built with AUD-D7-005). A "1996
  Carddass Pikachu" does not bind to the Base Pikachu row.
```

### AUD-D8-001 — the missing-symbol overlap matrix is doc-only, not wired

- Severity: medium. Type: doc-vs-enforcement gap (citation).
- Observed: the `prints_without_rarity_symbol` overlap matrix exists in
  `Japanese_Pre_English_Release_Map_v0.1.md` (and the symbol-status matrix), but
  it is **not wired into the catalog tool's gate evaluation.** A missing-symbol
  No Rarity claim is gated by five hand-flagged Quick Starter rows plus the
  AUD-D7-006 `unexamined_or_no_cataloged_trap` status — not by a systematic
  clearance against every `yes`/`mixed` family. This is the original pressure-
  test residual (a blank `variant_traps` should mean "checked against every
  symbol-less family and ruled out," and it cannot yet).
- Disposition: `deferred_with_owner_and_trigger`. Derive `variant_traps` from the
  overlap matrix so a missing-symbol claim cannot read as clean until every
  yes/mixed family is ruled out. Trigger before the catalog expands to the sets
  whose symbol status the matrix tracks.

Minor note (not a finding): `CROSS_SET_QUALIFIER_TERMS` catches the major non-TCG
lines but not amada / sealdass / pokemon-kids; those rely on absence (no catalog
match). Add them to the qualifier list when those confusion sources become live.

## Domain 10 — The Drills Themselves

Claim under test: every drill can fail on its own axis; a green suite means what
it claims.

```text
PASS: all eleven drills carry adversarial / expected-fail / mutation cases (5-39
  negative markers each); none are pass-only. The gap negative drill is correctly
  inverted (Passed = fraud-completed). Drills reproduce on re-run (re-run
  throughout this audit).
```

### Drill falsifiability table (the required artifact)

| drill | demonstrated failure mode |
|---|---|
| catalog_evolution_drill | poison cases block/held; mutation-tested (broken guard -> case fails) |
| legibility_calibration_drill | miscalibrated cohort flagged; field/nested/prose/band laundering blocked |
| external_trust_import_drill | bought-account / tier-mismatch / positive-exit-scam-EV cases |
| gap_negative_drill | inverted: compliant fraud settles; overclaim scan |
| spendability_gate_bypass_drill | bypass attempts revert |
| fingerprint_collision_drill | collision blocks route |
| wall_bundle_route_spendability_drill | missing/stale wall bundle blocked |
| MarketplaceEscrow.t.sol (forge) | 88 cases incl. wrong-state/role/witness/digest reverts |
| seller_bootstrap_drill | thinnest adversarial coverage (5 markers) |
| no_rarity_trader_tournament | adversarial personas, but expected labels are co-authored |

### AUD-D10-001 — two drills carry self-grading risk

- Severity: low (informational).
- Observed: the suite is broadly falsifiable, but two drills are weaker on the
  Domain 10 axis: the `no_rarity_trader_tournament` grades against co-authored
  expected labels (self-grading, mitigated but not eliminated by adversarial
  personas), and `seller_bootstrap_drill` has the thinnest adversarial coverage.
- Disposition: `deferred_with_owner_and_trigger`. Run an explicit mutation pass
  on these two (weaken a target, confirm a case fails) before either is cited as
  network-facing evidence.

## Audit completion

All ten domains now have an execution record. No `critical` finding was produced
in any domain. The high findings (AUD-D2-SW-001/002, AUD-D6-001/002) and the
medium/low residuals share one shape and resolve to one decision, recorded in
`Protocol_Audit_Findings_Ledger.md`:

```text
The contract is a thin, hard spine — identity, replay, typed witnesses, registry
status, payout bounds. Semantic richness — assembly-graph coherence, committed
judgment supply, scope adequacy, deterrence (cost_to_fake), missing-symbol
clearance, intent->spendability promotion — is enforced above the contract by
agents and validators, honestly labeled, and is the deferred pre-launch decision:
which of these to bind on-chain vs keep as documented caller obligations.
```

The audit's product is that this boundary is now visible, falsified where it
could be, and disclosed where it cannot — not hidden.
