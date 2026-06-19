// Deterministic identity: a handle + avatar derived from an account id (wallet address
// or Privy DID). Same id -> same who. Ported from the binder so the app stays consistent.

export function idHash(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < (s || '').length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const ADJ = ['Vermilion', 'Cobalt', 'Quiet', 'Patient', 'Glossy', 'Shadowless', 'Pristine',
  'Veteran', 'Amber', 'Indigo', 'Holo', 'Prism', 'Sealed', 'Sharp', 'First-Edition', 'Unlimited']
const NOUN = ['Archivist', 'Curator', 'Collector', 'Cartographer', 'Completionist', 'Registrar',
  'Custodian', 'Sentinel', 'Steward', 'Scribe', 'Keeper', 'Sleever']

export function handleFor(a) {
  const h = idHash(a || '')
  return ADJ[h % ADJ.length] + ' ' + NOUN[(h >>> 8) % NOUN.length]
}

export function shortId(a) {
  if (!a) return ''
  return a.startsWith('0x') ? a.slice(0, 6) + '…' + a.slice(-4) : a.slice(0, 10) + '…'
}

export function avatarSVG(a, size = 22) {
  const r = rng(idHash(a || ''))
  const fg = `hsl(${Math.floor(r() * 360)},52%,47%)`
  let cells = ''
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++)
      if (r() > 0.5)
        cells += `<rect x="${x}" y="${y}" width="1.03" height="1.03"/><rect x="${4 - x}" y="${y}" width="1.03" height="1.03"/>`
  return `<svg viewBox="0 0 5 5" width="${size}" height="${size}"><g fill="${fg}">${cells}</g></svg>`
}

const AGENT_NAMES = ['Ledger', 'Quill', 'Vellum', 'Sable', 'Atlas', 'Juno', 'Onyx', 'Marlow',
  'Vero', 'Pith', 'Calla', 'Ember', 'Reni', 'Koa', 'Tace', 'Sory', 'Indra', 'Wren']
export function randomAgentName() {
  return AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)]
}
