import { useEffect, useMemo, useRef, useState } from 'react'
import { loadStore, saveStore, storeKeyFor } from '../binder/collection.js'
import { useCatalog } from '../lib/data.js'
import { saveProfile } from './profileStore.js'
import { prepareProfilePhoto } from './profilePhoto.js'
import './onboarding.css'

const cardName = (card) => card?.name_en || card?.name_ja || card?.uid || 'Untitled card'

export default function GettingStarted({ accountId, catalog, profile, progress, onScan, guidedStep = null }) {
  const data = useCatalog(catalog)
  const [active, setActive] = useState(() => progress.milestones.find((milestone) => !milestone.done)?.id || null)
  const [name, setName] = useState(profile.name || '')
  const [sign, setSign] = useState(profile.sign || '')
  const [query, setQuery] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [flight, setFlight] = useState(null)
  const photoInput = useRef(null)
  const flightLock = useRef(null)
  const previousProgress = useRef({
    points: progress.points,
    done: Object.fromEntries(progress.milestones.map((milestone) => [milestone.id, milestone.done])),
  })

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle || !data) return []
    const unique = new Map()
    for (const card of data.cards) {
      if (!`${card.num || ''} ${cardName(card)} ${card.romaji || ''}`.toLowerCase().includes(needle)) continue
      if (!unique.has(card.uid)) unique.set(card.uid, card)
      if (unique.size === 6) break
    }
    return [...unique.values()]
  }, [data, query])

  const doneSignature = progress.milestones.map((milestone) => `${milestone.id}:${milestone.done}`).join('|')
  const startPointFlight = (milestoneId, gained) => {
    flightLock.current = milestoneId
    const source = document.querySelector(`[data-milestone-id="${milestoneId}"]`)?.getBoundingClientRect()
    const target = document.querySelector('.profile-points')?.getBoundingClientRect()
    if (!source || !target) return
    const left = source.left + source.width / 2
    const top = source.top + source.height / 2
    setFlight({
      key: `${milestoneId}-${progress.points}-${gained}`, milestoneId, gained, left, top,
      dx: target.left + target.width / 2 - left,
      dy: target.top + target.height / 2 - top,
    })
  }
  useEffect(() => {
    const previous = previousProgress.current
    const done = Object.fromEntries(progress.milestones.map((milestone) => [milestone.id, milestone.done]))
    const gained = progress.points - previous.points
    const finished = progress.milestones.find((milestone) => milestone.done && !previous.done[milestone.id])
    previousProgress.current = { points: progress.points, done }
    if (gained <= 0 || !finished) return undefined
    if (flightLock.current === finished.id) return undefined
    window.requestAnimationFrame(() => {
      const source = document.querySelector(`[data-milestone-id="${finished.id}"]`)?.getBoundingClientRect()
      const target = document.querySelector('.profile-points')?.getBoundingClientRect()
      if (!source || !target) return
      const left = source.left + source.width / 2
      const top = source.top + source.height / 2
      setFlight({
        key: Date.now(), milestoneId: finished.id, gained, left, top,
        dx: target.left + target.width / 2 - left,
        dy: target.top + target.height / 2 - top,
      })
    })
    return undefined
  }, [doneSignature, progress.milestones, progress.points])

  if (progress.complete) return null

  const save = () => {
    if (!name.trim() || !sign.trim()) return
    startPointFlight('profile', 1)
    saveProfile(accountId, { ...profile, name, sign })
    setActive(null)
  }
  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoBusy(true); setPhotoError('')
    try {
      const photo = await prepareProfilePhoto(file)
      startPointFlight('photo', 1)
      saveProfile(accountId, { ...profile, photo })
      setActive(null)
    } catch (error) {
      setPhotoError(error?.message || 'That picture could not be added.')
    } finally { setPhotoBusy(false) }
  }
  const mark = (card, stance) => {
    const key = storeKeyFor(catalog.id, accountId)
    const store = loadStore(key)
    startPointFlight('mark', 1)
    saveStore(key, { ...store, [card.uid]: { ...(store[card.uid] || {}), stance } })
    setQuery('')
    setActive(null)
  }
  const setupStep = guidedStep === 'profile' || guidedStep === 'photo'
  const interfaceStep = guidedStep === 'mark' || guidedStep === 'scan'
  const setupDone = progress.milestones.filter((milestone) => milestone.id === 'profile' || milestone.id === 'photo').every((milestone) => milestone.done)
  const flightSetup = flight && (flight.milestoneId === 'profile' || flight.milestoneId === 'photo') ? flight.milestoneId : null
  const shownActive = flightSetup || (setupStep ? guidedStep : interfaceStep ? null : active)
  const compact = (setupDone || interfaceStep) && !flight
  const focusedSetup = !compact && !!(setupStep || flightSetup)
  const nextMilestone = progress.milestones.find((milestone) => !milestone.done)
  const showNextMilestone = () => {
    if (!nextMilestone) return
    if (nextMilestone.id === 'scan') { onScan(); return }
    if (nextMilestone.id === 'mark') {
      const target = document.querySelector('.askbar input')
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target?.focus({ preventScroll: true })
      return
    }
    setActive(nextMilestone.id)
  }
  const finishPointFlight = () => {
    const surface = document.querySelector('.binder-surface')
    const before = surface?.getBoundingClientRect().top
    setFlight(null)
    if (!surface || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    window.requestAnimationFrame(() => {
      const after = surface.getBoundingClientRect().top
      const distance = before - after
      if (Math.abs(distance) < 2) return
      surface.animate([
        { transform: `translateY(${distance}px)` },
        { transform: 'translateY(0)' },
      ], { duration: 560, easing: 'cubic-bezier(.2,.75,.25,1)' })
    })
  }

  return (
    <section className={'first-lap' + (guidedStep ? ' first-lap-guided' : '') + (focusedSetup ? ' first-lap-focus' : '') + (compact ? ' first-lap-compact' : '')} aria-label="Getting started">
      {flight && (
        <span key={flight.key} className="point-flight" aria-live="polite"
          style={{ left: flight.left, top: flight.top, '--point-dx': `${flight.dx}px`, '--point-dy': `${flight.dy}px` }}
          onAnimationEnd={(event) => { if (event.target === event.currentTarget) finishPointFlight() }}>
          <b>✦ +{flight.gained}</b><i>✦</i><i>✦</i><i>✦</i>
        </span>
      )}
      {compact ? (
        <div className="first-compactrow">
          <span className="ek">First lap</span>
          <div className="first-compactmeter" aria-hidden="true"><i style={{ width: `${(progress.points / progress.total) * 100}%` }} /></div>
          {nextMilestone && <button type="button" className="first-compactnext" data-milestone-id={nextMilestone.id} onClick={showNextMilestone}>
            <span>Next</span><b>{nextMilestone.label}</b><small>+{nextMilestone.points}</small>
          </button>}
          <div className="first-score mono" aria-label={`${progress.points} of ${progress.total} points earned`}>
            <strong>{progress.points}</strong><span>/ {progress.total} pts</span>
          </div>
        </div>
      ) : <>
        <div className="first-laphead">
          <div>
            <span className="ek">Your first lap</span>
            <h1>Set up your table</h1>
            <p>Four useful firsts. Your first recorded scan earns five.</p>
          </div>
          <div className="first-score mono" aria-label={`${progress.points} of ${progress.total} points earned`}>
            <strong>{progress.points}</strong><span>/ {progress.total} pts</span>
          </div>
        </div>
        <div className="first-meter" aria-hidden="true"><i style={{ width: `${(progress.points / progress.total) * 100}%` }} /></div>
        <div className="first-steps">
          {progress.milestones.map((milestone) => (
            <button key={milestone.id} type="button"
              data-milestone-id={milestone.id}
              className={'first-step' + (milestone.done ? ' done' : '') + (shownActive === milestone.id ? ' open' : '') + (guidedStep === milestone.id ? ' guided' : '')}
              disabled={milestone.done}
              onClick={() => milestone.id === 'scan' ? onScan() : setActive(shownActive === milestone.id ? null : milestone.id)}>
              <span className="first-check" aria-hidden="true">{milestone.done ? '✓' : '○'}</span>
              <span><b>{milestone.label}</b><small>{milestone.detail}</small></span>
              <span className="mono first-point">+{milestone.points}</span>
            </button>
          ))}
        </div>
      </>}

      {shownActive && <div className="first-workbench" data-guide-step={guidedStep || undefined}>
        <div className="first-action-column">
        {shownActive === 'profile' && (!progress.milestones.find((milestone) => milestone.id === 'profile')?.done || flight?.milestoneId === 'profile') && (
          <div className="first-action first-profile" data-tour-target="profile">
          <label>{guidedStep === 'profile' && <span className="first-field-arrow mono">Start here ↓</span>}<span className="mono">Collector name</span><input autoFocus data-tour-focus maxLength={32} value={name}
            placeholder="How the room should know you" onChange={(event) => setName(event.target.value)} /></label>
          <label><span className="mono">Your table line</span><input maxLength={140} value={sign}
            placeholder="What do you collect, trade, or hunt?" onChange={(event) => setSign(event.target.value)} /></label>
          <button className="primary" disabled={!name.trim() || !sign.trim()} onClick={save}>Save profile · +1 point</button>
          </div>
        )}

        {shownActive === 'photo' && (!progress.milestones.find((milestone) => milestone.id === 'photo')?.done || flight?.milestoneId === 'photo') && (
          <div className="first-action first-photo">
          <span className="first-photoempty" aria-hidden="true">＋</span>
          <span><b>Add your profile picture</b><small>We make it square and keep it on this device.</small></span>
          <input ref={photoInput} className="first-photoinput" type="file" accept="image/*" disabled={photoBusy} onChange={choosePhoto} />
          <button type="button" data-tour-target="photo" data-tour-focus className="primary first-photobutton"
            disabled={photoBusy} onClick={() => photoInput.current?.click()}>
            {photoBusy ? 'preparing picture…' : 'Choose picture · +1 point'}
          </button>
          {photoError && <span className="first-photoerror" role="alert">{photoError}</span>}
          </div>
        )}

        {shownActive === 'mark' && !progress.milestones.find((milestone) => milestone.id === 'mark')?.done && (
          <div className="first-action first-cardpick" data-tour-target="mark">
          <input autoFocus data-tour-focus type="search" value={query} placeholder="Find a card by name or number…"
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

        {shownActive === 'scan' && !progress.milestones.find((milestone) => milestone.id === 'scan')?.done && (
          <div className="first-action first-scan">
            <span className="first-scanmark" aria-hidden="true">⌗</span>
            <span><b>Scan your first card</b><small>Take a clear photo or choose one from your phone. Nothing is uploaded automatically.</small></span>
            <button type="button" data-tour-target="scan" data-tour-focus className="primary" onClick={onScan}>Open the scanner · +5 points</button>
          </div>
        )}
        </div>
      </div>}
      <p className="first-fine mono">Points are progress markers for now—not money, rank, or proof.</p>
    </section>
  )
}
