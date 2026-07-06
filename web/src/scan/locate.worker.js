/* eslint-disable no-undef */
// Card localization OFF the main thread. Port of the Python prototype validated on real
// photos (binder page 14/16 tight, all table/rotated/sleeved singles rectified clean).
// Per-VLM-box local search: inside each box's padded ROI, find the best-scoring card
// quad (multi-strategy binarization → contours → convex quads scored by rectangularity ×
// 5:7-aspect × side-symmetry), refine each side to the strongest local gradient line,
// perspective-warp upright. The card (high score) beats its binder pocket (low score)
// inside its own ROI; drifted boxes retry with the median drift of the successes.
// Never blocks the page: loads lazily, replies within the caller's timeout or not at all.
let ready = false

const CARD_ASPECT = 5 / 7

function orderQuad(q) {
  const c = [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4]
  const pts = q.slice().sort((a, b) => Math.atan2(a[1] - c[1], a[0] - c[0]) - Math.atan2(b[1] - c[1], b[0] - c[0]))
  let si = 0, sv = Infinity
  for (let i = 0; i < 4; i++) { const s = pts[i][0] + pts[i][1]; if (s < sv) { sv = s; si = i } }
  return pts.slice(si).concat(pts.slice(0, si))
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const sides = (q) => [0, 1, 2, 3].map((i) => dist(q[i], q[(i + 1) % 4]))
function quadArea(q) {
  let s = 0
  for (let i = 0; i < 4; i++) { const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % 4]; s += x1 * y2 - x2 * y1 }
  return Math.abs(s) / 2
}
function aspectScore(q) {
  const s = sides(q), a = (s[0] + s[2]) / 2, b = (s[1] + s[3]) / 2
  if (a <= 1 || b <= 1) return 0
  const r = Math.min(a, b) / Math.max(a, b)
  if (r < 0.52 || r > 0.95) return 0
  return Math.exp(-((r - CARD_ASPECT) ** 2) / (2 * 0.09 ** 2))
}
function oppositeScore(q) {
  const s = sides(q)
  const r1 = Math.max(s[0], s[2]) ? Math.min(s[0], s[2]) / Math.max(s[0], s[2]) : 0
  const r2 = Math.max(s[1], s[3]) ? Math.min(s[1], s[3]) / Math.max(s[1], s[3]) : 0
  return r1 * r2
}
function rectangularity(cv, q) {
  const m = cv.matFromArray(4, 1, cv.CV_32FC2, q.flat())
  const rr = cv.minAreaRect(m)
  m.delete()
  const ra = rr.size.width * rr.size.height
  return ra > 0 ? quadArea(q) / ra : 0
}
function quadFromContour(cv, c) {
  const hull = new cv.Mat()
  cv.convexHull(c, hull, false, true)
  const peri = cv.arcLength(hull, true)
  let out = null
  for (const f of [0.02, 0.03, 0.05, 0.08]) {
    const ap = new cv.Mat()
    cv.approxPolyDP(hull, ap, f * peri, true)
    if (ap.rows === 4 && cv.isContourConvex(ap)) {
      out = [[ap.data32S[0], ap.data32S[1]], [ap.data32S[2], ap.data32S[3]], [ap.data32S[4], ap.data32S[5]], [ap.data32S[6], ap.data32S[7]]]
      ap.delete()
      break
    }
    ap.delete()
  }
  if (!out) {
    const rr = cv.minAreaRect(hull)
    const pts = cv.RotatedRect.points(rr)
    out = pts.map((p) => [p.x, p.y])
  }
  hull.delete()
  return orderQuad(out)
}

function strategies(cv, img) {
  const out = []
  const gray = new cv.Mat(), g = new cv.Mat()
  cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY)
  cv.GaussianBlur(gray, g, new cv.Size(5, 5), 0)
  const k3 = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
  const k5 = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
  const e1 = new cv.Mat(); cv.Canny(g, e1, 40, 120); cv.morphologyEx(e1, e1, cv.MORPH_CLOSE, k5); out.push(e1)
  const e2 = new cv.Mat(); cv.Canny(g, e2, 15, 60); cv.morphologyEx(e2, e2, cv.MORPH_CLOSE, k3); out.push(e2)
  const t1 = new cv.Mat(); cv.threshold(g, t1, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU); cv.morphologyEx(t1, t1, cv.MORPH_OPEN, k5); out.push(t1)
  const t2 = new cv.Mat(); cv.threshold(g, t2, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU); cv.morphologyEx(t2, t2, cv.MORPH_OPEN, k5); out.push(t2)
  const rgb = new cv.Mat(), hsv = new cv.Mat()
  cv.cvtColor(img, rgb, cv.COLOR_RGBA2RGB)
  cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV)
  const ch = new cv.MatVector()
  cv.split(hsv, ch)
  const sat = new cv.Mat(), st = new cv.Mat()
  cv.GaussianBlur(ch.get(1), sat, new cv.Size(5, 5), 0)
  cv.threshold(sat, st, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
  cv.morphologyEx(st, st, cv.MORPH_OPEN, k5)
  out.push(st)
  for (let i = 0; i < ch.size(); i++) ch.get(i).delete()
  ch.delete(); rgb.delete(); hsv.delete(); sat.delete(); gray.delete(); g.delete(); k3.delete(); k5.delete()
  return out
}

