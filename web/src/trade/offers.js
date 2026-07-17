// The offer: the ONE trade object. Two baskets and an optional cash leg — a pure buy
// is an offer with an empty give-basket; a swap is two baskets and no cash. Counters
// are built in from the start: a counter is just a NEW offer with the baskets edited
// and the old one linked (counterOf), so the state machine never grows a hairball.
// Phase 2: the same object travels. An offer to a LIVE table (live: true) is also
// pushed to the counterpart's inbox on the room's KV; their app merges it into their
// ledger and their responses come back the same way. Mock offers never leave the browser.
import { pushInbox, isLiveAddr } from '../live/pilotStore.js'
import { cleanPayPalHandle, paymentRailFor, railCurrency, RAIL_PAYPAL } from '../payments/rails.js'

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
export function sendOffer(key, { to, toHandle, want, give, cash, note, evidenceRequest, counterOf, live, from, fromHandle, cat, settlement }) {
  const offers = loadOffers(key)
  const id = 'of_' + Math.random().toString(36).slice(2, 10)
  const rail = paymentRailFor(settlement?.rail)
  const firstEvidence = evidenceRequest?.line
    ? [evidenceMessage('request', evidenceRequest.line, 'out', evidenceRequest)]
    : []
  const o = {
    id, dir: 'out', to, toHandle: String(toHandle || '').trim().slice(0, 32) || null,
    fromHandle: String(fromHandle || '').trim().slice(0, 32) || null,
    at: new Date().toISOString().slice(0, 10),
    want, give, cash: cash && cash.amount > 0 ? cash : null,
    settlement: cash && cash.amount > 0 ? {
      rail,
      currency: railCurrency(rail),
      paypal_handle: rail === RAIL_PAYPAL ? cleanPayPalHandle(settlement?.paypal_handle) : null,
      cairn_enforced: rail !== RAIL_PAYPAL,
    } : null,
    note: (note || '').slice(0, 240) || null,
    evidenceThread: firstEvidence,
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

// PayPal is an external rail. The buyer can report a provider payment, but Cairn
// keeps that as a claim until the seller separately confirms receipt in PayPal.
export function recordExternalPurchase(key, { to, toHandle, want, amount, live, from, cat, paypalHandle, paymentRef, providerRef }) {
  const offers = loadOffers(key)
  const id = 'buy_' + Math.random().toString(36).slice(2, 10)
  const cleanHandle = cleanPayPalHandle(paypalHandle)
  const numericAmount = Number(amount)
  if (!cleanHandle || !(numericAmount > 0)) return null
  const o = {
    id, dir: 'out', to, toHandle: String(toHandle || '').trim().slice(0, 32) || null,
    at: new Date().toISOString().slice(0, 10),
    want, give: [], cash: { side: 'from', amount: numericAmount }, note: null,
    state: 'payment_reported', live: !!live, rail: RAIL_PAYPAL,
    settlement: {
      rail: RAIL_PAYPAL, currency: 'USD', paypal_handle: cleanHandle,
      cairn_enforced: false, payment_ref: String(paymentRef || '').slice(0, 40),
      provider_ref: String(providerRef || '').trim().slice(0, 80) || null,
    },
    log: [`Buyer reported ${numericAmount.toFixed(2)} USD sent through PayPal · ${String(paymentRef || '').slice(0, 40)} · not verified by Cairn`],
  }
  offers.unshift(o)
  saveOffers(key, offers)
  if (live && isLiveAddr(to)) {
    pushInbox(to, { id, type: 'offer', offer: { ...o, from: from || null, cat: cat || null } })
  }
  return id
}

// A PayPal API capture is stronger than a buyer statement but still belongs to an
// external provider: PayPal reports the sandbox payment state; Cairn neither holds
// nor reverses it. This path is sandbox-only until connected sellers are approved.
export function recordPayPalCapture(key, { to, toHandle, want, amount, paymentRef, capture }) {
  const offers = loadOffers(key)
  const numericAmount = Number(amount)
  if (!(numericAmount > 0) || capture?.mode !== 'sandbox' || capture?.status !== 'COMPLETED'
      || capture?.captureStatus !== 'COMPLETED' || !capture?.orderId || !capture?.captureId) return null
  if (Number(capture.amount) !== numericAmount || capture.currency !== 'USD') return null
  const id = 'buy_' + Math.random().toString(36).slice(2, 10)
  const o = {
    id, dir: 'out', to, toHandle: String(toHandle || '').trim().slice(0, 32) || null,
    at: new Date().toISOString().slice(0, 10),
    want, give: [], cash: { side: 'from', amount: numericAmount }, note: null,
    state: 'payment_confirmed', live: false, rail: RAIL_PAYPAL,
    settlement: {
      rail: RAIL_PAYPAL, currency: 'USD', cairn_enforced: false,
      environment: 'sandbox', provider_status: 'COMPLETED',
      payment_ref: String(paymentRef || '').slice(0, 40),
      provider_order_id: String(capture.orderId).slice(0, 40),
      provider_ref: String(capture.captureId).slice(0, 40),
      seller_protection: String(capture.sellerProtection || '').slice(0, 32) || null,
      verified_by: 'paypal_capture_api',
    },
    log: [`PayPal Sandbox API reported ${numericAmount.toFixed(2)} USD capture COMPLETED · order ${String(capture.orderId).slice(0, 20)} · no real money value`],
  }
  offers.unshift(o)
  saveOffers(key, offers)
  return id
}

// Accepting a posted ask is not an offer round-trip: the buyer has already funded
// escrow. Keep the same ledger shape, but enter it at escrow_locked and send one
// complete event to the seller so no response can race ahead of the purchase record.
export function recordFundedPurchase(key, { to, toHandle, want, amount, live, from, cat, tradeId, txHash, rail = 'escrow' }) {
  const offers = loadOffers(key)
  const id = 'buy_' + Math.random().toString(36).slice(2, 10)
  const o = {
    id, dir: 'out', to, toHandle: String(toHandle || '').trim().slice(0, 32) || null,
    at: new Date().toISOString().slice(0, 10),
    want, give: [], cash: { side: 'from', amount }, note: null,
    state: 'escrow_locked', live: !!live, tradeId, rail,
    settlement: { rail: 'escrow', currency: 'USDC', cairn_enforced: true },
    log: [`posted ask accepted — ${amount} USDC funded in escrow · trade #${tradeId} · tx ${String(txHash || '').slice(0, 10)}…`],
  }
  offers.unshift(o)
  saveOffers(key, offers)
  if (live && isLiveAddr(to)) {
    pushInbox(to, { id, type: 'offer', offer: { ...o, from: from || null, cat: cat || null } })
  }
  return id
}

export function setOfferState(key, id, state, extra) {
  const offers = loadOffers(key)
  const o = offers.find((x) => x.id === id)
  if (!o) return
  Object.assign(o, { state }, extra || {})
  saveOffers(key, offers)
}

const cleanEvidenceMeta = (meta = {}) => ({
  cardUids: [...new Set((Array.isArray(meta.cardUids) ? meta.cardUids : []).map(String).filter(Boolean))].slice(0, 24),
  views: [...new Set((Array.isArray(meta.views) ? meta.views : []).map(String).filter((view) => ['front', 'back', 'corners', 'holo_tilt'].includes(view)))],
})

const evidenceMessage = (kind, line, dir, meta = {}) => ({
  id: 'ev_' + Math.random().toString(36).slice(2, 10),
  kind,
  dir,
  line: String(line || '').trim().slice(0, 600),
  at: new Date().toISOString(),
  ...cleanEvidenceMeta(meta),
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
export function requestOfferEvidence(key, offerId, line, meta) {
  const appended = appendEvidence(key, offerId, evidenceMessage('request', line, 'out', meta))
  if (!appended) return false
  const { o, event } = appended
  const other = o.dir === 'out' ? o.to : o.from
  if (o.live && isLiveAddr(other)) {
    pushInbox(other, { id: event.id, type: 'evidence_request', offerId: o.id, line: event.line, cardUids: event.cardUids, views: event.views })
  }
  return true
}

export function respondToOfferEvidence(key, offerId, line, meta) {
  const appended = appendEvidence(key, offerId, evidenceMessage('response', line, 'out', meta))
  if (!appended) return false
  const { o, event } = appended
  const other = o.dir === 'out' ? o.to : o.from
  if (o.live && isLiveAddr(other)) {
    pushInbox(other, { id: event.id, type: 'evidence_response', offerId: o.id, line: event.line, cardUids: event.cardUids, views: event.views })
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
export const OFFER_SETTLING = ['accepted', 'escrow_locked', 'payment_reported', 'payment_confirmed', 'in_transit', 'delivered', 'provider_disputed']

export function offerSheet({ offer, byUid, myId }) {
  const nm = (uid) => { const c = byUid.get(uid); return c ? `${c.name_en || uid} · ${c.num}` : uid }
  return [
    'CAIRN OFFER SHEET',
    ...offer.want.map((w) => `want       ${nm(w.uid)}`),
    ...offer.give.map((g) => `give       ${nm(g.uid)}`),
    offer.cash ? `cash       ${offer.cash.amount} ${offer.settlement?.currency || 'USDC'} · paid by ${offer.cash.side === 'from' ? 'me' : 'them'}` : null,
    offer.cash ? `rail       ${offer.settlement?.rail === RAIL_PAYPAL ? 'PayPal · external, not held by Cairn' : 'Cairn Escrow'}` : null,
    offer.note ? `note       ${offer.note}` : null,
    `to         ${offer.to}`,
    myId ? `from       ${myId}` : null,
  ].filter(Boolean).join('\n')
}
