# Local EVM Protocol Probe: local_evm_protocol_20260609T155326Z

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
  - `create insured trade`: `0xd4e7b856e5dd10fda540416b3f722e1ecf5141bdfdec72232a0eafe31fdd6d3d`
  - `seller posts bond`: `0x7e41e6a4829201dcdc76e914d1e44c9ec678b395fcd9f0135a125264ad7d0cba`
  - `attach trust proof`: `0x16dcba69f1eeaac390f08015e60b1f48da20c82dd78b2336e1d9200dadedfea1`
  - `accept seller private predicate hash`: `0x40a63d39736967c32428d70741b9491d7ff81da82aa84b5537a6e35a3e86e998`
  - `attach seller private predicate`: `0x2e6d737712f8dd43a2db3bb7fa7f729fc2ba264a5fbd333b6cf2d9026aec301e`
  - `accept buyer funding predicate hash`: `0xe7f77217bacfbfacc2f517bf26cc64db1db2e0db8d3733a4e5e98db06ddf7631`
  - `attach buyer funding predicate`: `0x918816532b937dcda0c4399e2f4da253dd403992137288f9990f798a51377222`
  - `attach item evidence`: `0x9b40337bb7d40aef08f87ecc0c6b96a3bafd25813f955feeb4bc801969bbe3fc`
  - `approve verifier review scope`: `0x2ab60be08a7db6a4af64db2b34559d79088390dd078e65d08915dfa17258d02a`
  - `commit scoped verifier review`: `0x861002a0bba7bc30ada718ce65c3bbec252d357e3db46ca54ccd6bbb4f24dc91`
  - `commit item fingerprint`: `0x828b63243490d98d5eb57336b3620ee9357268c053a01c0aac86e8246eea34aa`
  - `commit inventory lock`: `0xc132e018ca3498d98465743f50a5266ae60951055ce1498aad8b48accf258108`
  - `commit insured route`: `0x483451da91d5765743209f54fcd46e6b02fcd70943a69b3daf7cc3a035892a28`
  - `mark route in progress`: `0x3f84d31474db7317210db498e574d8df62557d2109ba8fe131b353c10de313cc`
  - `mark delivered`: `0x96ff071ed4ac612eef309e20d73cbfaa21954e981f1cbdb10a97f5901116ceb5`
  - `buyer accepts`: `0xcac60b8327f2ae8883c851e98e61560bdf15850ed059217b0309e03caeb69db4`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0xb39ae7bb0f70910dcc7cbd998f364ec329345f47f142dd25e05011238f26f7a9` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0x71a3201da4f34445c2dce4604cb3f146a52822176232af80f0a6c37175d4ac2a` (marketplace.evidence_manifest.v0.3, valid signature)
  - `happy_verifier_scope_approval` `0xf16c10d26d9be0f8881d6bdc9ce86a92207226551ff9c250ae0fed48b265424f` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `happy_verifier_review` `0x73bfdbe1d04f563523b2fe289e1846f3b91d8ca584597a94e66612dca069f080` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `happy_unapproved_verifier_fingerprint` `0x9be4b41518a3f02c38ab04a23a5404a5e4c840be118bada4f82bf73acdf4a752` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_route_spendability` `0x569b7ca8c0192216ee361e85d4b97fb1e255dabfc2a4b8ea5d26db5ef98b53fe` (marketplace.evidence_spendability.v0.1, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
  - `happy_delivery_spendability` `0xca13a30ac9adeb26defad919c04ac3f4647e7142acc0cda6a724a93f55334edb` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create new-seller trade`: `0x6e2ed089ec88fe97191c68514c522886198d0c0d702ec018ca78ab13c6e201eb`
  - `seller posts larger bond`: `0x691bc63d91cdd43e5a06680263c7b2d9240255175f965ebc3a65521d3a801d2d`
  - `attach weak proof`: `0x184cf6d32aec147c9f51d5d0d0a5c9a1b3d2b5884b1acfd7eff0972f694004de`
  - `accept claim seller predicate hash`: `0xa8829b5bd6fc3f32351dae868dfe0f9338abdd65506b5b9ccf94c57e474fa7b3`
  - `attach seller activity predicate`: `0x28f28e100a188101dce0ef67c62def79b9e978a55377da7a0154788568fbffe3`
  - `attach circuit profile hook`: `0x64d61d5ca625a4ad3e7df9163ff5c43bd6a85338a9b69d27435f5a9d41b5ab7f`
  - `approve claim verifier scope`: `0x2ab5fa7876a38b318b882cbcd1a3d4cc6fcee7c220a50ca4ac5f8b9a66657b2b`
  - `attach sparse evidence`: `0x3a3b73d6cc7726ce1b02b197739435475980041b72caf2e7855e22de2d24de19`
  - `commit claim item fingerprint`: `0xfafbd0b507035d09d6cee853e8a32de1f117df4272330d7e8f2ea6ad39406954`
  - `commit claim inventory lock`: `0xb35a9fbb0e796de14f9d884c7184df2fbedcc1b590b86b9451fc3a73108ea5a7`
  - `open fingerprint challenge`: `0x7086ef3968904dc37e64343c6c5da27ad3a7ba7053437180832e7f738ac2bf85`
  - `clear fingerprint challenge`: `0x804fe3c656958c8db92eac05e6e8244f67dca8e7129091b7c23230ca910d8c34`
  - `commit uninsured route`: `0x1de5d5f6b2d49731e56c9f2d75a1e7d423c7d352f4bc472a68bc71872d4b4faf`
  - `mark delivered`: `0xb5c5bc7552b53671bf20b14705f950afe0709208566f7354a2e54832c7972561`
  - `attach received-item claim evidence`: `0xc65dd6fe83c42c021b4499402cdd68bafd8adf9932fd115ee7e2dbd20ef307c6`
  - `commit verifier claim note`: `0x574a3e280f714f255eea5abac25e498461d0bda02c3c92d6034a29afdce0daaa`
  - `open claim with buyer dispute bond`: `0x46fb3663df5bc7c6cf8464b4bec0b71547f6bbb540a023b8b53d1eb1c6e985f2`
  - `arbiter resolves claim`: `0x8e48a95b22b3080419298860b828848b584cdfcca7052773ba22523b6627b5b2`
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
  - `claim_sparse_item_evidence` `0x012393d410930e9067fa525b9dbb3e03921f776d1223fb0d7a8820cb4d6cc02e` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_verifier_scope_approval` `0x1f7af25a6c96908eef75b731f6c4abf8c58b7664235e7a7f02fbf12fee6a8176` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery_spendability` `0xed0799c2063775002dffcaaed7d0b71b8f0dc8ace385c767373872faac4e2ed2` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0x4145bb9541d1c18db099539f759c7155680142322ebb765eeaca953dfa412c76` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0x5ae6909060f462d18761d8843e7e4402311b489a8d563e1559c7f113142a0c6a` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `claim_challenge_clearance_spendability` `0xf712f9271bb9f62f20ef56e8962cda8c5ad028ba2bc792eda996bda5593c112e` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_route_spendability` `0x6f2ea0ff0519aa2827c0896c4827b2ec8248d848146f55232faff2fb4b9b67f2` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_support_spendability` `0x09913e5f63218d2a2755ab856655ebc7f2daedf89532152553be2396885aaac2` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_bond_action_spendability` `0x48aac78d57a8c677b5982d7d382e88d070927247ec02e0246e1602cd7bf6ee10` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create replacement-path trade`: `0xb935f24bdd1211868bdba468f67621695c470870197960a072ed9abb8e61c4cf`
  - `seller posts replacement-path bond`: `0xae0355992bc4340744d564bf3c76493d908a8d58a25c45ad286e80d03d9852c6`
  - `attach replacement-path item evidence`: `0x90b15ff38f664538cc58cadddf5a229ee77cbbbbf84f5e2dfa78b36d7fb6e0fd`
  - `commit replacement-path item fingerprint`: `0xacb457493767db0dd6a1e0d69c83c37cc0c0002445690ba5854d02408cc9bfcd`
  - `commit replacement-path inventory lock`: `0x21cd3291b9883b5fb78ea8cdc02910595c264367fbebe87d848aa47038ee4bce`
  - `commit replacement-path route`: `0xfac70d596bfd7dec2945e8d3934c075c29290b48d0759f2a25711c35ca5bdcbc`
  - `mark replacement-path delivered`: `0xefb7906fe37284ae1a2b23a87aab6fd5877dbf3dbb5c3d3cd141b2a4bc3f349a`
  - `open replacement-path claim`: `0xe286bb372bdf124766e6ad3ce049a9a74dc12deafa74406e568810ad4962b1d9`
  - `revoke original arbiter`: `0x96200e3f816dbd5f67e4203b442503b933674a6569569cb2394842c1af1e37c9`
  - `buyer proposes replacement arbiter`: `0xe892c0f8ffeb30b181670aa50b8c6174d5c5d5015925a147c428b6948dc6f5ff`
  - `replacement arbiter accepts emergency handoff`: `0xa64d7650774a0c9b5eabf0baca3fd21d5f7ce75e5adab6b3d4e963814845d211`
  - `replacement arbiter resolves claim`: `0x3b0bf0f71dd3b8963972b20900c4f557c3b6e2c8632257491827834b5e443c1c`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_item_fingerprint` `0x8dcd9aff7eb44b0607f46f0cce9c9fe62bbb9697c88aeec63d27b755b6e9e36b` (marketplace.item_fingerprint.v0.2, valid signature)
  - `replacement_inventory_lock` `0x94aced309e0e65e1ea3ebcd2ed6975da1e489daec55776ae442cfbabb2a5bcc7` (marketplace.inventory_lock.v0.2, valid signature)
  - `replacement_item_evidence` `0xf4ca9dd85d2fbf7200a94d8558bea867025ad240e6b5c4db932c55e09a423463` (marketplace.evidence_manifest.v0.3, valid signature)
  - `replacement_route_spendability` `0x7340799c3ea93d896d66f9115ed598786b3d37bdde7873bb911ce30fb5cf5a21` (marketplace.evidence_spendability.v0.1, valid signature)
  - `replacement_route` `0xacd43897e24072fa669d9ed71da1af9e80b2c086dfbf89c85be310e90f7e3dba` (marketplace.trade_route.v0.2, valid signature)
  - `replacement_delivery_spendability` `0x2a3ad15aee13c2a36153cf3ba703393d80d326705b4da9dd22b10b898b1e3584` (marketplace.evidence_spendability.v0.1, valid signature)
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
