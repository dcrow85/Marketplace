# Local EVM Protocol Probe: local_evm_protocol_20260518T190540Z

- RPC: `http://127.0.0.1:18545`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract: `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318`
- Chain: `anvil:31337`

## Registry Setup

- Transactions:
  - `register buyer actor`: `0x66a7c2ab8ae164026cf57b877ea8cddf48386348043792c2dfc45348658c742b`
  - `register seller actor`: `0xe166efd4bafdb5e5cb9b41453bf3c961d9acf3cd438ae9a3a7652af67c18e3b3`
  - `register arbiter actor`: `0x41998c46274ca2e6bb8635c8f43b91c293a217802f5238a830be2b9c90fee01a`
  - `register verifier actor`: `0xceded4e404bf8ab6b8870c6b51335654ea4e0eda679dafc5193a9e07996af842`
  - `register replacement_arbiter actor`: `0xca9642df84b42776158cad83dc0b1fd9823ba0ca239869dee7c12b1c673bf7fd`
  - `register arbiter authority`: `0x54eaa6aac31cd216ccac84d35a6d9bc5a928e269946e77f0adad5f1540412666`
  - `register replacement arbiter authority`: `0x7f9b423e20bf10b60e19c0ca275a660c8603ef93d1878fdde758e23673f8cea1`
  - `register verifier authority`: `0x9e205d6753d7be50ddd16ff21a5bf9863fd3ec10e7b2af522fd3a26b8cfedd72`
- Signed registry packets:
  - `actor_buyer` `0xca07896a6190e860dd51af4241ed9a02835b1930c4dd01a13c7b6d9a44a3675a` (marketplace.actor_record.v0.2, valid signature)
  - `actor_seller` `0x58731f2034f9f2f374d451384fde315bbb8a7a907e23c84a1d4e8b47d7c81ed5` (marketplace.actor_record.v0.2, valid signature)
  - `actor_arbiter` `0x0025cd199f11db191de2e1f83919b36022cca03b844c6169e8941f9f976f4442` (marketplace.actor_record.v0.2, valid signature)
  - `actor_verifier` `0xf1dabec00581b587e9298a603d99dee6bd6a37afb765202df9818deccfd636d6` (marketplace.actor_record.v0.2, valid signature)
  - `actor_replacement_arbiter` `0xac96bd505a7604e9de45910564e0bcb27b5410a0bdb3d3b1fc382c2dbb56e76a` (marketplace.actor_record.v0.2, valid signature)
  - `arbiter_authority` `0xa9248044dfd441d24063324f762a928fef56422ae6281ad465b34b9e5ab1724f` (marketplace.arbiter_record.v0.2, valid signature)
  - `replacement_arbiter_authority` `0xb258ca210e4b4df25b5fc896b5478bad46e53dd183672bb9a68e63e389cb770d` (marketplace.arbiter_record.v0.2, valid signature)
  - `verifier_authority` `0x9b58f9b34334a5099078df708ba4fd129f1007994ddee0b361570a0c711f6f22` (marketplace.verifier_record.v0.2, valid signature)
- Observations:
  - Every actor has a controller address and a signed ActorRecord packet.
  - Verifier and arbiter authority are separate records, not just role labels.
  - The escrow can now reject trades that select an inactive or unknown arbiter.

## Scenario Results

### happy_path_insured_card

