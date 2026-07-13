import { copyFile, mkdir } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
await mkdir(new URL('assets/', dist), { recursive: true })

await Promise.all([
  copyFile(new URL('../../mockups/cairn-landing.html', import.meta.url), new URL('index.html', dist)),
  copyFile(new URL('../../mockups/cairn-protocol.html', import.meta.url), new URL('cairn-protocol.html', dist)),
  copyFile(new URL('../../mockups/assets/azuki-alpha-obv.jpg', import.meta.url), new URL('assets/azuki-alpha-obv.jpg', dist)),
  copyFile(new URL('../pages-headers', import.meta.url), new URL('_headers', dist)),
])
