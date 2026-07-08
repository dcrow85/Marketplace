// The mock market's other side: seller AGENTS that answer. Each persona decides and
// talks in character, on its own clock. Everything here is clearly a rehearsal — it
// writes only local mock state, and every artifact it produces says so. The point is
// to feel the LOOP (offer → response → escrow → ship → settle → record), not to fake
// a chain: no funds move, and settlements are tagged mock wherever they surface.
import { loadSwaps, saveSwaps } from '../trade/swaps.js'
import { loadStore, saveStore } from '../binder/collection.js'

export const tradesKeyFor = (catalogId, accountId) => `cairn-mock-trades:${catalogId}:${accountId}`
export const mockSalesKeyFor = (catalogId) => `cairn-mock-sales:${catalogId}`
export const hiddenKeyFor = (catalogId, accountId) => `cairn-mock-hidden:${catalogId}:${accountId}`

const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || fb) } catch { return JSON.parse(fb) } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }
const bump = () => window.dispatchEvent(new CustomEvent('cairn-mock'))

export const loadTrades = (k) => read(k, '[]')
export const loadMockSales = (k) => read(k, '{}')
export const loadHidden = (k) => read(k, '[]')

// rarity ladder for swap judgment — an agent compares cards it can rank, nothing more
const LADDER = ['C', 'UC', 'R', 'SR', 'IKZ', 'L', 'G', 'IKZ ★', 'SR ★', 'L ★', 'G ★', 'SR ★★', 'L ★★']
const rank = (r) => { const i = LADDER.indexOf(r); return i === -1 ? 0 : i }

// Personas: how each seller's agent decides and speaks. delayMs paces the whole
// conversation so responses land while you watch, not instantly (agents "think").
const PERSONAS = {
  '0xa4c1': { // Veteran Curator — fair, brisk, everything documented
    delay: [3000, 6000],
    acceptBuy: () => true,
    buyLine: (c) => `Accepted. ${c} ships in tomorrow's batch — the pile scan travels with it.`,
    swap: (mine, theirs) => rank(mine) >= rank(theirs)
      ? { verdict: 'accepted', line: 'Even trade by my book. Accepted — scans exchanged on settle.' }
      : { verdict: 'countered', boot: 4, line: 'Close, but my side is the heavier card. Add 4 USDC and we shake.' },
  },
  '0xb982': { // Pristine Completionist — firm asks, no swaps
    delay: [6000, 10000],
    acceptBuy: () => true,
    buyLine: (c) => `The ask was firm and you met it. ${c} is double-sleeved already; documentation follows the card.`,
    swap: () => ({ verdict: 'declined', line: 'I don’t swap out of the collection — cash asks only. Nothing personal.' }),
  },
  '0xe338': { // Sharp Sleever — fast, eager, undocumented
    delay: [1200, 2500],
    acceptBuy: () => true,
    buyLine: (c) => `Done. ${c} goes out today. (No scan on file — you knew that.)`,
    swap: (mine) => rank(mine) >= 2
      ? { verdict: 'accepted', line: 'Deal. Fast and simple.' }
      : { verdict: 'declined', line: 'Not worth my postage. Pass.' },
  },
  '0xd54a': { // Quiet Keeper — swaps first, small boots
    delay: [4000, 8000],
    acceptBuy: () => true,
    buyLine: (c) => `Sold — ${c} helps fund the hunt. Thanks for reading the table.`,
    swap: (mine, theirs) => rank(mine) > rank(theirs)
      ? { verdict: 'accepted', line: 'You’re trading down to my gain — accepted before you reconsider.' }
      : rank(mine) === rank(theirs)
        ? { verdict: 'accepted', line: 'Like for like. That’s what tables are for. Accepted.' }
        : { verdict: 'countered', boot: 2, line: 'I’d do it with 2 USDC on top — my side grades a shade heavier.' },
  },
  '0x5989': { // the rehearsal desk — a scripted seller (NOT Anko; the house agent never sells)
    delay: [2500, 5000],
    acceptBuy: () => true,
    buyLine: (c) => `Accepted — and I’ll narrate the rail as we go: terms locked, escrow next (mock), then the witness travels with ${c}. You’ll see the settlement land in the card’s ledger.`,
    swap: (mine, theirs) => rank(mine) >= rank(theirs)
      ? { verdict: 'accepted', line: 'Fair on both sides — accepted. Watch the ledger: the swap records like any other settlement.' }
      : { verdict: 'countered', boot: 3, line: 'I’ll meet you at your card + 3 USDC — that’s where the recorded settlements put the gap.' },
  },
}
const personaFor = (sellerId) => PERSONAS[(sellerId || '').slice(0, 6)] || PERSONAS['0xa4c1']
const between = ([a, b]) => a + Math.random() * (b - a)

