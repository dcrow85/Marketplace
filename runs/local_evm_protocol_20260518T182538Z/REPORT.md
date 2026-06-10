# Local EVM Protocol Probe: local_evm_protocol_20260518T182538Z

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
  - `attach item evidence`: `0xa2b43abe4d1bea3848393d19a71b45e6a17d1e0f73cd4a2e49ab6911f85b203d`
  - `attach verifier review`: `0xcfd3636908eb882e76f02811363aa93537991d90fbed277102c05c750b9bc1e6`
  - `commit insured route`: `0xc7785197951808092df99777d2902a4a117e88bf6824e4801982e2ac987d7eea`
  - `mark route in progress`: `0x5e33b1723b4433aed5497d137c62d42afb5a1017a4952e3483017c9f4bd20e4f`
  - `mark delivered`: `0x0bd934d4376e734ccc6ed130788fe79d174c091ed1fd7ce20d1264fd90daaab7`
  - `buyer accepts`: `0xe2fc527d1ffd1b38cbf4c2fb04fed7fa07ab1869847070695d7655b13000da7f`
- Anchored packets:
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2, valid signature)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2, valid signature)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2, valid signature)
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
  - `create new-seller trade`: `0x1ba7504060acd7a65fe5deadea9f6fc41545b8c723691a34441ccc4d648e2766`
  - `seller posts larger bond`: `0x1b84ebee38ddd629dd3c51d859047d45bcd1923b754df39d2efd9ac5d2db66db`
  - `attach weak proof`: `0xa1a04d3b55df3b7af7113cc5940330a8f8e1f42f7ada0f95b10599aad218c33c`
  - `attach sparse evidence`: `0x5441a1a429aea76017f64ba3877a40190eb46adae225abdee7851cf1c91c90d4`
  - `commit uninsured route`: `0xdb89c412a2551f3b10dcc0481505b7c3e15e9ba5551027aefb9117feb6e44fa1`
  - `mark delivered`: `0x0660ec9a70a1c48156f0fc56ae852801446f89ece82f67df4953386346444f7c`
  - `attach received-item claim evidence`: `0x55548de65e707afe89630c205b143761976fdaf9ca18c6af0bc7afa27bbb7c84`
  - `attach verifier claim note`: `0xd92f462807cde07516a27e025c877d8614143fa0f9e194b9c8a01ec83cf215f4`
  - `open claim with buyer dispute bond`: `0x6de9429be5f827c1b774b1844bf859e8135cff62e4cb6aa1a95b4c73a4a8503b`
  - `arbiter resolves claim`: `0xbb052241c6fd0f346e9228fc75f40a94deb1c7844469ac3796e2d2595feb5e7d`
- Anchored packets:
  - `claim_intent` `0xa2c6c605f6cb21b462f51aad0998b7055b91fa748060cb5f40a8cf451655afff` (marketplace.intent.v0.2, valid signature)
  - `claim_escrow_terms` `0x843b56e06b3432dc115305530d5e3c45cca81b6304034e9d1f949527fcd8d2b3` (marketplace.escrow_terms.v0.2, valid signature)
  - `claim_new_seller_proof` `0xa08a4c76121162c499aa94991c71558e4523d3b509f92cb6047e05b4ce9a4432` (marketplace.trust_offer.v0.2, valid signature)
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
- A low-friction happy path can close without over-asking for seller attention.
- A risky new-seller path can be made acceptable through bond, packet quality, and explicit gaps.
- Claim resolution can emit a compact on-chain ending while preserving rich off-chain evidence.

## Still Not Proven

- DID key rotation and delegated agent signatures are not modeled yet.
- Verifier conflict checks are registered but not independently adjudicated yet.
- Stablecoin/ERC-20 escrow is not modeled yet.
- Multi-agent negotiation is not connected to this runner yet.
