import { artistCredit, artistSlug } from './cardRoute.js'

const clean = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
const subject = (card) => clean(card.name_en || card.name_ja)
const releaseTime = (card) => {
  const time = Date.parse(card.release_date || '')
  return Number.isFinite(time) ? time : 0
}

const byDiscoveryOrder = (a, b) => b.score - a.score
  || String(a.card.release_date || '').localeCompare(String(b.card.release_date || ''))
  || String(a.card.num || '').localeCompare(String(b.card.num || ''), undefined, { numeric: true })

export function relatedCards(cards = [], current = {}, limit = 12) {
  const currentArtist = artistSlug(artistCredit(current))
  const currentSubject = subject(current)
  const verified = new Set((current.printing_relationships || [])
    .flatMap((relationship) => relationship.related_uids || []))

  const connected = cards.map((card) => {
    if (!card || card.uid === current.uid || verified.has(card.uid)) return null
    const reasons = []
    let score = 0
    const sameSubject = currentSubject && subject(card) === currentSubject
    const sameArtist = currentArtist && artistSlug(artistCredit(card)) === currentArtist
    const sameRelease = current.set_id && card.set_id === current.set_id
    if (sameSubject) { score += 12; reasons.push('same card') }
    if (sameArtist) { score += 8; reasons.push('same artist') }
    if (sameRelease) { score += 3; reasons.push('same release') }
    if (!score) return null
    if (card.image) score += 1
    if (card.language && current.language && card.language !== current.language) score += 1
    return { card, score, reasons: reasons.slice(0, 2) }
  }).filter(Boolean).sort(byDiscoveryOrder).slice(0, limit)

  if (connected.length >= limit) return connected

  // A card show never ends in a blank wall. For one-off promos and incomplete
  // records, offer honest catalogue neighbours rather than inventing a link.
  const selected = new Set(connected.map(({ card }) => card.uid))
  const currentTime = releaseTime(current)
  const neighbours = cards.map((card) => {
    if (!card || card.uid === current.uid || verified.has(card.uid) || selected.has(card.uid)) return null
    const sameLanguage = Boolean(current.language && card.language === current.language)
    const sameCategory = Boolean(current.category && card.category === current.category)
    const time = releaseTime(card)
    const distance = currentTime && time ? Math.abs(currentTime - time) : Number.MAX_SAFE_INTEGER
    return {
      card,
      reasons: ['nearby in catalogue'],
      score: (sameLanguage ? 2 : 0) + (sameCategory ? 1 : 0) + (card.image ? 0.25 : 0),
      distance,
    }
  }).filter(Boolean).sort((a, b) => a.distance - b.distance || byDiscoveryOrder(a, b))

  return connected.concat(neighbours.slice(0, limit - connected.length))
}

export function artistCards(cards = [], artist = '') {
  const wanted = artistSlug(artist)
  return cards.filter((card) => artistSlug(artistCredit(card)) === wanted)
}
