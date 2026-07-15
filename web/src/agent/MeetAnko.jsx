import { useEffect, useState } from 'react'
import { saveProfile } from '../profile/profileStore.js'
import './anko.css'

const AVATAR = (import.meta.env.BASE_URL || '/') + 'agent/anko-avatar-v1.png'

export function HaveActionsLesson({ onDone, compact = false }) {
  return (
    <aside className={'anko-have-actions' + (compact ? ' compact' : '')} role="note" aria-label="Anko explains selling and trading">
      <img src={AVATAR} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
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

export default function MeetAnko({ accountId, profile, progress, onDone }) {
  const [name, setName] = useState(profile.name || '')
  const [sign, setSign] = useState(profile.sign || '')
  const [reward, setReward] = useState(null)
  const profileDone = !!progress.milestones.find((item) => item.id === 'profile')?.done
  const markDone = !!progress.milestones.find((item) => item.id === 'mark')?.done
  const step = profileDone ? 'mark' : 'profile'

  useEffect(() => {
    if (!markDone) return undefined
    const timer = window.setTimeout(onDone, 1150)
    return () => window.clearTimeout(timer)
  }, [markDone, onDone])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !markDone) onDone()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [markDone, onDone])

  const introduce = (event) => {
    event.preventDefault()
    if (!name.trim() || !sign.trim()) return
    const source = event.currentTarget.querySelector('button[type="submit"]')?.getBoundingClientRect()
    const target = document.querySelector('.profile-points')?.getBoundingClientRect()
    if (source && target) {
      const left = source.left + source.width / 2
      const top = source.top + source.height / 2
      setReward({ left, top, dx: target.left + target.width / 2 - left, dy: target.top + target.height / 2 - top })
    }
    saveProfile(accountId, { ...profile, name: name.trim(), sign: sign.trim() })
  }

  const fillExample = (text) => {
    window.dispatchEvent(new CustomEvent('cairn-anko-prompt', { detail: { text } }))
  }

  return (
    <aside className={'anko-onboard anko-onboard-' + step + (markDone ? ' settling' : '')}
      data-milestone-id={step} role="complementary" aria-labelledby="anko-onboard-title">
      {reward && <span className="point-flight" aria-live="polite"
        style={{ left: reward.left, top: reward.top, '--point-dx': `${reward.dx}px`, '--point-dy': `${reward.dy}px` }}
        onAnimationEnd={() => setReward(null)}>
        <b>✦ +1</b><i>✦</i><i>✦</i><i>✦</i>
      </span>}
      <div className="anko-onboard-portrait">
        <img src={AVATAR} alt="Anko, your Cairn collecting guide" />
        <span className="mono">ANKO</span>
      </div>

      {markDone ? (
        <div className="anko-onboard-copy anko-onboard-home" aria-live="polite">
          <h2 id="anko-onboard-title">Your first card is in.</h2>
          <p>I&rsquo;m always here if you need me.</p>
          <small className="mono">Ask from this bar anytime.</small>
        </div>
      ) : step === 'profile' ? (
        <div className="anko-onboard-copy">
          <span className="anko-kicker mono">YOUR CAIRN GUIDE</span>
          <h2 id="anko-onboard-title">Hi, I&rsquo;m Anko.</h2>
          <p>I know the cards on Cairn. I can help you organize, price, buy, and trade—and I&rsquo;ll show you every change before it happens.</p>
          <form className="anko-intro-form" onSubmit={introduce}>
            <label>
              <span>What should I call you?</span>
              <input autoFocus maxLength={32} value={name} placeholder="Collector name"
                onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              <span>What brings you to the table?</span>
              <input maxLength={140} value={sign} placeholder="What you collect, trade, or hunt"
                onChange={(event) => setSign(event.target.value)} />
            </label>
            <button className="primary" type="submit" disabled={!name.trim() || !sign.trim()}>
              Good to meet you <small>· +1 point</small>
            </button>
          </form>
        </div>
      ) : (
        <div className="anko-onboard-copy">
          <span className="anko-kicker mono">GOOD TO MEET YOU, {profile.name}</span>
          <h2 id="anko-onboard-title">Let&rsquo;s put one card in your Binder.</h2>
          <div className="anko-terms" aria-label="Have and Want meanings">
            <div><strong>Have</strong><span>A card you own.</span></div>
            <div><strong>Want</strong><span>A card you&rsquo;re looking for.</span></div>
          </div>
          <p>Use the bar above to search by name, or ask me in plain English. Then choose Have or Want on the real card below.</p>
          <div className="anko-first-prompts" aria-label="Example searches and requests">
            <button type="button" onClick={() => fillExample('Penny')}>Find Penny</button>
            <button type="button" onClick={() => fillExample('I have every common')}>I have every common</button>
          </div>
        </div>
      )}

      {!markDone && <button className="anko-onboard-skip mono" type="button" onClick={onDone}>Explore on my own</button>}
    </aside>
  )
}
