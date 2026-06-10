# Protocol Legibility v0.1

Generated 2026-06-10.

This document defines the layer between `legible` and `judged`.

Legibility has degrees. Truth does not become measurable at the protocol layer,
but the structure of evidence can be measured. The trap is aggregation: a trust
meter or composite score will be treated by agents as spendable truth. The rule
is therefore:

```text
The protocol may measure legibility, but it must not aggregate legibility into a verdict.
```

## Core Rule

Output a vector, never a verdict.

```text
legibility vector != probability of truth
legibility scalar != spendability
calibration record != authenticity
source track record != possession
```

Aggregation belongs to an agent under a named buyer policy. Risk acceptance
belongs to the human or delegated mandate. Spendability still belongs to the
gate-specific assembly.

## What Is Measurable

Each dimension measures the structure of the evidence, not the truth of the
physical claim.

### Coverage

Which required evidence profile fields are present.

Examples:

- front full image,
- back full image,
- four corners,
- edge closeups,
- holo angle,
- fresh nonce,
- route receipt.

Not claiming:

- the images are honest,
- the card is authentic,
- condition is proven.

### Independence

How many distinct parties, sensors, and channels corroborate the claim shape.

Examples:

- seller photo only,
- seller photo plus cert API contact receipt,
- seller photo plus buyer-approved verifier attestation,
- shop-domain proof plus prior protocol receipts.
- eBay profile plus shop domain plus Google listing, with seller-controlled
  surfaces marked as correlated rather than independent.

Not claiming:

- independence proves truth,
- a third-party source saw the physical object,
- a marketplace reputation belongs to this card.
- channel count equals independent party count.

### Continuity

Whether the evidence sequence is fresh, nonce-bound, timestamped, and unbroken
enough for the current gate.

Examples:

- stale listing photo,
- fresh nonce photo,
- packing sequence,
- carrier acceptance,
- opening video,
- return fingerprint.

Not claiming:

- nothing changed between checkpoints,
- custody was perfect,
- the object cannot have been swapped.

### Scope Fit

Whether the evidence addresses the claim at this gate and preserves
`not_claiming` boundaries.

Examples:

- catalog row fits item reference but not possession,
- slab cert lookup fits public-record correlation but not slab authenticity,
- verifier note fits packet completeness but not raw-card grade,
- delivery witness fits delivery contact placement but not delivery truth.
- high-volume low-value feedback fits low-value seller reliability better than
  a high-value raw vintage card.

Not claiming:

- useful evidence is sufficient evidence,
- a gate can spend evidence from another gate,
- a tool pass is enforcement.
- outside reputation transfers across value tiers without judgment.

### Cost To Fake

A stated estimate of what defeating the evidence bundle would cost an attacker
in physical resources, coordination, risk, or time.

Examples:

- cheap: reuse a stale listing image,
- moderate: stage a fresh photo with a borrowed card,
- high: build a counterfeit strong enough to survive closeups and verifier review,
- very high: beat nonce, packaging, route, opening, return fingerprint, and expert review.
- imported trust: acquire or farm the outside reputation bundle being used for
  bond relief.

Not claiming:

- the cost estimate is objective truth,
- fraud is impossible,
- deterrence is adequate.

### Source Calibration

Track record of an evidence source or vector shape against later protocol
outcomes.

Examples:

- seller evidence bundles with this shape had claims in 7% of settled trades,
- this verifier's scoped condition notes preceded upheld condition claims in 4%
  of cases,
- this carrier route profile produced damaged-package claims in 2% of cases.
- sellers importing `eBay >1000 feedback, >5y age, tier-matched` produced
  claims in N basis points after native settlement.

Not claiming:

- future truth,
- universal reputation,
- proof this card is good.

## Packet Shape

