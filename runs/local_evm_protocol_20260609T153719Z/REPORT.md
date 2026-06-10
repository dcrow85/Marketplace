# Local EVM Protocol Probe: local_evm_protocol_20260609T153719Z

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
  - `create insured trade`: `0x64dc691aa9166ccad383605318d926d12ba50c3f6b6d761241a76cfdb68cb2f4`
  - `seller posts bond`: `0x0860f13d5554349de133199c390c575f659d9891bafc2d8e745a3209ebb555fe`
  - `attach trust proof`: `0x8305e9de28418edbe48ae7093ff9a56afca389d07b4308b2345779236c303017`
  - `accept seller private predicate hash`: `0xbb250a1293bf314d9c296b3f79cb76cd6c5b158737c954122fb835c75c6aa340`
  - `attach seller private predicate`: `0xc203183b8f1d6132f54b5da48357462e40b967acecbe2e15dc7a65b0b1e1e4ab`
  - `accept buyer funding predicate hash`: `0x087eefeb9b4e77623ab8a2fcfbf3df3ba7beaf3488724987d5839a2211646d6d`
  - `attach buyer funding predicate`: `0x4f45da75489ab290298eb78ac8200fcfec7ce339838903bbe449fd838a231614`
  - `attach item evidence`: `0xfcb73bd6f3b86ab3683562a4b673ec0583d65f6a62c0b54e282283c5df0ba3b2`
  - `approve verifier review scope`: `0xc5ad51895315ce440af065efa5b86aa3d3170281b0ae27ac02b47152de5f26cd`
  - `commit scoped verifier review`: `0x9f80040abac52f7808c7fb814222749b73112c18de64be6a3889946ad10e5e01`
  - `commit item fingerprint`: `0x9b8c78306c7ceae3c9487977802171825c91cb10a250d6bdbb01b5190612bb90`
  - `commit inventory lock`: `0x3fb20994dab2260ef01c079f57aa2a949051f0495fa07413c9753a93c1c4e419`
  - `commit insured route`: `0x49a1ebf2d2090a0d1f37c516b5da47de2ee693d0b7bc7adf5b838c84ce48bc4a`
  - `mark route in progress`: `0x256b0f1f0e8b9bae23211975125df91bfcb901543b604c5a780c292e780ec9c8`
  - `mark delivered`: `0x8ee282cb1c9bb97535d1610c61315d8786d382df1afb79b4e9c601d0c84dc54d`
  - `buyer accepts`: `0xfecd4f537046d2d06f32239bcffbc6ca30505171c72af0b8fbb6cd2e325a6345`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0xb39ae7bb0f70910dcc7cbd998f364ec329345f47f142dd25e05011238f26f7a9` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0x421fd829fe02fbb4ed4385b79de9065e2b930de0093dfaa988a9e8b4293d0395` (marketplace.evidence_manifest.v0.3, valid signature)
  - `happy_verifier_scope_approval` `0xf16c10d26d9be0f8881d6bdc9ce86a92207226551ff9c250ae0fed48b265424f` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `happy_verifier_review` `0x2b17dab932fa20ec076e878b42161f2f5cabf5477820dd6214f5394460e83b9d` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `happy_unapproved_verifier_fingerprint` `0x9be4b41518a3f02c38ab04a23a5404a5e4c840be118bada4f82bf73acdf4a752` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_route_spendability` `0x93ba37f1d96552bdd732b2e2fa5ea50a0d94a9cc18b757e31cc6f75e3584832d` (marketplace.evidence_spendability.v0.1, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
  - `happy_delivery_spendability` `0x72863b960a9645284b05b1e8ac3dc48ef3c197765c81a4f437a7ba9562b99ed1` (marketplace.evidence_spendability.v0.1, valid signature)
  - `happy_delivery` `0x61d65d4a617114f5a2bf5003000124c34d5ec625c58d817f9c4cd5b766b9e9d1` (marketplace.delivery_evidence.v0.2, valid signature)
  - `happy_final_receipt` `0x5154efb32d52def53079b00ba5d5f156656ccd33e52838fbfdc4238cb443ddd8` (marketplace.trade_receipt.v0.2, valid signature)
- Observations:
  - Item EvidenceManifest v0.3 validated fixture bytes, subject hash, and asset root before anchoring.
  - verifier cannot attach loose review evidence reverted as expected.
  - happy_route_spendability spendability accepted at route_commitment.
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
  - `create new-seller trade`: `0x411fb0e67a2b1eaf2d70445cc5a2e94dfcc87cb7826301d7f69e302371a6feee`
  - `seller posts larger bond`: `0x9711c76a06d16dddedac7df2c4fbbebdf140aeead716b518e27e6e8222db5657`
  - `attach weak proof`: `0x4f1a1ebdcdc85169569cc01ad63750a78ba7fa0404b47581543fcd63c6715efb`
  - `accept claim seller predicate hash`: `0xe74c943e3cad8a7dae7031bc0780d1c9453964703472793399a3e7e62e894e01`
  - `attach seller activity predicate`: `0xc7719561211e0f8813f17a346446697499f8f322455b56b6da1b3fb9ab811ab2`
  - `attach circuit profile hook`: `0xc71c1997edba9238d4594dd4eeb0f067b72ccaf81ead12a8b487016755a3f21c`
  - `approve claim verifier scope`: `0x467cbbd6e05b88cb6398be8e1e84195b2606079c9b1bd716dc9c722604c949c1`
  - `attach sparse evidence`: `0x4db6c440dab3d63935be593ac454151f367216999aac2e4336b9b485f542d83f`
  - `commit claim item fingerprint`: `0xd1eab1edde38a999392078f81822181620bcd9934ee0a53905c78a350a173f70`
  - `commit claim inventory lock`: `0x798908a85775a9eceddf321cee0620d21cec0189c260a8424767a9dfba508eaa`
  - `open fingerprint challenge`: `0x23696f08d4c071542cf67ca1d61120ede87bf5b395a99563d7c380bd125d3df4`
  - `clear fingerprint challenge`: `0x3ee740b1498b335b92018eac7f0818fcd12643dc5d4c7ce15747b9f26b392dab`
  - `commit uninsured route`: `0x8fe35f8a400b6f675bc1e3904f0f6cee748a82044bf48b6a72e4601fbb440756`
  - `mark delivered`: `0x60ff510f8378d607c2ea0b7203bbb44a3bac92a014ca8f3a7063c1579faba685`
  - `attach received-item claim evidence`: `0x167961cd9529b6a86b0ca5d673d85c0dda9db914c6df78cfd6d2150ef6b741c4`
  - `commit verifier claim note`: `0x2998e1ce42ad448b380eb942ef051b0469ec70c8ede7868cf1d2cf4f31c1caac`
  - `open claim with buyer dispute bond`: `0x24f3908286128f76aee4e09266db306c744a62d4d3715b6dbf10cba32bd288c4`
  - `arbiter resolves claim`: `0x81109aa28f4f47a7bdc6790d671536c1e262ead15c0155f4e39e672900eca638`
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
  - `claim_sparse_item_evidence` `0x599fac8db1af1a644805fc49e45acd7c22a4a5769585bcbe41b12f74e6b7006d` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_verifier_scope_approval` `0x1f7af25a6c96908eef75b731f6c4abf8c58b7664235e7a7f02fbf12fee6a8176` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery_spendability` `0xaf5ef8c5b5e73ac3212413976e4775ca1aca12f49e897ee03c198524573ad223` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0xa574b165ea43f4e8481dd4023a2c147eaeba4552d90cc71bdb794ef6fc68fd8e` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0xc2622fd48aae0ef1d76e0a33b749e022002ac9ea44db924d31d7910b88cff869` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `claim_challenge_clearance_spendability` `0xa47eb239a082af6bcee93a01dc0aedf660c6e3a2500bd039e67caa512624df5b` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_route_spendability` `0xcd4f9ba87a679d044db3043bfed5e0aca3b9165e20fda54fa4da20ae57a42f66` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_support_spendability` `0x75777ba1cabba208578339f8f9d8758718ac938f495132f81dfd3e8ad26f5360` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_bond_action_spendability` `0xa0c362430b0c62d60bd7314af61b196927a84510bf156adc0ed44bf8036597d7` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_ruling` `0x30bbb5ace10e30f52951b865de73469de9f747a111e122e46ac1086f3e95bf3c` (marketplace.resolve_or_claim.v0.2, valid signature)
- Observations:
  - Seller item and buyer claim EvidenceManifest v0.3 packets validated fixture bytes, subject hashes, asset roots, and claim retention before anchoring.
  - commit route while fingerprint challenge is active reverted as expected.
  - claim_challenge_clearance_spendability spendability accepted at challenge_clearance.
  - claim_route_spendability spendability accepted at route_commitment.
  - claim_support_spendability spendability accepted at claim_support.
  - claim_bond_action_spendability spendability accepted at bond_action.
  - A brand-new seller can still clear the trade by posting a larger bond.
  - Weak trust proof did not need to become a scalar score; it became an explicit gap.
  - The claim packet and ruling hash give the agent a clean evidence trail after settlement.

### revoked_arbiter_emergency_replacement

- Trade ID: `3`
- Final state: `Settled`
- Transactions:
  - `create replacement-path trade`: `0x9a83cd8ad9eae17e8043a861c0e52c52a412bd3601c6732ede32ca7ae115cb81`
  - `seller posts replacement-path bond`: `0x04a2d2b6861b9f27e37c9b40b68537a08544b459100f93692f18fcabe9700328`
  - `attach replacement-path item evidence`: `0x53919241ac4ae30582fd721188c2e84508be5bf1df4f2dffba71a0729c47d350`
  - `commit replacement-path item fingerprint`: `0x1bcd561bd8482d87d5223fb649278c5bbc781ec3c801f89d64f81e923b01ebdb`
  - `commit replacement-path inventory lock`: `0x392a7985c846f1f71be000ef2d7b8ea1993a0e05546cecdabb6151f8af22238b`
  - `commit replacement-path route`: `0xf1a31a8b2154478c54d2b98c68e393ca4607cf4c8e62fc6fee7d949e682765f5`
  - `mark replacement-path delivered`: `0x6d205710ea65fff51945fe9e57a0bddcd68be869df56740aacad0246208db573`
  - `open replacement-path claim`: `0xefb9b1fabd41195c5bfdcd9b2f256636c040149c57db77cd3925c521b35a7d0d`
  - `revoke original arbiter`: `0xa250c7b68944a1e3462a998421a71375319ffbbbef06c4dbf09cbf02afde6591`
  - `buyer proposes replacement arbiter`: `0x7d7cc7b8160bb510a5761e846884a92549eb65f194bc4720c5c917611ef0ccbe`
  - `replacement arbiter accepts emergency handoff`: `0x248e55ed505d48c39e82aedc5ca007163f46a9fed1a5c51c5a95ae28f3887074`
  - `replacement arbiter resolves claim`: `0x2db799603937845913204913327d128549c3beeb5bda2e18ee3be6eb22554abb`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_item_fingerprint` `0x8dcd9aff7eb44b0607f46f0cce9c9fe62bbb9697c88aeec63d27b755b6e9e36b` (marketplace.item_fingerprint.v0.2, valid signature)
  - `replacement_inventory_lock` `0x94aced309e0e65e1ea3ebcd2ed6975da1e489daec55776ae442cfbabb2a5bcc7` (marketplace.inventory_lock.v0.2, valid signature)
  - `replacement_item_evidence` `0x203c34debf815af23367b309a8876a5051f9b1c785de63fe954a3945e32ac258` (marketplace.evidence_manifest.v0.3, valid signature)
  - `replacement_route_spendability` `0x64a81995a5939671fd084b7b1036c02cf7fb4769c86461cf4f7f10f997a03e11` (marketplace.evidence_spendability.v0.1, valid signature)
  - `replacement_route` `0xacd43897e24072fa669d9ed71da1af9e80b2c086dfbf89c85be310e90f7e3dba` (marketplace.trade_route.v0.2, valid signature)
  - `replacement_delivery_spendability` `0x665492e32d9b1d814fa07c32c37746784a2220e11ab17b5f4430319a7cab0ae9` (marketplace.evidence_spendability.v0.1, valid signature)
  - `replacement_delivery` `0xb4af7959206447b647a1e1992dab06275978d961b741d5167aa5ae41628cd5eb` (marketplace.delivery_evidence.v0.2, valid signature)
  - `replacement_claim` `0x6719e50f76acbad1421ebab940347add42823dd76a235059b467297950d3c3f5` (marketplace.dispute_case.v0.2, valid signature)
  - `replacement_buyer_approval` `0xbe6571dfe8364b3c89836d2942df541681017b0961b3aeee06cf6721a7edfde1` (marketplace.arbiter_replacement.v0.2, valid signature)
  - `replacement_arbiter_acceptance` `0xbe6571dfe8364b3c89836d2942df541681017b0961b3aeee06cf6721a7edfde1` (marketplace.arbiter_replacement.v0.2, valid signature)
  - `replacement_ruling` `0x5ce46e0f09cdf01ba5d16046ddf48bcd097b3115e58e127e218a296eee6813ea` (marketplace.resolve_or_claim.v0.2, valid signature)
