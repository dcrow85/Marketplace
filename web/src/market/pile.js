// Your pile: the cards you've picked up at each table, tagged buy or trade. Nothing
// sends from here. Posted-ask buys can continue to direct payment; changed prices or
// trade cards continue as one offer. Piles persist so you can walk away and return.
export const pileKeyFor = (catalogId, accountId) =>
  accountId ? `cairn-pile:${catalogId}:${accountId}` : `cairn-pile:${catalogId}`

export function loadPiles(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '{}')
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
    return Object.fromEntries(Object.entries(v).map(([seller, items]) => [seller,
      (Array.isArray(items) ? items : []).filter((item) => item?.uid).map((item) => ({
        ...item,
        qty: Math.max(1, Math.min(Number(item.maxQty) || 1, Number(item.qty) || 1)),
        maxQty: Math.max(1, Number(item.maxQty) || 1),
      })),
    ]).filter(([, items]) => items.length))
  } catch { return {} }
}

export function savePiles(key, piles) {
  try { localStorage.setItem(key, JSON.stringify(piles)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('cairn-pile'))
}

export function addToPile(key, sellerId, uid, mode, maxQty = 1, permissions = {}) {
  const piles = loadPiles(key)
  const pile = piles[sellerId] || []
  const available = Math.max(1, Number(maxQty) || 1)
  const allowBuy = permissions.buy !== false
  const allowTrade = permissions.trade !== false
  const safeMode = mode === 'buy' && allowBuy ? 'buy' : mode === 'trade' && allowTrade ? 'trade' : allowBuy ? 'buy' : 'trade'
  if (pile.some((x) => x.uid === uid)) {
    // already picked up — retag it instead of duplicating
    piles[sellerId] = pile.map((x) => x.uid === uid ? { ...x, mode: safeMode, allowBuy, allowTrade, maxQty: available, qty: Math.min(x.qty || 1, available) } : x)
  } else {
    piles[sellerId] = [...pile, { uid, mode: safeMode, allowBuy, allowTrade, qty: 1, maxQty: available }]
  }
  savePiles(key, piles)
}

export function setPileQuantity(key, sellerId, uid, qty) {
  const piles = loadPiles(key)
  piles[sellerId] = (piles[sellerId] || []).map((item) => item.uid === uid
    ? { ...item, qty: Math.max(1, Math.min(item.maxQty || 1, Number(qty) || 1)) }
    : item)
  savePiles(key, piles)
}

export function removeFromPile(key, sellerId, uid) {
  const piles = loadPiles(key)
  piles[sellerId] = (piles[sellerId] || []).filter((x) => x.uid !== uid)
  if (!piles[sellerId].length) delete piles[sellerId]
  savePiles(key, piles)
}

export function toggleMode(key, sellerId, uid) {
  const piles = loadPiles(key)
  piles[sellerId] = (piles[sellerId] || []).map((x) =>
    x.uid === uid ? { ...x, mode: x.allowBuy === false ? 'trade' : x.allowTrade === false ? 'buy' : x.mode === 'buy' ? 'trade' : 'buy' } : x)
  savePiles(key, piles)
}

export function clearPile(key, sellerId) {
  const piles = loadPiles(key)
  delete piles[sellerId]
  savePiles(key, piles)
}
