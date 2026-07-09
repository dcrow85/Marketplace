import { useEffect, useMemo, useState } from 'react'
import { catalogUrl } from '../binder/collection.js'
import { offersKeyFor, loadOffers, withdrawOffer, clearOffer, offerSheet, OFFER_SETTLING } from './offers.js'
import { acceptIncoming, declineIncoming } from '../market/mockAgents.js'
import { handleFor } from '../identity.js'

// The offers ledger: every conversation, both directions, counters chained. An
// accepted offer walks the settlement steps right here; everything else shows its
// state and the actions that state allows. One object, one ledger.
const FLOW = ['accepted', 'escrow_locked', 'in_transit', 'delivered', 'settled']
const FLOW_LABEL = { accepted: 'accepted', escrow_locked: 'escrow', in_transit: 'in transit', delivered: 'delivered', settled: 'settled' }

export default function Offers({ accountId, catalog, onCounter }) {
  const [data, setData] = useState(null)
  const [rev, setRev] = useState(0)
  const [copied, setCopied] = useState(null)
  const key = offersKeyFor(catalog.id, accountId)

  useEffect(() => {
    fetch(catalogUrl(catalog)).then((r) => r.json()).then(setData).catch(() => {})
  }, [catalog])

  useEffect(() => {
    const bump = () => setRev((r) => r + 1)
    window.addEventListener('cairn-offers', bump)
    window.addEventListener('cairn-store', bump)
    return () => { window.removeEventListener('cairn-offers', bump); window.removeEventListener('cairn-store', bump) }
  }, [])

  const offers = useMemo(() => loadOffers(key), [key, rev]) // eslint-disable-line react-hooks/exhaustive-deps -- rev is the invalidation signal
  const byUid = useMemo(() => new Map((data?.cards || []).map((c) => [c.uid, c])), [data])

  if (!offers.length || !data) return null
  const nm = (x) => byUid.get(x.uid)?.name_en || x.uid
  const copy = async (o) => {
    try { await navigator.clipboard.writeText(offerSheet({ offer: o, byUid, myId: accountId })) } catch { return }
    setCopied(o.id); setTimeout(() => setCopied(null), 2200)
  }

  return (
    <div className="ofl">
      <div className="sw-head">
        <span className="ek">Offers</span>
        <span className="mono dim">{offers.length} · counters are just new offers, linked</span>
      </div>
      {offers.map((o) => {
        const other = o.dir === 'out' ? o.to : o.from
        const open = ['sent', 'seen'].includes(o.state)
        const settling = OFFER_SETTLING.includes(o.state) || o.state === 'settled'
        const idx = FLOW.indexOf(o.state)
        return (
          <div key={o.id} className={'ofl-row' + (o.state === 'settled' ? ' done' : '') + (o.state === 'countered' || o.state === 'withdrawn' || o.state === 'declined' ? ' closed' : '')}>
            <div className="ofl-top">
              <span className="mono ofl-dir">{o.dir === 'out' ? '→ to' : '← from'} <b>{handleFor(other)}</b> · {o.at}{o.counterOf ? ' · counter' : ''}</span>
              <span className={'mono ofl-st st-' + o.state}>{o.state.replace('_', ' ')}</span>
            </div>
            <div className="ofl-baskets">
              <span className="ofl-side"><i className="mono dim">you get</i> {(o.dir === 'out' ? o.want : o.give).map(nm).join(', ') || '—'}</span>
              <span className="sw-arrow mono">⇄</span>
              <span className="ofl-side"><i className="mono dim">you give</i> {(o.dir === 'out' ? o.give : o.want).map(nm).join(', ') || '—'}</span>
              {o.cash && <span className="mono ofl-cash">{(o.dir === 'out' ? o.cash.side === 'from' : o.cash.side === 'to') ? 'you' : 'they'} add {o.cash.amount} USDC</span>}
            </div>
            {o.response?.line && <div className="sw-say"><span className="mono dim">their agent</span> {o.response.line}</div>}
            {settling && (
              <div className="mt-steps mono">
                {FLOW.map((s, i) => (
                  <span key={s} className={'mt-step' + (i <= idx ? ' on' : '') + (s === 'settled' && o.state === 'settled' ? ' ok' : '')}>
                    {i <= idx ? '✓ ' : ''}{FLOW_LABEL[s]}
                  </span>
                ))}
              </div>
            )}
            {(o.log || []).slice(-1).map((l, i) => <div key={i} className="mt-line"><span className="mono dim">rail</span> {l}</div>)}
            <span className="sw-acts">
              {o.dir === 'in' && open && <>
                <button className="sheetbtn mk-sm mono sw-boot" onClick={() => acceptIncoming(key, o.id)}>✓ accept</button>
                <button className="sheetbtn mk-sm mono" onClick={() => onCounter && onCounter(o)}>⇄ counter</button>
                <button className="sheetbtn mk-sm mono" onClick={() => declineIncoming(key, o.id)}>✕ decline</button>
              </>}
              {o.dir === 'out' && open && <button className="sheetbtn mk-sm mono" onClick={() => withdrawOffer(key, o.id)}>✕ withdraw</button>}
              <button className="sheetbtn mk-sm mono" onClick={() => copy(o)}>{copied === o.id ? '✓ copied' : '⎘ sheet'}</button>
              {!open && !OFFER_SETTLING.includes(o.state) && <button className="sheetbtn mk-sm mono" onClick={() => clearOffer(key, o.id)}>✕ clear</button>}
            </span>
          </div>
        )
      })}
      <p className="sc-note dim">An offer is a message, not a lock — settlement here is a rehearsal against personas in
        your browser. The real rail is the same steps on escrow, with an arbiter named.</p>
    </div>
  )
}
