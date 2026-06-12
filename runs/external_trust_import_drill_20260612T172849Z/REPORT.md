# External Trust Import Drill: external_trust_import_drill_20260612T172849Z

- Passed: `True`
- Pass definition: external reputation is useful only as bounded legibility, not bindable trust.

## Overclaim Attempts

### account_control_equals_history_ownership

- Claim: The seller controls the eBay account now, so they own the whole history.
- Blocked by: `control proof means current control only`
- Passed: `True`

### seller_channels_are_independent

- Claim: The eBay profile, shop site, and Discord are three independent sources.
- Blocked by: `correlated_but_not_independent`
- Passed: `True`

### low_value_feedback_supports_high_value_trade

- Claim: Thousands of low-value feedback events support a high-value raw-card bond waiver.
- Blocked by: `value-tier scope fit`
- Passed: `True`

### relief_exceeds_acquisition_cost

- Claim: A $500 bought-account risk can justify $1,200 of bond relief.
- Blocked by: `imported_trust_bond_relief <= acquisition_cost`
- Passed: `True`

### snapshot_is_durable_source

- Claim: A scraped profile snapshot will always be available and platform-approved.
- Blocked by: `source terms and platform availability fragility`
- Passed: `True`

## Import Cases

### tier_matched_strong_import

- A seller imports a mature, tier-matched marketplace profile for a mid-value card.
- Trade value: `$400`
- Base bond: `$180`
- Requested imported relief: `$120`
- Acquisition-cost estimate: `$1200`
- Cost-to-fake band/floor: `moderate` / `$350`
- Scope relief cap: `$140`
- Final relief cap: `$120`
- Applied relief: `$120`
- Remaining bond: `$60`
- Exit-scam EV after import: `$-1210`
- Flags: `continuity_seam, source_fragility`
- Judged projection: `continue_with_bounded_import`
- Passed: `True`

### bought_aged_account

- An aged account is controlled now, but the continuity seam is invisible.
- Trade value: `$640`
- Base bond: `$288`
- Requested imported relief: `$600`
- Acquisition-cost estimate: `$500`
- Cost-to-fake band/floor: `cheap` / `$50`
- Scope relief cap: `$224`
- Final relief cap: `$224`
- Applied relief: `$224`
- Remaining bond: `$64`
- Exit-scam EV after import: `$26`
- Flags: `continuity_seam, positive_exit_scam_ev, source_fragility`
- Judged projection: `needs_extra_bond_or_value_cap`
- Passed: `True`

### tier_mismatched_feedback

- Huge low-value feedback does not support a high-value raw-card bond waiver.
- Trade value: `$1500`
- Base bond: `$675`
- Requested imported relief: `$500`
- Acquisition-cost estimate: `$2500`
- Cost-to-fake band/floor: `high` / `$1200`
- Scope relief cap: `$0`
- Final relief cap: `$0`
- Applied relief: `$0`
- Remaining bond: `$675`
- Exit-scam EV after import: `$-2875`
- Flags: `continuity_seam, source_fragility, tier_mismatch`
- Judged projection: `continue_without_imported_bond_relief`
- Passed: `True`

### seller_controlled_independence

- Several surfaces exist, but they share one controlling party.
- Trade value: `$350`
- Base bond: `$158`
- Requested imported relief: `$80`
- Acquisition-cost estimate: `$900`
- Cost-to-fake band/floor: `moderate` / `$350`
- Scope relief cap: `$123`
- Final relief cap: `$80`
- Applied relief: `$80`
- Remaining bond: `$78`
- Exit-scam EV after import: `$-978`
- Flags: `continuity_seam, correlated_sources, source_fragility`
- Judged projection: `continue_with_bounded_import`
- Passed: `True`

### exit_scam_ev_check

- A shiny import still leaves a positive exit-scam path unless extra bond or value caps apply.
- Trade value: `$1800`
- Base bond: `$810`
- Requested imported relief: `$600`
- Acquisition-cost estimate: `$600`
- Cost-to-fake band/floor: `cheap` / `$50`
- Scope relief cap: `$630`
- Final relief cap: `$600`
- Applied relief: `$600`
- Remaining bond: `$210`
- Exit-scam EV after import: `$940`
- Flags: `continuity_seam, positive_exit_scam_ev, source_fragility`
- Judged projection: `needs_extra_bond_or_value_cap`
- Passed: `True`

### expensive_to_fake_high_value_deterred

- A high-value trade with an expensive-to-fake evidence floor no longer fires the exit-scam flag by default.
- Trade value: `$1800`
- Base bond: `$810`
- Requested imported relief: `$600`
- Acquisition-cost estimate: `$600`
- Cost-to-fake band/floor: `high` / `$1200`
- Scope relief cap: `$630`
- Final relief cap: `$600`
- Applied relief: `$600`
- Remaining bond: `$210`
- Exit-scam EV after import: `$-210`
- Flags: `continuity_seam, source_fragility`
- Judged projection: `continue_with_bounded_import`
- Passed: `True`

## What This Proves

- Current control proof stays narrow: it does not become ownership of account history.
- External reputation can reduce friction or bond only inside acquisition-cost and value-tier caps.
- Seller-controlled surfaces are explicitly marked as correlated rather than independent.
- Positive exit-scam EV is not silently accepted; it becomes a need for more bond or a lower value cap.
- Source fragility is preserved for platform snapshots and terms-sensitive observations.
