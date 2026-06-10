# Qwen MLX E2E Transaction Simulation: qwen_e2e_transaction_20260608T154137Z

- Generated: `2026-06-08T15:42:02.515875+00:00`
- Model: `/Users/che/models/mlx/Qwen3.6-35B-A3B-4bit`
- Scenario: `qwen_full_wall_compliant_offer`
- Offer decision: `escrow_fundable`
- Route decision: `route_locked`
- Claim decision: `no_claim_opened`
- EVM route state: `RouteLocked`
- EVM delivery state: `InspectionOpen`
- EVM final state: `Settled`

## Qwen Buyer Agent

```json
{
  "_raw": "{\n  \"decision\": \"acceptOfferAndFundEscrow\",\n  \"proceed_to_fund\": true,\n  \"human_summary\": \"The offer for the raw Neo Discovery Espeon (card 1) is compliant with all active walls. The bond scope, card reference, and route insurance are valid. The buyer must accept the risk regarding authenticity, condition, and possession as these are explicitly not claimed by the seller. The protocol gate has passed all checks, and the offer is escrow-fundable.\",\n  \"evidence_boundary\": \"The seller provides evidence of possession (fresh nonce), card condition (photos), and account control (eBay/shop). The protocol enforces that this evidence does not prove authenticity, condition truth, or possession truth post-shipment. The buyer accepts the 'raw_card' form with these specific limitations.\",\n  \"not_claiming\": [\n    \"authenticity\",\n    \"condition\",\n    \"possession\",\n    \"price_truth\",\n    \"seller_card_language\",\n    \"seller_inventory_existence\",\n    \"current_possession\",\n    \"shipment_completion\",\n    \"raw_card_condition\"\n  ],\n  \"packets_you_expect_the_protocol_to_enforce\": [\n    \"arbiter_policy_hash\",\n    \"bond_scope_packet\",\n    \"card_reference_packet\",\n    \"evidence_profile_id\",\n    \"inventory_lock_hash\",\n    \"item_fingerprint_hash\",\n    \"proof_vector_scope_packet\",\n    \"route_insurance_risk_owner_packet\",\n    \"route_spendability_hash\",\n    \"external_availability_covenant\"\n  ]\n}",
  "decision": "acceptOfferAndFundEscrow",
  "evidence_boundary": "The seller provides evidence of possession (fresh nonce), card condition (photos), and account control (eBay/shop). The protocol enforces that this evidence does not prove authenticity, condition truth, or possession truth post-shipment. The buyer accepts the 'raw_card' form with these specific limitations.",
  "human_summary": "The offer for the raw Neo Discovery Espeon (card 1) is compliant with all active walls. The bond scope, card reference, and route insurance are valid. The buyer must accept the risk regarding authenticity, condition, and possession as these are explicitly not claimed by the seller. The protocol gate has passed all checks, and the offer is escrow-fundable.",
  "not_claiming": [
    "authenticity",
    "condition",
    "possession",
    "price_truth",
    "seller_card_language",
    "seller_inventory_existence",
    "current_possession",
    "shipment_completion",
    "raw_card_condition"
  ],
  "packets_you_expect_the_protocol_to_enforce": [
    "arbiter_policy_hash",
    "bond_scope_packet",
    "card_reference_packet",
    "evidence_profile_id",
    "inventory_lock_hash",
    "item_fingerprint_hash",
    "proof_vector_scope_packet",
    "route_insurance_risk_owner_packet",
    "route_spendability_hash",
    "external_availability_covenant"
  ],
  "proceed_to_fund": true
}
```

## Qwen Seller Agent

