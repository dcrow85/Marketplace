# Alpha Route Commit: alpha_route_commit_20260520T174915Z

- Generated: `2026-05-20T17:49:16.066282+00:00`
- RPC: `http://127.0.0.1:18651`
- Chain: `anvil:31337`
- Anvil PID: `16584`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0xf16f8767aab9e33789f044c22dc8519f4f02d43c6edd08522f026f79b81e7131`

## Route Gate

- Wall bundle hash: `sha256:test-wall-delivery`
- Wall bundle EVM hash: `0x1111111111111111111111111111111111111111111111111111111111111111`
- Route spendability hash: `sha256:test-spend-delivery`
- Route spendability EVM hash: `0x2222222222222222222222222222222222222222222222222222222222222222`

## Transactions

- `create alpha Espeon trade`: `0xcd7abb81d8d7ab96f76ecf015ba4e873cdd1cce244702b24c98d12c7837bd3e0`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x1b467f00a9d6981eb917e1b144a8206ee2133ff75fa0659c974240da8c4f5c91`
- `commit alpha Espeon inventory lock`: `0x8970bd12b0f9aa92d16bae5fb2c9bfbfa0cdc5043830aa3427b881b9545b1a2f`
- `commit alpha Espeon route with wall bundle spendability`: `0xf16f8767aab9e33789f044c22dc8519f4f02d43c6edd08522f026f79b81e7131`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
