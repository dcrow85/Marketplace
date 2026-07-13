// Many cards in one shot: photograph one card, a binder page, or a table spread → ONE
// vision call (/api/scan) reads EVERY card (name/number/α + rough box) → a local CV
// worker finds each card's exact quad inside its box and perspective-warps it upright
// (validated on real photos: tables, sleeves, rotation, binder pages). The VLM is never
// trusted for pixels; local CV is never trusted for names. If the worker isn't ready or
// a card doesn't resolve, that card falls back to an edge-snapped box crop.
import LocateWorker from './locate.worker.js?worker'

const API_BASE = import.meta.env?.VITE_API_BASE || ''

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// One bounded JPEG: small enough to read fast + cheap, large enough to keep as evidence.
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
const namesFor = (c) => [c.name_en, c.name_ja, ...(c.name_aliases || [])].map(lc).filter(Boolean)
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
    for (const cn of namesFor(c)) {
      if (!cn || seen.has(cn)) continue
      seen.add(cn)
      const sc = sim(name, cn)
      if (sc > bestScore) { bestScore = sc; best = cn }
    }
  }
  return bestScore >= 0.86 ? best : null
}

// Name is the reliable signal; the printed number narrows alt-arts; the α stamp picks the
// release family (Alpha vs Gates share name + number). The model sometimes reads the card's
// COST as the number, so the number only narrows — it never picks on its own when a name
// was read (a bad number can't override the name).
export function matchCard(read, cards) {
  if (!read || read.error) return null
  const name = lc(read.name_read)
  const n = printedNum(read.number_read)
  const alpha = read.alpha_stamp === 'present'
  let cands = []
  if (name) {
    cands = cards.filter((c) => namesFor(c).includes(name))
    if (!cands.length) cands = cards.filter((c) => namesFor(c).some((cn) => cn.includes(name) || name.includes(cn)))
    if (!cands.length) { const bn = closestName(name, cards); if (bn) cands = cards.filter((c) => namesFor(c).includes(bn)) }
  }
  if (!cands.length && !name && n != null) cands = cards.filter((c) => catNum(c.num) === n) // only with NO name read
  if (cands.length <= 1) return cands[0] || null
  let pool = cands
  if (n != null) { const byNum = pool.filter((c) => catNum(c.num) === n); if (byNum.length) pool = byNum }
  if (pool.length > 1) { const byFam = pool.filter((c) => (alpha ? c.release_family === 'alpha' : c.release_family !== 'alpha')); if (byFam.length) pool = byFam }
  return pool[0]
}

const clamp01 = (v) => Math.max(0, Math.min(1, v))

// The model emits [x0,y0,x1,y1]; usually fractions, occasionally pixels (of the ~1400px
// upload). Normalize to fractions, fix swaps, full-frame fallback when degenerate.
function normBox(box, W, H) {
  if (!Array.isArray(box) || box.length < 4) return [0, 0, 1, 1]
  let [x0, y0, x1, y1] = box.map(Number)
  if (![x0, y0, x1, y1].every((v) => Number.isFinite(v))) return [0, 0, 1, 1]
  if (Math.max(x0, y0, x1, y1) > 1.5) { x0 /= W; x1 /= W; y0 /= H; y1 /= H }
  if (x1 < x0) [x0, x1] = [x1, x0]
  if (y1 < y0) [y0, y1] = [y1, y0]
  ;[x0, y0, x1, y1] = [clamp01(x0), clamp01(y0), clamp01(x1), clamp01(y1)]
  if (x1 - x0 < 0.02 || y1 - y0 < 0.02) return [0, 0, 1, 1]
  return [x0, y0, x1, y1]
}

