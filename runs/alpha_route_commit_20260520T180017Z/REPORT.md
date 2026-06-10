# Alpha Route Commit: alpha_route_commit_20260520T180017Z

- Generated: `2026-05-20T18:00:18.565502+00:00`
- RPC: `http://127.0.0.1:59264`
- Chain: `anvil:31337`
- Anvil PID: `19354`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x67a8a921c61e3b8d3b58dfdf3625bf6388261a339d3e5bf458bfc576ae450cf7`

## Route Gate

- Wall bundle hash: `sha256:25eed02492202673bbfda98d30fd7a48f6dff5c9b6dcb965c4707b8d67890763`
- Wall bundle EVM hash: `0xd224104fd4f752d04160a149fef5fd1365a022f92c9a6f000a8527d9cc951b47`
- Route spendability hash: `sha256:1453b207c428231e8125536c14fc0f69f788d6a6ac71025d8106eed4fd8bf6af`
- Route spendability EVM hash: `0xdfcc1962f4e6c86b60976a555d5e1fd6a62914ad865aa7d0c8434b152fc397eb`

## Transactions

- `create alpha Espeon trade`: `0x6db36d3ad0e68deb6fceb56ae0aef2365d3bbea1ee4c6c3cbb50e46a1e431803`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x1b467f00a9d6981eb917e1b144a8206ee2133ff75fa0659c974240da8c4f5c91`
- `commit alpha Espeon inventory lock`: `0x8970bd12b0f9aa92d16bae5fb2c9bfbfa0cdc5043830aa3427b881b9545b1a2f`
- `commit alpha Espeon route with wall bundle spendability`: `0x67a8a921c61e3b8d3b58dfdf3625bf6388261a339d3e5bf458bfc576ae450cf7`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