- Observations:
  - replacement_route_spendability spendability accepted at route_commitment.
  - Anvil clock advanced past the 1-day emergency replacement timeout.
  - The original arbiter can be revoked without letting stale authority resolve.
  - If the seller does not co-sign, the case still has a liveness path after timeout.
  - The replacement arbiter must sign the same proposal hash before taking over.

## What This Proves

- Off-chain protocol objects can become deterministic hashes that the money rail can enforce.
- Actor packets now carry EIP-191 signatures from registered controller addresses.
- State-moving packet hashes now require on-chain actor signature verification.
- Duplicate packet hashes are rejected per trade, including replayed evidence.
- Item and claim evidence now enter the E2E as EvidenceManifest v0.3 packets with content-hashed assets, subject hashes, and deterministic asset roots.
- Seller-signed ItemFingerprint packets anchor the claimed physical object before inventory can be reserved.
- Verifier-committed fingerprints require buyer approval scoped to the trade.
- Verifier review packets cannot attach as loose evidence; they must enter as buyer-approved scoped attestations.
- Scoped verifier attestations are bound to an anchored subject hash, scope-set hash, and method-id hash.
- Seller-signed InventoryLock packets now use a binding signature over the committed ItemFingerprint hash.
- Active buyer fingerprint challenges block route commitment until the buyer clears them with a signed packet.
- Signed spendability packets are checked off-chain before route commitment, challenge clearance, claim support, and bond action.
- Route commitment now consumes a cited spendability packet hash on-chain before the route can lock.
- Spendability now references EvidenceManifest packet hashes and manifest subject hashes, not legacy loose evidence packet hashes.
- Valid manifests and tier claims do not automatically become spendable; gate permission is a separate packet.
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
- EvidenceManifest v0.3 uses the local EVM packet-envelope hash in this harness; no Solidity `evidenceManifestHash` helper exists yet.
- Solidity consumes the route spendability hash, but full EvidenceSpendability schema validation still runs off-chain in this harness.
