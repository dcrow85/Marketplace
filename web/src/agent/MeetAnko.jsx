import { useEffect, useState } from 'react'
import './anko.css'

// Meeting Anko: the house agent introduces himself AND the platform, in his own
// voice, one beat at a time — grin first, rules underneath. It still teaches the
// trichotomy (recorded / claimed / my read), the three rooms, and the two promises,
// but as HIS lines, not a plaque's. His flame is an onibi: the ghost light of the
// old stories — his is "broken": it only shows, it never leads.
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
      <button className="anko-skip mono" onClick={(e) => { e.stopPropagation(); onDone() }}>skip → (he&rsquo;ll forgive you)</button>

      <div className="anko-stage" key={beat}>
        {beat === 0 && (
          <div className="anko-beat">
            <Onibi big />
            <p className="anko-line">See this little blue flame? The old stories call it an <b>onibi</b> — a ghost light that lures travelers off their path.</p>
            <p className="anko-line anko-turn">Mine&rsquo;s broken. It just shows you things.</p>
            <p className="anko-line dim">Best defect I ever had.</p>
          </div>
        )}

        {beat === 1 && (
          <div className="anko-beat">
            <div className="anko-portrait">
              {imgOk
                ? <img src={IMG} alt="Anko — Elemental 4193" onError={() => setImgOk(false)} />
                : <div className="anko-noimg"><Onibi big /></div>}
            </div>
            <h1 className="anko-name">Hey. I&rsquo;m Anko.</h1>
            <div className="anko-prov mono">ELEMENTAL 4193 · FIRE · RED PANDA · HELD SINCE JAN 2025</div>
            <p className="anko-line">Red panda — <b>not</b> a raccoon, everyone gets one free mistake. Named after bean paste. Fire type, but the flame runs cool.</p>
            <p className="anko-line dim">I&rsquo;m everyone&rsquo;s agent here. You&rsquo;re stuck with me — luckily, I&rsquo;m great.</p>
          </div>
        )}

        {beat === 2 && (
          <div className="anko-beat">
            <div className="anko-minirow">{imgOk && <img className="anko-mini" src={IMG} alt="" />}<Onibi /></div>
            <p className="anko-line">Quick game. Somebody lists a card:</p>
            <div className="anko-quote">&ldquo;Mint condition. Super rare. Definitely real.&rdquo;<span className="mono dim"> — someone, somewhere</span></div>
            <p className="anko-line">Here&rsquo;s me, on the same card:</p>
            <div className="anko-regs">
              <div className="anko-reg"><span className="anko-tag rec mono">recorded</span><span>&ldquo;The scan&rsquo;s been on record since June. That part&rsquo;s real.&rdquo;</span></div>
              <div className="anko-reg"><span className="anko-tag clm mono">claimed</span><span>&ldquo;Mint is <i>their</i> word. On the record — not made true by it.&rdquo;</span></div>
              <div className="anko-reg"><span className="anko-tag red mono">my read</span><span>&ldquo;Price smells high to me. That&rsquo;s a hunch, and I&rsquo;m labeling it one.&rdquo;</span></div>
            </div>
            <p className="anko-line dim">Three registers. I&rsquo;ll always tell you which one I&rsquo;m in.</p>
          </div>
        )}

        {beat === 3 && (
          <div className="anko-beat">
            <div className="anko-minirow">{imgOk && <img className="anko-mini" src={IMG} alt="" />}<Onibi /></div>
            <p className="anko-line">The tour, speedrun edition:</p>
            <div className="anko-regs">
              <div className="anko-reg"><span className="anko-tag room mono">binder</span><span>Your cards. Dump a pile in front of my eye and I&rsquo;ll read it — every scan becomes a witness that travels with the card.</span></div>
              <div className="anko-reg"><span className="anko-tag room mono">market</span><span>Other people&rsquo;s tables. I&rsquo;ll show you every ask — and what&rsquo;s actually recorded behind it.</span></div>
              <div className="anko-reg"><span className="anko-tag room mono">trades</span><span>Money locks before cards move, and it doesn&rsquo;t move again until you say so.</span></div>
            </div>
            <p className="anko-line dim">That&rsquo;s it. That&rsquo;s the app.</p>
          </div>
        )}

        {beat === 4 && (
          <div className="anko-beat">
            <div className="anko-portrait sm">
              {imgOk
                ? <img src={IMG} alt="Anko" />
                : <div className="anko-noimg"><Onibi big /></div>}
            </div>
            <p className="anko-line">Two things I will never do:</p>
            <p className="anko-line"><b>Sell you anything.</b> <span className="dim">Not my job. Never will be.</span></p>
            <p className="anko-line"><b>Call a card real — or mint — when I can&rsquo;t see it.</b> <span className="dim">Nobody can. People who say otherwise are selling something.</span></p>
            <p className="anko-line anko-turn">Everything else, we figure out together.</p>
            <button className="anko-enter" onClick={(e) => { e.stopPropagation(); onDone() }}>Light the lamp →</button>
          </div>
        )}
      </div>

      <div className="anko-foot mono">
        <span className="anko-dots">{BEATS.map((b, i) => <i key={b} className={i === beat ? 'on' : ''} />)}</span>
        {!last && <span className="anko-hint">tap anywhere — he doesn&rsquo;t bite</span>}
      </div>
    </div>
  )
}
