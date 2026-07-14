import { useState } from 'react'
import { requestOfferEvidence, respondToOfferEvidence } from './offers.js'

const REQUEST_LEANS = new Set(['request_evidence', 'hold', 'cannot_resolve'])

function requestText(cardNames) {
  const subject = cardNames.length
    ? cardNames.slice(0, 3).join(', ') + (cardNames.length > 3 ? ` and ${cardNames.length - 3} more` : '')
    : 'the cards in this offer'
  return `Could you add clear front and back photos, condition notes, and any provenance you have for ${subject}?`
}

export default function OfferFollowThrough({ o, offersKey, read, cardNames = [], onAccept, onCounter, onDecline }) {
  const [draft, setDraft] = useState(null)
  const thread = Array.isArray(o.evidenceThread) ? o.evidenceThread : []
  const last = thread[thread.length - 1]
  const open = ['sent', 'seen'].includes(o.state)
  const needsEvidenceReply = open && last?.dir === 'in' && last.kind === 'request'
  const canFollowRead = o.dir === 'in' && open && read

  const openRequest = () => setDraft({ kind: 'request', text: requestText(cardNames) })
  const openResponse = () => setDraft({ kind: 'response', text: '' })
  const sendDraft = () => {
    if (!draft?.text.trim()) return
    const sent = draft.kind === 'request'
      ? requestOfferEvidence(offersKey, o.id, draft.text)
      : respondToOfferEvidence(offersKey, o.id, draft.text)
    if (sent) setDraft(null)
  }

  return (
    <div className="ofl-follow">
      {thread.length > 0 && (
        <section className="ofl-evidence" aria-label="Evidence messages">
          <div className="ofl-evidencehead mono">Evidence thread <span>messages are claims, not verification</span></div>
          {thread.slice(-4).map((event) => (
            <div key={event.id} className={'ofl-evmsg ' + event.dir}>
              <span className="mono">{event.dir === 'out' ? 'you' : 'them'} · {event.kind === 'request' ? 'asked' : 'answered'}</span>
              <p>{event.line}</p>
            </div>
          ))}
          {!o.live && <div className="mono ofl-evlocal">sample table · this rehearsal message stays in your browser</div>}
        </section>
      )}

      {canFollowRead && (
        <div className="anko-followbar">
          <span className="mono">Follow Anko’s suggestion</span>
          {REQUEST_LEANS.has(read.lean) && <button className="sheetbtn mk-sm mono" onClick={openRequest}>Ask for evidence →</button>}
          {read.lean === 'counter' && <button className="sheetbtn mk-sm mono" onClick={onCounter}>Build a counter →</button>}
          {read.lean === 'accept' && <button className="sheetbtn mk-sm mono sw-boot" onClick={onAccept}>Accept offer →</button>}
          {read.lean === 'decline' && <button className="sheetbtn mk-sm mono" onClick={onDecline}>Decline offer →</button>}
        </div>
      )}

      {needsEvidenceReply && !draft && (
        <div className="anko-followbar needs-reply">
          <span className="mono">They asked for more evidence</span>
          <button className="sheetbtn mk-sm mono" onClick={openResponse}>Respond with details →</button>
        </div>
      )}

      {draft && (
        <div className="ofl-evdraft">
          <label className="mono">{draft.kind === 'request' ? 'Message to the offerer' : 'Your evidence response'}</label>
          <textarea value={draft.text} maxLength={600} autoFocus
            placeholder={draft.kind === 'response' ? 'Describe the photos, scans, condition notes, or provenance you can provide…' : ''}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          <div className="ofl-evdraftacts">
            <button className="sheetbtn mk-sm mono" disabled={!draft.text.trim()} onClick={sendDraft}>
              {draft.kind === 'request' ? (o.live ? 'Send evidence request' : 'Record sample request') : (o.live ? 'Send response' : 'Record sample response')}
            </button>
            <button className="ghost sm" onClick={() => setDraft(null)}>cancel</button>
          </div>
          <p className="mono">This sends a message only. It does not verify evidence or change the offer.</p>
        </div>
      )}
    </div>
  )
}
