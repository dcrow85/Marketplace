# Alpha Route Commit: alpha_route_commit_20260520T173825Z

- Generated: `2026-05-20T17:38:26.168272+00:00`
- RPC: `http://127.0.0.1:18559`
- Chain: `anvil:31337`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0xf64aa3d2f08b6c704f6539c6507578bb07efaa0738add84a2ca17e61ce9849dc`

## Route Gate

- Wall bundle hash: `sha256:testwall`
- Wall bundle EVM hash: `0x1111111111111111111111111111111111111111111111111111111111111111`
- Route spendability hash: `sha256:testspend`
- Route spendability EVM hash: `0x2222222222222222222222222222222222222222222222222222222222222222`

## Transactions

- `create alpha Espeon trade`: `0x3c784852645a6d242f6475febe99dd65bdf8ead5804c13b771bf07fd5ef92492`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x1b467f00a9d6981eb917e1b144a8206ee2133ff75fa0659c974240da8c4f5c91`
- `commit alpha Espeon inventory lock`: `0x8970bd12b0f9aa92d16bae5fb2c9bfbfa0cdc5043830aa3427b881b9545b1a2f`
- `commit alpha Espeon route with wall bundle spendability`: `0xf64aa3d2f08b6c704f6539c6507578bb07efaa0738add84a2ca17e61ce9849dc`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
