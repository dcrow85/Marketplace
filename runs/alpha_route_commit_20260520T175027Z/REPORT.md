# Alpha Route Commit: alpha_route_commit_20260520T175027Z

- Generated: `2026-05-20T17:50:28.610731+00:00`
- RPC: `http://127.0.0.1:18653`
- Chain: `anvil:31337`
- Anvil PID: `17184`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x5862ff0a0fb7f0ea00ed357d75aa4e583ab8b089e1522bbd2cc12f87b6520151`

## Route Gate

- Wall bundle hash: `sha256:test-wall-claim`
- Wall bundle EVM hash: `0x3333333333333333333333333333333333333333333333333333333333333333`
- Route spendability hash: `sha256:test-spend-claim`
- Route spendability EVM hash: `0x4444444444444444444444444444444444444444444444444444444444444444`

## Transactions

- `create alpha Espeon trade`: `0x266a1ff0e848befdf9724fef08fdb1dada1afdc1f41a6f241b4cda52d3139c5d`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x1b467f00a9d6981eb917e1b144a8206ee2133ff75fa0659c974240da8c4f5c91`
- `commit alpha Espeon inventory lock`: `0x8970bd12b0f9aa92d16bae5fb2c9bfbfa0cdc5043830aa3427b881b9545b1a2f`
- `commit alpha Espeon route with wall bundle spendability`: `0x5862ff0a0fb7f0ea00ed357d75aa4e583ab8b089e1522bbd2cc12f87b6520151`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
