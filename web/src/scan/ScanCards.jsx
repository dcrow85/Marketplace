import { useRef, useState, useMemo } from 'react'
import { recognizePhoto } from './recognize.js'
import { useScrollLock } from '../useScrollLock.js'

const cardName = (c) => c?.name_en || c?.name_ja || c?.uid || '—'

// Module-level (not created during render) — used to pick/correct a card for an item.
function CardPicker({ cards, onPick }) {
  const [q, setQ] = useState('')
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return cards.filter((c) => (cardName(c).toLowerCase().includes(s) || (c.num || '').toLowerCase().includes(s))).slice(0, 6)
  }, [q, cards])
  return (
    <div className="sc-pick">
      <input autoFocus placeholder="name or number…" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.map((c) => (
        <button key={c.uid} className="sc-hit" onClick={() => onPick(c)}>
          <span>{cardName(c)}</span><small className="mono">{c.num}</small>
        </button>
      ))}
    </div>
  )
}

export default function ScanCards({ cards, onCommit, onClose }) {
  const [items, setItems] = useState([]) // {id, status:'reading'|'matched'|'unmatched', photo, read, match}
  const [picking, setPicking] = useState(null) // item id currently being picked
  const idRef = useRef(0)
  useScrollLock() // overlay is mounted only while open

  // Each photo → one card. While the read is in flight we show a "reading" placeholder,
  // then replace it with the recognized card.
  const addPhotos = async (fileList) => {
    const files = [...(fileList || [])]
    if (!files.length) return
    let cursor = 0
    const worker = async () => {
      while (cursor < files.length) {
        const file = files[cursor++]
        const pid = ++idRef.current
        setItems((prev) => [...prev, { id: pid, status: 'reading', photo: null, read: null, match: null }])
        let results
        try { results = await recognizePhoto(file, cards) } catch { results = [] }
        const fresh = results.map((r) => ({
          id: ++idRef.current, status: r.match ? 'matched' : 'unmatched', photo: r.photo, read: r.read, match: r.match,
        }))
        setItems((prev) => {
          const i = prev.findIndex((x) => x.id === pid)
          if (i < 0) return prev
          if (!fresh.length) { const copy = prev.slice(); copy[i] = { ...copy[i], status: 'unmatched' }; return copy }
          return [...prev.slice(0, i), ...fresh, ...prev.slice(i + 1)]
        })
      }
    }
    await Promise.all([worker(), worker()]) // up to 2 photos reading at once
  }

  const setMatch = (id, card) => setItems((prev) => prev.map((x) => x.id === id ? { ...x, match: card, status: 'matched' } : x))
  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id))

  const matched = items.filter((x) => x.status === 'matched' && x.match)
  const reading = items.filter((x) => x.status === 'reading').length
  const needPick = items.filter((x) => x.status === 'unmatched').length
  const uniq = new Set(matched.map((x) => x.match.uid)).size
  const dupes = matched.length - uniq
  const commit = () => {
    if (!matched.length) return
    // Copies are counted per card and RECORDED (the count you see is the count that's kept).
    const byUid = new Map()
    for (const x of matched) {
      const cur = byUid.get(x.match.uid)
      if (cur) cur.copies += 1
      else byUid.set(x.match.uid, { uid: x.match.uid, photo: x.photo, read: x.read, copies: 1 })
    }
    onCommit([...byUid.values()])
    onClose()
  }

  const status = items.length === 0
    ? 'point at a card'
    : (reading && !matched.length ? 'reading your photo…'
      : `${uniq} recognized${dupes ? ` · ${dupes + uniq} copies` : ''}${reading ? ' · reading…' : ''}${needPick ? ` · ${needPick} need a pick` : ''}`)

  return (
    <div className="sc-overlay" role="dialog" aria-label="Scan cards">
      <div className="sc-sheet">
        <div className="sc-head">
          <div>
            <div className="ek">Scan into your collection</div>
            <div className="sc-count mono">{status}</div>
          </div>
          <button className="sc-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="sc-grid">
          {items.map((it) => (
            <div key={it.id} className={'sc-item s-' + it.status}>
              <div className="sc-thumb">
                {it.photo ? <img src={it.photo} alt="" /> : <span className="sc-spin" />}
                <button className="sc-rm" onClick={() => remove(it.id)} aria-label="Remove">✕</button>
              </div>
              {it.status === 'reading' && <div className="sc-cap mono dim">reading…</div>}
              {it.status === 'matched' && (
                <div className="sc-cap">
                  <b>{cardName(it.match)}</b>
                  <small className="mono">{it.match.num} ✓</small>
                  <button className="sc-change" onClick={() => setPicking(it.id)}>change</button>
                </div>
              )}
              {it.status === 'unmatched' && (
                <div className="sc-cap">
                  <span className="sc-no">couldn’t read it</span>
                  <button className="sc-change" onClick={() => setPicking(it.id)}>pick</button>
                </div>
              )}
              {(it.read?.red_flags || []).length > 0 && (
                <div className="sc-flags">{it.read.red_flags.map((f, i) => <div key={i}>⚑ {f}</div>)}</div>
              )}
              {picking === it.id && (
                <CardPicker cards={cards} onPick={(c) => { setMatch(it.id, c); setPicking(null) }} />
              )}
            </div>
          ))}
        </div>

        <div className="sc-actions">
          <label className="sc-cap-btn">＋ Scan<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} /></label>
          <label className="sc-choose">Choose photos<input type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} /></label>
          <button className="sc-commit" disabled={!matched.length} onClick={commit}>
            {matched.length ? `Add ${uniq} to collection${dupes ? ` (${dupes + uniq} copies)` : ''}` : 'Add to collection'}
          </button>
        </div>
        <p className="sc-note dim">
          Snap one card at a time — or pick several photos at once. Recognized cards are tagged <b>have</b>,
          your photo kept as evidence — a witness, not proof. Fix any miss with “pick”.
        </p>
      </div>
    </div>
  )
}
