#!/usr/bin/env python3
"""Falsification drill for the §5 gates (CE1-CE10) of Protocol_Catalog_Evidence_v0.2.md.
Deterministic, model-free.

PER-SUBGUARD TEETH: each compound gate is mutated one subclause at a time. For every
subguard, an attack violating only it must (a) BLOCK under the full gate, and (b) flip to
ADMIT when only that subguard is disabled. Each gate fn takes `off` = subguard ids to
disable; attacks are {**clean, **override}. Not live enforcement; mirrors the admission
rules the community-catalog surface must bind. On-chain anchor binds are Codex's lane.

"Gates intact": CE2 IS G6 (a specimen match never renders as authentication); CE1/CE3 reuse
Verifier §6 (zero-weight-until-anchored + outcome-provenance); CE4 reuses A1 aggregate caps;
CE6 reuses A6. Nothing here lowers a wall.

Run: python3 simulations/catalog_evidence_drill.py
"""

from __future__ import annotations

_VALID_ANCHORS = {"grader_cert", "settled_trade", "bonded_verifier_attestation"}
_AUTH_LABELS = {"authentic", "genuine", "is that card", "verified authentic", "real"}
_TIER_RANK = {"raw": 1, "anchored": 2, "curated": 3}


def ce1(c, off=frozenset()):  # Zero reference weight until provenance-anchored, with a tight anchor
    r = []
    if "raw_zero_weight" not in off and c["tier"] == "raw" and c["reference_weight"] > 0:
        r.append("raw specimen carries nonzero reference weight")
    if "anchored_requires_anchor_ref" not in off and c["tier"] in {"anchored", "curated"} and not c["anchor_ref"]:
        r.append("tiered specimen without an anchor_ref")
    if "anchor_type_valid" not in off and c["anchor_ref"] and c["anchor_type"] not in _VALID_ANCHORS:
        r.append(f"anchor type not a resolved-genuine outcome ({c['anchor_type']})")
    # settled_trade is NOT a resolved-genuine outcome unless it adjudicated scope AND finality elapsed
    if "settled_covered_scope" not in off and c["anchor_type"] == "settled_trade" \
            and not c["settled_covered_authenticity_at_scope"]:
        r.append("settled_trade anchor did not cover row/variant/authenticity scope")
    if "settled_final" not in off and c["anchor_type"] == "settled_trade" \
            and not c["settled_finality_and_tail_elapsed"]:
        r.append("settled_trade anchor before finality + tail elapsed")
    return (not r, r)


def ce2(c, off=frozenset()):  # Specimen match never renders as authentication (= G6)
    r = []
    if "no_auth_render" not in off and c["derived_from"] == "specimen_match" and c["rendered_label"].lower() in _AUTH_LABELS:
        r.append(f"specimen match rendered as authentication ({c['rendered_label']!r})")
    return (not r, r)


def ce3(c, off=frozenset()):  # Anchor integrity (poison / Verifier §6)
    r = []
    if "self_anchor_excluded" not in off and c["anchor_attestor"] == c["contributor"]:
        r.append("specimen anchored by its own contributor (self-laundering)")
    if "related_party_anchor_excluded" not in off and c["anchor_attestor"] in c["related_parties"]:
        r.append("specimen anchored by a related party")
    if "outlier_flagged" not in off and c["anomaly_outlier"] and not c["flagged_for_review"]:
        r.append("anomaly outlier silently absorbed into the distribution")
    return (not r, r)


def ce4(c, off=frozenset()):  # Sybil / flood caps on REGISTRY-CANONICAL labels (the A1 rotation lesson)
    r = []
    if "contributor_label_canonical" not in off and not c["contributor_label_registry_resolved"]:
        r.append("contributor label is self-asserted, not registry-resolved (rotatable)")
    if "cluster_label_canonical" not in off and not c["cluster_label_registry_canonical"]:
        r.append("control-cluster label is self-asserted, not registry-canonical (rotatable)")
    if "per_contributor_cap" not in off and c["contributor_weighted_share"] > c["contributor_cap"]:
        r.append("per-contributor weighted corpus share over cap")
    if "per_cluster_cap" not in off and c["cluster_weighted_share"] > c["cluster_cap"]:
        r.append("per-control-cluster weighted corpus share over cap")
    return (not r, r)


