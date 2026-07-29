import { mkdir, readFile, writeFile } from 'node:fs/promises'

const rootUrl = new URL('../../', import.meta.url)
const sourceUrl = new URL('../public/catalog-sample.json', import.meta.url)
const relationshipsUrl = new URL('../../data/vintage-printing-relationships.json', import.meta.url)
const outputUrl = new URL('../public/catalogs/vintage-pokemon.json', import.meta.url)

const corpusConfigs = [
  { id: 'japanese-pre-english', manifest: 'data/japanese-pre-english/manifest.json', language: 'Japanese', languageCode: 'ja' },
  { id: 'english-wotc', manifest: 'data/english-wotc/manifest.json', language: 'English', languageCode: 'en' },
  { id: 'japanese-classic', manifest: 'data/japanese-classic/manifest.json', language: 'Japanese', languageCode: 'ja' },
  { id: 'japanese-classic-decks', manifest: 'data/japanese-classic-decks/manifest.json', language: 'Japanese', languageCode: 'ja' },
  { id: 'japanese-vintage-supplemental', manifest: 'data/japanese-vintage-supplemental/manifest.json', language: 'Japanese', languageCode: 'ja' },
  { id: 'japanese-adv-pre-wotc', manifest: 'data/japanese-adv-pre-wotc/manifest.json', language: 'Japanese', languageCode: 'ja' },
  { id: 'japanese-promo-wotc', manifest: 'data/japanese-promo-wotc/manifest.json', language: 'Japanese', languageCode: 'ja' },
  { id: 'japanese-unnumbered-promo-wotc', manifest: 'data/japanese-unnumbered-promo-wotc/manifest.json', language: 'Japanese', languageCode: 'ja' },
  { id: 'english-supplemental-wotc', manifest: 'data/english-supplemental-wotc/manifest.json', language: 'English', languageCode: 'en' },
]

const source = JSON.parse(await readFile(sourceUrl, 'utf8'))
const relationships = JSON.parse(await readFile(relationshipsUrl, 'utf8'))
const corpora = await Promise.all(corpusConfigs.map(async (config) => {
  const manifest = JSON.parse(await readFile(new URL(config.manifest, rootUrl), 'utf8'))
  const releases = await Promise.all((manifest.releases || []).map(async (entry) => ({
    entry,
    payload: JSON.parse(await readFile(new URL(entry.path, rootUrl), 'utf8')),
  })))
  return { ...config, manifest, releases }
}))

const accountFields = new Set([
  'owned', 'cond', 'custody', 'stance', 'want_cond', 'want_max', 'sell',
  'trade', 'grail', 'display', 'extra', 'copies', 'scanned', 'pile',
  'photo_hash', 'cond_type', 'cond_grade', 'cond_grader',
])
const cleanLegacy = (card) => Object.fromEntries(
  Object.entries(card).filter(([key]) => !accountFields.has(key)),
)
const legacyCards = new Map((source.cards || []).map((card) => [card.uid, cleanLegacy(card)]))
const legacySetLabels = new Map((source.sets || []).map((set) => [set.id, set.label]))
const relationshipByUid = new Map()
const displayOverrides = new Map()
for (const relationship of relationships.relationships || []) {
  for (const uid of relationship.members || []) {
    const siblings = (relationship.members || []).filter((candidate) => candidate !== uid)
    relationshipByUid.set(uid, [...(relationshipByUid.get(uid) || []), {
      id: relationship.id,
      relationship_type: relationship.relationship_type,
      confidence: relationship.confidence,
      artwork_relationship: relationship.artwork_relationship,
      label: relationship.label,
      related_uids: siblings,
      source_refs: relationship.source_refs || [],
      not_claiming: relationship.not_claiming || [],
    }])
  }
  for (const [uid, override] of Object.entries(relationship.display_overrides || {})) {
    displayOverrides.set(uid, { ...(displayOverrides.get(uid) || {}), ...override })
  }
}

let approvedDisplayImages = 0
let referenceOnlyImages = 0
let missingImages = 0
let usedLegacyCards = 0

const effectsFrom = (row) => {
  const profile = row.pokemon_profile || {}
  const abilities = (profile.abilities || []).map((ability) => ({
    label: ability.name || 'Ability',
    text: ability.text || ability.effect || '',
  }))
  const attacks = (profile.attacks || []).map((attack) => ({
    label: attack.name || 'Attack',
    text: [attack.damage, attack.text || attack.effect].filter((value) => value !== '' && value != null).join(' · '),
  }))
  return [...abilities, ...attacks]
}

