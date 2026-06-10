# Local EVM Protocol Probe: local_evm_protocol_20260519T164825Z

- RPC: `http://127.0.0.1:18545`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Predicate verifier: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Contract: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Chain: `anvil:31337`

## Registry Setup

- Transactions:
  - `register buyer actor`: `0x08b0dd88a27562346bb8f880dba70bac6e0b4b132f494ecbd9c121eec25bffb9`
  - `register seller actor`: `0x22b94a5b434a4023c922dae414c99252ae70245cc5cf41230ebda7966824d4f0`
  - `register arbiter actor`: `0x1ed45288b477bb1df3ab8188b032bc6e9f3e2e552292f4ef217d1826f47e9647`
  - `register verifier actor`: `0x082455b792d80adeb9047aa4367d8e8c2f23017b808bd29ace9610ca5610273c`
  - `register replacement_arbiter actor`: `0xb95f179126ae5a5994e7be77dc58982176f87e56bfe5d85708c57ab948b5829c`
  - `register arbiter authority`: `0x32a2da1de152721a4075fe47632cc20d611c20e93e7b2bca8b873f34c1acea55`
  - `register replacement arbiter authority`: `0x562b6df9c717ee240df663e6e707a15d576e376e0f226ce5a24f03ead5321741`
  - `register verifier authority`: `0x10c5fa43355c23c12e62d1bb4758cb5e7bff338c1c010ac15cd22c9b3e0b1e9c`
  - `register predicate verifier contract`: `0x7984694071c9152dd361b122803c02262f586a50b7fac7fd42c87ef5116136d5`
- Signed registry packets:
  - `actor_buyer` `0xca07896a6190e860dd51af4241ed9a02835b1930c4dd01a13c7b6d9a44a3675a` (marketplace.actor_record.v0.2, valid signature)
  - `actor_seller` `0x58731f2034f9f2f374d451384fde315bbb8a7a907e23c84a1d4e8b47d7c81ed5` (marketplace.actor_record.v0.2, valid signature)
  - `actor_arbiter` `0x0025cd199f11db191de2e1f83919b36022cca03b844c6169e8941f9f976f4442` (marketplace.actor_record.v0.2, valid signature)
  - `actor_verifier` `0xf1dabec00581b587e9298a603d99dee6bd6a37afb765202df9818deccfd636d6` (marketplace.actor_record.v0.2, valid signature)
  - `actor_replacement_arbiter` `0xac96bd505a7604e9de45910564e0bcb27b5410a0bdb3d3b1fc382c2dbb56e76a` (marketplace.actor_record.v0.2, valid signature)
  - `arbiter_authority` `0xa9248044dfd441d24063324f762a928fef56422ae6281ad465b34b9e5ab1724f` (marketplace.arbiter_record.v0.2, valid signature)
  - `replacement_arbiter_authority` `0xb258ca210e4b4df25b5fc896b5478bad46e53dd183672bb9a68e63e389cb770d` (marketplace.arbiter_record.v0.2, valid signature)
  - `verifier_authority` `0x9b58f9b34334a5099078df708ba4fd129f1007994ddee0b361570a0c711f6f22` (marketplace.verifier_record.v0.2, valid signature)
  - `predicate_verifier_contract` `0x69169765958680ef8bad537c754fccbe799dd3d990bdad5b14a71e790cc1983f` (marketplace.predicate_verifier_record.v0.2, valid signature)
- Observations:
  - Every actor has a controller address and a signed ActorRecord packet.
  - Verifier and arbiter authority are separate records, not just role labels.
  - Predicate verifier contracts are registry-gated before private predicate packets can use them.
  - The escrow can now reject trades that select an inactive or unknown arbiter.

## Scenario Results

### happy_path_insured_card

