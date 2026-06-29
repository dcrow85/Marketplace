// Recognize a card photo: downscale → vision read (the live /api/read) → match to the
// catalog. Open recognition (no `expect`) — "what card is this?" — so it works for
// scanning a stack you haven't pre-selected. Returns one match per photo for now;
// page-mode (many cards per photo) will return an array from the same call.
const API_BASE = import.meta.env.VITE_API_BASE || ''

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// One bounded JPEG: small enough to read fast + cheap, good enough to keep as evidence.
async function downscale(file, max = 1200, quality = 0.85) {
  const img = await loadImage(file)
  try {
    const s = Math.min(1, max / Math.max(img.width, img.height))
    const cv = document.createElement('canvas')
    cv.width = Math.round(img.width * s)
    cv.height = Math.round(img.height * s)
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
    return cv.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(img.src)
  }
}

async function readPhoto(dataUri) {
  const r = await fetch(API_BASE + '/api/read', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUri }),
  })
  if (!r.ok) throw new Error('read_failed')
  return r.json()
}

const lc = (s) => (s || '').toString().trim().toLowerCase()
// The model reads the PRINTED number ("1"), not the catalog code ("AZK01-001").
const printedNum = (s) => { const m = (s || '').toString().match(/\d+/); return m ? parseInt(m[0], 10) : null } // first number in the read
const catNum = (s) => { const m = (s || '').toString().match(/\d+/g); return m ? parseInt(m[m.length - 1], 10) : null } // last group of the code = card no.

// Name is the reliable signal; the printed number narrows alt-arts; the α stamp picks
// the release family (Alpha vs Gates share name + number).
export function matchCard(read, cards) {
  if (!read || read.error) return null
  const name = lc(read.name_read)
  const n = printedNum(read.number_read)
  const alpha = read.alpha_stamp === 'present'
  let cands = []
  if (name) {
    cands = cards.filter((c) => lc(c.name_en) === name || lc(c.name_ja) === name)
    if (!cands.length) cands = cards.filter((c) => { const cn = lc(c.name_en) || lc(c.name_ja); return cn && (cn.includes(name) || name.includes(cn)) })
  }
  if (!cands.length && n != null) cands = cards.filter((c) => catNum(c.num) === n) // no name → printed number
  if (cands.length <= 1) return cands[0] || null
  let pool = cands
  if (n != null) { const byNum = pool.filter((c) => catNum(c.num) === n); if (byNum.length) pool = byNum }
  if (pool.length > 1) { const byFam = pool.filter((c) => (alpha ? c.release_family === 'alpha' : c.release_family !== 'alpha')); if (byFam.length) pool = byFam }
  return pool[0]
}

export async function recognize(file, cards) {
  const photo = await downscale(file)
  let read
  try { read = await readPhoto(photo) } catch { read = { error: 'read_failed' } }
  return { photo, read, match: matchCard(read, cards) }
}

// Page mode: slice a binder-page photo into rows×cols cells, each a read-sized JPEG cut
// from the FULL-res image (so per-card detail survives — never downscale the page first).
export async function slicePage(file, rows, cols, max = 1100) {
  const img = await loadImage(file)
  try {
    const cw = img.width / cols
    const ch = img.height / rows
    const cells = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = Math.min(1, max / Math.max(cw, ch))
        const cv = document.createElement('canvas')
        cv.width = Math.round(cw * s)
        cv.height = Math.round(ch * s)
        cv.getContext('2d').drawImage(img, c * cw, r * ch, cw, ch, 0, 0, cv.width, cv.height)
        cells.push({ photo: cv.toDataURL('image/jpeg', 0.85), r, c })
      }
    }
    return cells
  } finally {
    URL.revokeObjectURL(img.src)
  }
}

// Recognize an already-sized data URI (one sliced cell) through the same read + match.
export async function recognizeDataUri(photo, cards) {
  let read
  try { read = await readPhoto(photo) } catch { read = { error: 'read_failed' } }
  return { read, match: matchCard(read, cards) }
}

// --- auto-crop + grid alignment -----------------------------------------------
// Cards are busy (high edge activity); pocket gaps + the binder margin are flat. We
// project edge activity onto each axis, trim the flat outer margins (auto-crop), and
// snap each cell boundary to the low-activity valley between cards (auto-align) — so
// the grid follows the real cards, not an even guess. The R×C count is given (you
// pick it); "Auto" additionally guesses the count.
function projections(img) {
  const W = 600, H = Math.max(1, Math.round(W * img.height / img.width))
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, W, H)
  const data = ctx.getImageData(0, 0, W, H).data
  const g = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) { const j = i * 4; g[i] = data[j] * 0.3 + data[j + 1] * 0.59 + data[j + 2] * 0.11 }
  const rowProf = new Float32Array(H), colProf = new Float32Array(W)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    const a = (x < W - 1 ? Math.abs(g[i + 1] - g[i]) : 0) + (y < H - 1 ? Math.abs(g[i + W] - g[i]) : 0)
    rowProf[y] += a; colProf[x] += a
  }
  return { rowProf, colProf, W, H }
}

