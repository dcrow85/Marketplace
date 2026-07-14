// The offer: the ONE trade object. Two baskets and an optional cash leg — a pure buy
// is an offer with an empty give-basket; a swap is two baskets and no cash. Counters
// are built in from the start: a counter is just a NEW offer with the baskets edited
// and the old one linked (counterOf), so the state machine never grows a hairball.
// Phase 2: the same object travels. An offer to a LIVE table (live: true) is also
// pushed to the counterpart's inbox on the room's KV; their app merges it into their
// ledger and their responses come back the same way. Mock offers never leave the browser.
import { pushInbox, isLiveAddr } from '../live/pilotStore.js'

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

// dir 'out' = you sent it; dir 'in' = it arrived (a persona counter, or a live inbox).
export function sendOffer(key, { to, want, give, cash, note, counterOf, live, from, cat }) {
  const offers = loadOffers(key)
  const id = 'of_' + Math.random().toString(36).slice(2, 10)
  const o = {
    id, dir: 'out', to, at: new Date().toISOString().slice(0, 10),
    want, give, cash: cash && cash.amount > 0 ? cash : null,
    note: (note || '').slice(0, 240) || null,
    counterOf: counterOf || null,
    state: 'sent',
    live: !!live,
  }
  offers.unshift(o)
  if (counterOf) {
    const prev = offers.find((x) => x.id === counterOf)
    if (prev && ['sent', 'seen'].includes(prev.state)) prev.state = 'countered'
  }
  saveOffers(key, offers)
  // a live offer also travels: fire-and-forget to their inbox — the local copy is
  // already saved, so a failed push just means they hear it on your next visit
  if (live && isLiveAddr(to)) pushInbox(to, { id, type: 'offer', offer: { ...o, from: from || null, cat: cat || null } })
  return id
}

export function setOfferState(key, id, state, extra) {
  const offers = loadOffers(key)
  const o = offers.find((x) => x.id === id)
  if (!o) return
  Object.assign(o, { state }, extra || {})
  saveOffers(key, offers)
}

const evidenceMessage = (kind, line, dir) => ({
  id: 'ev_' + Math.random().toString(36).slice(2, 10),
  kind,
  dir,
  line: String(line || '').trim().slice(0, 600),
  at: new Date().toISOString(),
})

function appendEvidence(key, offerId, event) {
  const offers = loadOffers(key)
  const o = offers.find((x) => x.id === offerId)
  if (!o || !event.line || !['sent', 'seen'].includes(o.state)) return null
  o.evidenceThread = [...(Array.isArray(o.evidenceThread) ? o.evidenceThread : []), event].slice(-20)
  saveOffers(key, offers)
  return { o, event }
}

// Evidence questions stay inside the open offer. They are messages, not state
// transitions: asking cannot accept, decline, fund, or otherwise move the deal.
export function requestOfferEvidence(key, offerId, line) {
  const appended = appendEvidence(key, offerId, evidenceMessage('request', line, 'out'))
  if (!appended) return false
  const { o, event } = appended
  const other = o.dir === 'out' ? o.to : o.from
  if (o.live && isLiveAddr(other)) {
    pushInbox(other, { id: event.id, type: 'evidence_request', offerId: o.id, line: event.line })
  }
  return true
}

export function respondToOfferEvidence(key, offerId, line) {
  const appended = appendEvidence(key, offerId, evidenceMessage('response', line, 'out'))
  if (!appended) return false
  const { o, event } = appended
  const other = o.dir === 'out' ? o.to : o.from
  if (o.live && isLiveAddr(other)) {
    pushInbox(other, { id: event.id, type: 'evidence_response', offerId: o.id, line: event.line })
  }
  return true
}

export function withdrawOffer(key, id) {
  const offers = loadOffers(key)
  const o = offers.find((x) => x.id === id)
  if (o && ['sent', 'seen'].includes(o.state)) {
    o.state = 'withdrawn'; o.nextAt = null
    if (o.live && isLiveAddr(o.to)) pushInbox(o.to, { id: o.id, type: 'response', state: 'withdrawn' })
  }
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
