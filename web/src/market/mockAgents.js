// The mock market's other side: seller AGENTS that answer OFFERS. Each persona reads
// a basket (their cards out, your cards in, cash either way), decides in character on
// its own clock, and counters with the baskets edited — a counter is just a new offer
// linked to the old one. Everything here is a rehearsal: it writes only local mock
// state, no funds move, and settlements are tagged mock wherever they surface.
import { loadStore, saveStore } from '../binder/collection.js'
import { loadOffers, saveOffers, OFFER_SETTLING } from '../trade/offers.js'
import { IS_LOCAL_CHAIN } from '../chain/config.js'

export const mockSalesKeyFor = (catalogId) => `cairn-mock-sales:${catalogId}`
export const hiddenKeyFor = (catalogId, accountId) => `cairn-mock-hidden:${catalogId}:${accountId}`

const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || fb) } catch { return JSON.parse(fb) } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

export const loadMockSales = (k) => read(k, '{}')
export const loadHidden = (k) => read(k, '[]')

// rarity ladder for basket judgment — an agent compares what it can rank, nothing more.
// Cash converts at ~4 USDC per rung: crude on purpose; personas differ around it.
const LADDER = ['C', 'UC', 'R', 'SR', 'IKZ', 'L', 'G', 'IKZ ★', 'SR ★', 'L ★', 'G ★', 'SR ★★', 'L ★★']
const rank = (r) => { const i = LADDER.indexOf(r); return i === -1 ? 0 : i + 1 }
const CASH_PER_RUNG = 4

// Personas: how each seller's agent weighs an offer and speaks. slack = how many rungs
// short they'll let you be before countering; perRung = the boot they ask per rung.
const PERSONAS = {
  '0xa4c1': { // Veteran Curator — fair, brisk, everything documented
    delay: [3000, 6000], slack: 0, perRung: 4, swaps: true,
    accept: () => 'Even by my book. Accepted — scans exchanged on settle.',
    counter: (boot) => `Close, but my side carries more. Add ${boot} USDC and we shake.`,
    decline: () => 'Too far apart. Bring a heavier basket and I’ll look again.',
    buy: () => 'Accepted. Ships in tomorrow’s batch — the pile scans travel with it.',
  },
  '0xb982': { // Pristine Completionist — cash only, asks are firm
    delay: [6000, 10000], swaps: false,
    buy: () => 'The asks were firm and you met them. Documentation follows the cards.',
    decline: () => 'I don’t swap out of the collection — cash asks only. Nothing personal.',
  },
  '0xe338': { // Sharp Sleever — fast, eager, undocumented
    delay: [1200, 2500], slack: 2, perRung: 3, swaps: true, buyFloor: 0.6,
    accept: () => 'Deal. Fast and simple.',
    counter: (boot) => `Throw in ${boot} USDC and it ships today.`,
    decline: () => 'Not worth my postage. Pass.',
    buy: () => 'Done. Goes out today. (No scans on file — you knew that.)',
  },
  '0xd54a': { // Quiet Keeper — swaps first, small boots
    delay: [4000, 8000], slack: 0, perRung: 2, swaps: true,
    accept: () => 'Like for like — that’s what tables are for. Accepted.',
    counter: (boot) => `I’d do it with ${boot} USDC on top — my side grades a shade heavier.`,
    decline: () => 'That basket doesn’t reach my side of the table. Pass.',
    buy: () => 'Sold — it funds the hunt. Thanks for reading the table.',
  },
  '0x5989': { // the rehearsal desk — a scripted seller (NOT Anko; the house agent never sells)
    delay: [2500, 5000], slack: 0, perRung: 3, swaps: true,
    accept: () => 'Fair on both sides — accepted. Watch the ledger: it records like any settlement.',
    counter: (boot) => `I’ll meet you at your basket + ${boot} USDC — that’s where the recorded settlements put the gap.`,
    decline: () => 'The gap’s too wide for a counter to close politely. Pass.',
    buy: () => 'Accepted — terms locked, escrow next (mock), witness travels with the cards.',
  },
}
const personaFor = (sellerId) => PERSONAS[(sellerId || '').slice(0, 6)] || PERSONAS['0xa4c1']
const between = ([a, b]) => a + Math.random() * (b - a)

