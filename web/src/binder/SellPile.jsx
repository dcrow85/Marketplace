import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, saveStore, catalogUrl, entryFor, condStr } from './collection.js'

// Your table: a consignment ledger, not a filter. Just what you're offering — asks,
// condition, evidence status, totals. Buyers meet it in the market and offer against it.
export default function SellPile({ accountId, catalog }) {
  const [data, setData] = useState(null)
  const [store, setStore] = useState({})
  const storeKey = storeKeyFor(catalog.id, accountId)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset + hydrate on catalog switch */
    setData(null)
    setStore(loadStore(storeKey))
    fetch(catalogUrl(catalog)).then((r) => r.json()).then(setData).catch(() => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [catalog, storeKey])

  const rows = useMemo(() => {
    if (!data) return []
    return data.cards
      .map((c) => ({ c, e: entryFor(c, store) }))
      .filter(({ e }) => e.stance === 'have' && (e.sell || e.trade))
  }, [data, store])

  const setAsk = (uid, v) => {
    setStore((prev) => {
      const next = { ...prev, [uid]: { ...(prev[uid] || {}), ask: v } }
      saveStore(storeKey, next)
      return next
    })
  }

  const priced = rows.filter(({ e }) => e.sell && Number(e.ask) > 0)
  const totalCards = rows.reduce((s, { e }) => s + (e.copies || 1), 0)
  const total = priced.reduce((s, { e }) => s + Number(e.ask) * (e.copies || 1), 0)
  const missing = rows.filter(({ e }) => e.sell && !(Number(e.ask) > 0)).length
  const tradeN = rows.filter(({ e }) => e.trade).length


  if (!data) return <div className="empty">Opening your table…</div>
  if (!rows.length) {
    return <div className="empty">Your table is empty. Open a card you Have and mark it “List for sale” or “Open to trade” — it shows up here.</div>
  }

  return (
    <div className="sp">
      <div className="sp-head">
        <div>
          <div className="ek">Your table</div>
          <div className="sp-title">{totalCards} card{totalCards === 1 ? '' : 's'}
            <span className="dim"> · {total} USDC asked{tradeN ? ` · ${tradeN} open to trade` : ''}{missing ? ` · ${missing} missing an ask` : ''}</span>
          </div>
        </div>
      </div>
      <div className="sp-rows">
        {rows.map(({ c, e }) => (
          <div key={c.uid} className="sp-row">
            <span className="sp-name">{c.name_en || c.uid}
              {(e.copies || 1) > 1 && <span className="mono dim"> ×{e.copies}</span>}
              <span className="mono sp-num">{c.num}</span>
            </span>
            <span className="mono sp-cond">{condStr(e)}{e.trade ? ' · ⇄ trade' : ''}</span>
            <span className="mono sp-wit">{(e.pile || []).length || e.photo_hash ? '✓ witness' : '—'}</span>
            <span className="sp-ask">
              <span className="fpre">$</span>
              <input className="ti num" type="number" min="0" placeholder="ask"
                value={e.ask || ''} onChange={(ev) => setAsk(c.uid, ev.target.value)} />
            </span>
          </div>
        ))}
      </div>
      <p className="sc-note dim">Asks are per copy. Buyers see this table in the market and make offers against it —
        cards, cash, or both.</p>
    </div>
  )
}
