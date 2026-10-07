// Münzfotos werden in IndexedDB gespeichert, weil localStorage für Bilder zu klein ist.
const DB_NAME = 'zwei-euro-album'
const STORE = 'photos'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const result = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(result)
    t.onerror = () => reject(t.error)
  })
}

export async function loadPhotos() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const out = {}
    const req = db.transaction(STORE).objectStore(STORE).openCursor()
    req.onsuccess = () => {
      const cur = req.result
      if (cur) { out[cur.key] = cur.value; cur.continue() } else resolve(out)
    }
    req.onerror = () => reject(req.error)
  })
}

export const savePhoto = (id, dataUrl) => tx('readwrite', (s) => s.put(dataUrl, id))
export const deletePhoto = (id) => tx('readwrite', (s) => s.delete(id))
export const clearPhotos = () => tx('readwrite', (s) => s.clear())

// Foto quadratisch zuschneiden (Mitte) und verkleinern
export function processImage(file, zoom = 1, size = 480) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height) / zoom
      const sx = (img.width - side) / 2
      const sy = (img.height - side) / 2
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden')) }
    img.src = url
  })
}
