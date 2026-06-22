# Cairn Protocol - GPTPRO Review Response v0.1

Generated: 2026-06-22

Reviewed artifact: `Cairn_Protocol_GPTPRO_Review_Draft_v0.1.md` at commit `4ecd3ae`.

Reviewer posture: packet-level adversarial review. The reviewer did not receive the full repository,
module specs, drill source, or run reports, so code/test claims were not independently verified. That
limitation does not weaken the main architectural findings: several packet claims were still too broad
relative to what the packet itself said was enforced.

## Executive disposition

GPTPRO's verdict is accepted.

The enforced/legible/judged spine survives as the right design principle. The alpha boundary does not.
The review correctly narrows the release posture:

```text
Open or publicly callable alpha: NO-GO.

Low-value curated alpha: conditionally viable only if contested post-handoff settlement is disabled or
manual dual-controlled, value and aggregate exposure caps are mechanically enforced, and delivery
witnesses cannot unilaterally cause either auto-release or buyer refund.

High-value use: NO-GO.
```

This is not a thesis-fatal contradiction. It is an alpha-admission failure: the architecture remains
coherent, but the current packet made the low-value/curated boundary sound more admitted than the
implemented controls justify.

## New controlling rule

Before any value-bearing pilot, Cairn needs an executable admission policy, not a narrative posture:

```text
No route may increase exposure unless the active policy snapshot admits that exact route class,
value tier, authority set, delivery mode, dispute branch, and aggregate loss budget.
```

If the snapshot, cap, registry root, authority ceiling, or required preimage is missing, the route fails
closed or becomes manual/no-settlement-authority.

## Finding dispositions

| ID | Disposition | Required promotion |
|---|---|---|
| C-01 alpha boundary prose | Critical; value-fatal for public/open alpha | New `AlphaAdmissionPolicy` gate: per-trade, principal/control-cluster, custodian, verifier, judgment authority, registry-version, and global-epoch caps at funding and every exposure-increasing transition |
| C-02 delivery witness oracle | Critical; value-fatal for auto-release/refund branches | Split `delivery_asserted` from `delivery_final`; bind witness class, issuer, conflict, scope, expiry, challenge window, and settlement ceiling |
| C-03 floor receipt double recovery | Critical; value-fatal for buyer-favoring post-handoff remedies | Disable automated buyer-favoring post-handoff settlement unless claim type, remedy type, return requirement, return custody hash, evidence root, amount ceiling, and final appeal state are bound |
| H-01 opaque spendability oracle | High; protocol-wide hard gate | Canonical typed spendability preimages with constituent claim checks, validator policy/code hash, issuer role/independence, authority ceiling, registry snapshot, expiry, and data availability |
| H-02 registry snapshots too late | High; hard gate | Freeze authority/control/disclosure/eligible-set/policy roots no later than seller acceptance/bond |
| H-03 appeal stay is not finality | High; already partly addressed in G5 v0.3, not chain-bound | Implement explicit appeal state machine with filing, bond, max stay, authority snapshot, evidence root, replacement/failure path, and terminal execution rule |
| H-04 evidence availability/symmetry | High; hard gate | Content-addressed availability receipts, canonical bundle manifests, retention, recipient/key commitments, notice timestamps, equal access before deadlines, selective disclosure for theft-sensitive data |
| H-05 signatures vs control clusters | High; high-value blocker | Registered control-cluster identifiers, pairwise-conflict refs, role history, exposure ceilings, tier-scaled quorum, and cluster-diverse capital |
| H-06 G2 capacity absent | High; hard gate | Capacity snapshot before route commitment; failed neutral capacity changes route label/authority or blocks route, never silent custodian substitution |
| H-07 buyer-designated verifier grief | High; route-authority hardening | Seller acceptance must include identity, scope, claim types, evidence floor, fee amount/payer, deadlines, remedy ceiling, replacement, bond, and appeal terms |
| H-08 reputation allocates authority indirectly | High; API/selection invariant | Scores may rank only already-admitted candidates and cannot create eligibility, raise caps, reduce bonds, or bypass randomization; underpowered cells force zero weight |
| H-09 insurance trust-signal leakage | High; UI/API invariant | Insurance/premium cannot feed authenticity, quality, route-safety, verifier, or seller rankings; no bond relief until reserve/payout execution is enforced |
| H-10 repeated low-value attacks | High; aggregate-risk gate | Principal/control-cluster/shop/verifier/floor/insurer/route/epoch exposure caps and named manual override authority with loss budget |
| M-01 inventory-lock wording | Medium; no-overclaim cleanup | Say "blocks reuse of same registered identifier," not physical-card uniqueness |
| M-02 revocation semantics | Medium; lifecycle gate | Validity epochs, issuance timestamp, expiry, nonce, compromise timestamp, emergency revocation and replacement path |
| M-03 incomplete value-transition inventory | Medium; documentation/test blocker | Matrix every function that locks, releases, transfers, refunds, slashes, or authorizes value |
| M-04 trusted-base manifest incomplete | Medium; manifest expansion | Add keys, chain/RPC/finality, wallet/HSM, identity/Sybil, serialization, evidence storage, carrier/custodian mapping, reserve custodian/auditor, front-end/schema integrity |
| M-05 release reproducibility | Medium; release gate | File hashes, commit, dirty status, toolchain, command, exit status, report hash, supersession and maturity manifest |
| M-06 collector-facing boundary leaks | Medium; surface cleanup | Rewrite identifier/control claims to avoid physical-truth and semantic-independence readings |

