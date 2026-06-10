/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Precache all assets from Vite build
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Supabase API — network first, fall back to cache
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && !url.pathname.includes('/storage/'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 3600, maxEntries: 100 }),
    ],
  })
)

// Supabase storage — cache first
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/storage/'),
  new CacheFirst({
    cacheName: 'supabase-storage',
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 86400 * 30, maxEntries: 50 }),
    ],
  })
)

// Google Fonts — stale while revalidate
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts' })
)

// Navigation fallback
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'navigation',
      plugins: [
        new ExpirationPlugin({ maxAgeSeconds: 86400 }),
      ],
    }),
    { denylist: [/\/api\//] }
  )
)

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim())
})