# Local EVM Protocol Probe: local_evm_protocol_20260519T161423Z

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
  - `seller posts bond`: `0x36da34231507fb36a5aca9379fd510a4a3b9c767bd86582b7db594082bb77e93`
  - `attach trust proof`: `0xf97e84908735b5f6e4864f2bd2f684253c63a9ef1ab37bac3771e0a1c03468b9`
  - `accept seller private predicate hash`: `0xc8860f1f6694b7212c652cac91ee4859a65444226c4a5028b5a2d1f349062a68`
  - `attach seller private predicate`: `0xe5ba3ab26f883d174d33fcf4288a8baa80e3103d99303d577355e03b31464989`
  - `accept buyer funding predicate hash`: `0x9c2a5ba9d208a698997e4c8ef74dee042ea525508ddb9bc76cf42723df8acb1a`
  - `attach buyer funding predicate`: `0xee575741598be119d85b21ececa0bf14d6ec49efe9f7f089458bd8dbabc23703`
  - `attach item evidence`: `0x1a5a7ba946388131bfddac27e47410d8667d7f02d53a82603bb6ed305ced32b2`
  - `attach verifier review`: `0x92fe0c7f7a7c3e88940e502ddbf8b13f7092c8c50465e93b5d09d61c9e69f03f`
  - `commit item fingerprint`: `0x710cac74b3f523c8a6251f55558239f5d0bb57cf1a75b7108b3a22e79308ba6b`
  - `commit inventory lock`: `0xc33a647b8f9a14239afd3f14fd1af732d285ddbdb30ef0ec9081615be022a666`
  - `commit insured route`: `0xe59370a2bc039b6e99d03b7e87ed91e463363aa8202b611b71608b5e549a9f72`
  - `mark route in progress`: `0x40064c4b8633c5e41a4174090dae480a94321ada54d2e40d7022bf7851ad9c30`
  - `mark delivered`: `0x601296c7d7bcd35718ec96bda474a66da72dd3e4aa6713e0af0a0409216233ae`
  - `buyer accepts`: `0x57aac9cddd13bbdaa07c342512115fd1fb788d4af45b19ceb42c2f8c203b43d0`
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
  - `create new-seller trade`: `0x97e3e5e74ad67e558fed4d451169dbd39afe2f1b13be25f84f3bba5bf9c38138`
  - `seller posts larger bond`: `0x8ede04a230a7d53e4cc59245d10f45ed5110811777ae9f471887d301d024a567`
  - `attach weak proof`: `0xbf66eecc991439177e62d08f02a1a6ebea19922ba4e07fca38c32e1e2e06e65c`
  - `accept claim seller predicate hash`: `0xbdc621172c048f68e2da38a9dcf0ac01dd7b5037701c863712f5a0fe8304d4b5`
  - `attach seller activity predicate`: `0x7321fa8a871b4000fcb339d9230517a9bc8b1d1b4ed25b512390b92b87f3d175`
  - `attach circuit profile hook`: `0x66e16287b5fcd004874a1a0503236e2f2da00590c9c777ad5bc511857f7c9bdd`
  - `attach sparse evidence`: `0xec07bdf208aaa52b546d43353116cef9cc9cbd35ed1d2ee4cb0bdfb0faea9941`
  - `commit claim item fingerprint`: `0x793b703095c600ee797e0a8dda6d1b8b246a4d21627b034213463b3dee2c6830`
  - `commit claim inventory lock`: `0x8fe6d3624399cec73adeca81d1022d01a0c3e141db55e1b72ce0d60496993006`
  - `open fingerprint challenge`: `0xfdc7de988fbe215075cc8c5e2ef0792dae5d17cbea6aa841a787d1c8905ad0e7`
  - `clear fingerprint challenge`: `0xfc0958321f7a6f473906dc85bfedea12d889958e192ac42dc6c76e91a44a1009`
  - `commit uninsured route`: `0xc7e9148accc136ca4d69cf33abc1233f6d51e45d1ff9aaa1fb43b447648d8aac`
  - `mark delivered`: `0x8d8adb9274fb0d3cad57f710206c478090dec8ba41c920df702ed5c2d6b45315`
  - `attach received-item claim evidence`: `0xc89d4d3e572034cfb707344369a2af5024eef6b8825f68223e78a5d43e360ecc`
  - `attach verifier claim note`: `0xded6f28b1f54c9ca97e14af50bfd2700a64ed97d10f9d8e4a5b384de62f06e79`
  - `open claim with buyer dispute bond`: `0x8a67fa340b42c9dc99a394e82a29f752268bdebb98339e9413d94cfb74939fbb`
  - `arbiter resolves claim`: `0x6855c3fb63ab507fe78a31cbda11ce59057bd5cadafb15d9e1e5b540763b260e`
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
  - `create replacement-path trade`: `0x59c62ff5cacc660445fbc4a19ae6e6b9a709404b6c166d7217ed86cd5a4e164c`
  - `seller posts replacement-path bond`: `0x9cd36bd9e12264f706224425f4e9755a98b4725ebe8c6f569f5472f7f65590b3`
  - `commit replacement-path item fingerprint`: `0xd291b6a1673f629607f6f58168b3bfe304fea00cc52c01e9c9e4e7f5561067a8`
  - `commit replacement-path inventory lock`: `0xfaea2a37ee472f7f29468bc58823e972d6de37d00fe7e6cf4108642ab97c0455`
  - `commit replacement-path route`: `0x50d5f20ee7c0c182a1eb1a7d0bf3db8e12d500f0606a5f33611ad521ddc83eb0`
  - `mark replacement-path delivered`: `0x0cc296d738f9e2ead39b24b835e4b8eefca42b70210f046cce4c92e7d2eef19e`
  - `open replacement-path claim`: `0x7bc803cc9738132512c2681ffbdadbc3125bcdcb016d1258ef30a1179edda14e`
  - `revoke original arbiter`: `0xaa86175535ee06cededb286d4b94e3d691302f2c1e23c28e7241a399d8198516`
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
