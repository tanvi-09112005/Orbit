import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const VAPID_PUBLIC_KEY = 'BKNaxBmrNEGFf6AbX2taH1o9uEUfTrHROo-hDegS9NoUfmMft2WRCEhC6bYSRrfwjqzh2zAlv79wKDhO99WNmhQ'

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

        // Check if already subscribed
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          await saveSubscription(existing, user.id)
          return
        }

        // Request permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // Subscribe
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
    {
      user_id: userId,
      subscription: subJson,
    },
    { onConflict: 'user_id' }
  )
}s