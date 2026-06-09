import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { CheckSquare } from 'lucide-react'

export default function ChildTasksPage() {
  const { user } = useAuthStore()
  const { family, members } = useFamilyStore()
  const queryClient = useQueryClient()

  const myMember = members.find((m) => m.user_id === user?.id)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['child-tasks', myMember?.id],
    enabled: !!myMember?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks').select('*')
        .eq('assigned_to', myMember.id)
        .neq('status', 'done')
        .order('due_date')
      if (error) throw error
      return data
    },
  })

  const { data: doneTasks = [] } = useQuery({
    queryKey: ['child-tasks-done', myMember?.id],
    enabled: !!myMember?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks').select('*')
        .eq('assigned_to', myMember.id)
        .eq('status', 'done')
        .order('updated_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    },
  })

  const completeTask = useMutation({
    mutationFn: async (taskId) => {
      const { error } = await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-tasks', myMember?.id] })
      queryClient.invalidateQueries({ queryKey: ['child-tasks-done', myMember?.id] })
    },
  })

  return (
    <div className="space-y-5 pt-4 pb-8">
      <h1 className="text-display text-primary">Your Tasks</h1>

      {isLoading ? (
        <><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></>
      ) : tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date()
            return (
              <Card key={task.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-primary cursor-pointer flex-shrink-0"
                  onChange={() => completeTask.mutate(task.id)}
                />
                <div className="flex-1">
                  <p className="text-body font-semibold">{task.title}</p>
                  {task.due_date && (
                    <p className="text-caption text-text-secondary">Due {format(new Date(task.due_date), 'd MMM')}</p>
                  )}
                </div>
                {isOverdue && <Badge variant="coral">Overdue</Badge>}
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={CheckSquare} title="All done!" description="No tasks assigned to you right now." />
      )}

      {doneTasks.length > 0 && (
        <div className="opacity-60">
          <p className="text-caption text-text-secondary mb-2">Completed recently</p>
          <div className="space-y-2">
            {doneTasks.map((task) => (
              <Card key={task.id} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <p className="text-body line-through text-text-secondary">{task.title}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}