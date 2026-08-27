/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

// ── Firebase init ─────────────────────────────────────────────
const firebaseApp = initializeApp({
  apiKey: 'AIzaSyDVQdAB_tq9psdxbkmLWRItP7DiLU4j7OQ',
  authDomain: 'orbit-46b13.firebaseapp.com',
  projectId: 'orbit-46b13',
  storageBucket: 'orbit-46b13.firebasestorage.app',
  messagingSenderId: '655524570140',
  appId: '1:655524570140:web:ede37300b285c8ef9a6bd9',
})

const messaging = getMessaging(firebaseApp)

onBackgroundMessage(messaging, (payload) => {
  const title = payload.data?.title || payload.notification?.title || 'Orbit'
  const body = payload.data?.body || payload.notification?.body || ''
  const url = payload.data?.url || '/home'

  self.registration.showNotification(title, {
  body,
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-72x72.png',
  data: { url },
  tag: 'orbit-notification',
  renotify: true,
} as NotificationOptions)
})

// ── Notification click handler ────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = event.notification.data?.url || '/home'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.navigate(url)
      } else {
        self.clients.openWindow(url)
      }
    })
  )
})

// ── Workbox precaching ────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && !url.pathname.includes('/storage/'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 3600, maxEntries: 100 })],
  })
)

registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/storage/'),
  new CacheFirst({
    cacheName: 'supabase-storage',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 86400 * 30, maxEntries: 50 })],
  })
)

registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts' })
)

registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'navigation',
      plugins: [new ExpirationPlugin({ maxAgeSeconds: 86400 })],
    }),
    { denylist: [/\/api\//] }
  )
)

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim())
})