```text
schema: marketplace.legibility_vector.v0.1
vector_id
trade_id_or_session_id
subject_ref
gate_context
emitted_by
tool_or_agent_version
input_refs
dimensions:
  coverage:
    present
    missing
    waived
    measured_by
    not_claiming
  independence:
    source_count
    party_count
    channel_count
    source_refs
    correlated_but_not_independent
    not_claiming
  continuity:
    checkpoints
    freshness_window
    breaks
    expired_refs
    not_claiming
  scope_fit:
    claim_supported
    gate_supported
    out_of_scope
    not_claiming
  cost_to_fake:
    estimate_band
    rationale
    unpriced_attack_paths
    not_claiming
  source_calibration:
    cohort_ref
    sample_size
    outcome_window
    observed_claim_rate_bps
    observed_clean_settlement_rate_bps
    caveats
    not_claiming
human_summary
no_aggregate_score: true
canonicalization
hash_algorithm
signature_or_execution_receipt
```

Forbidden fields inside the vector:

```text
score
trust_score
rating
grade
probability_of_truth
authenticity_probability
verdict
```

The schema is allowlisted, not merely blocklisted. Unknown top-level fields and
unknown dimension fields are rejected, because `confidence`, `safety_index`,
`overall`, or another synonym can launder certainty just as easily as `score`.

Bands and vector signatures are cohort keys for calibration. They are not
per-dimension mini-verdicts and must not be displayed as a composite rating.

## Imported Trust

External seller reputation is a legibility input, not a spendable trust object.

Imported trust vectors should preserve:

- coverage: which outside surfaces were observed,
- independence: channel count versus controlling-party count,
- continuity: current control versus historical ownership seam,
- scope fit: visible sale-tier history versus the proposed trade tier,
- cost-to-fake: estimated acquisition or farming cost of the import bundle,
- source calibration: later protocol outcomes from sellers with the same import
  shape.

Hard cap:

```text
imported_trust_bond_relief <= estimated_acquisition_cost_of_import_bundle
```

This cap does not prove adequacy. It only prevents a seller from buying a cheap
outside reputation bundle and receiving more bond relief than the bundle costs
to acquire.

If an agent wants a decision, it must emit a separate judged object:

```text
schema: marketplace.agent_policy_projection.v0.1
policy_id
legibility_vector_ref
buyer_aperture
projected_claim_rate_bps
risk_band
decision
not_claiming
human_or_mandate_acceptance_ref
```

That projection is `judged`, not `enforced`.

## Calibration Loop

The protocol cannot verify truth ex ante. It can measure calibration ex post
through its own receipts and claims.

The honest question is not:

```text
Was the trust score high?
```

The honest question is:

```text
Did evidence bundles with this vector shape produce outcomes close to the risk shown to the human?
```

Calibration inputs:

- legibility vector,
- buyer policy projection,
- value tier,
- seller posture,
- evidence source refs,
- receipt outcome,
- claim outcome,
- arbiter ruling if any,
- settlement path.

Calibration outputs:

```text
cohort_ref
vector_signature
sample_size
projected_claim_rate_bps
observed_claim_rate_bps
spread_bps
tolerance_bps
tolerance_model
within_tolerance
expected_within_tolerance
calibration_expectation_met
caveats
```

System health target:

```text
displayed uncertainty should match settled outcome distribution.
```

If a buyer accepted a named 10%-ish risk and similar trades produced claims
about 10% of the time, the instrument is calibrated. If similar trades produced
claims 40% of the time, the legibility layer was overconfident even if no single
packet lied.

Tolerance must account for sample size. Small cohorts should carry wider
uncertainty bands; large cohorts should be policed more tightly. The v0.1 drill
uses a simple 95% binomial normal approximation with a floor. Production can
replace this with a more conservative interval, but it must not return to a
flat tolerance that ignores sample size.

## Drill

Runner:

```text
simulations/legibility_calibration_drill.py
```

Pass criteria:

- no `legibility_vector` contains an aggregate score or verdict,
- all vector dimensions preserve `not_claiming`,
- agent policy projection is separate from the vector,
- cohort spread stays within configured tolerance,
- deliberately miscalibrated cohorts are detected,
- score-laundering attempts are blocked.

This is the measurement sibling to the wall and gap drills:

- walls prove what can close,
- gaps prove what must remain open,
- legibility calibration proves whether uncertainty is being shown honestly.
