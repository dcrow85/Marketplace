// The collector's masthead: who they are, their sign, and the RECORD STRIP — facts
// computed from records, never self-asserted. Green marks recorded things only.
import { useEffect, useRef, useState } from 'react'
import { handleFor, shortId, avatarSVG } from '../identity.js'
import { prepareProfilePhoto } from './profilePhoto.js'
import { cleanPayPalHandle, payPalHandleError } from '../payments/rails.js'

export default function ProfileHeader({ accountId, name, onName, sign, onSign, photo, onPhoto, paypal = '', onPayPal, stats }) {
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [removeOpen, setRemoveOpen] = useState(false)
  const [paypalDraft, setPayPalDraft] = useState(paypal)
  const [paypalSaved, setPayPalSaved] = useState(false)
  const photoInput = useRef(null)
  useEffect(() => { setPayPalDraft(paypal || '') }, [paypal]) // eslint-disable-line react-hooks/set-state-in-effect -- keep the editor aligned with account changes
  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoBusy(true); setPhotoError('')
    try { onPhoto(await prepareProfilePhoto(file)); setRemoveOpen(false) }
    catch (error) { setPhotoError(error?.message || 'Picture could not be changed.') }
    finally { setPhotoBusy(false) }
  }
  const paypalError = payPalHandleError(paypalDraft)
  const savePayPal = () => {
    if (paypalError) return
    const next = cleanPayPalHandle(paypalDraft)
    onPayPal?.(next)
    setPayPalDraft(next)
    setPayPalSaved(true)
    window.setTimeout(() => setPayPalSaved(false), 1800)
  }
  return (<>
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
    {onPayPal && <section className="pf-payments" aria-label="Payment methods">
      <div className="pf-payintro">
        <span className="ek">How buyers can pay</span>
        <p>Escrow leads every checkout. Add PayPal as a second path for collectors who prefer it.</p>
      </div>
      <div className="pf-railcards">
        <div className="pf-railcard primary-rail">
          <span className="pf-railmark" aria-hidden="true">◇</span>
          <span><b>Cairn Escrow</b><small>Recommended · the contract holds funds until settlement.</small></span>
          <i className="mono">first</i>
        </div>
        <div className={'pf-railcard paypal-rail' + (paypal ? ' enabled' : '')}>
          <span className="pf-railmark paypal-word" aria-hidden="true">P</span>
          <label>
            <b>PayPal</b>
            <small>{paypal ? `paypal.me/${paypal} · available on your table` : 'Optional bootstrap payment path'}</small>
            <span className="pf-paypaledit">
              <input value={paypalDraft} maxLength={80} autoCapitalize="none" autoCorrect="off" spellCheck="false"
                placeholder="PayPal.Me username or link" aria-label="PayPal.Me username or link"
                onChange={(event) => { setPayPalDraft(event.target.value); setPayPalSaved(false) }}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); savePayPal() } }} />
              <button type="button" disabled={!!paypalError || paypalDraft.trim() === paypal} onClick={savePayPal}>
                {paypalSaved ? 'Saved ✓' : paypalDraft.trim() ? 'Save' : paypal ? 'Remove' : 'Add'}
              </button>
            </span>
            {paypalError && <em role="alert">{paypalError}</em>}
          </label>
        </div>
      </div>
      <p className="pf-payboundary mono">PayPal handles the payment and any eligible provider protection; Cairn records the terms but cannot reverse PayPal funds. Never share your PayPal password. <a href="https://www.paypal.com/paypalme/" target="_blank" rel="noreferrer">Find or create your PayPal.Me link ↗</a></p>
    </section>}
  </>)
}
