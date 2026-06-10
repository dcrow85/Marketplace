# Alpha Route Commit: alpha_route_commit_20260521T010007Z

- Generated: `2026-05-21T01:00:08.325100+00:00`
- RPC: `http://127.0.0.1:18661`
- Chain: `anvil:31337`
- Anvil PID: `stopped after route commit`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0xda09c75da0c20ef898d19f455973e1faaa06ff808ec655e648eb1ee6eb3ec704`

## Route Gate

- Wall bundle hash: `sha256:typed-wall-test`
- Wall bundle EVM hash: `0xf7eeb894acec145aaac30ecdc14dba5c0a9c081e6f681f04c6f11f6e214cdce5`
- Route spendability hash: `sha256:typed-spend-test`
- Route spendability EVM hash: `0x5555555555555555555555555555555555555555555555555555555555555555`

## Transactions

- `create alpha Espeon trade`: `0xea2ee485635edf3f9dde67e2c3aaf55231ae6b9843e7e6afebe8867c3c8aeab0`
- `seller posts alpha Espeon bond`: `0x63c6123ee1e6445c4b065b31aed7f5a7264e348f7b192c41f6d28b3a10a3c9c4`
- `commit alpha Espeon item fingerprint`: `0x225c07b5344a8b64b5b16174b78e77ab4e02ae3430ee63af7a1bb723c01c8396`
- `commit alpha Espeon inventory lock`: `0x61511cc42254ebcb0e311e413a736e7a4df829326486be0ecb6be29dfbf4f91f`
- `commit alpha Espeon route with wall bundle spendability`: `0xda09c75da0c20ef898d19f455973e1faaa06ff808ec655e648eb1ee6eb3ec704`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
