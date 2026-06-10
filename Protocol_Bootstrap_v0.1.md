# Protocol Bootstrap v0.1

Generated 2026-06-10.

This document names the alpha bootstrap story:

```text
Start where money is already irreversible.
Recruit the side whose attention and risk are underpriced.
Use gap-free digital escrow and scoped bonds at N=1.
Let clean receipts gradually buy down capital requirements.
```

The alpha is still Pokemon single-card trading, with No Rarity as the sharpest
lab. The bootstrap wedge is seller-first because current platforms make
accountability mostly unilateral.

## Seller-First Claim

Centralized marketplaces protect buyer liquidity by treating sellers as
replaceable supply. Sellers face:

- ghost buyers and unfunded questions,
- unpaid documentation labor,
- chargebacks or payment reversals after apparent close,
- INAD-style claims decided on weak narratives,
- swap-on-return fraud,
- platform-hosted reputation they cannot carry elsewhere.

The protocol offer is bilateral accountability:

- buyers arrive funded,
- seller attention can be priced,
- item fingerprints pre-commit the claimed object before it moves,
- buyer claims become signed packets against pre-committed evidence,
- return-leg evidence can be demanded when value justifies it,
- settlement receipts become portable seller history.

The protocol does not make buyer fraud impossible. It makes the buyer's fraud
more expensive, more contradictory, and more attributable.

## Digital Money Is The Gap-Free Object

The card has binding, sensor, continuity, identity, judgment, time, and remedy
gaps. Escrowed digital currency does not have those physical gaps.

The contract can prove:

- funds exist,
- funds are locked,
- funds move only by rule,
- bonds are posted,
- payout math respects balances,
- settlement events occurred.

This is why escrow and bonds are the first real walls. They are built from the
only object in the transaction that lives fully on the digital side.

New inequalities:

```text
fiat payment != settlement
escrowed digital money != physical truth
stablecoin escrow != no third-party risk
bond != reputation
bonded seller != safe seller
```

## Settlement Rail Terms

Every real alpha trade should carry a settlement rail packet.

```text
schema: marketplace.settlement_rail_terms.v0.1
trade_id
rail_type: native_eth | erc20_stablecoin | offchain_fiat_reference
asset
chain_id
escrow_contract
escrow_funded
bond_asset
buyer_display_currency
seller_payout_currency
finality_model
chargeback_surface
issuer_or_admin_controls
freeze_or_blacklist_surface
custody_or_money_transmission_notes
conversion_provider
conversion_failure_path
not_claiming
human_summary
signature_or_execution_receipt
```

Required `not_claiming` examples:

- no third-party intervention risk,
- no issuer freeze risk,
- no regulatory/custody surface,
- no physical-card truth,
- no guarantee of off-ramp liquidity.

Agent instruction:

Say "escrow is funded and contract-settled." Do not say "no one can intervene"
when a stablecoin issuer, bridge, wallet provider, exchange, or legal process
can still matter.

## Bilateral Accountability Packet

The seller-facing promise should be explicit.

```text
schema: marketplace.bilateral_accountability.v0.1
trade_id
buyer_funding_ref
seller_bond_ref
item_fingerprint_ref
evidence_request_fee_terms_refs
claim_matrix_ref
return_leg_requirements
buyer_dispute_bond_ref
inspection_window
settlement_finality_terms_ref
seller_payout_conditions
buyer_claim_conditions
not_claiming
```

It should make visible:

- buyer seriousness,
- seller work compensation,
- seller exposure,
- buyer exposure,
- claim evidence duties,
- return fraud defenses,
- finality boundary.

## Bonds As Cold-Start Reputation

A bond is reputation a seller can post before they have any.

Early protocol:

```text
capital-heavy, data-light
```

Mature protocol:

```text
data-heavy, capital-lighter
```

The exchange rate between capital and history should not be guessed forever. It
should be calibrated from receipts, claims, rulings, and bond outcomes.

```text
schema: marketplace.bond_history_exchange.v0.1
seller_ref
trade_value
item_risk_profile
seller_history_profile
portable_reputation_refs
clean_receipt_count
claim_count
upheld_claim_count
bond_hit_count
recentness_window
required_bond_amount
required_bond_fraction_bps
covered_failures
excluded_failures
release_conditions
calibration_cohort_ref
not_claiming
```

Hard rule:

```text
lower bond from history is a calibrated policy decision, not proof the seller is honest.
```

## External Trust Imports

Outside seller reputation can help a new seller start, but it remains an import.
It is not native protocol history.

The first-hour path:

- seller registers a key,
- protocol issues nonces for outside surfaces,
- seller places nonces on surfaces they control,
- a tool records control proofs and observation receipts,
- an import vector measures coverage, independence, continuity, scope fit,
  cost-to-fake, and source calibration,
- a buyer agent projects friction, value-cap, or bond policy from the vector,
- clean protocol receipts gradually replace the imported bridge.

Packet:

```text
schema: marketplace.external_trust_import.v0.1
import_id
seller_ref
issued_at
expires_at
control_proofs
observation_receipts
observed_value_tiers
legibility_vector_ref
acquisition_cost_estimate
bond_relief_cap
decay_policy
tos_fragility
not_claiming
signature_or_execution_receipt
```

Hard rules:

```text
external reputation is observable, not bindable
current account control != ownership of account history
seller-controlled channels != independence
low-value feedback != high-value scope
imported_trust_bond_relief <= estimated_acquisition_cost_of_import_bundle
```

Imported trust may buy friction relief, attention credibility, value-cap relief,
or scoped bond relief. It must not buy authenticity authority, possession
authority, condition verification, or high-value bond waiver by itself.

Source fragility must remain visible. Seller-placed nonces are the cleanest
control proof. Automated marketplace snapshots can be useful, but they may be
terms-fragile and can disappear when the platform changes or removes access.

## Bond Underwriting

Third-party bond underwriting can help sellers who have inventory but not spare
capital. The underwriter becomes a legible actor with its own track record.

```text
schema: marketplace.bond_underwriting_commitment.v0.1
trade_id
seller_ref
underwriter_ref
bond_amount
fee
covered_failures
excluded_failures
recourse_terms
underwriter_track_record_ref
release_conditions
conflict_disclosure
signature
not_claiming
```

This reintroduces a trust intermediary, but not as hidden platform discretion.
It is a scoped, priced, accountable actor whose own predictions can be
calibrated against outcomes.

## Bootstrap Drill

Runner:

```text
simulations/seller_bootstrap_drill.py
simulations/external_trust_import_drill.py
```

Pass criteria:

- fiat payment is not treated as final settlement,
- stablecoin escrow preserves issuer/regulatory caveats,
- pre-funded buyer seriousness is enforced in the model,
- seller attention fee terms are explicit,
- bond requirements fall only through history, imported proof, or underwriting,
- every reduced bond preserves `not_claiming`,
- overclaims like "bonded seller is safe" are blocked.

The bootstrap story is product-facing, but it is also protocol-testable:

```text
escrow proves funds
bond prices promises
attention fee prices seller labor
receipt history gradually reduces capital lock
```
