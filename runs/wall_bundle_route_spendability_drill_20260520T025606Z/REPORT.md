# Wall Bundle Route Spendability Drill: wall_bundle_route_spendability_drill_20260520T025606Z

- Generated: `2026-05-20T02:56:07.920051+00:00`
- RPC: `http://127.0.0.1:18547`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Wall bundle hash: `sha256:63e4ec00ca92982977ec9d2187184d3479f688b11d5fb93865d40228d4651508`
- Route spendability hash: `0x1962d92fc803a22dc6780d82b690e49ddb110830d4df7ae0ec0d5d8bed7e177e`
- Passed: `True`

## Cases

### valid_wall_bundle_route_lock

- Expected: `route_locked_with_wall_bundle_spendability`
- Outcome: `route_locked_with_wall_bundle_spendability`
- Passed: `True`
- Final state: `RouteLocked`
- Transactions:
  - `create wall bundle drill trade`: `0x1e467ef6e2e1972800ea1b996ea36a3ebf65a4770175b19befa58edbece32dd7`
  - `seller posts wall bundle drill bond`: `0xad5881e566f0dfa1b5f1b99ee5ffdb6a438592c00f9ff5479f90abd62a983cdd`
  - `commit wall bundle item fingerprint`: `0xd3862b8ceebf041139e3b4a169c76e251840c8a30ea4799a85d25b1e2a96dd0e`
  - `commit wall bundle inventory lock`: `0xf107a9c3fe0a0fb2bbe044fef40d003df3eb3c04f02297c994063831af889a2e`
  - `commit route with wall bundle spendability`: `0xf7460966311e28fe9249341e978cb4039792da153e06c0a4d9221bf2acc31812`
- Packets:
  - `wall_bundle_intent` `0xeee316dd3e80aee286aab0a349098674484db316ed26b9be55e619117f8dfcc8`
  - `wall_bundle_terms` `0x082c10d466e02304ea4aced576527b034517c7758f9f531e0db9e944d13c13c0`
  - `wall_bundle_item_fingerprint` `0x70f75f5dcee22546d3c89e6426bf92381d857db65a6504f68ddde31dcf8c7a48`
  - `wall_bundle_inventory_lock` `0xce25bfd7d4dc6fff2d6155730040c063920cdf3a193e20a01aa52ce1955b1d95`
  - `wall_bundle_route` `0x1b593a6c3a48f2143b3a6c8f21a53b175b9c24b97753db8b87fe682f28f631a2`
  - `wall_bundle_route_spendability_valid` `0x1962d92fc803a22dc6780d82b690e49ddb110830d4df7ae0ec0d5d8bed7e177e`
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
