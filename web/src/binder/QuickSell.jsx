import { nm, Frow, COND_TYPES, PRODUCT_CONDITIONS, GRADERS, COND_GRADES, gradePrompt } from './helpers.jsx'

// The $ pop-up: list a card without leaving the page. Just the listing facts — ask,
// condition, copies — with the market's own numbers right above the ask so pricing
// isn't a guess. The full modal stays one tap away for everything else.
export default function QuickSell({ c, store, setField, fromAsk, lastSale, onOpenFull, onClose }) {
  const u = store[c.uid] || {}
  const isProduct = c.catalog_item_kind === 'sealed_product'
  const ct = isProduct ? (u.cond_type || c.cond_type || 'factory sealed') : u.cond_type === 'tag' ? 'graded' : (u.cond_type || 'raw')
  return (
    <div className="sc-overlay" role="dialog" aria-label="List for sale" onClick={(ev) => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="sc-sheet qs">
        <div className="qs-head">
          <div>
            <div className="ek">For sale</div>
            <div className="qs-title">{nm(c)} <span className="mono dim">{c.num}</span></div>
          </div>
          <button className="primary qs-done" onClick={onClose}>done</button>
        </div>
        <div className="qs-mkt mono">
          {fromAsk != null ? <>market: from <span className="money">{fromAsk} USDC</span></> : 'market: nobody else is asking'}
          {lastSale ? <> · last settled <span className="money">{lastSale.p} USDC</span> ({lastSale.d})</> : ' · no settlements on record'}
        </div>
        <div className="qs-body">
          <Frow label="Ask"><span className="fpre money">$</span><input className="ti num money-input" type="number" min="0" placeholder="USDC" autoFocus value={u.ask || ''} onChange={(ev) => setField(c.uid, 'ask', ev.target.value)} /></Frow>
          <Frow label="Condition">
            {isProduct ? <select className="ti condtype" value={ct} onChange={(ev) => setField(c.uid, 'cond_type', ev.target.value)}>
              {PRODUCT_CONDITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select> : <>
            <select className="ti condtype" value={ct} onChange={(ev) => { setField(c.uid, 'cond_type', ev.target.value); setField(c.uid, 'cond_grade', ''); setField(c.uid, 'cond_grader', '') }}>
              {COND_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {ct === 'graded' && (
              <select className="ti condgrader" value={u.cond_grader || ''} onChange={(ev) => { setField(c.uid, 'cond_grader', ev.target.value); setField(c.uid, 'cond_type', 'graded') }}>
                <option value="">grader…</option>
                {GRADERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            <select className="ti condgrade" value={u.cond_grade || ''} onChange={(ev) => setField(c.uid, 'cond_grade', ev.target.value)}>
              <option value="">{gradePrompt(ct)}</option>
              {(COND_GRADES[ct] || COND_GRADES.raw).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            </>}
          </Frow>
          <Frow label="Copies"><input className="ti num" type="number" min="1" value={u.copies || 1} onChange={(ev) => setField(c.uid, 'copies', Math.max(1, parseInt(ev.target.value || '1', 10)))} /></Frow>
        </div>
        <div className="qs-foot">
          <button className="ghost sm" onClick={() => { setField(c.uid, 'sell', false); setField(c.uid, 'display', false); onClose() }}>✕ unlist</button>
          <button className="ghost sm" onClick={() => { onClose(); onOpenFull(c.uid) }}>open the full {isProduct ? 'product' : 'card'} →</button>
        </div>
      </div>
    </div>
  )
}
