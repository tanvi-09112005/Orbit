import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Search, X, Calendar, CheckSquare, BookOpen, Baby } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useFamilyStore } from '../stores/familyStore'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'

const RESULT_TYPES = {
  event:    { icon: Calendar,    color: 'text-primary',  label: 'Event'    },
  task:     { icon: CheckSquare, color: 'text-teal',     label: 'Task'     },
  homework: { icon: BookOpen,    color: 'text-amber',    label: 'Homework' },
  child:    { icon: Baby,        color: 'text-coral',    label: 'Child'    },
}

export default function SearchPage() {
  const navigate = useNavigate()
  const { family, children } = useFamilyStore()
  const [query, setQuery] = useState('')

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', family?.id, query],
    enabled: !!family?.id && query.trim().length >= 2,
    queryFn: async () => {
      const q = query.trim()
      const items = []

      const [eventsRes, tasksRes, homeworkRes] = await Promise.all([
        supabase.from('events').select('id, title, start_at')
          .eq('family_id', family.id)
          .ilike('title', `%${q}%`)
          .limit(5),
        supabase.from('tasks').select('id, title, due_date, status')
          .eq('family_id', family.id)
          .ilike('title', `%${q}%`)
          .neq('status', 'done')
          .limit(5),
        supabase.from('homework').select('id, subject, description, due_date, child_id')
          .in('child_id', children.map((c) => c.id))
          .or(`subject.ilike.%${q}%,description.ilike.%${q}%`)
          .eq('done', false)
          .limit(5),
      ])

      eventsRes.data?.forEach((e) => items.push({
        type: 'event',
        id: e.id,
        title: e.title,
        subtitle: e.start_at ? format(new Date(e.start_at), 'EEE, d MMM') : '',
        route: `/family/events/${e.id}`,
      }))

      tasksRes.data?.forEach((t) => items.push({
        type: 'task',
        id: t.id,
        title: t.title,
        subtitle: t.due_date ? `Due ${format(new Date(t.due_date), 'd MMM')}` : 'No due date',
        route: '/family/tasks',
      }))

      homeworkRes.data?.forEach((h) => {
        const child = children.find((c) => c.id === h.child_id)
        items.push({
          type: 'homework',
          id: h.id,
          title: `${h.subject}: ${h.description}`,
          subtitle: child ? child.name : '',
          route: `/children/${h.child_id}/school`,
        })
      })

      // Also match children by name
      children.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
        .forEach((c) => items.push({
          type: 'child',
          id: c.id,
          title: c.name,
          subtitle: c.school_name || '',
          route: `/children/${c.id}`,
        }))

      return items
    },
  })

  return (
    <div className="space-y-4 pt-4 pb-8">
      {/* Search input */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          autoFocus
          type="text"
          placeholder="Search events, tasks, homework..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-3 border border-border rounded-2xl text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results */}
      {query.trim().length < 2 ? (
        <p className="text-body text-text-secondary text-center py-8">
          Type at least 2 characters to search
        </p>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          {results.map((result) => {
            const cfg = RESULT_TYPES[result.type]
            const Icon = cfg.icon
            return (
              <Card
                key={`${result.type}-${result.id}`}
                className="flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(result.route)}
              >
                <div className={`p-2 rounded-xl bg-muted flex-shrink-0`}>
                  <Icon size={18} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold truncate">{result.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-text-secondary">{cfg.label}</span>
                    {result.subtitle && (
                      <span className="text-caption text-text-secondary">· {result.subtitle}</span>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <p className="text-body text-text-secondary text-center py-8">
          No results for "{query}"
        </p>
      )}
    </div>
  )
}