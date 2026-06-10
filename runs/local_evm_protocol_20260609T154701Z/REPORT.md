# Local EVM Protocol Probe: local_evm_protocol_20260609T154701Z

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
  - `attach item evidence`: `0xaf3afb0398067566e9bded55b601b1c50d53484f20a2714855d64ec7ae2f50b4`
  - `approve verifier review scope`: `0xc5ad51895315ce440af065efa5b86aa3d3170281b0ae27ac02b47152de5f26cd`
  - `commit scoped verifier review`: `0xa8b82ca8b6992ed9a9bc90bc4a885d3ec50e3149f2b37129deb7c60ea5353216`
  - `commit item fingerprint`: `0xeb515dfd6901473d5adad038cd389f4b83c7bc157dbb0a9dbaa974178df686a1`
  - `commit inventory lock`: `0x3fb20994dab2260ef01c079f57aa2a949051f0495fa07413c9753a93c1c4e419`
  - `commit insured route`: `0x53e6b174211b7c61af473421b7a526c2ccf1df57c7f676629b45da63e8ed30c7`
  - `mark route in progress`: `0x256b0f1f0e8b9bae23211975125df91bfcb901543b604c5a780c292e780ec9c8`
  - `mark delivered`: `0xb65dad59d78fb30ba5097dcdb284bcb83d867b735bb90deea694a8006b50af68`
  - `buyer accepts`: `0xfecd4f537046d2d06f32239bcffbc6ca30505171c72af0b8fbb6cd2e325a6345`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0xb39ae7bb0f70910dcc7cbd998f364ec329345f47f142dd25e05011238f26f7a9` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0xe006e98e122d45c3c4a62374d54a08c5e61042d5a915b1174a9454964cf26bba` (marketplace.evidence_manifest.v0.3, valid signature)
  - `happy_verifier_scope_approval` `0xf16c10d26d9be0f8881d6bdc9ce86a92207226551ff9c250ae0fed48b265424f` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `happy_verifier_review` `0xf400b369c147d5f1c1c61328eb4b82ed8949e3981249a170d1e71f369234e681` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `happy_unapproved_verifier_fingerprint` `0x9be4b41518a3f02c38ab04a23a5404a5e4c840be118bada4f82bf73acdf4a752` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_route_spendability` `0xa623a74812fdb7e62acc84e4cf178ed57ac4f74ca4422e2e3678b018615ebc0a` (marketplace.evidence_spendability.v0.1, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
  - `happy_delivery_spendability` `0xd2b8af067c222db632ece4a05b59fd5257d297a2bcaadeadb3f7adaebfe8b742` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `attach sparse evidence`: `0xd512507ed90d14786eb3fe64352fc0b4b4a636429d28da3206a69a891998559c`
  - `commit claim item fingerprint`: `0xd1eab1edde38a999392078f81822181620bcd9934ee0a53905c78a350a173f70`
  - `commit claim inventory lock`: `0x38c5b7869d619198ced2b91caccddd62f73ce417f13ad858647a38626492aa5b`
  - `open fingerprint challenge`: `0x411a6353153692993754ffa00cac653ed1be2855cbc4e4d47e9b54b4a3df1a0d`
  - `clear fingerprint challenge`: `0x433ffd108451627a1d5bd3c97e1c2a16d79734608112e4077044d4cb09ed068d`
  - `commit uninsured route`: `0x298d78a34619eea6a104b40b78c2de4d8572e8fb6a37825ce97ace2d592c8b33`
  - `mark delivered`: `0xef3db4ee613b1adf174cc190edeeea83ddc5b07bd5a65929bedcb52385be32ca`
  - `attach received-item claim evidence`: `0xfd72d535a31fa495a7b08b340a75f72da7c4f4bf90aaf906a5d01502ac9d6c5a`
  - `commit verifier claim note`: `0x8afb7de35b96a02fe6bb28946f84032bd2e795259f56d89895b4287db6860c00`
  - `open claim with buyer dispute bond`: `0x24f3908286128f76aee4e09266db306c744a62d4d3715b6dbf10cba32bd288c4`
  - `arbiter resolves claim`: `0x210ac136f6cd850dae2cb70068e65a87bc40cbc2e1048655ce199c13668b8b46`
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
  - `claim_sparse_item_evidence` `0x119dccbde1872a6bcd838242aff933858a289a7ad5a5651d8c9c4ad6537f7d79` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_verifier_scope_approval` `0x1f7af25a6c96908eef75b731f6c4abf8c58b7664235e7a7f02fbf12fee6a8176` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery_spendability` `0xeef336f49b8fd99d986f5b79102b90f12713484bf381a431bd0fc76545ecc8c7` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0x1a80509850aafa41f64b5c4df6884af851c0ebc5c31201d43b9ffb0cff2f51b8` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0xbfc5b7c3f326a6225c5e884bd755d6ee37c00940fbdf03c57d5ed8919f54552b` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `claim_challenge_clearance_spendability` `0x796ada66976ca0ab8faa1b688b05a61931d8fb5d854f21dbde9e18ffa4846a40` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_route_spendability` `0xe865171e918b263a90dcaa3d5c84685c724736b78870bae9d7476491cdc11a26` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_support_spendability` `0x0a884766f231fce90f4915cb8e4bd28880d7a0245c05d97c346bd9cda0996968` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_bond_action_spendability` `0x09a24f42f34584039d099fc5d4dd4f7c8ba3257461d593fa31132c80424e33bd` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create replacement-path trade`: `0xdd206bf6c86a421872ba9dd72126f46dd192ea3839400095c64892530e568024`
  - `seller posts replacement-path bond`: `0x5f0e59cb1b5cf384b43d88edd1e724b82a9184ac42f1d7df7e84a4f3bf3fc3bf`
  - `attach replacement-path item evidence`: `0xf8c865516b2e79a27d81d839c950f8cebc8729abb03a8473da678c0c2fc9ac66`
  - `commit replacement-path item fingerprint`: `0x58cc5d740c03668eece748411f067ea66eed7decc2ed403a25496d93db4b4cef`
  - `commit replacement-path inventory lock`: `0x821884701a73293358fa30f2e357440aacce14d4d4d715a80c02f5f1ec72e9d6`
  - `commit replacement-path route`: `0x2498a9245cd5146b927c1060d7e06a5308531c120c6bc10dd2f9c9e15c7884e1`
  - `mark replacement-path delivered`: `0x0a4f66561f68ce91fad190d3d5d8dcb7e4d4b66cc60b38309ec1ceab4d65884f`
  - `open replacement-path claim`: `0x7787b1946182fc03a30cf64089ad76e879e912074dfec94971504cfd45417eae`
  - `revoke original arbiter`: `0x193f8c82131f5ada014881c7426ca5e2bf8deaca3babf2dee4be56218f2542bb`
  - `buyer proposes replacement arbiter`: `0xbb2333c88ab944fc53b1821543a39fa2c4f90b3b6a20eb935642fb041255ad9b`
  - `replacement arbiter accepts emergency handoff`: `0x6588c6014a15f1c594eadf803a5d328b664c1045406bcf432e6d002f9cdff8a1`
  - `replacement arbiter resolves claim`: `0x1088fcc54f777cb2ffeb56ddfc5622493eaac56f7b08fba49015c72e5319a3c8`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_item_fingerprint` `0x8dcd9aff7eb44b0607f46f0cce9c9fe62bbb9697c88aeec63d27b755b6e9e36b` (marketplace.item_fingerprint.v0.2, valid signature)
  - `replacement_inventory_lock` `0x94aced309e0e65e1ea3ebcd2ed6975da1e489daec55776ae442cfbabb2a5bcc7` (marketplace.inventory_lock.v0.2, valid signature)
  - `replacement_item_evidence` `0xacaf61f59e256a374c79103d828297b91cd7cb54885afb4f2b9c032943b49845` (marketplace.evidence_manifest.v0.3, valid signature)
  - `replacement_route_spendability` `0x5383949a2bd114175252db42d050acc4f751d08618bfd9082d84abb75351fd2b` (marketplace.evidence_spendability.v0.1, valid signature)
  - `replacement_route` `0xacd43897e24072fa669d9ed71da1af9e80b2c086dfbf89c85be310e90f7e3dba` (marketplace.trade_route.v0.2, valid signature)
  - `replacement_delivery_spendability` `0xbf3a06ea3b9997c75c5917902eeb36a61eb162370d9ff28bbb402423df531eb7` (marketplace.evidence_spendability.v0.1, valid signature)
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
