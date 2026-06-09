import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'

const MOODS = [
  { value: 1, emoji: '😟', label: 'Stressed', color: 'bg-coral-light border-coral text-coral' },
  { value: 2, emoji: '😐', label: 'Fine',     color: 'bg-amber-light border-amber text-amber' },
  { value: 3, emoji: '😊', label: 'Great',    color: 'bg-teal-light border-teal text-teal' },
]

export default function ChildMoodPage() {
  const { user } = useAuthStore()
  const { members, children } = useFamilyStore()
  const queryClient = useQueryClient()

  const myMember = members.find((m) => m.user_id === user?.id)
  const myChild = children.find((c) => c.user_id === user?.id) || children[0]

  const [selectedMood, setSelectedMood] = useState(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const { data: recentLogs = [], isLoading } = useQuery({
    queryKey: ['child-mood-log', myChild?.id],
    enabled: !!myChild?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mood_logs').select('*')
        .eq('child_id', myChild.id)
        .order('logged_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
  })

  const saveMood = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('mood_logs').insert([{
        child_id: myChild?.id,
        logged_by: user?.id,
        mood: selectedMood,
        note: note.trim() || null,
        logged_at: new Date().toISOString(),
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-mood-log', myChild?.id] })
      queryClient.invalidateQueries({ queryKey: ['mood', 'last', myChild?.id] })
      setSaved(true)
      setSelectedMood(null)
      setNote('')
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const moodEmoji = { 1: '😟', 2: '😐', 3: '😊' }
  const moodLabel = { 1: 'Stressed', 2: 'Fine', 3: 'Great' }

  return (
    <div className="space-y-6 pt-4 pb-8">
      <h1 className="text-display text-primary">How are you feeling?</h1>

      {saved ? (
        <Card className="text-center py-8 bg-teal-light border border-teal">
          <p className="text-h2 mb-1">🎉</p>
          <p className="text-body font-semibold text-teal">Thanks for sharing!</p>
        </Card>
      ) : (
        <>
          <div className="flex gap-3">
            {MOODS.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all ${
                  selectedMood === mood.value
                    ? `${mood.color} scale-105 shadow-md`
                    : 'bg-white border-border text-text-secondary hover:border-primary'
                }`}
              >
                <span className="text-3xl">{mood.emoji}</span>
                <span className="text-body font-semibold">{mood.label}</span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-body font-semibold mb-2">Add a note (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
            />
          </div>

          <Button
            className="w-full"
            disabled={!selectedMood}
            loading={saveMood.isPending}
            onClick={() => saveMood.mutate()}
          >
            Save Mood
          </Button>
        </>
      )}

      {/* Recent mood log */}
      {recentLogs.length > 0 && (
        <div>
          <p className="text-body font-semibold mb-3">Recent moods</p>
          {isLoading ? <Skeleton className="h-16 rounded-2xl" /> : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <Card key={log.id} className="flex items-center gap-3">
                  <span className="text-2xl">{moodEmoji[log.mood]}</span>
                  <div className="flex-1">
                    <p className="text-body font-semibold">{moodLabel[log.mood]}</p>
                    {log.note && <p className="text-caption text-text-secondary">{log.note}</p>}
                  </div>
                  <p className="text-caption text-text-secondary">{format(new Date(log.logged_at), 'd MMM')}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}