```json
{
  "_raw": "{\n  \"decision\": \"proceed\",\n  \"proceed_to_route_lock\": true,\n  \"seller_summary\": \"Seller agent confirms route lock. All required packets (arbiter_policy, bond_scope, card_reference, evidence_profile, external_availability_covenant, inventory_lock, item_fingerprint, proof_vector, route_insurance, route_spendability) are present and validated. Walls POKEMON_ALPHA_SCOPE, CardReferenceCandidate, POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000, BondScope, ProofVectorScope, RouteInsuranceRiskOwner, and ExternalAvailabilityCovenant passed. Judgment walls BuyerRiskAcceptance and ClaimClosureEvidenceMatrix passed. No missing claims or blocked currencies. Inventory is locked, external availability is covenanted, and insurance is accepted.\",\n  \"route_boundary\": {\n    \"trade_id\": \"qwen_full_wall_compliant_offer\",\n    \"ship_by\": \"2026-05-22T18:00:00Z\",\n    \"declared_value\": 750,\n    \"insurance_amount\": 750,\n    \"risk_owner\": \"seller\",\n    \"gate\": \"route_commitment\"\n  },\n  \"not_claiming\": [\n    \"authenticity\",\n    \"condition\",\n    \"possession\",\n    \"price_truth\",\n    \"seller_card_language\",\n    \"seller_inventory_existence\",\n    \"current_possession\",\n    \"raw_card_condition\",\n    \"shipment_completion\",\n    \"physical_truth\",\n    \"condition_truth\"\n  ],\n  \"spendability_hash_seen\": \"sha256:bca1c4f87477653f35f93a64b51fd85fcc35524c83e755c3d046c46577c1be79\",\n  \"wall_bundle_hash_seen\": \"sha256:31498a09c90bbf488d05e1f4b73216ea8c734d9715c888cbe077d4895329a52d\"\n}",
  "decision": "proceed",
  "not_claiming": [
    "authenticity",
    "condition",
    "possession",
    "price_truth",
    "seller_card_language",
    "seller_inventory_existence",
    "current_possession",
    "raw_card_condition",
    "shipment_completion",
    "physical_truth",
    "condition_truth"
  ],
  "proceed_to_route_lock": true,
  "route_boundary": {
    "declared_value": 750,
    "gate": "route_commitment",
    "insurance_amount": 750,
    "risk_owner": "seller",
    "ship_by": "2026-05-22T18:00:00Z",
    "trade_id": "qwen_full_wall_compliant_offer"
  },
  "seller_summary": "Seller agent confirms route lock. All required packets (arbiter_policy, bond_scope, card_reference, evidence_profile, external_availability_covenant, inventory_lock, item_fingerprint, proof_vector, route_insurance, route_spendability) are present and validated. Walls POKEMON_ALPHA_SCOPE, CardReferenceCandidate, POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000, BondScope, ProofVectorScope, RouteInsuranceRiskOwner, and ExternalAvailabilityCovenant passed. Judgment walls BuyerRiskAcceptance and ClaimClosureEvidenceMatrix passed. No missing claims or blocked currencies. Inventory is locked, external availability is covenanted, and insurance is accepted.",
  "spendability_hash_seen": "sha256:bca1c4f87477653f35f93a64b51fd85fcc35524c83e755c3d046c46577c1be79",
  "wall_bundle_hash_seen": "sha256:31498a09c90bbf488d05e1f4b73216ea8c734d9715c888cbe077d4895329a52d"
}
```

## Qwen Inspection Agent

