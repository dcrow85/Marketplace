# Local EVM Protocol Probe: local_evm_protocol_20260519T161636Z

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
  - `create insured trade`: `0xb736ebdb85c21df390231a19e854229d494e2699dfe5b364219dc6717577a172`
  - `seller posts bond`: `0x6a6374255e0460ac7a604c019f7e5709ed53a8116142edc769aafcf610d94156`
  - `attach trust proof`: `0x76b1bb19f6145a8aa331c6f41cf1d756ce68442b336003cd4810b4a40805738c`
  - `accept seller private predicate hash`: `0x310491c7baa09bb8684b26944bf1e258baddf36c45cc701eaed126f7f002fbe8`
  - `attach seller private predicate`: `0x81231f14dd4fdd21dd19bee9c6494094f5a30c6f833805eded2fc0014a525c3f`
  - `accept buyer funding predicate hash`: `0x6cc86e830c6b5d869716bafd8f908f75dcfb329bc80606c620d436e86d5d6395`
  - `attach buyer funding predicate`: `0x7b396e959eb4b890c9a12448b96222cea39ba84b0224577d466c214b9458f297`
  - `attach item evidence`: `0x2a7a7ce472bd9abdef8b22018396fbdd73bc0cc4baca4be610e6ddd13e12d81e`
  - `attach verifier review`: `0xe9021d6693fb97c5fc825b3370f5a3f36e75c376f13f35307fea4f50cf12deeb`
  - `commit item fingerprint`: `0x2774705676118f787bd8f1ff8a2be693060b9838a0fa2aa37cae433fa2808809`
  - `commit inventory lock`: `0x3141666901f9160e5a985e1cfd6fd9f9cd1cabd2a7294b0e28d20971366c9a9d`
  - `commit insured route`: `0x874546266dac8b46761f2801603813bf4c42652da62d21db92c66439d5a2f472`
  - `mark route in progress`: `0x3d350215dad9c89e3569d4876cf4a5a060479ac6a879691fc98426157d0dbdff`
  - `mark delivered`: `0x18d3d31f8c890f88fe9b673eebabf01df6b8562dfc60529a3acb56d5d8e35b9f`
  - `buyer accepts`: `0x3343e93f2de1e4a1a42fcd7b756d707598492cf7af1dae5ac51df1448a9a4c37`
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
  - `create new-seller trade`: `0xaea4a240087cbb8faa2fcee3da8f2a288488d4fe6e87df8a51170b6e735267a3`
  - `seller posts larger bond`: `0x582da85b9a409cf9c7e9ebb5a8616e01e9e064bdc552b288fe3e5c2b69f9320b`
  - `attach weak proof`: `0xb49f5c5e590ef657e4933576960e8f6688745fdccc8a94ad8d7f057b1013f728`
  - `accept claim seller predicate hash`: `0xb63e9d868ebb86c9e406f78522d0b9c52735d6c3ae1ede2b09ece8205da391f7`
  - `attach seller activity predicate`: `0x0b48fc7c9380f1b99d02cf1f66d91b8dc5eb1a12c44fa71e53ef435d5625c2a6`
  - `attach circuit profile hook`: `0xfd155f4fe1542e13a8613171421822f0dabb9a50f9050ca07eaaa31d401b430c`
  - `attach sparse evidence`: `0x663781b8bb92582f853e9385e4cdc4c1e57ce3e866701aced3c567f54ec04c62`
  - `commit claim item fingerprint`: `0xa336c5374984d40268a36ff7ac2b9086ea18e8513b94efd72c04e2279d7b1da8`
  - `commit claim inventory lock`: `0xf2ad336e06f02802d8e009aa97a847f9c2c652401f888e7252d73aaa065b8c4e`
  - `open fingerprint challenge`: `0x6f2c27275d0d114f5c95fd7562ae89e8ea088f3206d3d0abc5b50d5656d25fa0`
  - `clear fingerprint challenge`: `0x8cf586d04c7fdaebf5e95ee58ee3ac367842dba1ff2adb28eea58f97f212c325`
  - `commit uninsured route`: `0x2de54c144b78b513d898225f690432e1360fe152e100f7385dcbdb1265a5925c`
  - `mark delivered`: `0xd342b3d3b2512e15e525a50a1e65bb0c222b22863c917fc4c8dc6766d789cd3f`
  - `attach received-item claim evidence`: `0xcfb23a7cdcd7f1c8d975c9d1983a03164cc17148380ac5634f03987bb76e5c72`
  - `attach verifier claim note`: `0x64af35d2bd0e1597832f65d899ee9ccd11dd0bbb801928641586b480a93731b6`
  - `open claim with buyer dispute bond`: `0xdda912e138a952c79874b37dba1417e52395563a4eac41c34b8a54704c901080`
  - `arbiter resolves claim`: `0xb648c153d468781c5e4ba78420093200b00e2ded3be63cfc95b183531d7b1b8c`
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
  - `create replacement-path trade`: `0xf7bd0328c1cd067e6f964509d94b6a8f62acdac5e39ec19b50df07a3784c88b8`
  - `seller posts replacement-path bond`: `0xdc9b5d7a7f74b1b721ca4c7f8c23b2bf9cc805795a393656d70bcad915145e8a`
  - `commit replacement-path item fingerprint`: `0xf5e772f3b8d1f0e42a26d312515ca88e8106003382921f1d6ebdad61c0ef616a`
  - `commit replacement-path inventory lock`: `0x2cdd39fad07a3e660007eed25e676af4acbe06640f80f6f3f6d2ca04a3a85c1a`
  - `commit replacement-path route`: `0xc99ba47395c34f2bfe2d2c16100bd18574bd009ea127e25af4ec1cd6836ab71d`
  - `mark replacement-path delivered`: `0x52577a2c6857c9060f5ba5dae1f869adc99091e23f88c9437b1b2b5450f614c1`
  - `open replacement-path claim`: `0x2079eff902f592a71c21565b55c0ce24f8a02f14cb351deed4495138219910c4`
  - `revoke original arbiter`: `0xe03496ff8fc59d427e00b16dd065e64c536f7f70bb94f46e1007a4c440a00a2d`
  - `buyer proposes replacement arbiter`: `0x898fca6936769fdd7956690d7a6e90af2d07de75d6fc784f846a2fe26f979fa7`
  - `replacement arbiter accepts emergency handoff`: `0x1e39d483c1f95398400193e5bed3b921de1c9db47bd5cb5d482f47cd57eb14f3`
  - `replacement arbiter resolves claim`: `0xfc78562b25de54fbe7bed42a79f18354f510161aaf8badd603304394d870e75e`
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
