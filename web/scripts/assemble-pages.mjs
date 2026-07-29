import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { CATALOGS } from '../src/catalogs.js'

const dist = new URL('../dist/', import.meta.url)
await mkdir(new URL('assets/', dist), { recursive: true })

await Promise.all([
  copyFile(new URL('../../mockups/cairn-landing.html', import.meta.url), new URL('index.html', dist)),
  copyFile(new URL('../../mockups/cairn-protocol.html', import.meta.url), new URL('cairn-protocol.html', dist)),
  copyFile(new URL('../../mockups/assets/azuki-alpha-obv.jpg', import.meta.url), new URL('assets/azuki-alpha-obv.jpg', dist)),
  copyFile(new URL('../pages-404.html', import.meta.url), new URL('404.html', dist)),
  copyFile(new URL('../pages-headers', import.meta.url), new URL('_headers', dist)),
])

// Keep Vite's native module tag so the browser schedules the entry reliably while
// wallet extensions finish their document-start injection. Repeat the filename
// hash in the query so a brief custom-domain propagation race cannot leave an
// immutable HTML fallback cached at the script URL.
const appIndex = new URL('app/index.html', dist)
const html = await readFile(appIndex, 'utf8')
const entry = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)
if (!entry) throw new Error('Vite entry script was not found in app/index.html')

// Rolldown's output hash can remain stable across content changes for this
// single-file IIFE build. Re-hash the finished bytes so immutable caching is safe.
const originalSrc = entry[1]
const originalEntry = new URL(`.${originalSrc}`, dist)
const entryBytes = await readFile(originalEntry)
const contentHash = createHash('sha256').update(entryBytes).digest('hex').slice(0, 12)
const contentSrc = originalSrc.replace(/\/cairn-site-[^/]+\.js$/, `/cairn-site-${contentHash}.js`)
if (contentSrc === originalSrc) throw new Error(`Unexpected Vite entry path: ${originalSrc}`)
await rename(originalEntry, new URL(`.${contentSrc}`, dist))

const deferred = html.replace(
  /<script type="module" crossorigin src="([^"]+)"><\/script>/,
  () => {
    const src = contentSrc
    const version = src.match(/\/([^/]+)\.js$/)?.[1] || 'app'
    return `<script type="module" crossorigin src="${src}?v=${version}-module"></script>`
  },
)
await writeFile(appIndex, deferred)

// Cloudflare Pages serves static files before Functions. Give every catalogue row
// a durable, shareable route while keeping the app's single client bundle. The
// client resolves this readable slug back to the exact UID, so distinct printings
// and observations never collapse merely because their card numbers match.
const cardSlug = (uid) => String(uid).trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
const catalogues = await Promise.all(CATALOGS.map(async (catalog) => ({
  config: catalog,
  payload: JSON.parse(await readFile(new URL(`../public/${catalog.path}`, import.meta.url), 'utf8')),
})))
const routeSlugs = new Set(catalogues.flatMap(({ payload }) => (
  (payload.cards || []).map((card) => cardSlug(card.uid))
)))
await Promise.all([...routeSlugs].map(async (slug) => {
  const route = new URL(`app/cards/${slug}/`, dist)
  await mkdir(route, { recursive: true })
  await writeFile(new URL('index.html', route), deferred)
}))

// Vintage card artwork is deliberately not copied into web/public: mockups remain
// read-only source material. The production bundle receives each locally mirrored
// catalogue witness, while the payload preserves display_allowed/image_status so
// the UI can distinguish a catalogue reference from seller evidence.
const vintage = catalogues.find(({ config }) => config.id === 'japanese-pre-english')
const vintageImages = new Set((vintage?.payload.cards || [])
  .filter((card) => card.image)
  .map((card) => card.image))
await Promise.all([...vintageImages].map(async (image) => {
  if (!image.startsWith('assets/')) throw new Error(`Unexpected vintage image path: ${image}`)
  const destination = new URL(`app/${image}`, dist)
  await mkdir(new URL('./', destination), { recursive: true })
  await copyFile(new URL(`../../mockups/${image}`, import.meta.url), destination)
}))
