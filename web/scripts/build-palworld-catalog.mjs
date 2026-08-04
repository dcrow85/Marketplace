import { createHash } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'

const root = new URL('../../', import.meta.url)
const sourceUrl = new URL('../../data/palworld/palify-cards-2026-08-04.json', import.meta.url)
const policyUrl = new URL('../../data/palworld/palify-source-policy.json', import.meta.url)
const productsUrl = new URL('../../data/palworld/palworld-products-2026-08-04.json', import.meta.url)
const assetManifestUrl = new URL('../../data/palworld/palify-assets-2026-08-04.json', import.meta.url)
const outputUrl = new URL('../public/catalogs/palworld-ocg.json', import.meta.url)

const source = JSON.parse(await readFile(sourceUrl, 'utf8'))
const policy = JSON.parse(await readFile(policyUrl, 'utf8'))
const productsSource = JSON.parse(await readFile(productsUrl, 'utf8'))
const assetManifest = JSON.parse(await readFile(assetManifestUrl, 'utf8'))
const cards = Array.isArray(source.cards) ? source.cards : []
const products = Array.isArray(productsSource.products) ? productsSource.products : []
const text = (value) => String(value || '').replace(/\s+/g, ' ').trim()
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const assetsByUpstreamPath = new Map((assetManifest.assets || []).map((asset) => [asset.upstream_path, asset]))
const assetFor = (path) => {
  if (!path) return null
  const asset = assetsByUpstreamPath.get(path)
  if (!asset) throw new Error(`Palify asset is missing from the local manifest: ${path}`)
  return asset
}
const releaseType = (code) => code === 'BP01' ? 'booster' : code.startsWith('TD') ? 'starter_deck' : code === 'PR' ? 'promo' : 'source_recorded'
const releaseLabel = (code) => code === 'BP01' ? 'Booster Pack' : code.startsWith('TD') ? 'Starter Deck' : code === 'PR' ? 'Promotional cards' : 'Source-recorded release'
const releaseFamily = (code) => text(code).toLowerCase()
const productChannel = (code) => code === 'BP01' ? 'booster' : code.startsWith('TD') ? `starter_deck_${code.slice(2)}` : code === 'PR' ? 'promo' : 'source_recorded'
const productChannelLabel = (code) => code === 'BP01' ? 'Booster' : code.startsWith('TD') ? `Starter Deck ${code.slice(2)}` : code === 'PR' ? 'Promo' : 'Source-recorded product'

if (!Number.isInteger(source.count) || source.count !== cards.length) {
  throw new Error(`Palify snapshot count mismatch: declared ${source.count}, found ${cards.length}`)
}
if (!cards.length) throw new Error('Palify snapshot contains no cards')

const expectedImagePaths = new Set([...cards.flatMap((card) => [card.image, ...(card.printings || []).map((printing) => printing.image)]), ...products.map((product) => product.image)].filter(Boolean))
if (expectedImagePaths.size !== assetsByUpstreamPath.size) {
  throw new Error(`Palify local asset coverage mismatch: expected ${expectedImagePaths.size}, found ${assetsByUpstreamPath.size}`)
}
await Promise.all([...assetsByUpstreamPath.values()].map((asset) => access(new URL(`../public/${asset.local_path}`, import.meta.url))))

