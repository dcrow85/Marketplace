# Agent Simulation EVM Replay: agent_market_evm_replay_20260519T165101Z

- Source simulation: `runs/agent_market_20260518T194505Z`
- RPC: `http://127.0.0.1:18546`
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
| `SIM-0003` | `1` | `$100` low | trusted | international_ship | clean_close | none | Settled |
| `SIM-0016` | `2` | `$60` low | known | insured_ship | minor_condition_delta | automated | Settled |
| `SIM-0137` | `3` | `$96` low | known | insured_ship | insured_lost | automated | Settled |
| `SIM-0025` | `4` | `$57` low | known | uninsured_ship | uninsured_lost | automated_escalated_to_human | Settled |
| `SIM-0069` | `5` | `$48` low | known | insured_ship | material_misdescription | automated_escalated_to_human | Settled |
| `SIM-0194` | `6` | `$87` low | known | insured_ship | minor_condition_delta | arbiter_agent_delegated | Settled |
| `SIM-0030` | `7` | `$1367` high | trusted | underinsured_ship | underinsured_lost | human_arbiter | Settled |
| `SIM-0087` | `8` | `$2798` grail | new | underinsured_ship | seller_nonship | human_arbiter | Settled |
| `SIM-0088` | `9` | `$1065` high | unknown | insured_ship | authenticity_flag | human_arbiter | Settled |
| `SIM-0018` | `10` | `$32` low | new | local_meetup | local_handoff_dispute | human_arbiter | Settled |

## Counts

Arbitration modes:

```json
{
  "arbiter_agent_delegated": 1,
  "automated": 2,
  "automated_escalated_to_human": 2,
  "human_arbiter": 4,
  "none": 1
}
```

Outcomes:

```json
{
  "authenticity_flag": 1,
  "clean_close": 1,
  "insured_lost": 1,
  "local_handoff_dispute": 1,
  "material_misdescription": 1,
  "minor_condition_delta": 2,
  "seller_nonship": 1,
  "underinsured_lost": 1,
  "uninsured_lost": 1
}
```

## Trade Details

### SIM-0003

- EVM trade id: `1`
- Amount model: `{'price_eth': '0.1', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.1'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `[]`
- Remedy: `{'buyer_refund_bps': 0, 'seller_bond_penalty_bps': 0, 'type': 'release'}`
- Transactions: `15`
- Packets: `14`; all signatures valid: `True`

### SIM-0016

- EVM trade id: `2`
- Amount model: `{'price_eth': '0.06', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.059'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `[]`
- Remedy: `{'buyer_refund_bps': 1200, 'seller_bond_penalty_bps': 0, 'type': 'partial_refund'}`
- Transactions: `17`
- Packets: `16`; all signatures valid: `True`
- Observations:
  - Direct automated ruling is represented by a registered arbiter controller until the automated arbiter actor exists on-chain.

### SIM-0137

- EVM trade id: `3`
- Amount model: `{'price_eth': '0.096', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.096'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `[]`
- Remedy: `{'buyer_refund_bps': 0, 'seller_bond_penalty_bps': 0, 'type': 'carrier_claim_hold'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.
  - Direct automated ruling is represented by a registered arbiter controller until the automated arbiter actor exists on-chain.

### SIM-0025

- EVM trade id: `4`
- Amount model: `{'price_eth': '0.057', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['evidence_ambiguity', 'route_gap_owner_review']`
- Remedy: `{'buyer_refund_bps': 0, 'seller_bond_penalty_bps': 0, 'type': 'route_gap_split'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.
  - Automated policy was selected, but signed friction triggers forced human resolution before value moved.

### SIM-0069

- EVM trade id: `5`
- Amount model: `{'price_eth': '0.048', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.048'}`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['bond_penalty_above_auto_cap', 'evidence_ambiguity', 'refund_above_auto_cap']`
- Remedy: `{'buyer_refund_bps': 5500, 'seller_bond_penalty_bps': 4000, 'type': 'partial_refund_plus_bond'}`
- Transactions: `17`
- Packets: `16`; all signatures valid: `True`
- Observations:
  - Automated policy was selected, but signed friction triggers forced human resolution before value moved.

### SIM-0194

- EVM trade id: `6`
- Amount model: `{'price_eth': '0.087', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0.087'}`
- Selected arbiter: `did:market:arbiter:raw-condition-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['human_arbiter_selected_prelock']`
- Remedy: `{'buyer_refund_bps': 1200, 'seller_bond_penalty_bps': 0, 'type': 'partial_refund'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`

### SIM-0030

- EVM trade id: `7`
- Amount model: `{'price_eth': '1.367', 'seller_bond_eth': '0.1367', 'buyer_dispute_bond_eth': '0.02734', 'declared_insurance_eth': '0.25'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['evidence_ambiguity', 'human_arbiter_selected_prelock', 'route_gap_owner_review']`
- Remedy: `{'buyer_refund_bps': 6500, 'seller_bond_penalty_bps': 3500, 'type': 'underinsurance_gap_review'}`
- Transactions: `15`
- Packets: `14`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.

### SIM-0087

- EVM trade id: `8`
- Amount model: `{'price_eth': '2.798', 'seller_bond_eth': '0.6995', 'buyer_dispute_bond_eth': '0.05', 'declared_insurance_eth': '0.1'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['human_arbiter_selected_prelock', 'seller_trust_gap']`
- Remedy: `{'buyer_refund_bps': 10000, 'seller_bond_penalty_bps': 10000, 'type': 'refund_plus_bond'}`
- Transactions: `14`
- Packets: `14`; all signatures valid: `True`
- Observations:
  - Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate.
  - New seller trust is carried as explicit evidence plus bond, not as a single marketplace score.

### SIM-0088

- EVM trade id: `9`
- Amount model: `{'price_eth': '1.065', 'seller_bond_eth': '0.15975', 'buyer_dispute_bond_eth': '0.0213', 'declared_insurance_eth': '1.065'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['authenticity_or_identity_risk', 'evidence_ambiguity', 'human_arbiter_selected_prelock', 'seller_trust_gap']`
- Remedy: `{'buyer_refund_bps': 10000, 'seller_bond_penalty_bps': 10000, 'type': 'escalate_authenticity'}`
- Transactions: `16`
- Packets: `15`; all signatures valid: `True`

### SIM-0018

- EVM trade id: `10`
- Amount model: `{'price_eth': '0.032', 'seller_bond_eth': '0.005', 'buyer_dispute_bond_eth': '0.003', 'declared_insurance_eth': '0'}`
- Selected arbiter: `did:market:arbiter:high-end-panel-1` mapped to `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` for local EVM.
- Friction triggers: `['evidence_ambiguity', 'human_arbiter_selected_prelock', 'in_person_handoff_ambiguity']`
- Remedy: `{'buyer_refund_bps': 5000, 'seller_bond_penalty_bps': 0, 'type': 'handoff_review'}`
- Transactions: `15`
- Packets: `15`; all signatures valid: `True`
- Observations:
  - New seller trust is carried as explicit evidence plus bond, not as a single marketplace score.
  - In-person route stays protocol-native through route memo evidence instead of being treated as failed shipping.

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
