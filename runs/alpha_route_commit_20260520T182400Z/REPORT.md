# Alpha Route Commit: alpha_route_commit_20260520T182400Z

- Generated: `2026-05-20T18:24:01.314685+00:00`
- RPC: `http://127.0.0.1:59833`
- Chain: `anvil:31337`
- Anvil PID: `21583`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x4bd0103f024254abbffd80fc9e1a43362491ef2e56a656763877e866d8b79ff7`

## Route Gate

- Wall bundle hash: `sha256:cd09de5bdedd22e6ab786781327e3dca325f6ace3f7d41952c0635bfc58aac7e`
- Wall bundle EVM hash: `0xe29c6fea45dd084b2260dd2581498a34a232d851e9bf49aac406de42c0d214f8`
- Route spendability hash: `sha256:759847a84b0e9a1d7f0b46823d7aa9b3badbfb0bbda0d6430b09b7b873b64f9b`
- Route spendability EVM hash: `0x9690d3f0b4b60fb8085ef9fa09875093a1d99837a54844ef95066d83e23005c7`

## Transactions

- `create alpha Espeon trade`: `0x0303c4a4c0a418d0b2a2e6314ff294d74a7dcf057f01b4937ac5b4ed964e87f1`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0xe26d67338dd1333f61117c2590cbe09ef80e8fbdd5507ad2bb33e41809441e9b`
- `commit alpha Espeon inventory lock`: `0x04706c7514199e6719e4be2cb4e1fd1ef859a539dbd4384e76596a922895f326`
- `commit alpha Espeon route with wall bundle spendability`: `0x4bd0103f024254abbffd80fc9e1a43362491ef2e56a656763877e866d8b79ff7`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