- Trade ID: `1`
- Final state: `Settled`
- Transactions:
  - `create insured trade`: `0x55d911c0924ee4ced3a090dfd1db00748238a7b11e937abc768feb40f44aa290`
  - `seller posts bond`: `0x55a4142b173059cf5299e5ccd49223f5b2510ae234cd1b64f717c811ebb76341`
  - `attach trust proof`: `0xcaebd956dcdec87840ab5e2cc337915fa05d655f5fe60349a6124aa5be0c91e3`
  - `accept seller private predicate hash`: `0xc776fd203d460d30811819df74a224ebcdf56edd5b4b60b2704d2d5d0fc17db4`
  - `attach seller private predicate`: `0x90518d0fb86d26820834a267cfb761fc585f0f185ce63979e0e30b7ebd5cb825`
  - `accept buyer funding predicate hash`: `0x50e7b8d20f575b05db4178c0875c0c88350ac7d04b79a026f60def09e5be3060`
  - `attach buyer funding predicate`: `0xd22e04608e6c74ecb95bb2975263eaf3c25fda729f056d759cb54a2d87f38110`
  - `attach item evidence`: `0x7d3d0f85a3605798211b05037889b242c2e525c7db8085712d1c7468697e4799`
  - `approve verifier review scope`: `0x80130c9e9314de3c8aa0fce9b92edcf29a344039a70693643e7b3205e28877ee`
  - `commit scoped verifier review`: `0x19335f21cab8b33a84256a98ed0b43eb8a0d99e05b2ffe876b67ea597a953c9a`
  - `commit item fingerprint`: `0xa690383a80b1043803bf99b22d04852921e401e41648a4c5779261278c5a96c7`
  - `commit inventory lock`: `0xb546590bb09c2bf71a5ba60023eea9f640f6f2bb6c5e126e20f5d58496c0bde2`
  - `commit insured route`: `0x7c6afea91206067ef393d7a532779251299deeecc655be66c1ecd75ac2292240`
  - `mark route in progress`: `0x8488b4ad60af75d22418b81bb43eb9a4bf196dbab0b573c2b32fe9ce78d0857e`
  - `mark delivered`: `0x2bf4213d3af860030f98cba24f369948e1381a8562d2097d981b2873f0c4ff42`
  - `buyer accepts`: `0x50fcabd7461ca56a204d8c48da2515dc414ae5b53c4604f3823ef5c987991880`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0xb39ae7bb0f70910dcc7cbd998f364ec329345f47f142dd25e05011238f26f7a9` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0x0e350f22a79e4b49d140ee4c009f3da94c010099c4bb4492f197924066c4061a` (marketplace.evidence_packet.v0.2, valid signature)
  - `happy_verifier_scope_approval` `0xf16c10d26d9be0f8881d6bdc9ce86a92207226551ff9c250ae0fed48b265424f` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `happy_verifier_review` `0xe58dbef59e6bc84097a28d12f0f95d6f627f022cde4d722e8d00ae51e3b48c18` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `happy_unapproved_verifier_fingerprint` `0x9be4b41518a3f02c38ab04a23a5404a5e4c840be118bada4f82bf73acdf4a752` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
  - `happy_delivery` `0x61d65d4a617114f5a2bf5003000124c34d5ec625c58d817f9c4cd5b766b9e9d1` (marketplace.delivery_evidence.v0.2, valid signature)
  - `happy_final_receipt` `0x5154efb32d52def53079b00ba5d5f156656ccd33e52838fbfdc4238cb443ddd8` (marketplace.trade_receipt.v0.2, valid signature)
- Observations:
  - verifier cannot attach loose review evidence reverted as expected.
  - unapproved verifier commits fingerprint reverted as expected.
  - replay item evidence reverted as expected.
  - commit inventory lock with wrong fingerprint binding reverted as expected.
  - Buyer-funded intent became locked escrow.
  - Seller attention stayed bounded: one trust proof, one item packet, one route packet.
  - Final receipt closed the trade and released escrow plus bond.

