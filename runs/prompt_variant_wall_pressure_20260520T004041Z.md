# Prompt Variant Wall Pressure Test

Generated 2026-05-20T00:40:41Z.

## Scenario

```text
buyer_want: $750 raw vintage Pokemon card, LP or better
seller_status: curated but new to protocol
seller_offer: shop/domain proof, eBay proof, six photos, insured shipping, moderate bond
phase: offer review before buyer acceptance and route lock
prompt_variants:
  - strict_boundary_buyer
  - convenience_first_buyer
  - seller_friendly_market_maker
  - adversarial_seller
  - arbiter_policy_agent
```

## Current Best Answer

The protocol walls held mechanically: no agent could honestly advance route/funds without the expected item fingerprint, inventory lock, posted bond, route spendability, and policy prerequisites.

The weak surface is semantic compliance. Differently prompted agents did not break the state machine; they found ways to make weak evidence feel stronger than it is.

The next wall should not be another broad principle. It should be a concrete `TCG_ACCEPTANCE_PROFILE` for $500-$2,000 raw cards, plus a `CLAIM_CLOSURE_EVIDENCE_MATRIX` for dispute paths.

## Observations

- The strict buyer blocked acceptance until evidence, route, bond, cure, and arbiter-policy commitments were clearer.
- The convenience buyer accepted, but only as a buyer-risk waiver, not as a protocol truth claim.
- The seller-friendly market maker wanted the trade to close, but still hit raw-card evidence minimums and bond-scope ambiguity.
- The adversarial seller found the real attack: valid hashes around stale photos, vague LP claims, reputation overreach, underinsurance, and external double-sale.
- The arbiter-policy agent found that dispute closure fails without claim-specific buyer evidence, seller evidence, cure packets, remedy caps, and bond scope.

## Inferences

- A count of photos is not a sufficiency rule. The evidence profile must name photo types, freshness, subject binding, and what each image is allowed to support.
- Seller proof reduces seller identity or reputation risk. It does not prove possession, authenticity, or condition of the specific card.
- Buyer convenience is compatible with the protocol only if the waiver is explicit: evidence accepted, evidence waived, remaining uncertainty, and claim consequences.
- Bond posting is enforceable, but bond adequacy is judged unless scope and coverage are typed.
- Route promises must type insurance amount, declared value, signature requirement, carrier, ship-by time, risk owner, and claim duties.

## Speculations

- Most real agent failure will happen in language, not cryptography. "Curated seller with eBay proof" will drift toward "verified seller" unless every summary has not-claiming language.
- New sellers can be made usable if the protocol gives them a clean cure path and scoped bond path instead of forcing them to already have trust.
- A seller-friendly marketplace can still be safe if it prices seller attention explicitly and shifts optional buyer protection into a signed buyer-risk waiver.

## Open Questions

- For raw TCG cards above $500, is fresh nonce possession proof mandatory, default-on but buyer-waivable, or purely buyer-configurable?
- What percentage or amount should the default seller bond cover for nonship, wrong item, condition downgrade, underinsurance, and failure to cure?
- Does the alpha allow external inventory channels after protocol lock, or require an external availability covenant with bond consequences?

## Wall Hits

```text
wall_id: W-TSD-001
agents: strict_boundary_buyer, convenience_first_buyer
attempted_action: proceed toward route lock
wall_label: enforced
result: blocked until item fingerprint, inventory lock, posted bond, route spendability, and policy prerequisites exist
protocol_delta_needed: none for sequence; add buyer-visible digest field summary
```

```text
wall_id: W-RAW-750-EVIDENCE
agents: strict_boundary_buyer, seller_friendly_market_maker, adversarial_seller
attempted_action: treat six photos as enough for LP-or-better raw card
wall_label: legible -> judged
result: escalated
missing_packet_or_judgment: fresh nonce, front/back, corners, edges, surface/holo/flaw anchors, subject-bound item fingerprint
protocol_delta_needed: TCG value-tier evidence profile
```

