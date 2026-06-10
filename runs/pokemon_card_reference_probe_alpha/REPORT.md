# Pokemon Card Reference Probe: 2026-05-20T14:15:54Z

- Pass: `True`
- Packet hash: `sha256:1ae46d93367c094c14174c8b9100f94a05b2d5a2f7f0cb04af2136293feb6919`
- Catalog candidate: `Espeon / Neo Discovery / #1`
- Match kind: `language_equivalent`
- Source coverage: `english_catalog_anchor_for_japanese_claim`

## Interpretation

PokemonTCG.io anchors the English Neo Discovery Espeon catalog row. TCGdex anchors the English row but does not return the Japanese neo2-1 row in this probe, so the Japanese-language claim stays evidence-dependent instead of becoming database truth.

## Non-Claims

- `authenticity`
- `condition`
- `possession`
- `price_truth`
- `seller_card_language`
- `seller_inventory_existence`

## Source Results

### pokemontcg_search

- `source_url`: `https://api.pokemontcg.io/v2/cards?q=name%3Aespeon+set.name%3A%22Neo+Discovery%22&pageSize=5&select=id%2Cname%2Cset%2Cnumber%2Crarity%2Cimages`
- `count`: `2`
- `ids`: `['neo2-1', 'neo2-20']`

### tcgdex_en_neo2_1

- `source_url`: `https://api.tcgdex.net/v2/en/cards/neo2-1`
- `status`: `200`
- `name`: `Espeon`
- `variants`: `{'firstEdition': True, 'holo': True, 'normal': False, 'reverse': False, 'wPromo': False}`

### tcgdex_ja_neo2_1

- `source_url`: `https://api.tcgdex.net/v2/ja/cards/neo2-1`
- `status`: `404`
- `error`: `Not Found`

### tcgdex_ja_espeon_name

- `source_url`: `https://api.tcgdex.net/v2/ja/cards?name=%E3%82%A8%E3%83%BC%E3%83%95%E3%82%A3`
- `count`: `4`
- `ids`: `['SV3-046', 'SV8a-062', 'SV8a-063', 'SV8a-211']`

