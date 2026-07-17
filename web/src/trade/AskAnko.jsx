import { useEffect, useId, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const LEAN_LABEL = {
  accept: 'My lean: accept',
  counter: 'My lean: counter',
  decline: 'My lean: decline',
  request_evidence: 'My lean: ask for more evidence',
  hold: 'My lean: hold',
  cannot_resolve: 'I can’t resolve this from what’s recorded',
}

function MoneyLabel({ children }) {
  return String(children || '').split(/(\$?\d+(?:\.\d+)?\s*(?:USDC|USD))/gi).map((part, index) =>
    /(?:USDC|USD)$/i.test(part) ? <span className="money" key={index}>{part}</span> : part)
}

function ReadActions({ actions }) {
  const [values, setValues] = useState({})
  if (!actions?.length) return null
  return <div className="anko-readactions" aria-label="Actions from Anko’s read">
    {actions.map((action) => {
      if (action.kind === 'amount') {
        const value = values[action.id] ?? String(action.amount ?? '')
        return <div className="anko-amountaction" key={action.id}>
          <span className="mono">{action.label}</span>
          <span className="anko-amountinput"><span>$</span><input type="number" min="0" step="0.01" value={value}
            aria-label={`${action.label} amount`} onChange={(event) => setValues((prev) => ({ ...prev, [action.id]: event.target.value }))} /><i>USDC</i></span>
          <button type="button" onClick={() => action.onConfirm?.(Math.max(0, Number(value) || 0))}>{action.confirmLabel || 'Use this'}</button>
          {action.hint && <small>{action.hint}</small>}
        </div>
      }
      return <button type="button" key={action.id} className={'anko-readaction' + (action.primary ? ' primary' : '')}
        onClick={() => action.onSelect?.()}><MoneyLabel>{action.label}</MoneyLabel></button>
    })}
  </div>
}

export default function AskAnko({ decision, recommended = false, label = 'Ask Anko', onRead, actionsForRead }) {
  const panelId = useId()
  const version = useMemo(() => JSON.stringify(decision), [decision])
  const [state, setState] = useState({ status: 'idle', read: null })
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- a changed decision invalidates its old read */
    setState({ status: 'idle', read: null })
  }, [version])

  const ask = async () => {
    onRead?.(null)
    setState({ status: 'loading', read: null })
    try {
      const response = await fetch(API_BASE + '/api/decision-read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: version,
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error || 'read_failed')
      setState({ status: 'done', read: body })
      onRead?.(body)
    } catch {
      onRead?.(null)
      setState({ status: 'error', read: null })
    }
  }

  if (state.status === 'done' && state.read) {
    const read = state.read
    return (
      <section id={panelId} className="anko-read" aria-label="Anko’s read">
        <div className="anko-readhead">
          <span className="anko-readwho mono"><img src={(import.meta.env.BASE_URL || '/') + 'agent/anko-avatar-v3.png'} alt="" /> Anko&rsquo;s read <i>advisory</i></span>
          <button type="button" className="anko-hide mono" onClick={() => { onRead?.(null); setState({ status: 'idle', read: null }) }}>hide</button>
        </div>
        <strong className="anko-lean">{LEAN_LABEL[read.lean] || 'My read'}</strong>
        <p>{read.summary}</p>
        {!!read.reasons?.length && <div className="anko-readlist"><span className="mono">why</span><ul>{read.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul></div>}
        {!!read.unknowns?.length && <div className="anko-readlist unknown"><span className="mono">still unknown</span><ul>{read.unknowns.map((unknown, i) => <li key={i}>{unknown}</li>)}</ul></div>}
        <p className="anko-boundary mono">{read.boundary}</p>
        <ReadActions actions={actionsForRead?.(read) || []} />
      </section>
    )
  }

  return (
    <div className="anko-askrow">
      <button type="button" className={'anko-ask mono' + (recommended ? ' recommended' : '')}
        aria-expanded="false" aria-controls={panelId} disabled={state.status === 'loading'} onClick={ask}>
        <img src={(import.meta.env.BASE_URL || '/') + 'agent/anko-avatar-v3.png'} alt="" />
        {state.status === 'loading' ? 'Anko is reading…' : label}
      </button>
      {recommended && <span className="mono anko-recommended">worth a second look</span>}
      {state.status === 'error' && <span className="mono anko-readerr">Anko couldn&rsquo;t give a bounded read. Try again.</span>}
    </div>
  )
}
