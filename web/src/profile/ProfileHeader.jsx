// The collector's masthead: who they are, their sign, and the RECORD STRIP — facts
// computed from records, never self-asserted. Green marks recorded things only.
import { useRef, useState } from 'react'
import { handleFor, shortId, avatarSVG } from '../identity.js'
import { prepareProfilePhoto } from './profilePhoto.js'

export default function ProfileHeader({ accountId, name, onName, sign, onSign, photo, onPhoto, stats }) {
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [removeOpen, setRemoveOpen] = useState(false)
  const photoInput = useRef(null)
  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoBusy(true); setPhotoError('')
    try { onPhoto(await prepareProfilePhoto(file)); setRemoveOpen(false) }
    catch (error) { setPhotoError(error?.message || 'Picture could not be changed.') }
    finally { setPhotoBusy(false) }
  }
  return (
    <div className="pf-head">
      <div className="pf-photo">
        {photo
          ? <span className="av pf-av"><img src={photo} width="52" height="52" alt="Your profile" /></span>
          : <span className="av pf-av" dangerouslySetInnerHTML={{ __html: avatarSVG(accountId, 52) }} />}
        {onPhoto && <>
          <input ref={photoInput} className="pf-photoinput" type="file" accept="image/*" disabled={photoBusy} onChange={choosePhoto} />
          <div className="pf-photoactions mono">
            <button className={'pf-photochange' + (photoBusy ? ' busy' : '')} title={photo ? 'Change profile picture' : 'Add profile picture'}
              disabled={photoBusy} onClick={() => photoInput.current?.click()}>{photoBusy ? 'saving…' : photo ? 'Change photo' : 'Add photo'}</button>
            {photo && !removeOpen && <button className="pf-photoremove" onClick={() => setRemoveOpen(true)}>Remove…</button>}
          </div>
          {photo && removeOpen && <div className="pf-photoconfirm mono" role="group" aria-label="Remove profile picture?">
            <span>Remove this photo?</span>
            <button onClick={() => setRemoveOpen(false)}>keep it</button>
            <button className="danger" onClick={() => { onPhoto(''); setRemoveOpen(false) }}>remove</button>
          </div>}
        </>}
        {photoError && <span className="pf-photoerror" role="alert">{photoError}</span>}
      </div>
      <div className="pf-who">
        <div className="pf-handle">
          {onName
            ? <input className="pf-name" maxLength={32} aria-label="Collector name" placeholder={handleFor(accountId)}
                value={name || ''} onChange={(e) => onName(e.target.value)} />
            : <span>{name?.trim() || handleFor(accountId)}</span>}
          <span className="mono dim pf-addr">{shortId(accountId)}</span>
        </div>
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
