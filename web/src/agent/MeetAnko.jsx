import { useEffect, useRef, useState } from 'react'
import './anko.css'

const IMG = (import.meta.env.BASE_URL || '/') + 'agent/anko-guide-v2.jpg'

const STEPS = [
  {
    id: 'profile',
    title: 'Name your table',
    say: 'First, tell people who is at the table. Type your collector name, then add one short line about what you collect.',
    points: 1,
    action: 'Point to the name field',
  },
  {
    id: 'photo',
    title: 'Choose your picture',
    say: 'Pick a photo or image that feels like you. We crop it square, and you can change it later.',
    points: 1,
    action: 'Choose a picture',
  },
  {
    id: 'mark',
    title: 'Add your first card',
    say: 'Search for a card you know. Tap Have if it is yours, or Want if you are looking for it.',
    points: 1,
    action: 'Open the card search',
  },
  {
    id: 'scan',
    title: 'Scan one card',
    say: 'Take a clear photo of one card, or choose one from your phone. Your first scan earns five points.',
    points: 5,
    action: 'Open the scanner',
  },
]

const DONE_LINES = {
  profile: 'Your table has a name. Nice.',
  photo: 'There you are. Picture added.',
  mark: 'Got it — your first card is in.',
  scan: 'Scan recorded. Five points earned.',
}

export default function MeetAnko({ onDone, progress, frame = 0, onFrame }) {
  const [imgOk, setImgOk] = useState(true)
  const previousDone = useRef(Object.fromEntries(progress.milestones.map((item) => [item.id, item.done])))
  const aligned = useRef(false)
  const current = STEPS[frame]
  const last = frame === STEPS.length - 1
  const currentDone = !!progress.milestones.find((item) => item.id === current.id)?.done
  const firstOpen = progress.milestones.findIndex((item) => !item.done)

  useEffect(() => {
    if (aligned.current) return
    aligned.current = true
    if (currentDone && firstOpen >= 0 && firstOpen !== frame) onFrame(firstOpen)
  }, [currentDone, firstOpen, frame, onFrame])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onDone()
      if (event.key === 'ArrowRight') onFrame(Math.min(frame + 1, STEPS.length - 1))
      if (event.key === 'ArrowLeft') onFrame(Math.max(frame - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [frame, onDone, onFrame])

  const doneSignature = progress.milestones.map((item) => `${item.id}:${item.done}`).join('|')
  useEffect(() => {
    const done = Object.fromEntries(doneSignature.split('|').map((item) => {
      const [id, value] = item.split(':')
      return [id, value === 'true']
    }))
    const justFinished = done[current.id] && !previousDone.current[current.id]
    previousDone.current = done
    if (!justFinished) return undefined
    const laterOpen = progress.milestones.findIndex((item, index) => !item.done && index > frame)
    const nextOpen = laterOpen >= 0 ? laterOpen : progress.milestones.findIndex((item) => !item.done)
    const timer = window.setTimeout(() => nextOpen >= 0 ? onFrame(nextOpen) : onDone(), 900)
    return () => window.clearTimeout(timer)
  }, [current.id, doneSignature, frame, onDone, onFrame, progress.milestones])

  const showTarget = () => {
    const target = document.querySelector(`[data-tour-target="${current.id}"]`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      if (current.id === 'photo' || current.id === 'scan') target.click()
      else target.querySelector('[data-tour-focus]')?.focus()
    }, 260)
  }

  return (
    <div className="anko-guide" role="dialog" aria-modal="false" aria-labelledby="anko-guide-title">
      <div className="anko-book">
        <div className="anko-booktop mono">
          <span>ANKO · YOUR FIRST LAP</span>
          <span>{frame + 1} / {STEPS.length}</span>
          <button onClick={onDone} aria-label="Skip Anko's guide">skip ×</button>
        </div>
        <div className={'anko-coachbody' + (currentDone ? ' earned' : '')} key={current.id}>
          <aside className="anko-character">
            {imgOk
              ? <img src={IMG} alt="Anko welcoming you to Cairn" onError={() => setImgOk(false)} />
              : <span className="anko-fallback">A</span>}
          </aside>
          <section className="anko-speech">
            <div className="anko-award mono"><b>+{current.points}</b><span>{current.points === 1 ? 'point' : 'points'}</span><i>you have {progress.points}/8</i></div>
            <h2 id="anko-guide-title">{current.title}</h2>
            <p>{currentDone ? DONE_LINES[current.id] : current.say}</p>
            <button className="anko-showtarget" disabled={currentDone} onClick={showTarget}>{currentDone ? 'Done ✓' : `${current.action} ↓`}</button>
          </section>
        </div>
        <div className="anko-route" aria-label="First-lap points">
          {STEPS.map((step, index) => {
            const done = progress.milestones.find((item) => item.id === step.id)?.done
            return (
              <button key={step.id} className={(index === frame ? 'on ' : '') + (done ? 'done' : '')}
                onClick={() => onFrame(index)} aria-label={`${step.title}, ${step.points} point${step.points === 1 ? '' : 's'}${done ? ', done' : ''}`}>
                <span>{done ? '✓' : index + 1}</span><b>+{step.points}</b>
              </button>
            )
          })}
          <strong className="mono">= 8</strong>
        </div>
        <div className="anko-bookfoot">
          <button className="ghost" disabled={frame === 0} onClick={() => onFrame(frame - 1)}>← back</button>
          <span className="mono">Do the real step below. I&rsquo;ll keep up.</span>
          <button className="ghost" onClick={() => last ? onDone() : onFrame(frame + 1)}>{last ? 'done →' : 'next →'}</button>
        </div>
      </div>
    </div>
  )
}
