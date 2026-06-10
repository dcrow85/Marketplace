# Alpha Route Commit: alpha_route_commit_20260520T175919Z

- Generated: `2026-05-20T17:59:20.921146+00:00`
- RPC: `http://127.0.0.1:59167`
- Chain: `anvil:31337`
- Anvil PID: `19061`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0xa91c88ffb8c6ee7cc65913f9e9b87cfef25f84b06965aee41f1296cf346b6075`

## Route Gate

- Wall bundle hash: `sha256:faae96aad3ea01607de6273931b6c9467875b990ad754f7cd043c8dc1bfe94bd`
- Wall bundle EVM hash: `0x11c41223b4bb23a8ab5e291922f264e0c12e5ea8f300b9883f290d08dc862b37`
- Route spendability hash: `sha256:837bc8c313ddeb5088381a67706b22431d222ea3b1a8330d40c942d2e78e24af`
- Route spendability EVM hash: `0xc0114c7becafe23bf9eac6e344b84b4c8a2c6283feb63aa2ea0ec8b6912550f0`

## Transactions

- `create alpha Espeon trade`: `0xf99bde93a57b531a4da14a641543f5aea7c0550d7547c262bd18d9032340f540`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x1b467f00a9d6981eb917e1b144a8206ee2133ff75fa0659c974240da8c4f5c91`
- `commit alpha Espeon inventory lock`: `0x8970bd12b0f9aa92d16bae5fb2c9bfbfa0cdc5043830aa3427b881b9545b1a2f`
- `commit alpha Espeon route with wall bundle spendability`: `0xa91c88ffb8c6ee7cc65913f9e9b87cfef25f84b06965aee41f1296cf346b6075`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
