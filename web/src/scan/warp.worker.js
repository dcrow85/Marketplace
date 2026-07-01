/* eslint-disable no-undef */
// Runs OpenCV OFF the main thread. On 'load' it imports opencv.js (an 11MB compile that
// would freeze the UI on the main thread — here it can't). On 'warp' it detects each card
// in its box and perspective-warps it to a straight 5:7 crop, returning JPEG data URLs.
// The main thread only ever *upgrades* an edge-snap crop with the result — it never waits
// on this worker to load, and warps are bounded by a timeout on the caller side.
let ready = false

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

// Returns an ImageData (the warped card) or null.
function warpOne(cv, src, box, OW, OH) {
  const W = src.cols, H = src.rows, bw = box[2] - box[0], bh = box[3] - box[1], pad = 0.06
  const X = Math.max(0, Math.round((box[0] - bw * pad) * W)), Y = Math.max(0, Math.round((box[1] - bh * pad) * H))
  const rw = Math.min(W, Math.round((box[2] + bw * pad) * W)) - X, rh = Math.min(H, Math.round((box[3] + bh * pad) * H)) - Y
  if (rw < 16 || rh < 16) return null
  const roi = src.roi(new cv.Rect(X, Y, rw, rh))
  const gray = new cv.Mat(), edges = new cv.Mat()
  const k = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7))
  const contours = new cv.MatVector(), hier = new cv.Mat()
  let imgData = null
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
      imgData = new ImageData(new Uint8ClampedArray(out.data), out.cols, out.rows)
      st.delete(); dt.delete(); M.delete(); out.delete()
    }
  } catch { imgData = null } finally {
    roi.delete(); gray.delete(); edges.delete(); k.delete(); contours.delete(); hier.delete()
  }
  return imgData
}

async function encode(imgData) {
  const oc = new OffscreenCanvas(imgData.width, imgData.height)
  oc.getContext('2d').putImageData(imgData, 0, 0)
  const blob = await oc.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
  return new FileReaderSync().readAsDataURL(blob)
}

self.onmessage = async (e) => {
  const m = e.data
  if (m.type === 'load') {
    try { importScripts(m.url) } catch { self.postMessage({ type: 'ready', ok: false }); return }
    const finish = () => { ready = true; self.postMessage({ type: 'ready', ok: true }) }
    if (self.cv && self.cv.Mat) return finish()
    if (self.cv && typeof self.cv.then === 'function') { self.cv.then((mod) => { self.cv = mod; finish() }); return }
    self.cv = self.cv || {}
    self.cv.onRuntimeInitialized = finish
    return
  }
  if (m.type === 'warp') {
    if (!ready || !self.cv || !self.cv.Mat) { self.postMessage({ type: 'warped', id: m.id, crops: null }); return }
    const cv = self.cv
    let src = null
    try {
      src = cv.matFromImageData(new ImageData(new Uint8ClampedArray(m.buffer), m.width, m.height))
      const crops = []
      for (const box of m.boxes) { const idt = warpOne(cv, src, box, 500, 700); crops.push(idt ? await encode(idt) : null) }
      src.delete()
      self.postMessage({ type: 'warped', id: m.id, crops })
    } catch {
      if (src) src.delete()
      self.postMessage({ type: 'warped', id: m.id, crops: null })
    }
  }
}
