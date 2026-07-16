import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
await mkdir(new URL('assets/', dist), { recursive: true })

await Promise.all([
  copyFile(new URL('../../mockups/cairn-landing.html', import.meta.url), new URL('index.html', dist)),
  copyFile(new URL('../../mockups/cairn-protocol.html', import.meta.url), new URL('cairn-protocol.html', dist)),
  copyFile(new URL('../../mockups/assets/azuki-alpha-obv.jpg', import.meta.url), new URL('assets/azuki-alpha-obv.jpg', dist)),
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