// Fallback crop: the box region cut from the full-res photo (bounded size), padded
// outward — a loose crop keeps context, a cutting crop destroys evidence.
function cropBox(img, b, max = 720) {
  const pw = (b[2] - b[0]) * 0.05, ph = (b[3] - b[1]) * 0.05
  b = [clamp01(b[0] - pw), clamp01(b[1] - ph), clamp01(b[2] + pw), clamp01(b[3] + ph)]
  const sx = b[0] * img.width, sy = b[1] * img.height
  const sw = Math.max(1, (b[2] - b[0]) * img.width), sh = Math.max(1, (b[3] - b[1]) * img.height)
  const s = Math.min(1, max / Math.max(sw, sh))
  const cv = document.createElement('canvas')
  cv.width = Math.round(sw * s); cv.height = Math.round(sh * s)
  cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', 0.85)
}

// --- the localization worker (OpenCV off the main thread; strictly optional) ---------
let _worker = null
let _workerReady = null
export function ensureLocateWorker() {
  if (_workerReady) return _workerReady
  _workerReady = new Promise((resolve) => {
    let w
    try { w = new LocateWorker() } catch { resolve(null); return }
    const url = new URL((import.meta.env.BASE_URL || '/') + 'vendor/opencv.js', self.location.origin).href
    const onReady = (e) => {
      if (!e.data || e.data.type !== 'ready') return
      w.removeEventListener('message', onReady)
      if (e.data.ok) { _worker = w; resolve(w) } else { w.terminate(); resolve(null) }
    }
    w.addEventListener('message', onReady)
    w.onerror = () => resolve(null)
    w.postMessage({ type: 'load', url })
  })
  return _workerReady
}

function locateViaWorker(worker, buffer, width, height, boxes, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const id = 'loc' + width + 'x' + height + '_' + boxes.length + '_' + performance.now()
    let done = false
    const onMsg = (e) => {
      if (!e.data || e.data.type !== 'located' || e.data.id !== id) return
      done = true; clearTimeout(timer); worker.removeEventListener('message', onMsg)
      resolve(Array.isArray(e.data.crops) ? { crops: e.data.crops, quads: e.data.quads || null } : null)
    }
    const timer = setTimeout(() => { if (!done) { worker.removeEventListener('message', onMsg); resolve(null) } }, timeoutMs)
    worker.addEventListener('message', onMsg)
    worker.postMessage({ type: 'locate', id, buffer, width, height, boxes }, [buffer])
  })
}

// Photograph anything → { frame, items: [{ read, match, photo, quad }] }.
// `frame` is the ~1400px upload (what the model actually read) — the WITNESS the pile
// evidence anchors to. Each item's quad locates its card in that frame (fractions).
// Crops come from the worker's exact quads; any miss falls back to the box crop.
export async function recognizePhoto(file, cards) {
  const img = await loadImage(file)
  try {
    const dataUri = imgToDataUri(img)
    // When the model returns PIXEL boxes, they are pixels of the ~1400px UPLOAD, not of
    // the full-res photo. Normalize against the uploaded dimensions.
    const us = Math.min(1, 1400 / Math.max(img.width, img.height))
    const uw = Math.round(img.width * us), uh = Math.round(img.height * us)
    const res = await readPage(dataUri).catch(() => null)
    const found = res && Array.isArray(res.cards) ? res.cards : []
    if (!found.length) return { frame: dataUri, items: [] }
    const boxes = found.map((c) => normBox(c.box, uw, uh))
    let located = null
    if (_worker) {
      try {
        const cv = document.createElement('canvas')
        cv.width = img.width; cv.height = img.height
        const ctx = cv.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0)
        const buf = ctx.getImageData(0, 0, img.width, img.height).data.buffer
        located = await locateViaWorker(_worker, buf, img.width, img.height, boxes)
      } catch { located = null }
    }
    const items = found.map((read, i) => ({
      read,
      match: matchCard(read, cards),
      photo: (located && located.crops[i]) || cropBox(img, boxes[i]),
      quad: (located && located.quads && located.quads[i])
        || [[boxes[i][0], boxes[i][1]], [boxes[i][2], boxes[i][1]], [boxes[i][2], boxes[i][3]], [boxes[i][0], boxes[i][3]]],
    }))
    return { frame: dataUri, items }
  } finally {
    URL.revokeObjectURL(img.src)
  }
}
