import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const VAPID_PUBLIC_KEY = 'BAhwUD92Lzu8rvcr4PbCZ4JJg1s5NUrbd1NEwClEQfy5K1BpqH6rglUIAt_2THYF2UsTewpd87wVZx4efBM6IMs'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function subscribe() {
      try {
        const registration = await navigator.serviceWorker.ready

      const existing = await registration.pushManager.getSubscription()
if (existing) {
  if (existing.endpoint.includes('/fcm/send/')) {
    await existing.unsubscribe()  // force fresh subscription
    // falls through to create new one below
  } else {
    await saveSubscription(existing, user.id)
    return
  }
}
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        await saveSubscription(subscription, user.id)
      } catch (err) {
        console.error('Push subscription error:', err)
      }
    }

    subscribe()
  }, [user])
}

async function saveSubscription(subscription, userId) {
  const subJson = subscription.toJSON()
  await supabase.from('user_push_subscriptions').upsert(
    { user_id: userId, subscription: subJson },
    { onConflict: 'user_id' }
  )
}