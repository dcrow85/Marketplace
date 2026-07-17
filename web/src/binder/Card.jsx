// The binder cell: seg bar, card, caption. The canonical card renderer — the market's
// tables borrow this exact skeleton so every page speaks one visual language.
import { entryFor as effStance } from './collection.js'
import { nm, retryImg, wantActive, capMeta, provBadge } from './helpers.jsx'

export default function Card({ c, store, setStance, setField, showSet, setLabel, pick, onOpen, onMarket, userPhoto, fromAsk, onQuickSell, haveActionsGuide, onUseHaveAction }) {
  const e = effStance(c, store)
  const have = e.stance === 'have'
  const ring = e.stance === 'pass' ? 's-pass' : e.grail ? 's-grail' : have ? 's-have' : e.stance === 'want' ? (wantActive(c, store) ? 's-want' : 's-wish') : ''
  const meta = capMeta(c, e, store)
  return (
    <div className={'cell ' + (have ? 'own' : 'ghost') + (pick ? ' is-pick' : '') + (e.stance === 'pass' ? ' passed' : '')}>
      <div className="stancebar">
        <button className={'seg sg-have' + (have ? ' on' : '')} onClick={() => setStance(c.uid, have ? 'none' : 'have')}>Have</button>
        {have
          ? <>
              <button className={'seg sg-sell' + (e.sell ? ' on' : '') + (haveActionsGuide ? ' anko-target' : '')}
                aria-label={e.sell ? 'Remove sale listing' : 'Sell this card'} title={e.sell ? 'listed for sale — tap to unlist' : 'list for sale'}
                onClick={() => { onUseHaveAction?.(); const on = !e.sell; setField(c.uid, 'sell', on); if (!on) setField(c.uid, 'display', false); if (on && onQuickSell) onQuickSell(c.uid) }}>$</button>
              <button className={'seg sg-tradeq' + (e.trade ? ' on' : '') + (haveActionsGuide ? ' anko-target' : '')}
                aria-label={e.trade ? 'Close this card to trades' : 'Trade this card'} title={e.trade ? 'open to trade — tap to close' : 'open to trade'}
                onClick={() => { onUseHaveAction?.(); setField(c.uid, 'trade', !e.trade) }}>⇄</button>
            </>
          : <button className={'seg sg-want' + (e.stance === 'want' ? ' on' : '')} onClick={() => setStance(c.uid, e.stance === 'want' ? 'none' : 'want')}>Want</button>}
      </div>
      {haveActionsGuide}
      <div className={'card ' + (have ? 'own' : 'ghost') + (ring ? ' ' + ring : '')} onClick={() => onOpen && onOpen(c.uid)} role="button" tabIndex={0} title="open card">
        {pick && <span className="pickflag" title="your agent surfaced this">★</span>}
        <div className="face"><div className="ja">{nm(c)}</div><div className="nn">{c.romaji || (c.name_is_en ? 'EN' : '')}</div></div>
        {(userPhoto || c.image) && <img src={userPhoto || c.image} alt={nm(c)} loading="lazy" decoding="async" onError={userPhoto ? undefined : (e) => retryImg(e, c.image)} />}
        {userPhoto && <span className="yoursflag" title="your photo">yours</span>}
        {c.holo ? <span className="holodot" title={c.star_alt ? 'star / alternate-art signal' : 'holo'} /> : null}
        {provBadge(c)}
      </div>
      <div className="caption" onClick={() => onOpen && onOpen(c.uid)}>
        {showSet && <div className="cset">{setLabel}</div>}
        <div className="cap-top"><span className="cnum">{c.num}</span><span className="cja">{nm(c)}</span></div>
        <div className="cap-sub">
          <span className="crom">{c.romaji || c.name_en || ''}{c.name_is_en && <span className="enmark">EN</span>}</span>
          <span className={'cmeta ' + meta.cls}>{meta.t}</span>
        </div>
        {fromAsk != null && <button type="button" className="cap-avail mono"
          onClick={(ev) => { ev.stopPropagation(); onMarket?.(c.uid) }}>
          available · from <span className="money">{fromAsk} USDC</span> →
        </button>}
      </div>
    </div>
  )
}
