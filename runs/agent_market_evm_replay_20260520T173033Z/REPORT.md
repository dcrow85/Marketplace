# Agent Simulation EVM Replay: agent_market_evm_replay_20260520T173033Z

- Source simulation: `runs/unified_stress_20260520T173032Z`
- RPC: `http://127.0.0.1:18548`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Predicate verifier: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trades replayed: `10`
- Final states: `Settled`

## Why These 10

This set deliberately spans low, high, and grail value bands; clean close, condition delta, route loss, nonship, authenticity, and local handoff outcomes; trusted, known, unknown, and new sellers; automated, escalated, delegated, and human arbitration modes.

## Selected Trades

| Sim | EVM | Value | Trust | Route | Outcome | Arbitration | Final |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| `SIM-0111` | `1` | `$98` low | trusted | insured_ship | insured_lost | automated | Settled |
| `SIM-0093` | `2` | `$27` low | trusted | insured_ship | insured_lost | automated_escalated_to_human | Settled |
| `SIM-0081` | `3` | `$85` low | known | insured_ship | minor_condition_delta | automated | Settled |
| `SIM-0124` | `4` | `$44` low | unknown | show_pickup | route_delay | automated | Settled |
| `SIM-0087` | `5` | `$70` low | known | uninsured_ship | uninsured_lost | automated_escalated_to_human | Settled |
| `SIM-0001` | `6` | `$42` low | trusted | insured_ship | wrong_card | automated_escalated_to_human | Settled |
| `SIM-0095` | `7` | `$550` grail | unknown | insured_ship | authenticity_flag | human_arbiter | Settled |
| `SIM-0164` | `8` | `$2781` grail | trusted | international_ship | seller_nonship | human_arbiter | Settled |
| `SIM-0015` | `9` | `$1080` grail | trusted | underinsured_ship | underinsured_lost | human_arbiter | Settled |
| `SIM-0247` | `10` | `$865` high | unknown | underinsured_ship | buyer_remorse | none | Settled |

## Counts

Arbitration modes:

```json
{
  "automated": 3,
  "automated_escalated_to_human": 3,
  "human_arbiter": 3,
  "none": 1
}
```

Outcomes:

```json
{
  "authenticity_flag": 1,
  "buyer_remorse": 1,
  "insured_lost": 2,
  "minor_condition_delta": 1,
  "route_delay": 1,
  "seller_nonship": 1,
  "underinsured_lost": 1,
  "uninsured_lost": 1,
  "wrong_card": 1
}
```

## Trade Details

### SIM-0111

- EVM trade id: `1`
- Amount model: `{'price_eth': '0.098', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.098'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `[]`
- Remedy: `{'buyer_refund_bps': 0, 'seller_bond_penalty_bps': 0, 'type': 'carrier_claim_hold'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.
  - Direct automated ruling is represented by a registered arbiter controller until the automated arbiter actor exists on-chain.

### SIM-0093

- EVM trade id: `2`
- Amount model: `{'price_eth': '0.027', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.027'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['evidence_ambiguity']`
- Remedy: `{'buyer_refund_bps': 0, 'seller_bond_penalty_bps': 0, 'type': 'carrier_claim_hold'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.
  - Automated policy was selected, but signed friction triggers forced human resolution before value moved.

### SIM-0081

- EVM trade id: `3`
- Amount model: `{'price_eth': '0.085', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.085'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `[]`
- Remedy: `{'buyer_refund_bps': 1200, 'seller_bond_penalty_bps': 0, 'type': 'partial_refund'}`
- Transactions: `17`
- Packets: `16`; all signatures valid: `True`
- Observations:
  - Direct automated ruling is represented by a registered arbiter controller until the automated arbiter actor exists on-chain.

### SIM-0124

- EVM trade id: `4`
- Amount model: `{'price_eth': '0.044', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `[]`
- Remedy: `{'buyer_refund_bps': 0, 'seller_bond_penalty_bps': 0, 'type': 'hold_until_timeout'}`
- Transactions: `16`
- Packets: `16`; all signatures valid: `True`
- Observations:
  - Direct automated ruling is represented by a registered arbiter controller until the automated arbiter actor exists on-chain.
  - In-person route stays protocol-native through route memo evidence instead of being treated as failed shipping.

### SIM-0087

- EVM trade id: `5`
- Amount model: `{'price_eth': '0.07', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['evidence_ambiguity', 'route_gap_owner_review']`
- Remedy: `{'buyer_refund_bps': 0, 'seller_bond_penalty_bps': 0, 'type': 'route_gap_split'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.
  - Automated policy was selected, but signed friction triggers forced human resolution before value moved.

### SIM-0001

- EVM trade id: `6`
- Amount model: `{'price_eth': '0.042', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.042'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['authenticity_or_identity_risk', 'bond_penalty_above_auto_cap', 'case_scope_outside_automation', 'evidence_ambiguity', 'refund_above_auto_cap']`
- Remedy: `{'buyer_refund_bps': 10000, 'seller_bond_penalty_bps': 5000, 'type': 'refund_or_return'}`
- Transactions: `17`
- Packets: `16`; all signatures valid: `True`
- Observations:
  - Automated policy was selected, but signed friction triggers forced human resolution before value moved.

### SIM-0095

- EVM trade id: `7`
- Amount model: `{'price_eth': '0.55', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.011', 'declared_insurance_eth': '0.035'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['authenticity_or_identity_risk', 'evidence_ambiguity', 'human_arbiter_selected_prelock', 'seller_trust_gap']`
- Remedy: `{'buyer_refund_bps': 10000, 'seller_bond_penalty_bps': 10000, 'type': 'escalate_authenticity'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`

### SIM-0164

- EVM trade id: `8`
- Amount model: `{'price_eth': '2.781', 'seller_bond_eth': '0.2781', 'buyer_dispute_bond_eth': '0.05', 'declared_insurance_eth': '2.781'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['human_arbiter_selected_prelock']`
- Remedy: `{'buyer_refund_bps': 10000, 'seller_bond_penalty_bps': 10000, 'type': 'refund_plus_bond'}`
- Transactions: `14`
- Packets: `14`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.

### SIM-0015

- EVM trade id: `9`
- Amount model: `{'price_eth': '1.08', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.0216', 'declared_insurance_eth': '0.25'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['evidence_ambiguity', 'human_arbiter_selected_prelock', 'route_gap_owner_review']`
- Remedy: `{'buyer_refund_bps': 6500, 'seller_bond_penalty_bps': 3500, 'type': 'underinsurance_gap_review'}`
- Transactions: `15`
- Packets: `14`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.

### SIM-0247

- EVM trade id: `10`
- Amount model: `{'price_eth': '0.865', 'seller_bond_eth': '0.12975', 'buyer_dispute_bond_eth': '0.0173', 'declared_insurance_eth': '0.25'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `[]`
- Remedy: `{'buyer_refund_bps': 0, 'seller_bond_penalty_bps': 0, 'type': 'seller_release'}`
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
