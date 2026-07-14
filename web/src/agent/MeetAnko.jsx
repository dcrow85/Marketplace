import { useEffect, useState } from 'react'
import './anko.css'

const IMG = (import.meta.env.BASE_URL || '/') + 'agent/house.png'

const FRAMES = [
  {
    id: 'first-lap',
    kicker: 'First lap · 8 points',
    line: 'I’m Anko. I stay here in the interface—usually beside the questions that matter.',
    note: 'Profile +1, picture +1, first mark +1. Your first recorded scan is the big one: +5.',
  },
  {
    id: 'binder',
    kicker: 'Your Binder',
    line: 'Have or Want starts the record. A scan adds evidence—not certainty.',
    note: 'You can change every mark later. The card record stays yours.',
  },
  {
    id: 'decisions',
    kicker: 'Market → Trades',
    line: 'See the terms, ask me for a bounded read, then make the decision yourself.',
    note: 'I can point out gaps and ask for evidence. I never send, pay, or call a claim proven.',
  },
]

function FirstLapMini({ points }) {
  return (
    <div className="anko-miniui lap" aria-label={`${points} of 8 first-lap points`}>
      <div className="anko-mininav"><b>c(ai)rn</b><span>Binder</span><span>My Table</span><i>✦ {points}</i></div>
      <div className="anko-minititle"><span>YOUR FIRST LAP</span><strong>{points}/8</strong></div>
      <div className="anko-ministeps">
        <span><i>01</i><b>Profile</b><small>name your table</small><em>+1</em></span>
        <span><i>02</i><b>Picture</b><small>show your face</small><em>+1</em></span>
        <span><i>03</i><b>First card</b><small>Have or Want</small><em>+1</em></span>
        <span><i>04</i><b>Scan</b><small>add a witness</small><em>+5</em></span>
      </div>
    </div>
  )
}

function BinderMini() {
  return (
    <div className="anko-miniui binder" aria-label="Binder card controls">
      <div className="anko-mininav"><b>Binder</b><span>Have</span><span>Want</span><i>Scan cards</i></div>
      <div className="anko-minicard">
        <div className="anko-cardart"><span>YOUR<br />CARD</span></div>
        <div><small>AZK01-002</small><strong>Healing Flutter</strong><p>Mark what you know. Add evidence when you have it.</p></div>
      </div>
      <div className="anko-miniactions"><b>Have</b><b>Want</b><b className="scan">Scan +</b></div>
    </div>
  )
}

function DecisionMini() {
  return (
    <div className="anko-miniui decision" aria-label="Market and Trades decision flow">
      <div className="anko-flow"><b>TABLE</b><i>→</i><b>TERMS</b><i>→</i><b>YOU DECIDE</b></div>
      <div className="anko-offer"><span><small>You receive</small><strong>1 card</strong></span><span><small>You pay</small><strong>12 USDC</strong></span></div>
      <div className="anko-readmini"><img src={IMG} alt="" /><span><b>Anko’s read · advisory</b><small>Condition is claimed. Ask for a clearer scan before paying.</small></span></div>
      <div className="anko-miniactions"><b>Ask for evidence</b><b className="scan">Make offer</b></div>
    </div>
  )
}

export default function MeetAnko({ onDone, points = 0 }) {
  const [frame, setFrame] = useState(0)
  const [imgOk, setImgOk] = useState(true)
  const current = FRAMES[frame]
  const last = frame === FRAMES.length - 1

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') onDone()
      if (event.key === 'ArrowRight') setFrame((value) => Math.min(value + 1, FRAMES.length - 1))
      if (event.key === 'ArrowLeft') setFrame((value) => Math.max(value - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onDone])

  return (
    <div className="anko-guide" role="dialog" aria-modal="true" aria-labelledby="anko-guide-title">
      <div className="anko-book">
        <div className="anko-booktop mono">
          <span>CAIRN FIELD GUIDE · 01</span>
          <button onClick={onDone}>skip · let me explore</button>
        </div>
        <div className="anko-comic" key={current.id}>
          <aside className="anko-character">
            <div className="anko-speedlines" aria-hidden="true" />
            {imgOk
              ? <img src={IMG} alt="Anko" onError={() => setImgOk(false)} />
              : <span className="anko-fallback">A</span>}
            <span className="anko-who mono">ANKO · YOUR AGENT</span>
          </aside>
          <section className="anko-page">
            <div className="anko-speech">
              <span className="mono">{current.kicker}</span>
              <h1 id="anko-guide-title">{current.line}</h1>
              <p>{current.note}</p>
            </div>
            <div className="anko-interfaceframe">
              {current.id === 'first-lap' && <FirstLapMini points={points} />}
              {current.id === 'binder' && <BinderMini />}
              {current.id === 'decisions' && <DecisionMini />}
              <span className="anko-sfx" aria-hidden="true">{current.id === 'decisions' ? 'READ!' : current.id === 'binder' ? 'MARK!' : 'START!'}</span>
            </div>
          </section>
        </div>
        <div className="anko-bookfoot">
          <span className="anko-pagenum mono">{FRAMES.map((item, index) => <i key={item.id} className={index === frame ? 'on' : ''}>{index + 1}</i>)}</span>
          <span className="anko-bookacts">
            {frame > 0 && <button className="ghost" onClick={() => setFrame((value) => value - 1)}>← back</button>}
            <button className="primary" onClick={() => last ? onDone() : setFrame((value) => value + 1)}>
              {last ? 'Start with my profile · +1 →' : 'next panel →'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
