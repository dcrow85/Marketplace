// The lightbox: cards at table size. This is a TCG — sometimes you just need to hold
// the card up to the light before you trade for it. Facts ride under the art; the
// scan line stays honest about what sample listings can and can't show.
export default function CardZoom({ card, sub, witness, children, onClose }) {
  if (!card) return null
  return (
    <div className="zoom-overlay" role="dialog" aria-label={card.name_en} onClick={onClose}>
      <div className="zoom-body" onClick={(e) => e.stopPropagation()}>
        {card.image
          ? <img className="zoom-art" src={card.image} alt={card.name_en} onError={(ev) => retryImg(ev, card.image)} />
          : <div className="zoom-noimg">{card.name_en}</div>}
        <div className="zoom-facts">
          <div className="zoom-name">{card.name_en}<span className="mono dim"> · {card.num}</span></div>
          <div className="mono zoom-sub">
            {[card.release_family_label, card.rarity, sub].filter(Boolean).join(' · ')}
          </div>
          {witness != null && (
            <div className="mono zoom-wit">{witness
              ? `✓ ${witness} pile scan${witness === 1 ? '' : 's'} recorded — with real listings, the scans show here`
              : '— no scans behind this listing: their word alone'}</div>
          )}
        </div>
        {children && <div className="zoom-acts">{children}</div>}
        <button className="ghost sm zoom-close" onClick={onClose}>✕ close</button>
      </div>
    </div>
  )
}
import { retryImg } from '../binder/helpers.jsx'