### new_seller_material_claim

- Trade ID: `2`
- Final state: `Settled`
- Transactions:
  - `create new-seller trade`: `0x07ca94f6f81463d9d5ef4e86f252376bb2516330f060c8af7216fc057acf87f8`
  - `seller posts larger bond`: `0xbf58946ac92d52bfe1b0ea9bf34791b215c9ce3eb64df5fcb0f40063f574a03e`
  - `attach weak proof`: `0xa075bf15904391e24749eb643c6a2bfdf84cb9659d19aebabc0c80fa725ce95e`
  - `accept claim seller predicate hash`: `0x63a6faf9ff822d1edfe3dbc5d7cbeaaa38c44e14aac84726b6da23abe668dc26`
  - `attach seller activity predicate`: `0xea481a68f44c74b9fe5b4a39e7eeee3e8c77a557c141277685780d02a811dc91`
  - `attach circuit profile hook`: `0x19f1eab07da2f5ff52aef2eee0e7c1554a19df3dddff9311a947d1bf7413d5b3`
  - `approve claim verifier scope`: `0x9dc44034b8d928244a48745641963c9fc615c3a973ffa20ee541a95d36d21309`
  - `attach sparse evidence`: `0xbcfe7729abbf0ad82d0a1fefb78adadc4b9d1c8615c25d1d80680bd8b0cbc90e`
  - `commit claim item fingerprint`: `0xacaac3aee8d253e95eb7e43aefe296bc7ce03e96933567e559eaa7ee11b62285`
  - `commit claim inventory lock`: `0x9cd61b8b895e3aa3ab77070b2fa0d8cecb76c9a9eec4f3196434e6a97f84ac30`
  - `open fingerprint challenge`: `0x91bb5b09847c783bddf3a3b41cedef207f3b52a052aba412539af416418f468b`
  - `clear fingerprint challenge`: `0x8291517f35b81ac5f2c4cfbc5b133d9580e2bb2e5a81b2a027ff77241704e51f`
  - `commit uninsured route`: `0xdcc2ce9b32c1da66066508be0a7fd8699339419f768f1130bda54f09e4f27322`
  - `mark delivered`: `0x9c8ea01a4472a93ae0dd01807132d6cd9a161fb2655bff36fa49daf1af2f8ac9`
  - `attach received-item claim evidence`: `0x9ab8f4544794497271d06ac4b58aa3fdf9022ad397c506081b1af2c6c8b2cce2`
  - `commit verifier claim note`: `0x024cdd9f409ebfb8a9c872f3a6f114315aa1b55cc1b5921763a3ac481abc990c`
  - `open claim with buyer dispute bond`: `0x679d1f3381e88af058bbc2bd7394f3bd7f9b9c8f5e569906f09d84d900994fea`
  - `arbiter resolves claim`: `0xbe7ee79b665ef27174445b2a0e2cc8b87273d6731681195e1d1a8cb00f90c7da`
