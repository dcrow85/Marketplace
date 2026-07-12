/* eslint-disable react-refresh/only-export-components -- ACTION_VERB rides with its panels */
// The agent's two speaking surfaces in the binder: the browse panel (filter chips +
// commentary) and the proposal bar (typed plans, apply/undo). Blue register only.
export const ACTION_VERB = {
  mark_have: 'mark as have', mark_want: 'mark as want',
  unmark_have: 'unmark as have', unmark_want: 'unmark as want',
  list_for_sale: 'list for sale', open_to_trade: 'open to trade',
  unlist: 'unlist', close_trade: 'close to trade',
}
export function ActionBar({ agentName, plan, reading, done, onApply, onUndo, onDismiss }) {
  const touched = Object.keys(plan.draft).length
  const total = Math.round(plan.steps.reduce((t, st) => t + (st.op === 'list_for_sale' && st.ask != null ? st.ask * st.affected.length : 0), 0) * 100) / 100
  return (
    <div className="aprop">
      <span className="atag jud"><img className="anko-face" src={(import.meta.env.BASE_URL || '/') + 'agent/house.png'} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />{agentName} · proposes{plan.steps.length > 1 ? ` · ${plan.steps.length} steps, in order` : ''}</span>
      {plan.steps.map((st, i) => {
        const n = st.affected.length
        const names = st.affected.slice(0, 3).map((c) => c.name_en || c.uid).join(', ')
        return (
          <div className="aprop-line" key={i}>
            {plan.steps.length > 1 && <span className="mono dim">{i + 1}. </span>}
            {ACTION_VERB[st.op]} <b>{n}</b> card{n === 1 ? '' : 's'}
            {st.ask != null && n > 0 && <> at <b>{st.ask} USDC</b> each</>}
            {n > 0 ? <span className="dim"> — {names}{n > 3 ? ` +${n - 3} more` : ''}</span>
              : <span className="dim"> — nothing to change</span>}
          </div>
        )
      })}
      {total > 0 && <div className="aprop-read">asks total <b>{total} USDC</b> across the plan</div>}
      {reading && <div className="aprop-read dim">{reading}</div>}
      {done
        ? <div className="aprop-acts">
            <span className="aprop-done mono">✓ done — {done.n} card{done.n === 1 ? '' : 's'} changed{done.steps > 1 ? ` across ${done.steps} steps` : ''}</span>
            <button className="ghost sm" onClick={onUndo}>undo</button>
            <button className="ghost sm" onClick={onDismiss}>✕</button>
          </div>
        : <div className="aprop-acts">
            <button className="aprop-apply" onClick={onApply} disabled={!touched}>{touched ? 'apply' : 'nothing matches'}</button>
            <button className="ghost sm" onClick={onDismiss}>cancel</button>
            {plan.steps.some((st) => st.op === 'list_for_sale' && st.ask == null && st.affected.length > 0) && <span className="dim aprop-note">no price named on a listing step — those cards list without an ask</span>}
          </div>}
    </div>
  )
}

export function AgentPanel({ res, agentName }) {
  if (!res.ok) {
    const off = res.data?.error === 'agent_offline'
    return <div className="apanel"><div className="aoff">{off ? 'Anko’s lamp is dark — the model behind him isn’t running.' : 'Couldn’t reach Anko. The lamp flickered — give it another try.'}</div></div>
  }
  const o = res.data, f = o.filter || {}, r = o.result || {}
  const dims = ['release_family', 'product_channel', 'holo', 'star_alt', 'owned', 'exclude_grails', 'set', 'character', 'category', 'element', 'rarity', 'card_type', 'plane', 'lore_term', 'theme', 'character_thread', 'event', 'lore']
  const chips = dims.filter((k) => f[k] != null && f[k] !== false)
  const flags = o.overclaim_flags || []
  return (
    <div className="apanel">
      <span className="atag enf">enforced · code</span>
      <div className="achips">
        {chips.length ? chips.map((k) => <span key={k} className="fc"><i>{k}</i>{String(f[k])}</span>) : <span className="fc faint">no filter — whole catalog</span>}
      </div>
      <div className="acut">cut to <b>{o.n_survivors}</b> candidates{f.reading ? <span className="aread"> · {f.reading}</span> : null}</div>
      <span className="atag jud"><img className="anko-face" src={(import.meta.env.BASE_URL || '/') + 'agent/house.png'} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />{agentName} · judged</span>
      <div className="acomm">{r.commentary}</div>
      {r.caveat && <div className="acav">⚠ {r.caveat}</div>}
      {flags.length > 0 && <div className="aflag">no-overclaim check flagged: <b>{flags.join(', ')}</b> — surfaced, not hidden.</div>}
    </div>
  )
}
