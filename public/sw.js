// Offline-Modus: speichert die App und den Katalog auf dem Gerät.
const CACHE = 'zwei-euro-album-v3'
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/catalog.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

// Schriften und Kartendaten von externen Servern ebenfalls offline speichern
const isFont = (url) => ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname)

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.pathname.startsWith('/api/')) return
  if (url.origin !== self.location.origin && !isFont(url)) return

  // Seite und Katalog: zuerst Netz, offline aus dem Speicher
  if (req.mode === 'navigate' || url.pathname === '/catalog.json') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? '/index.html' : '/catalog.json', copy))
          return res
        })
        .catch(() => caches.match(req.mode === 'navigate' ? '/index.html' : '/catalog.json'))
    )
    return
  }

  // Alles andere (Skripte, Stile, Schriften): zuerst Speicher, sonst Netz und merken
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy))
      }
      return res
    }))
  )
})
