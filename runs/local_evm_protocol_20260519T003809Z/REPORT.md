# Local EVM Protocol Probe: local_evm_protocol_20260519T003809Z

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
  - `create insured trade`: `0x95921c3f3754b0b119969c5b360e7d6a4ec5ea37107d289751c389c161b669c4`
  - `seller posts bond`: `0x49b2657a39328846eda563653097257ddeb94ef79f89ed2a2af66d1d92a3f8ef`
  - `attach trust proof`: `0x09eba9c8721f0a9c22699d1b79e49ea105c2a01fe07265b610ffa1a65a138073`
  - `accept seller private predicate hash`: `0x6b73147be628934f1b1852b63b591cb861c98087fa307e259892a1a9b68c8bae`
  - `attach seller private predicate`: `0x7420f1f0390e956fd309c37e5c2c023f97eceefd981224e737810ea53da49678`
  - `accept buyer funding predicate hash`: `0xa713a6c567f54a48bbb48917eb97326553dd20f56d25f17df8975b3ab3c0e8cb`
  - `attach buyer funding predicate`: `0x0800f69be9a162f3a51ad66c9d1bec301b8067c3e7fe3d5edace5dcf2b962596`
  - `attach item evidence`: `0xbc368409173c49abb88a2c0ea314eb86b6c89cb513141079d330d07706801b17`
  - `attach verifier review`: `0x41124cdd56fdd6b8485bc42d193900d047b28ff521adbf3b8c8e70ceff9cceff`
  - `commit inventory lock`: `0x2167520a1e5ea4158c6b75388361f7878a38b2776730df14782f5aa6717f9f3c`
  - `commit insured route`: `0x9b11f0b0dc917bc2a60ac9b3c354e8d9e97df8053deb5ae28cd584ee0e119b5c`
  - `mark route in progress`: `0xa90734af44b71b3a0c68b206737472304325532cb6ea180ffa6d68a2fd089b99`
  - `mark delivered`: `0x4187749eb1c7c9d59cd056bd93d5b250a04638e7294b883f8cf88dfe7c979eb0`
  - `buyer accepts`: `0xcb981c84bb125a02c9d8d6316528085cc8fe46440cb77437f91ce3797105bb07`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_inventory_lock` `0x87ed77c9285f36e15a37d22afb9f786c15539c4a1afe65dc4cae2f1f4cf29d45` (marketplace.inventory_lock.v0.2, valid signature)
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
  - `create new-seller trade`: `0xca07cf7570980c0788ef6e29b4f0218b1ece650ab59480875932b4cb0d683b4b`
  - `seller posts larger bond`: `0x49da031f89937422227db23a164d502c3313e343d22059639866fa7ac77df461`
  - `attach weak proof`: `0x2bf5203295f6b417036390e85163c545ca5999bc01b8ad92effffb71a1d2d764`
  - `accept claim seller predicate hash`: `0x3775ae4e57581ccd98374975131b41e946e9d429dd41bee9fc3dbf295e4769b9`
  - `attach seller activity predicate`: `0xbed8801239f59039ac639a41923ac33a63ba799bd92cec07e54fea3090ad0f74`
  - `attach circuit profile hook`: `0x15fcfc1067fd642b1b290ed88aee59811c6eddca22b6226a836fa63c30ef6e15`
  - `attach sparse evidence`: `0x5f948975f66e72f3c95b520dea4eac2795a32d374b777a5e730b8a5b72202177`
  - `commit claim inventory lock`: `0x046dce613965b16dc26ca7af8a8422759ee53643145e9124583869e2d464a54d`
  - `commit uninsured route`: `0x8ab241126e8196bcda24cb6bff2919c485b66d3ba6fc09cc021350c8644633fe`
  - `mark delivered`: `0x0ef5b14bba4e2432c65469136dd1ffe7f45f4eac5b0438e81ef7a2cacadabedf`
  - `attach received-item claim evidence`: `0xe239a31fe914face8b5e5dc10109c6b2c87e6aa2b780631a83793939a466a531`
  - `attach verifier claim note`: `0x6e84bc731100ee928f5d5fc080a16d3b8134a6d89ccb6293a6bce388d8de0791`
  - `open claim with buyer dispute bond`: `0x0874da1339ddc9affff4d542cd100a01ba6796423c955f8c2fbcea2229152381`
  - `arbiter resolves claim`: `0xac9345ebe08eeab3924272fe69f4de5a803e0bba771502ac7ec44c0dd7a3d646`
- Anchored packets:
  - `claim_intent` `0xa2c6c605f6cb21b462f51aad0998b7055b91fa748060cb5f40a8cf451655afff` (marketplace.intent.v0.2, valid signature)
  - `claim_escrow_terms` `0x843b56e06b3432dc115305530d5e3c45cca81b6304034e9d1f949527fcd8d2b3` (marketplace.escrow_terms.v0.2, valid signature)
  - `claim_new_seller_proof` `0xa08a4c76121162c499aa94991c71558e4523d3b509f92cb6047e05b4ce9a4432` (marketplace.trust_offer.v0.2, valid signature)
  - `claim_inventory_lock` `0xd17a595f727bbc58a370cca3300401342e71b03f3000609171a9f8f24088ee87` (marketplace.inventory_lock.v0.2, valid signature)
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
  - `create replacement-path trade`: `0xa77d72ae2596538a9fd42e0e1179dc744401e418ae8f347c7e4a27bcf2be8f66`
  - `seller posts replacement-path bond`: `0x27051b118ebd2039a66caff091d1e16dc72fc2d312ae6c7ac33b572aba62b93a`
  - `commit replacement-path inventory lock`: `0xb5e82d03ce63c74665a813801014096ce6e99ccb87964a4851b285208a8c5df0`
  - `commit replacement-path route`: `0xc85e1c5b2ae73c4f286e15cc4ab5b128b2e0a9386238bdfa788c672b5d2afcdb`
  - `mark replacement-path delivered`: `0xc42e7f008b51908e92bf50319b8384a3af3fb748f6a60b09ec4c9f684475ffbc`
  - `open replacement-path claim`: `0x03bb48200e017a3079e5426e981c6a2858951586203fd3849a6f94f0a1f89704`
  - `revoke original arbiter`: `0x1732ba4d9bc636f74566ac58aaae2bbe479c1225fb0e698dbb23493cdaf88731`
  - `buyer proposes replacement arbiter`: `0x2bb99ebdc8de695102e2697a6503a71bf13016761f4fee9799338d16b2783bf6`
  - `replacement arbiter accepts emergency handoff`: `0x58d1b73ea94e2dbfab9f1cc7d0bef79b0036dd6487803488cb0fd8c96d753dcf`
  - `replacement arbiter resolves claim`: `0x98eec04096247717b0b32710661bcea4fef13fcfed0b91e51aa6494ab2c89819`
- Anchored packets:
  - `replacement_intent` `0x0fb9378438d7a54625da08dfb63cea4581ea94aadc3e2b59ddb296575808ca7d` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x2e801f7b8e533cec821a4165d27499cc9d34596af2bb6846391d4c7c6c1dd629` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_inventory_lock` `0x90d7ee4db4b6a05b376a78577458645a532e303ed6792a8e73f4c0952e163f3f` (marketplace.inventory_lock.v0.2, valid signature)
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
- Seller-signed InventoryLock packets are required before route commitment.
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
- Semantically duplicate inventory locks for the same physical card still require verifier or fingerprint scrutiny.
