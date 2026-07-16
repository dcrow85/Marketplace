import { RAIL_PAYPAL } from '../payments/rails.js'

const VIEW_LABELS = { front: 'front', back: 'back', corners: 'corners', holo_tilt: 'holo tilt' }

function ItemSection({ label, items, cash, renderChip }) {
  return (
    <section className="checkout-items">
      <h4>{label}</h4>
      <div className="checkout-itemlist">
        {items.map(renderChip)}
        {cash && <span className="checkout-cash mono">{cash}</span>}
        {!items.length && !cash && <span className="checkout-empty">Nothing</span>}
      </div>
    </section>
  )
}

function Update({ who, verb, line, event, cardNameFor }) {
  const cards = (event?.cardUids || []).map(cardNameFor).filter(Boolean)
  const views = (event?.views || []).map((view) => VIEW_LABELS[view]).filter(Boolean)
  return (
    <div className="checkout-update">
      <span className="mono"><b>{who}</b> {verb}</span>
      {line && <p>{line}</p>}
      {(cards.length > 0 || views.length > 0) && <small className="mono">
        {cards.length > 0 ? cards.join(' · ') : null}{cards.length > 0 && views.length > 0 ? ' — ' : null}{views.join(' · ')}
      </small>}
    </div>
  )
}

export default function OfferSummary({ o, otherName, status, receiveItems, giveItems, cashFromYou, renderChip, cardNameFor, open }) {
  const paypal = o.rail === RAIL_PAYPAL || o.settlement?.rail === RAIL_PAYPAL
  const currency = o.settlement?.currency || 'USDC'
  const thread = Array.isArray(o.evidenceThread) ? o.evidenceThread : []
  const updateCount = (o.note ? 1 : 0) + thread.length + (o.response?.line ? 1 : 0)
  const receiveCash = o.cash && !cashFromYou ? `${o.cash.amount} ${currency}` : null
  const giveCash = o.cash && cashFromYou ? `${o.cash.amount} ${currency}` : null
  const railName = paypal ? 'PayPal' : 'Cairn Escrow'

  return (
    <section className="checkout-offer" aria-label={`Offer with ${otherName}`}>
      <header className="checkout-head">
        <span>
          <small className="mono">{o.counterOf ? 'Counteroffer' : o.dir === 'in' ? 'Offer from' : 'Offer to'}{o.live ? ' · live' : ''}</small>
          <b>{otherName}</b>
        </span>
        <span className={'checkout-status mono ' + status.tone}>{status.label}</span>
      </header>

      <div className="checkout-body">
        <ItemSection label="You receive" items={receiveItems} cash={receiveCash} renderChip={renderChip} />
        <ItemSection label="You give" items={giveItems} cash={giveCash} renderChip={renderChip} />

        <section className="checkout-payment" aria-label="Payment summary">
          <span><small>Payment</small><b>{o.cash ? railName : 'No cash payment'}</b></span>
          {o.cash && <span className="checkout-paymentamount">
            <b>{o.cash.amount} {currency}</b>
            <small>{cashFromYou ? 'you pay' : 'you receive'}</small>
          </span>}
          {o.cash && <p>{paypal ? 'Handled outside Cairn through PayPal.' : 'Held by Cairn Escrow after terms are accepted.'}</p>}
        </section>
      </div>

      {open && <div className="checkout-boundary mono">
        {o.dir === 'in' ? 'Accepting agrees to these terms. No payment is made yet.' : 'This offer is open. No payment has been made.'}
      </div>}

      {updateCount > 0 && <details className="checkout-updates">
        <summary>Messages &amp; updates <span className="mono">{updateCount}</span></summary>
        <div className="checkout-updatelist">
          {o.note && <Update who={o.dir === 'out' ? 'You' : otherName} verb="wrote" line={o.note} cardNameFor={cardNameFor} />}
          {thread.map((event) => <Update key={event.id} event={event}
            who={event.dir === 'out' ? 'You' : otherName}
            verb={event.kind === 'request' ? 'asked for photos' : 'answered'}
            line={event.line} cardNameFor={cardNameFor} />)}
          {o.response?.line && <Update who={`${otherName} · agent`} verb="answered" line={o.response.line} cardNameFor={cardNameFor} />}
        </div>
      </details>}
    </section>
  )
}
