import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFamilyStore } from '../stores/familyStore'

// Mock data fetcher - replace with Supabase calls
const fetchFamily = async (familyId) => {
  // TODO: Replace with supabase.from('families').select().eq('id', familyId)
  return {
    id: familyId,
    name: 'The Smith Family',
    owner_id: '1',
    created_at: new Date(),
  }
}

const fetchMembers = async (familyId) => {
  // TODO: Replace with supabase call
  return [
    { id: '1', name: 'Priya', role: 'Parent', email: 'priya@example.com' },
    { id: '2', name: 'Raj', role: 'Parent', email: 'raj@example.com' },
  ]
}

const fetchChildren = async (familyId) => {
  // TODO: Replace with supabase call
  return [
    { id: '1', name: 'Emma', age: 8, school: 'Lincoln Elementary', color_hex: '#2D1B8E' },
    { id: '2', name: 'Liam', age: 6, school: 'Lincoln Elementary', color_hex: '#0F6E56' },
  ]
}

export function useFamily(familyId) {
  const { setFamily } = useFamilyStore()

  return useQuery({
    queryKey: ['family', familyId],
    queryFn: () => fetchFamily(familyId),
    onSuccess: setFamily,
    enabled: !!familyId,
  })
}

export function useMembers(familyId) {
  const { setMembers } = useFamilyStore()

  return useQuery({
    queryKey: ['members', familyId],
    queryFn: () => fetchMembers(familyId),
    onSuccess: setMembers,
    enabled: !!familyId,
  })
}

export function useChildren(familyId) {
  const { setChildren } = useFamilyStore()

  return useQuery({
    queryKey: ['children', familyId],
    queryFn: () => fetchChildren(familyId),
    onSuccess: setChildren,
    enabled: !!familyId,
  })
}

export function useAddFamily() {
  const queryClient = useQueryClient()
  const { setFamily } = useFamilyStore()

  return useMutation({
    mutationFn: async (familyData) => {
      // TODO: Replace with supabase.from('families').insert(familyData)
      return { id: '1', ...familyData }
    },
    onSuccess: (data) => {
      setFamily(data)
      queryClient.invalidateQueries({ queryKey: ['family'] })
    },
  })
}
