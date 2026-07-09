// The offer: the ONE trade object. Two baskets and an optional cash leg — a pure buy
// is an offer with an empty give-basket; a swap is two baskets and no cash. Counters
// are built in from the start: a counter is just a NEW offer with the baskets edited
// and the old one linked (counterOf), so the state machine never grows a hairball.
// Phase 1: offers live locally and mock personas answer them. The object is designed
// so Phase 2 only changes WHERE it's stored (inbox relay), not WHAT it is.
export const offersKeyFor = (catalogId, accountId) =>
  accountId ? `cairn-offers:${catalogId}:${accountId}` : `cairn-offers:${catalogId}`

export function loadOffers(key) {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || '[]')
    if (!Array.isArray(arr)) return []
    // offers written by older builds can miss fields; a malformed one must never
    // reach the engine (one bad offer used to kill every tick — nothing answered)
    return arr.filter((o) => o && typeof o === 'object' && typeof o.state === 'string'
      && Array.isArray(o.want) && Array.isArray(o.give) && (o.to || o.from))
  } catch { return [] }
}

export function saveOffers(key, offers) {
  try { localStorage.setItem(key, JSON.stringify(offers)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('cairn-offers'))
}

// dir 'out' = you sent it; dir 'in' = it arrived (in Phase 1, persona counters).
export function sendOffer(key, { to, want, give, cash, note, counterOf }) {
  const offers = loadOffers(key)
  const id = 'of_' + Math.random().toString(36).slice(2, 10)
  offers.unshift({
    id, dir: 'out', to, at: new Date().toISOString().slice(0, 10),
    want, give, cash: cash && cash.amount > 0 ? cash : null,
    note: (note || '').slice(0, 240) || null,
    counterOf: counterOf || null,
    state: 'sent',
  })
  if (counterOf) {
    const prev = offers.find((o) => o.id === counterOf)
    if (prev && ['sent', 'seen'].includes(prev.state)) prev.state = 'countered'
  }
  saveOffers(key, offers)
  return id
}

export function setOfferState(key, id, state, extra) {
  const offers = loadOffers(key)
  const o = offers.find((x) => x.id === id)
  if (!o) return
  Object.assign(o, { state }, extra || {})
  saveOffers(key, offers)
}

export function withdrawOffer(key, id) {
  const offers = loadOffers(key)
  const o = offers.find((x) => x.id === id)
  if (o && ['sent', 'seen'].includes(o.state)) { o.state = 'withdrawn'; o.nextAt = null }
  saveOffers(key, offers)
}

export function clearOffer(key, id) {
  saveOffers(key, loadOffers(key).filter((o) => o.id !== id))
}

// states that still need somebody's attention (badge + ambient)
export const OFFER_OPEN = ['sent', 'seen']
export const OFFER_SETTLING = ['accepted', 'escrow_locked', 'in_transit', 'delivered']

export function offerSheet({ offer, byUid, myId }) {
  const nm = (uid) => { const c = byUid.get(uid); return c ? `${c.name_en || uid} · ${c.num}` : uid }
  return [
    'CAIRN OFFER SHEET',
    ...offer.want.map((w) => `want       ${nm(w.uid)}`),
    ...offer.give.map((g) => `give       ${nm(g.uid)}`),
    offer.cash ? `cash       ${offer.cash.amount} USDC · paid by ${offer.cash.side === 'from' ? 'me' : 'them'}` : null,
    offer.note ? `note       ${offer.note}` : null,
    `to         ${offer.to}`,
    myId ? `from       ${myId}` : null,
  ].filter(Boolean).join('\n')
}
