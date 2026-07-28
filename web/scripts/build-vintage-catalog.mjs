import { mkdir, readFile, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('../public/catalog-sample.json', import.meta.url)
const outputUrl = new URL('../public/catalogs/vintage-pokemon.json', import.meta.url)
const source = JSON.parse(await readFile(sourceUrl, 'utf8'))

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

let displayedImages = 0
let suppressedImages = 0
const setLabels = new Map((source.sets || []).map((set) => [set.id, set.label]))
const cards = (source.cards || []).map((card) => {
  const clean = Object.fromEntries(
    Object.entries(card).filter(([key]) => !accountFields.has(key)),
  )
  clean.release_family_label = clean.release_family_label || setLabels.get(clean.set_id) || 'Vintage Pokémon'
  if (clean.image && clean.display_allowed !== false) {
    displayedImages += 1
  } else if (clean.image) {
    clean.image = null
    clean.image_suppressed = true
    suppressedImages += 1
  }
  return clean
})

const payload = {
  ...source,
  title: 'Vintage Pokémon reference catalogue',
  catalog_id: 'japanese-pre-english',
  scope_note: 'Japanese Pokémon cards released before the English TCG launch; source and display status remain attached to each record.',
  ui_summary: {
    cards: cards.length,
    sets: (source.sets || []).length,
    displayed_images: displayedImages,
    suppressed_reference_images: suppressedImages,
  },
  cards,
}

await mkdir(new URL('../public/catalogs/', import.meta.url), { recursive: true })
await writeFile(outputUrl, `${JSON.stringify(payload)}\n`)
console.log(`Vintage Pokémon: ${cards.length} cards, ${displayedImages} displayable images, ${suppressedImages} reference images suppressed.`)
