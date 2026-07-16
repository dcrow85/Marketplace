import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { cardMatchesText, initialFamilyFilter } from '../src/binder/catalogSearch.js'

const catalog = JSON.parse(await readFile(new URL('../public/catalogs/azuki-tcg.json', import.meta.url), 'utf8'))
const setById = Object.fromEntries(catalog.sets.map((set) => [set.id, set]))
const expected = [
  'azuki_tcg_observation:tournament-winner-photo-20260710-001',
  'azuki_tcg_observation:tournament-winner-photo-20260710-002',
  'azuki_tcg_observation:anime-expo-winner-photo-20260710-001',
  'azuki_tcg_observation:tournament-winner-photo-20260710-003',
]

assert.equal(initialFamilyFilter().size, 0, 'Binder must open on the complete catalogue')

const winnerMatches = new Set(catalog.cards
  .filter((card) => cardMatchesText(card, 'winner', setById))
  .map((card) => card.uid))

for (const uid of expected) {
  const card = catalog.cards.find((candidate) => candidate.uid === uid)
  assert(card, `missing WINNER catalogue row: ${uid}`)
  assert.equal(card.release_family, 'observed', `WINNER row is not observation-scoped: ${uid}`)
  assert(card.image && !/^https?:\/\//.test(card.image), `WINNER image is not Cairn-hosted: ${uid}`)
  await access(new URL(`../public/${card.image}`, import.meta.url))
  assert(winnerMatches.has(uid), `WINNER row is not discoverable by treatment search: ${uid}`)
}

console.log(`winner catalogue check passed: ${expected.length} observed treatments`)
