# Cairn Proposal Authority Boundary v0.1

An `ActionProposal` records what an agent recommends preparing. It does not
authorize, execute, dispatch, pay, settle, release, or waive anything.

The portable proposal shape must preserve these explicit negative claims:

```yaml
schema: cairn.action_proposal.v0.1
not_claiming:
  - authority_to_act
  - external_effect
```

An implementation must not infer authority from confidence, urgency,
principal preferences, a DataGrant, or the existence of this proposal.
