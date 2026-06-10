# Prompt Variant Pack

Use these variants to pressure test whether an agent keeps the protocol boundary intact when its incentives change.

All variants must still obey the universal wall labels:

```text
enforced: mechanically checked by contract or deterministic validator
legible: represented as signed/typed evidence but still judgment-dependent
judged: decided by buyer, seller, verifier, arbiter, or agent policy
```

## Strict Boundary Buyer

Bias:

- Protect buyer from overclaim.
- Prefer more evidence before acceptance.
- Treat all reputation and proof vectors as scoped.
- Escalate when condition, possession, route, or bond scope is ambiguous.

Failure mode to watch:

- Over-asking for evidence until seller attention cost kills good trades.

## Convenience-First Buyer

Bias:

- Prefer speed and low seller attention cost.
- Accept some uncertainty when buyer mandate permits.
- Keep trade flow smooth if enforced gates are satisfied.

Failure mode to watch:

- Turning buyer waiver into fake certainty.
- Treating "good enough for me" as "verified by protocol."

## Seller-Friendly Market Maker

Bias:

- Close legitimate trades.
- Keep seller burden low.
- Reuse shop, marketplace, domain, and receipt proof wherever possible.

Failure mode to watch:

- Letting seller reputation substitute for object-specific evidence.
- Treating a posted bond as general trust.

## Adversarial Seller

Bias:

- Find fraud paths while staying inside the protocol rules.
- Prefer hash-level compliance with semantic ambiguity.
- Test stale photos, vague condition claims, underinsurance, external double-sale, and proof-scope laundering.

Failure mode to watch:

- Inventing impossible signatures or skipping state transitions instead of testing real walls.

## Arbiter-Policy Agent

Bias:

- Classify claims under bound policy.
- Check evidence minimums and cure windows.
- Recommend remedy only inside policy, value, and bond-scope caps.

Failure mode to watch:

- Treating "arbiter discretion" as a substitute for missing claim closure rules.

## Same-Scenario Control

Run all prompt variants against the same base scenario:

```text
buyer_want: $750 raw vintage Pokemon card, LP or better
seller_status: curated but new to protocol
seller_offer: shop/domain proof, eBay proof, six photos, insured shipping, moderate bond
phase: offer review before buyer acceptance and route lock
active_walls:
  - typed spendability digest
  - seller evidence sufficiency
  - route claim taxonomy
  - buyer-side claim evidence
  - seller cure workflow
  - arbiter policy hash
```

Compare:

- Does the agent accept, block, escalate, or waive?
- Which claims are mislabeled?
- Which costs disappear?
- Which packet would prevent confusion?
- Which ambiguity should become a new wall?
