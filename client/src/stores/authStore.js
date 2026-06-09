import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  setSession: (session) => set({
    session,
    user: session?.user ?? null,
    loading: false,
  }),

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.session) {
      set({ session: data.session, user: data.session.user, loading: false })
    }
    return data
  },

  signup: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    if (data.session) {
      set({ session: data.session, user: data.session.user, loading: false })
    }
    return data
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },

  // Updates both auth user_metadata AND the profiles table
  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')

    // 1. Update Supabase Auth user metadata
    const { error: authError } = await supabase.auth.updateUser({ data: updates })
    if (authError) throw authError

    // 2. If name is being updated, also patch the profiles table
    if (updates.name) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: updates.name })
        .eq('id', user.id)
      if (profileError) throw profileError
    }

    // 3. Sync local state
    set((state) => ({
      user: {
        ...state.user,
        user_metadata: { ...state.user?.user_metadata, ...updates },
      },
    }))
  },
}))