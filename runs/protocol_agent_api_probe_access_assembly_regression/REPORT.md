# Protocol Agent API Probe: 2026-05-22T16:22:27Z

## Result

- Pass: `True`
- Normal accept with waiver: `0`
- Trajectory overclaim accepted: `0`
- Route lock without spendability: `0`
- Generic claim escalation: `0`
- Missing packet commitment refs: `0`
- Fundable without wall bundle: `0`
- Route locked without route spendability packet: `0`
- Route locked without route wall bundle: `0`
- Outside alpha scope accepted: `0`

Decision counts:

- `accept_or_continue`: `10`
- `accept_with_waiver`: `1`
- `blocked`: `16`
- `claim_packet_complete`: `1`
- `continue_with_recorded_waiver`: `3`
- `escalate`: `3`
- `escalate_with_matrix_row`: `2`
- `escrow_fundable`: `1`
- `no_claim_opened`: `5`
- `request_more_evidence`: `1`
- `route_lock_blocked`: `1`
- `route_locked`: `1`
- `semantic_attack_contained`: `1`

## Interpretation

The API keeps trajectory capacity and assembly placement separate. Seller proof can enter as trust weight, but action gates require situated packets. Waived ambiguity remains visible in the action decision, route lock requires route spendability plus a route wall-bundle EVM hash, claim escalation names missing matrix evidence, outside-alpha trades block, and fundable/route-lockable states carry canonical packet commitments.
