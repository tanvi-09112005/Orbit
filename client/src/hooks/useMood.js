import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const fetchMoodLogs = async (childId, days = 30) => {
  // TODO: Replace with Supabase query
  return []
}

const addMoodLog = async (childId, moodData) => {
  // TODO: Replace with Supabase mutation
  return { id: '1', ...moodData }
}

export function useMoodLogs(childId, days) {
  return useQuery({
    queryKey: ['mood_logs', childId, days],
    queryFn: () => fetchMoodLogs(childId, days),
    enabled: !!childId,
  })
}

export function useAddMoodLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ childId, moodData }) => addMoodLog(childId, moodData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood_logs'] })
    },
  })
}