// Buy-trade state machine: each state dwells, then advances; the log narrates.
const BUY_FLOW = ['offered', 'accepted', 'escrow_funded', 'shipped', 'delivered', 'settled']
const FLOW_LINES = {
  escrow_funded: () => 'Escrow funded (mock) — terms and ask locked.',
  shipped: () => 'Shipped. Tracking rides the trade record.',
  delivered: () => 'Delivered. Inspection window open — the release is yours.',
  settled: (t) => `Settled (mock) — ${t.ask} USDC released, card recorded to your binder.`,
}
const FLOW_DWELL = { accepted: [2500, 4500], escrow_funded: [2500, 4500], shipped: [3500, 6000], delivered: [3000, 5000] }

export function startBuy({ catalogId, accountId, card, seller, ask, cond }) {
  const k = tradesKeyFor(catalogId, accountId)
  const trades = loadTrades(k)
  const t = {
    id: 'mt_' + Math.random().toString(36).slice(2, 10),
    uid: card.uid, name: card.name_en || card.uid, num: card.num,
    seller: seller.id, ask, cond,
    state: 'offered', at: new Date().toISOString().slice(0, 10),
    nextAt: Date.now() + between(personaFor(seller.id).delay),
    log: [{ who: 'you', line: `Offer sent at the ask — ${ask} USDC.` }],
  }
  trades.unshift(t)
  write(k, trades)
  bump()
  return t.id
}

function settleBuy({ catalogId, accountId, t }) {
  const storeKey = accountId ? `cairn-cards:${catalogId}:${accountId}` : `cairn-cards:${catalogId}`
  const store = loadStore(storeKey)
  const u = { ...(store[t.uid] || {}) }
  u.stance = 'have'
  u.note = [(u.note || '').trim(), `acquired in mock trade ${t.id} · ${t.ask} USDC`].filter(Boolean).join('\n')
  saveStore(storeKey, { ...store, [t.uid]: u })
  const sk = mockSalesKeyFor(catalogId)
  const sales = loadMockSales(sk)
  sales[t.uid] = [{ d: new Date().toISOString().slice(0, 10), p: t.ask, cond: t.cond || 'raw', wit: true, mock: true }, ...(sales[t.uid] || [])]
  write(sk, sales)
  const hk = hiddenKeyFor(catalogId, accountId)
  write(hk, [...loadHidden(hk), { seller: t.seller, uid: t.uid }])
  window.dispatchEvent(new CustomEvent('cairn-store'))
}

function settleSwap({ catalogId, accountId, sw, boot }) {
  const storeKey = accountId ? `cairn-cards:${catalogId}:${accountId}` : `cairn-cards:${catalogId}`
  const store = loadStore(storeKey)
  const next = { ...store }
  const gained = { ...(next[sw.their.uid] || {}) }
  gained.stance = 'have'
  gained.note = [(gained.note || '').trim(), `acquired in mock swap ${sw.id}${boot ? ` · +${boot} USDC boot` : ''}`].filter(Boolean).join('\n')
  next[sw.their.uid] = gained
  const given = { ...(next[sw.mine.uid] || {}) }
  given.stance = 'none'; given.sell = false; given.trade = false
  given.note = [(given.note || '').trim(), `traded away in mock swap ${sw.id}`].filter(Boolean).join('\n')
  next[sw.mine.uid] = given
  saveStore(storeKey, next)
  const hk = hiddenKeyFor(catalogId, accountId)
  write(hk, [...loadHidden(hk), { seller: sw.their.seller, uid: sw.their.uid }])
  window.dispatchEvent(new CustomEvent('cairn-store'))
}

