self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// A fetch handler is required by some mobile installability checks.
self.addEventListener('fetch', () => {})
