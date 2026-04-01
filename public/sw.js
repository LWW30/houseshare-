// Simple service worker - network first, no aggressive caching
// This ensures the app always loads fresh from the server

self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  // Clear all old caches
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  )
  self.clients.claim()
})

// Network first — always try to load from network
// Only fall back to cache if offline
self.addEventListener('fetch', event => {
  // Never cache Supabase API calls
  if (event.request.url.includes('supabase') || 
      event.request.url.includes('/api/') ||
      event.request.method !== 'GET') {
    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a copy for offline use
        const clone = response.clone()
        caches.open('houseshare-v2').then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request)
      })
  )
})