- Anchored packets:
  - `claim_intent` `0xa2c6c605f6cb21b462f51aad0998b7055b91fa748060cb5f40a8cf451655afff` (marketplace.intent.v0.2, valid signature)
  - `claim_escrow_terms` `0x843b56e06b3432dc115305530d5e3c45cca81b6304034e9d1f949527fcd8d2b3` (marketplace.escrow_terms.v0.2, valid signature)
  - `claim_new_seller_proof` `0xa08a4c76121162c499aa94991c71558e4523d3b509f92cb6047e05b4ce9a4432` (marketplace.trust_offer.v0.2, valid signature)
  - `claim_item_fingerprint` `0xf1e170e691a741dfd0e09a495eb62ca4e4d2c417af7309b0fa15eb4d48e7cb30` (marketplace.item_fingerprint.v0.2, valid signature)
  - `claim_inventory_lock` `0xc5d8a46b258027cfee7d7e4a2c8a729ebca8c994096874a5bc48e64eb6cecc86` (marketplace.inventory_lock.v0.2, valid signature)
  - `claim_fingerprint_challenge` `0xd108882740b0596e4430809278b674f1c6267ba374f7668fe65cb70da7c6f50c` (marketplace.fingerprint_challenge.v0.1, valid signature)
  - `claim_fingerprint_challenge_clear` `0x4ec6f20d6d91d80fe72415b61f6bb4fb6143b2c8a28535a07aba17d820b2e3cf` (marketplace.fingerprint_challenge_resolution.v0.1, valid signature)
  - `claim_seller_private_predicate` `0xf2592e4c7733714fdb7e9deb5dc9d3b70c783ddfe88f9701c18f8de84147435f` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `claim_circuit_profile` `0xee5543b528ff31f9ca671b364af58634f7abafb2e7aaf82e573228573ac4dd5d` (marketplace.circuit_profile.v0.2, valid signature)
  - `claim_sparse_item_evidence` `0x953b9199569e72b8fca958c21851cbcbe6549e2d007aa5bac4d13ae5606865d3` (marketplace.evidence_packet.v0.2, valid signature)
  - `claim_verifier_scope_approval` `0x1f7af25a6c96908eef75b731f6c4abf8c58b7664235e7a7f02fbf12fee6a8176` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0xadb8ce3f7cd03b6e8ade4f3ca0bd14b611bb8a2ba4ba5bef11d976b5df93e81d` (marketplace.evidence_packet.v0.2, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0xb23c8088ce1f9509b0f4f3971044dce02e6e4838244d82b48251c19ea0c1c32e` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `claim_ruling` `0x30bbb5ace10e30f52951b865de73469de9f747a111e122e46ac1086f3e95bf3c` (marketplace.resolve_or_claim.v0.2, valid signature)
- Observations:
  - commit route while fingerprint challenge is active reverted as expected.
  - A brand-new seller can still clear the trade by posting a larger bond.
  - Weak trust proof did not need to become a scalar score; it became an explicit gap.
  - The claim packet and ruling hash give the agent a clean evidence trail after settlement.

### revoked_arbiter_emergency_replacement

