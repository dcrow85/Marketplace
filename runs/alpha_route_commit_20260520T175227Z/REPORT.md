# Alpha Route Commit: alpha_route_commit_20260520T175227Z

- Generated: `2026-05-20T17:52:28.477653+00:00`
- RPC: `http://127.0.0.1:58843`
- Chain: `anvil:31337`
- Anvil PID: `18283`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x2dde2a09227999bd5caee6aebe379ac47381316c92c3c99eed8b40247c15d85a`

## Route Gate

- Wall bundle hash: `sha256:2de32b3e9735a8ac03a0ae1d32ddf9d55263a212ed25775995f8adbd8e31879a`
- Wall bundle EVM hash: `0xad8ac1aa5be5e42a17d974cbe2565f2ec21f966375e4173531ed993a67170699`
- Route spendability hash: `sha256:aaaf4140f01d3edbd4890081822cf92578fbd3cac5a37ded0c4344a9d0935a41`
- Route spendability EVM hash: `0x0b701ab8caa69764f388b45820bbf33109c9a08784bcfc2139388013b4fe50b9`

## Transactions

- `create alpha Espeon trade`: `0x47b47c2fbc16009337948c04cd71914bf25cf0f341b2bceb6b3843264e11fa54`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x1b467f00a9d6981eb917e1b144a8206ee2133ff75fa0659c974240da8c4f5c91`
- `commit alpha Espeon inventory lock`: `0x8970bd12b0f9aa92d16bae5fb2c9bfbfa0cdc5043830aa3427b881b9545b1a2f`
- `commit alpha Espeon route with wall bundle spendability`: `0x2dde2a09227999bd5caee6aebe379ac47381316c92c3c99eed8b40247c15d85a`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
