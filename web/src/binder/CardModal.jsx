// The full accession record for one card: stance, condition, listing, market ledger,
// dossier, provenance, the bench record — everything the protocol can honestly say.
import { useState, useEffect, useMemo } from 'react'
import { entryFor as effStance } from './collection.js'
import { hashText } from '../chain/escrow.js'
import { useScrollLock } from '../useScrollLock.js'
import { getPhoto } from '../scan/photoStore.js'
import { handleFor } from '../identity.js'
import {
  nm, retryImg, wantActive, Frow, mpill, PROV_LABEL,
  COND_TYPES, GRADERS, COND_GRADES, COND_OPTS, gradePrompt,
} from './helpers.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || ''

// Photo-entry is the primary path (collectors add cards by photo), so it's on for
// everyone — not hidden behind a flag. The agent read is live; a confirmed photo is
// session-only until persistent shared storage (R2 + the Catalog-Evidence record)
// lands, and the modal note says so. Flip to false to hide the whole flow.
const IMPORT_ON = true

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
// Render a chosen photo to a JPEG data URI bounded to a long-edge size.
function renderJpeg(img, max, quality) {
  const s = Math.min(1, max / Math.max(img.width, img.height))
  const cv = document.createElement('canvas')
  cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s)
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', quality)
}
// Sizes from one photo: a small READ copy (cheap vision call, never stored) and a high-res
// INSPECTION copy (what a buyer zooms to judge condition — ~685 DPI on a card). A grid
// THUMB joins here when storage is wired (so card lists stay fast).
async function renderSizes(file) {
  const img = await loadImage(file)
  try {
    return {
      read: renderJpeg(img, 1000, 0.85),
      full: renderJpeg(img, 2400, 0.9),
    }
  } finally {
    URL.revokeObjectURL(img.src)
  }
}



// Stance lives in chips; Product / Type / Element are collapsed into the filters sheet (see render).


function byUid(data, uid) { return (data?.cards || []).find((c) => c.uid === uid) || { uid } }


// Market context for one card: current asks (availability) + recorded settlements.
// Asks are sellers' claims; a settlement is a trade that closed through escrow — the
// one price fact the protocol can state in its own voice. All of it sample data for now.
export function MarketBlock({ c, market, mockSales, onBrowseCard }) {
  const asks = useMemo(() => (market?.sellers || [])
    .flatMap((s) => s.listings.filter((l) => l.uid === c.uid).map((l) => ({ s, l })))
    .sort((a, b) => a.l.ask - b.l.ask), [market, c])
  const sales = [...((mockSales || {})[c.uid] || []), ...((market?.sales || {})[c.uid] || [])]
  if (!market) return null
  const copies = asks.reduce((n, { l }) => n + (l.copies || 1), 0)
  return (
    <div className="mkb">
      <div className="mkb-head">
        <span className="mkb-title mono">market</span>
        <span className="mkb-sample mono">sample data</span>
        {asks.length > 0 && onBrowseCard && (
          <button className="mkb-browse mono" onClick={() => onBrowseCard(c.uid)}>See {asks.length} listing{asks.length === 1 ? '' : 's'} →</button>
        )}
      </div>
      <div className="mkb-sec mono">{asks.length
        ? `available now — ${asks.length} ask${asks.length === 1 ? '' : 's'} · ${copies} cop${copies === 1 ? 'y' : 'ies'} · from ${asks[0].l.ask} USDC`
        : 'available now — nobody is asking'}</div>
      {asks.slice(0, 3).map(({ s, l }, i) => (
        <div className="mkb-row" key={i}>
          <button className="mkb-who" onClick={() => onBrowseCard && onBrowseCard(c.uid)} title="see it on the market">{handleFor(s.id)}</button>
          <span className="mono mkb-cond" title="the seller&rsquo;s claim">{l.cond}</span>
          <span className={'mono mkb-wit' + (l.witness ? ' ok' : '')}>{l.witness ? `✓ witness ·${l.witness}` : '— no scan'}</span>
          <span className="mono mkb-p">{l.ask} USDC</span>
        </div>
      ))}
      {asks.length > 3 && <button className="mkb-more mono" onClick={() => onBrowseCard && onBrowseCard(c.uid)}>+ {asks.length - 3} more →</button>}
      <div className="mkb-sec mono" title="trades that closed through escrow — recorded, not appraised">{sales.length
        ? `recorded settlements — last ${sales[0].p} USDC · ${sales[0].d}`
        : 'recorded settlements — none on record'}</div>
      {sales.slice(0, 4).map((x, i) => (
        <div className="mkb-row sale" key={i}>
          <span className="mono mkb-d">{x.d}{x.mock ? ' · mock' : ''}</span>
          <span className="mono mkb-cond">{x.cond}</span>
          <span className={'mono mkb-wit' + (x.wit ? ' ok' : '')}>{x.wit ? '✓ witnessed' : '—'}</span>
          <span className="mono mkb-p">{x.p} USDC</span>
        </div>
      ))}
      <div className="mkb-note">A settlement is a closed escrow trade — a recorded fact, not an appraisal. Asks are sellers&rsquo; claims.</div>
    </div>
  )
}

