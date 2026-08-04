/* eslint-disable react-refresh/only-export-components -- shared helpers, not hot-reload roots */
// Shared card-metadata helpers + condition vocabulary for the binder's components.
import { cardDisplayName } from '../cards/cardNames.js'

export const nm = cardDisplayName

// Flaky-network resilience: the card images all serve 200, but a bad connection drops
// a fraction of the parallel lazy loads. Retry a failed image a few times with backoff
// and a cache-bust so transient drops recover instead of showing a name-placeholder.
export function retryImg(e, src) {
  const t = e.currentTarget
  const n = Number(t.dataset.retry || 0) + 1
  if (n > 4) return
  t.dataset.retry = String(n)
  setTimeout(() => { t.src = src + (src.includes('?') ? '&' : '?') + 'r=' + n }, 500 * n)
}

export function wantActive(c, store) {
  const u = store[c.uid] || {}
  const cond = u.want_cond !== undefined ? u.want_cond : c.want_cond || 'any'
  const max = u.want_max !== undefined ? u.want_max : c.want_max || ''
  return (max !== '' && max != null) || (cond && cond !== 'any')
}
// Condition: two fixed dropdowns (type + grade) so the record is uniform across
// everyone — no free text. A legacy free-text `cond` is still read for display
// (collections saved before the dropdowns existed).
export const COND_TYPES = [['raw', 'Raw'], ['graded', 'Graded']]
export const PRODUCT_CONDITIONS = [['factory sealed', 'Factory sealed'], ['damaged seal', 'Damaged seal'], ['opened packaging', 'Opened packaging']]
export const GRADERS = [['PSA', 'PSA'], ['BGS', 'BGS'], ['CGC', 'CGC'], ['SGC', 'SGC'], ['TAG', 'TAG'], ['other', 'Other']]
export const NUM_GRADES = ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5', '4', '3', '2', '1']
export const COND_GRADES = {
  raw: [['M', 'Mint'], ['NM', 'Near Mint'], ['LP', 'Lightly Played'], ['MP', 'Moderately Played'], ['HP', 'Heavily Played'], ['DMG', 'Damaged']],
  graded: NUM_GRADES.map((g) => [g, g]),
}
export const gradePrompt = (t) => t === 'raw' ? 'condition…' : 'grade…'
export function condText(c, store) {
  const u = store[c.uid] || {}
  const type = u.cond_type !== undefined ? u.cond_type : c.cond_type
  const grader = ((u.cond_grader !== undefined ? u.cond_grader : c.cond_grader) || '').trim()
  const grade = ((u.cond_grade !== undefined ? u.cond_grade : c.cond_grade) || '').trim()
  if (!type && !grade) return ((u.cond !== undefined ? u.cond : c.cond) || '').trim()
  if (type === 'tag') return grade ? 'TAG ' + grade : 'TAG'   // legacy: TAG used to be a top-level type
  if (type === 'graded') {
    const g = grader && grader !== 'other' ? grader : 'graded'
    return grade ? g + ' ' + grade : g
  }
  return grade || (type && type !== 'raw' ? type : 'raw')
}
export function capMeta(c, e, store) {
  if (e.grail && (e.stance === 'have' || e.stance === 'want')) return { t: 'grail ★', cls: 'm-grail' }
  if (e.stance === 'pass') return { t: 'pass', cls: 'm-pass' }
  if (e.stance === 'have') {
    if (e.trade && e.sell) return { t: 'trade · sell', cls: 'm-trade' }
    if (e.sell) return { t: 'for sale', cls: 'm-trade' }
    if (e.trade) return { t: 'for trade', cls: 'm-trade' }
    return { t: condText(c, store) || 'keeper', cls: 'm-have' }
  }
  if (e.stance === 'want') return wantActive(c, store) ? { t: 'hunt', cls: 'm-want' } : { t: 'wishlist', cls: 'm-wish' }
  return { t: c.rarity || '', cls: 'm-none' }
}
// Distinct rarities in ladder order — common first, chase last; unknown codes trail in data order.
export const RARITY_LADDER = ['C', 'U', 'UC', 'R', 'RR', 'SR', 'SR ★', 'SR ★★', 'TD', 'PR', 'L', 'L ★', 'G', 'G ★', 'SSS', 'Sealed']
export function rarityOrder(cards) {
  const seen = [...new Set(cards.map((c) => c.rarity).filter(Boolean))]
  const first = new Map(seen.map((r, i) => [r, i]))
  return seen.sort((a, b) => {
    const ia = RARITY_LADDER.indexOf(a), ib = RARITY_LADDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || first.get(a) - first.get(b)
  })
}
export function provBadge(c) {
  if (!c.image) return null
  if (c.display_allowed === false || c.image_reference_only) {
    return <span className="prov pv-ref" title="Catalogue reference — not seller evidence">ref</span>
  }
  if (c.image_status === 'exact_source') return null // the default is unmarked — badge only exceptions
  if (c.image_status === 'provider_path') return <span className="prov pv-ref" title="Catalogue reference — not seller evidence">ref</span>
  return null
}


export const COND_OPTS = [
  ['any', 'Any condition'],
  ['nm', 'Near Mint or better'],
  ['lp', 'Light Play or better'],
  ['played', 'Played is fine'],
]
export const PROV_LABEL = {
  exact_source: 'Exact source image',
  provider_path: 'Provider-path reference image',
  no_rarity_reference: 'No Rarity reference image',
  no_reference_photo: 'No reference photo',
  user_photo_observation: 'User-supplied reference photo',
  user_observation_no_public_image: 'User observation, no public image',
  user_observation_no_exact_card_image: 'Collection observation, no exact card image',
}
export const mpill = (t, i) => t ? <span className="mpill" key={i}>{t}</span> : null

export function Frow({ label, children }) {
  return <label className="frow"><span className="flabel">{label}</span><span className="fbody">{children}</span></label>
}
