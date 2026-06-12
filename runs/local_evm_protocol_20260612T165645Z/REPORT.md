# Local EVM Protocol Probe: local_evm_protocol_20260612T165645Z

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
  - `create insured trade`: `0x64bf52a9984015385bfa918cee639256c5444f815108531cc815b128b3132391`
  - `seller posts bond`: `0x8aa458d9d6754291664878cf4e66304be9d2eeb43db21b595381e153f8e1f011`
  - `attach trust proof`: `0x738646699d08393d53f7193268c320901eec32c7480cc6cf5262dda16466b10c`
  - `accept seller private predicate hash`: `0x5a3b4a3562bf1393d6344976a4af423e3b5792bd7f811b9bcba9a6a9f142a8b6`
  - `attach seller private predicate`: `0x2af318a7a88a5a0ddd3c16116ca0f6d66356a5b2ca62d35dce99e930347a958e`
  - `accept buyer funding predicate hash`: `0x5c79a32bba70bf8a3ed0aa0bcf5d61e93a139900fd2fde341d22f1e778378e7d`
  - `attach buyer funding predicate`: `0xe8546853fe28a90a153c4089b20b77b41484b15d9966da060aa42401d837bd26`
  - `attach item evidence`: `0x851f1418bf2a4cb6e9f4d4ac0575a2fbcbf857827e47cc30c5a83d6a90515352`
  - `approve verifier review scope`: `0xb1db11359e050c47e7119db3a4334cfe0696e0d6faa6d78df4c63836e44d59e6`
  - `commit scoped verifier review`: `0x84c869f19fa379abcb12347e7c4fd668eec1c1c6c085dcfd477eefc43e526805`
  - `commit item fingerprint`: `0x8baffc1006768e3a30a1740ad63c8de2fb2499ec2d39769d21e1dd108667a39a`
  - `commit inventory lock`: `0x91482c6522ab5f2db26ab36345604af9e784c09b8d94a28137bc384d9fa733c6`
  - `commit insured route`: `0xb8255d2a6a72992b17ebc0e2c732d08ea70b0e70392f91d17a91f99f986a74a0`
  - `mark route in progress`: `0xe43d89138d1dfb0d2d97c75ce5d01df2a6ff8ccbdbb0a711f6dba266b7770bc9`
  - `mark delivered`: `0x877debd416bde58f22cdabf0349595a3f83faa8aab7908a904a2c6cffcd17c86`
  - `buyer accepts`: `0x6b6dab770e0ac7f2ab3981a12225c751046ebc439b02ba06171f97f8e98868ed`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0xb39ae7bb0f70910dcc7cbd998f364ec329345f47f142dd25e05011238f26f7a9` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0xd746e031222fad388b4ca5f5020ecbcd8d795d16b63cf7910a1938b1435b4a44` (marketplace.evidence_manifest.v0.3, valid signature)
  - `happy_verifier_scope_approval` `0xf16c10d26d9be0f8881d6bdc9ce86a92207226551ff9c250ae0fed48b265424f` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `happy_verifier_review` `0x91cda5553996a8d2d71c5aa52024c2991f2c3a963ad399f529c2d0a0b1a50003` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `happy_unapproved_verifier_fingerprint` `0x9be4b41518a3f02c38ab04a23a5404a5e4c840be118bada4f82bf73acdf4a752` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_route_spendability` `0x167701d2308af4072d6b1a4889ffd3b29ecccd87dc93d05abcb32b6dbe3e8569` (marketplace.evidence_spendability.v0.1, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
  - `happy_delivery_spendability` `0x0a3506a3472ae1f4430e0977d5aad64f1b6e047c88d6dd6b49ebf8ccd064f1c8` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create new-seller trade`: `0x41a12bd8b51d566a089f75ef047b16d83e10ab374f7db85a986f38d82cc01ec6`
  - `seller posts larger bond`: `0xbe9ebd74b0d95021e0ce49f878f6e5d431dc5ef5dba8be67272cec8d1f7edaf5`
  - `attach weak proof`: `0x947d8e9592c3ad74eef3e4849ee844c6f3f2b4c7921aa45e7ad0b971085e23b9`
  - `accept claim seller predicate hash`: `0xde07be76632e95c4b9c59cb04da45fdc713d47892107acb79be0147c5ea7adb2`
  - `attach seller activity predicate`: `0x9c959eefdf6b255b53797595624fbdd8b783a37c4c48dc5fe260f9475da39507`
  - `attach circuit profile hook`: `0x5ab6c35fea3bca2fe50bc8d55ec56e07bad21c1734e8e8026d3e0b663670a791`
  - `approve claim verifier scope`: `0x54f6ea8dc37e7d88a6aa3ad2105e4a82b851977752ac2797f15da315edf077e7`
  - `attach sparse evidence`: `0xc92427252836549f7b7656876afb6791f665ecbb265c8da0f1e4799b76dfa6b0`
  - `commit claim item fingerprint`: `0x9c4132ae1d93ada489b88047130f8a8f2e6a02aa7b5bebc6be43475942bd4b5d`
  - `commit claim inventory lock`: `0xce2c4e23371f9e0edfe2f81b416005a87605cbf7e49caaa90ab1f6cad38816bf`
  - `open fingerprint challenge`: `0x5c9b9210c4921e4c2fd861c0563784af07be360e7d67ba22c0d3714703f9d148`
  - `clear fingerprint challenge`: `0x5ddca0fa92e27ed34699a897a9ce48ff9173c0159ed0e86c6625122e3d0eba5f`
  - `commit uninsured route`: `0x8f8d9879e3294375c9ac5c0b49e961de335257331cda83bd8f4ceea325b2201a`
  - `mark delivered`: `0xb060f6a963dcf1d8b0986245418a749da4173090356d6c9fd7871afdb84e7b31`
  - `attach received-item claim evidence`: `0x83b875bf21383afb6b806b3be920458c7d1c1b6ccdab257f07928826cab6baf5`
  - `commit verifier claim note`: `0x95525976443da718108a4ffa31c7afbb33d66a905d7887cff15bf00d4cfa2a6d`
  - `open claim with buyer dispute bond`: `0xf15d7f0bdcae616a5ffd1db20e3742b38f63f4909b4f4ed6f5621412fd319c92`
  - `arbiter resolves claim`: `0xcd5d3549506485270596a474d721aa8a001bb3645f035f34f498c5eecb8e59c5`
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
  - `claim_sparse_item_evidence` `0x60b2c7b583eff70200176b4eaceb544f18e96fa5f000ddccecf6825fcac63580` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_verifier_scope_approval` `0x1f7af25a6c96908eef75b731f6c4abf8c58b7664235e7a7f02fbf12fee6a8176` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery_spendability` `0xc0bdac79ea2d807d67731822b7b63217ff234aa39e729eaa629e2aa13d666075` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0x01a9791ce48d8ed97f8b430797008faa60562ad3cb7543930488489b1b051ce2` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0x56cf707a7fba68329ce6758611f52526bf91a1a3ae3d1991cca5e1b0f48efd69` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `claim_challenge_clearance_spendability` `0x4d8575989fd991a5f45da44480a8bbf65a95985af3cd5f91bebb9f4b1f9e8acd` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_route_spendability` `0x82d3375b76399a2ce909b67a4b3f172113484d8f9a8866384ee693d90a3fef70` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_support_spendability` `0x51e5bdd3d640e7827d3a80dccaff5a84d81cb48a0093d4a4f950131f07af01f6` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_bond_action_spendability` `0x29a7cc71fd76dc0705453f195265e8fff202f1a9edd4efb1a991db94cdae1282` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create replacement-path trade`: `0xd46938e457c5145853605f08145e0cdfd4c9da5f614f84a292e55028dab5b4f9`
  - `seller posts replacement-path bond`: `0x7e67f718fba5906ee055d4366987eb54eac214f1b542371db74b823ea89479bd`
  - `attach replacement-path item evidence`: `0xa1b4f1ca6804b3fdafafedcd49e8caac17ad3342e77393ba1eb2fb5391c2094f`
  - `commit replacement-path item fingerprint`: `0x852af3c4e52d5938dc1103388293e38e9fbfe9639d62be60f824a65c8e25887e`
  - `commit replacement-path inventory lock`: `0x0e9c2be3836f294c8fc03414c3ecd2ca490f39ddc958eda88dace6cdf94287c0`
  - `commit replacement-path route`: `0x9887011ca688b8c86993e2a42996c8f4edc8b93d5591263220eaeb5e73043263`
  - `mark replacement-path delivered`: `0x04d67598c7634b791ba3c779d9c672a63a29c0ba7851e3b4a89a8e3e0df65707`
  - `open replacement-path claim`: `0xfc569a398ba1cc5de9fe97f762140b67fb9bcd12725a1fdace033d91075973fc`
  - `revoke original arbiter`: `0xa4d9bc7e94038d39bdd3faa86824a5cc50d13a8603e60f3b667226622866a204`
  - `buyer proposes replacement arbiter`: `0xc811d57642066f0c8a2c9b93da1faa7cb4e7567ed192e40114d6845325a824a3`
  - `replacement arbiter accepts emergency handoff`: `0x9716824b13402f824c771e53addfee363032c9c8e3c0813dd3aa6a135210d8b1`
  - `replacement arbiter resolves claim`: `0x01432bfeef73d977caa321e4e94bff1308dd09bdcbcb92c7e82ee8a0676faea5`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_item_fingerprint` `0x8dcd9aff7eb44b0607f46f0cce9c9fe62bbb9697c88aeec63d27b755b6e9e36b` (marketplace.item_fingerprint.v0.2, valid signature)
  - `replacement_inventory_lock` `0x94aced309e0e65e1ea3ebcd2ed6975da1e489daec55776ae442cfbabb2a5bcc7` (marketplace.inventory_lock.v0.2, valid signature)
  - `replacement_item_evidence` `0x39a252b23f308f14415dabae822ac99df259ecdb866c2369fb9ccda097a1604f` (marketplace.evidence_manifest.v0.3, valid signature)
  - `replacement_route_spendability` `0x7a2d90f1dd7622c83e99a934c7c85a71cad6c724b8e755776e90c70a1e045826` (marketplace.evidence_spendability.v0.1, valid signature)
  - `replacement_route` `0xacd43897e24072fa669d9ed71da1af9e80b2c086dfbf89c85be310e90f7e3dba` (marketplace.trade_route.v0.2, valid signature)
  - `replacement_delivery_spendability` `0xfa78ba43f4d9078aa7d0f6a6f957b70318a2272d0bfed73279149504252d617c` (marketplace.evidence_spendability.v0.1, valid signature)
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
