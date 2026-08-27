// supabase/functions/push-notify/index.ts
// Sends FCM v1 push notifications to family members via Firebase Cloud Messaging.
//
// Expected request body:
//   { title: string, body: string, url?: string }
//   + one of: { user_ids: string[] } OR { family_id: string }
//
// Required Supabase secrets:
//   FIREBASE_SERVICE_ACCOUNT — JSON string of a Firebase service account key
//   (set via: supabase secrets set FIREBASE_SERVICE_ACCOUNT='<json>')

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// ── Types ──────────────────────────────────────────────────────

interface PushRequest {
  user_ids?: string[]
  family_id?: string
  title: string
  body: string
  url?: string
}

interface SubscriptionRow {
  user_id: string
  subscription: { endpoint: string; type: string }
}

// ── Google OAuth2 token via service account ────────────────────

async function getAccessToken(serviceAccount: {
  client_email: string
  private_key: string
  token_uri: string
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  }

  // Encode JWT
  const encoder = new TextEncoder()
  const toBase64Url = (data: Uint8Array) =>
    btoa(String.fromCharCode(...data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const headerB64 = toBase64Url(encoder.encode(JSON.stringify(header)))
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const signingInput = `${headerB64}.${payloadB64}`

  // Import private key and sign
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  )

  const signatureB64 = toBase64Url(new Uint8Array(signature))
  const jwt = `${signingInput}.${signatureB64}`

  // Exchange JWT for access token
  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Failed to get access token: ${err}`)
  }

  const { access_token } = await tokenRes.json()
  return access_token
}

// ── Send FCM v1 message ───────────────────────────────────────

async function sendFCMv1(
  projectId: string,
  accessToken: string,
  fcmToken: string,
  title: string,
  body: string,
  url: string
): Promise<boolean> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body },
          webpush: {
            fcm_options: { link: url },
            notification: {
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              tag: 'orbit-notification',
              renotify: true,
            },
          },
          data: { url },
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error(`FCM send failed for token ${fcmToken.slice(0, 10)}...: ${err}`)
    return false
  }

  return true
}

// ── Main handler ──────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { user_ids, family_id, title, body, url = '/home' } =
      (await req.json()) as PushRequest

    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title and body are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!user_ids?.length && !family_id) {
      return new Response(
        JSON.stringify({ error: 'Either user_ids or family_id must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── Init Supabase client (service role) ─────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ── Resolve target user IDs ─────────────────────────────
    let targetUserIds: string[] = user_ids || []

    if (family_id && !user_ids?.length) {
      const { data: members, error: membersErr } = await supabase
        .from('family_members')
        .select('user_id')
        .eq('family_id', family_id)

      if (membersErr) throw membersErr
      targetUserIds = (members || []).map((m: { user_id: string }) => m.user_id)
    }

    if (!targetUserIds.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No target users found' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── Fetch FCM tokens ────────────────────────────────────
    const { data: subscriptions, error: subErr } = await supabase
      .from('user_push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', targetUserIds)

    if (subErr) throw subErr

    const fcmTokens = (subscriptions || [])
      .filter((s: SubscriptionRow) => s.subscription?.type === 'fcm' && s.subscription?.endpoint)
      .map((s: SubscriptionRow) => s.subscription.endpoint)

    if (!fcmTokens.length) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No push subscriptions found for target users' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── Get Firebase access token ───────────────────────────
    const serviceAccountB64 = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_B64')
    if (!serviceAccountB64) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_B64 secret not set. ' +
          'Run: supabase secrets set --env-file supabase/.env.secret'
      )
    }

    const serviceAccount = JSON.parse(atob(serviceAccountB64))
    const accessToken = await getAccessToken(serviceAccount)
    const projectId = serviceAccount.project_id

    // ── Send to all tokens ──────────────────────────────────
    const results = await Promise.allSettled(
      fcmTokens.map((token: string) =>
        sendFCMv1(projectId, accessToken, token, title, body, url)
      )
    )

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true
    ).length

    return new Response(
      JSON.stringify({ sent, total: fcmTokens.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('push-notify error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