def ce5(c, off=frozenset()):  # Claim boundary (no-overclaim; ownership decoupled)
    r = []
    if "not_claiming_complete" not in off and not c["required_not_claiming"].issubset(c["not_claiming"]):
        r.append("specimen not_claiming boundary incomplete")
    if "no_authenticity_claim" not in off and c["claims_authenticity"]:
        r.append("specimen claim asserts authenticity")
    return (not r, r)


def ce6(c, off=frozenset()):  # Privacy / theft-sensitivity (A6)
    r = []
    if "exif_stripped_or_encrypted" not in off and c["location_present"] \
            and c["disclosure_mode"] not in {"stripped", "encrypted", "redacted"}:
        r.append("location/EXIF publicly leaked (theft map)")
    if "pseudonymous_contributor" not in off and c["identity_kind"] == "legal_identity":
        r.append("contributor exposed as a legal identity, not a handle")
    return (not r, r)


def ce7(c, off=frozenset()):  # Display license + provenance tier floor
    r = []
    if "display_license_granted" not in off and c["used_in_trade"] and not c["display_license"]:
        r.append("specimen used in a trade without a granted display license")
    if "tier_floor_met" not in off and c["used_in_trade"] and _TIER_RANK[c["provenance_tier"]] < c["required_tier_rank"]:
        r.append("specimen tier below the gate floor for this use")
    return (not r, r)


def ce8(c, off=frozenset()):  # Incentive anti-poison
    r = []
    if "credit_only_anchored" not in off and c["credit_granted"] and c["provenance_tier"] == "raw":
        r.append("contribution credit granted to a raw (un-anchored) specimen (pay-for-poison)")
    return (not r, r)


def ce9(c, off=frozenset()):  # CorpusVisibilityPolicy — the public corpus can't be a forger training set
    r = []
    if "policy_present" not in off and not c["visibility_policy_bound"]:
        r.append("no corpus visibility policy bound")
    if "high_res_anchored_not_public" not in off and c["rendered_public"] and c["resolution"] == "full" \
            and not c["down_res_or_watermarked"]:
        r.append("full-res anchored specimen rendered public without down-res/watermark")
    if "forger_value_gated" not in off and c["high_discriminating_view"] and c["visibility"] != "verifier_only":
        r.append("high-discriminating (forger-valuable) view not gated to verifier-only")
    return (not r, r)


def ce10(c, off=frozenset()):  # Row/variant-scope precision (the missing attack H)
    r = []
    if "row_ref_exact" not in off and not c["row_ref_resolves_to_single_variant"]:
        r.append("row_ref is a broad/parent row, not a single variant")
    if "anchor_scope_matches_row" not in off and c["anchor_adjudicated_scope"] != c["specimen_row_variant"]:
        r.append("anchor adjudicated a different scope than the specimen's row/variant")
    if "cross_variant_excluded" not in off and c["content_matches_variant"] != c["specimen_row_variant"] \
            and not c["flagged_for_review"]:
        r.append("specimen content matches a different variant than its row_ref (cross-variant poison)")
    return (not r, r)


