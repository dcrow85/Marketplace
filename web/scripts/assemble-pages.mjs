import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
await mkdir(new URL('assets/', dist), { recursive: true })

await Promise.all([
  copyFile(new URL('../../mockups/cairn-landing.html', import.meta.url), new URL('index.html', dist)),
  copyFile(new URL('../../mockups/cairn-protocol.html', import.meta.url), new URL('cairn-protocol.html', dist)),
  copyFile(new URL('../../mockups/assets/azuki-alpha-obv.jpg', import.meta.url), new URL('assets/azuki-alpha-obv.jpg', dist)),
  copyFile(new URL('../pages-headers', import.meta.url), new URL('_headers', dist)),
])

// Wallet extensions commonly finish injecting providers on `load`. Starting the
// module earlier can race their page-world hooks on real dapp origins, leaving the
// browser with an unexecuted entry module and an empty root. Let extensions settle,
// then attach the exact hashed Vite entry without changing the application bundle.
const appIndex = new URL('app/index.html', dist)
const html = await readFile(appIndex, 'utf8')
const deferred = html.replace(
  /<script type="module" crossorigin src="([^"]+)"><\/script>/,
  `<script>
    window.addEventListener('load', function () {
      var entry = document.createElement('script');
      entry.type = 'module';
      entry.src = '$1';
      entry.crossOrigin = '';
      document.head.appendChild(entry);
    }, { once: true });
  </script>`,
)
if (deferred === html) throw new Error('Vite entry script was not found in app/index.html')
await writeFile(appIndex, deferred)
