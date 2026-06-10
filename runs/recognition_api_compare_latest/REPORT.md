# Recognition API Comparison

Fixture: `/Users/che/Marketplace/test-fixtures/no-rarity-binder-page-9-holos.png`

## Ground Truth Wall

The fixture is a binder-page intake image. It can support identity/import suggestions, but it cannot verify No Rarity or condition.

| Slot | Catalog ID | Card | No Rarity | Condition |
|---|---|---|---|---|
| (1,1) | PMCG1-049 | Alakazam / フーディン (Fuudin) | candidate, not verified | unknown |
| (1,2) | PMCG1-032 | Blastoise / カメックス (Kamekkusu) | candidate, not verified | unknown |
| (1,3) | PMCG1-068 | Chansey / ラッキー (Rakkii) | candidate, not verified | unknown |
| (2,1) | PMCG1-021 | Charizard / リザードン (Rizaadon) | candidate, not verified | unknown |
| (2,2) | PMCG1-067 | Clefairy / ピッピ (Pippi) | candidate, not verified | unknown |
| (2,3) | PMCG1-034 | Gyarados / ギャラドス (Gyarados) | candidate, not verified | unknown |
| (3,1) | PMCG1-058 | Hitmonchan / エビワラー (Ebiwaraa) | candidate, not verified | unknown |
| (3,2) | PMCG1-057 | Machamp / カイリキー (Kairikii) | candidate, not verified | unknown |
| (3,3) | PMCG1-039 | Magneton / レアコイル (Reakoiru) | candidate, not verified | unknown |

## Witness Results

| Witness | Status | Time | Notes |
|---|---|---:|---|
| gemma4:e4b raw | ran | 28.1s | missing expected catalog ids: PMCG1-049, PMCG1-032, PMCG1-068, PMCG1-021, PMCG1-067, PMCG1-034, PMCG1-058, PMCG1-057, PMCG1-039<br>wall failure: No Rarity uncertainty not preserved on every row<br>wall failure: condition unknown not preserved on every row |
| gemma4:e4b catalog-grounded | ran | 73.24s | all expected catalog ids present<br>No Rarity uncertainty preserved on every row<br>condition unknown preserved on every row |
| gemma4:31b catalog-grounded | ran | 94.86s | all expected catalog ids present<br>No Rarity uncertainty preserved on every row<br>condition unknown preserved on every row |
| Scrydex Vision | skipped_missing_credentials |  | Supports image_url or multipart file, game scoping, returns matches plus analysis. |
| GIBL predict-card | skipped_missing_credentials |  | Accepts file or image_url according to docs; returns set/name/variation candidates. |
| TCGAPIs recognition | skipped_missing_credentials |  | Advertises top-10 product-id matches with confidence scores. |
| eBay Browse searchByImage | skipped_missing_credentials |  | Useful for listing discovery, not catalog authority. |

## Raw Outputs

### gemma4:e4b raw

```text
| フーディン | カメックス | ラッキー |
| :---: | :---: | :---: |
| リザードン | ピビ | シャラドス |
| エビワラー | カイリオ | レアコイル |
```

### gemma4:e4b catalog-grounded

```text
slot | id | English / Japanese | confidence | no_rarity_status | condition_status
---|---|---|---|---|---
1 | PMCG1-049 | Alakazam / フーディン | high | candidate_not_verified | unknown
2 | PMCG1-032 | Blastoise / カメックス | high | candidate_not_verified | unknown
3 | PMCG1-068 | Chansey / ラッキー | high | candidate_not_verified | unknown
4 | PMCG1-021 | Charizard / リザードン | high | candidate_not_verified | unknown
5 | PMCG1-067 | Clefairy / ピッピ | high | candidate_not_verified | unknown
6 | PMCG1-034 | Gyarados / ギャラドス | high | candidate_not_verified | unknown
7 | PMCG1-058 | Hitmonchan / エビワラー | high | candidate_not_verified | unknown
8 | PMCG1-057 | Machamp / カイリキー | high | candidate_not_verified | unknown
9 | PMCG1-039 | Magneton / レアコイル | high | candidate_not_verified | unknown

The image contains a complete set of 9 cards matching the allowed catalog rows.
```

### gemma4:31b catalog-grounded

```text
1 | PMCG1-049 | Alakazam / フーディン | 1.0 | candidate_not_verified | unknown
2 | PMCG1-032 | Blastoise / カメックス | 1.0 | candidate_not_verified | unknown
3 | PMCG1-068 | Chansey / ラッキー | 1.0 | candidate_not_verified | unknown
4 | PMCG1-021 | Charizard / リザードン | 1.0 | candidate_not_verified | unknown
5 | PMCG1-067 | Clefairy / ピッピ | 1.0 | candidate_not_verified | unknown
6 | PMCG1-034 | Gyarados / ギャラドス | 1.0 | candidate_not_verified | unknown
7 | PMCG1-058 | Hitmonchan / エビワラー | 1.0 | candidate_not_verified | unknown
8 | PMCG1-057 | Machamp / カイリキー | 1.0 | candidate_not_verified | unknown
9 | PMCG1-039 | Magneton / レアコイル | 1.0 | candidate_not_verified | unknown

All 9 cards are correctly identified and mapped to the provided catalog.
```

### Scrydex Vision

```text
POST https://api.scrydex.com/vision/v1/cards/identify
Supports image_url or multipart file, game scoping, returns matches plus analysis.
Missing env: SCRYDEX_API_KEY, SCRYDEX_TEAM_ID
```

### GIBL predict-card

```text
POST https://gibltcg.com/api/v1/predict-card?key=...
Accepts file or image_url according to docs; returns set/name/variation candidates.
Missing env: GIBL_API_KEY
```

### TCGAPIs recognition

```text
Card-recognition endpoint behind paid/API access
Advertises top-10 product-id matches with confidence scores.
Missing env: TCGAPIS_API_KEY
```

### eBay Browse searchByImage

```text
POST /buy/browse/v1/item_summary/search_by_image
Useful for listing discovery, not catalog authority.
Missing env: EBAY_OAUTH_TOKEN
```

## External API Harness Notes

External card-recognition APIs are intentionally treated as witnesses. They may propose card identity, set, product id, variation, slab details, or listing matches. They may not promote No Rarity or condition without the required evidence packet.

Generated rough single-card crops are under `runs/recognition_api_compare_latest/crops/` for APIs that expect one card per request.