# Protocol Trust Import v0.1

Generated 2026-06-10.

This document defines how outside seller reputation enters the protocol without
becoming protocol-native trust.

Core rule:

```text
External reputation is observable, not bindable.
```

An eBay profile, TCGplayer shop, Discord account, Google business listing, card
shop domain, forum history, or social proof can be observed and correlated. It
cannot be signed over as truth. It can reduce friction only when its control,
scope, cost-to-fake, and limits remain visible.

## Seller First Hour

The first-hour import path should feel simple to a seller while staying narrow
for the protocol.

1. Register a seller key in the actor registry.
2. Receive a nonce for each outside surface.
3. Place the nonce on controlled surfaces, such as a shop domain, eBay about
   page, TCGplayer seller page if allowed, Discord/forum post, or public shop
   profile.
4. A deterministic tool records contact receipts: URL, timestamp, nonce,
   content hash, observer, and source fragility.
5. The tool records observation receipts: feedback count, feedback percentage,
   account age, review profile, visible sale tiers, domain age, public address
   match, or shop profile match.
6. The import emits a legibility vector, not a trust score.
7. Buyer agents project bond, friction, attention, and value-cap policy from
   that vector under a named buyer aperture.
8. Native protocol receipts gradually replace the imported bridge.

What the control proof means:

```text
seller controls this surface now
```

What it does not mean:

```text
seller owned the account history
seller performed every past sale
seller owns the physical card
seller is honest
seller can safely receive a high-value bond waiver
```

## Packet Shape

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

Required `not_claiming`:

- ownership_of_account_history,
- authenticity,
- possession,
- condition_truth,
- future_platform_availability,
- platform_endorsement,
- independence_when_sources_share_control,
- high_value_scope_if_history_is_low_tier.

## Control Proof

```text
schema: marketplace.external_control_proof.v0.1
proof_id
seller_ref
source_type
source_url_or_handle
nonce
nonce_location
content_hash
observed_at
observed_by
observer_tool_version
source_terms_fragility
not_claiming
signature_or_execution_receipt
```

The preferred clean path is seller-placed proof: the seller puts a protocol
nonce on a surface they already control. Automated scraping of marketplace pages
may be useful, but it is source-fragile and may conflict with platform terms.
That fragility must be named rather than hidden inside a neat-looking packet.

## Observation Receipt

```text
schema: marketplace.external_observation_receipt.v0.1
receipt_id
seller_ref
source_type
source_url_or_handle
observed_at
observed_fields
observed_value_tier_distribution
content_hash
observer_tool_version
visibility
source_terms_fragility
not_claiming
signature_or_execution_receipt
```

Observation receipts say "this surface showed this data at this time." They do
not certify platform truth, seller continuity, or future availability.

## Imported Trust Legibility Vector

Imported trust uses the same six dimensions as `Protocol_Legibility_v0.1.md`,
but their meanings are specialized.

### Coverage

Which outside surfaces exist and were observed.

Examples:

- eBay profile,
- TCGplayer seller profile,
- shop domain,
- Google business listing,
- Discord/forum account,
- in-person dealer reference.

Not claiming:

- any one surface is complete,
- the seller is the historical operator,
- the surface proves inventory.

### Independence

How many distinct channels and controlling parties are visible.

Hard rule:

```text
three seller-controlled surfaces are correlation, not independence.
```

The packet must distinguish:

- channel count,
- party count,
- platform-controlled signals,
- seller-controlled signals,
- `correlated_but_not_independent`.

### Continuity

Whether current control plausibly connects to historical reputation.

The dangerous seam:

```text
account history belongs to the account;
control proof belongs to now.
```

Bought accounts, sold shops, changed operators, delegated staff, and abandoned
social handles are all continuity gaps. The protocol may make the gap visible.
It cannot close it by observation alone.

### Scope Fit

Whether the imported history matches the proposed trade.

Examples:

- 5,000 successful $15 sales may support low-friction low-value trading.
- The same history transfers poorly to a $1,500 raw vintage card.
- A shop known for sealed modern product may not be a strong source for No
  Rarity condition judgment.

Visible sale-tier distribution is required when imported proof affects bond or
value caps.

### Cost To Fake

Imported trust has a rare advantage: some attack costs can be priced.

Examples:

- buying an aged account,
- farming feedback,
- acquiring an old domain,
- renting a booth,
- maintaining a shop listing,
- paying for review or social-history manipulation.

Hard cap:

```text
imported_trust_bond_relief <= estimated_acquisition_cost_of_import_bundle
```

If buying the outside reputation bundle costs roughly `$500`, imported trust
cannot justify more than `$500` of bond relief. Above that line, the import
becomes positive-expected-value material for an exit scammer.

This cap is necessary but not sufficient. Value-tier scope fit can lower the
cap further, and an economic deterrence profile can still require more bond.

### Source Calibration

The import instrument must earn its own track record.

Examples:

- sellers entering with `eBay >1000 feedback, >5y age, tier-matched` produced
  claims at N basis points,
- imported shop-domain plus Google-correlation sellers produced clean receipts
  at N percent,
- bought-account suspicion cohorts produced elevated nonship or wrong-item
  claims.

Calibration makes the import instrument better over time. It does not prove the
next card or seller.

## What Imported Trust Can Buy

In descending order of generosity:

1. Friction relief: fewer repeated introductions, faster engagement, lower
   proof burden for low-value asks.
2. Attention credibility: buyer requests may be treated as more serious.
3. Value-cap relief: access to a higher but still bounded trade tier.
4. Bond relief: capped by acquisition cost, value-tier scope, and economic
   deterrence.

Imported trust must never buy:

- authenticity authority,
- possession authority,
- condition verification,
- high-value bond waiver by itself,
- a composite seller score,
- exemption from item fingerprint, route, claim, or arbiter gates.

## Decay

Imports are a bridge, not a foundation.

Required decay policy:

```text
refresh_interval
expires_at
continuity_reproof_required
native_receipt_substitution_rate
maximum_import_share_after_native_receipts
revocation_or_platform_loss_path
```

As protocol-native receipts accumulate, imported trust should carry less weight.
A seller with many clean protocol settlements should not still be primarily
backed by an onboarding-era eBay snapshot.

## Agent Instruction

Say:

```text
The seller currently controls the shop domain and an eBay profile. That history
is useful, but it is external and tier-bound; for this trade it reduces friction
and some bond, not proof of the card.
```

Do not say:

```text
The seller is verified by eBay and Google.
```

## Drill

Runner:

```text
python3 simulations/external_trust_import_drill.py
```

Required adversarial cases:

- bought aged account,
- tier-mismatched feedback,
- seller-controlled "independent" sources,
- exit-scam expected-value check,
- platform terms/source fragility.

The drill passes when outside reputation remains useful but bounded, every
packet preserves `not_claiming`, and bond relief cannot exceed acquisition cost
or escape value-tier scope.
