# Alpha Route Commit: alpha_route_commit_20260521T010025Z

- Generated: `2026-05-21T01:00:26.577299+00:00`
- RPC: `http://127.0.0.1:64550`
- Chain: `anvil:31337`
- Anvil PID: `39354`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x2b48d672ccd998128ac00f7206148fb1fc982f0abe55da808ab63dd5b5d330ed`

## Route Gate

- Wall bundle hash: `sha256:ef26e7bd38df10ee4dbcd5b814d75603739e1eb0b5c1022de1644e1f345babd0`
- Wall bundle EVM hash: `0xd4740975e6b9c250f881e12210fe790ba72e914bfd0dee8b2df867424dd0e665`
- Route spendability hash: `sha256:67b41f7377ebc399e41d7f27088444198fb4e86ce4387613bce866f161204639`
- Route spendability EVM hash: `0x2477e71529838c9b92db21710055fbe5c68b5ecf106f31feeb3ba61f4f5160e5`

## Transactions

- `create alpha Espeon trade`: `0xf97d9e6aaca5e49256f3e4a61dd778365daa07f9d9c5b2c537d6b2aece649ae6`
- `seller posts alpha Espeon bond`: `0x63c6123ee1e6445c4b065b31aed7f5a7264e348f7b192c41f6d28b3a10a3c9c4`
- `commit alpha Espeon item fingerprint`: `0x225c07b5344a8b64b5b16174b78e77ab4e02ae3430ee63af7a1bb723c01c8396`
- `commit alpha Espeon inventory lock`: `0x61511cc42254ebcb0e311e413a736e7a4df829326486be0ecb6be29dfbf4f91f`
- `commit alpha Espeon route with wall bundle spendability`: `0x2b48d672ccd998128ac00f7206148fb1fc982f0abe55da808ab63dd5b5d330ed`

## Interpretation

The UI-approved wall bundle and route spendability were carried into `commitRoute`. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
