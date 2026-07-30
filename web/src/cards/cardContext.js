const text = (value) => String(value || '').trim()

const humanize = (value) => text(value)
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase())

const sentence = (value) => {
  const normalized = text(value)
  if (!normalized) return ''
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
}

const categoryName = (value) => {
  if (value === 'Pokemon') return 'Pokémon'
  return text(value).toLowerCase()
}

const parseIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? new Date(`${value}T00:00:00Z`)
  : null

const shortDate = (date, withYear = true) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  ...(withYear ? { year: 'numeric' } : {}),
  timeZone: 'UTC',
}).format(date)

export function cardReleasePeriod(value = '') {
  const normalized = text(value)
  const range = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:\s+to\s+|\/)(\d{4}-\d{2}-\d{2})$/i)
  if (range) {
    const start = parseIsoDate(range[1])
    const end = parseIsoDate(range[2])
    if (start && end) {
      const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
      return `${shortDate(start, !sameYear)} – ${shortDate(end)}`
    }
  }
  const date = parseIsoDate(normalized)
  return date ? shortDate(date) : normalized
}

export function cardArtist(card = {}) {
  return text(card.illustrator).replace(/^illus(?:tration)?\.?\s*/i, '') || ''
}

export function cardNumber(card = {}) {
  const unnumbered = /unnumbered/i.test(`${text(card.release_family_label)} ${text(card.release_type)} ${text(card.set_id)}`)
  return {
    primary: unnumbered ? 'Unnumbered' : text(card.num) || 'Not recorded',
    catalogueOrder: unnumbered && text(card.num) ? text(card.num) : '',
  }
}

export function cardRarity(card = {}) {
  const rarity = text(card.rarity)
  if (!rarity) return 'Not recorded'
  if (/^sans raret[ée]$/i.test(rarity)) return 'Rarity not stated'
  return rarity
}

export function cardContext(card = {}) {
  const curated = card.historical_context || null
  const research = card.research_context || null
  const promo = card.promo_context || card.promo || {}
  const name = text(card.name_en) || text(card.name_ja) || 'This card'
  const releaseLabel = text(curated?.collection_label) || text(research?.collection_label) || text(card.release_family_label) || 'Vintage Pokémon'
  const releasePeriod = cardReleasePeriod(text(promo.date_label) || text(promo.date) || text(research?.release_date) || text(card.release_date))
  const distribution = text(promo.distribution_comment) || text(promo.comment)
  const type = categoryName(card.category)
  const identity = `${name} is recorded as a ${text(card.language).toLowerCase() || 'catalogued'}${type ? ` ${type}` : ''} printing from ${releaseLabel}.`
  const sourceRefs = [
    ...(curated ? curated.source_refs || [] : research?.source_refs || []),
    ...(card.source_contacts || []),
    card.source_page_url ? {
      source: `${card.source_authority || 'Catalogue source'} · card record`,
      source_page_url: card.source_page_url,
      authority: 'Catalogue identity and source-row context.',
    } : null,
  ].filter((source) => /^https?:\/\//i.test(text(source?.source_page_url))).filter((source, index, all) => {
    const key = text(source.source_page_url)
    return all.findIndex((candidate) => text(candidate.source_page_url) === key) === index
  })
  const notClaiming = [...new Set([
    ...(curated?.not_claiming || []),
    ...(research?.not_claiming || []),
    ...(promo.not_claiming || []),
    ...(card.not_claiming || []),
  ].map(text).filter(Boolean))]
  return {
    label: releaseLabel,
    headline: text(curated?.headline) || text(research?.headline) || (distribution ? 'How this printing entered the hobby' : `A printing from ${releaseLabel}`),
    summary: text(curated?.summary) || text(research?.summary) || `${identity}${distribution ? ` ${sentence(`The catalogue associates it with ${distribution}`)}` : ''}`,
    laterHistory: text(curated?.later_history) || text(research?.history_note),
    artist: cardArtist(card),
    artistStatus: text(card.illustrator_status),
    releasePeriod,
    distribution: text(curated?.acquisition) || distribution || text(research?.distribution_label) || humanize(card.release_type) || 'Not recorded',
    releaseKind: text(research?.release_kind) || humanize(card.release_type),
    releaseRowCount: Number(research?.release_row_count) || 0,
    dexNumber: (card.dex_ids || []).filter((value) => value != null && value !== '').map((value) => `#${String(value).padStart(3, '0')}`).join(' · '),
    confidence: curated ? 'Attributed history' : research?.confidence === 'source_recorded' ? 'Source-linked research' : distribution ? 'Source-recorded context' : 'Catalogue context',
    sourceLabel: curated ? 'History sources' : 'Research sources',
    sourceRefs,
    notClaiming,
  }
}
