# Wall Bundle Route Spendability Drill: wall_bundle_route_spendability_drill_20260521T010044Z

- Generated: `2026-05-21T01:00:45.173971+00:00`
- RPC: `http://127.0.0.1:18547`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract: `0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0`
- Wall bundle hash: `sha256:58dde96503be0e3a9f45577c9a12e99171e07d0ad608502de53944608386b6bf`
- Wall bundle EVM hash: `0xbc5b44f48ce437c06b2f12f84d0c235a36f55f8ebbb49f1e34a92ea9af772e4e`
- Route spendability hash: `0xc73a9b041286d3b75d9a6f54e4c5af5696b68ad1696dedb9c336ca1531ecec45`
- Passed: `True`

## Cases

### valid_wall_bundle_route_lock

- Expected: `route_locked_with_wall_bundle_spendability`
- Outcome: `route_locked_with_wall_bundle_spendability`
- Passed: `True`
- Final state: `RouteLocked`
- Transactions:
  - `create wall bundle drill trade`: `0xecab184102b6aac91e5e0eeeb8e6ee072238663775d8e3b55d835b247061221e`
  - `seller posts wall bundle drill bond`: `0x1d1b7389d532884ce4fc781cd992775c90a787c9851114586c03c30676d0c4ea`
  - `commit wall bundle item fingerprint`: `0xbd7d62fd185eb4d0a7ad1de9d2460e12b6e536922a74420e3b9b858c5985bc4e`
  - `commit wall bundle inventory lock`: `0xa720db05f667be00d94eb5c1df99d2e4fc892798895b2ddc60cb87e15b9578d0`
  - `commit route with wall bundle spendability`: `0x535accf7f0970915d147fc201211c51b6fb6de55f5066db3a8b927918ebd44fe`
- Packets:
  - `wall_bundle_intent` `0xeee316dd3e80aee286aab0a349098674484db316ed26b9be55e619117f8dfcc8`
  - `wall_bundle_terms` `0x082c10d466e02304ea4aced576527b034517c7758f9f531e0db9e944d13c13c0`
  - `wall_bundle_item_fingerprint` `0x70f75f5dcee22546d3c89e6426bf92381d857db65a6504f68ddde31dcf8c7a48`
  - `wall_bundle_inventory_lock` `0xce25bfd7d4dc6fff2d6155730040c063920cdf3a193e20a01aa52ce1955b1d95`
  - `wall_bundle_route` `0x1b593a6c3a48f2143b3a6c8f21a53b175b9c24b97753db8b87fe682f28f631a2`
  - `wall_bundle_route_spendability_valid` `0xc73a9b041286d3b75d9a6f54e4c5af5696b68ad1696dedb9c336ca1531ecec45`
- Observations:
  - route spendability accepted for current wall bundle

### missing_wall_bundle_hash

- Expected: `validator_blocked_missing_wall_bundle`
- Outcome: `validator_blocked_missing_wall_bundle`
- Passed: `True`
- Final state: ``
- Validator error: `WALL_BUNDLE_MISSING: route spendability must cite wall bundle`
- Observations:
  - Off-chain validator blocked missing wall_bundle_hash before EVM route call.

### stale_wall_bundle_hash

- Expected: `validator_blocked_stale_wall_bundle`
- Outcome: `validator_blocked_stale_wall_bundle`
- Passed: `True`
- Final state: ``
- Validator error: `WALL_BUNDLE_MISMATCH: route spendability cites stale or wrong wall bundle`
- Observations:
  - Off-chain validator blocked stale wall_bundle_hash before EVM route call.

## Interpretation

The EVM route path succeeds only after the off-chain validator accepts a route spendability packet that cites the current wall bundle hash. Missing or stale wall bundle hashes are blocked before the EVM route call is made.

The contract still does not parse wall packets. It consumes the route spendability hash and anchors it. Full wall semantics remain off-chain in this drill.
