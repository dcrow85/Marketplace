// Client-side mirror of cairn_browse.apply_filter, so the grid narrows to EXACTLY the
// agent's survivors and the count matches what it said ("cut to N candidates").
export function applyAgentFilter(cards, f, setById) {
  let out = cards
  if (f.release_family) out = out.filter((c) => (c.release_family || '').toLowerCase() === String(f.release_family).toLowerCase())
  if (f.product_channel) {
    const ch = String(f.product_channel).toLowerCase()
    out = out.filter((c) => ch === 'starter'
      ? String(c.product_channel || '').startsWith('starter_deck_')
      : (c.product_channel || '').toLowerCase() === ch)
  }
  if (f.holo != null) out = out.filter((c) => !!c.holo === !!f.holo)
  if (f.owned != null) out = out.filter((c) => !!c.owned === !!f.owned)
  if (f.exclude_grails) out = out.filter((c) => (c.band_rank || 0) < 3)
  if (f.category) out = out.filter((c) => (c.category || '').toLowerCase() === String(f.category).toLowerCase())
  if (f.card_type) {
    const t = String(f.card_type).toLowerCase()
    out = out.filter((c) => [...(c.types || []), ...(c.subtypes || [])].some((x) => (x || '').toLowerCase().includes(t)))
  }
  if (f.element) out = out.filter((c) => (c.element || '').toLowerCase() === String(f.element).toLowerCase())
  if (f.star_alt != null) out = out.filter((c) => !!c.star_alt === !!f.star_alt)
  if (f.rarity) {
    const r = String(f.rarity).trim().toLowerCase()
    const known = new Set(cards.map((c) => (c.rarity || '').trim().toLowerCase()))
    out = known.has(r) // exact code — 'C' must not swallow 'UC'
      ? out.filter((c) => (c.rarity || '').trim().toLowerCase() === r)
      : out.filter((c) => (c.rarity || '').toLowerCase().includes(r))
  }
  if (f.set) { const s = String(f.set).toLowerCase(); out = out.filter((c) => (setById[c.set_id]?.label || '').toLowerCase().includes(s)) }
  if (f.character) { const ch = String(f.character).toLowerCase(); out = out.filter((c) => (c.name_en || '').toLowerCase().includes(ch) || (c.name_ja || '').toLowerCase().includes(ch)) }
  return out
}
