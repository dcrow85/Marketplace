import { useEffect } from 'react'
import { loadStore, storeKeyFor } from '../binder/collection.js'
import { useBus } from '../lib/store.js'
import { profileComplete } from './profileStore.js'

export const FIRST_LAP = [
  { id: 'profile', label: 'Create your profile', detail: 'Choose a collector name and a line for your table.', points: 1 },
  { id: 'mark', label: 'Mark your first card', detail: 'Start with Have or Want. You can change it anytime.', points: 1 },
  { id: 'scan', label: 'Scan your first card', detail: 'Keep a photo witness with the card record.', points: 1 },
]

const progressKeyFor = (accountId) => `cairn-points:${accountId || 'anon'}`

function loadAwards(accountId) {
  try {
    const value = JSON.parse(localStorage.getItem(progressKeyFor(accountId)) || '{}')
    return value && typeof value === 'object' ? value : {}
  } catch { return {} }
}

export function milestoneObservation(profile, store) {
  const entries = Object.values(store || {})
  return {
    profile: profileComplete(profile),
    mark: entries.some((entry) => entry?.stance === 'have' || entry?.stance === 'want'),
    scan: entries.some((entry) => entry?.scanned || entry?.photo_hash || (entry?.pile || []).length),
  }
}

function saveNewAwards(accountId, awards, seen) {
  let changed = false
  const next = { ...awards }
  for (const milestone of FIRST_LAP) {
    if (!next[milestone.id] && seen[milestone.id]) {
      next[milestone.id] = new Date().toISOString()
      changed = true
    }
  }
  if (!changed) return
  try { localStorage.setItem(progressKeyFor(accountId), JSON.stringify(next)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('cairn-progress'))
}

export function useMilestoneProgress(accountId, catalogId, profile) {
  const snapshot = useBus(() => {
    const store = loadStore(storeKeyFor(catalogId, accountId))
    const awards = loadAwards(accountId)
    return { store, awards, seen: milestoneObservation(profile, store) }
  }, [accountId, catalogId, profile?.name, profile?.sign])

  useEffect(() => {
    saveNewAwards(accountId, snapshot.awards, snapshot.seen)
  }, [accountId, snapshot.awards, snapshot.seen])

  const milestones = FIRST_LAP.map((milestone) => ({
    ...milestone,
    done: !!(snapshot.awards[milestone.id] || snapshot.seen[milestone.id]),
  }))
  return {
    milestones,
    points: milestones.reduce((total, milestone) => total + (milestone.done ? milestone.points : 0), 0),
    total: FIRST_LAP.reduce((total, milestone) => total + milestone.points, 0),
    complete: milestones.every((milestone) => milestone.done),
  }
}
