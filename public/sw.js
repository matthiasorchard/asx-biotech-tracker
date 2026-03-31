const CACHE = 'asx-biotech-v1'

// App shell pages to pre-cache on install
const SHELL = ['/', '/companies', '/catalysts', '/risk-matrix', '/trials', '/announcements']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  // Remove old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const { request } = e
  if (request.method !== 'GET') return

  // Let Supabase API calls go straight to network — never cache live data
  const url = new URL(request.url)
  if (url.hostname.includes('supabase.co')) return

  // Network-first for HTML navigation (always fresh page)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(request, res.clone()))
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(res => {
        caches.open(CACHE).then(c => c.put(request, res.clone()))
        return res
      })
    })
  )
})
