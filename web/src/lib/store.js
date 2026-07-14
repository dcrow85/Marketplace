// The one storage idiom: read a cairn-* key, write it (announcing on the bus), or
// subscribe a component to it. Replaces the per-component rev-counter + listener
// boilerplate that had been copy-pasted nine times.
import { useEffect, useState } from 'react'

const BUS = ['cairn-store', 'cairn-offers', 'cairn-mock', 'cairn-pile', 'cairn-profile', 'cairn-progress']

export function readKey(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null')
    return v == null ? fallback : v
  } catch { return fallback }
}

export function writeKey(key, value, event = 'cairn-store') {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(event))
}

// Recompute `compute()` whenever anything on the bus announces a write (engines,
// other components, the chain rail). deps re-arm the subscription.
export function useBus(compute, deps) {
  const [v, setV] = useState(compute)
  useEffect(() => {
    const f = () => setV(compute())
    BUS.forEach((e) => window.addEventListener(e, f))
    f()
    return () => BUS.forEach((e) => window.removeEventListener(e, f))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps -- deps are the caller's cache key
  return v
}
