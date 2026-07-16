import { retryImg } from '../binder/helpers.jsx'

// The one art-led tile: image, name, a fact line, selection ring, and optional
// corner/action slots. Replaces the ofr-tile and mkf-tile renderer families —
// composer grids, the Settle room, My table, and Anko's finds all draw THIS.
export default function MiniCard({ c, sel, dim, sub, corner, actions, onTap, title, className = '' }) {
  const Tag = onTap && !actions ? 'button' : 'div'
  const interactiveDiv = onTap && actions
  const kicker = c.release_family_label || c.set_label || c.product_channel_label || ''
  return (
    <Tag className={'minicard' + (sel ? ' sel' : '') + (dim ? ' mk-dim' : '') + (className ? ` ${className}` : '')}
      onClick={onTap} title={title}
      {...(interactiveDiv
        ? { role: 'button', tabIndex: 0, onKeyDown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onTap() } } }
        : onTap ? {} : { role: 'group' })}>
      {c.image ? <img src={c.image} alt={c.name_en || ''} loading="lazy" decoding="async" onError={(e) => retryImg(e, c.image)} /> : <span className="minicard-noimg">{c.name_en || c.uid}</span>}
      {corner}
      {kicker && <span className="mono minicard-kicker">{kicker}</span>}
      <span className="minicard-name">{c.name_en || c.uid}</span>
      {sub && <span className="mono minicard-sub">{sub}</span>}
      {actions}
      {sel && <span className="minicard-check">✓</span>}
    </Tag>
  )
}
