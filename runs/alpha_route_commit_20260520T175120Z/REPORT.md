# Alpha Route Commit: alpha_route_commit_20260520T175120Z

- Generated: `2026-05-20T17:51:21.174561+00:00`
- RPC: `http://127.0.0.1:58717`
- Chain: `anvil:31337`
- Anvil PID: `17944`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0xed39f660bee43cded6d3362244c4091d753796fbf3806a0f274319e749e56bab`

## Route Gate

- Wall bundle hash: `sha256:accdacb18a219ffc2d6d5ddea3735cb9087dd71fbef0cdb690e2dbbd8dddf455`
- Wall bundle EVM hash: `0xf371ba3e6082c159b1c8825b7f013e514d82277be2d18d7775dd98e518688baf`
- Route spendability hash: `sha256:7f896677dce42c35955062c5b1d8545782341bcc9d58cfe3eae9f017675b722a`
- Route spendability EVM hash: `0x43e3c6e29fa2e0de1cdc443d64caac0f2b5c189f7676f88a37233f1dd391d083`

## Transactions

- `create alpha Espeon trade`: `0xc4c1c9fefaab7babcd8d4d0fc6c294ecbb413a687898595275023b18c86a86c6`
- `seller posts alpha Espeon bond`: `0xd0cb221d7947aa29720be2ac4c5ada23dea5991598010acef92d0a550b275d16`
- `commit alpha Espeon item fingerprint`: `0x4ce9133538315b4c1e0df3765a710b9056edcf1f8bb0fbae2f0bd89d46a17406`
- `commit alpha Espeon inventory lock`: `0x606f0ab9893ea9215cc9143b2e409c843feb411c3c56e905d29add2b16a6e552`
- `commit alpha Espeon route with wall bundle spendability`: `0xed39f660bee43cded6d3362244c4091d753796fbf3806a0f274319e749e56bab`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
