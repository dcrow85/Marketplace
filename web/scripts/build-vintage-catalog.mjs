import { mkdir, readFile, writeFile } from 'node:fs/promises'

const rootUrl = new URL('../../', import.meta.url)
const sourceUrl = new URL('../public/catalog-sample.json', import.meta.url)
const relationshipsUrl = new URL('../../data/vintage-printing-relationships.json', import.meta.url)
const historyUrl = new URL('../../data/vintage-card-history.json', import.meta.url)
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
const history = JSON.parse(await readFile(historyUrl, 'utf8'))
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
const historyByUid = new Map()
for (const entry of history.entries || []) {
  if (!entry.uid || !entry.headline || !entry.summary || !(entry.source_refs || []).length || !(entry.not_claiming || []).length) {
    throw new Error(`Vintage history entry is incomplete: ${entry.uid || 'missing uid'}`)
  }
  if (historyByUid.has(entry.uid)) throw new Error(`Vintage history entry is duplicated: ${entry.uid}`)
  historyByUid.set(entry.uid, entry)
}
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

const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim()
const isWebUrl = (value) => /^https?:\/\//i.test(cleanText(value))
const displayDate = (value = '') => {
  const parts = cleanText(value).split('/')
  const format = (part) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) return part
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${part}T00:00:00Z`))
  }
  return parts.map(format).join(' through ')
}
const releaseKind = (releaseType = '') => {
  const type = cleanText(releaseType).toLowerCase()
  if (type.includes('promo') || type.includes('campaign') || type.includes('prize')) return 'Promotional release'
  if (type.includes('deck') || type.includes('starter') || type.includes('gift_pack')) return 'Preconstructed product'
  if (type.includes('vending')) return 'Vending-series release'
  if (type.includes('sample')) return 'Sample release'
  if (type.includes('jumbo')) return 'Oversize-card release'
  if (type.includes('special') || type.includes('mini_set')) return 'Special collection'
  if (type.includes('web')) return 'Web-series release'
  if (type.includes('expansion')) return 'Expansion'
  return 'Catalogue release'
}
const releaseHeadline = (label, kind) => {
  if (kind === 'Promotional release') return `How ${label} reached collectors`
  if (kind === 'Preconstructed product') return `A card from ${label}`
  if (kind === 'Vending-series release') return `From the ${label} vending series`
  if (kind === 'Sample release') return `A sample printing from ${label}`
  if (kind === 'Oversize-card release') return `An oversize printing from ${label}`
  if (kind === 'Special collection') return `Part of the ${label} collection`
  if (kind === 'Web-series release') return `Part of the ${label} release`
  if (kind === 'Expansion') return `Part of the ${label} expansion`
  return `A printing from ${label}`
}
const researchSourceUrl = (source = {}) => [
  source.source_page_url,
  source.set_api_url,
  source.card_api_url,
  source.cards_api_url,
  source.oldid_url,
  ...(source.supporting_page_urls || []),
  source.docs_url,
].find(isWebUrl) || ''
const releaseSourceRefs = (release, corpus) => {
  const normalizeSources = (sources, suffix) => sources.filter(Boolean).map((source) => ({
    source: `${cleanText(source.source) || corpus.id}${suffix}`,
    source_page_url: researchSourceUrl(source),
    authority: cleanText(source.authority)
      || 'Release identity, date, and catalogue-row context from the named source.',
  })).filter((source) => isWebUrl(source.source_page_url))
  const releaseCandidates = normalizeSources(release.payload.sources || [], ' · release')
  const cardCandidates = normalizeSources(
    (release.payload.cards || []).flatMap((row) => [
      ...(row.source_contacts || []),
      row.image_provenance?.source_page_url ? {
        source: row.image_provenance.source || corpus.id,
        source_page_url: row.image_provenance.source_page_url,
      } : null,
    ]),
    ' · source record',
  )
  const candidates = releaseCandidates.length ? releaseCandidates : cardCandidates
  return candidates.filter((source, index, all) => (
    all.findIndex((candidate) => candidate.source_page_url === source.source_page_url) === index
  )).slice(0, 2)
}
const releaseResearch = (release, corpus, releaseLabel) => {
  const meta = release.payload.release || {}
  const type = meta.release_type || release.entry.release_type || ''
  const kind = releaseKind(type)
  const releaseDate = meta.release_date || release.entry.release_date || ''
  const rowCount = (release.payload.cards || []).length
  const promoContexts = (release.payload.cards || []).map((row) => row.promo_context).filter(Boolean)
  const distribution = cleanText(promoContexts.find((promo) => promo.distribution_comment)?.distribution_comment)
    || cleanText(promoContexts.find((promo) => promo.date_label)?.date_label)
    || kind
  const sources = releaseSourceRefs(release, corpus)
  const dateClause = releaseDate ? ` The release record dates it to ${displayDate(releaseDate)}.` : ''
  const scopeClause = rowCount === 1
    ? 'This source models one card record for the release.'
    : `This source models ${rowCount} card records for the release.`
  return {
    scope: 'release_and_card_record',
    confidence: sources.length ? 'source_recorded' : 'catalogue_recorded',
    collection_label: releaseLabel,
    release_kind: kind,
    headline: releaseHeadline(releaseLabel, kind),
    summary: `This ${corpus.language} printing is catalogued as part of ${releaseLabel}.${dateClause} ${scopeClause}`,
    history_note: distribution !== kind
      ? `The source associates this card with ${distribution}.`
      : '',
    release_date: releaseDate,
    distribution_label: distribution,
    release_row_count: rowCount,
    source_refs: sources,
    not_claiming: [
      'that shared release history proves the origin of a loose physical copy',
      'seller possession',
      'authenticity',
      'condition',
      'grade',
    ],
  }
}

let approvedDisplayImages = 0
let referenceOnlyImages = 0
let missingImages = 0
let usedLegacyCards = 0
const researchBySetId = new Map()

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
  const historicalContext = historyByUid.get(row.row_id) || historyByUid.get(uid) || null
  if (!researchBySetId.has(row.release_family_id)) {
    researchBySetId.set(row.release_family_id, releaseResearch(release, corpus, releaseLabel))
  }
  const illustrator = row.illustrator?.display || row.illustrator?.name || provider.artist || provider.illustrator || legacy?.illustrator || ''
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
    illustrator,
    illustrator_status: illustrator ? 'source_recorded' : 'not_recorded_in_current_sources',
    release_family_label: releaseLabel,
    release_date: row.product_scope?.release_date || setMeta.release_date || release.entry.release_date || '',
    release_type: row.product_scope?.release_type || setMeta.release_type || '',
    promo_context: row.promo_context || legacy?.promo_context || null,
    collector_context: row.collector_texture
      ? {
          note: row.collector_texture.note || '',
          authority: row.collector_texture.authority || '',
          signals: row.collector_texture.signals || [],
        }
      : legacy?.collector_context || null,
    symbol_context: row.symbol_status
      ? {
          confidence: row.symbol_status.confidence || '',
          prints_without_rarity_symbol: row.symbol_status.prints_without_rarity_symbol || '',
          scope: row.symbol_status.scope || '',
          not_claiming: row.symbol_status.not_claiming || [],
        }
      : legacy?.symbol_context || null,
    historical_context: historicalContext,
    research_context_id: row.release_family_id,
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
for (const uid of historyByUid.keys()) {
  if (!uniqueUids.has(uid) && !uniqueCanonicalRows.has(uid)) {
    throw new Error(`Vintage history entry points to an unknown row: ${uid}`)
  }
}
const researchedCards = cards.filter((card) => (
  researchBySetId.get(card.research_context_id)?.headline
  && researchBySetId.get(card.research_context_id)?.summary
  && researchBySetId.get(card.research_context_id)?.scope
  && (researchBySetId.get(card.research_context_id)?.source_refs || []).length
  && (researchBySetId.get(card.research_context_id)?.not_claiming || []).length
)).length
if (researchedCards !== cards.length) {
  const missing = cards.filter((card) => !(researchBySetId.get(card.research_context_id)?.source_refs || []).length)
    .map((card) => card.canonical_row_id)
    .slice(0, 12)
  throw new Error(`Vintage research coverage incomplete: ${researchedCards}/${cards.length} card rows; missing ${missing.join(', ')}`)
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
    research_context: researchBySetId.get(meta.release_family_id || release.entry.release_family_id) || null,
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
    curated_history_entries: historyByUid.size,
    researched_card_rows: researchedCards,
    researched_release_families: new Set(cards.map((card) => card.set_id)).size,
    artist_recorded_rows: cards.filter((card) => card.illustrator_status === 'source_recorded').length,
    artist_unknown_rows: cards.filter((card) => card.illustrator_status !== 'source_recorded').length,
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
  history_policy: history.policy,
  research_policy: {
    coverage: 'Every card inherits source-linked release context and keeps card-specific facts separate.',
    card_specific_claims: 'Artist, number, language, species, rules, and variant fields come from the individual catalogue row when recorded.',
    release_claims: 'Release history is shared context. It does not prove how a loose seller copy was acquired.',
    unknowns: 'Missing artist or release details remain visibly not recorded; they are never inferred from another printing.',
  },
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
