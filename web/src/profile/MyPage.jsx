// My page: your binder's public lens, pointed at yourself — exactly what the room
// sees. Front page (pride), table (deals), the hunt (wants, public by design), and
// the record strip with facts computed from records. Absorbs the old SellPile.
import { useMemo, useState, useEffect } from 'react'
import { storeKeyFor, loadStore, saveStore, entryFor, condStr } from '../binder/collection.js'
import { offersKeyFor, loadOffers } from '../trade/offers.js'
import { pinsKeyFor, loadPins, togglePin } from './pins.js'
import { publishProfile, unpublishProfile, isLiveAddr } from '../live/pilotStore.js'
import { handleFor } from '../identity.js'
import { useCatalog, useByUid } from '../lib/data.js'
import { useBus } from '../lib/store.js'
import MiniCard from '../components/MiniCard.jsx'
import ProfileHeader from './ProfileHeader.jsx'
import FrontPage from './FrontPage.jsx'

export default function MyPage({ accountId, catalog }) {
  const data = useCatalog(catalog)
  const byUid = useByUid(data)
  const storeKey = storeKeyFor(catalog.id, accountId)
  const pinsKey = pinsKeyFor(catalog.id, accountId)
  const store = useBus(() => loadStore(storeKey), [storeKey])
  const pins = useBus(() => loadPins(pinsKey), [pinsKey])

  const noteKey = `cairn-table-note:${catalog.id}:${accountId || 'anon'}`
  const [sign, setSignState] = useState('')
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the sign per account */
    try { setSignState(localStorage.getItem(noteKey) || '') } catch { setSignState('') }
  }, [noteKey])
  const setSign = (v) => { setSignState(v); try { localStorage.setItem(noteKey, v) } catch { /* ignore */ } }

  const rows = useMemo(() => {
    if (!data) return { haves: [], listed: [], wants: [], grails: [] }
    const all = data.cards.map((c) => ({ c, e: entryFor(c, store) }))
    return {
      haves: all.filter(({ e }) => e.stance === 'have'),
      listed: all.filter(({ e }) => e.stance === 'have' && (e.sell || e.trade)),
      wants: all.filter(({ e }) => e.stance === 'want'),
      grails: all.filter(({ e }) => e.grail && e.stance === 'have'),
    }
  }, [data, store])

  // the record strip: computed, never asserted
  const stats = useBus(() => {
    const offers = loadOffers(offersKeyFor(catalog.id, accountId))
    const settled = offers.filter((o) => o.state === 'settled').length
    const listed = rows.listed
    const scanned = listed.filter(({ e }) => (e.pile || []).length || e.photo_hash).length
    const out = []
    if (rows.haves.length) out.push({ t: `${rows.haves.length} held` })
    if (settled) out.push({ t: `${settled} settled`, rec: true })
    if (listed.length) out.push({ t: scanned === listed.length && scanned > 0 ? 'every listing scanned' : `${scanned}/${listed.length} listings scanned`, rec: scanned > 0 })
    if (data) {
      const fam = data.cards.filter((c) => c.release_family === 'gates_awakened')
      const have = fam.filter((c) => entryFor(c, store).stance === 'have').length
      if (have) out.push({ t: `Gates ${have}/${fam.length}` })
    }
    return out
  }, [catalog, accountId, rows, data])

  const setAsk = (uid, v) => {
    const next = { ...store, [uid]: { ...(store[uid] || {}), ask: v } }
    saveStore(storeKey, next)
  }

  // publishing: your page, put on the room's board — a snapshot you own and can pull.
  // Until it's signed (P3), the room carries it as YOUR claim; nothing here turns green
  // on anyone else's screen.
  const canPublish = isLiveAddr(accountId)
  const pubKey = `cairn-published:${catalog.id}:${accountId}`
  const [pubAt, setPubAt] = useState(() => { try { return Number(localStorage.getItem(pubKey)) || 0 } catch { return 0 } })
  const [pubBusy, setPubBusy] = useState(false)
  const [pubErr, setPubErr] = useState(false)
  const buildSnapshot = () => ({
    v: 1, cat: catalog.id, sign, handle: handleFor(accountId),
    showcase: (pins.length ? pins : rows.grails.map(({ c }) => c.uid)).slice(0, 9),
    table: rows.listed.map(({ c, e }) => ({
      uid: c.uid, ask: e.ask ? Number(e.ask) : null, trade: !!e.trade, sell: !!e.sell,
      cond: condStr(e), scans: (e.pile || []).length || (e.photo_hash ? 1 : 0), copies: e.copies || 1,
    })),
    wants: rows.wants.map(({ c }) => c.uid).slice(0, 60),
    record: stats,
  })
  const markPublished = () => { const t = Date.now(); setPubAt(t); try { localStorage.setItem(pubKey, String(t)) } catch { /* ignore */ } }
  const publish = async () => {
    setPubBusy(true); setPubErr(false)
    const r = await publishProfile(accountId, buildSnapshot())
    if (r?.ok) markPublished()
    else setPubErr(true)
    setPubBusy(false)
  }
  const unpublish = async () => {
    setPubBusy(true)
    await unpublishProfile(accountId)
    setPubAt(0); try { localStorage.removeItem(pubKey) } catch { /* ignore */ }
    setPubBusy(false)
  }
  // a published page stays fresh: republish quietly whenever you visit your page
  useEffect(() => {
    if (!canPublish || !pubAt) return
    publishProfile(accountId, buildSnapshot()).then((r) => { if (r?.ok) markPublished() })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- on mount only, by design

  if (!data) return <div className="empty">Opening your page…</div>

  return (
    <div className="pf">
      <ProfileHeader accountId={accountId} sign={sign} onSign={setSign} stats={stats} />
      <div className="pf-pubrow mono">
        {canPublish
          ? pubAt
            ? <>
                <span className="pf-live">● on the room&rsquo;s board</span>
                <span className="dim">your table, front page, and hunt are public to the pilot · refreshed each visit</span>
                <button className="ghost sm" onClick={publish} disabled={pubBusy}>{pubBusy ? 'publishing…' : 'republish now'}</button>
                <button className="ghost sm" onClick={unpublish} disabled={pubBusy}>take it down</button>
              </>
            : <>
                <span className="dim">your page is local-only — put it on the board and the room&rsquo;s market shows your table</span>
                <button className="primary pf-pubbtn" onClick={publish} disabled={pubBusy}>{pubBusy ? 'publishing…' : 'Put it on the board →'}</button>
              </>
          : <span className="dim">publishing needs a wallet account — sign in with one and your page can go on the board</span>}
        {pubErr && <span className="pf-puberr">couldn&rsquo;t reach the board — try again</span>}
      </div>
      <FrontPage uids={pins} byUid={byUid} own
        myHaves={rows.haves.map(({ c }) => c)}
        grailFallback={rows.grails.map(({ c }) => c.uid)}
        onTogglePin={(uid) => togglePin(pinsKey, uid)} />

      <div className="pf-sechead">
        <span className="ek">On your table</span>
        <span className="mono dim">{rows.listed.length ? `${rows.listed.length} listed · asks are per copy` : ''}</span>
      </div>
      {rows.listed.length
        ? <div className="sp-tiles">
            {rows.listed.map(({ c, e }) => (
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
        : <div className="empty">Nothing on your table. Open a card you Have and mark it “List for sale” or “Open to trade”.</div>}

      <div className="pf-sechead">
        <span className="ek">You&rsquo;re hunting</span>
        <span className="mono dim">{rows.wants.length ? 'public — the room can bring you deals' : ''}</span>
      </div>
      {rows.wants.length
        ? <div className="mk-hunt2row pf-huntrow">
            {rows.wants.slice(0, 18).map(({ c }) => (
              <div key={c.uid} className="mk-hunt2">
                {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span className="minicard-noimg">{c.name_en}</span>}
                <span className="mk-hunt2name">{c.name_en}</span>
              </div>
            ))}
            {rows.wants.length > 18 && <span className="mono dim pf-huntmore">+{rows.wants.length - 18}</span>}
          </div>
        : <div className="empty">No wants yet — mark cards as Want and your hunt goes on the board.</div>}

      <p className="sc-note dim">This is your page exactly as the room reads it once it&rsquo;s on the board: the front page
        and your hunt show what you choose; the record strip only ever says what&rsquo;s recorded — and on other people&rsquo;s
        screens it stays your claim until signing lands.</p>
    </div>
  )
}
