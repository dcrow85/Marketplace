import { retryImg } from '../binder/helpers.jsx'
import { cardDisplayName, cardOriginText } from '../cards/cardNames.js'

// The one art-led tile: image, name, a fact line, selection ring, and optional
// corner/action slots. Replaces the ofr-tile and mkf-tile renderer families —
// composer grids, the Settle room, My table, and Anko's finds all draw THIS.
export default function MiniCard({ c, sel, dim, sub, corner, status, actions, onTap, title, className = '' }) {
  const Tag = onTap && !actions ? 'button' : 'div'
  const interactiveDiv = onTap && actions
  const kicker = c.release_family_label || c.set_label || c.product_channel_label || ''
  const name = cardDisplayName(c)
  const origin = cardOriginText(c)
  return (
    <Tag className={'minicard' + (sel ? ' sel' : '') + (dim ? ' mk-dim' : '') + (className ? ` ${className}` : '')}
      onClick={onTap} title={title}
      {...(interactiveDiv ? { role: 'group' } : onTap ? {} : { role: 'group' })}>
      {interactiveDiv && <button type="button" className="minicard-view" onClick={onTap} aria-label={`View ${name} details`} />}
      {c.image ? <img src={c.image} alt={name} loading="lazy" decoding="async" onError={(e) => retryImg(e, c.image)} /> : <span className="minicard-noimg">{name}</span>}
      {corner}
      {status && <span className="minicard-statusrow">{status}</span>}
      {kicker && <span className="mono minicard-kicker">{kicker}</span>}
      <span className="minicard-name">{name}</span>
      {origin && <span className="mono minicard-origin">{origin}</span>}
      {sub && <span className="mono minicard-sub">{sub}</span>}
      {actions}
      {sel && <span className="minicard-check">✓</span>}
    </Tag>
  )
}
