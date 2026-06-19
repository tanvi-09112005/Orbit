import { useEffect } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

const firebaseConfig = {
  apiKey: 'AIzaSyDVQdAB_tq9psdxbkmLWRItP7DiLU4j7OQ',
  authDomain: 'orbit-46b13.firebaseapp.com',
  projectId: 'orbit-46b13',
  storageBucket: 'orbit-46b13.firebasestorage.app',
  messagingSenderId: '655524570140',
  appId: '1:655524570140:web:ede37300b285c8ef9a6bd9',
}

// VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = 'BO_lECk5-uEDhPmbWcv9dP4Gt4wWBRJzXUI3Fx7mQygZ53VvdJh4jyxyW8SI_yI0QzGqWYxeTOxwqvNfOUrmtQA'

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export function usePushNotifications() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()

  useEffect(() => {
    if (!user) return
    if (!('serviceWorker' in navigator)) return
    if (typeof Notification === 'undefined') return

    async function subscribe() {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const messaging = getMessaging(app)

        const registration = await navigator.serviceWorker.ready

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        })

        if (!token) {
          console.warn('No FCM token received')
          return
        }

        // Save FCM token — store as subscription object for compatibility
        await supabase.from('user_push_subscriptions').upsert(
          {
            user_id: user.id,
            subscription: { endpoint: token, type: 'fcm' },
          },
          { onConflict: 'user_id' }
        )

        // Handle foreground messages
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || 'Orbit'
          const body = payload.notification?.body || ''
          addToast(`${title}: ${body}`, 'info')
        })
      } catch (err) {
        console.error('Push subscription error:', err)
      }
    }

    subscribe()
  }, [user])
}