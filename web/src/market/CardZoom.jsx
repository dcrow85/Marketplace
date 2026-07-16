import AskAnko from '../trade/AskAnko.jsx'
import { retryImg } from '../binder/helpers.jsx'

// The lightbox: cards at table size. This is a TCG — sometimes you just need to hold
// the card up to the light before you trade for it. Facts ride under the art; the
// scan line stays honest about what sample listings can and can't show.
export default function CardZoom({ card, sub, witness, ask = 0, decision = null, actionsForRead, children, onClose }) {
  if (!card) return null
  return (
    <div className="zoom-overlay" role="dialog" aria-label={card.name_en} onClick={onClose}>
      <div className="zoom-body" onClick={(e) => e.stopPropagation()}>
        <button className="ghost sm zoom-close" onClick={onClose} aria-label="Close card view">✕</button>
        {card.image
          ? <img className="zoom-art" src={card.image} alt={card.name_en} onError={(ev) => retryImg(ev, card.image)} />
          : <div className="zoom-noimg">{card.name_en}</div>}
        <div className="zoom-facts">
          <div className="zoom-name">{card.name_en}<span className="mono dim"> · {card.num}</span></div>
          <div className="mono zoom-sub">
            {[card.release_family_label, card.rarity, sub].filter(Boolean).join(' · ')}
          </div>
          {!!witness && <div className="zoom-evidence recorded">
            <b>✓ {witness} seller photo{witness === 1 ? '' : 's'} recorded</b>
            <span>A witness to inspect, not proof of authenticity or condition.</span>
          </div>}
          {!witness && Number(ask) > 10 && <div className="zoom-evidence missing">
            <b><span aria-hidden="true">!</span> Seller photos needed</b>
            <span>Catalogue art is not evidence of this copy.</span>
          </div>}
        </div>
        {children && <div className="zoom-acts">{children}</div>}
        {decision && <div className="zoom-anko">
          <span className="zoom-secondlook mono">Want a second look?</span>
          <AskAnko decision={decision} recommended={Number(ask) > 10 && !witness}
            label="Ask Anko about this copy" actionsForRead={actionsForRead} />
        </div>}
      </div>
    </div>
  )
}
