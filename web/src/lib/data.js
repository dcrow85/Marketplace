// The one data layer: catalog and market payloads fetched once per URL, cached at
// module scope, and handed to components as hooks. Replaces eight independent
// fetch-and-map blocks scattered across the app.
import { useEffect, useMemo, useState } from 'react'

const BASE = import.meta.env.BASE_URL || '/'
const cache = new Map()

function resolvedImage(image) {
  if (!image || /^(?:[a-z]+:|\/|#)/i.test(image)) return image
  return BASE + image
}

function normalizePayload(payload) {
  if (!payload || !Array.isArray(payload.cards)) return payload
  const researchBySetId = new Map((payload.sets || []).map((set) => [set.id, set.research_context]))
  return {
    ...payload,
    cards: payload.cards.map((card) => (
      {
        ...card,
        ...(researchBySetId.has(card.research_context_id || card.set_id)
          ? { research_context: researchBySetId.get(card.research_context_id || card.set_id) }
          : {}),
        ...(card.image ? { image: resolvedImage(card.image) } : {}),
      }
    )),
  }
}

export function fetchJson(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(BASE + path).then((r) => r.json()).then(normalizePayload).catch(() => null))
  }
  return cache.get(path)
}

export function useCatalog(catalog) {
  const [d, setD] = useState(null)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset while the payload loads */
    let live = true
    setD(null)
    fetchJson(catalog?.path).then((x) => { if (live) setD(x) })
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => { live = false }
  }, [catalog])
  return d
}

export function useMarket(catalog) {
  const [m, setM] = useState(null)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset while the payload loads */
    let live = true
    setM(null)
    const request = catalog?.marketPath
      ? fetchJson(catalog.marketPath)
      : Promise.resolve({ catalog_id: catalog?.id, sellers: [], sales: {} })
    request.then((x) => { if (live) setM(x && x.catalog_id === catalog?.id ? x : null) })
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => { live = false }
  }, [catalog])
  return m
}

export function useByUid(data) {
  return useMemo(() => new Map((data?.cards || []).map((c) => [c.uid, c])), [data])
}
