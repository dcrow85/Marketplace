import { mkdir, readFile, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('../public/catalog-sample.json', import.meta.url)
const englishManifestUrl = new URL('../../data/english-wotc/manifest.json', import.meta.url)
const outputUrl = new URL('../public/catalogs/vintage-pokemon.json', import.meta.url)
const source = JSON.parse(await readFile(sourceUrl, 'utf8'))
const englishManifest = JSON.parse(await readFile(englishManifestUrl, 'utf8'))
const englishReleases = await Promise.all((englishManifest.releases || []).map(async (entry) => ({
  entry,
  payload: JSON.parse(await readFile(new URL(`../../${entry.path}`, import.meta.url), 'utf8')),
})))

// These fields belonged to the original UI demo, not to the catalogue record.
// Removing them ensures a collector enters the restored room with an empty binder.
const accountFields = new Set([
  'owned',
  'cond',
  'custody',
  'stance',
  'want_cond',
  'want_max',
  'sell',
  'trade',
  'grail',
  'display',
  'extra',
  'copies',
  'scanned',
  'pile',
  'photo_hash',
  'cond_type',
  'cond_grade',
  'cond_grader',
])

let approvedDisplayImages = 0
let referenceOnlyImages = 0
let missingImages = 0
const setLabels = new Map((source.sets || []).map((set) => [set.id, set.label]))
const japaneseCards = (source.cards || []).map((card) => {
  const clean = Object.fromEntries(
    Object.entries(card).filter(([key]) => !accountFields.has(key)),
  )
  clean.release_family_label = clean.release_family_label || setLabels.get(clean.set_id) || 'Vintage Pokémon'
  clean.language = 'Japanese'
  clean.language_code = 'ja'
  if (clean.image) {
    if (clean.display_allowed === false) {
      // Keep the catalogue witness available to the interface without changing
      // the source row's authority. The UI labels these images as references;
      // they remain explicitly outside seller evidence, condition, and proof.
      clean.image_reference_only = true
      referenceOnlyImages += 1
    } else {
      approvedDisplayImages += 1
    }
  } else {
    missingImages += 1
  }
  return clean
})

const englishCards = englishReleases.flatMap(({ payload }) => (payload.cards || []).map((row) => {
  const profile = row.pokemon_profile || {}
  const provider = row.provider_row || {}
  const image = row.image_provenance?.image_large || row.image_provenance?.image_small || ''
  const abilities = (profile.abilities || []).map((ability) => ({
    label: ability.name || 'Ability',
    text: ability.text || '',
  }))
  const attacks = (profile.attacks || []).map((attack) => ({
    label: attack.name || 'Attack',
    text: [attack.damage, attack.text].filter(Boolean).join(' · '),
  }))
  if (image) referenceOnlyImages += 1
  else missingImages += 1
  return {
    uid: row.row_id,
    row_id: row.row_id,
    provider_id: row.local_id,
    card_id: row.local_id,
    set_id: row.release_family_id,
    num: row.card_number,
    name_en: row.name_en,
    name_ja: '',
    romaji: '',
    name_is_en: true,
    name_ja_status: row.name_ja_status,
    language: 'English',
    language_code: 'en',
    category: row.category === 'Pokémon' ? 'Pokemon' : row.category,
    types: profile.types || [],
    subtypes: row.subtypes || [],
    element: (profile.types || [])[0] || '',
    holo: !!row.holo_source,
    rarity: row.rarity_source || '',
    image: image || null,
    image_status: row.image_provenance?.status || 'external_api_reference_image',
    display_allowed: false,
    image_reference_only: !!image,
    provenance: 'External Pokémon TCG API catalogue reference; not seller evidence.',
    source_authority: 'Pokemon TCG API v2',
    source_page_url: row.image_provenance?.source_page_url || row.pokemon_tcg_api?.url || '',
    illustrator: row.illustrator?.name || provider.artist || '',
    release_family_label: row.product_scope?.english_set_name || provider.set?.name || 'English WotC',
    release_date: row.product_scope?.release_date || '',
    health: profile.hp || '',
    attack: (profile.attacks || []).map((attack) => attack.name).filter(Boolean).join(' · '),
    effects: [...abilities, ...attacks],
    flavor_text: provider.flavorText || '',
    catalog_hash: englishManifest.releases.find((release) => release.release_family_id === row.release_family_id)?.catalog_hash || '',
    not_claiming: row.not_claiming || [
      'seller possession',
      'authenticity',
      'condition truth',
      'price truth',
    ],
  }
}))

const sets = [
  ...(source.sets || []).map((set) => ({ ...set, language: 'Japanese', language_code: 'ja' })),
  ...englishReleases.map(({ entry, payload }) => ({
    id: entry.release_family_id,
    label: payload.release?.name_en || entry.release_family_id,
    code: String(entry.api_set_id || '').toUpperCase(),
    date: entry.release_date,
    year: Number(String(entry.release_date || '').slice(0, 4)) || null,
    language: 'English',
    language_code: 'en',
    source: 'Pokemon TCG API v2',
    source_url: entry.source_url,
    count: entry.row_count,
    catalog_hash: entry.catalog_hash,
    policy: 'external_reference',
    exact_rows: 0,
    ref_rows: entry.row_count,
  })),
].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))
  || String(a.language || '').localeCompare(String(b.language || ''))
  || String(a.label || '').localeCompare(String(b.label || '')))
  .map((set, order) => ({ ...set, order }))

