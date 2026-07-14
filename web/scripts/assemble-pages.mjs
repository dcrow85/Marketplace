import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'

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
const deferred = html.replace(
  /<script type="module" crossorigin src="([^"]+)"><\/script>/,
  (_, src) => {
    const version = src.match(/\/([^/]+)\.js$/)?.[1] || 'app'
    return `<script type="module" crossorigin src="${src}?v=${version}-module"></script>`
  },
)
if (deferred === html) throw new Error('Vite entry script was not found in app/index.html')
await writeFile(appIndex, deferred)
