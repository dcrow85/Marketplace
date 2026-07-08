// Card-for-card swap proposals, kept locally until a shared backend exists.
// A swap is the simplest trade object there is: their card, your card, a status.
export const swapKeyFor = (catalogId, accountId) =>
  accountId ? `cairn-swaps:${catalogId}:${accountId}` : `cairn-swaps:${catalogId}`

export function loadSwaps(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

export function saveSwaps(key, swaps) {
  try { localStorage.setItem(key, JSON.stringify(swaps)) } catch { /* ignore */ }
  // localStorage is not reactive; let the app (Trades badge, open panels) know
  window.dispatchEvent(new CustomEvent('cairn-swaps'))
}

export function proposeSwap(key, { theirUid, sellerId, mineUid }) {
  const swaps = loadSwaps(key)
  const id = 'sw_' + Math.random().toString(36).slice(2, 10)
  swaps.unshift({ id, at: new Date().toISOString().slice(0, 10), their: { uid: theirUid, seller: sellerId }, mine: { uid: mineUid }, status: 'proposed' })
  saveSwaps(key, swaps)
  return id
}

export function withdrawSwap(key, id) {
  saveSwaps(key, loadSwaps(key).filter((s) => s.id !== id))
}

export function swapSheet({ theirCard, mineCard, mineCond, sellerId, myId }) {
  return [
    'CAIRN SWAP SHEET',
    `want       ${theirCard.name_en || theirCard.uid} · ${theirCard.num}`,
    `offer      ${mineCard.name_en || mineCard.uid} · ${mineCard.num}${mineCond ? ' · ' + mineCond : ''}`,
    sellerId ? `to         ${sellerId}` : null,
    myId ? `from       ${myId}` : null,
  ].filter(Boolean).join('\n')
}
