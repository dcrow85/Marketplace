# Local EVM Protocol Probe: local_evm_protocol_20260520T030915Z

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
  - `create insured trade`: `0xb6c934231f8b3cf397c9bbc0ed5c1fce93d8ca53909e04b38f0fafb926023552`
  - `seller posts bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
  - `attach trust proof`: `0xd41ce4f7e739ba14945427cfe466e88a11eaae9f1b7b213660a2ed4bc8377ab1`
  - `accept seller private predicate hash`: `0x837c8a49b1a410f5ac1493d4ce16d36505974577149bbcd9759963a3cb4070c8`
  - `attach seller private predicate`: `0x77a3a520a7ed383fcf3c0488858e6a7aafa1d608e55979a019d6841af32f432c`
  - `accept buyer funding predicate hash`: `0xa63019460e20ea317d9aa215e9396783b37f31727ed1d04724b0e06ad782b311`
  - `attach buyer funding predicate`: `0x07d599aeb2d93fb0c41dc3d60774a531a6fe0f6464a930e7dd89db3dda952e08`
  - `attach item evidence`: `0x2bcdb27c42c00afa92f80acac4fa73063e9d6fdc5076499f67c0cee22840cb56`
  - `approve verifier review scope`: `0xd1566490f705128c1674f14d7eee4dc3e27f5a787ec5a536c4ac4238fedc0ed4`
  - `commit scoped verifier review`: `0x7b3926273b8cb35c9249e4e9a61c75a529757b160dc5674509743611ab6470c5`
  - `commit item fingerprint`: `0xfaae00fa1e164aa43fe0a7ddb78a702ab0eccb0a2fccff1fb0b5048f958c3cf6`
  - `commit inventory lock`: `0x08fdac0cdee1fae45d3fba74d2d8c96b0e987ba5aff8d9a04c1cb9c33f0c808e`
  - `commit insured route`: `0xd21fa3fbe737a672764920580f4463d0cdccaad19c3e7ba2320c0149c35bb8c7`
  - `mark route in progress`: `0xa120f1fcca476df77d731765ac6023cbdf05fa9503035781f5f8b16497133505`
  - `mark delivered`: `0xf5ee9450c74f658ca1aaede386cb2d56e97a12d30c2e95f7b3620304296dcbf1`
  - `buyer accepts`: `0x392f1f0da054f3eac91420174bf2d1c6cdd24959491382399c28a31d4a28566b`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0xb39ae7bb0f70910dcc7cbd998f364ec329345f47f142dd25e05011238f26f7a9` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0xeec897d6a979d2689f6f67346366b50f7c169f6c76fa8642e7ab4da93dfb4995` (marketplace.evidence_manifest.v0.3, valid signature)
  - `happy_verifier_scope_approval` `0xf16c10d26d9be0f8881d6bdc9ce86a92207226551ff9c250ae0fed48b265424f` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `happy_verifier_review` `0xf432c7555192ae0066cf1e24b9dc80aa8186923d2b6d7e6a7bedb912465bffa9` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `happy_unapproved_verifier_fingerprint` `0x9be4b41518a3f02c38ab04a23a5404a5e4c840be118bada4f82bf73acdf4a752` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_route_spendability` `0xd3f5c3a7f494fe1f393d73bea53026dd7dcb9d09c7680db8dec7aa4a0cf4c0d5` (marketplace.evidence_spendability.v0.1, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
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
  - `create new-seller trade`: `0x6e066e8db8717e5dfc5ac1a334a78869c9096c2b5c38fae0e98d7889007d715c`
  - `seller posts larger bond`: `0x078836913963bd0e0a9b495ac875020b17a0aa99f2647766cc1cc338e6974030`
  - `attach weak proof`: `0x4dae4188af1eed200a272d91b76dde7ed7fd837f2dac07edb42466b92274d5c0`
  - `accept claim seller predicate hash`: `0xcf8b4a9b680ba01d2e402428cfe4383d629ed1581aa6c1d277bf2eb934fd931c`
  - `attach seller activity predicate`: `0xf5f94bc186c85abad94a17d97e3a91a5b932bc2fcea758bee8af7c44ca538271`
  - `attach circuit profile hook`: `0xf0204310278c497eb61dc10907b5542aa3965747e6428bccb21b310e69a52f55`
  - `approve claim verifier scope`: `0xe1b837f256f6164f899883abcdf741f58ddb9ec58f749dc1ee050b7f58254997`
  - `attach sparse evidence`: `0x1cf424bba40f5819eb2db1e3b65b005db2c99bfa05a032fbe93a57d36febf47c`
  - `commit claim item fingerprint`: `0x0cb9f392d91d3483fdceb45a0165f30fdf4025ed1de9685c223338b0aa4ff444`
  - `commit claim inventory lock`: `0x02e42ef10e988dc4b9606af595c07b9207f81c5ce9813ae41c0ad7001f143da6`
  - `open fingerprint challenge`: `0x1d820f2738e6207d6edb18b9d7d089c3dd7d7b52623bffbc0cdf22a1d07fe11a`
  - `clear fingerprint challenge`: `0x247998c7fb7d76e9b3343cd954963828cc6da5b47b073430d04e56837f7bd123`
  - `commit uninsured route`: `0x34a2145004ed458e1ee4fcb2c14cd51b0da0a485bd019c71189f7cc50403cd3a`
  - `mark delivered`: `0xc80fbcb32da13b7d17eaafda09459e4eda13c9e28a9a8193e579c21588fe5b03`
  - `attach received-item claim evidence`: `0xb885291e5c8bcc09c58a6099d09c1fdd006570dee0a6fa0089d719180ee7835d`
  - `commit verifier claim note`: `0xaf48f014283e0bc9d443bc9a6f927f50272125544435a83ddf774545d73f7d97`
  - `open claim with buyer dispute bond`: `0x4d118280ab270759a892c3df4980129beddcd5fb71638cf5c7563eb92fb4ec89`
  - `arbiter resolves claim`: `0x12eff5f5d56b84ef5215007455f13be1f23bb200d4c5d652e7b5a790c43ce366`
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
  - `claim_sparse_item_evidence` `0xb2f2ad77ecf9700830c98327f2ed70e9f6b6b76204550debf315e32513dfba5d` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_verifier_scope_approval` `0x1f7af25a6c96908eef75b731f6c4abf8c58b7664235e7a7f02fbf12fee6a8176` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0x789f4176b61e0a87ef638590c202d8bd3c9483f8043cf8527d2d725467ae8d44` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0xe51c63d157fda052e041b11c9cb0481e90e83a20fcfadeb1f210e49c41e715b3` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `claim_challenge_clearance_spendability` `0xe2b689bc2ce41359044162ff2cdc402b2ddb826583349aa975724c5250517338` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_route_spendability` `0x2443ff11de1e8f7e26760397ca56fb8501eaf2ee17ddb1ef6432178787f76c1b` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_support_spendability` `0x8be0cbea66ddade4c87353cba2fa83f8e79955981587a4387418d87355810577` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_bond_action_spendability` `0x0aa0bf3ab4b058ab3372214ecd53aa75029a6f4a52e71ea4dbd7cda5b9e09791` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create replacement-path trade`: `0x4d13f142c3dfb25c79d3b92d4b4e806c1d45048734a16fe8067791b660cbae2c`
  - `seller posts replacement-path bond`: `0x8095a05efc2d3dd39d7f7f2644c75ce363c9a80d8becba50f76717a289559824`
  - `attach replacement-path item evidence`: `0xa2713d262d6e3d54344f22dbbc711397ec52100bf71e66bd5743e2bbd3456586`
  - `commit replacement-path item fingerprint`: `0x3129bb86894a471a2c4d67ea37ba11515f42f956fc7c02bf0bb56325073c71f1`
  - `commit replacement-path inventory lock`: `0x98a2bc0ef2686fa3a6801774866ad20b3430561552e2feec1d85a08c580b2449`
  - `commit replacement-path route`: `0x29a1c07f4b21e6d92842e1454096a0a537b0f7ca9ec6cf3d12ab558b86213784`
  - `mark replacement-path delivered`: `0x36695d15d327db4e8aa3d8ca563f8e95e3350899f2a5a89ff0b4159d12e0416d`
  - `open replacement-path claim`: `0x161c3fcc00a82e4da9f0b3dc75944d46d896454920a4174e5b6bd4f7323cb629`
  - `revoke original arbiter`: `0x7d45d1ec15c8814644144a84e0bfcca897d9abf6ce4e6c5f0c76d640ea760174`
  - `buyer proposes replacement arbiter`: `0xbe5446270c2b9450adf167041307e9c49709abf16834dc5db2d23c45c7ad11d6`
  - `replacement arbiter accepts emergency handoff`: `0x2125035b50a48b041df14c7a410e88fceb7ce0d8b6e535acf7edd61dd17757c2`
  - `replacement arbiter resolves claim`: `0x46cedbe6dd04a4eb4943e577b13e9211ce24094102e43ee329d4e348c8e9ee2c`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_item_fingerprint` `0x8dcd9aff7eb44b0607f46f0cce9c9fe62bbb9697c88aeec63d27b755b6e9e36b` (marketplace.item_fingerprint.v0.2, valid signature)
  - `replacement_inventory_lock` `0x94aced309e0e65e1ea3ebcd2ed6975da1e489daec55776ae442cfbabb2a5bcc7` (marketplace.inventory_lock.v0.2, valid signature)
  - `replacement_item_evidence` `0x6b46fcd580742918e34a123e3c7aa6226aa2ebc33d4066aefb82396b09580a2b` (marketplace.evidence_manifest.v0.3, valid signature)
  - `replacement_route_spendability` `0xa97150f8055014ec76e91024b4335e436a1b792ef085a2e8c724214db515be2f` (marketplace.evidence_spendability.v0.1, valid signature)
  - `replacement_route` `0xacd43897e24072fa669d9ed71da1af9e80b2c086dfbf89c85be310e90f7e3dba` (marketplace.trade_route.v0.2, valid signature)
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
