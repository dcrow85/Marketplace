// The collector's masthead: who they are, their sign, and the RECORD STRIP — facts
// computed from records, never self-asserted. Green marks recorded things only.
import { handleFor, shortId, avatarSVG } from '../identity.js'

export default function ProfileHeader({ accountId, sign, onSign, stats }) {
  return (
    <div className="pf-head">
      <span className="av pf-av" dangerouslySetInnerHTML={{ __html: avatarSVG(accountId, 52) }} />
      <div className="pf-who">
        <div className="pf-handle"><span>{handleFor(accountId)}</span><span className="mono dim pf-addr">{shortId(accountId)}</span></div>
        {onSign
          ? <input className="pf-sign" maxLength={140} placeholder="your table sign — one line the room will read…"
              value={sign} onChange={(e) => onSign(e.target.value)} />
          : sign ? <div className="pf-signro">{sign}</div> : null}
        {stats?.length > 0 && (
          <div className="pf-record mono">
            {stats.map((st, i) => (
              <span key={i} className={'pf-stat' + (st.rec ? ' rec' : '')}>{st.t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