// best card quad inside one padded ROI (image px), or null
function quadForBox(cv, src, box, W, H, pad = 0.16) {
  const bw = box[2] - box[0], bh = box[3] - box[1]
  const x0 = Math.max(0, Math.round((box[0] - bw * pad) * W)), y0 = Math.max(0, Math.round((box[1] - bh * pad) * H))
  const x1 = Math.min(W, Math.round((box[2] + bw * pad) * W)), y1 = Math.min(H, Math.round((box[3] + bh * pad) * H))
  if (x1 - x0 < 40 || y1 - y0 < 40) return null
  const roi = src.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0))
  const rw = x1 - x0, rh = y1 - y0
  const sc = Math.max(rw, rh) > 720 ? 720 / Math.max(rw, rh) : 1
  let work = roi
  if (sc < 1) { work = new cv.Mat(); cv.resize(roi, work, new cv.Size(Math.round(rw * sc), Math.round(rh * sc))) }
  const wa = work.rows * work.cols
  let best = null, bs = 0
  for (const bm of strategies(cv, work)) {
    const contours = new cv.MatVector(), hier = new cv.Mat()
    cv.findContours(bm, contours, hier, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i)
      const a = cv.contourArea(c)
      if (a >= 0.32 * wa && a <= 0.98 * wa) {
        const q = quadFromContour(cv, c)
        const s = rectangularity(cv, q) * aspectScore(q) * oppositeScore(q)
        if (s > bs) { bs = s; best = q }
      }
      c.delete()
    }
    contours.delete(); hier.delete(); bm.delete()
  }
  if (sc < 1) work.delete()
  roi.delete()
  if (!best || bs < 0.45) return null
  return best.map(([x, y]) => [x / sc + x0, y / sc + y0])
}

// snap each side to the strongest local gradient line (Sobel), re-intersect corners
function refineQuad(cv, magData, W, H, quad, band = 8, samples = 24) {
  const q = orderQuad(quad)
  const size = Math.sqrt(quadArea(q))
  const lines = []
  for (let i = 0; i < 4; i++) {
    const p0 = q[i], p1 = q[(i + 1) % 4]
    const d = [p1[0] - p0[0], p1[1] - p0[1]]
    const L = Math.hypot(d[0], d[1])
    if (L < 8) return quad
    const u = [d[0] / L, d[1] / L], n = [-u[1], u[0]]
    const pts = []
    for (let k = 0; k < samples; k++) {
      const t = 0.12 + (0.76 * k) / (samples - 1)
      const bx = p0[0] + d[0] * t, by = p0[1] + d[1] * t
      let bv = -1, bo = 0
      for (let o = -band; o <= band; o++) {
        const x = Math.round(bx + n[0] * o), y = Math.round(by + n[1] * o)
        if (x >= 0 && x < W && y >= 0 && y < H) {
          const v = magData[y * W + x]
          if (v > bv) { bv = v; bo = o }
        }
      }
      pts.push([bx + n[0] * bo, by + n[1] * bo])
    }
    // PCA line fit (2x2 eigen by hand)
    let mx = 0, my = 0
    for (const p of pts) { mx += p[0]; my += p[1] }
    mx /= pts.length; my /= pts.length
    let sxx = 0, sxy = 0, syy = 0
    for (const p of pts) { const dx = p[0] - mx, dy = p[1] - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy }
    const tr = sxx + syy, det = sxx * syy - sxy * sxy
    const l1 = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det))
    let dir = [sxy, l1 - sxx]
    if (Math.hypot(dir[0], dir[1]) < 1e-6) dir = [l1 - syy, sxy]
    const dl = Math.hypot(dir[0], dir[1])
    if (dl < 1e-6) return quad
    lines.push([[mx, my], [dir[0] / dl, dir[1] / dl]])
  }
  const corners = []
  for (let i = 0; i < 4; i++) {
    const [c1, d1] = lines[(i + 3) % 4], [c2, d2] = lines[i]
    const a = d1[0], b = -d2[0], c = d1[1], dd = -d2[1]
    const den = a * dd - b * c
    if (Math.abs(den) < 1e-9) return quad
    const ex = c2[0] - c1[0], ey = c2[1] - c1[1]
    const t = (ex * dd - b * ey) / den
    corners.push([c1[0] + d1[0] * t, c1[1] + d1[1] * t])
  }
  const nq = orderQuad(corners)
  let moved = 0
  for (let i = 0; i < 4; i++) moved = Math.max(moved, dist(nq[i], q[i]))
  if (moved > 0.06 * size + 4) return quad
  return nq
}

