// Local photo store for scanned cards (IndexedDB — large quota, holds real photos;
// localStorage only carries the small stance/field data). Keyed by `${storeKey}:${uid}`.
// When the shared backend (R2) lands, these sync up as listing evidence.
const DB_NAME = 'cairn'
const STORE = 'photos'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putPhoto(key, dataUri) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(dataUri, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPhoto(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const g = tx.objectStore(STORE).get(key)
    g.onsuccess = () => resolve(g.result || null)
    g.onerror = () => reject(g.error)
  })
}

export async function deletePhotosWithPrefix(prefix) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const cursor = store.openCursor()
    cursor.onsuccess = () => {
      const row = cursor.result
      if (!row) return
      if (String(row.key).startsWith(prefix)) row.delete()
      row.continue()
    }
    cursor.onerror = () => reject(cursor.error)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
