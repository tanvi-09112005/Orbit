import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from 'date-fns'
import { Plus, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useFamilyStore } from '../stores/familyStore'
import { usePermissions } from '../layouts/AppLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'

export default function CalendarPage() {
  const navigate = useNavigate()
  const { family, children } = useFamilyStore()
  const { role } = usePermissions()
  const canAddEvents = role === 'parent'

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState('month') // 'month' | 'list'
  const [selectedDay, setSelectedDay] = useState(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', 'calendar', family?.id, format(currentMonth, 'yyyy-MM')],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('family_id', family.id)
        .gte('start_at', startOfWeek(monthStart, { weekStartsOn: 1 }).toISOString())
        .lte('start_at', endOfWeek(monthEnd, { weekStartsOn: 1 }).toISOString())
        .order('start_at')
      if (error) throw error
      return data
    },
  })

  // Detect conflicts: same responsible_member_id, overlapping times
  const conflictIds = useMemo(() => {
    const ids = new Set()
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i], b = events[j]
        if (!a.responsible_member_id || a.responsible_member_id !== b.responsible_member_id) continue
        const aStart = new Date(a.start_at), aEnd = a.end_at ? new Date(a.end_at) : new Date(aStart.getTime() + 3600000)
        const bStart = new Date(b.start_at), bEnd = b.end_at ? new Date(b.end_at) : new Date(bStart.getTime() + 3600000)
        if (aStart < bEnd && aEnd > bStart) { ids.add(a.id); ids.add(b.id) }
      }
    }
    return ids
  }, [events])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days = []
    let day = startOfWeek(monthStart, { weekStartsOn: 1 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 })
    while (day <= end) { days.push(day); day = addDays(day, 1) }
    return days
  }, [currentMonth])

  const getEventsForDay = (day) =>
    events.filter((e) => isSameDay(new Date(e.start_at), day))

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="space-y-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))} className="p-2 rounded-lg hover:bg-muted" aria-label="Previous month">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-h2 font-semibold text-primary min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))} className="p-2 rounded-lg hover:bg-muted" aria-label="Next month">
            <ChevronRight size={20} />
          </button>
        </div>
        <button
          onClick={() => setView(v => v === 'month' ? 'list' : 'month')}
          className="p-2 rounded-lg hover:bg-muted text-text-secondary"
          aria-label="Toggle view"
        >
          <List size={20} />
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : view === 'month' ? (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-caption text-text-secondary py-1 font-medium">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-2xl overflow-hidden">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isCurrentDay = isToday(day)
              const isSelected = selectedDay && isSameDay(day, selectedDay)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                  className={`bg-white p-1.5 min-h-[56px] flex flex-col items-center gap-0.5 transition-colors ${
                    isSelected ? 'bg-primary-light' : 'hover:bg-muted'
                  } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isCurrentDay ? 'bg-primary text-white' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {/* Event dots */}
                  <div className="flex flex-wrap gap-0.5 justify-center max-w-full">
                    {dayEvents.slice(0, 3).map((e) => {
                      const child = children.find((c) => c.id === e.child_ids?.[0])
                      const hasConflict = conflictIds.has(e.id)
                      return (
                        <span
                          key={e.id}
                          className={`w-1.5 h-1.5 rounded-full ${hasConflict ? 'bg-coral' : ''}`}
                          style={!hasConflict ? { backgroundColor: child?.color_hex || '#534AB7' } : {}}
                        />
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-text-secondary">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected day events */}
          {selectedDay && (
            <div className="space-y-2">
              <h3 className="text-h3 font-semibold text-primary">
                {format(selectedDay, 'EEEE, d MMMM')}
              </h3>
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event) => {
                  const child = children.find((c) => c.id === event.child_ids?.[0])
                  const hasConflict = conflictIds.has(event.id)
                  return (
                    <Card
                      key={event.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${hasConflict ? 'border-coral border-2' : ''}`}
                      onClick={() => navigate(`/family/events/${event.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            {hasConflict && <span className="text-caption text-coral font-medium">⚠ Conflict</span>}
                            <p className="text-body font-semibold">{event.title}</p>
                          </div>
                          <p className="text-caption text-text-secondary">
                            {format(new Date(event.start_at), 'h:mm a')}
                            {event.end_at && ` – ${format(new Date(event.end_at), 'h:mm a')}`}
                          </p>
                        </div>
                        {child && (
                          <span className="text-caption font-medium px-2 py-1 rounded-full text-white flex-shrink-0" style={{ backgroundColor: child.color_hex }}>
                            {child.name}
                          </span>
                        )}
                      </div>
                    </Card>
                  )
                })
              ) : (
                <p className="text-body text-text-secondary">No events this day</p>
              )}
            </div>
          )}
        </>
      ) : (
        /* List view */
        <div className="space-y-2">
          {events.length > 0 ? (
            events.map((event) => {
              const child = children.find((c) => c.id === event.child_ids?.[0])
              const hasConflict = conflictIds.has(event.id)
              return (
                <Card
                  key={event.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${hasConflict ? 'border-coral border-2' : ''}`}
                  onClick={() => navigate(`/family/events/${event.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        {hasConflict && <span className="text-caption text-coral font-medium">⚠ Conflict</span>}
                        <p className="text-body font-semibold">{event.title}</p>
                      </div>
                      <p className="text-caption text-text-secondary">
                        {format(new Date(event.start_at), 'EEE, d MMM • h:mm a')}
                      </p>
                    </div>
                    {child && (
                      <span className="text-caption font-medium px-2 py-1 rounded-full text-white flex-shrink-0" style={{ backgroundColor: child.color_hex }}>
                        {child.name}
                      </span>
                    )}
                  </div>
                </Card>
              )
            })
          ) : (
            <p className="text-body text-text-secondary">No events this month</p>
          )}
        </div>
      )}

      {canAddEvents && (
        <Button className="w-full" onClick={() => navigate('/family/events/new')}>
          <Plus size={18} /> Add Event
        </Button>
      )}
    </div>
  )
}