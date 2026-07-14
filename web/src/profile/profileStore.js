const profileKeyFor = (accountId) => `cairn-profile:${accountId || 'anon'}`

const clean = (value, limit) => String(value || '').slice(0, limit)

export function loadProfile(accountId) {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKeyFor(accountId)) || '{}')
    return {
      v: 1,
      name: clean(saved?.name, 32),
      sign: clean(saved?.sign, 140),
    }
  } catch { return { v: 1, name: '', sign: '' } }
}

export function saveProfile(accountId, profile) {
  const next = {
    v: 1,
    name: clean(profile?.name, 32),
    sign: clean(profile?.sign, 140),
  }
  try { localStorage.setItem(profileKeyFor(accountId), JSON.stringify(next)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('cairn-profile'))
  return next
}

export const profileComplete = (profile) => !!(profile?.name?.trim() && profile?.sign?.trim())

// A deliberate first-run reset: clear only this account's local surface state.
// Offers and seen-inbox history are protocol records, so they survive the reset.
export function resetAccountLocal(accountId) {
  if (!accountId) return
  const suffix = `:${accountId}`
  const preserved = ['cairn-offers:', 'cairn-inbox-seen:']
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith('cairn-') || !key.endsWith(suffix)) continue
      if (preserved.some((prefix) => key.startsWith(prefix))) continue
      localStorage.removeItem(key)
    }
  } catch { /* ignore unavailable storage */ }
}
