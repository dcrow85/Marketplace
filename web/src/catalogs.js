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
  {
    id: 'palworld-ocg',
    label: 'Palworld OCG',
    title: 'Palworld Original Card Game catalogue',
    path: 'catalogs/palworld-ocg.json',
    marketPath: null,
    routePrefixes: ['palify-'],
    note: 'Palify-authorized local catalogue references; seller evidence stays separate.',
  },
]

export const DEFAULT_CATALOG = CATALOGS[0]