// Settlement chain once an offer is accepted (either side): narrated, then consequences.
const FLOW = ['accepted', 'escrow_locked', 'in_transit', 'delivered', 'settled']
const FLOW_LINES = {
  escrow_locked: (o) => o.cash ? `Escrow locked (mock) — ${o.cash.amount} USDC held.` : 'Terms locked (mock) — no cash leg on this one.',
  in_transit: () => 'Cards moving both ways. Witness scans ride with them.',
  delivered: () => 'Delivered. Inspection windows open on both sides.',
  settled: () => 'Settled (mock) — recorded to both binders.',
}
const FLOW_DWELL = [2500, 5000]

function valueOf(cards, cashUsdc, byUid) {
  const rungs = cards.reduce((s, x) => s + rank(byUid.get(x.uid)?.rarity), 0)
  return rungs + (cashUsdc || 0) / CASH_PER_RUNG
}

function decide({ o, byUid, askOf }) {
  const p = personaFor(o.to)
  const cashFrom = o.cash?.side === 'from' ? o.cash.amount : 0
  const cashTo = o.cash?.side === 'to' ? o.cash.amount : 0
  // pure buy: no cards from your side — judged against the asks, not the ladder
  if (!o.give.length && cashFrom > 0) {
    const asks = o.want.reduce((s, w) => s + (askOf(o.to, w.uid) ?? 0), 0)
    const floor = (p.buyFloor ?? 1) * asks
    if (cashFrom >= floor) return { verdict: 'accepted', line: (p.buy || p.accept)() }
    return { verdict: 'countered', cash: { side: 'from', amount: asks }, line: `The asks come to ${asks} USDC — meet them and it’s done.` }
  }
  if (!p.swaps) return { verdict: 'declined', line: p.decline() }
  const mineIn = valueOf(o.give, cashFrom, byUid)   // what the persona receives
  const mineOut = valueOf(o.want, cashTo, byUid)    // what the persona gives up
  const gap = mineOut - mineIn
  if (gap <= (p.slack ?? 0)) return { verdict: 'accepted', line: p.accept() }
  const boot = Math.max(1, Math.ceil(gap * (p.perRung ?? 3)))
  if (gap > 4) return { verdict: 'declined', line: p.decline() }
  return { verdict: 'countered', cash: { side: 'from', amount: cashFrom + boot }, line: p.counter(boot) }
}

export function settleOffer({ catalogId, accountId, o }) {
  const storeKey = accountId ? `cairn-cards:${catalogId}:${accountId}` : `cairn-cards:${catalogId}`
  const store = loadStore(storeKey)
  const next = { ...store }
  const other = o.dir === 'out' ? o.to : o.from
  const gets = o.dir === 'out' ? o.want : o.give
  const gives = o.dir === 'out' ? o.give : o.want
  for (const w of gets) {
    const u = { ...(next[w.uid] || {}) }
    u.stance = 'have'
    u.note = [(u.note || '').trim(), `acquired in mock offer ${o.id}${o.cash ? ` · cash leg ${o.cash.amount} USDC` : ''}`].filter(Boolean).join('\n')
    next[w.uid] = u
  }
  for (const g of gives) {
    const u = { ...(next[g.uid] || {}) }
    u.stance = 'none'; u.sell = false; u.trade = false; u.grail = false
    u.note = [(u.note || '').trim(), `traded away in mock offer ${o.id}`].filter(Boolean).join('\n')
    next[g.uid] = u
  }
  saveStore(storeKey, next)
  const hk = hiddenKeyFor(catalogId, accountId)
  write(hk, [...loadHidden(hk), ...gets.map((w) => ({ seller: other, uid: w.uid }))])
  // a price is only a recorded fact when the trade WAS a price: one card, cash, no basket
  if (!gives.length && o.cash && gets.length === 1) {
    const sk = mockSalesKeyFor(catalogId)
    const sales = loadMockSales(sk)
    sales[gets[0].uid] = [{ d: new Date().toISOString().slice(0, 10), p: o.cash.amount, cond: 'raw', wit: true, mock: true }, ...(sales[gets[0].uid] || [])]
    write(sk, sales)
  }
  window.dispatchEvent(new CustomEvent('cairn-store'))
}

