const text = (value) => String(value || '').trim()
const JAPANESE_SCRIPT = /[\u3040-\u30ff\u3400-\u9fff]/u

// Card identity is deliberately boring and predictable: the catalogue display
// name is the stable label, while the printing's recorded language/title sits
// beneath it. Never manufacture a translation to fill a source gap.
export function cardDisplayName(card = {}) {
  return text(card.name_en) || text(card.name_ja) || text(card.num) || text(card.uid) || 'Untitled card'
}

export function cardJapaneseName(card = {}) {
  const candidate = text(card.name_ja)
  if (!candidate || candidate === cardDisplayName(card) || !JAPANESE_SCRIPT.test(candidate)) return ''
  return candidate
}

export function cardOrigin(card = {}) {
  const language = text(card.language || (card.name_is_en ? 'English' : ''))
  const japaneseName = cardJapaneseName(card)
  if (language.toLowerCase() === 'japanese' || japaneseName) {
    return { code: 'JP', language: 'Japanese', name: japaneseName, line: japaneseName || 'Japanese printing' }
  }
  if (language.toLowerCase() === 'english') {
    return { code: 'EN', language: 'English', name: '', line: 'English printing' }
  }
  if (language) return { code: language.slice(0, 2).toUpperCase(), language, name: '', line: `${language} printing` }
  return null
}

export function cardOriginText(card = {}) {
  const origin = cardOrigin(card)
  return origin ? `${origin.code} · ${origin.line}` : ''
}
