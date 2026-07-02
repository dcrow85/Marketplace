// The ambient glance — one quiet line above the cards (Human_Surface v0.2 §Ambient glance).
// Answers "is there anything I need to do, anywhere?" across trades, calmly. Rules held:
// no counts unless they change a decision, never analytics, every alert names WHY.
// v1 watches the escrow (the only cross-trade state that exists); silent on any error.
import { useEffect, useState } from 'react'
import { getNextTradeId, getTrade } from '../chain/escrow.js'
import { useEscrowWallet } from '../trade/useEscrowWallet.js'

const eq = (a, b) => a && b && a.toLowerCase() === b.toLowerCase()
const MAX_SCAN = 40 // pilot-scale: trade ids are tiny; a subgraph replaces this later

// What, if anything, a trade asks of THIS address — and why, in plain words.
function classify(t, id, me) {
  const role = eq(me, t.buyer) ? 'buyer' : eq(me, t.seller) ? 'seller' : eq(me, t.arbiter) ? 'arbiter' : null
  if (!role) return null
  const s = t.stateName
  if (role === 'seller' && s === 'Funded') return { id, needs: 'a funded trade is waiting on your shipment' }
  if (role === 'buyer' && s === 'InspectionOpen') {
    const deadline = (Number(t.inspectionOpenedAt) + Number(t.inspectionWindow)) * 1000
    const days = Math.max(0, Math.ceil((deadline - Date.now()) / 86400000))
    return { id, needs: `inspection is open — silence favors the seller in ${days} day${days === 1 ? '' : 's'}` }
  }
  if (role === 'arbiter' && s === 'Disputed') return { id, needs: 'a dispute is waiting on your ruling' }
  if (role === 'seller' && s === 'Disputed' && !t.returnCustodyConfirmed)
    return { id, needs: 'a dispute is open — confirm return custody when the card is back' }
  if (s === 'Funded' || s === 'Shipped' || s === 'InspectionOpen' || s === 'Disputed') return { id, track: true }
  return null
}

export default function Ambient({ onOpenTrade }) {
  const { address } = useEscrowWallet()
  const [line, setLine] = useState(null) // { text, tradeId? }

  useEffect(() => {
    if (!address) { setLine(null); return } // eslint-disable-line react-hooks/set-state-in-effect -- reset when the signer disconnects
    let live = true
    ;(async () => {
      try {
        const n = Math.min(await getNextTradeId(), MAX_SCAN)
        const mine = (await Promise.all(
          Array.from({ length: Math.max(0, n - 1) }, (_, i) => getTrade(i + 1).then((t) => classify(t, i + 1, address)).catch(() => null)),
        )).filter(Boolean)
        if (!live) return
        const needs = mine.filter((m) => m.needs)
        const track = mine.filter((m) => m.track && !m.needs).length
        if (needs.length === 1) setLine({ text: `One trade needs you — ${needs[0].needs}.`, tradeId: needs[0].id })
        else if (needs.length > 1) setLine({ text: `${needs.length} trades need you — start with #${needs[0].id}: ${needs[0].needs}.`, tradeId: needs[0].id })
        else if (track > 0) setLine({ text: `${track === 1 ? 'One trade' : track + ' trades'} on track. Nothing needs you.` })
        else setLine({ text: 'Nothing needs you.' })
      } catch { if (live) setLine(null) } // ambient stays silent rather than alarming on a read hiccup
    })()
    return () => { live = false }
  }, [address])

  if (!line) return null
  return (
    <div className={'ambient' + (line.tradeId ? ' needs' : '')}>
      {line.tradeId
        ? <button onClick={() => onOpenTrade(line.tradeId)}>{line.text}</button>
        : <span>{line.text}</span>}
    </div>
  )
}
