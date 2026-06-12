# Protocol Audit Execution Domain 5 v0.1

Generated 2026-06-12.

Execution slice against `Protocol_Audit_v0.1.md`, Domain 5 (Economic Deterrence
Is Real, Not Ceremonial). Run by the reviewer chair directly — economic
analysis, no contract attack and no blind round. The domain's required artifact
is an explicit attacker-EV table per value tier; the spec states that a blank or
hand-waved EV table is itself a finding.

## Parameters (from source)

```text
- Seller bond: configurable bps of trade value; simulator uses 1000 / 1500 /
  2500 bps (10% / 15% / 25%) by tier (simulations/protocol_agent_market_sim.py).
- Escrow: buyer funds are held; the seller is paid only on buyer-accept or
  inspection timeout. A pure take-the-money exit fails at the delivery gate.
- Import bond relief cap: cap = min(requested, acquisition_cost,
  value_tier_scope_cap, base_bond - floor) (external_trust_import_drill.py:314).
- Exit-scam EV (as currently modeled, external_trust_import_drill.py:317):
      exit_scam_ev = trade_value - remaining_bond - acquisition_cost
```

## The real exit-scam structure

Because escrow only releases on buyer-accept or timeout, the rational scam is:
post bond, ship a counterfeit good enough to pass the evidence profile and
inspection, and collect the escrow. The seller forfeits the bond only if the
buyer files a claim AND an arbiter rules against them AND slashes. So:

```text
scam is profitable  iff  value - cost_to_fake - (bond × P(claim ∧ slash)) > 0
scam is deterred    iff  cost_to_fake ≥ value - bond × P(claim ∧ slash)
```

The dominant deterrent term is `cost_to_fake` — the cost of a counterfeit that
defeats the evidence floor (scans, corners, holo angle, cert lookup, fresh
nonce, verifier review). The bond is a secondary term and can never cover full
value. This is the project's own thesis: fraud is re-priced into the physical
world, not eliminated.

## Attacker-EV table per value tier (the required artifact)

Bond at 15%. `cost_to_fake` band reflects the evidence floor the acceptance
profile imposes at that tier (light floor at low value to keep friction down;
heavy floor — cert + nonce + verifier — at high value).

| Tier (raw card) | bond (15%) | evidence floor | plausible cost_to_fake | scam EV (value − cost_to_fake − bond·P_slash) | deterred? |
|---|---:|---|---:|---|---|
| $50 | $7.50 | light (NR-A) | $20–80 (borrowed-card photo / cheap proxy) | ≈ +$0 to +$30 | **marginal — small absolute loss but EV can be positive** |
| $200 | $30 | mid (NR-B) | $80–250 | ≈ −$50 to +$120 | tier-dependent |
| $640 (Espeon) | $96 | mid-high (NR-C) | $300–800 (staged fresh photos, decent fake) | ≈ −$160 to +$340 | **gap if a cheap fake passes** |
| $1,500 | $225 | high (NR-D, cert) | $1,000–3,000 (fake that survives cert lookup) | ≈ −$1,500 to +$500 | mostly deterred |
| $6,400 (Charizard) | $960 | very high (NR-D/E, cert + nonce + verifier) | $4,000–10,000+ | strongly negative | **deterred — the floor exceeds value** |

Reading: deterrence is carried by `cost_to_fake` scaling with value, enforced by
the acceptance-profile wall (`POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000`). At the
top tier the evidence floor pushes the cost of a passing fake toward or above the
card's value, so the scam is negative-EV. The danger band is **high value paired
with a light evidence floor** — which is exactly what the acceptance profile is
built to prevent. The deterrence design is sound *only because* the evidence
floor scales with value.

## Findings

### AUD-D5-001 — exit-scam EV model omits `cost_to_fake`

- Domain: 5.
- Severity: medium.
- Type: suspected_weakness (provable by formula citation).
- Claim under test: the protocol's economic-deterrence model represents the
  actual deterrent.
- Observed: the modeled EV (`value − bond − acquisition_cost`,
  `external_trust_import_drill.py:317`) omits `cost_to_fake`, the dominant
  deterrent term. Consequences:
  1. Structurally positive: since bond < value on every real trade, the model
     flags `positive_exit_scam_ev` on essentially all value-bearing trades, so
     the signal cannot discriminate a cheap-to-fake card (genuinely dangerous)
     from an expensive-to-fake one (safe).
  2. Misattributes deterrence to the bond (which cannot cover value) rather than
     to the evidence floor (the real lever).
  3. Surfaces the residual as "need more bond or a lower value cap" when the
     honest mitigation is usually "raise the evidence floor" (more cost_to_fake).
- Cross-subsystem note: the legibility layer already measures `cost_to_fake` as
  a vector dimension, but the EV model does not consume it — a missed link
  between two subsystems that should share that variable.
- Expected: the EV incorporates `cost_to_fake` (sourced from the legibility
  vector's `cost_to_fake` band), so the signal discriminates and the surfaced
  mitigation points at the evidence floor.
- Disposition: `deferred_with_owner_and_trigger`. Wire `cost_to_fake` into the
  exit-scam EV; trigger before the deterrence model is shown to the network or
  used to set per-tier bond/value-cap defaults.

## Axes checked that passed

```text
- Import bond-relief cap IS implemented: cap = min(requested, acquisition_cost,
  scope_cap, base_bond - floor). Under-priced reputation cannot buy down the
  bond below the cost of acquiring the imported reputation. No finding.
- Positive exit-scam EV is surfaced, not silently accepted: it becomes a need
  for more bond, a lower value cap, or verifier review (the EV is conservative
  in the safe direction — it over-flags, never under-flags positive EV).
- Reduced bond is never described as seller honesty (BondHistoryExchange wall
  rule holds in the docs).
```

## Coverage honesty

This slice produced the required per-tier EV table and one substantive model
finding. It did NOT execute a runnable economically-rational adversarial-seller
simulation across tiers (that would turn AUD-D5-001 from suspected_weakness into
a demonstrated discrimination failure, and is the natural next step). Bond
exclusion legibility-before-funding was checked at the doc/wall level only, not
against a runnable acceptance-flow case. Per the hard-mode rule, this is not a
`weak_audit_suspected` round — it produced a material finding and the artifact
the domain requires.
