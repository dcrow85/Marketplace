# Alpha Route Commit: alpha_route_commit_20260520T174427Z

- Generated: `2026-05-20T17:44:28.534309+00:00`
- RPC: `http://127.0.0.1:58046`
- Chain: `anvil:31337`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x1bfc56477d4cde1f08399f8d0c550eabd23cab64114efb695f41870e2f1c7478`

## Route Gate

- Wall bundle hash: `sha256:7770deab868dda32aadc08cdd9878c582f30159de63496578146d81204ccfc93`
- Wall bundle EVM hash: `0x73034f3d1cc0ed5f9b150e1c9b836eeb066363fec6532f8c13bf40f52781311a`
- Route spendability hash: `sha256:022da28ce375f08e0920a7c0d52b6f709f6d21321d4a44672d1ab62dab76695c`
- Route spendability EVM hash: `0x4a90e78f4c6be9ed7d9639441981f26a8277d8f386c8dab09c6b99d8e31a7978`

## Transactions

- `create alpha Espeon trade`: `0x9bdae018fdfe2d63fcccb0dd97476e31d7d60d7495fb4832ab527c2663fd81b2`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x4ce9133538315b4c1e0df3765a710b9056edcf1f8bb0fbae2f0bd89d46a17406`
- `commit alpha Espeon inventory lock`: `0x606f0ab9893ea9215cc9143b2e409c843feb411c3c56e905d29add2b16a6e552`
- `commit alpha Espeon route with wall bundle spendability`: `0x1bfc56477d4cde1f08399f8d0c550eabd23cab64114efb695f41870e2f1c7478`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
