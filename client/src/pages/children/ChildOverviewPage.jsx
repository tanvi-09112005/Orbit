import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { differenceInYears, format } from 'date-fns'
import { useFamilyStore } from '../../stores/familyStore'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/ui/Avatar'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function ChildOverviewPage() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const { children } = useFamilyStore()

  const child = children.find((c) => c.id === childId)

  // Fetch summary data in parallel
  const { data: homeworkCount = 0 } = useQuery({
    queryKey: ['homework', 'count', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('homework')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', childId)
        .eq('done', false)
      if (error) throw error
      return count || 0
    },
  })

  const { data: nextActivity } = useQuery({
    queryKey: ['activities', 'next', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('child_id', childId)
        .limit(1)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
  })

  const { data: lastMood } = useQuery({
    queryKey: ['mood', 'last', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('child_id', childId)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
  })

  const { data: screenTimeThisWeek = 0 } = useQuery({
    queryKey: ['screentime', 'week', childId],
    enabled: !!childId,
    queryFn: async () => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { data, error } = await supabase
        .from('screen_time_logs')
        .select('hours_manual')
        .eq('child_id', childId)
        .gte('date', weekAgo.toISOString().split('T')[0])
      if (error) throw error
      return data?.reduce((sum, row) => sum + (row.hours_manual || 0), 0) || 0
    },
  })

  const moodEmoji = { 1: '😟', 2: '😐', 3: '😊' }

  if (!child) {
    return (
      <div className="pt-4">
        <p className="text-body text-text-secondary">Child not found.</p>
      </div>
    )
  }

  const age = child.dob
    ? differenceInYears(new Date(), new Date(child.dob))
    : null

  const sections = [
  {
    id: 'school',
    emoji: '📚',
    title: 'School',
    subtitle: homeworkCount > 0
      ? `${homeworkCount} homework item${homeworkCount > 1 ? 's' : ''} pending`
      : 'No pending homework',
    badge: homeworkCount > 0 ? `${homeworkCount} pending` : null,
    badgeVariant: 'coral',
    path: `/children/${childId}/school`,
  },
  {
    id: 'activities',
    emoji: '⚽',
    title: 'Activities',
    subtitle: nextActivity ? nextActivity.name : 'No activities added',
    badge: null,
    path: `/children/${childId}/activities`,
  },
  {
    id: 'wellbeing',
    emoji: '😊',
    title: 'Wellbeing',
    subtitle: lastMood
      ? `Last: ${MOOD_EMOJI[lastMood.mood]} ${MOOD_LABEL[lastMood.mood]} · ${format(new Date(lastMood.logged_at), 'd MMM')}`
      : 'No mood logged yet',
    badge: lastMood?.mood === 1 ? 'Check in' : null,
    badgeVariant: 'coral',
    path: `/children/${childId}/wellbeing`,
  },
  {
    id: 'screentime',
    emoji: '📱',
    title: 'Screen Time',
    subtitle: screenTimeThisWeek > 0
      ? `${screenTimeThisWeek.toFixed(1)}h this week`
      : 'Nothing logged this week',
    badge: null,
    path: `/children/${childId}/screentime`,
  },
]

const MOOD_LABEL = { 1: 'Stressed', 2: 'Fine', 3: 'Great' }
const MOOD_EMOJI = { 1: '😟', 2: '😐', 3: '😊' }

  return (
    <div className="space-y-6 pt-4 pb-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/children')}
        className="flex items-center gap-1 text-primary"
        aria-label="Back to children"
      >
        <ChevronLeft size={20} />
        <span className="text-body font-medium">All children</span>
      </button>

      {/* Child header */}
      <div className="text-center">
        <Avatar
          name={child.name}
          size="xl"
          src={child.photo_url}
          className="mx-auto mb-4"
        />
        <h1 className="text-h1 font-serif text-primary mb-1">{child.name}</h1>
        <p className="text-caption text-text-secondary">
          {age !== null ? `Age ${age}` : ''}
          {age !== null && child.school_name ? ' • ' : ''}
          {child.school_name || ''}
        </p>
      </div>

      {/* Section cards */}
      <div className="space-y-3">
        {sections.map((section) => (
          <Card
            key={section.id}
            className="flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(section.path)}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{section.emoji}</span>
              <div>
                <p className="text-body font-semibold">{section.title}</p>
                <p className="text-caption text-text-secondary">{section.subtitle}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-text-secondary flex-shrink-0" />
          </Card>
        ))}
      </div>
    </div>
  )
}