- Trade ID: `3`
- Final state: `Settled`
- Transactions:
  - `create replacement-path trade`: `0x73f6512b5ba8735873529eeaa1a1643b73c523e2704cd62d68d8bd3abafa8e26`
  - `seller posts replacement-path bond`: `0x2dd48ec3936ecc16ff529a627deea6ac0436daee915124953f47faf6477e45d6`
  - `commit replacement-path item fingerprint`: `0x9050c6231e944733fd849b41b6eee57580d1bace4e3bd68aa308211f31ffe37b`
  - `commit replacement-path inventory lock`: `0xe3a6f90e5f305bec422ec1fb027adbdd7b52664467be5c41631ae8d73fbcbcd9`
  - `commit replacement-path route`: `0x350225d0f315dc2b3f9f784bebb0c18e5ea63b1c548ffbc2931bf5d81b9ec59f`
  - `mark replacement-path delivered`: `0x93b6b3d7a6af6e87c444dd24bd941194cb6c4dc6b0bae55bbedb311a13890fa0`
  - `open replacement-path claim`: `0xaa9c40b8dea1191a2e8a69d9fe147d49d4767f49af41851c57b956acab66c658`
  - `revoke original arbiter`: `0x88fbf1612c569d61cd42694f33d152633214bc9f58ccb0f9cf9dceed6ad6ce52`
  - `buyer proposes replacement arbiter`: `0xb0bd3b1cca7cedec78ad0cc89f5712fcf79cb98adc79529cb60ff3684a9469f6`
  - `replacement arbiter accepts emergency handoff`: `0x4f7c67f5911c6f3bc526236db75866086bfb883317f3b5aad453c8ca3fce4ea2`
  - `replacement arbiter resolves claim`: `0xe5909aee212afddb5fd43b722efdad11f1f1d2b6e167759d0a8c4479568f3bac`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_item_fingerprint` `0x8dcd9aff7eb44b0607f46f0cce9c9fe62bbb9697c88aeec63d27b755b6e9e36b` (marketplace.item_fingerprint.v0.2, valid signature)
  - `replacement_inventory_lock` `0x94aced309e0e65e1ea3ebcd2ed6975da1e489daec55776ae442cfbabb2a5bcc7` (marketplace.inventory_lock.v0.2, valid signature)
  - `replacement_route` `0xacd43897e24072fa669d9ed71da1af9e80b2c086dfbf89c85be310e90f7e3dba` (marketplace.trade_route.v0.2, valid signature)
  - `replacement_delivery` `0xb4af7959206447b647a1e1992dab06275978d961b741d5167aa5ae41628cd5eb` (marketplace.delivery_evidence.v0.2, valid signature)
  - `replacement_claim` `0x6719e50f76acbad1421ebab940347add42823dd76a235059b467297950d3c3f5` (marketplace.dispute_case.v0.2, valid signature)
  - `replacement_buyer_approval` `0xbe6571dfe8364b3c89836d2942df541681017b0961b3aeee06cf6721a7edfde1` (marketplace.arbiter_replacement.v0.2, valid signature)
  - `replacement_arbiter_acceptance` `0xbe6571dfe8364b3c89836d2942df541681017b0961b3aeee06cf6721a7edfde1` (marketplace.arbiter_replacement.v0.2, valid signature)
  - `replacement_ruling` `0x5ce46e0f09cdf01ba5d16046ddf48bcd097b3115e58e127e218a296eee6813ea` (marketplace.resolve_or_claim.v0.2, valid signature)
- Observations:
  - Anvil clock advanced past the 1-day emergency replacement timeout.
  - The original arbiter can be revoked without letting stale authority resolve.
  - If the seller does not co-sign, the case still has a liveness path after timeout.
  - The replacement arbiter must sign the same proposal hash before taking over.

## What This Proves

- Off-chain protocol objects can become deterministic hashes that the money rail can enforce.
- Actor packets now carry EIP-191 signatures from registered controller addresses.
- State-moving packet hashes now require on-chain actor signature verification.
- Duplicate packet hashes are rejected per trade, including replayed evidence.
- Seller-signed ItemFingerprint packets anchor the claimed physical object before inventory can be reserved.
- Verifier-committed fingerprints require buyer approval scoped to the trade.
- Seller-signed InventoryLock packets now use a binding signature over the committed ItemFingerprint hash.
- Active buyer fingerprint challenges block route commitment until the buyer clears them with a signed packet.
- Verifier and arbiter authority are explicit registry records with metadata hashes.
- Revoked arbiters can be replaced by buyer-seller co-signature or by a timeout-gated emergency handoff.
- PrivatePredicateProof packets can be gated by a registered verifier contract before escrow accepts them.
- CircuitProfile packets reserve real ZK verifier hooks while the alpha uses a local stub.
- A low-friction happy path can close without over-asking for seller attention.
- A risky new-seller path can be made acceptable through bond, packet quality, and explicit gaps.
- Claim resolution can emit a compact on-chain ending while preserving rich off-chain evidence.

## Still Not Proven

- DID key rotation and delegated agent signatures are not modeled yet.
- Verifier conflict checks are registered but not independently adjudicated yet.
- ZK proof bytes hit a registered verifier-contract hook, but no production circuit is verified yet.
- Stablecoin/ERC-20 escrow is not modeled yet.
- Multi-agent negotiation is not connected to this runner yet.
- Fingerprint challenges are buyer-gated in this alpha; verifier- or arbiter-opened challenge rails are not modeled yet.
- Semantically different item fingerprints for the same physical card still require verifier scrutiny, richer matching, or issuer attestations.
