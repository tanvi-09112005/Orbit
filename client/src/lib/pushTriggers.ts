import { supabase } from '../lib/supabase'

const PUSH_NOTIFY_URL = 'https://innyndztbmrynnzmwgdt.supabase.co/functions/v1/push_notify'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubnluZHp0Ym1yeW5uem13Z2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDg3NjIsImV4cCI6MjA5NjA4NDc2Mn0.0YNM8eBgOmWhAfYvvFxvzl8L026DzkMxwBVITCzptfI'

async function sendPushToFamily(familyId: string, title: string, body: string, url: string) {
  try {
    await fetch(PUSH_NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ family_id: familyId, title, body, url }),
    })
  } catch (err) {
    console.error('Failed to send push:', err)
  }
}

// ── Trigger 1: Task assigned to someone ──────────────────────
export async function notifyTaskAssigned(
  familyId: string,
  taskTitle: string,
  assignedUserId: string,
  assignedByName: string
) {
  try {
    await fetch(PUSH_NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_ids: [assignedUserId],
        title: 'New task assigned',
        body: `${assignedByName} assigned you: ${taskTitle}`,
        url: '/family/tasks',
      }),
    })
  } catch (err) {
    console.error('Failed to send push:', err)
  }
}

// ── Trigger 2: Event added ────────────────────────────────────
export async function notifyEventAdded(
  familyId: string,
  eventTitle: string,
  dateStr: string
) {
  await sendPushToFamily(
    familyId,
    'New event added',
    `${eventTitle} — ${dateStr}`,
    '/family'
  )
}

// ── Trigger 3: Overdue task reminder ─────────────────────────
export async function notifyOverdueTask(
  familyId: string,
  taskTitle: string,
  assignedUserId?: string
) {
  const payload = {
    title: 'Task overdue',
    body: taskTitle,
    url: '/family/tasks',
    ...(assignedUserId
      ? { user_ids: [assignedUserId] }
      : { family_id: familyId }),
  }

  try {
    await fetch(PUSH_NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Failed to send push:', err)
  }
}

// ── Trigger 4: Homework due today ─────────────────────────────
export async function notifyHomeworkDue(
  familyId: string,
  childName: string,
  subject: string
) {
  await sendPushToFamily(
    familyId,
    `${childName}'s homework due today`,
    subject,
    '/children'
  )
}

// ── Trigger 5: Declining mood alert ──────────────────────────
export async function notifyDecliningMood(
  familyId: string,
  childName: string
) {
  await sendPushToFamily(
    familyId,
    `${childName}'s mood has been low`,
    '3 consecutive stressed check-ins',
    '/insights'
  )
}