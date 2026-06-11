# Alpha Route Commit: alpha_route_commit_20260611T170805Z

- Generated: `2026-06-11T17:08:06.692817+00:00`
- RPC: `http://127.0.0.1:18550`
- Chain: `anvil:31337`
- Anvil PID: `68284`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Trade ID: `1`
- Final state: `RouteLocked`
- Route tx: `0x65dc9773eb1a9f132f99d10f882dc37ee48da1344f3cdeafe737634e9dd9ea57`

## Route Gate

- Wall bundle hash: `sha256:211032c445d6ea9a2a6a1a4f561086eb750d51965b89aa3d18a9ee6d6b0ea7a6`
- Assembly history hash: `sha256:82f2e6ccac66a9ab2882bd7c709779f67235f7ed761097977c9b895676f9c20b`
- Wall bundle EVM ref: `0x05ce4021bb59b413113713690ae44b78e0960fcbd2528ba84e618ef4b7d1a517`
- Assembly history EVM ref: `0xc873aed6dd1fae820ec68fa0b41e5b4a3d625dbc2fbc56d2238419f96aab6727`
- Route assembly witness hash: `0xc2a8ec7932c73f167bf20a019ed4848c11dfac0ad03634695ac10748f53ace14`
- Route spendability hash: `0x42db4cc336eb2e495dc3d59b4b1fd7ed6148ec716f08a860ee878e4e787f136e`
- Route spendability EVM hash: `0xe291e072edcf74dfc3efb4d17eb5d62b3a3b9803e3b94b64456f51c03ebba4d8`

## Transactions

- `create alpha Espeon trade`: `0xe39b2ab90934b5a462ca42d15967eea452e77f4f289bfaa4316ae761f4c85c35`
- `seller posts alpha Espeon bond`: `0x05afecc82720f65ae82483073558b7fdb68cd32e192834d974b7b21ec1e14484`
- `commit alpha Espeon item fingerprint`: `0xdb4e0c5b2884f726dafe0ce34d73de3b6402f2aac09d143874c5105147669231`
- `commit alpha Espeon inventory lock`: `0x4fc1fa6a819850baa3753bce3acf30ab8ab06454d7a2f2104374c6d4be48085d`
- `commit alpha Espeon route with wall bundle spendability`: `0x65dc9773eb1a9f132f99d10f882dc37ee48da1344f3cdeafe737634e9dd9ea57`

## Interpretation

The UI-approved wall bundle and assembly history were carried into `commitRoute`, while the spendability value was the contract-derived typed digest for this route gate. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.
