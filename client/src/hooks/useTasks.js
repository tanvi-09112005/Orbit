import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const fetchTasks = async (familyId) => {
  // TODO: Replace with Supabase query
  return []
}

const createTask = async (taskData) => {
  // TODO: Replace with Supabase mutation
  return { id: '1', ...taskData }
}

const updateTask = async (taskId, updates) => {
  // TODO: Replace with Supabase mutation
  return { id: taskId, ...updates }
}

const deleteTask = async (taskId) => {
  // TODO: Replace with Supabase mutation
  return taskId
}

export function useTasks(familyId) {
  return useQuery({
    queryKey: ['tasks', familyId],
    queryFn: () => fetchTasks(familyId),
    enabled: !!familyId,
  })
}

export function useAddTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, updates }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
