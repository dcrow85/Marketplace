const FALLBACK_BASE = '/app/'

export function cardSlug(uid = '') {
  return String(uid)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function cardPath(uid) {
  const base = (import.meta.env.BASE_URL || FALLBACK_BASE).replace(/\/?$/, '/')
  return `${base}cards/${cardSlug(uid)}/`
}

export function cardSlugFromPath(pathname = window.location.pathname) {
  const match = String(pathname).match(/\/cards\/([^/]+)\/?$/i)
  return match ? decodeURIComponent(match[1]).toLowerCase() : null
}

export function cardFromSlug(cards, slug) {
  if (!slug) return null
  return (cards || []).find((card) => cardSlug(card.uid) === slug) || null
}

export function artistCredit(card = {}) {
  return String(card.illustrator || card.artist || '')
    .replace(/^illus(?:tration)?\.?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function artistSlug(name = '') {
  return cardSlug(String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
}

export function artistPath(name) {
  const base = (import.meta.env.BASE_URL || FALLBACK_BASE).replace(/\/?$/, '/')
  return `${base}artists/${artistSlug(name)}/`
}

export function artistSlugFromPath(pathname = window.location.pathname) {
  const match = String(pathname).match(/\/artists\/([^/]+)\/?$/i)
  return match ? decodeURIComponent(match[1]).toLowerCase() : null
}

export function artistFromSlug(cards, slug) {
  if (!slug) return ''
  return artistCredit((cards || []).find((card) => artistSlug(artistCredit(card)) === slug))
}
