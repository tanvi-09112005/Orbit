import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import TabBar from '../components/TabBar'
import FloatingActionMenu from '../components/FloatingActionMenu'
import ChildTabBar from '../components/ChildTabBar'
import VoiceAgent from '../components/VoiceAgent'
import { useEffect, createContext, useContext, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFamilyStore } from '../stores/familyStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { Bell, X } from 'lucide-react'
import Card from '../components/ui/Card'

export const PermissionContext = createContext({ role: 'parent', permissions: {}, isOwner: false })
export const usePermissions = () => useContext(PermissionContext)

const PARENT_ONLY_PREFIXES = ['/family', '/insights', '/profile', '/children', '/calendar', '/memories']

function isRouteBlocked(pathname, permissions) {
  const checks = [
    { key: 'view_insights',    pattern: /^\/insights/ },
    { key: 'view_mood',        pattern: /^\/children\/[^/]+\/wellbeing/ },
    { key: 'view_screen_time', pattern: /^\/children\/[^/]+\/screentime/ },
  ]
  for (const { key, pattern } of checks) {
    if (pattern.test(pathname) && !permissions[key]) return true
  }
  return false
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { fetchFamily, family, members, children } = useFamilyStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    if (user && !family) fetchFamily()
  }, [user])

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const myMember = members.find((m) => m.user_id === user?.id)
  const role = myMember?.role || 'parent'
  const permissions = myMember?.permissions || {}
  const isOwner = family?.owner_id === user?.id
  const isChild = role === 'child'
  const isGuardian = role === 'guardian'

  // Fetch real notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', family?.id],
    enabled: !!family?.id && !isChild,
    refetchInterval: 60000, // refresh every minute
    queryFn: async () => {
      const items = []
      const todayStr = format(new Date(), 'yyyy-MM-dd')

      // Overdue tasks
      const { data: overdue } = await supabase
        .from('tasks').select('title, assigned_to')
        .eq('family_id', family.id)
        .neq('status', 'done')
        .lt('due_date', todayStr)
        .limit(5)
      overdue?.forEach((t) => {
        const who = members.find((m) => m.id === t.assigned_to)?.profiles?.name
        items.push({
          id: `overdue-${t.title}`,
          text: `Overdue: ${t.title}`,
          sub: who ? `Assigned to ${who}` : 'Unassigned',
          urgent: true,
        })
      })

      // Homework due today
      if (children.length > 0) {
        const childIds = children.map((c) => c.id)
        const { data: hwDue } = await supabase
          .from('homework').select('subject, child_id')
          .in('child_id', childIds)
          .eq('done', false)
          .eq('due_date', todayStr)
          .limit(5)
        hwDue?.forEach((h) => {
          const child = children.find((c) => c.id === h.child_id)
          items.push({
            id: `hw-${h.child_id}-${h.subject}`,
            text: `Homework due today: ${h.subject}`,
            sub: child?.name || '',
            urgent: false,
          })
        })

        // Declining mood
        for (const child of children.slice(0, 3)) {
          const { data: recentMood } = await supabase
            .from('mood_logs').select('mood')
            .eq('child_id', child.id)
            .order('logged_at', { ascending: false })
            .limit(3)
          if (recentMood?.length === 3 && recentMood.every((l) => l.mood === 1)) {
            items.push({
              id: `mood-${child.id}`,
              text: `${child.name}'s mood has been low`,
              sub: '3 consecutive stressed check-ins',
              urgent: true,
            })
          }
        }
      }

      return items
    },
  })

  const unreadCount = notifications.length

  useEffect(() => {
    if (!isChild) return
    const isParentRoute = PARENT_ONLY_PREFIXES.some((r) => location.pathname.startsWith(r))
    if (isParentRoute) navigate('/child/schedule', { replace: true })
  }, [isChild, location.pathname])

  useEffect(() => {
    if (!isGuardian) return
    if (isRouteBlocked(location.pathname, permissions)) navigate('/home', { replace: true })
    if (location.pathname.startsWith('/profile/family-settings')) navigate('/profile', { replace: true })
  }, [isGuardian, location.pathname, permissions])

  const blocked = isGuardian && isRouteBlocked(location.pathname, permissions)

  return (
    <PermissionContext.Provider value={{ role, permissions, isOwner, myMember }}>
      <div className="flex flex-col h-screen bg-background">

        {/* Header */}
       <header className="sticky top-0 z-10 bg-white border-b border-border px-5 py-4 flex items-center justify-between">
  <h1 className="text-h2 text-primary font-serif">
    {isChild ? 'My Space' : 'Orbit'}
  </h1>
  {!isChild && (
    <div className="flex items-center gap-2">
      {/* Notification bell */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen((v) => !v)}
          className="relative p-2 text-text-secondary hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-coral rounded-full flex items-center justify-center">
              <span className="text-[9px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>

        {/* Notification dropdown */}
        {notifOpen && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-body font-semibold">Notifications</p>
              <button onClick={() => setNotifOpen(false)} className="text-text-secondary hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-border last:border-0 ${n.urgent ? 'bg-coral-light' : 'bg-white'}`}
                  >
                    <p className={`text-body font-semibold ${n.urgent ? 'text-coral' : 'text-foreground'}`}>
                      {n.text}
                    </p>
                    {n.sub && <p className="text-caption text-text-secondary mt-0.5">{n.sub}</p>}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-body text-text-secondary">All clear — nothing needs attention</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Avatar → Profile */}
      <button
        onClick={() => navigate('/profile')}
        className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        aria-label="Profile"
      >
        {(user?.user_metadata?.name || 'U')[0].toUpperCase()}
      </button>
    </div>
  )}
</header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 px-5">
          {blocked ? (
            <div className="pt-8">
              <Card className="bg-primary-light border border-primary text-center py-10">
                <p className="text-3xl mb-3">🔒</p>
                <p className="text-body font-semibold text-primary">Access restricted</p>
                <p className="text-caption text-text-secondary mt-1">
                  Ask a parent to grant you access to this section.
                </p>
              </Card>
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        {isChild ? (
          <ChildTabBar />
        ) : (
          <>
            {/* Mic — bottom left, always visible */}
            <div className="fixed bottom-24 left-4 z-40">
              <VoiceAgent
                role={role}
                permissions={permissions}
                myMemberId={myMember?.id}
              />
            </div>
            <FloatingActionMenu role={role} />
            <TabBar />
          </>
        )}
      </div>
    </PermissionContext.Provider>
  )
}