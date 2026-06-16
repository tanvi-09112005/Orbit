// pushNotifications.ts — replace all raw fetch calls

import { supabase } from '../lib/supabase'

async function callPushNotify(payload: object) {
  const { error } = await supabase.functions.invoke('push_notify', {
    body: payload,
  })
  if (error) console.error('Push notify error:', error)
}

export async function notifyTaskAssigned(
  familyId: string,
  taskTitle: string,
  assignedUserId: string,
  assignedByName: string
) {
  await callPushNotify({
    user_ids: [assignedUserId],
    title: 'New task assigned',
    body: `${assignedByName} assigned you: ${taskTitle}`,
    url: '/family/tasks',
  })
}

export async function notifyEventAdded(familyId: string, eventTitle: string, dateStr: string) {
  await callPushNotify({
    family_id: familyId,
    title: 'New event added',
    body: `${eventTitle} — ${dateStr}`,
    url: '/family',
  })
}

export async function notifyOverdueTask(familyId: string, taskTitle: string, assignedUserId?: string) {
  await callPushNotify({
    title: 'Task overdue',
    body: taskTitle,
    url: '/family/tasks',
    ...(assignedUserId ? { user_ids: [assignedUserId] } : { family_id: familyId }),
  })
}

export async function notifyHomeworkDue(familyId: string, childName: string, subject: string) {
  await callPushNotify({
    family_id: familyId,
    title: `${childName}'s homework due today`,
    body: subject,
    url: '/children',
  })
}

export async function notifyDecliningMood(familyId: string, childName: string) {
  await callPushNotify({
    family_id: familyId,
    title: `${childName}'s mood has been low`,
    body: '3 consecutive stressed check-ins',
    url: '/insights',
  })
}