import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'

const sourceUrl = new URL('../../data/palworld/palify-cards-2026-08-04.json', import.meta.url)
const productsUrl = new URL('../../data/palworld/palworld-products-2026-08-04.json', import.meta.url)
const manifestUrl = new URL('../../data/palworld/palify-assets-2026-08-04.json', import.meta.url)
const assetDirectoryUrl = new URL('../public/assets/palworld/', import.meta.url)
const source = JSON.parse(await readFile(sourceUrl, 'utf8'))
const productsSource = JSON.parse(await readFile(productsUrl, 'utf8'))
const cards = Array.isArray(source.cards) ? source.cards : []
const products = Array.isArray(productsSource.products) ? productsSource.products : []
const upstreamPaths = [...new Set([...cards.flatMap((card) => [
  card.image,
  ...(card.printings || []).map((printing) => printing.image),
]), ...products.map((product) => product.image)].filter(Boolean))].sort()

if (!upstreamPaths.length) throw new Error('Palify snapshot contains no image paths')
await mkdir(assetDirectoryUrl, { recursive: true })

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const mirrorOne = async (upstreamPath) => {
  const upstreamUrl = new URL(upstreamPath, 'https://palify.org/').toString()
  const filename = basename(new URL(upstreamUrl).pathname)
  if (!/^[A-Za-z0-9._-]+\.webp$/.test(filename)) throw new Error(`Unsafe Palify asset name: ${filename}`)
  const response = await fetch(upstreamUrl, { headers: { 'User-Agent': 'Cairn catalogue mirror; source credit Palify' } })
  if (!response.ok) throw new Error(`Palify asset fetch failed ${response.status}: ${upstreamUrl}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 12 || bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new Error(`Palify asset is not WebP: ${upstreamUrl}`)
  }
  const destinationUrl = new URL(filename, assetDirectoryUrl)
  const partialUrl = new URL(`${filename}.part`, assetDirectoryUrl)
  await writeFile(partialUrl, bytes)
  await rename(partialUrl, destinationUrl)
  return {
    upstream_path: upstreamPath,
    upstream_url: upstreamUrl,
    local_path: `assets/palworld/${filename}`,
    sha256: sha256(bytes),
    bytes: bytes.length,
    content_type: response.headers.get('content-type') || 'image/webp',
  }
}

const entries = []
const queue = [...upstreamPaths]
const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
  while (queue.length) entries.push(await mirrorOne(queue.shift()))
})
await Promise.all(workers)
entries.sort((left, right) => left.upstream_path.localeCompare(right.upstream_path))

const manifest = {
  source: 'Palify',
  source_snapshot: ['data/palworld/palify-cards-2026-08-04.json', 'data/palworld/palworld-products-2026-08-04.json'],
  snapshot_date: '2026-08-04',
  asset_policy: 'Authorized local catalogue-reference mirror; credit Palify; not seller evidence or physical-card proof.',
  assets: entries,
  summary: {
    unique_assets: entries.length,
    total_bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    sha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex'),
  },
}
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Palworld assets: mirrored ${entries.length} WebP files (${manifest.summary.total_bytes} bytes).`)
