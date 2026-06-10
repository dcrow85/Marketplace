# Local EVM Protocol Probe: local_evm_protocol_20260519T161230Z

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
  - `create insured trade`: `0x8368c25a145fbc5b60ca023da4e5deb08bd5714f3441cce058674b1dfe0dc18b`
  - `seller posts bond`: `0x66842a9772657a72f53bc4cd00d9736cf39961663cb81b6b1d4e4b388041a21f`
  - `attach trust proof`: `0x86b0814f30ca56dfbe1eb2e8ac0238fba02efd3da7485b13d8419675dfb09839`
  - `accept seller private predicate hash`: `0xd866c55ffb885c4747468246cd1224d8db815854392070b031c74294d660de8f`
  - `attach seller private predicate`: `0xb03087ac87ee1b3a38b43a8d61ba3c240f0e6e006f94e1593bee310f984c2054`
  - `accept buyer funding predicate hash`: `0x0f31b1c4079df438cb428ab4b5d252950be51919802f86b97a6c1be9f4232cc3`
  - `attach buyer funding predicate`: `0x817995204bc70b616690a41aee70031017f8bacc8f5b3f16ece87dc4c92e0c9c`
  - `attach item evidence`: `0xfe844365f256a0cd23fc574d11eb1a3c027b8b636670a06ab0d3547394eb4696`
  - `attach verifier review`: `0xef1a985df8bedaf94ffc5701ea2661dcdb9a874e398f87bbfa78d154f6b75a07`
  - `commit item fingerprint`: `0x35dbde286e7da08a7009758f3f75e12d12571dc9424b8a7ecefff6f94494fc5a`
  - `commit inventory lock`: `0x16c10006c5cc0a2fc8495f8009a99f4893d59eece0094c0d7637c16788e84de9`
  - `commit insured route`: `0x589d39cfb90b2d3954e02e076711dcd851dde2b7d0763859dfa84e67f7c78509`
  - `mark route in progress`: `0x50896fc64de1922dbdcffdbea1b0d673a3c3eef078389c5326e596d349b7f37d`
  - `mark delivered`: `0x81e387be1ffd9bdb66118be0310843989dfabb2644b8dcf7e34350ddc85afca5`
  - `buyer accepts`: `0xd5c3021538a4a1d75d01006b9b63d5194e55f41184e72a0c864a6d9bdbd57721`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_item_fingerprint` `0x2493f6b2909ab860afe316eed5ba13da11910bf36716bdbd64b704a2b6f7e4a7` (marketplace.item_fingerprint.v0.2, valid signature)
  - `happy_inventory_lock` `0xab872b3a04b07160c206d83f4f618a9e9ed5f60c23f07e58e1b246cbc7762b5b` (marketplace.inventory_lock.v0.2, valid signature)
  - `happy_seller_private_predicate` `0x7a0afb5dafd47173cf2e3d8fc505dde7af0eb8bd28ae9e23df78013875f6f783` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0x0e350f22a79e4b49d140ee4c009f3da94c010099c4bb4492f197924066c4061a` (marketplace.evidence_packet.v0.2, valid signature)
  - `happy_verifier_review` `0x4784b6392d76a8060c26dfdd0d5af912518ae4793570d522c48e4008974235d9` (marketplace.evidence_packet.v0.2, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
  - `happy_delivery` `0x61d65d4a617114f5a2bf5003000124c34d5ec625c58d817f9c4cd5b766b9e9d1` (marketplace.delivery_evidence.v0.2, valid signature)
  - `happy_final_receipt` `0x5154efb32d52def53079b00ba5d5f156656ccd33e52838fbfdc4238cb443ddd8` (marketplace.trade_receipt.v0.2, valid signature)
- Observations:
  - replay item evidence reverted as expected.
  - commit inventory lock with wrong fingerprint binding reverted as expected.
  - Buyer-funded intent became locked escrow.
  - Seller attention stayed bounded: one trust proof, one item packet, one route packet.
  - Final receipt closed the trade and released escrow plus bond.

### new_seller_material_claim

- Trade ID: `2`
- Final state: `Settled`
- Transactions:
  - `create new-seller trade`: `0x02f1cc4b4860cb5112667c5c2780da6b77271d8ac2b2573781ce2f1c297e5d05`
  - `seller posts larger bond`: `0x5f2b721fabd2c9028819d68cf988fccd9fffc69ab7f435e04915891ac7365bed`
  - `attach weak proof`: `0x70ec85e098c92a214c21bdff083a55368736d89879150b2ec199b8fd482589f1`
  - `accept claim seller predicate hash`: `0x5fc42706818e5a82e6e1059ab881219ab2831fc5e8c48cea99dac02ad43453be`
  - `attach seller activity predicate`: `0x6ef797b94b7ec77a4ccb9fb17c541529e763785e3c1762aad44cc4c338dabe7c`
  - `attach circuit profile hook`: `0x5517be7468db4602381db8fe54629bd5254924244e3ef65869037d6dfb76f6a8`
  - `attach sparse evidence`: `0x967e69c90d7058739219313e213f8ef6170229938a4fd2152c001a107dc96979`
  - `commit claim item fingerprint`: `0xc7bd2fae12e712e95ec475aecb8c31c6f0912742dab81cfb37f1294006841e2e`
  - `commit claim inventory lock`: `0x766d73db3352b689b8f8f6ec178f2d1989d1b6843285996fe842b1b1aeeeddb4`
  - `open fingerprint challenge`: `0x4e8b17b32bddeb1cac184f5dfb18bd52e7bfbc50bd205242cf957d79795ac5f2`
  - `clear fingerprint challenge`: `0xffa58495b94cb61407e0041bea1edc49169bd18b854bf72251d705170beae95e`
  - `commit uninsured route`: `0x9c001eeece8a0ae0527b0c9d30a41db43c2fbc85f2bd59d91bd577ae71481516`
  - `mark delivered`: `0xcb8bca989c76f0f48a3714eb03d14e1aad4647ed47ae9b2e681a12bd8e6f39e8`
  - `attach received-item claim evidence`: `0x1f5423141192f2fd6b53433e6501e269f60c8e171f9f915040c08f3b2c35211b`
  - `attach verifier claim note`: `0xb241b7212d92eef9761c160dec4539e1cbb552bb384e57dd0da63fed0a2b6f75`
  - `open claim with buyer dispute bond`: `0xd5378e2576a20aff291be16b6770984ea1a9cf7104262b8fa05e4360be8c22fa`
  - `arbiter resolves claim`: `0x0dae772f7809c0c89f675b408fc838d3671bc44c757280a52e58b2ce534840d5`
- Anchored packets:
  - `claim_intent` `0xa2c6c605f6cb21b462f51aad0998b7055b91fa748060cb5f40a8cf451655afff` (marketplace.intent.v0.2, valid signature)
  - `claim_escrow_terms` `0x843b56e06b3432dc115305530d5e3c45cca81b6304034e9d1f949527fcd8d2b3` (marketplace.escrow_terms.v0.2, valid signature)
  - `claim_new_seller_proof` `0xa08a4c76121162c499aa94991c71558e4523d3b509f92cb6047e05b4ce9a4432` (marketplace.trust_offer.v0.2, valid signature)
  - `claim_item_fingerprint` `0xf1e170e691a741dfd0e09a495eb62ca4e4d2c417af7309b0fa15eb4d48e7cb30` (marketplace.item_fingerprint.v0.2, valid signature)
  - `claim_inventory_lock` `0xc5d8a46b258027cfee7d7e4a2c8a729ebca8c994096874a5bc48e64eb6cecc86` (marketplace.inventory_lock.v0.2, valid signature)
  - `claim_fingerprint_challenge` `0xd108882740b0596e4430809278b674f1c6267ba374f7668fe65cb70da7c6f50c` (marketplace.fingerprint_challenge.v0.1, valid signature)
  - `claim_fingerprint_challenge_clear` `0x4ec6f20d6d91d80fe72415b61f6bb4fb6143b2c8a28535a07aba17d820b2e3cf` (marketplace.fingerprint_challenge_resolution.v0.1, valid signature)
  - `claim_seller_private_predicate` `0x1912fbffa7b4521b6fdb92eb56982d41180dd1a83cd846c4dbdf302d4a8970f1` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `claim_circuit_profile` `0xee5543b528ff31f9ca671b364af58634f7abafb2e7aaf82e573228573ac4dd5d` (marketplace.circuit_profile.v0.2, valid signature)
  - `claim_sparse_item_evidence` `0x953b9199569e72b8fca958c21851cbcbe6549e2d007aa5bac4d13ae5606865d3` (marketplace.evidence_packet.v0.2, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_delivery` `0xcd95cb6323d7ffbde126784878dba3e39cc6ceb95f176da9592a73bc6a175672` (marketplace.delivery_evidence.v0.2, valid signature)
  - `claim_received_item_evidence` `0xadb8ce3f7cd03b6e8ade4f3ca0bd14b611bb8a2ba4ba5bef11d976b5df93e81d` (marketplace.evidence_packet.v0.2, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0x6b8df9321c1aa707f3152029391150844eef9d5ee07abce9faeb61a91d461ca6` (marketplace.evidence_packet.v0.2, valid signature)
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
  - `create replacement-path trade`: `0x1a567cb75e5dbc6681ec5efc7e87c007272491b3bf3b5b1efb37e7a9d1380098`
  - `seller posts replacement-path bond`: `0xf583f57762ea5634463c4956873d43bc79f94b1dc46f35e464c068563d18c66d`
  - `commit replacement-path item fingerprint`: `0x14b87b3231b321584209528b4ffe880e9fa370ee8591d596933af62b2bf4622c`
  - `commit replacement-path inventory lock`: `0x23bc89914051d35f5c3f2cbc0dff34ff268d1f7f44dbbee017d5b2e2ef832db6`
  - `commit replacement-path route`: `0x80df8e51ae7f53a4e6127c379bc88c01fc5a513f0fd04f13b7e6510db383ff1b`
  - `mark replacement-path delivered`: `0x8502925b996f1884c9c77d08ea063a43305e0e696cb9ee78b2291aa0ebe4c9dd`
  - `open replacement-path claim`: `0x348693bdadc9182fb7b632bb5dccb2668e83d2c0ecc5149fa870ba4e36359296`
  - `revoke original arbiter`: `0xda85fca7b9ecc90463e805ad045f95860bb2c5ee3427780986b1206d58eb10e3`
  - `buyer proposes replacement arbiter`: `0x473c0f302b0625c0bfb3a5bb29157ceb82aa0ad98e5b21f8435e4c9f5e3c84ef`
  - `replacement arbiter accepts emergency handoff`: `0x60cac8044ab13db3af885663d00e07853e3fbba7d853c45cabd445e68514e379`
  - `replacement arbiter resolves claim`: `0xe7a23f83b05c94ed758efc5d3703b461a08e65da538bd6522cc1982e9aa11c67`
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
- Seller-signed InventoryLock packets are required after item fingerprinting and before route commitment.
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
- Semantically different item fingerprints for the same physical card still require verifier scrutiny, richer matching, or issuer attestations.
