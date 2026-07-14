import { useMemo, useState } from 'react'
import { loadStore, saveStore, storeKeyFor } from '../binder/collection.js'
import { useCatalog } from '../lib/data.js'
import { saveProfile } from './profileStore.js'
import './onboarding.css'

const cardName = (card) => card?.name_en || card?.name_ja || card?.uid || 'Untitled card'

export default function GettingStarted({ accountId, catalog, profile, progress, onScan }) {
  const data = useCatalog(catalog)
  const [active, setActive] = useState(() => progress.milestones.find((milestone) => !milestone.done)?.id || null)
  const [name, setName] = useState(profile.name || '')
  const [sign, setSign] = useState(profile.sign || '')
  const [query, setQuery] = useState('')

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle || !data) return []
    return data.cards.filter((card) => (`${card.num || ''} ${cardName(card)} ${card.romaji || ''}`).toLowerCase().includes(needle)).slice(0, 6)
  }, [data, query])

  if (progress.complete) return null

  const save = () => {
    if (!name.trim() || !sign.trim()) return
    saveProfile(accountId, { name, sign })
    setActive(null)
  }
  const mark = (card, stance) => {
    const key = storeKeyFor(catalog.id, accountId)
    const store = loadStore(key)
    saveStore(key, { ...store, [card.uid]: { ...(store[card.uid] || {}), stance } })
    setQuery('')
    setActive(null)
  }

  return (
    <section className="first-lap" aria-label="Getting started">
      <div className="first-laphead">
        <div>
          <span className="ek">Your first lap</span>
          <h1>Set up your table</h1>
          <p>Three useful firsts. One point each.</p>
        </div>
        <div className="first-score mono" aria-label={`${progress.points} of ${progress.total} points earned`}>
          <strong>{progress.points}</strong><span>/ {progress.total} pts</span>
        </div>
      </div>
      <div className="first-meter" aria-hidden="true"><i style={{ width: `${(progress.points / progress.total) * 100}%` }} /></div>
      <div className="first-steps">
        {progress.milestones.map((milestone) => (
          <button key={milestone.id} type="button"
            className={'first-step' + (milestone.done ? ' done' : '') + (active === milestone.id ? ' open' : '')}
            disabled={milestone.done}
            onClick={() => milestone.id === 'scan' ? onScan() : setActive(active === milestone.id ? null : milestone.id)}>
            <span className="first-check" aria-hidden="true">{milestone.done ? '✓' : '○'}</span>
            <span><b>{milestone.label}</b><small>{milestone.detail}</small></span>
            <span className="mono first-point">+{milestone.points}</span>
          </button>
        ))}
      </div>

      {active === 'profile' && !progress.milestones.find((milestone) => milestone.id === 'profile')?.done && (
        <div className="first-action first-profile">
          <label><span className="mono">Collector name</span><input autoFocus maxLength={32} value={name}
            placeholder="How the room should know you" onChange={(event) => setName(event.target.value)} /></label>
          <label><span className="mono">Your table line</span><input maxLength={140} value={sign}
            placeholder="What do you collect, trade, or hunt?" onChange={(event) => setSign(event.target.value)} /></label>
          <button className="primary" disabled={!name.trim() || !sign.trim()} onClick={save}>Save profile · +1 point</button>
        </div>
      )}

      {active === 'mark' && !progress.milestones.find((milestone) => milestone.id === 'mark')?.done && (
        <div className="first-action first-cardpick">
          <input autoFocus type="search" value={query} placeholder="Find a card by name or number…"
            aria-label="Find your first card" onChange={(event) => setQuery(event.target.value)} />
          {query.trim() && !hits.length && <div className="mono dim first-nohit">No matching card yet.</div>}
          {hits.map((card) => (
            <div className="first-hit" key={card.uid}>
              {card.image ? <img src={card.image} alt="" /> : <span className="first-noimg" />}
              <span className="first-hitname"><b>{cardName(card)}</b><small className="mono">{card.num}</small></span>
              <span className="first-hitacts"><button onClick={() => mark(card, 'have')}>Have</button><button onClick={() => mark(card, 'want')}>Want</button></span>
            </div>
          ))}
        </div>
      )}
      <p className="first-fine mono">Points are progress markers for now—not money, rank, or proof.</p>
    </section>
  )
}