```text
wall_id: W-BUYER-RISK-WAIVER
agents: convenience_first_buyer
attempted_action: accept offer without extra evidence
wall_label: judged
result: accepted only with explicit waiver
missing_packet_or_judgment: buyer risk acceptance packet
protocol_delta_needed: BuyerRiskAcceptance packet before acceptance when recommended evidence is waived
```

```text
wall_id: W-BOND-SCOPE
agents: strict_boundary_buyer, seller_friendly_market_maker, arbiter_policy_agent
attempted_action: treat moderate bond as trust comfort
wall_label: legible -> judged
result: disputed
missing_packet_or_judgment: bond scope and coverage schedule
protocol_delta_needed: bond_scope field covering nonship, wrong item, condition mismatch, underinsurance, route negligence, cure failure, and frivolous claim penalties
```

```text
wall_id: W-PROOF-SCOPE
agents: adversarial_seller, convenience_first_buyer
attempted_action: let shop/domain/eBay proof imply possession, authenticity, or condition
wall_label: legible
result: escalated with not-claiming requirement
missing_packet_or_judgment: scoped proof vector statement
protocol_delta_needed: proof vectors must list positive claims and not-claiming fields
```

```text
wall_id: W-ROUTE-INSURANCE-RISK
agents: strict_boundary_buyer, adversarial_seller, arbiter_policy_agent
attempted_action: accept "insured shipping" without typed coverage and risk owner
wall_label: legible
result: disputed
missing_packet_or_judgment: insurance amount, declared value, carrier, signature, risk owner, claimant duty
protocol_delta_needed: route profile must assign insurance gap before route lock
```

```text
wall_id: W-CLAIM-CLOSURE
agents: arbiter_policy_agent
attempted_action: rule wrong item, condition downgrade, empty package, underinsured loss, late shipment, frivolous buyer claim, seller cure
wall_label: judged under policy
result: partial; late shipment easiest, condition/empty package hardest
missing_packet_or_judgment: claim-specific buyer evidence, seller evidence, cure packet, remedy cap, bond action, escalation trigger
protocol_delta_needed: Claim Closure Evidence Matrix
```

```text
wall_id: W-EXTERNAL-DOUBLE-SALE
agents: adversarial_seller
attempted_action: keep external sales channels open after protocol inventory lock
wall_label: judged
result: allowed until nonship unless covenant exists
missing_packet_or_judgment: external availability covenant
protocol_delta_needed: signed availability covenant with bond consequences for nonship/double-sale failure
```

## Prompt Variant Comparison

| Variant | Recommendation | Boundary Risk | Wall Needed |
| --- | --- | --- | --- |
| Strict boundary buyer | Request more evidence | Overburdens seller | Value-tier evidence profile |
| Convenience-first buyer | Accept with waiver | Converts waiver into certainty | BuyerRiskAcceptance packet |
| Seller-friendly market maker | Close if minimum profile met | Reputation substitutes for object proof | Proof scope + evidence profile |
| Adversarial seller | Attack semantics | Hash-compliant ambiguity | Acceptance profile + proof scope |
| Arbiter-policy agent | Need closure matrix | Arbiter improvisation | Claim Closure Evidence Matrix |

## Recommended Patch Targets

1. Add `TCG_ACCEPTANCE_PROFILE_RAW_500_2000`.
2. Add `BuyerRiskAcceptance` packet.
3. Add `ClaimClosureEvidenceMatrix`.
4. Add `BondScope` packet or required field set.
5. Add `ProofVectorScope` with positive claims and not-claiming fields.
6. Add `RouteInsuranceRiskOwner` fields.
7. Add optional `ExternalAvailabilityCovenant` for curated sellers.

## Reproducibility Note

This was a qualitative multi-agent prompt-variant pass, not an EVM replay. It should be followed by deterministic fixture tests once the new walls are specified.
