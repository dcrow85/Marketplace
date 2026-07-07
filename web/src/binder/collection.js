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

// Owned / selling reads that mirror the Catalog view's effStance defaults.
export function entryFor(c, store) {
  const u = store[c.uid] || {}
  let st = u.stance != null ? u.stance : c.stance != null ? c.stance : c.owned ? 'have' : 'none'
  let extra = u.extra !== undefined ? !!u.extra : c.stance === 'extra'
  if (st === 'extra') { st = 'have'; extra = true }
  if (st === 'wish') st = 'want'
  const trade = u.trade !== undefined ? !!u.trade : extra
  const sell = u.sell !== undefined ? !!u.sell : !!c.sell
  return { ...u, stance: st || 'none', extra, trade, sell, grail: !!u.grail }
}

export function condStr(u) {
  const t = (u.cond_type === 'graded' || u.cond_type === 'tag')
    ? ['graded', u.cond_grader].filter(Boolean).join(' ')
    : (u.cond_type || 'raw')
  return [t, u.cond_grade].filter(Boolean).join(' · ')
}
