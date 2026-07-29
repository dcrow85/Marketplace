// Client-side mirror of cairn_browse.apply_filter, so the grid narrows to EXACTLY the
// agent's survivors and the count matches what it said ("cut to N candidates").
function worldSearchText(c) {
  const w = c.azuki_world || {}
  const event = c.event_assertion || {}
  const collection = c.collection_assertion || {}
  const connections = (w.connections || []).flatMap((x) => [x.related_card_id, x.relation])
  const refs = (w.source_identity_refs || []).flatMap((x) => [x.collection, x.token_or_reference_id])
  return [
    w.lore_summary, w.character_thread, w.variant_role, w.visual_note, c.stamp,
    w.setting_cue?.value, ...(w.official_subtypes || []), ...(w.motifs || []),
    ...(w.search_terms || []), ...connections, ...refs, event.event,
    event.distribution, event.authority_label, collection.collection_id,
    collection.name, collection.position, collection.membership_authority,
  ].filter(Boolean).join(' ').toLowerCase()
}

export function applyAgentFilter(cards, f, setById) {
  let out = cards
  if (Array.isArray(f.deck_card_names) && f.deck_card_names.length) {
    const names = new Set(f.deck_card_names.map((name) => String(name).toLowerCase()))
    out = out.filter((c) => names.has(String(c.name_en || c.name_ja || '').toLowerCase()))
  }
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
  if (f.language) out = out.filter((c) => (c.language || '').toLowerCase() === String(f.language).toLowerCase())
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
  if (f.character) {
    const ch = String(f.character).toLowerCase()
    out = out.filter((c) => (c.name_en || '').toLowerCase().includes(ch) || (c.name_ja || '').toLowerCase().includes(ch) || worldSearchText(c).includes(ch))
  }
  if (f.plane) {
    const plane = String(f.plane).toLowerCase()
    const needles = plane === 'threshold' ? ['threshold', 'gate'] : [plane]
    out = out.filter((c) => needles.some((x) => String(c.azuki_world?.setting_cue?.value || '').toLowerCase().includes(x)))
  }
  if (f.lore_term) {
    const term = String(f.lore_term).toLowerCase()
    out = out.filter((c) => (c.azuki_world?.official_subtypes || []).join(' ').toLowerCase().includes(term))
  }
  if (f.theme) {
    const theme = String(f.theme).toLowerCase()
    out = out.filter((c) => (c.azuki_world?.motifs || []).join(' ').toLowerCase().includes(theme))
  }
  if (f.character_thread) {
    const thread = String(f.character_thread).toLowerCase()
    out = out.filter((c) => String(c.azuki_world?.character_thread || '').toLowerCase() === thread)
  }
  if (f.event) { const event = String(f.event).toLowerCase(); out = out.filter((c) => worldSearchText(c).includes(event)) }
  if (f.lore) { const lore = String(f.lore).toLowerCase(); out = out.filter((c) => worldSearchText(c).includes(lore)) }
  return out
}
