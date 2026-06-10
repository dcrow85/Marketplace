# Wall Bundle Route Spendability Drill: wall_bundle_route_spendability_drill_20260609T154700Z

- Generated: `2026-06-09T15:47:01.633919+00:00`
- RPC: `http://127.0.0.1:18547`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Wall bundle hash: `sha256:211032c445d6ea9a2a6a1a4f561086eb750d51965b89aa3d18a9ee6d6b0ea7a6`
- Assembly history hash: `sha256:82f2e6ccac66a9ab2882bd7c709779f67235f7ed761097977c9b895676f9c20b`
- Wall bundle EVM ref: `0x05ce4021bb59b413113713690ae44b78e0960fcbd2528ba84e618ef4b7d1a517`
- Assembly history EVM ref: `0xc873aed6dd1fae820ec68fa0b41e5b4a3d625dbc2fbc56d2238419f96aab6727`
- Route assembly witness hash: `0xa531c23b194499650ca16c9c81fbca8cfa473c57b0181845f9d011d862f4fe0c`
- Route spendability hash: `0xaf4994fb3b57120a7e489438b06fff19bc56763139edd6295d6410e2acd75f64`
- Passed: `True`

## Cases

### valid_wall_bundle_route_lock

- Expected: `route_locked_with_wall_bundle_spendability`
- Outcome: `route_locked_with_wall_bundle_spendability`
- Passed: `True`
- Final state: `RouteLocked`
- Transactions:
  - `create wall bundle drill trade`: `0x6c08922ed111d8a36064147fde6d21aaae4fe89fa53157dd24f7c68f7a4d2c2d`
  - `seller posts wall bundle drill bond`: `0x83443161bc48c3ec146755e2dc0f4eb9d631e32526041642840fccf2b573d3c6`
  - `commit wall bundle item fingerprint`: `0x782cfd136fa3be4e283dad5841b46bb2bf4e41dbb8e9cc68a005663a96667c48`
  - `commit wall bundle inventory lock`: `0x39ca3c6b344ced615dcb42aac4da52604415796538d03f97cc0f517975d2f9bb`
  - `commit route with wall bundle assembly spendability`: `0x15b5ee74fc4129c38c3a7dc390568b0c446e2db306e71bc8ad7c30acab29f975`
- Packets:
  - `wall_bundle_intent` `0xeee316dd3e80aee286aab0a349098674484db316ed26b9be55e619117f8dfcc8`
  - `wall_bundle_terms` `0x082c10d466e02304ea4aced576527b034517c7758f9f531e0db9e944d13c13c0`
  - `wall_bundle_item_fingerprint` `0x70f75f5dcee22546d3c89e6426bf92381d857db65a6504f68ddde31dcf8c7a48`
  - `wall_bundle_inventory_lock` `0xce25bfd7d4dc6fff2d6155730040c063920cdf3a193e20a01aa52ce1955b1d95`
  - `wall_bundle_route` `0x1b593a6c3a48f2143b3a6c8f21a53b175b9c24b97753db8b87fe682f28f631a2`
  - `wall_bundle_route_spendability_valid` `0xaf4994fb3b57120a7e489438b06fff19bc56763139edd6295d6410e2acd75f64`
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

### missing_assembly_history_hash

- Expected: `validator_blocked_missing_assembly_history`
- Outcome: `validator_blocked_missing_assembly_history`
- Passed: `True`
- Final state: ``
- Validator error: `ASSEMBLY_HISTORY_MISSING: route spendability must cite assembly history`
- Observations:
  - Off-chain validator blocked missing assembly_history_hash before EVM route call.

### stale_assembly_history_hash

- Expected: `validator_blocked_stale_assembly_history`
- Outcome: `validator_blocked_stale_assembly_history`
- Passed: `True`
- Final state: ``
- Validator error: `ASSEMBLY_HISTORY_MISMATCH: route spendability cites stale or wrong assembly history`
- Observations:
  - Off-chain validator blocked stale assembly_history_hash before EVM route call.

## Interpretation

The EVM route path succeeds only after the off-chain validator accepts a route spendability packet that cites the current wall bundle and assembly history hashes. Missing or stale wall bundle and assembly hashes are blocked before the EVM route call is made.

The contract still does not parse wall or assembly packets. It consumes the route spendability hash and validates the typed route assembly witness. Full wall and assembly graph semantics remain off-chain in this drill.
