import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useFamilyStore = create((set, get) => ({
  family: null,
  members: [],
  children: [],
  loading: false,
  error: null,

  fetchFamily: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { set({ loading: false }); return }

      // Use maybeSingle() — returns null instead of throwing when no row found
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .not('family_id', 'is', null)
        .maybeSingle()

      if (memberError) { set({ error: memberError.message, loading: false }); return }
      if (!memberData) { set({ loading: false }); return } // No family yet — valid state

      const familyId = memberData.family_id

      const [familyRes, membersRes, childrenRes] = await Promise.all([
        supabase.from('families').select('*').eq('id', familyId).single(),
        supabase.from('family_members')
          .select('*, profiles(name, email)')
          .eq('family_id', familyId),
        supabase.from('children').select('*').eq('family_id', familyId),
      ])

      if (familyRes.error) throw familyRes.error
      if (membersRes.error) throw membersRes.error
      if (childrenRes.error) throw childrenRes.error

      set({
        family: familyRes.data,
        members: membersRes.data,
        children: childrenRes.data,
        loading: false,
      })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  setFamily: (family) => set({ family }),
  setMembers: (members) => set({ members }),
  setChildren: (children) => set({ children }),

  addChild: (child) => set((state) => ({ children: [...state.children, child] })),

  updateChild: (childId, updates) =>
    set((state) => ({
      children: state.children.map((c) => c.id === childId ? { ...c, ...updates } : c),
    })),

  removeChild: (childId) =>
    set((state) => ({ children: state.children.filter((c) => c.id !== childId) })),

  addMember: (member) => set((state) => ({ members: [...state.members, member] })),

  updateMember: (memberId, updates) =>
    set((state) => ({
      members: state.members.map((m) => m.id === memberId ? { ...m, ...updates } : m),
    })),

  reset: () => set({ family: null, members: [], children: [], loading: false, error: null }),
}))