const legacyFor = (row) => {
  const aliases = [row.row_id, row.tcgdex?.id, row.pokemon_tcg_api?.id].filter(Boolean)
  for (const alias of aliases) {
    const legacy = legacyCards.get(alias)
    if (legacy) return legacy
  }
  return null
}

const normalizeRow = (row, release, corpus) => {
  const legacy = legacyFor(row)
  if (legacy) usedLegacyCards += 1
  const profile = row.pokemon_profile || {}
  const provider = row.provider_row || {}
  const provenance = row.image_provenance || {}
  const image = legacy?.image || provenance.image_large || provenance.image_small || ''
  const imageDisplayAllowed = legacy?.display_allowed ?? provenance.display_allowed
  const referenceOnly = !!image && imageDisplayAllowed === false
  if (image) {
    if (referenceOnly) referenceOnlyImages += 1
    else approvedDisplayImages += 1
  } else {
    missingImages += 1
  }
  const uid = legacy?.uid || row.row_id
  const override = displayOverrides.get(row.row_id) || displayOverrides.get(uid) || {}
  const setMeta = release.payload.release || {}
  const releaseLabel = setMeta.name_en
    || setMeta.name_en_context
    || row.product_scope?.english_context_name
    || legacy?.release_family_label
    || legacySetLabels.get(legacy?.set_id)
    || setMeta.name_ja
    || 'Vintage Pokémon'
  const sourceContact = (row.source_contacts || [])[0] || {}
  const sourceAuthority = provenance.source || sourceContact.source || corpus.id
  const displayName = override.name_en || legacy?.name_en || row.name_en || row.name_ja || row.row_id
  const japaneseName = override.name_ja || legacy?.name_ja || row.name_ja || ''
  return {
    ...(legacy || {}),
    uid,
    row_id: row.row_id,
    canonical_row_id: row.row_id,
    provider_id: provenance.provider_id || provider.id || provider.provider_id || row.local_id,
    card_id: row.local_id,
    set_id: row.release_family_id,
    num: row.card_number || legacy?.num || row.local_id,
    name_en: displayName,
    name_ja: japaneseName,
    romaji: legacy?.romaji || row.romaji || '',
    name_is_en: corpus.languageCode === 'en',
    name_ja_status: override.name_ja_status || row.name_ja_status || '',
    language: corpus.language,
    language_code: corpus.languageCode,
    category: row.category === 'Pokémon' ? 'Pokemon' : row.category,
    types: profile.types || legacy?.types || [],
    subtypes: row.subtypes || legacy?.subtypes || [],
    element: (profile.types || legacy?.types || [])[0] || legacy?.element || '',
    holo: !!row.holo_source,
    rarity: row.rarity_source || legacy?.rarity || '',
    image: image || null,
    image_status: provenance.status || legacy?.image_status || 'source_payload_without_image',
    display_allowed: image ? imageDisplayAllowed !== false : false,
    image_reference_only: referenceOnly,
    provenance: image
      ? 'External catalogue reference; not seller evidence.'
      : 'Catalogue identity row; no row-specific reference image is recorded.',
    source_authority: sourceAuthority,
    source_page_url: provenance.source_page_url || sourceContact.source_page_url || '',
    illustrator: row.illustrator?.display || row.illustrator?.name || provider.artist || provider.illustrator || legacy?.illustrator || '',
    release_family_label: releaseLabel,
    release_date: row.product_scope?.release_date || setMeta.release_date || release.entry.release_date || '',
    release_type: row.product_scope?.release_type || setMeta.release_type || '',
    health: profile.hp ?? legacy?.health ?? '',
    attack: (profile.attacks || []).map((attack) => attack.name).filter(Boolean).join(' · ') || legacy?.attack || '',
    effects: effectsFrom(row).length ? effectsFrom(row) : legacy?.effects || [],
    flavor_text: provider.flavorText || legacy?.flavor_text || '',
    dex_ids: profile.dex_id || profile.dexId || provider.nationalPokedexNumbers || [],
    special_identification_instructions: row.special_identification_instructions || [],
    source_contacts: row.source_contacts || [],
    printing_relationships: relationshipByUid.get(row.row_id) || relationshipByUid.get(uid) || [],
    catalog_hash: release.entry.catalog_hash || '',
    not_claiming: row.not_claiming || [
      'seller possession', 'authenticity', 'condition truth', 'price truth',
    ],
  }
}

