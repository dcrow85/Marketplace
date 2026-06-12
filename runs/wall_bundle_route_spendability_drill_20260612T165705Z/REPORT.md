# Wall Bundle Route Spendability Drill: wall_bundle_route_spendability_drill_20260612T165705Z

- Generated: `2026-06-12T16:57:07.218550+00:00`
- RPC: `http://127.0.0.1:18547`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Wall bundle hash: `sha256:211032c445d6ea9a2a6a1a4f561086eb750d51965b89aa3d18a9ee6d6b0ea7a6`
- Assembly history hash: `sha256:82f2e6ccac66a9ab2882bd7c709779f67235f7ed761097977c9b895676f9c20b`
- Wall bundle EVM ref: `0x05ce4021bb59b413113713690ae44b78e0960fcbd2528ba84e618ef4b7d1a517`
- Assembly history EVM ref: `0xc873aed6dd1fae820ec68fa0b41e5b4a3d625dbc2fbc56d2238419f96aab6727`
- Route assembly witness hash: `0x944b50d6deb0c0333f981050ef2c46d6bbdb278ad0d082df6c161997fadaa2cf`
- Route spendability hash: `0x42db4cc336eb2e495dc3d59b4b1fd7ed6148ec716f08a860ee878e4e787f136e`
- Passed: `True`

## Cases

### valid_wall_bundle_route_lock

- Expected: `route_locked_with_wall_bundle_spendability`
- Outcome: `route_locked_with_wall_bundle_spendability`
- Passed: `True`
- Final state: `RouteLocked`
- Transactions:
  - `create wall bundle drill trade`: `0x7e5f58ebf964848d62064e74d2b522ea0953fa746b761334a4f6434666b2ad21`
  - `seller posts wall bundle drill bond`: `0xcf309a1ede6bae41037691693aa10baf683ea7a78e23d7dcbcdc45b8d0e9188b`
  - `commit wall bundle item fingerprint`: `0x943e62f3d6301a52207c594cd2ae3d693dd1438f4a2470d97e45067c688f0a4d`
  - `commit wall bundle inventory lock`: `0xee98a9de905ab4e8039c3bf470007b7e8bf75e3479dcb4969c0e0c04d6a617e3`
  - `commit route with wall bundle assembly spendability`: `0x1af7489dc51c9c9eb98d60f9e0f43ee6e5d2cbbc929743e08740fca0ea0f04c8`
- Packets:
  - `wall_bundle_intent` `0xeee316dd3e80aee286aab0a349098674484db316ed26b9be55e619117f8dfcc8`
  - `wall_bundle_terms` `0x082c10d466e02304ea4aced576527b034517c7758f9f531e0db9e944d13c13c0`
  - `wall_bundle_item_fingerprint` `0x70f75f5dcee22546d3c89e6426bf92381d857db65a6504f68ddde31dcf8c7a48`
  - `wall_bundle_inventory_lock` `0xce25bfd7d4dc6fff2d6155730040c063920cdf3a193e20a01aa52ce1955b1d95`
  - `wall_bundle_route` `0x1b593a6c3a48f2143b3a6c8f21a53b175b9c24b97753db8b87fe682f28f631a2`
  - `wall_bundle_route_spendability_valid` `0xea25c9c4d2530fed2f0bdaea515adb76804d588cca33f4acc626bc1de52b6bf5`
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
