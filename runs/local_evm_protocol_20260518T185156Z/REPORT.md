# Local EVM Protocol Probe: local_evm_protocol_20260518T185156Z

- RPC: `http://127.0.0.1:18545`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
- Chain: `anvil:31337`

## Registry Setup

- Transactions:
  - `register buyer actor`: `0x66a7c2ab8ae164026cf57b877ea8cddf48386348043792c2dfc45348658c742b`
  - `register seller actor`: `0xe166efd4bafdb5e5cb9b41453bf3c961d9acf3cd438ae9a3a7652af67c18e3b3`
  - `register arbiter actor`: `0x41998c46274ca2e6bb8635c8f43b91c293a217802f5238a830be2b9c90fee01a`
  - `register verifier actor`: `0xceded4e404bf8ab6b8870c6b51335654ea4e0eda679dafc5193a9e07996af842`
  - `register arbiter authority`: `0xe21f742d5e55db3d475a9b658557a3dfa72bd7f64acdc1e3e0e7e52540764ee6`
  - `register verifier authority`: `0x1dff1a42508e3d3b3564d25a6360bd52c344889926f225eafc73ff1e10f09ae8`
- Signed registry packets:
  - `actor_buyer` `0xca07896a6190e860dd51af4241ed9a02835b1930c4dd01a13c7b6d9a44a3675a` (marketplace.actor_record.v0.2, valid signature)
  - `actor_seller` `0x58731f2034f9f2f374d451384fde315bbb8a7a907e23c84a1d4e8b47d7c81ed5` (marketplace.actor_record.v0.2, valid signature)
  - `actor_arbiter` `0x0025cd199f11db191de2e1f83919b36022cca03b844c6169e8941f9f976f4442` (marketplace.actor_record.v0.2, valid signature)
  - `actor_verifier` `0xf1dabec00581b587e9298a603d99dee6bd6a37afb765202df9818deccfd636d6` (marketplace.actor_record.v0.2, valid signature)
  - `arbiter_authority` `0xa9248044dfd441d24063324f762a928fef56422ae6281ad465b34b9e5ab1724f` (marketplace.arbiter_record.v0.2, valid signature)
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
  - `create insured trade`: `0xda999af6fb1d46fef83a41464bcbfb393ffad10640a972e38efe33d50ae62a8d`
  - `seller posts bond`: `0x5082a41ab64a5eb4bf1be804ced106977f8b537b4a9af96dff5376de741c1b45`
  - `attach trust proof`: `0xfc168f6608d0f2626d0d8598e4c224b0988cad2277cdfcfe4bde5b029b741a03`
  - `attach seller private predicate`: `0x5f0d8a8cf3ab88b0889b7d416f1a96230d1fbf255c4d2ee754a3f10fbe86902d`
  - `attach buyer funding predicate`: `0xe103cfc12a4d37ef5fa47e31a86239da59dc07b66f960bc2ca517d351b62a594`
  - `attach item evidence`: `0xf9d13b3e09b5e7c94388b49ab1246e870c0659352288aa245c3d9ffe48aeece6`
  - `attach verifier review`: `0x6d488237a4a1589b254775239b825cdef2c325dca3749ae146707c74859abcc3`
  - `commit insured route`: `0x0e4f50735e8aac65f11f402265dc82450b7a2c3433ec1e9107983fb38ab4ea35`
  - `mark route in progress`: `0x84ef4e80ddf03adeaf2088b7d859ec6850ed9e838be878f51415f8e84ca4aa8f`
  - `mark delivered`: `0x9c1b352aca5021ebadfc50f0820bf61bef9e988726261cf2957ae73bb39fbdee`
  - `buyer accepts`: `0x082120e27869101f9451c336b4844c6201731e9edcf3f90c8b1312ed24ba3a31`
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
  - `create new-seller trade`: `0x69bf6c78d927d61c257342d924f58914d6f673c45b5301857e2764ec7ee6cf78`
  - `seller posts larger bond`: `0xff0e19de6df35eb08c77c757c6d3b16408de0f463ccba21919d44f1a251c66ba`
  - `attach weak proof`: `0x08bee525fea5d8fe5c6e2b40c3994eb874e03e67a8bdb359dbda58156432ade7`
  - `attach seller activity predicate`: `0x79a3c0fed6f02b7d47fb322276a783938f73db2b7b24848482b1028e39952c6c`
  - `attach circuit profile hook`: `0x3a11dc688fdacdda91ef8f49eb2eae9b151675e2b34e30d443890ed764d48c53`
  - `attach sparse evidence`: `0x4cd41aead232865da335a9eb0c85c586a86cd1a8f161472bd7adcb5498589461`
  - `commit uninsured route`: `0xdfb9c69a7715c04a0bc36b256a94a39028388dd206555bc9bb450bc8a92efa79`
  - `mark delivered`: `0x0fb62308134ed13cb6b620e7f6cc513f875b9c114ef78a426514611c7f938d2b`
  - `attach received-item claim evidence`: `0xea0f763582d2da6315ba66c5cc725deba2e8f67ee8902381c05de521ded0f734`
  - `attach verifier claim note`: `0x861b766d8230489a2f071f3a5ff73ef35b0f93b631fb4603966f6c9087c85aac`
  - `open claim with buyer dispute bond`: `0xe03be7ecb674530be7fbf2c2dbb5c9b267e720647d063bb96a30604e6304a97f`
  - `arbiter resolves claim`: `0x04c45df6aba02f12bb735b03abdf034b66cbcb429f24031d952cc7eabf2cd011`
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
