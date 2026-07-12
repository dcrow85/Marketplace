// Shared collection access for the Binder / Sell pile views: the same localStorage
// stance store and catalog payload the Catalog view uses, readable without mounting it.
export const storeKeyFor = (catalogId, accountId) =>
  accountId ? `cairn-cards:${catalogId}:${accountId}` : `cairn-cards:${catalogId}`

export function loadStore(storeKey) {
  try { return JSON.parse(localStorage.getItem(storeKey) || '{}') } catch { return {} }
}

export function saveStore(storeKey, store) {
  try { localStorage.setItem(storeKey, JSON.stringify(store)) } catch { /* ignore */ }
}

export function catalogUrl(catalog) {
  const base = import.meta.env.BASE_URL || '/'
  return base + (catalog.path || 'catalog-sample.json')
}

// THE stance reader — the single source of truth for how a card's effective state
// derives from the user's store over the catalog row. (Binder's old private
// `effStance` and this used to be near-twins kept in sync by hand; now they're one.)
export function entryFor(c, store) {
  const u = store[c.uid] || {}
  let st = u.stance != null ? u.stance : c.stance != null ? c.stance : c.owned ? 'have' : 'none'
  let extra = u.extra !== undefined ? !!u.extra : c.stance === 'extra'
  if (st === 'extra') { st = 'have'; extra = true }
  if (st === 'wish') st = 'want'
  if (!st) st = 'none'
  const trade = u.trade !== undefined ? !!u.trade : extra
  const sell = u.sell !== undefined ? !!u.sell : !!c.sell
  const grail = u.grail !== undefined ? !!u.grail : !!c.grail
  return { ...u, stance: st, extra, trade, sell, grail }
}

export function condStr(u) {
  const t = (u.cond_type === 'graded' || u.cond_type === 'tag')
    ? ['graded', u.cond_grader].filter(Boolean).join(' ')
    : (u.cond_type || 'raw')
  return [t, u.cond_grade].filter(Boolean).join(' · ')
}