```json
{
  "_raw": "{\n  \"decision\": \"proceed\",\n  \"proceed_to_final_receipt\": true,\n  \"human_summary\": \"The deterministic API confirms the trade state transitioned from 'InspectionOpen' to 'Settled' via a valid buyer acceptance transaction. The delivery evidence was spendable, and the final receipt is cryptographically valid. The buyer's satisfaction is recorded in the protocol state.\",\n  \"receipt_boundary\": \"0x6761bc8860871f0657f7d313f88230240f6b60f5763e312d497da889a21258cf\",\n  \"not_claiming\": [\n    \"The physical condition of the asset matches the description\",\n    \"The asset was physically delivered to the buyer's location\",\n    \"The seller currently possesses the asset\",\n    \"The buyer's subjective happiness is verified by external means\"\n  ],\n  \"reusable_trust_signal\": {\n    \"schema\": \"marketplace.final_receipt.v0.2\",\n    \"payload_hash\": \"0x6761bc8860871f0657f7d313f88230240f6b60f5763e312d497da889a21258cf\",\n    \"signer\": \"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\",\n    \"trade_id\": 1,\n    \"status\": \"Settled\"\n  }\n}",
  "decision": "proceed",
  "human_summary": "The deterministic API confirms the trade state transitioned from 'InspectionOpen' to 'Settled' via a valid buyer acceptance transaction. The delivery evidence was spendable, and the final receipt is cryptographically valid. The buyer's satisfaction is recorded in the protocol state.",
  "not_claiming": [
    "The physical condition of the asset matches the description",
    "The asset was physically delivered to the buyer's location",
    "The seller currently possesses the asset",
    "The buyer's subjective happiness is verified by external means"
  ],
  "proceed_to_final_receipt": true,
  "receipt_boundary": "0x6761bc8860871f0657f7d313f88230240f6b60f5763e312d497da889a21258cf",
  "reusable_trust_signal": {
    "payload_hash": "0x6761bc8860871f0657f7d313f88230240f6b60f5763e312d497da889a21258cf",
    "schema": "marketplace.final_receipt.v0.2",
    "signer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "status": "Settled",
    "trade_id": 1
  }
}
```

## Deterministic Gate

- Wall bundle: `sha256:31498a09c90bbf488d05e1f4b73216ea8c734d9715c888cbe077d4895329a52d`
- Route spendability: `sha256:bca1c4f87477653f35f93a64b51fd85fcc35524c83e755c3d046c46577c1be79`
- Route spendability EVM hash: `0xd3644373e4bb0d2e40ec4e1fbc94604882bf914ffbdd7a6995869c5a881c58b9`

## EVM Transactions

- `create alpha Espeon trade`: `0xe0295d6cb782a82a354186327a7916c6e3e9cb24d5eecc10ef8da3d3f99d423e`
- `seller posts alpha Espeon bond`: `0xab1f21085552f17e95cd5476641ebe51425b7c561c6df60137d183971420401c`
- `commit alpha Espeon item fingerprint`: `0x922cfdc0870bf6bad1dbcf3233f2f835bdd8377dfeb1e96da8d594456779096a`
- `commit alpha Espeon inventory lock`: `0xb7f8a9745bcfb3746af4c8500bf04fab2a89725a9c0f8efb8f4d1fc336330a87`
- `commit alpha Espeon route with wall bundle spendability`: `0x40598114831e18ed8b4e5a88cff2e88f675e717d527b739a2bb3b5a152b0aeb7`
- `alpha Espeon mark delivered`: `0xd03566bb81e683662bc4448bbda59b2816ed1d6a4ad0fcd92c0bddb0a398f6b3`
- `alpha Espeon buyer accepts`: `0x04efd503f5b6d855a230e2c67549c10ce36ac23035329cafa591a2fdc7074901`

## Interpretation

Qwen successfully operated as the narrative/agent layer, but every money-moving step was gated by the deterministic wall API and the EVM escrow. The run proves a clean transaction can move from offer evaluation to route lock, delivery, inspection, buyer acceptance, and final settlement without letting Qwen promote evidence into authenticity, condition, or delivery truth.

## Files

- Summary: `runs/qwen_e2e_transaction_20260608T154137Z/summary.json`
- EVM route report: `runs/alpha_route_commit_20260608T154153Z/REPORT.md`
- Delivery report: `runs/alpha_route_commit_20260608T154153Z/STEP_mark-delivered_20260608T154155Z.md`
- Acceptance report: `runs/alpha_route_commit_20260608T154153Z/STEP_buyer-accept_20260608T154155Z.md`
