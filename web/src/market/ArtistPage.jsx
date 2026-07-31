import { useEffect, useMemo, useRef, useState } from 'react'
import { retryImg } from '../binder/helpers.jsx'
import { cardDisplayName, cardOriginText } from '../cards/cardNames.js'
import { artistCards } from '../cards/discovery.js'
import './artist-page.css'

export default function ArtistPage({ artist, cards = [], catalog, onBack, onOpenCard }) {
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('all')
  const [release, setRelease] = useState('all')
  const [size, setSize] = useState('m')
  const [limit, setLimit] = useState(120)
  const moreRef = useRef(null)
  const credited = useMemo(() => artistCards(cards, artist), [artist, cards])
  const releases = useMemo(() => [...new Map(credited.map((card) => [card.set_id, {
    id: card.set_id,
    label: card.release_family_label || card.release_family || card.set_id,
  }])).values()].sort((a, b) => a.label.localeCompare(b.label)), [credited])
  const subjects = useMemo(() => {
    const counts = new Map()
    for (const card of credited) counts.set(cardDisplayName(card), (counts.get(cardDisplayName(card)) || 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8)
  }, [credited])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return credited.filter((card) => language === 'all' || card.language === language)
      .filter((card) => release === 'all' || card.set_id === release)
      .filter((card) => !needle || [card.name_en, card.name_ja, card.romaji, card.num, card.release_family_label]
        .filter(Boolean).join(' ').toLowerCase().includes(needle))
      .sort((a, b) => String(a.release_date || '').localeCompare(String(b.release_date || ''))
        || String(a.release_family_label || '').localeCompare(String(b.release_family_label || ''))
        || String(a.num || '').localeCompare(String(b.num || ''), undefined, { numeric: true }))
  }, [credited, language, query, release])
  const years = credited.map((card) => Number(String(card.release_date || '').slice(0, 4))).filter(Boolean)
  const yearLine = years.length ? `${Math.min(...years)}${Math.max(...years) !== Math.min(...years) ? `–${Math.max(...years)}` : ''}` : 'dates vary'
  const shown = filtered.slice(0, limit)

  useEffect(() => { setLimit(120) }, [artist, language, query, release]) // eslint-disable-line react-hooks/set-state-in-effect -- a new catalogue view starts at its first shelf
  useEffect(() => {
    if (!moreRef.current || shown.length >= filtered.length || !('IntersectionObserver' in window)) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setLimit((current) => Math.min(current + 120, filtered.length))
    }, { rootMargin: '500px' })
    observer.observe(moreRef.current)
    return () => observer.disconnect()
  }, [filtered.length, shown.length])

  useEffect(() => {
    const previous = document.title
    document.title = `${artist} · Artist · Cairn`
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return () => { document.title = previous }
  }, [artist])

  return <article className={`artist-page size-${size}`}>
    <button type="button" className="cp-back mono" onClick={onBack}>← Back to the card show</button>
    <header className="artist-hero">
      <div className="artist-monogram" aria-hidden="true">{artist.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</div>
      <div className="artist-intro">
        <span className="ek">Artist catalogue · {catalog.label}</span>
        <h1>{artist}</h1>
        <p>Follow the credit across releases, languages, characters and eras.</p>
      </div>
      <div className="artist-stats">
        <span><b>{credited.length}</b><small>credited cards</small></span>
        <span><b>{releases.length}</b><small>releases</small></span>
        <span><b>{yearLine}</b><small>catalogue span</small></span>
      </div>
    </header>

    {subjects.length > 1 && <section className="artist-subjects" aria-label="Recurring cards">
      <span className="mono">Recurring cards</span>
      <div>{subjects.map(([name, count]) => <button type="button" key={name} onClick={() => setQuery(name)}>{name}<small>{count}</small></button>)}</div>
    </section>}

    <section className="artist-catalogue" aria-labelledby="artist-catalogue-title">
      <div className="artist-cataloguehead">
        <div><span className="ek">Explore the work</span><h2 id="artist-catalogue-title">The catalogue</h2><p>{filtered.length} of {credited.length} cards</p></div>
        <div className="artist-size mono" role="radiogroup" aria-label="Card size">
          {['s', 'm', 'l'].map((option) => <button type="button" role="radio" aria-checked={size === option}
            className={size === option ? 'on' : ''} key={option} onClick={() => setSize(option)}>{option.toUpperCase()}</button>)}
        </div>
      </div>
      <div className="artist-tools">
        <label className="artist-search"><span className="mono">Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Card, number, release…" /></label>
        <label><span className="mono">Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="all">All languages</option>
          {[...new Set(credited.map((card) => card.language).filter(Boolean))].map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label><span className="mono">Release</span><select value={release} onChange={(event) => setRelease(event.target.value)}>
          <option value="all">All releases</option>
          {releases.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
        </select></label>
        {(query || language !== 'all' || release !== 'all') && <button type="button" className="artist-clear" onClick={() => { setQuery(''); setLanguage('all'); setRelease('all') }}>Clear</button>}
      </div>
      {filtered.length ? <div className="artist-grid">
        {shown.map((card) => <button type="button" className="artist-card" key={card.uid} onClick={() => onOpenCard(card)}>
          <span className="artist-cardart">
            {card.image ? <img src={card.image} alt="" loading="lazy" onError={(event) => retryImg(event, card.image)} /> : <i>◇</i>}
            {card.image_reference_only || card.display_allowed === false ? <em>reference</em> : null}
          </span>
          <span className="artist-cardcopy"><b>{cardDisplayName(card)}</b>{cardOriginText(card) && <span className="artist-cardorigin mono">{cardOriginText(card)}</span>}<small>{card.release_family_label || card.set_id}</small><small>{card.num || 'number not recorded'}{card.release_date ? ` · ${String(card.release_date).slice(0, 4)}` : ''}</small></span>
        </button>)}
      </div> : <div className="artist-empty"><strong>No cards match this view.</strong><button type="button" onClick={() => { setQuery(''); setLanguage('all'); setRelease('all') }}>Show the full catalogue</button></div>}
      {shown.length < filtered.length && <button ref={moreRef} type="button" className="artist-more" onClick={() => setLimit((current) => Math.min(current + 120, filtered.length))}>Keep browsing · {filtered.length - shown.length} more cards</button>}
    </section>
  </article>
}
