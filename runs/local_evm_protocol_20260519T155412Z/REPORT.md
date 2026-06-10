# Local EVM Protocol Probe: local_evm_protocol_20260519T155412Z

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
  - `create insured trade`: `0xf772b62ea355d86ffebfa029c907a8f03903cdaccb9f190e0d49ad73f6191168`
  - `seller posts bond`: `0x62bf706455e7267b81649da1204b50602908c1b6c0f2d9e969c04a44ccd9e56f`
  - `attach trust proof`: `0xb65b827a86bbb9ca5d1424307bf96a7a6420636dddea01019d50831af1e421dd`
  - `accept seller private predicate hash`: `0xba92b1568d12eb3bd4164b68190f9b11ef5cbc27498bf5aaa794efb69c62a85e`
  - `attach seller private predicate`: `0x87ec0bcdcb0aaa9cc6d9cc9be32cf2053450ad1c611f00dd8df296db1addeb32`
  - `accept buyer funding predicate hash`: `0x0fd3ba27deb2b65e853b6da97cd0fb11dc377a16c9523b4cfa3d53da1ebbc8a8`
  - `attach buyer funding predicate`: `0x3710373380f8b293e2736c6f8486ada24d05fe1e4085fb390b7224318358c314`
  - `attach item evidence`: `0xc00c9bff2c9646ebecc2c145ded8c6aded3b4f030504ac17cd90e7b9d7794f1b`
  - `attach verifier review`: `0xc22dffb97960f2a9d09fa6c4e2b4ac9787be7d3d6a7e45c1731184eb42881a2b`
  - `commit item fingerprint`: `0x484a09b574b0692012ffccbbd14301a487c6bdb6177ee79d51cff68231a96620`
  - `commit inventory lock`: `0xcab52a2dc46da6e5f7628138be1f2d8036859745e2618efdad7c4adae05fffad`
  - `commit insured route`: `0x3acbd686d46511b3d0ae77971af05bb71017d6b2bd6f32d82268ab9d7f9b1636`
  - `mark route in progress`: `0xcbb3031be76cfea58fa723fb7da722948098a241ec0961fbaee4037052dc97fb`
  - `mark delivered`: `0x7dbfbeeaf62719517b414ffdcfe9ba8a81435a5053eaeedf7733250fd129b8df`
  - `buyer accepts`: `0x2a0aec40acf83ea3258f3a9b1d83e48319e253187ba31e1c301f45945ecc1d82`
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
  - Buyer-funded intent became locked escrow.
  - Seller attention stayed bounded: one trust proof, one item packet, one route packet.
  - Final receipt closed the trade and released escrow plus bond.

### new_seller_material_claim

- Trade ID: `2`
- Final state: `Settled`
- Transactions:
  - `create new-seller trade`: `0x4237e056a07cdfd47477facfaf0d5c8cf5aff439ef8fab7fd85eb3f36e82a36b`
  - `seller posts larger bond`: `0x7ca08ca75e2da899ffa173fe632e15ff0bff53cddb94625e19444f320ab2f6f1`
  - `attach weak proof`: `0x482bb375c34d005698ae4ac518cc8ee5e509309a1f4e1b621055ccb2ad6e9d6d`
  - `accept claim seller predicate hash`: `0x88cfd733efba64949c617c7ad51894fa8e767cfdd3cabba44c69715c243add52`
  - `attach seller activity predicate`: `0x16832b975d815712538828e85ea11063251f9a6daaf0c3a92a6945a98f05a96f`
  - `attach circuit profile hook`: `0xfb69b534b5d60b3567d5dbac9193b74f2c4777204d9d0adb79bcbeae984a7587`
  - `attach sparse evidence`: `0x88e615266c1ae41eaaa013215a84a80560ed42dbe4a53d20d822513f543a87b5`
  - `commit claim item fingerprint`: `0x249c66dbf2c7683c6808ea38cf6119b706fd1bcf7087076c6ea9fc633122fb5c`
  - `commit claim inventory lock`: `0x08369b67039a30998ea6e918a2e298330cb59ac5763070205200e5d4f2efc413`
  - `commit uninsured route`: `0xd36ad635dddff8af02f5cd2a999d503a6ca83912b43cd21d869f31b18b69b6d0`
  - `mark delivered`: `0x6b6ba3c9428463513b34b9aee7a844717ff2724b6ca12dba6c1ea485babcc252`
  - `attach received-item claim evidence`: `0x3a5f654612892e53870a1badb4c2c6c77036cd9d996e7ee70c41e6d96e0dbc91`
  - `attach verifier claim note`: `0xe4dee3dbe25b04a32cdf5f61f2524179e1692ac5ce63be714a7a6efc0fd17b14`
  - `open claim with buyer dispute bond`: `0x6f278480ffb02ee06354a7dd9dd1f1eb38fa828ef9e627aa2a5d0f2cbf3a6434`
  - `arbiter resolves claim`: `0x7f3be9dac5293bafa45ab68c8996a2bef777064c77b63c7642db31d327fa45d6`
