/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

// Precache all assets from Vite/Workbox build
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Supabase API — network first
registerRoute(
  ({ url }) =>
    url.hostname.includes('supabase.co') &&
    !url.pathname.includes('/storage/'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 3600,
        maxEntries: 100,
      }),
    ],
  })
)

// Supabase Storage — cache first
registerRoute(
  ({ url }) =>
    url.hostname.includes('supabase.co') &&
    url.pathname.includes('/storage/'),
  new CacheFirst({
    cacheName: 'supabase-storage',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 86400 * 30,
        maxEntries: 50,
      }),
    ],
  })
)

// Google Fonts
registerRoute(
  ({ url }) =>
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts',
  })
)

// Navigation fallback
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigation',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 86400,
      }),
    ],
  }),
  {
    denylist: [/\/api\//],
  }
)

registerRoute(navigationRoute)

// Skip waiting
self.addEventListener('message', (event) => {
  if ((event as any).data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Activate immediately
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim())
})