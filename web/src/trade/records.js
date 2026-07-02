// Trade-record store client. The escrow keeps only HASHES on-chain; this fetches/stores the
// PLAINTEXT behind each hash so any party — the arbiter especially — can read the terms and
// the dispute, and VERIFY it against the chain. Content-addressed: a record is stored under
// keccak(value), and on read we recompute keccak and reject anything that doesn't match the
// on-chain hash. A bad/again store can only make a record unreadable, never forge one.
import { hashText } from '../chain/escrow.js' // keccak256(toHex(s)) — identical to the on-chain commitment

const API_BASE = import.meta.env.VITE_API_BASE || ''
const isZero = (h) => !h || /^0x0{64}$/i.test(h)

// Store a preimage under its own keccak hash. Pass the EXACT string that was hashed for the
// on-chain commitment so the key lines up. Returns true on success.
export async function putRecord(value) {
  if (typeof value !== 'string' || !value) return false
  try {
    const r = await fetch(API_BASE + '/api/record', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: hashText(value), value }),
    })
    const j = await r.json()
    return !!j.ok
  } catch { return false }
}

// Fetch + verify the preimage for an on-chain hash.
// → { status: 'verified'|'unset'|'missing'|'mismatch'|'error', value }
export async function getRecord(hash) {
  if (isZero(hash)) return { status: 'unset', value: null }
  try {
    const r = await fetch(API_BASE + '/api/record?key=' + hash)
    const j = await r.json()
    if (j.error) return { status: 'error', value: null }
    if (!j.found) return { status: 'missing', value: null }
    if (hashText(j.value) !== hash) return { status: 'mismatch', value: j.value } // tampered / wrong preimage
    return { status: 'verified', value: j.value }
  } catch { return { status: 'error', value: null } }
}
