# Protocol Boundaries

Use this reference when an agent must explain what the Marketplace Protocol can
and cannot enforce.

## The Clean Boundary

The protocol enforces contact legibility and gate alignment. It does not enforce
physical truth.

```text
appearance != authority
reputation != possession
catalog match != identity
waiver != verification
spendability != truth
assembly witness != authenticity
```

## Route Lock Wall

Current route lock requires:

- item fingerprint exists
- inventory lock exists and is bound to the item fingerprint
- no active fingerprint challenge
- route spendability hash is nonzero and single-use
- wall-bundle hash is present
- assembly-history hash is present
- route assembly witness matches the contract's typed digest

The route assembly witness binds:

- escrow contract
- chain ID
- trade ID
- route hash
- route spendability hash
- wall-bundle hash
- assembly-history hash
- committed item fingerprint hash
- committed inventory lock hash
- route gate

This proves the route gate received the right commitment shape. It does not
prove shipping success, authenticity, condition, or fairness.

## Evidence Labels

Use these labels in human summaries:

- `enforced`: the protocol or validator checked this mechanically.
- `legible`: the evidence is signed, hashed, cited, or recorded.
- `judgment_needed`: meaning still depends on agent, verifier, arbiter, or human interpretation.
- `missing`: required for the next gate but absent.
- `waived`: the human or policy accepted a named risk without converting it into truth.

## No-Overclaim Examples

Bad:

```text
The seller is verified.
```

Better:

```text
The seller controls the shop domain and has prior marketplace receipts. That is
legible reputation, not proof this specific card is in hand.
```

Bad:

```text
The route is safe.
```

Better:

```text
The route can lock: spendability, wall bundle, assembly history, item
fingerprint, and inventory lock line up. Delivery risk still remains physical.
```

