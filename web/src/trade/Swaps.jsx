import { useEffect, useMemo, useState } from 'react'
import { storeKeyFor, loadStore, catalogUrl, entryFor, condStr } from '../binder/collection.js'
import { swapKeyFor, loadSwaps, withdrawSwap, swapSheet } from './swaps.js'
import { useEscrowWallet } from './useEscrowWallet.js'
import { handleFor } from '../identity.js'

// Card-for-card swaps: the simplest trade there is. Your card on one side, theirs on
// the other. Proposals live here until a shared backend carries them; the sheet is the
// plaintext handoff for a real counterparty. Escrow below is the money path.
export default function Swaps({ accountId, catalog }) {
  const [data, setData] = useState(null)
  const [rev, setRev] = useState(0)
  const [copied, setCopied] = useState(null)
  const { address } = useEscrowWallet()
  const swapKey = swapKeyFor(catalog.id, accountId)
  const storeKey = storeKeyFor(catalog.id, accountId)

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset on catalog switch */
    setData(null)
    fetch(catalogUrl(catalog)).then((r) => r.json()).then(setData).catch(() => {})
  }, [catalog])

  useEffect(() => {
    const bump = () => setRev((r) => r + 1)
    window.addEventListener('cairn-swaps', bump)
    return () => window.removeEventListener('cairn-swaps', bump)
  }, [])

  const swaps = useMemo(() => loadSwaps(swapKey), [swapKey, rev]) // eslint-disable-line react-hooks/exhaustive-deps -- rev is the invalidation signal
  const byUid = useMemo(() => new Map((data?.cards || []).map((c) => [c.uid, c])), [data])
  const store = useMemo(() => loadStore(storeKey), [storeKey, rev]) // eslint-disable-line react-hooks/exhaustive-deps -- rev is the invalidation signal

  if (!swaps.length || !data) return null

  const copy = async (sw) => {
    const theirCard = byUid.get(sw.their.uid) || { uid: sw.their.uid }
    const mineCard = byUid.get(sw.mine.uid) || { uid: sw.mine.uid }
    const text = swapSheet({ theirCard, mineCard, mineCond: mineCard.uid ? condStr(entryFor(mineCard, store)) : '', sellerId: sw.their.seller, myId: address || accountId })
    try { await navigator.clipboard.writeText(text) } catch { return }
    setCopied(sw.id)
    setTimeout(() => setCopied(null), 2200)
  }

  return (
    <div className="sw">
      <div className="sw-head">
        <span className="ek">Swaps</span>
        <span className="mono dim">{swaps.length} proposed</span>
      </div>
      {swaps.map((sw) => {
        const their = byUid.get(sw.their.uid)
        const mine = byUid.get(sw.mine.uid)
        return (
          <div key={sw.id} className="sw-row">
            <div className="sw-pair">
              <span className="sw-card">{mine?.name_en || sw.mine.uid}<span className="mono mk-num">{mine?.num}</span></span>
              <span className="sw-arrow mono">⇄</span>
              <span className="sw-card">{their?.name_en || sw.their.uid}<span className="mono mk-num">{their?.num}</span></span>
            </div>
            <span className="mono sw-who">{handleFor(sw.their.seller)} · {sw.at}</span>
            <span className="sw-acts">
              <button className="sheetbtn mk-sm mono" onClick={() => copy(sw)}>{copied === sw.id ? '✓ copied' : '⎘ sheet'}</button>
              <button className="sheetbtn mk-sm mono" onClick={() => withdrawSwap(swapKey, sw.id)}>✕ withdraw</button>
            </span>
          </div>
        )
      })}
      <p className="sc-note dim">Yours on the left, theirs on the right. Sample sellers can&rsquo;t answer; with a real trader
        you&rsquo;d send the sheet. Settling a swap — both cards moving, accountably — is not built yet: today only the
        escrowed money path below settles.</p>
    </div>
  )
}
