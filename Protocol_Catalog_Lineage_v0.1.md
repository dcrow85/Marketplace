# Protocol Catalog Lineage v0.1

Generated 2026-06-10.

This document defines how agent-readable catalogs become durable, forkable, and
challengeable without becoming authentication authorities.

Core rule:

```text
Catalogs are content-addressed substrates, not locations.
```

A catalog release can live in git, a skill bundle, HTTP mirrors, IPFS, local
agent caches, or any other storage layer. The protocol reference is not "where
the file lives." The protocol reference is:

```text
(catalog_hash, row_id)
```

The chain may anchor catalog release hashes. It should not store rows.

## Three Layers

### Bytes

Catalog bytes are canonically serialized and hashed.

```text
canonicalization: json_sorted_keys_no_whitespace_v0.1
hash_algorithm: sha256
```

The current No Rarity fact catalog is pinned in:

```text
data/no-rarity-catalog-manifest.json
```

The release manifest separates:

- fact catalog hash,
- evidence policy hash,
- bundle hash,
- row citation shape,
- on-chain anchor status.

### Citations

Every card reference packet should cite exact bytes:

```text
catalog_hash
row_id
optional row_hash
policy_hash if a policy default is being used
```

This lets historical trades remain readable after servers move, catalogs fork,
or policies evolve. A settled trade references the bytes it used at the time.

### Anchors

The on-chain layer anchors release hashes, not catalog rows:

```text
catalog_hash existed at time T
```

That is enough to make catalog references durable without pretending a chain can
decide whether the catalog row is true.

## Fact / Policy Split

The fact catalog should not carry evidence defaults as if they were facts.

The No Rarity split is:

```text
data/no-rarity-base-set.json          fact catalog
data/no-rarity-catalog-policy.json    evidence policy defaults
data/no-rarity-catalog-manifest.json  release manifest
```

The policy may recommend front/back photos, lower-right crops, fresh nonce
photos, slab label checks, or other evidence defaults. A policy hash can be
cited by an agent or trade, but it remains a policy artifact.

## Catalog Revision Packet

Agents may propose additions, corrections, row splits, variant notes, or source
updates through signed revision packets.

```text
schema: marketplace.catalog_revision.v0.1
revision_id
parent_catalog_hash
proposed_catalog_hash
row_id
revision_type: add_row | update_row | split_row | deprecate_row | policy_link
author_agent
author_controller_or_delegate
evidence_refs
source_content_hashes
claim_text
diff_summary
challenge_window
not_claiming
signature_or_execution_receipt
```

Required `not_claiming`:

- seller possession,
- authenticity,
- condition truth,
- price truth,
- universal catalog truth,
- no future challenge.

## Row Challenge Packet

Challenges are evidence-weighted, not agent-weighted.

```text
schema: marketplace.row_challenge.v0.1
challenge_id
revision_ref
challenger_agent
evidence_refs
contradicted_claims
challenge_strength: weak | material | decisive
challenger_calibration_ref
independence_vector_ref
requested_outcome: harden | flag | block | fork
not_claiming
signature_or_execution_receipt
```

One high-quality contradiction is stronger than one thousand unevidenced agent
votes. Sybil agreement is zero information unless it brings new evidence.

## Row Calibration

Rows and catalog lineages can be calibrated over time by protocol residue:

- clean settlements citing the row,
- claims traceable to row confusion,
- verifier corrections,
- challenge outcomes,
- forks later preferred by agents or buyers.

Calibration does not make a row true. It says how the row behaved under use.

Useful caveat:

```text
50 clean citations means no surfaced error in those trades, not proof no error exists.
```

## Agent Instruction

Say:

```text
This trade cites catalog hash H, row PMCG1-025, and evidence policy hash P.
That anchors the reference bytes. It does not prove the seller's card.
```

Do not say:

```text
The catalog proves the card is real.
```

## Drill

Runner:

```text
python3 simulations/catalog_evolution_drill.py
```

The drill should show:

- a good revision hardens after unevidenced challenges fail,
- a poisoned row proposal is blocked by one strong evidence-backed challenge,
- a URL-only source without content hash is rejected,
- sybil challenge count does not outweigh evidence strength,
- fact catalog and evidence policy remain separate hashes.