## Gates to add before value-bearing alpha

### A1 - AlphaAdmissionPolicy

Every exposure-increasing transition must check a policy snapshot:

```text
AlphaAdmissionPolicy = {
  policy_hash,
  version,
  effective_block,
  route_class,
  max_trade_value,
  max_principal_exposure,
  max_control_cluster_exposure,
  max_custodian_exposure,
  max_verifier_exposure,
  max_judgment_authority_exposure,
  max_registry_version_exposure,
  max_global_epoch_loss,
  allowed_delivery_modes,
  allowed_dispute_branches,
  manual_override: { authority, two_person_required, reason_log, loss_budget }
}
```

Unknown policy versions fail closed. A single per-trade cap is insufficient because repeated low-value
or Sybil trades can aggregate into the same loss.

### A2 - DeliveryTriggerPolicy

The packet review correctly identifies delivery as the sharpest current physical-state leak. The route
must distinguish:

```text
delivery_asserted = a typed witness packet was accepted
delivery_final    = the protocol may use delivery as final value-moving state
```

No single seller-associated witness may start irreversible buyer-unfavorable settlement. No missing
witness after possible physical handoff may automatically establish non-delivery.

### A3 - PostHandoffRemedyMatrix

Buyer-favoring post-handoff remedies need an explicit remedy matrix:

```text
claim_type
remedy_type
max_amount
return_required
return_custody_hash
evidence_root
appeal_final_state
non_return_remedy_allowed
```

Full refund while the buyer may still retain the card remains blocked unless return/custody or a
claim-specific bounded non-return remedy is mechanically present.

### A4 - TypedSpendabilityIssuer

Opaque spendability is now a first-class attack surface: **spendability-oracle capture**.

The issuer must not be able to mint value authority from a model output, reputation score, or arbitrary
summary. A spendability packet must bind:

```text
canonical preimage
constituent source claim hashes
validator code hash
validator policy hash
issuer role
issuer authority ceiling
issuer conflict/independence ref
registry snapshot
expiry
data availability receipt
not_claiming
```

The author of source claims cannot also be the final spendability issuer for the same gate unless the
route is downgraded and value-capped.

### A5 - SnapshotBeforeBond

Authority, control-distance, disclosure, eligible-set, policy, and claim-matrix roots must freeze no
later than seller acceptance/bond. Later governance changes cannot retroactively change a trade.

### A6 - EvidenceAvailabilityAndSymmetry

Evidence hashes alone are not enough. The protocol needs availability receipts, access logs, key
commitments, notice timestamps, and equal response windows. For theft-sensitive custody data, use
encrypted or delayed disclosure rather than public location leakage.

### A7 - G2CapacityAdmission

Adopt the review's conservative initial G2 test as the first measurable gate:

```text
for each geography x card form x value tier x service-window cell:
  >= 3 eligible registered control clusters after exclusions
  after removing largest cluster, >= 2 clusters remain with one replacement
  slots cover >= 1.5x conservative peak concurrent demand
  deterministic 30-day replay completes >= 99% within SLA under one-cluster failure
  zero conflicted fallbacks
  no silent same-subject custodian substitution
  no cluster > 33% assignments
  no buyer-verifier or seller-verifier pair > 10% rolling window
  assigned exposure <= atomically reserved bond/underwritten capacity
```

Failure result:

```text
route_status = capacity_failed
neutral_placement_claim = forbidden
settlement_authority = none or manual-capped
automatic_value_cap = 0 for the failed route class
```

## Immediate document corrections for the GPTPRO packet

The next packet revision should change the author verdict:

```text
Old: Low-value and curated cells can run with current enforced surfaces plus explicit value caps.

New: Low-value curated alpha is not admitted unless alpha caps are mechanically enforced, contested
post-handoff settlement is disabled or manual dual-controlled, and delivery witnesses cannot
unilaterally trigger auto-release or buyer refund.
```

It should also add:

- a value-transition matrix for every lock/release/refund/slash/fee/payout path;
- local maturity labels for access assembly and arbitration/floor;
- an explicit release manifest requirement;
- a collector-facing rewrite list using the review's safer terms:
  - "blocks reuse of the same registered identifier";
  - "delivery witness accepted";
  - "no registered address conflict found";
  - "controls release under the supported escrow workflow."

## Release recommendation

Accepted:

Before any publicly callable alpha, require four blocking repairs:

1. Mechanically enforce alpha admission and aggregate exposure caps.
2. Remove single-witness control over irreversible delivery consequences.
3. Disable buyer-favoring post-handoff automated remedies until return custody, claim scope, and final
   appeal are bound.
4. Make spendability issuance typed, independently verifiable, snapshot-bound, and preimage-available.

With those controls, a narrow curated low-value alpha may be defensible. Without them, low value only
limits the nominal size of each individual failure while leaving repeatable value-extraction paths
intact.

## Status

This response is a disposition artifact, not an implementation. It does not claim the chain now enforces
the new gates. The next engineering move is either:

1. implement A1/A2/A3/A4 as chain and validator gates, or
2. produce `Cairn_Protocol_GPTPRO_Review_Draft_v0.2.md` that folds these blockers into the packet and
   removes any low-value-alpha implication until the gates exist.
