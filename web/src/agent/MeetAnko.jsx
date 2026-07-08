import { useEffect, useState } from 'react'
import './anko.css'

// Meeting Anko: the house agent introduces himself AND the platform, in his own
// voice, one beat at a time. This is the first thing a collector sees after signing
// in — it teaches the trichotomy (recorded / claimed / my read), the three rooms,
// and the two promises, all in under a minute. His flame is an onibi: the blue
// ghost light of the old stories, inverted — it shows, it never leads.
const IMG = (import.meta.env.BASE_URL || '/') + 'agent/house.png'

const BEATS = ['flame', 'agent', 'registers', 'rooms', 'promise']

function Onibi({ big }) {
  return (
    <div className={'onibi' + (big ? ' big' : '')} aria-hidden="true">
      <span className="onibi-core" />
      <span className="onibi-inner" />
    </div>
  )
}

export default function MeetAnko({ onDone }) {
  const [beat, setBeat] = useState(0)
  const [imgOk, setImgOk] = useState(true)
  const last = beat === BEATS.length - 1
  const next = () => { if (!last) setBeat((b) => b + 1) }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') setBeat((b) => Math.min(b + 1, BEATS.length - 1)) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="anko-gate" onClick={next} role="button" tabIndex={0}>
      <button className="anko-skip mono" onClick={(e) => { e.stopPropagation(); onDone() }}>skip →</button>

      <div className="anko-stage" key={beat}>
        {beat === 0 && (
          <div className="anko-beat">
            <Onibi big />
            <p className="anko-line">In the old stories, <b>onibi</b> are ghost lights — blue flames that lure travelers off their path.</p>
            <p className="anko-line anko-turn">This one doesn&rsquo;t lure. It holds still, so you can read by it.</p>
          </div>
        )}

        {beat === 1 && (
          <div className="anko-beat">
            <div className="anko-portrait">
              {imgOk
                ? <img src={IMG} alt="Anko — Elemental 4193" onError={() => setImgOk(false)} />
                : <div className="anko-noimg"><Onibi big /></div>}
            </div>
            <h1 className="anko-name">This is Anko.</h1>
            <div className="anko-prov mono">ELEMENTAL 4193 · FIRE · RED PANDA · HELD SINCE JAN 2025</div>
            <p className="anko-line">Simmered out of the same beans as everything here. Even your agent carries a record.</p>
          </div>
        )}

        {beat === 2 && (
          <div className="anko-beat">
            <div className="anko-minirow">{imgOk && <img className="anko-mini" src={IMG} alt="" />}<Onibi /></div>
            <p className="anko-line">&ldquo;I speak in three registers — and I always tell you which one I&rsquo;m using.&rdquo;</p>
            <div className="anko-regs">
              <div className="anko-reg"><span className="anko-tag rec mono">recorded</span><span>The protocol saw it happen. Locked funds, witnessed scans, settled trades.</span></div>
              <div className="anko-reg"><span className="anko-tag clm mono">claimed</span><span>Someone said it. It&rsquo;s on the record — that doesn&rsquo;t make it true.</span></div>
              <div className="anko-reg"><span className="anko-tag red mono">my read</span><span>My judgment, labeled as judgment. Never dressed up as a fact.</span></div>
            </div>
          </div>
        )}

        {beat === 3 && (
          <div className="anko-beat">
            <div className="anko-minirow">{imgOk && <img className="anko-mini" src={IMG} alt="" />}<Onibi /></div>
            <p className="anko-line">&ldquo;Three rooms. Everything happens on the page you&rsquo;re standing in.&rdquo;</p>
            <div className="anko-regs">
              <div className="anko-reg"><span className="anko-tag room mono">binder</span><span>What you hold and what you hunt. A scan becomes a witness — not proof, but a witness that travels with the card.</span></div>
              <div className="anko-reg"><span className="anko-tag room mono">market</span><span>Other people&rsquo;s tables. Asks are claims; the witness column shows what&rsquo;s recorded behind them.</span></div>
              <div className="anko-reg"><span className="anko-tag room mono">trades</span><span>Money locks before cards move. Escrow holds, an arbiter can be named — and the decision stays yours.</span></div>
            </div>
          </div>
        )}

        {beat === 4 && (
          <div className="anko-beat">
            <div className="anko-portrait sm">
              {imgOk
                ? <img src={IMG} alt="Anko" />
                : <div className="anko-noimg"><Onibi big /></div>}
            </div>
            <p className="anko-line">&ldquo;Two promises, kept by construction:</p>
            <p className="anko-line"><b>I will never sell you anything.</b></p>
            <p className="anko-line"><b>I will never call a card real, or mint, when I can&rsquo;t see it.</b>&rdquo;</p>
            <p className="anko-line dim">The record shows. You decide.</p>
            <button className="anko-enter" onClick={(e) => { e.stopPropagation(); onDone() }}>Light the lamp →</button>
          </div>
        )}
      </div>

      <div className="anko-foot mono">
        <span className="anko-dots">{BEATS.map((b, i) => <i key={b} className={i === beat ? 'on' : ''} />)}</span>
        {!last && <span className="anko-hint">tap to continue</span>}
      </div>
    </div>
  )
}
