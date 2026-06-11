# Local EVM Protocol Probe: local_evm_protocol_20260611T165254Z

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
  - `create insured trade`: `0x5ff51d662a9b3573fb1cac3357e29c78673de6e5bb2abd7ac64dd7ee3043d715`
  - `seller posts bond`: `0x05afecc82720f65ae82483073558b7fdb68cd32e192834d974b7b21ec1e14484`
  - `attach trust proof`: `0x0c06402eff7c7289fd755da064f8315eaabb0bae7acfedb9d8b93fcb952d674f`
  - `accept seller private predicate hash`: `0x3a96963574d2a5daa84ed06ae844238fe2f743ecea7ef04b9dae77fdbaf10094`
  - `attach seller private predicate`: `0x46cef5660f5613e07f74a6c82366cec555e1959414d0e4156a84b5aa9fb4a7eb`
  - `accept buyer funding predicate hash`: `0x5ea95a93f6b9c4ec1ec0ea2438a8d9802603fced9ea89f2b044c36188fbae55b`
  - `attach buyer funding predicate`: `0x3ea88d42c42930069dd839cd554ab50c49df6165c2d878fa2d3a2dfe770b5bdb`
  - `attach item evidence`: `0x44e5bd665eb598229d7dd69b93c715f1987d62130825cde1b068e3471380c19a`
  - `approve verifier review scope`: `0x246b7529b72cda93581f1aad6c4dfbcf677e045daff147d27e16e451cafb9158`
  - `commit scoped verifier review`: `0x574842f90c79732af20a58b5c467502e6ab5c61a0dcca17297be4e78a38d59e8`
  - `commit item fingerprint`: `0x6bc37c1d02d932a6db3a5b8870b957d822eb0461c051966c020226319868b24f`
  - `commit inventory lock`: `0xbb0accc47b12bd746012ef4a939bbedb71dabc8149cb8a69aca4b4f62090ecdc`
  - `commit insured route`: `0x521a05341f925ced312d9083e23c4ca8d7fb0202eb9a00f665b1141191907088`
  - `mark route in progress`: `0xc703684c59ef2ca57a411b4ce9a84204937bd274d5f5cec9eb5525bdbcbc4f30`
  - `mark delivered`: `0x3cc2aec38672cc47b3e7b30372b3b4ed02f7f48b491554c4af52c93c56c9df03`
  - `buyer accepts`: `0x8b2c11211ae93a839a781985a1d060a0a8e3762166569c13a8175b368f2844b1`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0xb39ae7bb0f70910dcc7cbd998f364ec329345f47f142dd25e05011238f26f7a9` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0x20a5efa5b271e48ca55c72b7723c8b6a87c61c6bd0429488b831ba4dc76028b3` (marketplace.evidence_manifest.v0.3, valid signature)
  - `happy_verifier_scope_approval` `0xf16c10d26d9be0f8881d6bdc9ce86a92207226551ff9c250ae0fed48b265424f` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `happy_verifier_review` `0x3fb6041f444f163a45a7c4d72574b07b73e5578cb77a744aa878cffac748b08d` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `happy_unapproved_verifier_fingerprint` `0x9be4b41518a3f02c38ab04a23a5404a5e4c840be118bada4f82bf73acdf4a752` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_route_spendability` `0xa0ce8b1915f2233dc55d900a7902ea8466b2768f096c5682f20b54ade41c7ca5` (marketplace.evidence_spendability.v0.1, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
  - `happy_delivery_spendability` `0xc4e0d439cf382109d9c208a270f095c1f78f98095a2fc279b9743d316a8eb0af` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create new-seller trade`: `0xcc923731dc9636dab095bbdd34a16ae2c9061427ec7e98e8c774cd6e8d3ff848`
  - `seller posts larger bond`: `0x719fc073aa450ff441056578650aaaf6268536ea1fc871e9526cd44c40d7cbc3`
  - `attach weak proof`: `0x352ef7a29bbb4ba79dfb9dde20286ea591a1613ce8d5816d0460e2959183433d`
  - `accept claim seller predicate hash`: `0x4be3e97b5ec0625606ba4b2b382e338ff188cb49c8d0a8f0fef4b77d1090824c`
  - `attach seller activity predicate`: `0x9a53277621424f4a0e06ceb3847f46ae83a516cd1858fc355f717c03b25a55a9`
  - `attach circuit profile hook`: `0x28cf271dc75e0c9ad1fc0bf40ff7fcc91a165d0945f848fb097c88c34b6f02c4`
  - `approve claim verifier scope`: `0x20fc6c7550fde17eb871f6121ce9f3a87982867c09cb514cffa7a464590da7ab`
  - `attach sparse evidence`: `0x5bdebe77f1bd128f2a1fe0dab9d6ebc4e9d83ba1d71a3c301c7882b2be8983d8`
  - `commit claim item fingerprint`: `0x7265d799500981ce45ceadffa6d97dd42210c52e8713106f456752be241ebbe9`
  - `commit claim inventory lock`: `0xcc3aebe42730f67ccca98bc188208ee807be274c8b2333674e153dd80c2aaa54`
  - `open fingerprint challenge`: `0x2602456182f1fae57b088b8977334c3b6860e250b84d3cb647d40fc9f3fb0c13`
  - `clear fingerprint challenge`: `0x453c14c4dea87c99810954e259a93e84efab820a318eb8e6a38c35a41663b5e8`
  - `commit uninsured route`: `0xee26725c736abea758c4a6fe3be868c0ed4020b77aa0fbf10b183128693c24de`
  - `mark delivered`: `0x27703c42715773c7ed002b5df0c95433c3e8844ca97404311e3c80887b35ffc9`
  - `attach received-item claim evidence`: `0x6290fbb2c6dae315aa32be4e8ad3c10f66c2100dc5c8d16fa9c721a34643304f`
  - `commit verifier claim note`: `0x8362c2a458cb55bfeefe94a3fb3c710fb6833c0e45555ca92ee3b87f4ecaced8`
  - `open claim with buyer dispute bond`: `0x1412796bcfacbc452306509a8befe816fe5cee850ed80ca64226300735723d6e`
  - `arbiter resolves claim`: `0xa2db9e5713117e46b5d42b07b4af7cfdf156b11975bb7eb94eeca2439e22eb97`
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
  - `claim_sparse_item_evidence` `0x65184b8502da63de901d2d054eaba8f08133c25dbcf9500d55f72b4ccd5288e1` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_verifier_scope_approval` `0x1f7af25a6c96908eef75b731f6c4abf8c58b7664235e7a7f02fbf12fee6a8176` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery_spendability` `0xfe19815bb5e6f947b805883a267756e431b70139b6a9c0d4019f073171e22f5e` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0x4496a279bcadb8501849db65af250427e7b7d8244f6c890c038e701fcb938873` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0xd78d48df2bcd1c9176e98b2ae82d065c2d5e7a0b87fe82a49fd026dfeed9c6ef` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `claim_challenge_clearance_spendability` `0xedd61cd7ce4f48c777846dfbd6b4feaaf57b396ed81e4a4945a78ee8b8c60d66` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_route_spendability` `0x231d59614ad74b5eb8679ed218093e89abe413a888e4a9ab649a80167c15d7a9` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_support_spendability` `0x486fbaec9b3c7d4b24fbd3f8a25d9e5de1d77fda82521493dbaf6ca8b9116260` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_bond_action_spendability` `0xdf6e983d49fe8d1eb3f9ba7128625523302cce54977bff4cac8a47a5f24d2bd6` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create replacement-path trade`: `0x7114fc67ba405ecc32b8df5231fea90b54075ca97b6e95cb0c95119689c98173`
  - `seller posts replacement-path bond`: `0x0d4a267cd815a206826f6275ae472b5a72ef2f113e20fdd997800fc7ed54309d`
  - `attach replacement-path item evidence`: `0xd72d7eebaa8d4b778cf2d849b08a1c532c8ea6f586a2d89181e8674f3a07d481`
  - `commit replacement-path item fingerprint`: `0x9a5712d669f5e8d9fee0325d959ff2edaf45323f6d059fa1b4c6a04a2b06c8d0`
  - `commit replacement-path inventory lock`: `0x83ab1d051a24382301800787113e7dafc967aad9105a35514aa22ae4bf4a03f4`
  - `commit replacement-path route`: `0x62301f61a33149db0ee18ee8a31dc8a9db46ea10a9809ad5a83c0cb5b8525bca`
  - `mark replacement-path delivered`: `0xf475317b2e3160cc2c7658e57ef6688955a4cec0948a8a3c3f81b29d99b87a52`
  - `open replacement-path claim`: `0x623a72705f0e2a08aaf9735539184f1d552bde98b2a05bf57ecb887f1e7fb53b`
  - `revoke original arbiter`: `0xd4e2fa08cd5a6779f47fd0a0787b3ecfd2dbe0c45ea3242e7b760aaea6ab86dd`
  - `buyer proposes replacement arbiter`: `0x8ffdfc3c058b0cb194f84a7943c497e29d1309d21875d5f14df81bfa4b92b1e6`
  - `replacement arbiter accepts emergency handoff`: `0xb8f64a44316260481ba38a3c62f453f1aa17f8d5b5a9e11fb8deb2dd76d266cd`
  - `replacement arbiter resolves claim`: `0x5e2f8e116de9aad3e687cacec25a31264230713efdca82c7079d200229840ddb`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_item_fingerprint` `0x8dcd9aff7eb44b0607f46f0cce9c9fe62bbb9697c88aeec63d27b755b6e9e36b` (marketplace.item_fingerprint.v0.2, valid signature)
  - `replacement_inventory_lock` `0x94aced309e0e65e1ea3ebcd2ed6975da1e489daec55776ae442cfbabb2a5bcc7` (marketplace.inventory_lock.v0.2, valid signature)
  - `replacement_item_evidence` `0xaee3eadeec7e2f8a18054b86346c98b5f1d65506df021dbab35cd2fd570a7fdf` (marketplace.evidence_manifest.v0.3, valid signature)
  - `replacement_route_spendability` `0xa9a611b0831e9007fa55478873d26d6ff92536b047e55eca06f0d79f2b85430a` (marketplace.evidence_spendability.v0.1, valid signature)
  - `replacement_route` `0xacd43897e24072fa669d9ed71da1af9e80b2c086dfbf89c85be310e90f7e3dba` (marketplace.trade_route.v0.2, valid signature)
  - `replacement_delivery_spendability` `0xd240fc7f817841d09dbefaf7f8f73844fdc553590bd7f974823191d326afc3d0` (marketplace.evidence_spendability.v0.1, valid signature)
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
