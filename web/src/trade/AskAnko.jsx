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

export default function AskAnko({ decision, recommended = false, label = 'Ask Anko' }) {
  const panelId = useId()
  const version = useMemo(() => JSON.stringify(decision), [decision])
  const [state, setState] = useState({ status: 'idle', read: null })
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- a changed decision invalidates its old read */
    setState({ status: 'idle', read: null })
  }, [version])

  const ask = async () => {
    setState({ status: 'loading', read: null })
    try {
      const response = await fetch(API_BASE + '/api/decision-read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: version,
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error || 'read_failed')
      setState({ status: 'done', read: body })
    } catch {
      setState({ status: 'error', read: null })
    }
  }

  if (state.status === 'done' && state.read) {
    const read = state.read
    return (
      <section id={panelId} className="anko-read" aria-label="Anko’s read">
        <div className="anko-readhead">
          <span className="anko-readwho mono"><img src={(import.meta.env.BASE_URL || '/') + 'agent/house.png'} alt="" /> Anko&rsquo;s read <i>advisory</i></span>
          <button type="button" className="anko-hide mono" onClick={() => setState({ status: 'idle', read: null })}>hide</button>
        </div>
        <strong className="anko-lean">{LEAN_LABEL[read.lean] || 'My read'}</strong>
        <p>{read.summary}</p>
        {!!read.reasons?.length && <div className="anko-readlist"><span className="mono">why</span><ul>{read.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul></div>}
        {!!read.unknowns?.length && <div className="anko-readlist unknown"><span className="mono">still unknown</span><ul>{read.unknowns.map((unknown, i) => <li key={i}>{unknown}</li>)}</ul></div>}
        <p className="anko-boundary mono">{read.boundary}</p>
      </section>
    )
  }

  return (
    <div className="anko-askrow">
      <button type="button" className={'anko-ask mono' + (recommended ? ' recommended' : '')}
        aria-expanded="false" aria-controls={panelId} disabled={state.status === 'loading'} onClick={ask}>
        <img src={(import.meta.env.BASE_URL || '/') + 'agent/house.png'} alt="" />
        {state.status === 'loading' ? 'Anko is reading…' : label}
      </button>
      {recommended && <span className="mono anko-recommended">worth a second look</span>}
      {state.status === 'error' && <span className="mono anko-readerr">Anko couldn&rsquo;t give a bounded read. Try again.</span>}
    </div>
  )
}
