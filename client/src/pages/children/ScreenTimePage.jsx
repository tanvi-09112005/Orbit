import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek, addDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ScreenTimePage() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { children } = useFamilyStore()
  const child = children.find((c) => c.id === childId)
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })
  const weekDates = DAYS.map((_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))
  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(addDays(weekStart, 6), 'd MMM')}`

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['screentime', childId, weekOffset],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screen_time_logs')
        .select('*')
        .eq('child_id', childId)
        .in('date', weekDates)
      if (error) throw error
      return data
    },
  })

  const upsertLog = useMutation({
    mutationFn: async ({ date, hours }) => {
      const existing = logs.find((l) => l.date === date)
      if (existing) {
        const { error } = await supabase
          .from('screen_time_logs')
          .update({ hours_manual: hours })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('screen_time_logs')
          .insert([{ child_id: childId, logged_by: user.id, date, hours_manual: hours }])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screentime', childId, weekOffset] })
      queryClient.invalidateQueries({ queryKey: ['screentime', 'week', childId] })
    },
  })

  const getHours = (date) => {
    const log = logs.find((l) => l.date === date)
    return log?.hours_manual ?? ''
  }

  const total = logs.reduce((sum, l) => sum + (l.hours_manual || 0), 0)

  const chartData = DAYS.map((day, i) => ({
    day,
    hours: logs.find((l) => l.date === weekDates[i])?.hours_manual || 0,
  }))

  return (
    <div className="space-y-4 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/children/${childId}`)} className="p-1" aria-label="Back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary">
          {child?.name ? `${child.name}'s Screen Time` : 'Screen Time'}
        </h1>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          disabled={weekOffset <= -4}
          className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
          aria-label="Previous week"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-body font-semibold">{weekLabel}</span>
        <button
          onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
          disabled={weekOffset >= 0}
          className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
          aria-label="Next week"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Total */}
      <Card>
        <p className="text-caption text-text-secondary mb-1">Week total</p>
        <p className="text-display text-teal font-serif">{total.toFixed(1)}h</p>
      </Card>

      {/* Bar chart */}
      {total > 0 && (
        <Card>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}h`} />
              <Bar dataKey="hours" fill="#2D1B8E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Daily log */}
      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <div className="space-y-3">
          <h3 className="text-h3 font-semibold">Daily log</h3>
          {DAYS.map((day, i) => (
            <div key={day} className="flex items-center justify-between gap-4">
              <span className="text-body font-medium w-10">{day}</span>
              <span className="text-caption text-text-secondary flex-1">
                {format(addDays(weekStart, i), 'd MMM')}
              </span>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                placeholder="0"
                value={getHours(weekDates[i])}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val) && val >= 0) {
                    upsertLog.mutate({ date: weekDates[i], hours: val })
                  }
                }}
                className="w-16 border border-border rounded-lg px-2 py-1.5 text-body text-center focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
              <span className="text-caption text-text-secondary">hrs</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-caption text-text-secondary text-center">
        Log screen time manually, or check your device's built-in screen time settings.
      </p>
    </div>
  )
}