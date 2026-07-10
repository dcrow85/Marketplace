import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, saveStore, entryFor, condStr } from './collection.js'
import { useCatalog } from '../lib/data.js'
import { handleFor, avatarSVG } from '../identity.js'
import MiniCard from '../components/MiniCard.jsx'

// Your table: a consignment ledger, not a filter. Just what you're offering — asks,
// condition, evidence status, totals. Buyers meet it in the market and offer against it.
export default function SellPile({ accountId, catalog }) {
  const data = useCatalog(catalog)
  const [store, setStore] = useState({})
  const storeKey = storeKeyFor(catalog.id, accountId)

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate per account */
    setStore(loadStore(storeKey))
  }, [storeKey])

  const rows = useMemo(() => {
    if (!data) return []
    return data.cards
      .map((c) => ({ c, e: entryFor(c, store) }))
      .filter(({ e }) => e.stance === 'have' && (e.sell || e.trade))
  }, [data, store])

  const noteKey = `cairn-table-note:${catalog.id}:${accountId || 'anon'}`
  const [note, setNoteState] = useState('')
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the table sign per account */
    try { setNoteState(localStorage.getItem(noteKey) || '') } catch { setNoteState('') }
  }, [noteKey])
  const setNote = (v) => { setNoteState(v); try { localStorage.setItem(noteKey, v) } catch { /* ignore */ } }

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
      <div className="sp-header">
        <span className="av" dangerouslySetInnerHTML={{ __html: avatarSVG(accountId, 40) }} />
        <div>
          <div className="ek">Your table</div>
          <div className="sp-title">{handleFor(accountId)}
            <span className="dim"> · {totalCards} card{totalCards === 1 ? '' : 's'} · {total} USDC asked{tradeN ? ` · ${tradeN} open to trade` : ''}{missing ? ` · ${missing} missing an ask` : ''}</span>
          </div>
        </div>
      </div>
      <input className="sp-note" maxLength={140} placeholder="your table sign — a line buyers will read when publishing lands…"
        value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="sp-tiles">
        {rows.map(({ c, e }) => (
          <MiniCard key={c.uid} c={c}
            corner={e.trade ? <span className="sp-tradeflag">⇄ trade</span> : null}
            sub={`${condStr(e)} · ${(e.pile || []).length || e.photo_hash ? '✓ scans on file' : 'no scans'}${(e.copies || 1) > 1 ? ` · ×${e.copies}` : ''}`}
            actions={<span className="sp-task">
              <span className="fpre">$</span>
              <input type="number" min="0" placeholder="ask"
                value={e.ask || ''} onChange={(ev) => setAsk(c.uid, ev.target.value)} />
            </span>} />
        ))}
      </div>
      <p className="sc-note dim">Asks are per copy. Buyers see this table in the market and make offers against it —
        cards, cash, or both. The sign and the spread are yours to curate.</p>
    </div>
  )
}
