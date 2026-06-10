# No Rarity Tooling

Use this reference when an agent needs live access to the local No Rarity
catalog.

## CLI

Run from `/Users/che/Marketplace`:

```bash
python3 agent_tools/no_rarity_agent_cli.py search_catalog "raichu holo"
python3 agent_tools/no_rarity_agent_cli.py get_card PMCG1-038
python3 agent_tools/no_rarity_agent_cli.py interpret_human_text "I might sell my No Rarity Blastoise"
python3 agent_tools/no_rarity_agent_cli.py evidence_plan PMCG1-071 --seller-trust thin
python3 agent_tools/no_rarity_agent_cli.py evidence_plan PMCG1-038 --evidence-profile NR-D
python3 agent_tools/no_rarity_agent_cli.py evaluate_gate PMCG1-021 --stance want --evidence-level NR-A --seller-trust thin
python3 agent_tools/no_rarity_agent_cli.py agent_test_packet
python3 agent_tools/no_rarity_agent_cli.py catalog_release
```

## MCP Server

Launch command:

```bash
python3 /Users/che/Marketplace/mcp/no_rarity_catalog_server.py
```

Available MCP tools:

- `no_rarity_search_catalog`
- `no_rarity_get_card`
- `no_rarity_interpret_human_text`
- `no_rarity_evidence_plan`
- `no_rarity_evaluate_gate`
- `no_rarity_agent_test_packet`
- `no_rarity_catalog_release`

All tool results preserve the protocol boundary: catalog rows can identify
candidates and evidence needs, but they do not prove seller possession,
authenticity, condition, price, or physical No Rarity truth.

Search and card results include `catalog_citation` / `catalog_release` fields.
Agents should cite `(catalog_hash, row_id)` rather than "the catalog." Evidence
defaults live in `data/no-rarity-catalog-policy.json`, separate from the fact
catalog.

`NR-D` is intentionally treated as an unchecked slab/cert claim unless the
agent has a checked slab packet, such as `NR-D-checked` or `slab_packet`.
That keeps a visible label from becoming spendable by resemblance.

## Quick Probe

Run:

```bash
python3 agent_tests/no_rarity_catalog_probe.py
```

Expected result: JSON with `"pass": true`.
