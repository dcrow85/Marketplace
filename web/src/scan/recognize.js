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
