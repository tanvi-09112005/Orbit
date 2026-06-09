import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useFamilyStore } from '../../stores/familyStore'
import Avatar from '../../components/ui/Avatar'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const MOOD_LABEL = { 1: 'Stressed', 2: 'Fine', 3: 'Great' }

export default function ChildTrendPage() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const { children } = useFamilyStore()
  const child = children.find((c) => c.id === childId)

  const { data: moodLogs = [], isLoading: moodLoading } = useQuery({
    queryKey: ['mood', childId, 'trend'],
    enabled: !!childId,
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const { data, error } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('child_id', childId)
        .gte('logged_at', startDate.toISOString())
        .order('logged_at')
      if (error) throw error
      return data
    },
  })

  const { data: screenWeeks = [], isLoading: screenLoading } = useQuery({
    queryKey: ['screentime', childId, 'trend'],
    enabled: !!childId,
    queryFn: async () => {
      const weeks = []
      for (let i = 3; i >= 0; i--) {
        const wStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
        const wEnd = endOfWeek(wStart, { weekStartsOn: 1 })
        const { data } = await supabase
          .from('screen_time_logs')
          .select('hours_manual')
          .eq('child_id', childId)
          .gte('date', format(wStart, 'yyyy-MM-dd'))
          .lte('date', format(wEnd, 'yyyy-MM-dd'))
        const total = data?.reduce((sum, r) => sum + (r.hours_manual || 0), 0) || 0
        weeks.push({ week: format(wStart, 'd MMM'), hours: total })
      }
      return weeks
    },
  })

  const moodChartData = moodLogs.map((log) => ({
    date: format(new Date(log.logged_at), 'd MMM'),
    mood: log.mood,
  }))

  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <Avatar name={child?.name || 'Child'} size="md" />
        <h1 className="text-h1 text-primary">{child?.name || 'Child'}</h1>
      </div>

      {/* Mood chart */}
      <Card>
        <p className="text-body font-semibold mb-4">30-day mood</p>
        {moodLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : moodChartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={moodChartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[1, 3]} ticks={[1, 2, 3]} tickFormatter={(v) => MOOD_LABEL[v]} tick={{ fontSize: 10 }} width={55} />
              <Tooltip formatter={(v) => MOOD_LABEL[v]} />
              <Line type="monotone" dataKey="mood" stroke="#2D1B8E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-body text-text-secondary text-center py-4">
            Not enough mood data yet
          </p>
        )}
      </Card>

      {/* Screen time chart */}
      <Card>
        <p className="text-body font-semibold mb-4">4-week screen time</p>
        {screenLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : screenWeeks.some((w) => w.hours > 0) ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={screenWeeks}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `${v}h`} />
              <Bar dataKey="hours" fill="#534AB7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-body text-text-secondary text-center py-4">
            No screen time logged yet
          </p>
        )}
      </Card>
    </div>
  )
}