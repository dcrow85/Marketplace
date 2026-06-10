# Legibility Calibration Drill: legibility_calibration_drill_20260610T165813Z

- Passed: `True`
- Pass definition: vectors stay unaggregated, policy projection remains judged, calibrated cohorts stay within tolerance, miscalibrated cohorts are detected, and score laundering is blocked.

## Rule Under Test

The protocol may measure legibility, but it must never aggregate legibility into a verdict. A vector can inform a buyer-agent policy; the policy owns the judgment. Vector signatures are cohort keys for calibration, not mini-scores.

## Score-Laundering Attempt

- Attempt: `composite trust meter`
- Expected: `blocked_score_laundering`
- Blocked: `True`
- Errors:
  - unknown top-level field(s): confidence, safety_index, trust_score, verdict
  - forbidden aggregate field(s): trust_score, verdict
  - coverage unknown field(s): overall

## Cohorts

### shop_strong_vector

- Vector signature: `complete|high|high|high|high|strong`
- Signature note: cohort key for calibration, not a score or verdict
- Sample size: `30`
- Projected claim rate: `700 bps`
- Observed claim rate: `667 bps`
- Spread: `33 bps`
- Tolerance: `913 bps` (95pct_binomial_normal_approximation_with_minimum_floor)
- Within tolerance: `True`
- Expected within tolerance: `True`
- Calibration expectation met: `True`
- Projection separate judgment: `True`

### thin_seller_sparse_vector

- Vector signature: `partial|low|medium|medium|moderate|thin`
- Signature note: cohort key for calibration, not a score or verdict
- Sample size: `20`
- Projected claim rate: `2200 bps`
- Observed claim rate: `2000 bps`
- Spread: `200 bps`
- Tolerance: `1816 bps` (95pct_binomial_normal_approximation_with_minimum_floor)
- Within tolerance: `True`
- Expected within tolerance: `True`
- Calibration expectation met: `True`
- Projection separate judgment: `True`

### slab_cert_weak_binding_vector

- Vector signature: `high|medium|medium|medium|moderate|medium`
- Signature note: cohort key for calibration, not a score or verdict
- Sample size: `25`
- Projected claim rate: `1200 bps`
- Observed claim rate: `1200 bps`
- Spread: `0 bps`
- Tolerance: `1274 bps` (95pct_binomial_normal_approximation_with_minimum_floor)
- Within tolerance: `True`
- Expected within tolerance: `True`
- Calibration expectation met: `True`
- Projection separate judgment: `True`

### quick_starter_sensitive_vector

- Vector signature: `high|medium|high|medium|moderate|medium`
- Signature note: cohort key for calibration, not a score or verdict
- Sample size: `20`
- Projected claim rate: `1800 bps`
- Observed claim rate: `2000 bps`
- Spread: `200 bps`
- Tolerance: `1684 bps` (95pct_binomial_normal_approximation_with_minimum_floor)
- Within tolerance: `True`
- Expected within tolerance: `True`
- Calibration expectation met: `True`
- Projection separate judgment: `True`

### deliberately_miscalibrated_vector

- Vector signature: `high|medium|medium|medium|moderate|overconfident`
- Signature note: cohort key for calibration, not a score or verdict
- Sample size: `50`
- Projected claim rate: `500 bps`
- Observed claim rate: `4000 bps`
- Spread: `3500 bps`
- Tolerance: `604 bps` (95pct_binomial_normal_approximation_with_minimum_floor)
- Within tolerance: `False`
- Expected within tolerance: `False`
- Calibration expectation met: `True`
- Projection separate judgment: `True`

## What This Proves

- The vector measures evidence structure without claiming truth.
- The buyer policy projection is separate and labeled `judged`.
- Calibration is measured against settled outcomes, not asserted by a trust meter.
- A deliberately miscalibrated cohort is detected as overconfident.
- A composite score/verdict is blocked as certainty laundering.
