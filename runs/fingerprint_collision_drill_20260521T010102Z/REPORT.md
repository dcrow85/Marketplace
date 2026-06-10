# Fingerprint Collision Drill: fingerprint_collision_drill_20260521T010102Z

- Generated: `2026-05-21T01:01:06.323665+00:00`
- RPC: `http://127.0.0.1:18662`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Predicate verifier: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Escrow: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Drill cases: `7`

## Result

The exact same active fingerprint hash is blocked by the EVM. Different hashes that look like the same physical card, a stale photo, or a front/back mismatch are detected off-chain and turned into buyer-signed `FingerprintChallenge` packets. Fresh nonce cure evidence can be accepted only after a verifier commits an attestation bound to the active challenge hash and the buyer signs an attestation-bound resolution. Stale evidence and mixed front/back evidence keep route blocked.

## Collision Matrix

| Case | Trades | Detector Signals | EVM Outcome |
| --- | --- | --- | --- |
| Exact same fingerprint hash across active trades | `1, 2` | `same_hash_active_elsewhere` | `blocked_on_chain_by_activeItemFingerprints` |
| Same PSA cert reused with different photos | `3, 4` | `same_cert_active_elsewhere:psa-cert-hash-65081234:trade_3` | `verifier_cure_accepted_route_allowed` |
| Prior marketplace image reused without custody nonce | `5` | `prior_market_ref_without_current_custody_nonce`<br>`stale_capture_window` | `verifier_rejects_route_stays_blocked` |
| Front and back markers appear to be different cards | `6` | `front_back_match_group_mismatch` | `verifier_escalates_route_stays_blocked` |
| Same front photo paired with a different back | `7, 8` | `front_back_match_group_mismatch`<br>`same_front_different_back:trade_7` | `buyer_challenge_blocks_route` |
| Same raw card cropped into different fingerprint hashes | `9, 10` | `same_private_match_group:private-match-group:raw-omega-42:trade_9` | `buyer_challenge_blocks_route` |
| Fresh nonce evidence with no collision signal | `11` | `none` | `route_allowed_no_collision_signal` |

## Case Notes

### Exact same fingerprint hash across active trades

- Slug: `exact_hash_collision`
- Trade ids: `[1, 2]`
- Requested evidence: `[]`
- Packets: `7`; all signatures valid: `True`
- Transactions: `7`
- Outcome: `blocked_on_chain_by_activeItemFingerprints`
- Observations:
  - exact_attack commit same active fingerprint reverted as expected.

### Same PSA cert reused with different photos

- Slug: `same_cert_reuse`
- Trade ids: `[3, 4]`
- Requested evidence: `['fresh_slab_nonce_photo']`
- Packets: `15`; all signatures valid: `True`
- Transactions: `15`
- Outcome: `verifier_cure_accepted_route_allowed`
- Observations:
  - cert_attack route blocked by active fingerprint challenge reverted as expected.
  - Verifier accepted fresh nonce cure; buyer cleared the challenge with the attestation and route committed.

### Prior marketplace image reused without custody nonce

- Slug: `stale_prior_market_photo`
- Trade ids: `[5]`
- Requested evidence: `['fresh_timestamped_photo', 'seller_custody_nonce_photo']`
- Packets: `9`; all signatures valid: `True`
- Transactions: `8`
- Outcome: `verifier_rejects_route_stays_blocked`
- Observations:
  - stale_photo route blocked by active fingerprint challenge reverted as expected.
  - stale_photo route remains blocked after verifier rejection reverted as expected.

### Front and back markers appear to be different cards

- Slug: `mixed_front_back`
- Trade ids: `[6]`
- Requested evidence: `['fresh_front_back_video_with_single_take']`
- Packets: `9`; all signatures valid: `True`
- Transactions: `8`
- Outcome: `verifier_escalates_route_stays_blocked`
- Observations:
  - mixed_front_back route blocked by active fingerprint challenge reverted as expected.
  - mixed_front_back route remains blocked after verifier escalation reverted as expected.

### Same front photo paired with a different back

- Slug: `same_front_different_back`
- Trade ids: `[7, 8]`
- Requested evidence: `['fresh_front_back_video_with_single_take', 'front_back_video_with_buyer_nonce']`
- Packets: `12`; all signatures valid: `True`
- Transactions: `11`
- Outcome: `buyer_challenge_blocks_route`
- Observations:
  - front_attack route blocked by active fingerprint challenge reverted as expected.

### Same raw card cropped into different fingerprint hashes

- Slug: `same_card_crop_alias`
- Trade ids: `[9, 10]`
- Requested evidence: `['verifier_or_arbiter_image_match_review']`
- Packets: `12`; all signatures valid: `True`
- Transactions: `11`
- Outcome: `buyer_challenge_blocks_route`
- Observations:
  - crop_attack route blocked by active fingerprint challenge reverted as expected.

### Fresh nonce evidence with no collision signal

- Slug: `fresh_nonce_control`
- Trade ids: `[11]`
- Requested evidence: `[]`
- Packets: `6`; all signatures valid: `True`
- Transactions: `6`
- Outcome: `route_allowed_no_collision_signal`
- Observations:
  - Fresh nonce control committed route without a collision challenge.

## What This Proves

- Hash-level duplicate fingerprints are enforceable on-chain today.
- Semantic duplicates are not on-chain facts until an agent, verifier, buyer, or arbiter turns them into signed packets.
- The current `FingerprintChallenge` gate is strong enough to pause route commitment after a semantic detector flags a problem.
- The attested cure path now requires `VerifierScopeApproval`, `VerifierScopeAttestation`, and `clearFingerprintChallengeWithAttestation` before route can resume.
- Verifier review can produce different outcomes: accept fresh nonce cure, reject stale evidence, or escalate mixed-front/back ambiguity.
- Collision signals stay non-scalar: same cert, stale capture, front/back mismatch, same front with different back, and private match-group alias remain separate reasons with separate evidence requests.
- A clean low-risk control with fresh nonce evidence can still move forward, so the drill does not collapse into universal over-verification.

## Still Not Proven

- The detector is a deterministic local probe, not real image matching.
- No PSA, SGC, BGS, CGC, marketplace, or carrier API is integrated.
- Private match groups are simulated commitments; a production version needs verifier custody, confidential matching, or a ZK/TEE-style proof path.
- Seller cure evidence is simulated; the full interactive cure loop, deadlines, fees, and arbiter handoff are not modeled yet.
- The contract still cannot detect two different hashes that represent the same card unless someone signs and anchors the challenge.

## Next Hardening Target

Add verifier-agent cure workflow packets: evidence request, seller response, verifier fee/SLA, accepted cure, rejected cure, escalation handoff, and buyer waiver. Then connect a real or stubbed image/cert matcher behind the verifier method.
