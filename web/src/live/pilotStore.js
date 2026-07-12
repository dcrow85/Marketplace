// The live room: profiles + inboxes on cairn.cards' own KV (a Pages Function).
// Same-origin in production; local dev talks to the live store so the room is one.
const BASE = /cairn\.cards$|\.pages\.dev$/.test(window.location.hostname)
  ? '/api/store'
  : 'https://cairn.cards/api/store'

const j = (r) => (r.ok ? r.json() : null)

export const fetchProfiles = () => fetch(`${BASE}/profiles`).then(j).catch(() => null)
export const fetchProfile = (addr) => fetch(`${BASE}/profile/${addr}`).then(j).catch(() => null)

export const publishProfile = (addr, snapshot) =>
  fetch(`${BASE}/profile/${addr}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  }).then(j).catch(() => null)

export const unpublishProfile = (addr) => publishProfile(addr, { removed: true })

export const pushInbox = (addr, msg) =>
  fetch(`${BASE}/inbox/${addr}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg),
  }).then(j).catch(() => null)

export const fetchInbox = (addr) => fetch(`${BASE}/inbox/${addr}`).then(j).catch(() => null)

export const isLiveAddr = (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr || '')
