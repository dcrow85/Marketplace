# Local EVM Protocol Probe: local_evm_protocol_20260518T181708Z

- RPC: `http://127.0.0.1:18545`
- Contract: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Chain: `anvil:31337`

## Scenario Results

### happy_path_insured_card

- Trade ID: `1`
- Final state: `Settled`
- Transactions:
  - `create insured trade`: `0x3e518ac3c2f978d379488a39346742d2e9700527970de9776faac464ba48ef7b`
  - `seller posts bond`: `0xcb11afb9b0c4621183ffa60462d13989109ec243ab3eb190005a6a5d37ee546b`
  - `attach trust proof`: `0x1b4f01f0711671a90044ad822c9acaeff166fa7b3fcc61e4178c595a59a28497`
  - `attach item evidence`: `0xd7eaf0aa5f77343be139bea3da9e8201bb548a3e11a1d4173e31d9d8fcb0ba67`
  - `commit insured route`: `0x3428135eb7c2eee07a6cf27b085ea736af25f4e19a3226c4dbea9acb72147125`
  - `mark route in progress`: `0x3c1f56718fae56f707f9fee7025027e031c068f428186733a5c49049676bcefb`
  - `mark delivered`: `0xf8310bfd16cc4a21ee83a53c162a6fa42a087a053ea4f33fcead56b07e0c3b48`
  - `buyer accepts`: `0x2fdd1932f734d0583df9e1087a8cbce34988b1359f4bdd20c09803b046fb4143`
- Anchored packets:
  - `actor_buyer` `0xca07896a6190e860dd51af4241ed9a02835b1930c4dd01a13c7b6d9a44a3675a` (marketplace.actor_record.v0.2)
  - `actor_seller` `0x58731f2034f9f2f374d451384fde315bbb8a7a907e23c84a1d4e8b47d7c81ed5` (marketplace.actor_record.v0.2)
  - `actor_arbiter` `0x0025cd199f11db191de2e1f83919b36022cca03b844c6169e8941f9f976f4442` (marketplace.actor_record.v0.2)
  - `happy_intent` `0xd08e450e965d052d9201f63e8df5e8e149e61b65950b3739f0cee1d23d293caf` (marketplace.intent.v0.2)
  - `happy_escrow_terms` `0x8af2c1dc98101abcc55159fb64ab52e1765e12d006ff445ec93fd8c9a0e64f7e` (marketplace.escrow_terms.v0.2)
  - `happy_trust_offer` `0xb07613fb8aab82663a1dc4aeb2f4ea48cca97e4fadbbcc309dc07a0c3f2f6a54` (marketplace.trust_offer.v0.2)
  - `happy_item_evidence` `0x0e350f22a79e4b49d140ee4c009f3da94c010099c4bb4492f197924066c4061a` (marketplace.evidence_packet.v0.2)
  - `happy_route` `0x0d06a99d4d88711f7046bc0ae133e6989de37e92f924b17daeec77970d3a15e7` (marketplace.trade_route.v0.2)
  - `happy_final_receipt` `0x5154efb32d52def53079b00ba5d5f156656ccd33e52838fbfdc4238cb443ddd8` (marketplace.trade_receipt.v0.2)
- Observations:
  - Buyer-funded intent became locked escrow.
  - Seller attention stayed bounded: one trust proof, one item packet, one route packet.
  - Final receipt closed the trade and released escrow plus bond.

### new_seller_material_claim

- Trade ID: `2`
- Final state: `Settled`
- Transactions:
  - `create new-seller trade`: `0xdd3fc7df43cfcc4e5c41d148c8be8c8cc0e953de2f4a11be944dfe3fecd3681d`
  - `seller posts larger bond`: `0xb71ac24addc88e5ad62cd6dbb4d5908717e76906e891ba786e7cefc0ed4d423e`
  - `attach weak proof`: `0xf42cea4d14f379f3b3d8a2fe1132055965fc08c7372dfdd3a1f4050850d0e22e`
  - `attach sparse evidence`: `0xf082f468227b98d957297280628d11bc5797613fcc39180aa2fa3739d4b05f35`
  - `commit uninsured route`: `0xbdab0b8b99e3ea2f9e016c9a0826c5444263de1b82d2d0b3facd73bccc689bb7`
  - `mark delivered`: `0xd663878a7fff2b5478c6446dd70ff5184a94fa369fa8dd26d0aa8debf1cf9ec5`
  - `attach received-item claim evidence`: `0x68fa4d8801b69cbce57083fa05145758465635094ba9523004d0d7c72ea1695a`
  - `open claim with buyer dispute bond`: `0x5cb50fbfc6adfb90c963143cb087dea57ee7176ff78bfc38df79dce43c75c35c`
  - `arbiter resolves claim`: `0xe6319e7e3182cbd4de133fb81468f76206a577970dbc4abc99d098b0d95b8a34`
- Anchored packets:
  - `claim_intent` `0xa2c6c605f6cb21b462f51aad0998b7055b91fa748060cb5f40a8cf451655afff` (marketplace.intent.v0.2)
  - `claim_escrow_terms` `0x843b56e06b3432dc115305530d5e3c45cca81b6304034e9d1f949527fcd8d2b3` (marketplace.escrow_terms.v0.2)
  - `claim_new_seller_proof` `0xa08a4c76121162c499aa94991c71558e4523d3b509f92cb6047e05b4ce9a4432` (marketplace.trust_offer.v0.2)
  - `claim_sparse_item_evidence` `0x953b9199569e72b8fca958c21851cbcbe6549e2d007aa5bac4d13ae5606865d3` (marketplace.evidence_packet.v0.2)
  - `claim_route_uninsured` `0x930cbca8b807a09d66c65437b4e84dad39566173b2ab445f69d2ef757509fdfc` (marketplace.trade_route.v0.2)
  - `claim_packet` `0xe59286d32704ff5271adb626bafbc15d160586a0b8bc0438e41501d109692824` (marketplace.dispute_case.v0.2)
  - `claim_ruling` `0x30bbb5ace10e30f52951b865de73469de9f747a111e122e46ac1086f3e95bf3c` (marketplace.resolve_or_claim.v0.2)
- Observations:
  - A brand-new seller can still clear the trade by posting a larger bond.
  - Weak trust proof did not need to become a scalar score; it became an explicit gap.
  - The claim packet and ruling hash give the agent a clean evidence trail after settlement.

## What This Proves

- Off-chain protocol objects can become deterministic hashes that the money rail can enforce.
- A low-friction happy path can close without over-asking for seller attention.
- A risky new-seller path can be made acceptable through bond, packet quality, and explicit gaps.
- Claim resolution can emit a compact on-chain ending while preserving rich off-chain evidence.

## Still Not Proven

- Actor signatures are represented by packet structure and chain senders, not full DID verification.
- Verifier and arbiter registries are not on-chain yet.
- Stablecoin/ERC-20 escrow is not modeled yet.
- Multi-agent negotiation is not connected to this runner yet.
