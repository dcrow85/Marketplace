// The one art-led tile: image, name, a fact line, selection ring, and optional
// corner/action slots. Replaces the ofr-tile and mkf-tile renderer families —
// composer grids, the Settle room, My table, and Anko's finds all draw THIS.
export default function MiniCard({ c, sel, dim, sub, corner, actions, onTap, title }) {
  const Tag = onTap ? 'button' : 'div'
  return (
    <Tag className={'minicard' + (sel ? ' sel' : '') + (dim ? ' mk-dim' : '')}
      onClick={onTap} title={title}
      {...(onTap ? {} : { role: 'group' })}>
      {c.image ? <img src={c.image} alt={c.name_en || ''} loading="lazy" /> : <span className="minicard-noimg">{c.name_en || c.uid}</span>}
      {corner}
      <span className="minicard-name">{c.name_en || c.uid}</span>
      {sub && <span className="mono minicard-sub">{sub}</span>}
      {actions}
      {sel && <span className="minicard-check">✓</span>}
    </Tag>
  )
}
