import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionHeader from '../components/ui/SectionHeader'
import Skeleton from '../components/ui/Skeleton'

// Colors to cycle through for each member in the balance display
const MEMBER_COLORS = ['#2D1B8E', '#0F6E56', '#C05621', '#6B21A8', '#0E7490']

export default function InsightsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { family, members, children } = useFamilyStore()

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  // Only real joined members (not pending invites with null user_id)
  const activeMembers = members.filter((m) => m.user_id && m.joined_at)
  const myMember = activeMembers.find((m) => m.user_id === user?.id)
  // All other active parents (could be 1 or more)
  const otherParents = activeMembers.filter((m) => m.user_id !== user?.id && m.role === 'parent')
  const hasPartner = otherParents.length > 0

  // ── Balance: completed tasks this week ──────────────────────────
  const { data: balanceTasks = [], isLoading: balanceLoading } = useQuery({
    queryKey: ['insights', 'balance', family?.id],
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

  const totalTasks = balanceTasks.length

  // Build per-member counts dynamically for all active members
  const memberBalances = activeMembers.map((m, i) => {
    const count = balanceTasks.filter((t) => t.assigned_to === m.id).length
    const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
    const name = m.profiles?.name || (m.user_id === user?.id ? 'You' : 'Member')
    const isMe = m.user_id === user?.id
    return { m, count, pct, name, isMe, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }
  })

  // ── Child trends ─────────────────────────────────────────────────
  const { data: childTrends = [], isLoading: trendsLoading } = useQuery({
    queryKey: ['insights', 'child-trends', family?.id],
    enabled: !!family?.id && children.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        children.map(async (child) => {
          const twoWeeksAgo = new Date()
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
          const { data: moodLogs } = await supabase
            .from('mood_logs')
            .select('mood, logged_at')
            .eq('child_id', child.id)
            .gte('logged_at', twoWeeksAgo.toISOString())
            .order('logged_at', { ascending: false })

          const recent = (moodLogs || []).slice(0, 7)
          const older = (moodLogs || []).slice(7, 14)
          let trend = 'Stable'
          if (recent.length >= 2 && older.length >= 2) {
            const recentAvg = recent.reduce((a, b) => a + b.mood, 0) / recent.length
            const olderAvg = older.reduce((a, b) => a + b.mood, 0) / older.length
            const delta = recentAvg - olderAvg
            if (delta > 0.3) trend = 'Improving'
            else if (delta < -0.3) trend = 'Declining'
          }

          const lastWeekStart = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')
          const lastWeekEnd = format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')
          const thisWeekStart = format(weekStart, 'yyyy-MM-dd')
          const thisWeekEnd = format(weekEnd, 'yyyy-MM-dd')

          const [{ data: thisWeekScreen }, { data: lastWeekScreen }] = await Promise.all([
            supabase.from('screen_time_logs').select('hours_manual').eq('child_id', child.id)
              .gte('date', thisWeekStart).lte('date', thisWeekEnd),
            supabase.from('screen_time_logs').select('hours_manual').eq('child_id', child.id)
              .gte('date', lastWeekStart).lte('date', lastWeekEnd),
          ])

          const thisWeekTotal = (thisWeekScreen || []).reduce((s, r) => s + (r.hours_manual || 0), 0)
          const lastWeekTotal = (lastWeekScreen || []).reduce((s, r) => s + (r.hours_manual || 0), 0)
          const screenDelta = thisWeekTotal - lastWeekTotal
          const deltaStr = screenDelta === 0
            ? 'No change in screen time'
            : `${screenDelta > 0 ? '+' : ''}${screenDelta.toFixed(1)}h screen time vs last week`

          return { child, trend, deltaStr }
        })
      )
      return results
    },
  })

  // ── Alerts ───────────────────────────────────────────────────────
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['insights', 'alerts', family?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const items = []
      const todayStr = format(today, 'yyyy-MM-dd')

      // Overdue tasks
      const { data: overdue } = await supabase
        .from('tasks').select('title, assigned_to')
        .eq('family_id', family.id).neq('status', 'done')
        .lt('due_date', todayStr)
      overdue?.forEach((t) => {
        const who = members.find((m) => m.id === t.assigned_to)?.profiles?.name
        items.push({
          id: `overdue-${t.title}`,
          title: `Overdue: ${t.title}`,
          description: who ? `Assigned to ${who}` : 'Unassigned',
          urgent: true,
        })
      })

      // Homework due today
      if (children.length > 0) {
        const childIds = children.map((c) => c.id)
        const { data: hwDue } = await supabase
          .from('homework').select('subject, description, child_id')
          .in('child_id', childIds).eq('done', false).eq('due_date', todayStr)
        hwDue?.forEach((h) => {
          const child = children.find((c) => c.id === h.child_id)
          items.push({
            id: `hw-${h.child_id}-${h.subject}`,
            title: `Homework due today: ${h.subject}`,
            description: child ? `${child.name} — ${h.description}` : h.description,
            urgent: false,
          })
        })

        // Declining mood: 3+ consecutive stressed logs
        for (const child of children) {
          const { data: recentMood } = await supabase
            .from('mood_logs').select('mood')
            .eq('child_id', child.id)
            .order('logged_at', { ascending: false }).limit(3)
          if (recentMood?.length === 3 && recentMood.every((l) => l.mood === 1)) {
            items.push({
              id: `mood-${child.id}`,
              title: `${child.name}'s mood has been low`,
              description: '3 consecutive stressed check-ins',
              urgent: true,
            })
          }
        }
      }

      return items
    },
  })

  const getTrendIcon = (trend) => {
    if (trend === 'Improving') return <TrendingUp size={14} className="text-teal" />
    if (trend === 'Declining') return <TrendingDown size={14} className="text-coral" />
    return <Minus size={14} className="text-amber" />
  }

  const getTrendVariant = (trend) => {
    if (trend === 'Improving') return 'teal'
    if (trend === 'Declining') return 'coral'
    return 'gray'
  }

  return (
    <div className="space-y-6 pt-4 pb-8">
      <h1 className="text-display text-primary">Insights</h1>

      {/* ALERTS */}
      {alertsLoading ? (
        <Skeleton className="h-16 rounded-2xl" />
      ) : alerts.length > 0 ? (
        <section className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-l-4 ${alert.urgent ? 'border-coral bg-coral-light' : 'border-amber bg-amber-light'}`}
            >
              <p className="text-body font-semibold">{alert.title}</p>
              <p className="text-caption text-text-secondary">{alert.description}</p>
            </Card>
          ))}
        </section>
      ) : (
        <Card className="bg-teal-light border border-teal">
          <p className="text-body text-teal font-semibold">All good — nothing needs attention right now</p>
        </Card>
      )}

      {/* FAMILY BALANCE */}
      <section>
        <SectionHeader
          title="Family Balance"
          action={
            <button
              onClick={() => navigate('/insights/balance')}
              className="text-primary text-body font-semibold hover:underline"
            >
              Full breakdown
            </button>
          }
        />
        <div className="mt-4">
          {balanceLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : !hasPartner ? (
            <Card className="bg-primary-light">
              <p className="text-body text-primary">
                Invite your partner to see balance tracking between both of you.
              </p>
            </Card>
          ) : totalTasks === 0 ? (
            <Card className="text-center py-4">
              <p className="text-body text-text-secondary">No completed tasks this week yet</p>
            </Card>
          ) : (
            <Card className="space-y-3">
              <div className="flex gap-6 justify-center flex-wrap">
                {memberBalances.map(({ m, pct, name, color }) => (
                  <div key={m.id} className="text-center">
                    <p className="text-display font-serif" style={{ color }}>{pct}%</p>
                    <p className="text-caption text-text-secondary">{name}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-caption text-text-secondary">
                of tasks handled this week · {totalTasks} total
              </p>
            </Card>
          )}
        </div>
      </section>

      {/* CHILD TRENDS */}
      {children.length > 0 && (
        <section>
          <SectionHeader title="Child Trends" />
          <div className="mt-4 space-y-2">
            {trendsLoading ? (
              <><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-16 rounded-2xl" /></>
            ) : childTrends.length === 0 ? (
              <Card>
                <p className="text-body text-text-secondary text-center">No mood data yet</p>
              </Card>
            ) : (
              childTrends.map(({ child, trend, deltaStr }) => (
                <Card
                  key={child.id}
                  className="flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/insights/child/${child.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ backgroundColor: child.color_hex || '#6B7280' }}
                    >
                      {child.name[0]}
                    </div>
                    <div>
                      <p className="text-body font-semibold">{child.name}</p>
                      <p className="text-caption text-text-secondary">{deltaStr}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getTrendVariant(trend)} className="flex items-center gap-1">
                      {getTrendIcon(trend)}
                      <span className="ml-1">{trend}</span>
                    </Badge>
                    <ChevronRight size={20} className="text-text-secondary" />
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}