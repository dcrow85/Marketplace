# Alpha Route Commit: alpha_route_commit_20260520T175104Z

- Generated: `2026-05-20T17:51:05.991639+00:00`
- RPC: `http://127.0.0.1:58555`
- Chain: `anvil:31337`
- Anvil PID: `17519`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x21e9094c45146547bbdf070fff85a78209b00738a6c3127de725709f54424a6c`

## Route Gate

- Wall bundle hash: `sha256:068492fc58be4dd11ca8a8a0578c23fb1b2a261e3371a723e4a0aff521d4ee76`
- Wall bundle EVM hash: `0x1fc4358e2f5911d5542b06d8fb028b4818b9d5a891baebcae31217d93d088ae4`
- Route spendability hash: `sha256:abd2e12478a7b9b4082cea0914f323bec39caf9391cc93df9c2f2a5b00e8b81f`
- Route spendability EVM hash: `0x6b8b140d8f3124ae6ca5461112a487ab8af32a89e5f85cbb03b60c6ac73b427d`

## Transactions

- `create alpha Espeon trade`: `0x20d70771c520ee7cd2f4d6bea38bb59003b9e9f3020007275e4c41ea623074d6`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x1b467f00a9d6981eb917e1b144a8206ee2133ff75fa0659c974240da8c4f5c91`
- `commit alpha Espeon inventory lock`: `0x8970bd12b0f9aa92d16bae5fb2c9bfbfa0cdc5043830aa3427b881b9545b1a2f`
- `commit alpha Espeon route with wall bundle spendability`: `0x21e9094c45146547bbdf070fff85a78209b00738a6c3127de725709f54424a6c`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
