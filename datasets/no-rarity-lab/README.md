# No Rarity Lab Dataset

Generated: 2026-05-26T13:34:22Z

This dataset is a provenance-first foundry for a narrow No Rarity agent. It is
not a blanket training dump. Assets are labeled by rights posture and intended
use.

Raw asset binaries are intentionally not tracked in the public git repo. Keep
`assets/` local or in controlled storage unless a later review explicitly
promotes a specific file for public distribution. The manifests and catalog
metadata are the public, reviewable layer.

## Counts

```json
{
  "strict_booster_rows": 96,
  "catalog_total_rows_in_source": 102,
  "source_candidate_records": 1056,
  "asset_records": 128,
  "training_seed_examples": 101,
  "ebay_records": 1,
  "marketplace_scrape_records": 96,
  "marketplace_scrape_errors": 23,
  "download_errors": 0,
  "reference_download_requested": true,
  "marketplace_scrape_requested": true
}
```

## Rights Wall

- `training`: synthetic or otherwise clean enough for immediate model work.
- `training_candidate_after_user_confirmation`: local/user-supplied assets that
  need explicit human confirmation before being treated as model-training data.
- `reference_witness`: external source-labeled images that help agents compare
  and reason, but are not training data by default.
- `discovery_link_only`: URLs and query records that point agents toward market
  contact evidence without scraping or copying.
- `marketplace_contact_witness`: structured marketplace API records. Useful for
  comps and discovery; not training data by default.
- `marketplace_review_witness`: scraped marketplace thumbnails/assets placed in
  a human review queue; not training data unless explicitly promoted later.

## Protocol Boundary

The lab trains a model to say what it can know:
catalog candidate, visible lower-right corner status, trap risk, and the next
evidence request. It does not train the model to authenticate, grade condition,
or prove seller possession from weak photos.