// Asymmetric safety: a loose crop keeps context, a cutting crop destroys evidence.
// Expand every final quad outward before warping so card edges are never sliced.
function expandQuad(q, f = 1.06) {
  const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4
  const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4
  return q.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f])
}

function rectifyToCanvas(cv, src, quad, outW = 500, outH = 700) {
  let q = orderQuad(quad)
  const s = sides(q)
  if ((s[0] + s[2]) / 2 > (s[1] + s[3]) / 2) q = q.slice(1).concat([q[0]]) // stand portrait
  const sm = cv.matFromArray(4, 1, cv.CV_32FC2, q.flat())
  const dm = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH])
  const M = cv.getPerspectiveTransform(sm, dm)
  const out = new cv.Mat()
  cv.warpPerspective(src, out, M, new cv.Size(outW, outH), cv.INTER_LINEAR, cv.BORDER_REPLICATE)
  const oc = new OffscreenCanvas(outW, outH)
  cv.imshow(oc, out)
  sm.delete(); dm.delete(); M.delete(); out.delete()
  return oc
}

self.onmessage = async (e) => {
  const m = e.data
  if (m.type === 'load') {
    try { importScripts(m.url) } catch { self.postMessage({ type: 'ready', ok: false }); return }
    const done = () => { ready = true; self.postMessage({ type: 'ready', ok: true }) }
    if (self.cv && self.cv.Mat) return done()
    if (self.cv && typeof self.cv.then === 'function') { self.cv.then((mod) => { self.cv = mod; done() }); return }
    self.cv = self.cv || {}
    self.cv.onRuntimeInitialized = done
    return
  }
  if (m.type === 'locate') {
    if (!ready || !self.cv || !self.cv.Mat) { self.postMessage({ type: 'located', id: m.id, crops: null }); return }
    const cv = self.cv
    let src = null, gray = null, gx = null, gy = null, mag = null
    try {
      src = cv.matFromImageData(new ImageData(new Uint8ClampedArray(m.buffer), m.width, m.height))
      const W = m.width, H = m.height
      // pass 1: per-box local quads
      const first = m.boxes.map((b) => quadForBox(cv, src, b, W, H))
      // drift correction from the successes
      const deltas = []
      m.boxes.forEach((b, i) => {
        if (!first[i]) return
        const q = first[i]
        const qc = [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4]
        deltas.push([qc[0] - ((b[0] + b[2]) / 2) * W, qc[1] - ((b[1] + b[3]) / 2) * H])
      })
      let drift = [0, 0]
      if (deltas.length >= 3) {
        const xs = deltas.map((d) => d[0]).sort((a, b) => a - b)
        const ys = deltas.map((d) => d[1]).sort((a, b) => a - b)
        drift = [xs[Math.floor(xs.length / 2)], ys[Math.floor(ys.length / 2)]]
      }
      // gradient field for refinement
      gray = new cv.Mat(); cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
      gx = new cv.Mat(); gy = new cv.Mat(); mag = new cv.Mat()
      cv.Sobel(gray, gx, cv.CV_32F, 1, 0, 3)
      cv.Sobel(gray, gy, cv.CV_32F, 0, 1, 3)
      cv.magnitude(gx, gy, mag)
      const magData = mag.data32F
      const quadsOut = []
      const crops = m.boxes.map((b, i) => {
        let q = first[i]
        if (!q && (Math.abs(drift[0]) > 2 || Math.abs(drift[1]) > 2)) {
          const b2 = [b[0] + drift[0] / W, b[1] + drift[1] / H, b[2] + drift[0] / W, b[3] + drift[1] / H]
          q = quadForBox(cv, src, b2, W, H, 0.22)
        }
        if (q) {
          q = refineQuad(cv, magData, W, H, q)
        } else {
          const bx = [[b[0] * W + drift[0], b[1] * H + drift[1]], [b[2] * W + drift[0], b[1] * H + drift[1]],
                      [b[2] * W + drift[0], b[3] * H + drift[1]], [b[0] * W + drift[0], b[3] * H + drift[1]]]
          q = refineQuad(cv, magData, W, H, bx, 22, 28)
        }
        // the frame-anchor outline wants the true (unexpanded) quad, as fractions
        quadsOut.push(q.map(([x, y]) => [Math.max(0, Math.min(1, x / W)), Math.max(0, Math.min(1, y / H))]))
        return rectifyToCanvas(cv, src, expandQuad(q))
      })
      const urls = []
      for (const oc of crops) {
        const blob = await oc.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
        urls.push(new FileReaderSync().readAsDataURL(blob))
      }
      self.postMessage({ type: 'located', id: m.id, crops: urls, quads: quadsOut })
    } catch {
      self.postMessage({ type: 'located', id: m.id, crops: null })
    } finally {
      for (const x of [src, gray, gx, gy, mag]) if (x) x.delete()
    }
  }
}