const cards = corpora.flatMap((corpus) => corpus.releases.flatMap((release) => (
  (release.payload.cards || []).map((row) => normalizeRow(row, release, corpus))
)))
const uniqueUids = new Set(cards.map((card) => card.uid))
const uniqueCanonicalRows = new Set(cards.map((card) => card.canonical_row_id))
if (uniqueUids.size !== cards.length) {
  throw new Error(`Vintage catalogue UID collision: ${cards.length - uniqueUids.size} duplicate row(s)`)
}
if (uniqueCanonicalRows.size !== cards.length) {
  throw new Error(`Vintage catalogue canonical-row collision: ${cards.length - uniqueCanonicalRows.size} duplicate row(s)`)
}

const sets = corpora.flatMap((corpus) => corpus.releases.map((release) => {
  const meta = release.payload.release || {}
  return {
    id: meta.release_family_id || release.entry.release_family_id,
    label: meta.name_en || meta.name_en_context || meta.name_ja || release.entry.release_family_id,
    label_ja: meta.name_ja || '',
    code: String(meta.tcgdex_set_id || release.entry.api_set_id || '').toUpperCase(),
    date: meta.release_date || release.entry.release_date || '',
    year: Number(String(meta.release_date || release.entry.release_date || '').slice(0, 4)) || null,
    release_type: meta.release_type || release.entry.release_type || '',
    language: corpus.language,
    language_code: corpus.languageCode,
    source: (release.payload.sources || [])[0]?.source || corpus.id,
    source_url: (release.payload.sources || [])[0]?.source_page_url || release.entry.source_url || '',
    count: (release.payload.cards || []).length,
    catalog_hash: release.entry.catalog_hash || '',
    policy: 'external_reference',
    exact_rows: 0,
    ref_rows: (release.payload.cards || []).length,
  }
})).sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))
  || String(a.language || '').localeCompare(String(b.language || ''))
  || String(a.label || '').localeCompare(String(b.label || '')))
  .map((set, order) => ({ ...set, order }))

const japaneseCards = cards.filter((card) => card.language_code === 'ja').length
const englishCards = cards.filter((card) => card.language_code === 'en').length
const payload = {
  ...source,
  title: 'Vintage Pokémon catalogue',
  catalog_id: 'japanese-pre-english',
  scope_note: 'Japanese vintage and English Wizards-era Pokémon printings through the May 2003 boundary. Catalogue artwork is a reference—not seller evidence, image-rights approval, authentication, condition, or proof of a physical card.',
  manifest_total_rows: cards.length,
  sets,
  summary: {
    ...(source.summary || {}),
    sets: sets.length,
    cards: cards.length,
    with_image: approvedDisplayImages + referenceOnlyImages,
    japanese_cards: japaneseCards,
    english_wotc_cards: englishCards,
    languages: 2,
    verified_printing_relationships: (relationships.relationships || []).length,
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
  source_catalogs: corpora.map((corpus) => ({
    id: corpus.id,
    language: corpus.language,
    cards: corpus.releases.reduce((sum, release) => sum + (release.payload.cards || []).length, 0),
    sets: corpus.releases.length,
  })),
  relationship_policy: relationships.relationship_policy,
  ui_summary: {
    cards: cards.length,
    sets: sets.length,
    japanese_cards: japaneseCards,
    english_wotc_cards: englishCards,
    rendered_reference_images: approvedDisplayImages + referenceOnlyImages,
    approved_display_images: approvedDisplayImages,
    reference_only_images: referenceOnlyImages,
    missing_images: missingImages,
    legacy_rows_preserved: usedLegacyCards,
  },
  cards,
}

await mkdir(new URL('../public/catalogs/', import.meta.url), { recursive: true })
await writeFile(outputUrl, `${JSON.stringify(payload)}\n`)
console.log(`Vintage Pokémon: ${cards.length} cards (${japaneseCards} Japanese + ${englishCards} English), ${sets.length} releases, ${approvedDisplayImages + referenceOnlyImages} catalogue-reference images, ${missingImages} without images, ${(relationships.relationships || []).length} verified printing relationships.`)
