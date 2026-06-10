# Alpha Route Commit: alpha_route_commit_20260520T173923Z

- Generated: `2026-05-20T17:39:24.387098+00:00`
- RPC: `http://127.0.0.1:57796`
- Chain: `anvil:31337`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x7951166ed108358080e80840f5b828b5aacc229da62d090b5e7abe046478e736`

## Route Gate

- Wall bundle hash: `sha256:177972238ff3b58ecbf003be0d8f80a148b417f282f39ddb1457e739af3f05a6`
- Wall bundle EVM hash: `0xf5fc011d7fb5fc38cfc998a254988404bdaf6e3086fa6427c72328f0beac97c8`
- Route spendability hash: `sha256:2e01774d28a09635be26cb81c6d7a45e0776fb94dc9ea4f18723a9a4c496fe4a`
- Route spendability EVM hash: `0x3c5b19e30cc6a4744063ad992cbfe24cb8aade21bbdb6acb1a7adc47540be0a1`

## Transactions

- `create alpha Espeon trade`: `0x6dcd01acdbf8adeaa2a1b81814955985a046628335df0c1b96ab5292cde45f2f`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x4ce9133538315b4c1e0df3765a710b9056edcf1f8bb0fbae2f0bd89d46a17406`
- `commit alpha Espeon inventory lock`: `0x606f0ab9893ea9215cc9143b2e409c843feb411c3c56e905d29add2b16a6e552`
- `commit alpha Espeon route with wall bundle spendability`: `0x7951166ed108358080e80840f5b828b5aacc229da62d090b5e7abe046478e736`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
