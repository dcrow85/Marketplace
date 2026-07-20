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
