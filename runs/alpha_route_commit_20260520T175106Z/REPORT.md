# Alpha Route Commit: alpha_route_commit_20260520T175106Z

- Generated: `2026-05-20T17:51:07.378833+00:00`
- RPC: `http://127.0.0.1:58631`
- Chain: `anvil:31337`
- Anvil PID: `17722`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x23d11ba12505297ced5c54e97519955801dd8324c3edbd922200d5d467f7636b`

## Route Gate

- Wall bundle hash: `sha256:bd291b5bc0baa70083b6bf1dc6ba32a5d9e74b18ecf8a8b0300814197049fa1f`
- Wall bundle EVM hash: `0x47c5bce7936e8c92095909cb125e0acb91554d4e5ede0bd409dd897fe63ea2ac`
- Route spendability hash: `sha256:04d938f9f1c3d90f8e84c7cab1c5be82452fc06357f383a9a24daed29dba7bd0`
- Route spendability EVM hash: `0x93c93b902ede0c9a3d7a81c101d4270f75a7e6b76afeb4fad0b8366061a8cf25`

## Transactions

- `create alpha Espeon trade`: `0x48e8265a98197a8bfe750673948f086d426c007fa46eb911dafbf069675c2a86`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x1b467f00a9d6981eb917e1b144a8206ee2133ff75fa0659c974240da8c4f5c91`
- `commit alpha Espeon inventory lock`: `0x8970bd12b0f9aa92d16bae5fb2c9bfbfa0cdc5043830aa3427b881b9545b1a2f`
- `commit alpha Espeon route with wall bundle spendability`: `0x23d11ba12505297ced5c54e97519955801dd8324c3edbd922200d5d467f7636b`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
