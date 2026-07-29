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

let approvedDisplayImages = 0
let referenceOnlyImages = 0
let missingImages = 0
const setLabels = new Map((source.sets || []).map((set) => [set.id, set.label]))
const cards = (source.cards || []).map((card) => {
  const clean = Object.fromEntries(
    Object.entries(card).filter(([key]) => !accountFields.has(key)),
  )
  clean.release_family_label = clean.release_family_label || setLabels.get(clean.set_id) || 'Vintage Pokémon'
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

const payload = {
  ...source,
  title: 'Vintage Pokémon reference catalogue',
  catalog_id: 'japanese-pre-english',
  scope_note: 'Japanese Pokémon cards released before the English TCG launch. Catalogue artwork is a reference—not seller evidence, authentication, condition, or proof of a physical card.',
  ui_summary: {
    cards: cards.length,
    sets: (source.sets || []).length,
    rendered_reference_images: approvedDisplayImages + referenceOnlyImages,
    approved_display_images: approvedDisplayImages,
    reference_only_images: referenceOnlyImages,
    missing_images: missingImages,
  },
  cards,
}

await mkdir(new URL('../public/catalogs/', import.meta.url), { recursive: true })
await writeFile(outputUrl, `${JSON.stringify(payload)}\n`)
console.log(`Vintage Pokémon: ${cards.length} cards, ${approvedDisplayImages + referenceOnlyImages} catalogue-reference images, ${missingImages} without images.`)
