// The front page: up to nine cards you pinned to lead your binder. Curation is one
// decision — pin your nine — and grails stand in until you make it.
import { readKey, writeKey } from '../lib/store.js'

export const pinsKeyFor = (catalogId, accountId) =>
  accountId ? `cairn-pins:${catalogId}:${accountId}` : `cairn-pins:${catalogId}`

export const loadPins = (key) => readKey(key, [])

export function togglePin(key, uid) {
  const pins = loadPins(key)
  const next = pins.includes(uid) ? pins.filter((u) => u !== uid) : [...pins, uid].slice(0, 9)
  writeKey(key, next)
  return next
}