- Trade ID: `1`
- Final state: `Settled`
- Transactions:
  - `create insured trade`: `0x0f9d8db69a7e33d3d9822da54d9ab78f72a41f6d49ed9ce16ab92b2c4788e299`
  - `seller posts bond`: `0x4d582bf67ca59387cad09d7f455232bccf509035fbfb32e46961e220e8504ffc`
  - `attach trust proof`: `0xe4239d39e0e5aabf37cb22607ad5150c0b072d523282a115a6e296a5a7a67b9f`
  - `attach seller private predicate`: `0x31a3ea14783fa1740985d97b10618abc62818b09da6b16456e591589b52ae994`
  - `attach buyer funding predicate`: `0x15d8aa928aa83a8bf0420604110adcbdd7d6283de3c6973f01cb7e0cf0d1aaac`
  - `attach item evidence`: `0x5622bc4dd9dda4819d1e97990c89de7a904e2baa29da81f702f49c9f6548cd1b`
  - `attach verifier review`: `0xb8c92bf4d16156713ef036ef0ed70adb38ebe86da7657ee280f8677c88732322`
  - `commit insured route`: `0xa5f824bf088e51e1b6df4f198c8b9e9d5327f18951c8c1f50ee178d0a79438fa`
  - `mark route in progress`: `0x6a959cfa73ba3f3b1be2c434f72142dda73fda3ef96e268fda8c0624796579fa`
  - `mark delivered`: `0xea850bbddd23b15c3331adf986f2966be3851a7359d67697646323095e8ed983`
  - `buyer accepts`: `0x47e4ddfef9c7deb6b864eefef40f0db1e1ec6b186688b6d7d45bcba0fb3a5a2f`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
  - `happy_seller_private_predicate` `0x7a0afb5dafd47173cf2e3d8fc505dde7af0eb8bd28ae9e23df78013875f6f783` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_buyer_funding_predicate` `0x027318902dfaeb3f7fec8c77c1f6957821f9527c41f4726b3a052c02080079c0` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `happy_item_evidence` `0x0e350f22a79e4b49d140ee4c009f3da94c010099c4bb4492f197924066c4061a` (marketplace.evidence_packet.v0.2, valid signature)
  - `happy_verifier_review` `0x4784b6392d76a8060c26dfdd0d5af912518ae4793570d522c48e4008974235d9` (marketplace.evidence_packet.v0.2, valid signature)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2, valid signature)
  - `happy_final_receipt` `0x5154efb32d52def53079b00ba5d5f156656ccd33e52838fbfdc4238cb443ddd8` (marketplace.trade_receipt.v0.2, valid signature)
- Observations:
  - Buyer-funded intent became locked escrow.
  - Seller attention stayed bounded: one trust proof, one item packet, one route packet.
  - Final receipt closed the trade and released escrow plus bond.

### new_seller_material_claim

- Trade ID: `2`
- Final state: `Settled`
- Transactions:
  - `create new-seller trade`: `0xb30ff829e418f6bc9e1abb296e7a03af23220a9ccab0995195c6ffcf994f1b50`
  - `seller posts larger bond`: `0x22ba21592e77e592017a5d17467fc2ee49890df8009cdf55e4bfaacf8c142381`
  - `attach weak proof`: `0x8ee28d29918021c1cdf6abaef3045011fdf8dcaf717033bd1ef6e413e6fcb777`
  - `attach seller activity predicate`: `0x2545651f5e5a204b0ea9ed33ea1424f722dad539b10b5fd3dd099d03f2bb1cd4`
  - `attach circuit profile hook`: `0xf4320f09c7c205d2b7295dc5781197d24ac07e681e09ef95ce49b91191905870`
  - `attach sparse evidence`: `0x3cea1a167915e7d804d9bf2a4df7273c6f73017fe8941dccac83115fd1c9dce1`
  - `commit uninsured route`: `0xa1d9b5e3226befcb2d60c17a59bb940fae1f9e22d2228d881d133353f5a4266c`
  - `mark delivered`: `0xc66514aec97a704ec9c2d7098bbb4ef256b8df8ef0deb9c4ae63742a1f0dd3ba`
  - `attach received-item claim evidence`: `0xe092ecfd1366682ccc47ea06611151d2a69ad051b95ebac916fb92df7cf76643`
  - `attach verifier claim note`: `0x32dc32f667b5108b719145580d01baa37a382a6a29dca97275c80883cb039277`
  - `open claim with buyer dispute bond`: `0x6f0eab3bbe1efd58bd66349a9a985711b4061f56c05c48718a1b9de552f02d52`
  - `arbiter resolves claim`: `0x4b497d554a899924fa8525cd25d4343a3bfceb85672df79f68e47b441d4977e9`
- Anchored packets:
  - `claim_intent` `0xa2c6c605f6cb21b462f51aad0998b7055b91fa748060cb5f40a8cf451655afff` (marketplace.intent.v0.2, valid signature)
  - `claim_escrow_terms` `0x843b56e06b3432dc115305530d5e3c45cca81b6304034e9d1f949527fcd8d2b3` (marketplace.escrow_terms.v0.2, valid signature)
  - `claim_new_seller_proof` `0xa08a4c76121162c499aa94991c71558e4523d3b509f92cb6047e05b4ce9a4432` (marketplace.trust_offer.v0.2, valid signature)
  - `claim_seller_private_predicate` `0x1912fbffa7b4521b6fdb92eb56982d41180dd1a83cd846c4dbdf302d4a8970f1` (marketplace.private_predicate_proof.v0.2, valid signature)
  - `claim_circuit_profile` `0xee5543b528ff31f9ca671b364af58634f7abafb2e7aaf82e573228573ac4dd5d` (marketplace.circuit_profile.v0.2, valid signature)
  - `claim_sparse_item_evidence` `0x953b9199569e72b8fca958c21851cbcbe6549e2d007aa5bac4d13ae5606865d3` (marketplace.evidence_packet.v0.2, valid signature)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2, valid signature)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2, valid signature)
  - `claim_verifier_note` `0x6b8df9321c1aa707f3152029391150844eef9d5ee07abce9faeb61a91d461ca6` (marketplace.evidence_packet.v0.2, valid signature)
  - `claim_ruling` `0x30bbb5ace10e30f52951b865de73469de9f747a111e122e46ac1086f3e95bf3c` (marketplace.resolve_or_claim.v0.2, valid signature)
- Observations:
  - A brand-new seller can still clear the trade by posting a larger bond.
  - Weak trust proof did not need to become a scalar score; it became an explicit gap.
  - The claim packet and ruling hash give the agent a clean evidence trail after settlement.

### revoked_arbiter_replacement

- Trade ID: `3`
- Final state: `Settled`
- Transactions:
  - `create replacement-path trade`: `0x2d0bf5d3d421e6b6c82ded49e72c626a859162aeb71079727fdaf5094e14fa88`
  - `seller posts replacement-path bond`: `0x30a6213b38116fe9ef9e2f8e293aa3ad9657aa8935985f7d3f462227ddd1971c`
  - `commit replacement-path route`: `0x5427f788cafc7956f27a1897b98349b08ff131ac3742a1cc44a90f8dcae524c3`
  - `mark replacement-path delivered`: `0x9573970f825e6c9641689d02e1548c6f78cf35c22573debe5ace1e2604074858`
  - `open replacement-path claim`: `0x9824be8dcdc6b7dda37ac43dccd1beabcacb3f9db44bcc49f51630371811161a`
  - `revoke original arbiter`: `0xdd77517c4c184041512ba2b9812e7b6c2239b0486d1bbdcd0e3e5d4657647609`
  - `buyer approves replacement arbiter`: `0x38775a8d2c3f8fc70806a7aafe870d65aa31bd4d0d57348cc14d3c98910b4a65`
  - `seller approves replacement arbiter`: `0x73e30630113cc92be67730227591cbb4870a2f9e5d0f294393987b73ef0f0bc3`
  - `replacement arbiter resolves claim`: `0xf26e42c47219f94ff575b10586b077258628c99aebcc03278b21e1c642fce1a3`
- Anchored packets:
  - `replacement_intent` `0xd16d227a2f5438e801bf3d2865156985f55471c20c471e678ba0642bf2113e47` (marketplace.intent.v0.2, valid signature)
  - `replacement_escrow_terms` `0x05bdd48d223f5e82df442065d5d3b3cda7033e64a6cd6c2c63e092ed1cd8f2b1` (marketplace.escrow_terms.v0.2, valid signature)
  - `replacement_route` `0xacd43897e24072fa669d9ed71da1af9e80b2c086dfbf89c85be310e90f7e3dba` (marketplace.trade_route.v0.2, valid signature)
  - `replacement_claim` `0x6719e50f76acbad1421ebab940347add42823dd76a235059b467297950d3c3f5` (marketplace.dispute_case.v0.2, valid signature)
  - `replacement_buyer_approval` `0xdbc13d8f6e4134dfc203ae9fc6383f73c16768cd7842f51472e227af310d7bc1` (marketplace.arbiter_replacement.v0.2, valid signature)
  - `replacement_seller_approval` `0xdbc13d8f6e4134dfc203ae9fc6383f73c16768cd7842f51472e227af310d7bc1` (marketplace.arbiter_replacement.v0.2, valid signature)
  - `replacement_ruling` `0x5ce46e0f09cdf01ba5d16046ddf48bcd097b3115e58e127e218a296eee6813ea` (marketplace.resolve_or_claim.v0.2, valid signature)
- Observations:
  - The original arbiter can be revoked without letting stale authority resolve.
  - Buyer and seller must sign the same replacement proposal hash.
  - The replacement arbiter can resolve only after both approvals land on-chain.

## What This Proves

- Off-chain protocol objects can become deterministic hashes that the money rail can enforce.
- Actor packets now carry EIP-191 signatures from registered controller addresses.
- Verifier and arbiter authority are explicit registry records with metadata hashes.
- PrivatePredicateProof packets can prove threshold facts without revealing source data.
- CircuitProfile packets reserve ZK verifier hooks without requiring circuit work in alpha.
- A low-friction happy path can close without over-asking for seller attention.
- A risky new-seller path can be made acceptable through bond, packet quality, and explicit gaps.
- Claim resolution can emit a compact on-chain ending while preserving rich off-chain evidence.

## Still Not Proven

- DID key rotation and delegated agent signatures are not modeled yet.
- Verifier conflict checks are registered but not independently adjudicated yet.
- ZK proofs are reserved as packet fields; no circuit is verified on-chain yet.
- Stablecoin/ERC-20 escrow is not modeled yet.
- Multi-agent negotiation is not connected to this runner yet.