const seenUids = new Set()
const catalogueCards = cards.map((card) => {
  const slug = text(card.slug)
  const code = text(card.code)
  if (!slug || !code || !text(card.name) || !text(card.setCode) || !text(card.set)) {
    throw new Error(`Palify card lacks identity fields: ${JSON.stringify({ slug, code, name: card.name, setCode: card.setCode, set: card.set })}`)
  }
  const uid = `palify:${slug}`
  if (seenUids.has(uid)) throw new Error(`Palify catalogue UID collision: ${uid}`)
  seenUids.add(uid)
  const printings = (card.printings || []).map((printing) => {
    const printingAsset = assetFor(printing.image)
    return {
      code: text(printing.code),
      rarity: text(printing.rarity),
      variant: Boolean(printing.variant),
      image: printingAsset?.local_path || '',
      image_asset_sha256: printingAsset?.sha256 || '',
      image_asset_bytes: printingAsset?.bytes || 0,
      upstream_image_url: printingAsset?.upstream_url || '',
    }
  }).filter((printing) => printing.code)
  const primaryAsset = assetFor(card.image)
  const hasAlternatePrinting = printings.some((printing) => printing.variant)
  return {
    uid,
    row_id: uid,
    canonical_row_id: uid,
    card_id: code,
    catalog_profile: policy.catalog_id,
    set_id: `palify_${text(card.setCode).toLowerCase()}`,
    source_set_label: text(card.set),
    release_family: releaseFamily(text(card.setCode)),
    release_family_label: text(card.set),
    release_type: releaseType(text(card.setCode)),
    product_channel: productChannel(text(card.setCode)),
    product_channel_label: productChannelLabel(text(card.setCode)),
    num: code,
    name_en: text(card.name),
    name_ja: text(card.nameJp),
    name_is_en: true,
    name_ja_status: card.nameJp ? 'source_labeled' : 'not_recorded_by_source',
    language: 'English and Japanese text recorded by Palify',
    language_code: 'en-ja',
    category: text(card.type),
    subtypes: [text(card.subtype)].filter(Boolean),
    types: [text(card.type), text(card.subtype)].filter(Boolean),
    element: text(card.color),
    rarity: text(card.rarity),
    image: primaryAsset?.local_path || '',
    image_status: primaryAsset ? 'palify_authorized_local_catalogue_reference' : 'not_recorded_by_source',
    image_reference_only: true,
    display_allowed: Boolean(card.image),
    image_hosting: primaryAsset ? 'cairn_public_asset' : 'none',
    image_asset_sha256: primaryAsset?.sha256 || '',
    image_asset_bytes: primaryAsset?.bytes || 0,
    upstream_image_url: primaryAsset?.upstream_url || '',
    provenance: 'Palify catalogue record and authorized card-image reference; not seller evidence or physical-card proof.',
    source_authority: 'Palify hand-checked catalogue API',
    source_page_url: `https://palify.org/cards/${slug}`,
    source_api_url: policy.source_api,
    source_snapshot: policy.snapshot,
    source_snapshot_hash: hash(card),
    color: text(card.color),
    cost: card.cost ?? null,
    power: card.power ?? null,
    strike: card.strike ?? null,
    durability: card.durability ?? null,
    work_suitability: text(card.workSuitability),
    lucky: Boolean(card.lucky),
    effect: text(card.effect),
    effect_jp: text(card.effectJp),
    flavor_text: text(card.flavor),
    errata: text(card.errata),
    landscape: Boolean(card.landscape),
    holo: hasAlternatePrinting,
    star_alt: hasAlternatePrinting,
    has_alternate_printing: hasAlternatePrinting,
    game: card.game || {},
    printings,
    research_context: {
      scope: 'source_catalogue_record',
      confidence: 'source_recorded',
      collection_label: text(card.set),
      release_kind: releaseLabel(text(card.setCode)),
      headline: `A ${text(card.set)} catalogue record`,
      summary: `${text(card.name)} is recorded by Palify as ${code} in ${text(card.set)}.`,
      release_row_count: cards.filter((candidate) => candidate.setCode === card.setCode).length,
      source_refs: [{ source: 'Palify · API snapshot', source_page_url: policy.source_page, authority: 'Card identity, text, attributes, printings, and authorized catalogue-reference asset path.' }],
      not_claiming: policy.not_claiming,
    },
    source_contacts: [{ source: 'Palify · card API', source_page_url: policy.source_api, authority: 'Cached source API record.' }],
    not_claiming: policy.not_claiming,
  }
})

const setCards = new Map()
for (const card of cards) setCards.set(card.setCode, [...(setCards.get(card.setCode) || []), card])
const sets = [...setCards.entries()].map(([code, rows], order) => ({
  id: `palify_${code.toLowerCase()}`,
  label: text(rows[0].set),
  code,
  release_family: releaseFamily(code),
  release_family_label: text(rows[0].set),
  release_type: releaseType(code),
  product_channel: productChannel(code),
  product_channel_label: productChannelLabel(code),
  source: 'Palify hand-checked catalogue API',
  source_url: policy.source_page,
  count: rows.length,
  catalog_hash: hash(rows),
  policy: 'authorized_local_reference',
  order,
}))