- Anchored packets:
  - `claim_intent` `0xa2c6c605f6cb21b462f51aad0998b7055b91fa748060cb5f40a8cf451655afff` (marketplace.intent.v0.2, valid signature)
  - `claim_escrow_terms` `0x843b56e06b3432dc115305530d5e3c45cca81b6304034e9d1f949527fcd8d2b3` (marketplace.escrow_terms.v0.2, valid signature)
  - `claim_new_seller_proof` `0xa08a4c76121162c499aa94991c71558e4523d3b509f92cb6047e05b4ce9a4432` (marketplace.trust_offer.v0.2, valid signature)
  - `claim_item_fingerprint` `0xf1e170e691a741dfd0e09a495eb62ca4e4d2c417af7309b0fa15eb4d48e7cb30` (marketplace.item_fingerprint.v0.2, valid signature)
  - `claim_inventory_lock` `0xc5d8a46b258027cfee7d7e4a2c8a729ebca8c994096874a5bc48e64eb6cecc86` (marketplace.inventory_lock.v0.2, valid signature)
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
  - A brand-new seller can still clear the trade by posting a larger bond.
  - Weak trust proof did not need to become a scalar score; it became an explicit gap.
  - The claim packet and ruling hash give the agent a clean evidence trail after settlement.

### revoked_arbiter_emergency_replacement

- Trade ID: `3`
- Final state: `Settled`
- Transactions:
  - `create replacement-path trade`: `0x73b8fcb5694f137a2090d5cda23402f4277de9b7ecbe0600889fcfcba3400b16`
  - `seller posts replacement-path bond`: `0xaecbebfb3ccf73ab89e5c6721ff300ab2e939a91f3b8eb758d1675d39632bb1d`
  - `commit replacement-path item fingerprint`: `0xbdc5a2eb7b2428714e004689cae0dd312703011eb98bf9e2006640f0b810eaf3`
  - `commit replacement-path inventory lock`: `0x26e5b729e950f2c4ac4b7116115677667504e578674a954aee321fabdac4ad08`
  - `commit replacement-path route`: `0x4ede89cb2eb0315bd3bdf1486fb58dc9a8f38e4c7e31f2835175d9edb4a0ac37`
  - `mark replacement-path delivered`: `0x3d060a586504c81e8cd2cbee747fd927a0d1b51fdd2bc35f32ba4eeb64f16f17`
  - `open replacement-path claim`: `0xe8c75c795c8e476cb293deeeb1a73c146c702a10072f5106df92f04492c263c3`
  - `revoke original arbiter`: `0x8e428ea9c82799db3ffb281c7fdc16f6f0c3b99f09ff2dc82e01ddd481a4872e`
  - `buyer proposes replacement arbiter`: `0x9062366b6e1ed3f7f18dafe5cebc9afd39d35e2a06c6c90943cc090bd080569f`
  - `replacement arbiter accepts emergency handoff`: `0x6595ff4aefd8213713ab857eab2dc2ec7955866c1e7bad64b2fd5d6886e8d348`
  - `replacement arbiter resolves claim`: `0x839ab2f30e907d672a7d9f1a1e6af2c2fe790a9e6bbf9128bd6f80146cef8e5c`
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
