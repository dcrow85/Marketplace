import { useEffect, useRef, useState } from 'react'
import './anko.css'

const IMG = (import.meta.env.BASE_URL || '/') + 'agent/anko-guide-v2.jpg'

const STEPS = [
  {
    id: 'profile',
    title: 'Hi, I’m Anko',
    say: 'I help you work with your collection in plain English. Let’s start with what people should call you at the table.',
    points: 1,
    action: 'Start with your name',
  },
  {
    id: 'photo',
    title: 'Make the table yours',
    say: 'Add a picture that feels like you. We crop it square, and you can change it any time.',
    points: 1,
    action: 'Choose a picture',
  },
  {
    id: 'mark',
    title: 'Have or Want?',
    say: 'Choose Have for cards you own. Choose Want for cards you’re looking for. You can tap the buttons or tell me in plain English.',
    points: 1,
    action: 'Focus the Anko bar',
    examples: [
      { label: '“Do I have Penny?”', text: 'Do I have Penny?' },
      { label: '“I have every common.”', text: 'I have every common' },
      { label: '“List all my commons for $1.”', text: 'List all my commons for $1' },
    ],
  },
  {
    id: 'scan',
    title: 'I’m always here if you need me!',
    say: 'I’m staying right here in the Anko bar. One last first: scan a card for five points whenever you’re ready.',
    points: 5,
    action: 'Show me Scan cards',
  },
]

const DONE_LINES = {
  profile: 'Your table has a name. Nice.',
  photo: 'There you are. Picture added.',
  mark: 'Got it — your first card is in.',
  scan: 'Scan recorded. Five points earned.',
}

export function HaveActionsLesson({ onDone, compact = false }) {
  return (
    <aside className={'anko-have-actions' + (compact ? ' compact' : '')} role="note" aria-label="Anko explains selling and trading">
      <img src={(import.meta.env.BASE_URL || '/') + 'agent/house.png'} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
      <div className="anko-have-copy">
        <strong>{compact ? 'Sell or trade?' : 'You have it. Is it available?'}</strong>
        <span>{compact
          ? <><b>$ Sell</b> sets a price. <b>⇄ Trade</b> invites swaps. Either, both, or neither.</>
          : <><b>$ Sell</b> adds an asking price. <b>⇄ Trade</b> invites collectors to offer a swap. Choose either, both, or neither.</>}</span>
      </div>
      <button type="button" onClick={onDone}>Got it</button>
    </aside>
  )
}

export default function MeetAnko({ onDone, progress, frame = 0, onFrame, mode = 'setup' }) {
  const [imgOk, setImgOk] = useState(true)
  const previousDone = useRef(Object.fromEntries(progress.milestones.map((item) => [item.id, item.done])))
  const aligned = useRef(false)
  const current = STEPS[frame]
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
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const doneSignature = progress.milestones.map((item) => `${item.id}:${item.done}`).join('|')
  useEffect(() => {
    const done = Object.fromEntries(doneSignature.split('|').map((item) => {
      const [id, value] = item.split(':')
      return [id, value === 'true']
    }))
    const justFinished = done[current.id] && !previousDone.current[current.id]
    previousDone.current = done
    if (!justFinished) return undefined
    const laterOpen = STEPS.findIndex((step, index) => index > frame && !done[step.id])
    const nextOpen = laterOpen >= 0 ? laterOpen : STEPS.findIndex((step) => !done[step.id])
    const timer = window.setTimeout(() => nextOpen >= 0 ? onFrame(nextOpen) : onDone(), 900)
    return () => window.clearTimeout(timer)
  }, [current.id, doneSignature, frame, onDone, onFrame])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const target = document.querySelector(`[data-tour-target="${current.id}"]`)
      if (!target) return
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const focusable = target.matches('[data-tour-focus]') ? target : target.querySelector('[data-tour-focus]')
      focusable?.focus({ preventScroll: true })
    }, 180)
    return () => window.clearTimeout(timer)
  }, [current.id])

  const showTarget = () => {
    const target = document.querySelector(`[data-tour-target="${current.id}"]`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      if (current.id === 'photo' || current.id === 'scan') target.click()
      else target.querySelector('[data-tour-focus]')?.focus()
    }, 260)
  }

  const fillExample = (text) => {
    window.dispatchEvent(new CustomEvent('cairn-anko-prompt', { detail: { text } }))
  }

  if (mode === 'binder') {
    return (
      <aside className="anko-guide anko-guide-binder" role="complementary" aria-label="Anko first-lap note">
        <div className={'anko-binder-note' + (currentDone ? ' earned' : '')}>
          <div className="anko-binder-copy">
            <strong>{current.title}</strong>
            <span>{currentDone ? DONE_LINES[current.id] : current.id === 'mark'
              ? 'Have is for cards you own. Want is for cards you’re looking for.'
              : 'Scan one card when you’re ready for five points.'}</span>
          </div>
          {!currentDone && current.examples && (
            <div className="anko-binder-examples" aria-label="Example requests">
              {current.examples.map((example) => <button key={example.text} type="button" onClick={() => fillExample(example.text)}>{example.label}</button>)}
            </div>
          )}
          <button className="anko-binder-skip" onClick={onDone} aria-label="Dismiss Anko's guide">×</button>
        </div>
      </aside>
    )
  }

  return (
    <div className={`anko-guide anko-guide-${mode}`} role="complementary" aria-labelledby="anko-guide-title">
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
            {!currentDone && current.examples && (
              <div className="anko-examples">
                <span className="mono">Try an example — I&rsquo;ll put it in the real bar.</span>
                {current.examples.map((example) => <button key={example.text} type="button" onClick={() => fillExample(example.text)}>{example.label}</button>)}
                <small>Have every common? Just say so. List them all for $1? Yeah—I can do that.</small>
              </div>
            )}
            <button className="anko-showtarget" disabled={currentDone} onClick={showTarget}>{currentDone ? 'Done ✓' : `${current.action} ↓`}</button>
          </section>
        </div>
      </div>
    </div>
  )
}