GATES = [
    ("CE1", ce1, {"tier": "anchored", "reference_weight": 1, "anchor_ref": True, "anchor_type": "settled_trade",
                  "settled_covered_authenticity_at_scope": True, "settled_finality_and_tail_elapsed": True},
     [("raw_zero_weight", {"tier": "raw", "reference_weight": 1}),
      ("anchored_requires_anchor_ref", {"anchor_ref": False}),
      ("anchor_type_valid", {"anchor_type": "self_attest"}),
      ("settled_covered_scope", {"settled_covered_authenticity_at_scope": False}),
      ("settled_final", {"settled_finality_and_tail_elapsed": False})]),

    ("CE2", ce2, {"derived_from": "specimen_match", "rendered_label": "matches 12 community specimens"},
     [("no_auth_render", {"rendered_label": "authentic"})]),

    ("CE3", ce3, {"contributor": "alice", "anchor_attestor": "graderX", "related_parties": {"affilA"},
                  "anomaly_outlier": False, "flagged_for_review": False},
     [("self_anchor_excluded", {"anchor_attestor": "alice"}),
      ("related_party_anchor_excluded", {"anchor_attestor": "affilA"}),
      ("outlier_flagged", {"anomaly_outlier": True, "flagged_for_review": False})]),

    ("CE4", ce4, {"contributor_label_registry_resolved": True, "cluster_label_registry_canonical": True,
                  "contributor_weighted_share": 0.05, "contributor_cap": 0.10,
                  "cluster_weighted_share": 0.10, "cluster_cap": 0.20},
     [("contributor_label_canonical", {"contributor_label_registry_resolved": False}),
      ("cluster_label_canonical", {"cluster_label_registry_canonical": False}),
      ("per_contributor_cap", {"contributor_weighted_share": 0.20}),
      ("per_cluster_cap", {"cluster_weighted_share": 0.30})]),

    ("CE5", ce5, {"required_not_claiming": {"possession", "authenticity", "condition"},
                  "not_claiming": {"possession", "authenticity", "condition"}, "claims_authenticity": False},
     [("not_claiming_complete", {"not_claiming": {"possession"}}),
      ("no_authenticity_claim", {"claims_authenticity": True})]),

    ("CE6", ce6, {"location_present": True, "disclosure_mode": "stripped", "identity_kind": "handle"},
     [("exif_stripped_or_encrypted", {"disclosure_mode": "public"}),
      ("pseudonymous_contributor", {"identity_kind": "legal_identity"})]),

    ("CE7", ce7, {"used_in_trade": True, "display_license": True, "provenance_tier": "anchored", "required_tier_rank": 2},
     [("display_license_granted", {"display_license": False}),
      ("tier_floor_met", {"provenance_tier": "raw"})]),

    ("CE8", ce8, {"credit_granted": True, "provenance_tier": "anchored"},
     [("credit_only_anchored", {"provenance_tier": "raw"})]),

    ("CE9", ce9, {"visibility_policy_bound": True, "rendered_public": True, "resolution": "reduced",
                  "down_res_or_watermarked": True, "high_discriminating_view": False, "visibility": "public"},
     [("policy_present", {"visibility_policy_bound": False}),
      ("high_res_anchored_not_public", {"resolution": "full", "down_res_or_watermarked": False}),
      ("forger_value_gated", {"high_discriminating_view": True, "visibility": "public"})]),

    ("CE10", ce10, {"row_ref_resolves_to_single_variant": True, "anchor_adjudicated_scope": "row:base-charizard-v1",
                    "specimen_row_variant": "row:base-charizard-v1", "content_matches_variant": "row:base-charizard-v1",
                    "flagged_for_review": False},
     [("row_ref_exact", {"row_ref_resolves_to_single_variant": False}),
      ("anchor_scope_matches_row", {"anchor_adjudicated_scope": "row:other-variant"}),
      ("cross_variant_excluded", {"content_matches_variant": "row:different-variant"})]),
]


def run() -> int:
    print("§5 catalog-evidence (community specimens) — per-subguard falsification drill\n" + "-" * 72)
    gates_ok = 0
    total_subs = passed_subs = 0
    for gid, fn, clean, subs in GATES:
        ok_clean, _ = fn(clean)
        gate_pass = ok_clean
        detail = []
        for sg, override in subs:
            attack = {**clean, **override}
            blocked = not fn(attack)[0]
            admitted = fn(attack, off=frozenset({sg}))[0]
            teeth = blocked and admitted
            total_subs += 1
            passed_subs += 1 if teeth else 0
            gate_pass = gate_pass and teeth
            detail.append(f"{sg}{'✓' if teeth else '✗(blk=%s,adm=%s)' % (blocked, admitted)}")
        if gate_pass:
            gates_ok += 1
        print(f"[{'PASS' if gate_pass else 'FAIL'}] {gid:5} clean={ok_clean}  {len(subs)} subguard(s): " + ", ".join(detail))
    print("-" * 72)
    print(f"{gates_ok}/{len(GATES)} gates pass · {passed_subs}/{total_subs} subguards have independent teeth")
    return 0 if gates_ok == len(GATES) and passed_subs == total_subs else 1


if __name__ == "__main__":
    raise SystemExit(run())
