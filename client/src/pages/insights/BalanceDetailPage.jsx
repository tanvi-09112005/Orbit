import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, endOfWeek, addDays, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import Card from '../../components/ui/Card'
import ProgressBar from '../../components/ui/ProgressBar'
import Skeleton from '../../components/ui/Skeleton'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const MEMBER_COLORS = ['#2D1B8E', '#0F6E56', '#C05621', '#6B21A8', '#0E7490']

export default function BalanceDetailPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { family, members } = useFamilyStore()
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM')}`

  // Only real joined members
  const activeMembers = members.filter((m) => m.user_id && m.joined_at)
  const myMember = activeMembers.find((m) => m.user_id === user?.id)
  const hasPartner = activeMembers.some((m) => m.user_id !== user?.id && m.role === 'parent')

  // ── Current week tasks ───────────────────────────────────────────
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'balance', family?.id, weekOffset],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('family_id', family.id)
        .eq('status', 'done')
        .gte('due_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('due_date', format(weekEnd, 'yyyy-MM-dd'))
      if (error) throw error
      return data
    },
  })

  const total = tasks.length

  // Per-member breakdown for selected week
  const memberBreakdown = activeMembers.map((m, i) => {
    const count = tasks.filter((t) => t.assigned_to === m.id).length
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    const name = m.profiles?.name || (m.user_id === user?.id ? 'You' : 'Member')
    return { m, count, pct, name, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }
  })

  // ── 8-week history chart ─────────────────────────────────────────
  const { data: historyData = [] } = useQuery({
    queryKey: ['tasks', 'balance-history', family?.id, activeMembers.map((m) => m.id).join(',')],
    enabled: !!family?.id && activeMembers.length > 0,
    queryFn: async () => {
      const weeks = []
      for (let i = 7; i >= 0; i--) {
        const wStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
        const wEnd = endOfWeek(wStart, { weekStartsOn: 1 })
        const { data } = await supabase
          .from('tasks')
          .select('assigned_to')
          .eq('family_id', family.id)
          .eq('status', 'done')
          .gte('due_date', format(wStart, 'yyyy-MM-dd'))
          .lte('due_date', format(wEnd, 'yyyy-MM-dd'))

        const weekTotal = data?.length || 0
        const entry = { week: format(wStart, 'd MMM') }

        activeMembers.forEach((m) => {
          const name = m.profiles?.name || (m.user_id === user?.id ? 'You' : 'Member')
          const count = data?.filter((t) => t.assigned_to === m.id).length || 0
          entry[name] = weekTotal > 0 ? Math.round((count / weekTotal) * 100) : 0
        })

        weeks.push(entry)
      }
      return weeks
    },
  })

  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary">Family Balance</h1>
      </div>

      {/* No partner state */}
      {!hasPartner && (
        <Card className="bg-primary-light">
          <p className="text-body text-primary">
            Invite your partner to see balance tracking between both of you.
          </p>
        </Card>
      )}

      {/* Week selector */}
      {hasPartner && (
        <>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              disabled={weekOffset <= -7}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-body font-semibold">{weekLabel}</span>
            <button
              onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
              disabled={weekOffset >= 0}
              className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Balance breakdown */}
          {isLoading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : total === 0 ? (
            <Card className="text-center py-6">
              <p className="text-body text-text-secondary">No completed tasks this week</p>
            </Card>
          ) : (
            <Card className="space-y-4">
              {/* Big percentages */}
              <div className="flex gap-6 justify-center flex-wrap">
                {memberBreakdown.map(({ m, pct, name, color }) => (
                  <div key={m.id} className="text-center">
                    <p className="text-display font-serif" style={{ color }}>{pct}%</p>
                    <p className="text-caption text-text-secondary">{name}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-body text-text-secondary">
                of tasks handled · {total} total
              </p>

              {/* Progress bars per member */}
              <div className="space-y-3 pt-2 border-t border-border">
                {memberBreakdown.map(({ m, pct, name, count, color }) => (
                  <div key={m.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-caption font-semibold">{name}</span>
                      <span className="text-caption text-text-secondary">{count} tasks · {pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={color} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 8-week history chart */}
          {historyData.length > 0 && activeMembers.length > 0 && (
            <Card>
              <p className="text-body font-semibold mb-4">8-week history</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={historyData}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend />
                  {activeMembers.map((m, i) => {
                    const name = m.profiles?.name || (m.user_id === user?.id ? 'You' : 'Member')
                    return (
                      <Line
                        key={m.id}
                        type="monotone"
                        dataKey={name}
                        stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  )
}