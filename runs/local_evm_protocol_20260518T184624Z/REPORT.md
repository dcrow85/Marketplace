# Local EVM Protocol Probe: local_evm_protocol_20260518T184624Z

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
  - `seller posts bond`: `0xf3d0e88ff3e7b2931d07058e948411c16c43cbb81c1b40d7bfe498c17aa02431`
  - `attach trust proof`: `0x159b38c174ea5b3be38a2ace9b7eb6a65b554b462cd702b331e5fbaac5d80f07`
  - `attach seller private predicate`: `0x97f3af8c27ec81697aa24b6f2788c6f93729618d52e17b6edcf15c89102c07fa`
  - `attach buyer funding predicate`: `0x4730f0dd8140ec21e41e46c51dff783efe42002bf0a58ea348e6130e9e3a519a`
  - `attach item evidence`: `0x57034c7b95c1356af433dcff98109c6c03497071d65fd5e024f7c06a2a4a8778`
  - `attach verifier review`: `0xce705478ba2c8e7f30deabdf2588fc774ab031c147939965d92eaca3f8ffbf39`
  - `commit insured route`: `0xa02fe117deb8de5c194cbc96246a3ef0d9c6ebf3c15d24e202c9940b48022fab`
  - `mark route in progress`: `0x9f428c14a5ea8fa546bf89e4b8da38d49f93315a70781616d1d2d14d711b7832`
  - `mark delivered`: `0xc7bb3679dbb3cf786d4505a611dc72e97ef9e0bdea2f4896dd6c0d86a38d0c90`
  - `buyer accepts`: `0x1b03032b52a0cba3bc4f415ceedf24888de38210b956b6fc66f188f81b4546d2`
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
  - `create new-seller trade`: `0xe42279ddc7d388e980d20be47596d6c307aa5027b4add5d74c2faceafe3f3f6b`
  - `seller posts larger bond`: `0x02ff9f6c47b2609adf0c5378db8d3b7aeaa8fbe44987982727ab5e8206964984`
  - `attach weak proof`: `0x64753835ddf95d121ea601eafa3ff48e083ccda06a900569359c444d84bd4107`
  - `attach seller activity predicate`: `0x4371a367ea50af37cefe5a7394ffe14a55389ddc166ffd90214a93f373959b80`
  - `attach circuit profile hook`: `0x8ab0ff81fbd956734aba4a1f5557879fa5075abd285bbe5900f9bdf623223280`
  - `attach sparse evidence`: `0x9962ff99184d39f80aceea9da3287103455e6ed05802c70fc28402f4053ec277`
  - `commit uninsured route`: `0x8d40c199016ef7bfe78d3301092f8f84473a0840d4e5bf9b606c7660e9530c53`
  - `mark delivered`: `0x09b633022f1b137317d8b2f89c4e251025c35c4d54087dff9995777ace863759`
  - `attach received-item claim evidence`: `0x0db0cec4ca40be1807774084a5b79f3af84b72ee3862eb06162df5942c71ddc3`
  - `attach verifier claim note`: `0x5db6691fdf25f0e3f149b0ff40b7c08aa7082f5895687fffc03e686f17ac1df1`
  - `open claim with buyer dispute bond`: `0x9764489069db92686390d91cad391678677daa6e271c02d4e3fc2fc0aef2e0e7`
  - `arbiter resolves claim`: `0x39426c43972a13e9449481137a8101b0a0be42986adf60b085f91fe91ad8b814`
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
