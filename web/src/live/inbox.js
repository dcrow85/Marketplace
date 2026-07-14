// The inbox side of the live loop: poll your box on the room's KV, merge what's new
// into the local offers ledger, and let both parties record a live deal settled.
// Every message is processed once (a seen-ledger survives clears), and a response
// never drags a closed offer backwards.
import { offersKeyFor, loadOffers, saveOffers } from '../trade/offers.js'
import { settleOffer } from '../market/mockAgents.js'
import { pushInbox, isLiveAddr } from './pilotStore.js'

const seenKeyFor = (catalogId, accountId) => `cairn-inbox-seen:${catalogId}:${accountId}`
const readSeen = (k) => { try { const a = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(a) ? a : [] } catch { return [] } }

export function mergeInbox(catalogId, accountId, box) {
  const key = offersKeyFor(catalogId, accountId)
  const seenKey = seenKeyFor(catalogId, accountId)
  const seenList = readSeen(seenKey)
  const seen = new Set(seenList)
  const offers = loadOffers(key)
  const toSettle = []
  let changed = false

  for (const m of box || []) {
    const mk = `${m.type}:${m.id}:${m.state || ''}`
    if (!m.id || seen.has(mk)) continue
    seen.add(mk); seenList.push(mk)

    if (m.type === 'offer' && m.offer && (m.offer.cat || catalogId) === catalogId) {
      if (offers.some((o) => o.id === m.offer.id)) continue
      // stored exactly as authored, direction flipped: for dir 'in', the ledger reads
      // want/give from the author's frame already (same shape persona counters use)
      offers.unshift({ ...m.offer, dir: 'in', live: true, from: m.offer.from, state: 'sent', nextAt: null, cat: undefined })
      if (m.offer.counterOf) {
        const prev = offers.find((o) => o.id === m.offer.counterOf)
        if (prev && ['sent', 'seen'].includes(prev.state)) prev.state = 'countered'
      }
      changed = true
    } else if ((m.type === 'evidence_request' || m.type === 'evidence_response') && m.offerId && m.line) {
      const o = offers.find((x) => x.id === m.offerId)
      if (!o || !['sent', 'seen'].includes(o.state)) continue
      const event = {
        id: m.id,
        kind: m.type === 'evidence_request' ? 'request' : 'response',
        dir: 'in',
        line: String(m.line).trim().slice(0, 600),
        at: new Date(Number(m.at) || Date.now()).toISOString(),
      }
      if (!event.line) continue
      o.evidenceThread = [...(Array.isArray(o.evidenceThread) ? o.evidenceThread : []), event].slice(-20)
      changed = true
    } else if (m.type === 'response') {
      const o = offers.find((x) => x.id === m.id)
      if (!o || o.state === m.state) continue
      if (['settled', 'declined', 'withdrawn'].includes(o.state)) continue
      Object.assign(o, { state: m.state, nextAt: null }, m.extra || {})
      if (m.line) o.response = { line: m.line }
      if (m.state === 'settled') toSettle.push(o)
      changed = true
    }
  }

  if (changed) saveOffers(key, offers)
  try { localStorage.setItem(seenKey, JSON.stringify(seenList.slice(-500))) } catch { /* ignore */ }
  for (const o of toSettle) settleOffer({ catalogId, accountId, o })
  return changed
}

// Both parties press this when the physical exchange is done: it moves the cards in
// YOUR binder, marks YOUR copy settled, and tells their app — each side keeps its own
// record. The cash leg never settles here; that's escrow's job.
export function recordSettledLive(catalogId, accountId, id) {
  const key = offersKeyFor(catalogId, accountId)
  const offers = loadOffers(key)
  const o = offers.find((x) => x.id === id)
  if (!o || !o.live || !['accepted', 'escrow_locked', 'in_transit', 'delivered'].includes(o.state)) return
  o.state = 'settled'
  o.nextAt = null
  o.log = [...(o.log || []), 'Recorded settled by you — your copy of the record. Theirs updates when their app hears it.']
  saveOffers(key, offers)
  settleOffer({ catalogId, accountId, o })
  const other = o.dir === 'out' ? o.to : o.from
  if (isLiveAddr(other)) pushInbox(other, { id: o.id, type: 'response', state: 'settled' })
}
