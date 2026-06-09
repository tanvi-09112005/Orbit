import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase environment variables not set. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Auth helpers
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user
}

// Family queries
export async function fetchFamilies(userId) {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('owner_id', userId)
  if (error) throw error
  return data
}

export async function createFamily(familyData) {
  const { data, error } = await supabase
    .from('families')
    .insert([familyData])
    .select()
  if (error) throw error
  return data[0]
}

// Events queries
export async function fetchEvents(familyId, filters = {}) {
  let query = supabase
    .from('events')
    .select('*')
    .eq('family_id', familyId)

  if (filters.from && filters.to) {
    query = query
      .gte('start_at', filters.from)
      .lte('start_at', filters.to)
  }

  const { data, error } = await query.order('start_at')
  if (error) throw error
  return data
}

export async function createEvent(eventData) {
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
  if (error) throw error
  return data[0]
}

// Children queries
export async function fetchChildren(familyId) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', familyId)
  if (error) throw error
  return data
}

export async function createChild(childData) {
  const { data, error } = await supabase
    .from('children')
    .insert([childData])
    .select()
  if (error) throw error
  return data[0]
}

// Mood logs queries
export async function fetchMoodLogs(childId, days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('child_id', childId)
    .gte('logged_at', startDate.toISOString())
    .order('logged_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createMoodLog(moodData) {
  const { data, error } = await supabase
    .from('mood_logs')
    .insert([moodData])
    .select()
  if (error) throw error
  return data[0]
}

// Screen time queries
export async function fetchScreenTimeLogs(childId, days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('screen_time_logs')
    .select('*')
    .eq('child_id', childId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

export async function createScreenTimeLog(screenTimeData) {
  const { data, error } = await supabase
    .from('screen_time_logs')
    .insert([screenTimeData])
    .select()
  if (error) throw error
  return data[0]
}

// Tasks queries
export async function fetchTasks(familyId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('family_id', familyId)
    .order('due_date')
  if (error) throw error
  return data
}

export async function createTask(taskData) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
  if (error) throw error
  return data[0]
}

export async function updateTask(taskId, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
  if (error) throw error
  return data[0]
}

// Family members queries
export async function fetchFamilyMembers(familyId) {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('family_id', familyId)
  if (error) throw error
  return data
}

export async function inviteFamilyMember(familyMemberData) {
  const { data, error } = await supabase
    .from('family_members')
    .insert([familyMemberData])
    .select()
  if (error) throw error
  return data[0]
}
