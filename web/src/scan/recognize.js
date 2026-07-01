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

// Snap a rough VLM box to the card's real edges. The model gives the location + count
// (recall); this gives the precision. Within a slightly-expanded region, find the OUTERMOST
// strong gradient line on each side — the card border, not the interior art (which is why
// the dark low-contrast cards still snap: a local search doesn't need global contrast).
// Falls back to the original box if the snap looks degenerate — never makes a crop worse.
function smoothProfile(p, w) {
  const n = p.length, o = new Float32Array(n)
  for (let i = 0; i < n; i++) { let s = 0, k = 0; for (let j = -w; j <= w; j++) { const t = i + j; if (t >= 0 && t < n) { s += p[t]; k++ } } o[i] = s / k }
  return o
}
function outerEdge(p, lo, hi, fromLeft) {
  let m = 0
  for (let i = lo; i <= hi; i++) if (p[i] > m) m = p[i]
  const thr = m * 0.4
  if (fromLeft) { for (let i = lo; i <= hi; i++) if (p[i] >= thr) return i } else { for (let i = hi; i >= lo; i--) if (p[i] >= thr) return i }
  return -1
}
function edgeSnap(img, box) {
  const [x0, y0, x1, y1] = box, bw = x1 - x0, bh = y1 - y0
  if (bw < 0.03 || bh < 0.03) return box
  const pad = 0.14
  const rx0 = clamp01(x0 - bw * pad), ry0 = clamp01(y0 - bh * pad), rx1 = clamp01(x1 + bw * pad), ry1 = clamp01(y1 + bh * pad)
  const sx = rx0 * img.width, sy = ry0 * img.height, sw = (rx1 - rx0) * img.width, sh = (ry1 - ry0) * img.height
  if (sw < 12 || sh < 12) return box
  const W = 360, H = Math.max(12, Math.round(W * sh / sw))
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
  const d = ctx.getImageData(0, 0, W, H).data
  const g = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) { const j = i * 4; g[i] = d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11 }
  let col = new Float32Array(W), rowp = new Float32Array(H)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; col[x] += Math.abs(g[i + 1] - g[i - 1]); rowp[y] += Math.abs(g[i + W] - g[i - W]) }
  col = smoothProfile(col, Math.max(1, Math.round(W / 70)))
  rowp = smoothProfile(rowp, Math.max(1, Math.round(H / 70)))
  const lx = outerEdge(col, Math.round(W * 0.02), Math.round(W * 0.42), true)
  const rx = outerEdge(col, Math.round(W * 0.58), Math.round(W * 0.98), false)
  const ty = outerEdge(rowp, Math.round(H * 0.02), Math.round(H * 0.42), true)
  const by = outerEdge(rowp, Math.round(H * 0.58), Math.round(H * 0.98), false)
  if (lx < 0 || rx < 0 || ty < 0 || by < 0 || rx - lx < W * 0.4 || by - ty < H * 0.4) return box
  const nx0 = rx0 + (lx / W) * (rx1 - rx0), nx1 = rx0 + (rx / W) * (rx1 - rx0)
  const ny0 = ry0 + (ty / H) * (ry1 - ry0), ny1 = ry0 + (by / H) * (ry1 - ry0)
  const asp = (nx1 - nx0) / (ny1 - ny0)
  if (nx1 - nx0 < 0.02 || ny1 - ny0 < 0.02 || asp < 0.4 || asp > 1.1) return box
  return [nx0, ny0, nx1, ny1]
}

// --- pixel-perfect crop via OpenCV (lazy-loaded) ------------------------------
// The VLM box locates the card; OpenCV finds its exact 4 corners and perspective-warps it
// straight — an upright, edge-to-edge crop. opencv.js (~11MB) loads lazily when the scanner
// mounts, so it's usually ready by the time the vision read returns; if it isn't (or a card
// doesn't resolve to a clean quad) we fall back to the edge-snap crop — never a worse result.
let _cvPromise = null
export function ensureOpenCV() {
  if (_cvPromise) return _cvPromise
  _cvPromise = new Promise((resolve) => {
    if (window.cv && window.cv.Mat) return resolve(window.cv)
    const s = document.createElement('script')
    s.src = (import.meta.env.BASE_URL || '/') + 'vendor/opencv.js'
    s.async = true
    s.onload = () => {
      const done = () => resolve(window.cv)
      if (window.cv && window.cv.Mat) return done()
      if (window.cv && typeof window.cv.then === 'function') { window.cv.then((m) => { window.cv = m; done() }); return }
      window.cv = window.cv || {}
      window.cv.onRuntimeInitialized = done
    }
    s.onerror = () => resolve(null)
    document.head.appendChild(s)
  })
  return _cvPromise
}

