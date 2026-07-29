export function initialFamilyFilter() {
  return new Set()
}

export function cardMatchesText(card, needle, setById = {}) {
  const q = String(needle || '').trim().toLowerCase()
  if (!q) return true
  const hay = [
    card.num,
    card.card_id,
    card.name_en,
    card.romaji,
    card.name_ja,
    card.language,
    card.language_code,
    card.element,
    card.rarity,
    card.illustrator,
    card.source_entry_id,
    card.release_family_label,
    card.product_channel_label,
    card.source_set_label,
    card.stamp,
    card.variant_group?.variant_kind,
    card.event_assertion?.event,
    setById[card.set_id]?.label,
  ].filter(Boolean).join(' ').toLowerCase()
  return hay.includes(q)
}
