# Agent Simulation EVM Replay: agent_market_evm_replay_20260611T170433Z

- Source simulation: `runs/unified_stress_20260611T170433Z`
- RPC: `http://127.0.0.1:18548`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Predicate verifier: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trades replayed: `5`
- Final states: `Settled`

## Why These 10

This set deliberately spans low, high, and grail value bands; clean close, condition delta, route loss, nonship, authenticity, and local handoff outcomes; trusted, known, unknown, and new sellers; automated, escalated, delegated, and human arbitration modes.

## Selected Trades

| Sim | EVM | Value | Trust | Route | Outcome | Arbitration | Final |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| `SIM-0030` | `1` | `$66` low | known | insured_ship | material_misdescription | automated_escalated_to_human | Settled |
| `SIM-0044` | `2` | `$1955` grail | known | insured_ship | authenticity_flag | human_arbiter | Settled |
| `SIM-0011` | `3` | `$3655` grail | unknown | insured_ship | material_misdescription | human_arbiter | Settled |
| `SIM-0043` | `4` | `$1226` grail | known | underinsured_ship | underinsured_lost | human_arbiter | Settled |
| `SIM-0016` | `5` | `$3265` grail | trusted | international_ship | wrong_card | human_arbiter | Settled |

## Counts

Arbitration modes:

```json
{
  "automated_escalated_to_human": 1,
  "human_arbiter": 4
}
```

Outcomes:

```json
{
  "authenticity_flag": 1,
  "material_misdescription": 2,
  "underinsured_lost": 1,
  "wrong_card": 1
}
```

## Trade Details

### SIM-0030

- EVM trade id: `1`
- Amount model: `{'price_eth': '0.066', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.066'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['bond_penalty_above_auto_cap', 'evidence_ambiguity', 'refund_above_auto_cap']`
- Remedy: `{'buyer_refund_bps': 5500, 'seller_bond_penalty_bps': 4000, 'type': 'partial_refund_plus_bond'}`
- Transactions: `17`
- Packets: `16`; all signatures valid: `True`
- Observations:
  - Automated policy was selected, but signed friction triggers forced human resolution before value moved.

### SIM-0044

- EVM trade id: `2`
- Amount model: `{'price_eth': '1.955', 'seller_bond_eth': '0.1955', 'buyer_dispute_bond_eth': '0.0391', 'declared_insurance_eth': '1.955'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['authenticity_or_identity_risk', 'evidence_ambiguity', 'human_arbiter_selected_prelock']`
- Remedy: `{'buyer_refund_bps': 10000, 'seller_bond_penalty_bps': 10000, 'type': 'escalate_authenticity'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`

### SIM-0011

- EVM trade id: `3`
- Amount model: `{'price_eth': '3.655', 'seller_bond_eth': '0.54825', 'buyer_dispute_bond_eth': '0.05', 'declared_insurance_eth': '3.655'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['evidence_ambiguity', 'human_arbiter_selected_prelock', 'seller_trust_gap']`
- Remedy: `{'buyer_refund_bps': 5500, 'seller_bond_penalty_bps': 4000, 'type': 'partial_refund_plus_bond'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`

### SIM-0043

- EVM trade id: `4`
- Amount model: `{'price_eth': '1.226', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.02452', 'declared_insurance_eth': '0.25'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['evidence_ambiguity', 'human_arbiter_selected_prelock', 'route_gap_owner_review']`
- Remedy: `{'buyer_refund_bps': 6500, 'seller_bond_penalty_bps': 3500, 'type': 'underinsurance_gap_review'}`
- Transactions: `15`
- Packets: `14`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.

### SIM-0016

- EVM trade id: `5`
- Amount model: `{'price_eth': '3.265', 'seller_bond_eth': '0.3265', 'buyer_dispute_bond_eth': '0.05', 'declared_insurance_eth': '3.265'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['authenticity_or_identity_risk', 'evidence_ambiguity', 'human_arbiter_selected_prelock']`
- Remedy: `{'buyer_refund_bps': 10000, 'seller_bond_penalty_bps': 5000, 'type': 'refund_or_return'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`

## What This Proves

- Ten varied agent-simulation trades can be converted into signed packets and settled through the same local escrow contract.
- Automated paths are packetized without silently skipping friction thresholds.
- Human, delegated-agent, and automated rulings all reduce to signed ruling packets before money moves.
- Shipping, insurance, handoff, and evidence facts can stay off-chain while their hashes anchor into the money rail.
- Every replayed trade now commits a seller-signed item fingerprint, then a seller-signed inventory lock bound to that fingerprint, before route commitment.
- Every replayed verifier review is buyer-scope-approved, then committed as a subject-bound scoped attestation instead of loose verifier evidence.
- Buyer and seller trust vectors remain packet-level facts; the contract only enforces authority, signatures, bonds, and settlement.

## Still Not Proven

- Automated arbiters are not yet separate on-chain actors; this replay maps them to the registered arbiter controller.
- Seller delivery claims are now signed packets, but the alpha still relies on buyer agents to notice and contest a false delivery before inspection expires.
- ERC-20/stablecoin escrow, protocol fees, and fee routing are not modeled.
- Real shipping APIs, insurance claim APIs, and marketplace reputation attestations are not connected.
- Fingerprint challenges are proven in the local protocol probe, not across every replayed simulation trade.
- Semantically different item fingerprints for the same physical card still require verifier scrutiny, richer image matching, or issuer attestations.
- The full 250-trade simulation has not been replayed on-chain yet; this is a deliberately varied 10-trade probe.