const setsByCode = new Map(sets.map((set) => [set.code, set]))
const catalogueProducts = products.map((product) => {
  const code = text(product.code)
  const setCode = text(product.set_code)
  const set = setsByCode.get(setCode)
  const productAsset = assetFor(product.image)
  if (!code || !set || !text(product.name) || !text(product.product_type) || !productAsset) {
    throw new Error(`Palworld product lacks catalogue identity: ${JSON.stringify({ code, setCode, name: product.name, productType: product.product_type })}`)
  }
  const uid = `palify-product:${text(product.id)}`
  return {
    uid,
    row_id: uid,
    canonical_row_id: uid,
    card_id: code,
    catalog_profile: policy.catalog_id,
    catalog_item_kind: 'sealed_product',
    sealed: true,
    product_type: text(product.product_type),
    product_type_label: text(product.product_type_label),
    set_id: set.id,
    source_set_label: set.label,
    release_family: set.release_family,
    release_family_label: set.release_family_label,
    release_type: set.release_type,
    release_date: text(product.release_date),
    product_channel: set.product_channel,
    product_channel_label: set.product_channel_label,
    num: code,
    name_en: text(product.name),
    name_ja: '',
    name_is_en: true,
    name_ja_status: 'not_recorded_by_source',
    language: 'English product record',
    language_code: 'en',
    category: 'Sealed product',
    subtypes: [text(product.product_type_label)].filter(Boolean),
    types: ['Sealed product', text(product.product_type_label)].filter(Boolean),
    element: '',
    rarity: 'Sealed',
    cond_type: 'factory sealed',
    image: productAsset.local_path,
    image_status: 'palify_authorized_local_catalogue_reference',
    image_reference_only: true,
    display_allowed: true,
    image_hosting: 'cairn_public_asset',
    image_asset_sha256: productAsset.sha256,
    image_asset_bytes: productAsset.bytes,
    upstream_image_url: productAsset.upstream_url,
    provenance: 'Official product specifications with an authorized Palify catalogue-reference image; not seller evidence or sealed-product proof.',
    source_authority: 'Palworld OFFICIAL CARD GAME product page',
    source_page_url: productsSource.source_page,
    source_snapshot: 'data/palworld/palworld-products-2026-08-04.json',
    source_snapshot_hash: hash(product),
    cards_per_pack: product.cards_per_pack ?? null,
    packs_per_box: product.packs_per_box ?? null,
    total_cards_nominal: product.total_cards_nominal ?? null,
    effect: text(product.description),
    landscape: true,
    holo: false,
    star_alt: false,
    printings: [],
    research_context: {
      scope: 'sealed_product_catalogue_record',
      confidence: 'official_product_specification',
      collection_label: set.label,
      release_kind: text(product.product_type_label),
      headline: text(product.name),
      summary: text(product.description),
      source_refs: [{ source: 'Palworld OFFICIAL CARD GAME · BP01 product page', source_page_url: productsSource.source_page, authority: 'Release date and pack/box contents.' }, { source: 'Palify · authorized product asset', source_page_url: 'https://palify.org/set/bp01', authority: 'Catalogue-reference image.' }],
      not_claiming: productsSource.not_claiming,
    },
    source_contacts: [{ source: 'Palworld OFFICIAL CARD GAME', source_page_url: productsSource.source_page, authority: 'Official product specifications.' }],
    not_claiming: productsSource.not_claiming,
  }
})

const catalogueItems = [...catalogueCards, ...catalogueProducts]

const payload = {
  title: policy.title,
  catalog_id: policy.catalog_id,
  scope_note: 'Palify launch catalogue snapshot; catalogue records and images are references, not evidence about a seller’s physical copy.',
  attribution: { source: policy.source, source_page: policy.source_page, source_api: policy.source_api, credit: 'Card data and authorized catalogue-reference assets: Palify.' },
  asset_policy: policy.asset_policy,
  data_policy: policy.data_policy,
  source_snapshot: { path: 'data/palworld/palify-cards-2026-08-04.json', date: policy.snapshot_date, declared_cards: source.count, sha256: hash(source) },
  ui: {
    holo_label: '★ Alternate printing available',
    family_chips: sets.map((set) => ({ label: set.code, value: set.release_family })),
    product_channel_chips: [
      { label: 'Booster', value: 'booster' },
      { label: 'Starter deck', value: 'starter' },
      { label: 'Promo', value: 'promo' },
    ],
    category_chips: [...new Set(catalogueItems.map((card) => card.category).filter(Boolean))],
    element_chips: [...new Set(catalogueCards.map((card) => card.element).filter(Boolean))],
  },
  sets,
  products: catalogueProducts,
  asset_manifest: { path: 'data/palworld/palify-assets-2026-08-04.json', unique_assets: assetManifest.summary.unique_assets, total_bytes: assetManifest.summary.total_bytes, sha256: assetManifest.summary.sha256 },
  summary: { sets: sets.length, cards: catalogueCards.length, products: catalogueProducts.length, items: catalogueItems.length, with_image: catalogueItems.filter((card) => card.image).length, local_reference_images: catalogueItems.filter((card) => card.image).length, remote_reference_images: 0, unique_local_image_assets: assetManifest.summary.unique_assets, local_image_bytes: assetManifest.summary.total_bytes, source: policy.source },
  manifest_total_rows: catalogueItems.length,
  catalog_hash: hash(catalogueItems),
  cards: catalogueItems,
}

await mkdir(new URL('../public/catalogs/', import.meta.url), { recursive: true })
await writeFile(outputUrl, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Palworld: ${catalogueCards.length} cards and ${catalogueProducts.length} sealed products across ${sets.length} sets.`)