// Largest contour → convex hull → 4-corner quad (else min-area rect), ordered TL,TR,BR,BL
// in full-image pixels. The hull cleans up rounded corners/notches so a card resolves to a
// clean quad far more often than raw approxPolyDP.
function orderedQuad(cv, c, X, Y) {
  const hull = new cv.Mat()
  cv.convexHull(c, hull, false, true)
  const peri = cv.arcLength(hull, true)
  let q = null
  for (const f of [0.02, 0.03, 0.05, 0.08, 0.12]) {
    const ap = new cv.Mat()
    cv.approxPolyDP(hull, ap, f * peri, true)
    if (ap.rows === 4) { q = [0, 1, 2, 3].map((i) => [ap.data32S[i * 2] + X, ap.data32S[i * 2 + 1] + Y]); ap.delete(); break }
    ap.delete()
  }
  if (!q) {
    const rr = cv.minAreaRect(hull), cx = rr.center.x, cy = rr.center.y, w = rr.size.width, h = rr.size.height
    const a = rr.angle * Math.PI / 180, co = Math.cos(a), si = Math.sin(a)
    q = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([dx, dy]) => [cx + dx * co - dy * si + X, cy + dx * si + dy * co + Y])
  }
  hull.delete()
  q.sort((a, b) => a[1] - b[1])
  const t = q.slice(0, 2).sort((a, b) => a[0] - b[0]), b2 = q.slice(2, 4).sort((a, b) => a[0] - b[0])
  return [t[0], t[1], b2[1], b2[0]]
}

// Detect the card in the box's neighborhood and perspective-warp it to a straight 5:7 crop.
// Returns a JPEG data URI, or null if no confident card rectangle was found.
function warpCardCV(cv, src, box, OW = 500, OH = 700) {
  const W = src.cols, H = src.rows, bw = box[2] - box[0], bh = box[3] - box[1], pad = 0.06
  const X = Math.max(0, Math.round((box[0] - bw * pad) * W)), Y = Math.max(0, Math.round((box[1] - bh * pad) * H))
  const rw = Math.min(W, Math.round((box[2] + bw * pad) * W)) - X, rh = Math.min(H, Math.round((box[3] + bh * pad) * H)) - Y
  if (rw < 16 || rh < 16) return null
  const roi = src.roi(new cv.Rect(X, Y, rw, rh))
  const gray = new cv.Mat(), edges = new cv.Mat()
  const k = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7))
  const contours = new cv.MatVector(), hier = new cv.Mat()
  let url = null
  try {
    cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0)
    cv.Canny(gray, edges, 30, 110)
    cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, k)
    cv.findContours(edges, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    let bi = -1, ba = 0
    for (let i = 0; i < contours.size(); i++) { const cc = contours.get(i); const a = cv.contourArea(cc); if (a > ba) { ba = a; bi = i } cc.delete() }
    if (bi >= 0 && ba > rw * rh * 0.2) {
      const c = contours.get(bi)
      const o = orderedQuad(cv, c, X, Y)
      c.delete()
      const st = cv.matFromArray(4, 1, cv.CV_32FC2, [o[0][0], o[0][1], o[1][0], o[1][1], o[2][0], o[2][1], o[3][0], o[3][1]])
      const dt = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, OW, 0, OW, OH, 0, OH])
      const M = cv.getPerspectiveTransform(st, dt), out = new cv.Mat()
      cv.warpPerspective(src, out, M, new cv.Size(OW, OH), cv.INTER_LINEAR, cv.BORDER_REPLICATE)
      const oc = document.createElement('canvas'); oc.width = OW; oc.height = OH
      cv.imshow(oc, out)
      url = oc.toDataURL('image/jpeg', 0.9)
      st.delete(); dt.delete(); M.delete(); out.delete()
    }
  } catch { url = null } finally {
    roi.delete(); gray.delete(); edges.delete(); k.delete(); contours.delete(); hier.delete()
  }
  return url
}

// Photograph anything → array of { read, match, photo(crop) }, one per detected card.
// OpenCV warps each card straight (pixel-exact); edge-snap is the fallback.
export async function recognizePhoto(file, cards) {
  const img = await loadImage(file)
  try {
    const dataUri = imgToDataUri(img)
    const [res, cv] = await Promise.all([
      readPage(dataUri).catch(() => ({ error: 'scan_failed' })),
      ensureOpenCV(),
    ])
    const found = res && Array.isArray(res.cards) ? res.cards : []
    let src = null
    if (cv && cv.Mat && found.length) {
      const cvs = document.createElement('canvas'); cvs.width = img.width; cvs.height = img.height
      cvs.getContext('2d').drawImage(img, 0, 0)
      try { src = cv.imread(cvs) } catch { src = null }
    }
    const out = found.map((read) => {
      const box = normBox(read.box, img.width, img.height)
      let photo = null
      if (src) { try { photo = warpCardCV(cv, src, box) } catch { photo = null } }
      if (!photo) photo = cropBox(img, edgeSnap(img, box))
      return { read, match: matchCard(read, cards), photo }
    })
    if (src) src.delete()
    return out
  } finally {
    URL.revokeObjectURL(img.src)
  }
}
