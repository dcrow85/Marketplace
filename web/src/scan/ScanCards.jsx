import { useRef, useState, useMemo } from 'react'
import { recognize } from './recognize.js'

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

  const addFiles = async (fileList) => {
    const files = [...(fileList || [])]
    if (!files.length) return
    const fresh = files.map((file) => ({ id: ++idRef.current, file, status: 'reading', photo: null, read: null, match: null }))
    setItems((prev) => [...prev, ...fresh])
    let cursor = 0
    const worker = async () => {
      while (cursor < fresh.length) {
        const it = fresh[cursor++]
        try {
          const { photo, read, match } = await recognize(it.file, cards)
          setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, photo, read, match, status: match ? 'matched' : 'unmatched' } : x))
        } catch {
          setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, status: 'unmatched' } : x))
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]) // 3 reads in flight
  }

  const setMatch = (id, card) => setItems((prev) => prev.map((x) => x.id === id ? { ...x, match: card, status: 'matched' } : x))
  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id))

  const matched = items.filter((x) => x.status === 'matched' && x.match)
  const reading = items.filter((x) => x.status === 'reading').length
  const commit = () => {
    if (!matched.length) return
    onCommit(matched.map((x) => ({ uid: x.match.uid, photo: x.photo, read: x.read })))
    onClose()
  }

  return (
    <div className="sc-overlay" role="dialog" aria-label="Scan cards">
      <div className="sc-sheet">
        <div className="sc-head">
          <div>
            <div className="ek">Scan into your collection</div>
            <div className="sc-count mono">
              {items.length === 0 ? 'point your camera at a card' : `${matched.length} recognized${reading ? ` · ${reading} reading…` : ''}${items.length - matched.length - reading ? ` · ${items.length - matched.length - reading} need a pick` : ''}`}
            </div>
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
              {picking === it.id && (
                <CardPicker cards={cards} onPick={(c) => { setMatch(it.id, c); setPicking(null) }} />
              )}
            </div>
          ))}
        </div>

        <div className="sc-actions">
          <label className="sc-cap-btn">
            ＋ Scan a card
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          </label>
          <label className="sc-choose">
            Choose photos
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          </label>
          <button className="sc-commit" disabled={!matched.length} onClick={commit}>
            {matched.length ? `Add ${matched.length} to collection` : 'Add to collection'}
          </button>
        </div>
        <p className="sc-note dim">Recognized cards are tagged <b>have</b>, with your photo kept as evidence — a witness, not proof. Condition is a first-pass read you can refine when you list.</p>
      </div>
    </div>
  )
}
