import { readFile } from 'node:fs/promises'

const catalogUrl = new URL('../public/catalogs/vintage-pokemon.json', import.meta.url)
const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'))
const cards = catalog.cards || []
const researchBySetId = new Map((catalog.sets || []).map((set) => [set.id, set.research_context]))
const failures = []
const isWebUrl = (value) => /^https?:\/\//i.test(String(value || ''))

for (const card of cards) {
  const research = researchBySetId.get(card.research_context_id || card.set_id) || {}
  const prefix = card.canonical_row_id || card.uid || 'unknown row'
  if (!research.headline) failures.push(`${prefix}: missing research headline`)
  if (!research.summary) failures.push(`${prefix}: missing research summary`)
  if (research.scope !== 'release_and_card_record') failures.push(`${prefix}: invalid research scope`)
  if (!(research.source_refs || []).some((source) => isWebUrl(source.source_page_url))) {
    failures.push(`${prefix}: missing linked research source`)
  }
  if (!(research.not_claiming || []).length) failures.push(`${prefix}: missing research boundary`)
  if (!card.illustrator_status) failures.push(`${prefix}: missing artist status`)
  if (!card.release_family_label) failures.push(`${prefix}: missing release label`)
  if (!card.language) failures.push(`${prefix}: missing language`)
  if (!card.num && !card.card_id) failures.push(`${prefix}: missing card identifier`)
}

const releaseIds = new Set(cards.map((card) => card.set_id))
const researchedReleases = new Set(cards
  .filter((card) => researchBySetId.get(card.research_context_id || card.set_id)?.summary)
  .map((card) => card.set_id))

if (failures.length) {
  console.error(failures.slice(0, 50).join('\n'))
  throw new Error(`Vintage research audit failed with ${failures.length} finding(s)`)
}

const artistRecorded = cards.filter((card) => card.illustrator_status === 'source_recorded').length
console.log(JSON.stringify({
  status: 'pass',
  cards: cards.length,
  researched_cards: cards.length,
  releases: releaseIds.size,
  researched_releases: researchedReleases.size,
  artist_recorded: artistRecorded,
  artist_not_recorded: cards.length - artistRecorded,
  curated_card_histories: cards.filter((card) => card.historical_context).length,
}, null, 2))
