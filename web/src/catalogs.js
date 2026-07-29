export const CATALOGS = [
  {
    id: 'azuki-tcg',
    label: 'Azuki TCG',
    title: 'Azuki TCG catalog',
    path: 'catalogs/azuki-tcg.json',
    marketPath: 'market-sample.json',
    routePrefixes: ['azuki-tcg-'],
    note: 'Alpha, Gates Awakened, observations, and source scars.',
  },
  {
    // Keep the original ID: existing collectors' browser stores remain attached.
    id: 'japanese-pre-english',
    label: 'Vintage Pokémon',
    title: 'Vintage Pokémon catalogue',
    path: 'catalogs/vintage-pokemon.json',
    marketPath: null,
    routePrefixes: ['pmcg', 'jp-', 'en-wotc-'],
    note: 'Japanese vintage and English WotC printings, with source status kept visible.',
  },
]

export const DEFAULT_CATALOG = CATALOGS[0]
