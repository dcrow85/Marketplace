import { RAIL_PAYPAL } from '../payments/rails.js'

const VIEW_LABELS = { front: 'front', back: 'back', corners: 'corners', holo_tilt: 'holo tilt' }

function Round({ who, verb, line, event, cardNameFor }) {
  const cards = (event?.cardUids || []).map(cardNameFor).filter(Boolean)
  const views = (event?.views || []).map((view) => VIEW_LABELS[view]).filter(Boolean)
  return (
    <div className={'dm-round' + (event?.dir === 'in' ? ' incoming' : '')}>
      <span className="dm-roundpin" aria-hidden="true" />
      <div>
        <span className="mono dm-roundwho"><b>{who}</b> {verb}</span>
        {line && <p>{line}</p>}
        {(cards.length > 0 || views.length > 0) && <span className="dm-roundmeta mono">
          {cards.length > 0 ? cards.join(' · ') : null}{cards.length > 0 && views.length > 0 ? ' — ' : null}{views.join(' · ')}
        </span>}
      </div>
    </div>
  )
}

export default function DealMat({ o, otherName, status, receiveItems, giveItems, cashFromYou, renderChip, cardNameFor }) {
  const paypal = o.rail === RAIL_PAYPAL || o.settlement?.rail === RAIL_PAYPAL
  const thread = Array.isArray(o.evidenceThread) ? o.evidenceThread : []
  return (
    <section className="dealmat" aria-label={`Deal mat with ${otherName}`}>
      <header className="dm-head">
        <span><b>Deal Mat</b><small className="mono">{o.counterOf ? 'counter on the table' : 'current terms'} · {otherName}</small></span>
        <span className={'dm-turn mono ' + status.tone}>{status.label}</span>
      </header>

      <div className="dm-board">
        <div className="dm-side receive">
          <span className="dm-sidelabel mono">You receive</span>
          <div className="dm-cards">
            {receiveItems.map(renderChip)}
            {o.cash && !cashFromYou && <span className="dm-money mono">+ {o.cash.amount} {o.settlement?.currency || 'USDC'}</span>}
            {!receiveItems.length && !(o.cash && !cashFromYou) && <span className="dm-empty">Nothing recorded</span>}
          </div>
        </div>
        <span className="dm-swap" aria-hidden="true">⇄</span>
        <div className="dm-side give">
          <span className="dm-sidelabel mono">You give</span>
          <div className="dm-cards">
            {giveItems.map(renderChip)}
            {o.cash && cashFromYou && <span className="dm-money mono">+ {o.cash.amount} {o.settlement?.currency || 'USDC'}</span>}
            {!giveItems.length && !(o.cash && cashFromYou) && <span className="dm-empty">Nothing recorded</span>}
          </div>
        </div>
      </div>

      {o.cash && <div className={'dm-rail mono ' + (paypal ? 'paypal' : 'escrow')}>
        <span>{cashFromYou ? 'You pay' : `${otherName} pays`} <b>{o.cash.amount} {o.settlement?.currency || 'USDC'}</b></span>
        <span>{paypal ? 'PayPal · external rail' : 'Cairn Escrow · funds held by contract'}</span>
      </div>}

      <div className="dm-rounds">
        <span className="dm-roundtitle mono">On the mat</span>
        <Round who={o.dir === 'out' ? 'You' : otherName} verb={o.counterOf ? 'countered' : 'made an offer'}
          line={o.note} cardNameFor={cardNameFor} />
        {thread.map((event) => <Round key={event.id} event={event}
          who={event.dir === 'out' ? 'You' : otherName}
          verb={event.kind === 'request' ? 'asked for evidence' : 'answered'}
          line={event.line} cardNameFor={cardNameFor} />)}
        {o.response?.line && <Round who={`${otherName} · agent`} verb="answered" line={o.response.line} cardNameFor={cardNameFor} />}
      </div>
    </section>
  )
}
