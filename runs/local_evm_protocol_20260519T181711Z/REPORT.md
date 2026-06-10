# Local EVM Protocol Probe: local_evm_protocol_20260519T181711Z

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
  - `create insured trade`: `0xc2752912be8ed7f620590159b0cec93007d88775b4ccd893d58d63da53a525c0`
  - `seller posts bond`: `0xdf501155eb047c957b3fa454e755de7177a81ec4a5e499a29aae85a60caba565`
  - `attach trust proof`: `0x68a4e0b1608ad4a7df64d5160ff6e33d9a55c09da79dabc84d1d91967ea56101`
  - `accept seller private predicate hash`: `0x09307e4de958d96dcf2da3dd280d96aad840cd886a6050ee6cd30724f42c1a15`
  - `attach seller private predicate`: `0x54ac9c2f02d8c7f392198930da5988110562291c5f3c2579763d65406093a47b`
  - `accept buyer funding predicate hash`: `0x6abb1d64ab53af30d2fee85c88db2ff893d9806768360feaa64e68937bc913a4`
  - `attach buyer funding predicate`: `0xa1dbe742563ea52ddacf95f5d21135cfcffadb7ab36d3a4c0fd12f43a58ca487`
  - `attach item evidence`: `0x2b21ea2b8a34db822100405114fab7fc2d1639cb4dbed23d8bd0aa446acb3887`
  - `approve verifier review scope`: `0x601de305cac40bc3011b9855defd2fadc8eb05e7c5f8498afb1df0b6d6dbd9a1`
  - `commit scoped verifier review`: `0x9d9d3373b8fddbbdec4a633b97799b2d69baac6bb3ffeb30bcb13b6f4eb34337`
  - `commit item fingerprint`: `0xa61e411fed575fb37a8746260fdc506dc4aa3cdeaa42a1a4824bf8404806ed9e`
  - `commit inventory lock`: `0xa6b8a2b8d18bd9d4832d524995be83a5cf751ad8bfce741e6b3ae7a06f14b964`
  - `commit insured route`: `0xc76cf86d557472ec814f8daa77ff98082b2294c3fb4a69837bf9094892f6fc5e`
  - `mark route in progress`: `0xd763ec5834f55d407df90049e67cba414cb685c9743073f8a8a129cd8ff4d1d5`
  - `mark delivered`: `0xf448d019fa8e97bbf5cd71e4493427ca6a67ee679f1572949c9386c2c1fc91a8`
  - `buyer accepts`: `0xbc88b0673ca95243e3606491d66c16e67aabaa27279a483e3af024fcf4fad6ba`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0xb39ae7bb0f70910dcc7cbd998f364ec329345f47f142dd25e05011238f26f7a9` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0x64d8a9a7145199071a254f9e3dd735960a6a5d1a7281cb89a658a8429f410da5` (marketplace.evidence_manifest.v0.3, valid signature)
  - `happy_verifier_scope_approval` `0xf16c10d26d9be0f8881d6bdc9ce86a92207226551ff9c250ae0fed48b265424f` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `happy_verifier_review` `0x205a080a93383db3b82156453fa5c879d416c31f3ad087f5ab84ebf432890c56` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `happy_unapproved_verifier_fingerprint` `0x9be4b41518a3f02c38ab04a23a5404a5e4c840be118bada4f82bf73acdf4a752` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_route_spendability` `0x6446c4772bd6bcfee18b4711e6105ed3aec69cb5753db3f2f6f8b3889b81f4aa` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create new-seller trade`: `0x1529fb19781e7a5c9ff36906dbae0016e9a19dc09adf3363837f927160650d76`
  - `seller posts larger bond`: `0xfadfc46b026f82d0619726195c2ed6f85c9f26f3a45bb9365535e0aca513cad7`
  - `attach weak proof`: `0x0fc6ea4bdecf9dbc9ce33c3ffd056606d28cc7c6112293c6e114be424174fcc5`
  - `accept claim seller predicate hash`: `0x3ec72308bfd70e1f5c8f4a2232b778c96aaf41691f75d2f92edbb9989656b1b0`
  - `attach seller activity predicate`: `0x7491a23a328c752d1f48c771d7196275a9dadddf34c3d1a3cdb1d496cfd2504e`
  - `attach circuit profile hook`: `0xf0d8426eabd741a7855e9282c5145bede0efa0ec88f607caff3dd21a4791f39b`
  - `approve claim verifier scope`: `0x2b55cb281d3e291143bdbf5113ec11b082b9a82424aa077955c6c2d808d30142`
  - `attach sparse evidence`: `0x675abaedaaf3838fe8b082be3cff442de4289a6a47d6deacfac56612876faeec`
  - `commit claim item fingerprint`: `0xae7092b8596bcab6f52f46277ce664ebf9ee94fc76b8ce28d7201b0163f730b4`
  - `commit claim inventory lock`: `0x922d3f0d5c03af1abe3a200a401dbd150b04c43071ba5fa0ee0293aa75dd8213`
  - `open fingerprint challenge`: `0x919bc6854b7d9c667d795f61cd8752a60c360990fbe9073fed6c92c3bfb53890`
  - `clear fingerprint challenge`: `0xf1779682aac49daa44bea706673cf0181f2102af26b4975dc10abed336c03642`
  - `commit uninsured route`: `0xcaf1a81a5605f75735924fda69be34551344fa57dd8a8fe823eeb5d73650415c`
  - `mark delivered`: `0xf0b59942710b37e331223451a687d1ba0e4ec85362e5b67fe7ebe30baf90b970`
  - `attach received-item claim evidence`: `0x7425ae75dc57607cff6a3ae1d88fe70ef875c5f9e382821b30a775e689dd2b66`
  - `commit verifier claim note`: `0xa66162c710e175abefda7276dac8eec9c934d9dd48ca419d71e680bf80a5a733`
  - `open claim with buyer dispute bond`: `0xd2b33cffca6cfae237e7ab87465c4703ccf263be46930b24123738811cd2c678`
  - `arbiter resolves claim`: `0x3a05d02363bb01e7b83f75e66b6427204753f71310ce17e2b62f8db3a9a6df37`
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
  - `claim_sparse_item_evidence` `0xdce015bca74cf342d30bcff934a5c71a7b35030d7acc6e0980d1fde94fed9a58` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_verifier_scope_approval` `0x1f7af25a6c96908eef75b731f6c4abf8c58b7664235e7a7f02fbf12fee6a8176` (marketplace.verifier_scope_approval.v0.1, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0xa593432c4fc5090ae3797eae6db628eabbdfbb91f9887de719988cc57980f8a1` (marketplace.evidence_manifest.v0.3, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0xef59815a1e8ff483fde8f28925ba6eabc2d9dd937184f939eac30d4ab6b564e3` (marketplace.verifier_scope_attestation.v0.1, valid signature)
  - `claim_challenge_clearance_spendability` `0xedccc30222efb2087c005c28cdbabbbad89bcf64bf93c6e1bd2dfda96837e3a8` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_route_spendability` `0x46c2cfdb306bea24ec63019a7aed04783186f0377bc46047de049adf762169eb` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_support_spendability` `0x55c757ba6611398da07d6989b1da4420f04e4dfc8365e048a684a8aaede4c157` (marketplace.evidence_spendability.v0.1, valid signature)
  - `claim_bond_action_spendability` `0x5676496fa1f02feae33b079d39db13a81052837abf08229a6e9e7e2d3e1135dc` (marketplace.evidence_spendability.v0.1, valid signature)
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
  - `create replacement-path trade`: `0x00c751a610b00841d0b636c78185910c068a4922b3808820860cab603b15722c`
  - `seller posts replacement-path bond`: `0xb5e40b64a1894a8c3605f03753df0163965bb98fdf34fdb37f49ee87a9b836f7`
  - `attach replacement-path item evidence`: `0xde3c5031d72b61740d76515a30ad4afd4ecd59b2393476da84386748a5cfa103`
  - `commit replacement-path item fingerprint`: `0x4ec9fc970419296fdeb661640924a15277fea8cfc309bbf6cc32afcf6f9296fc`
  - `commit replacement-path inventory lock`: `0x435bfd371204d9deb49e724d7e33f38e1167428bc4698898992cb32438d39547`
  - `commit replacement-path route`: `0xbe8e6a65042fc2fa8975f0fe581718f30b1805c496ed1c28549213949c934e5e`
  - `mark replacement-path delivered`: `0xef0970808f6a5715080d464d54703f546a28e07c9822638d8c9ca0528caf079f`
  - `open replacement-path claim`: `0x5c931ae51383e3300fdad0ac07dadc1dac9b400f638d39dfa00de268f9689948`
  - `revoke original arbiter`: `0xa9056c753c30e25d356054939259a82183c5f3ebab800e9620c9d837275608b3`
  - `buyer proposes replacement arbiter`: `0x76554f117163d15804c6a7e0f169fe4c34fddab6372dd3fca73307e48bc59911`
  - `replacement arbiter accepts emergency handoff`: `0xb84a7a2fe9e2946ad3eea112a71f2588af8328cdb133c28ed5b6d2c340de08e1`
  - `replacement arbiter resolves claim`: `0x65ab770d9c522a4b20440dbf35dc065c3caefee631418a83ba9675d3cec4bceb`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_item_fingerprint` `0x8dcd9aff7eb44b0607f46f0cce9c9fe62bbb9697c88aeec63d27b755b6e9e36b` (marketplace.item_fingerprint.v0.2, valid signature)
  - `replacement_inventory_lock` `0x94aced309e0e65e1ea3ebcd2ed6975da1e489daec55776ae442cfbabb2a5bcc7` (marketplace.inventory_lock.v0.2, valid signature)
  - `replacement_item_evidence` `0x1468e9b9f66bca727526a74e68295ffc150c49573eb09335960ac2820126109a` (marketplace.evidence_manifest.v0.3, valid signature)
  - `replacement_route_spendability` `0xee69052f5cb0a6f483fae8debb08040bd6be13fbd04e1de3071c366ea662c6c7` (marketplace.evidence_spendability.v0.1, valid signature)
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