export default function CardModal({ uid, data, setById, store, setStance, setField, agentName, userPhoto, onClose, market, mockSales, onBrowseCard, haveActionsGuide, onUseHaveAction }) {
  const [zoom, setZoom] = useState(false)  // fullscreen image view
  useScrollLock() // modal is mounted only while open
  const [recOpen, setRecOpen] = useState(false) // the dark-bench record (machine forms live there, not at glance)
  const [pileView, setPileView] = useState(null) // { frame, quad, verified } — the witness photo with this card outlined
  const openPile = async (entry) => {
    const p = (entry.pile || [])[0]
    if (!p) return
    try {
      const frame = await getPhoto(`frame:${p.f}`)
      if (!frame) return
      setPileView({ frame, quad: p.q, verified: hashText(frame) === p.f })
    } catch { /* witness unavailable — button simply does nothing */ }
  }
    const [imp, setImp] = useState('idle')   // photo-import: idle -> reading -> review -> added / error
  const [photo, setPhoto] = useState(null) // the high-res inspection copy shown in the modal
  const [read, setRead] = useState(null)   // the vision agent's read of it
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { if (zoom) setZoom(false); else onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, zoom])
  const c = byUid(data, uid)
  if (!c || !c.set_id) return null
  const e = effStance(c, store)
  const s = setById[c.set_id] || {}
  const u = store[c.uid] || {}
  const types = (c.types || []).join(' / ')
  const active = wantActive(c, store)
  const condVal = u.want_cond !== undefined ? u.want_cond : (c.want_cond || 'any')
  const maxVal = u.want_max !== undefined ? u.want_max : (c.want_max || '')
  const dot = c.image_status === 'exact_source' ? 'lg-exact' : c.image_status === 'no_rarity_reference' ? 'lg-nr' : 'lg-ref'
  const issues = c.issues || []
  const collection = c.collection_assertion || {}
  const reportedPrice = collection.reported_sale_price || {}
  const referenceSourceRefs = new Set()
  if (c.image_status === 'user_photo_observation') {
    for (const observation of c.observations || []) {
      const primary = observation.source_image_public_path || observation.source_image_sha256
      if (primary) referenceSourceRefs.add(primary)
      for (const source of observation.corroborating_sources || []) {
        const ref = source.source_image_public_path || source.source_image_sha256
        if (ref) referenceSourceRefs.add(ref)
      }
    }
  }
  const referenceSourceCount = referenceSourceRefs.size
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim()
  const visibleEffects = (c.effects || []).filter((x) => x && (x.label || x.text))
    .filter((x) => !(c.card_text && x.label && norm(c.card_text).toLowerCase().includes(`[${x.label}]`.toLowerCase()))) // rules text already carries this labeled effect
    .filter((x) => !(x.text && c.card_text && norm(c.card_text).includes(norm(x.text).slice(0, 80)))) // or the verbatim text
  const shownImg = (imp !== 'idle' && photo) ? photo : (userPhoto || c.image)
  const onPhoto = async (file) => {
    if (!file) return
    let imgs
    try { imgs = await renderSizes(file) } catch { setRead({ error: 'bad_image' }); setImp('error'); return }
    setPhoto(imgs.full); setRead(null); setImp('reading')
    try {
      const expect = { name: c.name_en || nm(c), num: c.num, release: c.release_family }
      const r = await fetch(API_BASE + '/api/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: imgs.read, expect }) })
      const d = await r.json()
      if (!r.ok || d.error) { setRead(d); setImp('error'); return }
      setRead(d); setImp('review')
    } catch (err) { setRead({ error: String(err) }); setImp('error') }
  }
  return (
    <>
    <div className="modal" onClick={(ev) => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true">
        <button className="mx" onClick={onClose} aria-label="close">✕</button>
        <div className="mcols">
          <div className="mleft">
            <div className={'mcard ' + (e.stance === 'have' ? 'own' : 'ghost')}>
              {shownImg
                ? <img src={shownImg} className={'zoomable' + (imp === 'reading' || imp === 'review' ? ' pending' : '')} alt={nm(c)} onClick={() => setZoom(true)} onError={(ev) => retryImg(ev, shownImg)} />
                : <div className="noimg"><div className="ja">{nm(c)}</div><div className="nn">no reference image on file</div></div>}
              {c.holo ? <span className="holodot" title={c.star_alt ? 'star / alternate-art signal' : 'holo'} /> : null}
              {shownImg && <button className="zoombtn" onClick={() => setZoom(true)} title="View full screen" aria-label="View full screen">⛶</button>}
              {imp === 'added' && <span className="contribbadge">collector photo · witness, not proof</span>}
            </div>
            {IMPORT_ON && imp === 'idle' && (
              <label className="addphoto">
                <span className="apt">＋ Add your photo</span>
                <span className="aps">{c.image ? 'add a photo of your copy' : 'no official pic yet — yours becomes the catalog’s first'}</span>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(ev) => onPhoto(ev.target.files && ev.target.files[0])} />
              </label>
            )}
            {imp === 'reading' && (
              <div className="imprev">
                <div className="imhd"><span className="ek2 agent">{agentName} is reading your photo…</span></div>
                <div className="imrow imdim">checking the card, the number, the α stamp…</div>
              </div>
            )}
            {imp === 'review' && read && (
              <div className="imprev">
                <div className="imhd"><span className="ek2 agent">{agentName}&rsquo;s read</span><span className="imtag">judged</span></div>
                {read.matches_expected
                  ? <div className="imrow"><span className="ick">✓</span> Matches <b>{nm(c)}</b> · {c.num}</div>
                  : <div className="imrow"><span className="iwarn">⚠</span> Doesn&rsquo;t look like <b>{nm(c)}</b>{read.name_read ? <> — reads as <b>{read.name_read}</b></> : null}</div>}
                {read.alpha_stamp === 'present'
                  ? <div className="imrow"><span className="ick">✓</span> Alpha <span className="agly">α</span> stamp detected{read.alpha_where ? <span className="imdim"> · {read.alpha_where}</span> : null}</div>
                  : <div className="imrow"><span className="iwarn">⚠</span> No <span className="agly">α</span> stamp seen{c.release_family === 'alpha' ? <span className="imdim"> — expected on an Alpha print</span> : null}</div>}
                {(read.red_flags || []).map((f, i) => <div className="imrow imflag" key={i}>⚑ {f}</div>)}
                <div className="imcav">A collector&rsquo;s photo of one physical card — a witness, not proof of authenticity or condition.</div>
                <div className="imact">
                  <button className="btn-add" onClick={() => setImp('added')}>{read.matches_expected ? 'Looks right — add it' : 'Add it anyway'}</button>
                  <label className="btn-no">Try another<input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(ev) => onPhoto(ev.target.files && ev.target.files[0])} /></label>
                </div>
              </div>
            )}
            {imp === 'error' && (
              <div className="imprev">
                <div className="imrow imflag">⚑ Couldn&rsquo;t read that photo{read && read.error ? <span className="imdim"> ({read.error})</span> : null}.</div>
                <div className="imact"><label className="btn-no">Try another<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(ev) => onPhoto(ev.target.files && ev.target.files[0])} /></label></div>
              </div>
            )}
            {imp === 'added' && (
              <div className="contribnote">Added as <b>your</b> collector photo. <span className="imdim">(Saved to your view for now — shared, recorded storage is the next step.)</span></div>
            )}
          </div>
          <div className="mright">
            <div className="m-set mono">{[s.label, s.code, s.date].filter(Boolean).join('  ·  ')}</div>
            <h2 className="m-name">{nm(c)}</h2>
            <div className="m-sub">
              <span className="cnum mono">#{c.num}</span>
              {(c.romaji || c.name_en) && nm(c) !== (c.romaji || c.name_en) ? <span> · {c.romaji || c.name_en}</span> : null}
              {c.name_is_en && <span className="enmark">EN</span>}
            </div>
            <div className="m-attrs">
              {[c.release_family_label, c.product_channel_label, c.category, types, c.star_alt ? '★ alt art' : c.holo ? 'holo' : '', c.rarity, c.band_rank ? 'attention-tier ' + c.band_rank : '']
                .map((t, i) => mpill(t, i))}
            </div>
            <div className="m-stance">
              <button className={'mseg sg-have' + (e.stance === 'have' ? ' on' : '')} onClick={() => setStance(c.uid, e.stance === 'have' ? 'none' : 'have')}>Have</button>
              <button className={'mseg sg-want' + (e.stance === 'want' ? ' on' : '')} onClick={() => setStance(c.uid, e.stance === 'want' ? 'none' : 'want')}>Want</button>
            </div>
            {(e.stance === 'have' || e.stance === 'want') && (
              <button className={'grailtog' + (e.grail ? ' on' : '')} onClick={() => setField(c.uid, 'grail', !e.grail)}>
                <span className="gstar">★</span>{e.grail ? 'Grail — top of your list' : 'Mark as grail'}
              </button>
            )}
            <div className="m-fields">
              {e.stance === 'have' && <>
                {haveActionsGuide}
                <div className="listrow">
                  <button className={'listtog' + (e.sell ? ' on' : '') + (haveActionsGuide ? ' anko-target' : '')}
                    onClick={() => { onUseHaveAction?.(); const on = !e.sell; setField(c.uid, 'sell', on); if (!on) setField(c.uid, 'display', false) }}>
                    {e.sell ? '● For sale' : '○ List for sale'}
                  </button>
                  <button className={'listtog' + (e.trade ? ' on' : '') + (haveActionsGuide ? ' anko-target' : '')}
                    onClick={() => { onUseHaveAction?.(); setField(c.uid, 'trade', !e.trade) }}>
                    {e.trade ? '⇄ Open to trade' : '○ Open to trade'}
                  </button>
                </div>
                {e.sell && <button className={'displaytog' + (e.display ? ' on' : '')} onClick={() => setField(c.uid, 'display', !e.display)}>
                  {e.display ? '● In your display case' : '○ Put in display case'}
                </button>}
                {(e.sell || e.trade) && <div className="listhint dim">{e.sell && e.trade ? 'On your table for sale or swap.'
                  : e.sell ? 'On your table — buyers copy your sheet and fund escrow.'
                  : 'On your table — a trader can offer one of their cards for it.'}</div>}
                <Frow label="Condition">
                  <select className="ti condtype" value={u.cond_type === 'tag' ? 'graded' : (u.cond_type || 'raw')} onChange={(ev) => { setField(c.uid, 'cond_type', ev.target.value); setField(c.uid, 'cond_grade', ''); setField(c.uid, 'cond_grader', '') }}>
                    {COND_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {(u.cond_type === 'graded' || u.cond_type === 'tag') && (
                    <select className="ti condgrader" value={u.cond_grader || (u.cond_type === 'tag' ? 'TAG' : '')} onChange={(ev) => { setField(c.uid, 'cond_grader', ev.target.value); setField(c.uid, 'cond_type', 'graded') }}>
                      <option value="">grader…</option>
                      {GRADERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
                  <select className="ti condgrade" value={u.cond_grade || ''} onChange={(ev) => setField(c.uid, 'cond_grade', ev.target.value)}>
                    <option value="">{gradePrompt(u.cond_type === 'tag' ? 'graded' : (u.cond_type || 'raw'))}</option>
                    {(COND_GRADES[u.cond_type === 'tag' ? 'graded' : (u.cond_type || 'raw')] || COND_GRADES.raw).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Frow>
                {(e.trade || e.sell) && (
                  <Frow label="Ask"><span className="fpre">$</span><input className="ti num" type="number" min="0" placeholder="USDC" value={u.ask || ''} onChange={(ev) => setField(c.uid, 'ask', ev.target.value)} /></Frow>
                )}
                <Frow label="Copies"><input className="ti num" type="number" min="1" value={u.copies || 1} onChange={(ev) => setField(c.uid, 'copies', Math.max(1, parseInt(ev.target.value || '1', 10)))} /></Frow>
                <Frow label="Notes"><textarea className="ti" rows={2} placeholder="surface, provenance, anything to remember…" value={u.note || ''} onChange={(ev) => setField(c.uid, 'note', ev.target.value)} /></Frow>
              </>}
              {e.stance === 'want' && <>
                <Frow label="Condition"><select className="ti" value={condVal} onChange={(ev) => setField(c.uid, 'want_cond', ev.target.value)}>{COND_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Frow>
                <Frow label="Max price"><span className="fpre">$</span><input className="ti num" type="number" min="0" placeholder="—" value={maxVal} onChange={(ev) => setField(c.uid, 'want_max', ev.target.value)} /></Frow>
                <Frow label="Notes"><textarea className="ti" rows={2} placeholder="why you want it, deal terms…" value={u.note || ''} onChange={(ev) => setField(c.uid, 'note', ev.target.value)} /></Frow>
                <div className="fnote">{active
                  ? <><b>Active hunt.</b> {agentName} flags matches that meet your condition and budget.</>
                  : <><b>On your wishlist.</b> Set a condition or budget to make it an active hunt.</>}</div>
              </>}
              {e.stance === 'none' && <div className="fnote">Pick <b>Have</b> or <b>Want</b> — or neither. Have records condition and copies; Want sets the terms your agent hunts to. Tap again to clear.</div>}
            </div>
            <MarketBlock c={c} market={market} mockSales={mockSales} onBrowseCard={onBrowseCard} />
            <details className="card-more">
              <summary><span>Card details &amp; provenance</span><small className="mono">rules · illustrator · image source</small></summary>
              <div className="card-morebody">
                {(c.illustrator || c.stamp || c.card_text || visibleEffects.length || c.flavor_text || collection.name) && (
                  <div className="dossier">
                    {collection.name && <div><b>Collection</b><span>{collection.name} · observed at {collection.position || 'unrecorded position'}</span></div>}
                    {reportedPrice.amount != null && <div><b>Event sale</b><span>{reportedPrice.amount} {reportedPrice.currency || 'USD'} · user-reported, not independently verified</span></div>}
                    {c.illustrator && <div><b>Illustrator</b><span>{c.illustrator}</span></div>}
                    {c.stamp && <div><b>Stamp</b><span>{c.stamp}</span></div>}
                    {c.card_text && <div><b>Rules text</b><span>{c.card_text}</span></div>}
                    {visibleEffects.map((fx, i) => (
                      <div key={i}><b>{fx.label || 'Effect'}</b><span>{fx.text || 'Effect label only.'}</span></div>
                    ))}
                    {c.flavor_text && <div><b>Flavor</b><span>{c.flavor_text}</span></div>}
                  </div>
                )}
                <div className="provbox">
                  <div className="pt"><span className={'lgdot ' + dot} /> Image provenance</div>
                  <div className="pb">
                    <b>{c.image ? (PROV_LABEL[c.image_status] || 'Reference image') : 'No image on file'}.</b>{' '}
                    {c.image_status === 'no_rarity_reference'
                      ? 'Source-labeled No Rarity reference.'
                      : c.image_status === 'no_reference_photo'
                        ? 'The candidate image was suppressed by the catalogue audit. This row currently has no honest reference photo.'
                        : c.image_status === 'user_observation_no_public_image'
                          ? 'Observation row from a user-provided image. The image hash is recorded in the catalog layer, but the image itself is not published here.'
                          : c.image_status === 'user_observation_no_exact_card_image'
                            ? 'The open product display records this treatment, but no exact standalone card-front photo was supplied.'
                            : c.image
                              ? 'Reference witness — not seller evidence, authentication, or proof of a specific physical card.'
                              : 'No reference image has been sourced for this print yet.'}
                    {referenceSourceCount > 1 && <><br />{referenceSourceCount} user-supplied reference photos are recorded for this treatment; the clearest is displayed.</>}
                    {c.name_is_en && <><br />Japanese print name not yet sourced; the provider’s English label is shown (marked EN).</>}
                  </div>
                </div>
              </div>
            </details>
            {(u.pile || []).length > 0 && (
              <button className="recopen mono" onClick={() => openPile(u)}>▦ view in pile · the witness photo</button>
            )}
            <button className="recopen mono" onClick={() => setRecOpen(!recOpen)}>{recOpen ? '▾ the record' : `▸ open the record${issues.length ? ` · ${issues.length} catalog note${issues.length > 1 ? 's' : ''}` : ''}`}</button>
            {recOpen && (
              <div className="benchrec mono">
                <div className="br-t">the record — this row&rsquo;s machine forms</div>
                <div>catalog {c.catalog_hash || '—'}</div>
                <div>row {c.row_id ?? '—'}</div>
                {c.source_entry_id && <div>source {c.source_entry_id}</div>}
                {referenceSourceCount > 0 && <div>reference_sources {referenceSourceCount} [user observations]</div>}
                {collection.collection_id && <div>collection {collection.collection_id} [{collection.membership_authority || 'unrated'}]</div>}
                <div>image_status {c.image_status || '—'}</div>
                {issues.map((i, idx) => <div key={idx}>note [{i.severity || 'info'}] {(i.codes || []).join(' ')}{i.notes ? ` · ${i.notes}` : (i.recommended_action ? ` · ${i.recommended_action}` : '')}</div>)}
                <div className="br-b">identifiers as the catalog holds them — a record, not proof.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {pileView && (
      <div className="lightbox" onClick={() => setPileView(null)}>
        <button className="lbx" onClick={() => setPileView(null)} aria-label="close pile view">✕</button>
        <div className="pilewrap" onClick={(ev) => ev.stopPropagation()}>
          <img src={pileView.frame} alt="the pile photo this card was scanned from" />
          <svg className="pileoutline" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={pileView.quad.map(([x, y]) => `${x * 1000},${y * 1000}`).join(' ')} />
          </svg>
          <div className={'pilebadge mono' + (pileView.verified ? '' : ' bad')}>
            {pileView.verified ? '✓ witness verified · keccak matches the record' : '⚑ witness altered — hash does not match'}
          </div>
        </div>
      </div>
    )}
    {zoom && shownImg && (
      <div className="lightbox" onClick={() => setZoom(false)}>
        <button className="lbx" onClick={() => setZoom(false)} aria-label="close full screen">✕</button>
        <img src={shownImg} alt={nm(c)} onClick={(ev) => ev.stopPropagation()} onError={(ev) => retryImg(ev, shownImg)} />
      </div>
    )}
    </>
  )
}

// The agent PROPOSED a bulk change to your own cards; this bar is the enforced half:
// code resolved the exact set from your store, and nothing writes until you tap apply.
