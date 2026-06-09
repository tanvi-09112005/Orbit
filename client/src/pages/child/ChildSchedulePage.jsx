import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, startOfDay, endOfDay, addDays, isToday } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { Calendar } from 'lucide-react'

export default function ChildSchedulePage() {
  const { user } = useAuthStore()
  const { family, members, children } = useFamilyStore()
  const today = new Date()

  // Find which child profile this user is
  const myMember = members.find((m) => m.user_id === user?.id)
  // child_id stored on member or we look up by user_id in children
  const myChild = children.find((c) => c.user_id === user?.id) || children[0]

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['child-schedule', family?.id, myChild?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events').select('*').eq('family_id', family.id)
        .contains('child_ids', myChild?.id ? [myChild.id] : [])
        .gte('start_at', startOfDay(today).toISOString())
        .lte('start_at', endOfDay(addDays(today, 13)).toISOString())
        .order('start_at')
      if (error) throw error
      return data
    },
  })

  const { data: weekEvents = [] } = useQuery({
    queryKey: ['child-week-events', family?.id, myChild?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('events').select('start_at').eq('family_id', family.id)
        .contains('child_ids', myChild?.id ? [myChild.id] : [])
        .gte('start_at', startOfDay(today).toISOString())
        .lte('start_at', endOfDay(addDays(today, 6)).toISOString())
      return data || []
    },
  })

  return (
    <div className="space-y-5 pt-4 pb-8">
      <h1 className="text-display text-primary">Your Schedule</h1>

      {/* Week strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
        {Array.from({ length: 7 }).map((_, i) => {
          const date = addDays(today, i)
          const isCurrentDay = isToday(date)
          const hasEvents = weekEvents.some(
            (e) => format(new Date(e.start_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
          )
          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl flex-shrink-0 min-w-[48px] ${
                isCurrentDay ? 'bg-primary text-white' : 'bg-muted'
              }`}
            >
              <span className={`text-xs font-semibold ${isCurrentDay ? 'text-white' : 'text-text-secondary'}`}>{format(date, 'EEE')}</span>
              <span className={`text-body font-semibold ${isCurrentDay ? 'text-white' : 'text-foreground'}`}>{format(date, 'd')}</span>
              {hasEvents && <span className={`w-1.5 h-1.5 rounded-full ${isCurrentDay ? 'bg-white' : 'bg-primary'}`} />}
            </div>
          )
        })}
      </div>

      {/* Events list */}
      {isLoading ? (
        <><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></>
      ) : events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id}>
              <div className="flex items-center gap-2 mb-0.5">
                {isToday(new Date(event.start_at)) && (
                  <span className="text-caption font-semibold text-white bg-coral px-2 py-0.5 rounded-full">Today</span>
                )}
                <p className="text-body font-semibold">{event.title}</p>
              </div>
              <p className="text-caption text-text-secondary">
                {format(new Date(event.start_at), 'EEE, d MMM • h:mm a')}
                {event.end_at && ` – ${format(new Date(event.end_at), 'h:mm a')}`}
              </p>
              {event.notes && <p className="text-caption text-text-secondary mt-1">{event.notes}</p>}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Calendar} title="Nothing coming up" description="No events in the next two weeks." />
      )}
    </div>
  )
}