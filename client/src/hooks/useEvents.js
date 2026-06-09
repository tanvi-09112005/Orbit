import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const fetchEvents = async (familyId, filters = {}) => {
  // TODO: Replace with Supabase query
  // const { from, to, childId } = filters
  // return supabase
  //   .from('events')
  //   .select('*')
  //   .eq('family_id', familyId)
  //   .gte('start_at', from)
  //   .lte('start_at', to)
  return []
}

const fetchEvent = async (eventId) => {
  // TODO: Replace with Supabase query
  return null
}

const createEvent = async (eventData) => {
  // TODO: Replace with Supabase mutation
  return { id: '1', ...eventData }
}

const updateEvent = async (eventId, updates) => {
  // TODO: Replace with Supabase mutation
  return { id: eventId, ...updates }
}

const deleteEvent = async (eventId) => {
  // TODO: Replace with Supabase mutation
  return eventId
}

export function useEvents(familyId, filters) {
  return useQuery({
    queryKey: ['events', familyId, filters],
    queryFn: () => fetchEvents(familyId, filters),
    enabled: !!familyId,
  })
}

export function useEvent(eventId) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: !!eventId,
  })
}

export function useAddEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, updates }) => updateEvent(eventId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
