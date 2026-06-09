/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & typeof globalThis

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Precache all assets from Vite build
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Supabase API — network first
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && !url.pathname.includes('/storage/'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 3600, maxEntries: 100 })],
  })
)

// Supabase storage — cache first
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/storage/'),
  new CacheFirst({
    cacheName: 'supabase-storage',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 86400 * 30, maxEntries: 50 })],
  })
)

// Google Fonts
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts' })
)

// Navigation fallback
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'navigation',
      plugins: [new ExpirationPlugin({ maxAgeSeconds: 86400 })],
    }),
    { denylist: [/\/api\//] }
  )
)

// ── Push notification handler ────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  const data = event.data.json()
  const { title, body, url, icon } = data

  event.waitUntil(
    self.registration.showNotification(title || 'Orbit', {
      body: body || '',
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: url || '/home' },
      
      requireInteraction: false,
    })
  )
})

// ── Notification click handler ───────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const url = event.notification.data?.url || '/home'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If app is already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open new window
      self.clients.openWindow(url)
    })
  )
})

// Skip waiting and claim clients
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim())
})