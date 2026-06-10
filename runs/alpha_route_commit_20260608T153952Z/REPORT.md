# Alpha Route Commit: alpha_route_commit_20260608T153952Z

- Generated: `2026-06-08T15:39:54.018384+00:00`
- RPC: `http://127.0.0.1:58020`
- Chain: `anvil:31337`
- Anvil PID: `16838`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x40598114831e18ed8b4e5a88cff2e88f675e717d527b739a2bb3b5a152b0aeb7`

## Route Gate

- Wall bundle hash: `sha256:31498a09c90bbf488d05e1f4b73216ea8c734d9715c888cbe077d4895329a52d`
- Wall bundle EVM hash: `0xfbcde8b7ae0b6719e60d4afd1a9cbbdb1b2013cc21579dbf520c17ed6173dc72`
- Route spendability hash: `sha256:bca1c4f87477653f35f93a64b51fd85fcc35524c83e755c3d046c46577c1be79`
- Route spendability EVM hash: `0xd3644373e4bb0d2e40ec4e1fbc94604882bf914ffbdd7a6995869c5a881c58b9`

## Transactions

- `create alpha Espeon trade`: `0xe0295d6cb782a82a354186327a7916c6e3e9cb24d5eecc10ef8da3d3f99d423e`
- `seller posts alpha Espeon bond`: `0xab1f21085552f17e95cd5476641ebe51425b7c561c6df60137d183971420401c`
- `commit alpha Espeon item fingerprint`: `0x922cfdc0870bf6bad1dbcf3233f2f835bdd8377dfeb1e96da8d594456779096a`
- `commit alpha Espeon inventory lock`: `0xb7f8a9745bcfb3746af4c8500bf04fab2a89725a9c0f8efb8f4d1fc336330a87`
- `commit alpha Espeon route with wall bundle spendability`: `0x40598114831e18ed8b4e5a88cff2e88f675e717d527b739a2bb3b5a152b0aeb7`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
