// Your pile: the cards you've picked up at each table, tagged buy or trade. Nothing
// sends from here. Posted-ask buys can continue to direct payment; changed prices or
// trade cards continue as one offer. Piles persist so you can walk away and return.
export const pileKeyFor = (catalogId, accountId) =>
  accountId ? `cairn-pile:${catalogId}:${accountId}` : `cairn-pile:${catalogId}`

export function loadPiles(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch { return {} }
}

export function savePiles(key, piles) {
  try { localStorage.setItem(key, JSON.stringify(piles)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('cairn-pile'))
}

export function addToPile(key, sellerId, uid, mode) {
  const piles = loadPiles(key)
  const pile = piles[sellerId] || []
  if (pile.some((x) => x.uid === uid)) {
    // already picked up — retag it instead of duplicating
    piles[sellerId] = pile.map((x) => x.uid === uid ? { ...x, mode } : x)
  } else {
    piles[sellerId] = [...pile, { uid, mode }]
  }
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
    x.uid === uid ? { ...x, mode: x.mode === 'buy' ? 'trade' : 'buy' } : x)
  savePiles(key, piles)
}

export function clearPile(key, sellerId) {
  const piles = loadPiles(key)
  delete piles[sellerId]
  savePiles(key, piles)
}
