# Seller Bootstrap Drill: seller_bootstrap_drill_20260610T165439Z

- Passed: `True`
- Pass definition: seller-first bootstrap preserves settlement caveats, prices attention, and treats bonds as scoped capital rather than trust.

## Overclaim Attempts

### fiat_payment_marked_settled

- Claim: A card-network payment is settled once authorized.
- Blocked by: `fiat payment != settlement`
- Passed: `True`

### stablecoin_no_third_party_risk

- Claim: Stablecoin escrow means no third party can intervene.
- Blocked by: `stablecoin escrow != no third-party risk`
- Passed: `True`

### bonded_seller_safe

- Claim: The seller posted a bond, so the seller is safe.
- Blocked by: `bonded seller != safe seller`
- Passed: `True`

### attention_is_free_until_purchase

- Claim: The seller should provide extra scans for free because the buyer might buy.
- Blocked by: `EvidenceRequestFeeTerms`
- Passed: `True`

## Seller Cases

### baseline_fiat_platform

- Traditional off-chain payment baseline: buyer may look serious, but seller still carries reversal tail.
- Rail: `offchain_fiat_reference`
- Finality model: `reversible_promise`
- Chargeback surface: `high`
- Required seller bond: `$192.0` (`3000 bps`)
- Covered failures: `nonship, wrong_item, material_misdescription, return_leg_bad_faith_if_proven`
- Not claiming: `card_is_authentic, contract_enforced_funds, final_settlement, fraud_impossible, no_chargeback_tail, seller_is_honest`
- Passed: `True`

### new_seller_capital_heavy

- New protocol seller can reach a funded buyer by posting scoped capital.
- Rail: `erc20_stablecoin`
- Finality model: `contract_release_after_acceptance_or_ruling`
- Chargeback surface: `none_at_card_network_layer`
- Required seller bond: `$288.0` (`4500 bps`)
- Covered failures: `nonship, wrong_item, material_misdescription, return_leg_bad_faith_if_proven`
- Not claiming: `card_is_authentic, fraud_impossible, guaranteed_offramp_liquidity, no_issuer_or_legal_intervention_risk, no_regulatory_surface, physical_card_truth, seller_is_honest`
- Passed: `True`

### imported_shop_reputation

- Shop or marketplace proof reduces but does not erase bond requirement.
- Rail: `erc20_stablecoin`
- Finality model: `contract_release_after_acceptance_or_ruling`
- Chargeback surface: `none_at_card_network_layer`
- Required seller bond: `$224.0` (`3500 bps`)
- Covered failures: `nonship, wrong_item, material_misdescription, return_leg_bad_faith_if_proven`
- Not claiming: `card_is_authentic, fraud_impossible, guaranteed_offramp_liquidity, no_issuer_or_legal_intervention_risk, no_regulatory_surface, physical_card_truth, seller_is_honest`
- Passed: `True`

### mature_receipt_history

- Clean protocol receipts buy down the bond requirement.
- Rail: `erc20_stablecoin`
- Finality model: `contract_release_after_acceptance_or_ruling`
- Chargeback surface: `none_at_card_network_layer`
- Required seller bond: `$32.0` (`500 bps`)
- Covered failures: `nonship, wrong_item, material_misdescription, return_leg_bad_faith_if_proven`
- Not claiming: `card_is_authentic, fraud_impossible, guaranteed_offramp_liquidity, no_issuer_or_legal_intervention_risk, no_regulatory_surface, physical_card_truth, seller_is_honest`
- Passed: `True`

### underwritten_new_seller

- Third-party bond underwriter substitutes capital with a priced, accountable actor.
- Rail: `erc20_stablecoin`
- Finality model: `contract_release_after_acceptance_or_ruling`
- Chargeback surface: `none_at_card_network_layer`
- Required seller bond: `$211.2` (`3300 bps`)
- Covered failures: `nonship, wrong_item, material_misdescription, return_leg_bad_faith_if_proven`
- Not claiming: `card_is_authentic, fraud_impossible, guaranteed_offramp_liquidity, no_issuer_or_legal_intervention_risk, no_regulatory_surface, physical_card_truth, seller_is_honest`
- Passed: `True`

## What This Proves

- Seller-first bootstrap is not only copy; it has packet-level requirements.
- Escrowed digital money is the enforceable settlement material, while fiat payment remains a reversible promise.
- Stablecoin settlement keeps issuer, blacklist, custody, and regulatory caveats visible.
- New sellers can substitute scoped capital for missing history.
- Protocol receipts and clean outcomes can reduce bond requirements without becoming a claim that the seller is safe.
