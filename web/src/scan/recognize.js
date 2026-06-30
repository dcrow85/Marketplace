// One-pass scan: photograph anything (one card or a whole binder page) → one vision
// call (/api/scan) detects + reads EVERY card and returns a box per card → match each to
// the catalog + crop a per-card thumbnail. No mode toggle, no layout picker: the model
// figures out how many cards are in frame. A loose box only softens a thumbnail crop —
// the recognition is the read, which is already done.
const API_BASE = import.meta.env.VITE_API_BASE || ''

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// One bounded JPEG for upload: small enough to read fast + cheap, large enough that names
// on a full 4×4 page stay legible (~350px/card at 1400 wide — verified 16/16 on real pages).
function imgToDataUri(img, max = 1400, quality = 0.85) {
  const s = Math.min(1, max / Math.max(img.width, img.height))
  const cv = document.createElement('canvas')
  cv.width = Math.round(img.width * s)
  cv.height = Math.round(img.height * s)
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', quality)
}

async function readPage(dataUri) {
  const r = await fetch(API_BASE + '/api/scan', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUri }),
  })
  if (!r.ok) throw new Error('scan_failed')
  return r.json()
}

const lc = (s) => (s || '').toString().trim().toLowerCase()
// The model reads the PRINTED number ("1"), not the catalog code ("AZK01-001").
const printedNum = (s) => { const m = (s || '').toString().match(/\d+/); return m ? parseInt(m[0], 10) : null } // first number in the read
const catNum = (s) => { const m = (s || '').toString().match(/\d+/g); return m ? parseInt(m[m.length - 1], 10) : null } // last group of the code = card no.

// Levenshtein similarity, so a one-char OCR slip ("Saeke"→"Saeko") still matches by name.
function lev(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const d = new Array(n + 1)
  for (let j = 0; j <= n; j++) d[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = d[0]; d[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return d[n]
}
const sim = (a, b) => { const L = Math.max(a.length, b.length); return L ? 1 - lev(a, b) / L : 0 }

// Closest catalog name to a fuzzy read, only if it clears a high bar (short names need
// near-exact; long names tolerate a slip or two). Returns the matched name string.
function closestName(name, cards) {
  let best = null, bestScore = 0
  const seen = new Set()
  for (const c of cards) {
    for (const cn of [lc(c.name_en), lc(c.name_ja)]) {
      if (!cn || seen.has(cn)) continue
      seen.add(cn)
      const sc = sim(name, cn)
      if (sc > bestScore) { bestScore = sc; best = cn }
    }
  }
  return bestScore >= 0.86 ? best : null
}

// Name is the reliable signal; the printed number narrows alt-arts; the α stamp picks
// the release family (Alpha vs Gates share name + number). The model sometimes reads the
// card's COST as the number, so the number only narrows — it never picks on its own when a
// name was read (a bad number can't override the name).
export function matchCard(read, cards) {
  if (!read || read.error) return null
  const name = lc(read.name_read)
  const n = printedNum(read.number_read)
  const alpha = read.alpha_stamp === 'present'
  let cands = []
  if (name) {
    cands = cards.filter((c) => lc(c.name_en) === name || lc(c.name_ja) === name)
    if (!cands.length) cands = cards.filter((c) => { const cn = lc(c.name_en) || lc(c.name_ja); return cn && (cn.includes(name) || name.includes(cn)) })
    if (!cands.length) { const bn = closestName(name, cards); if (bn) cands = cards.filter((c) => lc(c.name_en) === bn || lc(c.name_ja) === bn) }
  }
  if (!cands.length && !name && n != null) cands = cards.filter((c) => catNum(c.num) === n) // only with NO name read
  if (cands.length <= 1) return cands[0] || null
  let pool = cands
  if (n != null) { const byNum = pool.filter((c) => catNum(c.num) === n); if (byNum.length) pool = byNum }
  if (pool.length > 1) { const byFam = pool.filter((c) => (alpha ? c.release_family === 'alpha' : c.release_family !== 'alpha')); if (byFam.length) pool = byFam }
  return pool[0]
}

const clamp01 = (v) => Math.max(0, Math.min(1, v))

// The model emits [x0,y0,x1,y1]; usually fractions, occasionally pixels. Normalize to
// fractions, fix swaps, and fall back to the full frame if it's degenerate or missing.
function normBox(box, W, H) {
  if (!Array.isArray(box) || box.length < 4) return [0, 0, 1, 1]
  let [x0, y0, x1, y1] = box.map(Number)
  if (![x0, y0, x1, y1].every((v) => Number.isFinite(v))) return [0, 0, 1, 1]
  if (Math.max(x0, y0, x1, y1) > 1.5) { x0 /= W; x1 /= W; y0 /= H; y1 /= H } // pixels → fractions
  if (x1 < x0) [x0, x1] = [x1, x0]
  if (y1 < y0) [y0, y1] = [y1, y0]
  ;[x0, y0, x1, y1] = [clamp01(x0), clamp01(y0), clamp01(x1), clamp01(y1)]
  if (x1 - x0 < 0.02 || y1 - y0 < 0.02) return [0, 0, 1, 1] // degenerate → keep whole frame
  return [x0, y0, x1, y1]
}

// Crop one card's region from the full-res image as a bounded thumbnail / evidence keep.
function cropBox(img, b, max = 720) {
  const sx = b[0] * img.width, sy = b[1] * img.height
  const sw = Math.max(1, (b[2] - b[0]) * img.width), sh = Math.max(1, (b[3] - b[1]) * img.height)
  const s = Math.min(1, max / Math.max(sw, sh))
  const cv = document.createElement('canvas')
  cv.width = Math.round(sw * s); cv.height = Math.round(sh * s)
  cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', 0.85)
}

// Photograph anything → array of { read, match, photo(crop) }, one per detected card.
export async function recognizePhoto(file, cards) {
  const img = await loadImage(file)
  try {
    const dataUri = imgToDataUri(img)
    let res
    try { res = await readPage(dataUri) } catch { res = { error: 'scan_failed' } }
    const found = res && Array.isArray(res.cards) ? res.cards : []
    return found.map((read) => ({
      read,
      match: matchCard(read, cards),
      photo: cropBox(img, normBox(read.box, img.width, img.height)),
    }))
  } finally {
    URL.revokeObjectURL(img.src)
  }
}
