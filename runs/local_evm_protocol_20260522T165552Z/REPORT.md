# Local EVM Protocol Probe: local_evm_protocol_20260522T165552Z

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
  - `create insured trade`: `0x6fee46c825444bb876c1c9a8c306847d2b1d4e33f70f443a5ba974308d9df003`
  - `seller posts bond`: `0xab1f21085552f17e95cd5476641ebe51425b7c561c6df60137d183971420401c`
  - `attach trust proof`: `0xeb12dc38cfa7d0c8297e80347f32ea723acb4abec59d364a7430587eb1b37473`
  - `accept seller private predicate hash`: `0xbca48d35e010f84f042505611df2e48fde6f5fd55bbbb38a0ff9235f3b0ca61b`
  - `attach seller private predicate`: `0xff1be687ba16f9a9596512c5aede43fcbf4977e840570cae08bf59fb6bd92c43`
  - `accept buyer funding predicate hash`: `0x08d827805e938397b1c3102862b267060ccf427085d7307e7fe48becad19e990`
  - `attach buyer funding predicate`: `0xfee236cd505b2501c00a6956945ab2074fa8548004e921d28d3c5ff73982e6b7`
  - `attach item evidence`: `0xc18aa3efb5a19d30f39f0e90526f1302ed9abed290515d6220b288cd3b6f5b52`
  - `approve verifier review scope`: `0x1a23d06a94493f0019676af0c46c41599feb7b8cc95179511c54fd5d12f4a556`
  - `commit scoped verifier review`: `0x19f570f872fe6485042ec6508a8d4f4e4f329a1300c8acc73a6e38c8f408aed7`
  - `commit item fingerprint`: `0x6b6f42fda32f1adc92cdd494970bbd3b7d953d484ac6188cd192c8b919288ecb`
  - `commit inventory lock`: `0xa5582a829abc4cc7df95ea259e4470d4cbd48b23de5ae6df3610c5ed2a31a7fe`
  - `commit insured route`: `0xe5b987f16c713b824af93bbf511075b69698f578d5c96eb9aa2e458ed7abd96e`
  - `mark route in progress`: `0xb3d28cb59a51cb92d5baa8c4afd53a5a957399d1557d7f1227e8cec82ed5ccd4`
  - `mark delivered`: `0xeb26b99d484c391c23467b4755eabe7736e142a33453f41dad6a50b2157e4b47`
  - `buyer accepts`: `0xdda81d452d81ceb7ec86ccaf1932d53546582c6b61929050cad0bc930e2ad275`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0xb39ae7bb0f70910dcc7cbd998f364ec329345f47f142dd25e05011238f26f7a9` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0x42a8bd936de5c3b3aa25f1c781133d478388c0c960a3edff086e8af12447f67b` (marketplace.evidence_manifest.v0.3, valid signature)
  - `happy_verifier_scope_approval` `0xf16c10d26d9be0f8881d6bdc9ce86a92207226551ff9c250ae0fed48b265424f` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `happy_verifier_review` `0x125cde4d8c13b7b47ce3f584937920fdb4fcb6b65578a8c12dbc137597deb4d6` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `happy_unapproved_verifier_fingerprint` `0x9be4b41518a3f02c38ab04a23a5404a5e4c840be118bada4f82bf73acdf4a752` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_route_spendability` `0xdd5cce1df05b57e89428e9719c16a33bd3d2b2da06b656068361eda8fda3bf06` (marketplace.evidence_spendability.v0.1, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
  - `happy_delivery_spendability` `0xc24155a534b24f2413f36bd6b290c76ccc6aa7c2c5ced0eef43bed8c9bb86d4f` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create new-seller trade`: `0x6b563ba9448138e78441fb48202c4abc534fca1ad6cc3916d958f36d4d553e55`
  - `seller posts larger bond`: `0x72aaddd7afa9ef40e7769c8b2913a147fa17412061cfd96c7049c050ccfac6f0`
  - `attach weak proof`: `0x3fa710672e1de7baf2ed7f36a7561958f29023025d6a534aa50612f503b1864d`
  - `accept claim seller predicate hash`: `0xee89f1c476ceef97bfd8c71775818b5c0e5b44d9551cd9a12c8f1e9b5f400346`
  - `attach seller activity predicate`: `0x2d4de7ef6ed251c21ad51254e15d855cb0f66320af0f87a42911cc7f220b9460`
  - `attach circuit profile hook`: `0x7547f301a803b9fbc59dd4a707e98ecef011a29f4ebc6b966dad1146cce6b09b`
  - `approve claim verifier scope`: `0x764a3bea86913cf37a0bc3220def6cf634770f7b6fd7fdf4c6dce0db2e2b6df3`
  - `attach sparse evidence`: `0xdbbbc0e25d287fc92bf6387ab0ecc572841aceb9d0e330ef85519f7550681c63`
  - `commit claim item fingerprint`: `0xc08b9b2af591bc4ead97f173c39505e00c5a81302eea83a1b08ef3ef5ddb38b2`
  - `commit claim inventory lock`: `0xabec6a53944b13e94fbbf77b957d032d33890c6e1a73013a2731a90e1db6f9ae`
  - `open fingerprint challenge`: `0xdacc4039e3bd829dec59634482250d242b93f7dfbb762e78ec622f3aa33e3cb3`
  - `clear fingerprint challenge`: `0x99022442f71efdc5bad8dba58550795d1ace3378637ce09e2bc3b97a06b2d2fc`
  - `commit uninsured route`: `0x351d5c8262f4c7271c56466b80b34cc489f24148bfd958b0f8d1a422d6d3869d`
  - `mark delivered`: `0xf4558dceac4ed5cc25b9bcd26270072ded41c654c289c01367f74a781fd5c740`
  - `attach received-item claim evidence`: `0xa5a7d2a52e4a3f9625e94dd5a31342291c61ee61d8f897a19176fa3228e8b659`
  - `commit verifier claim note`: `0x5b39862832d92b0a232bd6e26e165e0904151969e81323c30db1ecdc0e231bcc`
  - `open claim with buyer dispute bond`: `0x3fa7068a1c39d81193e6e1c06b7a198ece186942d6ad878750a1104654560c7d`
  - `arbiter resolves claim`: `0x7d8c4bba4013e25dfad076a7e52481438f3deb976ea5506018c41a51c32b43b3`
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
  - `claim_sparse_item_evidence` `0xa80fd97381895e48703609069e842df77add6ce74e6be774fd2bf4702a33004a` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_verifier_scope_approval` `0x1f7af25a6c96908eef75b731f6c4abf8c58b7664235e7a7f02fbf12fee6a8176` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery_spendability` `0xc60546808052ae0a3dbb4f5bfa76a0dea13de3b4f0518c9e8520feee66fda86f` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0x564233b386811c861652dfe3e385df7f7be19fe38edb97ed57eacdf087bccdc9` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0x4aa5babea7140863be3186eac1c22b889f372fc5ea4d8c67cfbb4725bff3a3c4` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `claim_challenge_clearance_spendability` `0xb894ff9394b93256823a8909fdc59ad233e642a8ef7fa55632ce92cc05433b3c` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_route_spendability` `0x85db3f3f1b96a764c894a668fb09099b6a064ae0af1082338561a5914a236450` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_support_spendability` `0xe3a96c76695126fd4c7a9436bc9675f9fd7560ed0870cccb9f22a557197c33ff` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_bond_action_spendability` `0x23ed03a9be843cbd5f997444f4bbc6eb40d84a311112620395bd0ae40d325e80` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create replacement-path trade`: `0x260f544b2de16352e50e0f01dea1dc139fc53dfb4cdd7dee7864e5331847dc2b`
  - `seller posts replacement-path bond`: `0x88a2d16a6a5da119649c782b29afbc3144e4ea76d78b1d58ef1488e3cba58ceb`
  - `attach replacement-path item evidence`: `0x70220991d77bec2499a9c1addb601ae582910d0c836f74d298dbb45be60b937d`
  - `commit replacement-path item fingerprint`: `0xb8e5aef56e025116b1d832e250e7677c047ab1c71752bfe95946309c6d3a3f0d`
  - `commit replacement-path inventory lock`: `0xcc45bbd88722cafc0f213ad0b3f14ef0fab13301afd093f4a369f5a3c2ef4950`
  - `commit replacement-path route`: `0x16356a081f054461ebb7a76cf157635a840e018f59ca95bfe787f0aab8cfd373`
  - `mark replacement-path delivered`: `0x40011370a9a327d21f7ea860dd8806cde533a91bfce298184f179b8ee6599aa7`
  - `open replacement-path claim`: `0x54ed9799014ee91839ffe07195444009976183f6e9d91f4d219fc6ec03e1c650`
  - `revoke original arbiter`: `0xc27f48023031d0954e37956733412a532b1173aa77af7612d28911a82ea2ed0d`
  - `buyer proposes replacement arbiter`: `0xc9fde487365432fa551a25b326deed3d20a258f314247b8e17573d3c32988e4b`
  - `replacement arbiter accepts emergency handoff`: `0x04c88ea712c33d38a13c08802ec28492f149198a44aa7a56bf10b1668a553f3a`
  - `replacement arbiter resolves claim`: `0xd88935954a109e294b6b346c6a99136898c94c1d09fc087736393cad3f5fc0a3`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_item_fingerprint` `0x8dcd9aff7eb44b0607f46f0cce9c9fe62bbb9697c88aeec63d27b755b6e9e36b` (marketplace.item_fingerprint.v0.2, valid signature)
  - `replacement_inventory_lock` `0x94aced309e0e65e1ea3ebcd2ed6975da1e489daec55776ae442cfbabb2a5bcc7` (marketplace.inventory_lock.v0.2, valid signature)
  - `replacement_item_evidence` `0xe3c35f999b1b5edda5d7eaa368987b8b24122c9557cf8b98706b69fe9da8d858` (marketplace.evidence_manifest.v0.3, valid signature)
  - `replacement_route_spendability` `0xa8fac2a039945cf4b18e8f0f9c6f51165594d6bca40d65094c472512110e2911` (marketplace.evidence_spendability.v0.1, valid signature)
  - `replacement_route` `0xacd43897e24072fa669d9ed71da1af9e80b2c086dfbf89c85be310e90f7e3dba` (marketplace.trade_route.v0.2, valid signature)
  - `replacement_delivery_spendability` `0x130765bf40bc770e977367e85693c64333797cc9b6a0696c7cb60908a59b0aae` (marketplace.evidence_spendability.v0.1, valid signature)
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
