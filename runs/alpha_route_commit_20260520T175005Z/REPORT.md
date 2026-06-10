# Alpha Route Commit: alpha_route_commit_20260520T175005Z

- Generated: `2026-05-20T17:50:06.659781+00:00`
- RPC: `http://127.0.0.1:18652`
- Chain: `anvil:31337`
- Anvil PID: `16909`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x7b0ad1640ffd8815d3a2c359a5f8b37e197f0314f7f87be479be66594400a25b`

## Route Gate

- Wall bundle hash: `sha256:test-wall-delivery2`
- Wall bundle EVM hash: `0x1111111111111111111111111111111111111111111111111111111111111111`
- Route spendability hash: `sha256:test-spend-delivery2`
- Route spendability EVM hash: `0x2222222222222222222222222222222222222222222222222222222222222222`

## Transactions

- `create alpha Espeon trade`: `0xcd348abe2f6e197266d5aafe115456315d135883b7fe2ef647802033ac174dc9`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x4ce9133538315b4c1e0df3765a710b9056edcf1f8bb0fbae2f0bd89d46a17406`
- `commit alpha Espeon inventory lock`: `0x606f0ab9893ea9215cc9143b2e409c843feb411c3c56e905d29add2b16a6e552`
- `commit alpha Espeon route with wall bundle spendability`: `0x7b0ad1640ffd8815d3a2c359a5f8b37e197f0314f7f87be479be66594400a25b`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
