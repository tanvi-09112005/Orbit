import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isToday, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { Plus, CheckSquare2, Smile, Monitor, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import SectionHeader from '../components/ui/SectionHeader'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import AddTaskSheet from '../components/AddTaskSheet'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const MOOD_LABEL = { 1: 'stressed', 2: 'okay', 3: 'great' }

export default function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { family, children } = useFamilyStore()
  const [taskSheet, setTaskSheet] = useState(false)

  const userName = user?.user_metadata?.name?.split(' ')[0] || 'there'
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  const { data: todayEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'today', family?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events').select('*').eq('family_id', family.id)
        .gte('start_at', startOfDay(today).toISOString())
        .lte('start_at', endOfDay(today).toISOString())
        .order('start_at')
      if (error) throw error
      return data
    },
  })

  const { data: todayTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'today', family?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks').select('*').eq('family_id', family.id)
        .eq('due_date', format(today, 'yyyy-MM-dd'))
        .neq('status', 'done').order('due_date')
      if (error) throw error
      return data
    },
  })

  const { data: weekEvents = [] } = useQuery({
    queryKey: ['events', 'week', family?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events').select('start_at').eq('family_id', family.id)
        .gte('start_at', startOfDay(today).toISOString())
        .lte('start_at', endOfDay(addDays(today, 6)).toISOString())
      if (error) throw error
      return data
    },
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', family?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const items = []
      const { data: overdue } = await supabase
        .from('tasks').select('*').eq('family_id', family.id)
        .neq('status', 'done').lt('due_date', format(today, 'yyyy-MM-dd'))
      overdue?.forEach((t) => items.push({
        id: `task-${t.id}`, type: 'task',
        text: `Overdue: ${t.title}`, urgent: true,
      }))
      const { data: hw } = await supabase
        .from('homework').select('*, children!inner(family_id)')
        .eq('children.family_id', family.id).eq('done', false)
        .lte('due_date', format(today, 'yyyy-MM-dd'))
      hw?.forEach((h) => items.push({
        id: `hw-${h.id}`, type: 'homework',
        text: `Homework due: ${h.subject} — ${h.description}`,
        urgent: h.due_date < format(today, 'yyyy-MM-dd'),
      }))
      return items
    },
  })

  // Family Brief data — this week summary
  const { data: brief } = useQuery({
    queryKey: ['brief', family?.id],
    enabled: !!family?.id && children.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const todayStr = format(today, 'yyyy-MM-dd')
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

      const [
        { data: weekEventsData },
        { data: overdueTasks },
        { data: upcomingExams },
        { data: pendingHw },
      ] = await Promise.all([
        supabase.from('events').select('id')
          .eq('family_id', family.id)
          .gte('start_at', startOfDay(weekStart).toISOString())
          .lte('start_at', endOfDay(weekEnd).toISOString()),
        supabase.from('tasks').select('id')
          .eq('family_id', family.id)
          .neq('status', 'done')
          .lt('due_date', todayStr),
        supabase.from('exams').select('subject, exam_date, child_id')
          .in('child_id', children.map((c) => c.id))
          .gte('exam_date', todayStr)
          .lte('exam_date', weekEndStr)
          .order('exam_date'),
        supabase.from('homework').select('id')
          .in('child_id', children.map((c) => c.id))
          .eq('done', false),
      ])

      // Last mood per child
      const childMoods = await Promise.all(
        children.map(async (child) => {
          const { data } = await supabase
            .from('mood_logs').select('mood')
            .eq('child_id', child.id)
            .order('logged_at', { ascending: false })
            .limit(1).maybeSingle()
          return { child, mood: data?.mood || null }
        })
      )

      const lines = []

      const eventCount = weekEventsData?.length || 0
      if (eventCount > 0) lines.push(`${eventCount} event${eventCount > 1 ? 's' : ''} this week`)

      const overdueCount = overdueTasks?.length || 0
      if (overdueCount > 0) lines.push(`${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}`)

      const hwCount = pendingHw?.length || 0
      if (hwCount > 0) lines.push(`${hwCount} homework item${hwCount > 1 ? 's' : ''} pending`)

      upcomingExams?.forEach((exam) => {
        const child = children.find((c) => c.id === exam.child_id)
        const examDate = new Date(exam.exam_date)
        const isThisWeek = examDate <= weekEnd
        if (isThisWeek) {
          lines.push(`${child?.name || 'Child'} has ${exam.subject} exam ${format(examDate, 'EEEE')}`)
        }
      })

      childMoods.forEach(({ child, mood }) => {
        if (mood === 1) lines.push(`${child.name} has been feeling stressed`)
        else if (mood === 3) lines.push(`${child.name} is feeling great`)
      })

      if (lines.length === 0) lines.push('Everything looks good this week')

      return lines
    },
  })

  const completeTask = useMutation({
    mutationFn: async (taskId) => {
      const { error } = await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today', family?.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', family?.id] })
      queryClient.invalidateQueries({ queryKey: ['alerts', family?.id] })
      queryClient.invalidateQueries({ queryKey: ['brief', family?.id] })
    },
  })

  const quickActions = [
    { icon: Plus,        label: 'Add Event',   action: () => navigate('/family/events/new') },
    { icon: CheckSquare2,label: 'Add Task',    action: () => setTaskSheet(true) },
    { icon: Smile,       label: 'Log Mood',    action: () => { const c = children[0]; if (c) navigate(`/children/${c.id}/wellbeing`) } },
    { icon: Monitor,     label: 'Screen Time', action: () => { const c = children[0]; if (c) navigate(`/children/${c.id}/screentime`) } },
  ]

  return (
    <>
      <div className="space-y-5 pt-4">

        {/* Greeting */}
        <div>
          <h1 className="text-display text-primary mb-1">{getGreeting()}, {userName}</h1>
          <p className="text-caption text-text-secondary">{format(today, 'EEEE, d MMMM')}</p>
        </div>

        {/* Family Brief */}
        {brief && brief.length > 0 && (
          <Card className="bg-primary-light border border-primary-mid">
            <p className="text-caption font-semibold text-primary-mid uppercase tracking-wide mb-2">
              Family Brief
            </p>
            <div className="space-y-1.5">
              {brief.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-1 flex-shrink-0">·</span>
                  <p className="text-body text-primary">{line}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Urgent Alerts */}
        {alerts.length > 0 && (
          <section>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl max-w-[260px] ${
                    alert.urgent
                      ? 'bg-coral-light border border-coral'
                      : 'bg-amber-light border border-amber'
                  }`}
                >
                  <AlertCircle
                    size={16}
                    className={alert.urgent ? 'text-coral flex-shrink-0' : 'text-amber flex-shrink-0'}
                  />
                  <p className="text-caption font-semibold text-text-primary leading-tight">{alert.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Today's Events */}
        <section>
          <SectionHeader
            title="Today"
            action={todayEvents.length > 0 && (
              <Link to="/family" className="text-primary text-body font-semibold hover:underline">
                See all
              </Link>
            )}
          />
          <div className="mt-3 space-y-2">
            {eventsLoading ? (
              <><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></>
            ) : todayEvents.length > 0 ? (
              todayEvents.slice(0, 5).map((event) => {
                const child = children.find((c) => c.id === event.child_ids?.[0])
                return (
                  <Card
                    key={event.id}
                    className="flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/family/events/${event.id}`)}
                  >
                    <div>
                      <p className="text-body font-semibold">{event.title}</p>
                      <p className="text-caption text-text-secondary">
                        {format(new Date(event.start_at), 'h:mm a')}
                        {event.end_at && ` – ${format(new Date(event.end_at), 'h:mm a')}`}
                      </p>
                    </div>
                    {child && (
                      <span
                        className="text-caption font-medium px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: child.color_hex }}
                      >
                        {child.name}
                      </span>
                    )}
                  </Card>
                )
              })
            ) : (
              <EmptyState
                icon={Clock}
                title="No events today"
                description="Your calendar is clear."
                action={
                  <Button variant="secondary" onClick={() => navigate('/family/events/new')}>
                    Add Event
                  </Button>
                }
              />
            )}
          </div>
        </section>

        {/* Tasks Due Today */}
        <section>
          <SectionHeader
            title="Due Today"
            action={todayTasks.length > 0 && (
              <Link to="/family/tasks" className="text-primary text-body font-semibold hover:underline">
                See all
              </Link>
            )}
          />
          <div className="mt-3 space-y-2">
            {tasksLoading ? (
              <Skeleton className="h-14 rounded-2xl" />
            ) : todayTasks.length > 0 ? (
              todayTasks.slice(0, 3).map((task) => (
                <Card key={task.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-primary cursor-pointer flex-shrink-0"
                    onChange={() => completeTask.mutate(task.id)}
                  />
                  <div className="flex-1">
                    <p className="text-body font-semibold">{task.title}</p>
                    {task.notes && (
                      <p className="text-caption text-text-secondary">{task.notes}</p>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-body text-text-secondary">No tasks due today</p>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary-light hover:bg-opacity-80 transition-colors active:bg-opacity-70 min-h-[44px]"
                >
                  <Icon size={24} className="text-primary" />
                  <span className="text-xs text-center text-primary font-semibold leading-tight">
                    {action.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* This Week */}
        <section className="pb-4">
          <SectionHeader title="This Week" />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const date = addDays(today, i)
              const isCurrentDay = isToday(date)
              const hasEvents = weekEvents.some(
                (e) => format(new Date(e.start_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
              )
              return (
                <button
                  key={i}
                  onClick={() => navigate('/family')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors flex-shrink-0 min-w-[48px] ${
                    isCurrentDay ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/70'
                  }`}
                >
                  <span className={`text-xs font-semibold ${isCurrentDay ? 'text-white' : 'text-text-secondary'}`}>
                    {format(date, 'EEE')}
                  </span>
                  <span className={`text-body font-semibold ${isCurrentDay ? 'text-white' : 'text-foreground'}`}>
                    {format(date, 'd')}
                  </span>
                  {hasEvents && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isCurrentDay ? 'bg-white' : 'bg-primary'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <AddTaskSheet open={taskSheet} onClose={() => setTaskSheet(false)} />
    </>
  )
}