// The engine: one ticker reads every open conversation and advances what's due.
export function startMockMarket({ catalogId, accountId, byUid, askOf }) {
  const key = accountId ? `cairn-offers:${catalogId}:${accountId}` : `cairn-offers:${catalogId}`

  const tick = () => {
    const now = Date.now()
    const offers = loadOffers(key)
    let changed = false
    for (const o of offers) {
      // catch-up loop: browsers throttle timers in hidden tabs, and a user can be gone
      // for hours — every transition that came due while we weren't ticking runs now.
      // One offer that throws must never stall the rest: it gets declined and skipped.
      try {
      for (let hop = 0; hop < 8; hop++) {
        if (['declined', 'withdrawn', 'settled', 'countered'].includes(o.state)) break
        const p = personaFor(o.dir === 'out' ? o.to : o.from)
        if (o.dir === 'out' && o.state === 'sent' && !o.nextAt) { o.nextAt = now + between(p.delay) / 2; changed = true; break }
        if (!o.nextAt || o.nextAt > now) break
        step(o, p, now, offers)
        changed = true
      }
      } catch {
        o.state = 'declined'
        o.nextAt = null
        o.response = { line: 'Their agent couldn’t read that offer — cleared.' }
        changed = true
      }
    }
    if (changed) saveOffers(key, offers)
  }

  const step = (o, p, now, offers) => {
    {
      if (o.dir === 'out' && o.state === 'sent') {
        o.state = 'seen'
        o.nextAt = o.nextAt + between(p.delay) // chain from the due time so catch-up can hop
      } else if (o.dir === 'out' && o.state === 'seen') {
        const d = decide({ o, byUid, askOf })
        if (d.verdict === 'countered') {
          o.state = 'countered'
          o.nextAt = null
          o.response = { line: d.line }
          offers.unshift({
            id: 'of_' + Math.random().toString(36).slice(2, 10),
            dir: 'in', from: o.to, at: new Date().toISOString().slice(0, 10),
            want: o.give, give: o.want,
            // d.cash says who pays in the ORIGINAL offer's frame; the counter is written
            // in the persona's frame, so the side flips ('you pay' stays you paying).
            cash: d.cash ? { side: d.cash.side === 'from' ? 'to' : 'from', amount: d.cash.amount } : null,
            counterOf: o.id, state: 'sent', response: { line: d.line },
          })
        } else {
          o.state = d.verdict
          o.response = { line: d.line }
          if (d.verdict === 'accepted' && IS_LOCAL_CHAIN && o.cash && (o.dir === 'out' ? o.cash.side === 'from' : o.cash.side === 'to')) {
            o.rail = 'chain' // the local EVM settles this one for real
            o.nextAt = null
          } else {
            o.nextAt = d.verdict === 'accepted' ? o.nextAt + between(FLOW_DWELL) : null
          }
        }
      } else if (o.rail === 'chain') {
        o.nextAt = null // the chain rail owns this one
      } else if (OFFER_SETTLING.includes(o.state)) {
        const i = FLOW.indexOf(o.state)
        o.state = FLOW[i + 1]
        o.log = [...(o.log || []), FLOW_LINES[o.state](o)]
        if (o.state === 'settled') { o.nextAt = null; settleOffer({ catalogId, accountId, o }) }
        else o.nextAt = o.nextAt + between(FLOW_DWELL) // chain from the due time so catch-up can hop
      } else { o.nextAt = null }
    }
  }

  const timer = setInterval(tick, 1800)
  const wake = () => tick()
  window.addEventListener('focus', wake)
  document.addEventListener('visibilitychange', wake)
  tick()
  return () => { clearInterval(timer); window.removeEventListener('focus', wake); document.removeEventListener('visibilitychange', wake) }
}

// You accept an incoming offer (usually a counter) — the engine settles it from here.
export function acceptIncoming(key, id) {
  const offers = loadOffers(key)
  const o = offers.find((x) => x.id === id)
  if (!o || o.dir !== 'in' || !['sent', 'seen'].includes(o.state)) return
  o.state = 'accepted'
  if (IS_LOCAL_CHAIN && o.cash && o.cash.side === 'to') {
    o.rail = 'chain' // you pay, the local EVM settles it for real
    o.nextAt = null
  } else {
    o.nextAt = Date.now() + 1500
  }
  saveOffers(key, offers)
}

export function declineIncoming(key, id) {
  const offers = loadOffers(key)
  const o = offers.find((x) => x.id === id)
  if (!o || o.dir !== 'in' || !['sent', 'seen'].includes(o.state)) return
  o.state = 'declined'
  o.nextAt = null
  saveOffers(key, offers)
}