function smoothed(prof, win) {
  const n = prof.length, w = Math.max(1, win), out = new Float32Array(n)
  for (let i = 0; i < n; i++) { let s = 0, k = 0; for (let j = -w; j <= w; j++) { const t = i + j; if (t >= 0 && t < n) { s += prof[t]; k++ } } out[i] = s / k }
  return out
}

// trim the flat outer margins → [start, end] of the card region on one axis
function cardRegion(prof, n) {
  const sm = smoothed(prof, Math.round(n / 120))
  let mn = Infinity, mx = -Infinity
  for (const v of sm) { if (v < mn) mn = v; if (v > mx) mx = v }
  const thr = mn + (mx - mn || 1) * 0.18
  let s = 0; while (s < n - 2 && sm[s] < thr) s++
  let e = n - 1; while (e > s + 1 && sm[e] < thr) e--
  return [s, e]
}

// split [start,end] into k bands, snapping each internal cut to the nearest gap valley
function snapBounds(prof, start, end, k) {
  const sm = smoothed(prof, Math.max(1, Math.round((end - start) / 60)))
  const seg = (end - start) / k
  const bounds = [start]
  for (let i = 1; i < k; i++) {
    const p = Math.round(start + i * seg), w = Math.round(seg * 0.33)
    let best = p, bv = Infinity
    for (let x = Math.max(start + 1, p - w); x <= Math.min(end - 1, p + w); x++) { if (sm[x] < bv) { bv = sm[x]; best = x } }
    bounds.push(best)
  }
  bounds.push(end)
  return bounds
}

// best-effort band count for "Auto" (a high threshold so card runs separate)
function countBands(prof) {
  const n = prof.length
  const sm = smoothed(prof, Math.max(1, Math.round(n / 180)))
  let mn = Infinity, mx = -Infinity
  for (const v of sm) { if (v < mn) mn = v; if (v > mx) mx = v }
  const thr = mn + (mx - mn || 1) * 0.45
  let count = 0, on = false
  for (let i = 0; i < n; i++) { const hi = sm[i] >= thr; if (hi && !on) count++; on = hi }
  return count
}

function cropCell(img, x0, y0, w, h, max) {
  const s = Math.min(1, max / Math.max(w, h))
  const cv = document.createElement('canvas'); cv.width = Math.round(w * s); cv.height = Math.round(h * s)
  cv.getContext('2d').drawImage(img, x0, y0, w, h, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', 0.85)
}

function sliceAligned(img, R, C, profs, max) {
  const { rowProf, colProf, W, H } = profs
  const [ry0, ry1] = cardRegion(rowProf, H)
  const [cx0, cx1] = cardRegion(colProf, W)
  const rb = snapBounds(rowProf, ry0, ry1, R)
  const cb = snapBounds(colProf, cx0, cx1, C)
  const sx = img.width / W, sy = img.height / H
  const cells = []
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    cells.push({ photo: cropCell(img, cb[c] * sx, rb[r] * sy, (cb[c + 1] - cb[c]) * sx, (rb[r + 1] - rb[r]) * sy, max) })
  }
  return cells
}

// Known R×C: auto-crop the margins, auto-align the cells to the card gaps.
export async function slicePageAligned(file, R, C, max = 1100) {
  const img = await loadImage(file)
  try { return { cells: sliceAligned(img, R, C, projections(img), max), r: R, c: C } } finally { URL.revokeObjectURL(img.src) }
}

// Auto: guess R×C from the photo, then auto-crop + align. Falls back to fr×fc.
export async function slicePageAuto(file, fr = 3, fc = 3, max = 1100) {
  const img = await loadImage(file)
  try {
    const profs = projections(img)
    let R = fr, C = fc, detected = false
    const r = countBands(profs.rowProf), c = countBands(profs.colProf)
    if (r >= 2 && r <= 6 && c >= 2 && c <= 6) { R = r; C = c; detected = true }
    return { cells: sliceAligned(img, R, C, profs, max), r: R, c: C, detected }
  } finally { URL.revokeObjectURL(img.src) }
}
