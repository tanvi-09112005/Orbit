import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { Dumbbell } from 'lucide-react'

export default function ChildActivitiesPage() {
  const { user } = useAuthStore()
  const { members, children } = useFamilyStore()

  const myChild = children.find((c) => c.user_id === user?.id) || children[0]

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['child-activities', myChild?.id],
    enabled: !!myChild?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities').select('*')
        .eq('child_id', myChild.id)
        .order('name')
      if (error) throw error
      return data
    },
  })

  return (
    <div className="space-y-5 pt-4 pb-8">
      <h1 className="text-display text-primary">Your Activities</h1>

      {isLoading ? (
        <><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></>
      ) : activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity) => {
            const responsible = members.find((m) => m.id === activity.responsible_member_id)
            return (
              <Card key={activity.id}>
                <p className="text-body font-semibold">{activity.name}</p>
                {activity.schedule?.description && (
                  <p className="text-caption text-text-secondary mt-0.5">{activity.schedule.description}</p>
                )}
                {activity.location && (
                  <p className="text-caption text-text-secondary">{activity.location}</p>
                )}
                {responsible && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Avatar name={responsible.profiles?.name || 'Parent'} size="sm" />
                    <p className="text-caption text-text-secondary">{responsible.profiles?.name || 'Parent'} is responsible</p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={Dumbbell} title="No activities yet" description="Your parents will add your activities here." />
      )}
    </div>
  )
}