const cards = [...japaneseCards, ...englishCards]
const uniqueUids = new Set(cards.map((card) => card.uid))
if (uniqueUids.size !== cards.length) {
  throw new Error(`Vintage catalogue UID collision: ${cards.length - uniqueUids.size} duplicate row(s)`)
}

const payload = {
  ...source,
  title: 'Vintage Pokémon catalogue',
  catalog_id: 'japanese-pre-english',
  scope_note: 'Japanese vintage and English Wizards-era Pokémon printings through Skyridge. Catalogue artwork is a reference—not seller evidence, image-rights approval, authentication, condition, or proof of a physical card.',
  manifest_total_rows: cards.length,
  sets,
  summary: {
    ...(source.summary || {}),
    sets: sets.length,
    cards: cards.length,
    with_image: approvedDisplayImages + referenceOnlyImages,
    japanese_cards: japaneseCards.length,
    english_wotc_cards: englishCards.length,
    languages: 2,
  },
  ui: {
    ...(source.ui || {}),
    holo_label: '✦ Holo',
    language_chips: [
      { label: 'Japanese', value: 'Japanese' },
      { label: 'English WotC', value: 'English' },
    ],
    category_chips: ['Pokemon', 'Trainer', 'Energy'],
    element_chips: ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Colorless'],
  },
  source_catalogs: [
    { id: 'japanese-pre-english', language: 'Japanese', cards: japaneseCards.length, sets: (source.sets || []).length },
    { id: 'english-wotc', language: 'English', cards: englishCards.length, sets: englishManifest.release_count },
  ],
  ui_summary: {
    cards: cards.length,
    sets: sets.length,
    japanese_cards: japaneseCards.length,
    english_wotc_cards: englishCards.length,
    rendered_reference_images: approvedDisplayImages + referenceOnlyImages,
    approved_display_images: approvedDisplayImages,
    reference_only_images: referenceOnlyImages,
    missing_images: missingImages,
  },
  cards,
}

await mkdir(new URL('../public/catalogs/', import.meta.url), { recursive: true })
await writeFile(outputUrl, `${JSON.stringify(payload)}\n`)
console.log(`Vintage Pokémon: ${cards.length} cards (${japaneseCards.length} Japanese + ${englishCards.length} English WotC), ${sets.length} sets, ${approvedDisplayImages + referenceOnlyImages} catalogue-reference images, ${missingImages} without images.`)
