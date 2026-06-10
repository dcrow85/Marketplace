# Protocol Gap Negative Drill: protocol_gap_negative_drill_20260610T163241Z

- Passed: `True`
- Pass definition: protocol-compliant settlement remains possible while the hidden physical oracle says the card was fake or swapped.
- RPC: `http://127.0.0.1:18547`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Predicate verifier: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`

## Why This Drill Exists

This drill proves an open gap, not a closed wall. The protocol can bind packets, signatures, route gates, spendability, witnesses, claims, rulings, escrow, and bonds. It cannot bind a physical card into the chain.

A passing run means the project is not overclaiming: digital attacks are blocked by walls, but physical truth can still cross ingress or egress only as signed residue and later judgment.

## Overclaim Scan

- No banned authenticity overclaims found in generated packet payloads.

## Scenarios

### happy_path_insured_card

- Trade ID: `1`
- Final state: `Settled`
- Hidden physical oracle: `counterfeit_not_detected_during_inspection`
- Physical truth: The shipped card is a convincing counterfeit. Seller-supplied scans and nonce evidence were internally consistent, but they did not prove physical authenticity.
- Where loss lands: Buyer accepted during inspection, so escrow and seller bond released. Later recovery is outside the ledger except through the signed residue.
- Gap path: `G1.BindingGap, G2.SensorGap, G3.ContinuityGap, G6.EgressRemedyGap`
- Transactions:
  - create insured trade
  - seller posts bond
  - attach trust proof
  - accept seller private predicate hash
  - attach seller private predicate
  - accept buyer funding predicate hash
  - attach buyer funding predicate
  - attach item evidence
  - approve verifier review scope
  - commit scoped verifier review
  - commit item fingerprint
  - commit inventory lock
  - commit insured route
  - mark route in progress
  - mark delivered
  - buyer accepts
- Signed residue:
  - seller-signed item fingerprint
  - seller evidence manifest
  - inventory lock
  - route packet
  - delivery packet
  - buyer final receipt
  - all on-chain state transitions
- Anchored packet ids:
  - `happy_intent`
  - `happy_escrow_terms`
  - `happy_trust_offer`
  - `happy_item_fingerprint`
  - `happy_inventory_lock`
  - `happy_seller_private_predicate`
  - `happy_buyer_funding_predicate`
  - `happy_item_evidence`
  - `happy_verifier_scope_approval`
  - `happy_verifier_review`
  - `happy_unapproved_verifier_fingerprint`
  - `happy_route_spendability`
  - `happy_route`
  - `happy_delivery_spendability`
  - `happy_delivery`
  - `happy_final_receipt`

### new_seller_material_claim

- Trade ID: `2`
- Final state: `Settled`
- Hidden physical oracle: `counterfeit_discovered_during_inspection`
- Physical truth: The card is fake or materially misrepresented, but the chain only sees the buyer claim packet, verifier-scoped note, arbiter ruling, and remedy math.
- Where loss lands: Claim path moves the dispute into arbiter judgment; escrow and bond can compensate, but the protocol still cannot recover or authenticate the physical card by itself.
- Gap path: `G1.BindingGap, G2.SensorGap, G5.JudgmentGap, G6.EgressRemedyGap`
- Transactions:
  - create new-seller trade
  - seller posts larger bond
  - attach weak proof
  - accept claim seller predicate hash
  - attach seller activity predicate
  - attach circuit profile hook
  - approve claim verifier scope
  - attach sparse evidence
  - commit claim item fingerprint
  - commit claim inventory lock
  - open fingerprint challenge
  - clear fingerprint challenge
  - commit uninsured route
  - mark delivered
  - attach received-item claim evidence
  - commit verifier claim note
  - open claim with buyer dispute bond
  - arbiter resolves claim
- Signed residue:
  - buyer claim packet
  - buyer received-item manifest
  - verifier scope approval
  - verifier claim note
  - arbiter ruling
  - bond disposition
  - settlement event
- Anchored packet ids:
  - `claim_intent`
  - `claim_escrow_terms`
  - `claim_new_seller_proof`
  - `claim_item_fingerprint`
  - `claim_inventory_lock`
  - `claim_fingerprint_challenge`
  - `claim_fingerprint_challenge_clear`
  - `claim_seller_private_predicate`
  - `claim_circuit_profile`
  - `claim_sparse_item_evidence`
  - `claim_verifier_scope_approval`
  - `claim_route_uninsured`
  - `claim_delivery_spendability`
  - `claim_delivery`
  - `claim_received_item_evidence`
  - `claim_packet`
  - `claim_verifier_note`
  - `claim_challenge_clearance_spendability`
  - `claim_route_spendability`
  - `claim_support_spendability`
  - `claim_bond_action_spendability`
  - `claim_ruling`

## What This Proves

- A fully valid packet path can still be physically false.
- The protocol makes that false path attributable rather than impossible.
- Ingress remains open: seller photos, scans, nonce evidence, and verifier notes are not atoms.
- Egress remains open: settlement can move money and bonds, but cannot recover or authenticate the card.
- This is the intended boundary, not a bug in the EVM runner.

## Tripwire

If a future change makes this drill fail because the system claims it proved authenticity, that is an overclaim alarm. The acceptable hardening path is stronger residue, clearer judgment, better deterrence, and tighter walls around digital replay or scope laundering.