// The engine: one ticker advances every due conversation while the app is open.
export function startMockMarket({ catalogId, accountId, cardName }) {
  const tk = tradesKeyFor(catalogId, accountId)
  const swapKey = accountId ? `cairn-swaps:${catalogId}:${accountId}` : `cairn-swaps:${catalogId}`

  const tick = () => {
    const now = Date.now()
    // buy trades advance through the flow
    let trades = loadTrades(tk); let changed = false
    for (const t of trades) {
      if (t.state === 'settled' || t.state === 'declined' || !t.nextAt || t.nextAt > now) continue
      const p = personaFor(t.seller)
      if (t.state === 'offered') {
        if (p.acceptBuy(t)) {
          t.state = 'accepted'
          t.log.push({ who: 'seller', line: p.buyLine(t.name) })
        } else {
          t.state = 'declined'
          t.log.push({ who: 'seller', line: 'Declined.' })
        }
      } else {
        const i = BUY_FLOW.indexOf(t.state)
        const nextState = BUY_FLOW[i + 1]
        t.state = nextState
        t.log.push({ who: 'rail', line: FLOW_LINES[nextState](t) })
        if (nextState === 'settled') settleBuy({ catalogId, accountId, t })
      }
      t.nextAt = t.state === 'settled' || t.state === 'declined' ? null : now + between(FLOW_DWELL[t.state] || [3000, 5000])
      changed = true
    }
    if (changed) { write(tk, trades); bump() }

    // swap proposals get answers; accepted ones settle after a beat
    let swaps = loadSwaps(swapKey); let swChanged = false
    for (const sw of swaps) {
      if (sw.status === 'proposed' && !sw.nextAt) { sw.nextAt = now + between(personaFor(sw.their.seller).delay); swChanged = true; continue }
      if (!sw.nextAt || sw.nextAt > now) continue
      if (sw.status === 'proposed') {
        const mine = cardName(sw.mine.uid), theirs = cardName(sw.their.uid)
        const v = personaFor(sw.their.seller).swap(mine?.rarity, theirs?.rarity)
        sw.status = v.verdict
        sw.response = { line: v.line, boot: v.boot || 0 }
        sw.nextAt = v.verdict === 'accepted' ? now + 2500 : null
        swChanged = true
      } else if (sw.status === 'accepted') {
        sw.status = 'settled'
        sw.nextAt = null
        settleSwap({ catalogId, accountId, sw, boot: 0 })
        swChanged = true
      } else if (sw.status === 'counter_accepted') {
        sw.status = 'settled'
        sw.nextAt = null
        settleSwap({ catalogId, accountId, sw, boot: sw.response?.boot || 0 })
        swChanged = true
      }
    }
    if (swChanged) { saveSwaps(swapKey, swaps) }
  }

  const timer = setInterval(tick, 1800)
  tick()
  return () => clearInterval(timer)
}

// user accepts a counter (boot on top) — the engine settles it next beat
export function acceptCounter(swapKey, id) {
  const swaps = loadSwaps(swapKey)
  const sw = swaps.find((x) => x.id === id)
  if (!sw || sw.status !== 'countered') return
  sw.status = 'counter_accepted'
  sw.nextAt = Date.now() + 1500
  saveSwaps(swapKey, swaps)
}

export function dismissTrade(k, id) {
  write(k, loadTrades(k).filter((t) => t.id !== id))
  bump()
}
