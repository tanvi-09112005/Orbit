import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ChevronLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import BottomSheet from '../../components/ui/BottomSheet'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function WellbeingPage() {
  // Constants inside component to avoid circular dependency in minified build
  const MOOD_LABEL = { 1: 'Stressed', 2: 'Fine', 3: 'Great' }
  const MOOD_EMOJI = { 1: '😟', 2: '😐', 3: '😊' }

  const { childId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { children } = useFamilyStore()
  const child = children.find((c) => c.id === childId)

  const [activeTab, setActiveTab] = useState('mood')
  const [moodSheet, setMoodSheet] = useState(false)
  const [noteSheet, setNoteSheet] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [selectedMood, setSelectedMood] = useState(null)
  const [moodNote, setMoodNote] = useState('')
  const [moodSaved, setMoodSaved] = useState(false)
  const [noteText, setNoteText] = useState('')

  const tabs = [
    { id: 'mood', label: 'Mood Log' },
    { id: 'trends', label: 'Trends' },
    { id: 'notes', label: 'Notes' },
  ]

  // ── Mood logs ────────────────────────────────────────────────
  const { data: moodLogs = [], isLoading: moodLoading } = useQuery({
    queryKey: ['mood', childId],
    enabled: !!childId,
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const { data, error } = await supabase
        .from('mood_logs')
        .select('*, profiles:logged_by(name)')
        .eq('child_id', childId)
        .gte('logged_at', startDate.toISOString())
        .order('logged_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const addMood = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('mood_logs').insert([{
        child_id: childId,
        logged_by: user.id,
        mood: selectedMood,
        note: moodNote.trim() || null,
        logged_at: new Date().toISOString(),
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood', childId] })
      queryClient.invalidateQueries({ queryKey: ['mood', 'last', childId] })
      setSelectedMood(null)
      setMoodNote('')
      setMoodSheet(false)
      setMoodSaved(true)
      setTimeout(() => setMoodSaved(false), 2500)
    },
  })

  // ── Notes ────────────────────────────────────────────────────
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['notes', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_notes')
        .select('*, profiles:author_id(name)')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const addNote = useMutation({
    mutationFn: async (text) => {
      const { error } = await supabase.from('child_notes').insert([{
        child_id: childId,
        author_id: user.id,
        text: text.trim(),
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', childId] })
      setNoteText('')
      setNoteSheet(false)
    },
  })

  const updateNote = useMutation({
    mutationFn: async ({ id, text }) => {
      const { error } = await supabase.from('child_notes').update({ text: text.trim() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', childId] })
      setEditingNote(null)
      setNoteText('')
    },
  })

  const deleteNote = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('child_notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', childId] }),
  })

  // ── Trend calculation ────────────────────────────────────────
  const getTrend = () => {
    if (moodLogs.length < 4) return 'Stable'
    const recent = moodLogs.slice(0, 7)
    const older = moodLogs.slice(7, 14)
    if (older.length === 0) return 'Stable'
    const recentAvg = recent.reduce((a, b) => a + b.mood, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b.mood, 0) / older.length
    const delta = recentAvg - olderAvg
    if (delta > 0.3) return 'Improving'
    if (delta < -0.3) return 'Declining'
    return 'Stable'
  }

  const chartData = [...moodLogs].reverse().map((log) => ({
    date: format(new Date(log.logged_at), 'd MMM'),
    mood: log.mood,
  }))

  const trend = getTrend()
  const trendColor = trend === 'Improving' ? 'text-teal' : trend === 'Declining' ? 'text-coral' : 'text-text-secondary'

  const moodTickFormatter = (v) => MOOD_LABEL[v] || ''

  return (
    <div className="space-y-4 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/children/${childId}`)} className="p-1" aria-label="Back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary">{child?.name ? `${child.name}'s Wellbeing` : 'Wellbeing'}</h1>
      </div>

      <div className="flex gap-1 border-b border-border -mx-5 px-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-h3 font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? 'text-primary border-primary' : 'text-text-secondary border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MOOD LOG */}
      {activeTab === 'mood' && (
        <div className="space-y-3">
          {moodSaved && (
            <Card className="bg-teal-light border border-teal text-center py-3">
              <p className="text-body font-semibold text-teal">Thanks for sharing! 🎉</p>
            </Card>
          )}
          {moodLoading ? (
            <Skeleton className="h-16 rounded-2xl" />
          ) : moodLogs.length > 0 ? (
            moodLogs.map((log) => {
              const loggedBy = log.profiles?.name
                ? (log.logged_by === user?.id ? 'You' : log.profiles.name)
                : 'Unknown'
              return (
                <Card key={log.id} className="flex items-start gap-3">
                  <span className="text-2xl">{MOOD_EMOJI[log.mood]}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-body font-semibold">{MOOD_LABEL[log.mood]}</p>
                      <p className="text-caption text-text-secondary">{format(new Date(log.logged_at), 'd MMM')}</p>
                    </div>
                    {log.note && <p className="text-caption text-text-secondary mt-0.5">{log.note}</p>}
                    <p className="text-caption text-text-secondary mt-0.5">Logged by {loggedBy}</p>
                  </div>
                </Card>
              )
            })
          ) : (
            <p className="text-body text-text-secondary text-center py-8">No mood entries yet</p>
          )}
          <Button className="w-full" onClick={() => setMoodSheet(true)}>
            <Plus size={18} /> Log Mood
          </Button>
        </div>
      )}

      {/* TRENDS */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          <Card>
            <p className="text-caption text-text-secondary mb-1">Last 7 days trend</p>
            <p className={`text-h2 font-semibold ${trendColor}`}>{trend}</p>
          </Card>
          {chartData.length > 1 ? (
            <Card>
              <p className="text-body font-semibold mb-4">30-day mood</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis
                    domain={[1, 3]}
                    ticks={[1, 2, 3]}
                    tickFormatter={moodTickFormatter}
                    tick={{ fontSize: 10 }}
                    width={55}
                  />
                  <Tooltip formatter={(v) => MOOD_LABEL[v]} />
                  <Line type="monotone" dataKey="mood" stroke="#2D1B8E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          ) : (
            <p className="text-body text-text-secondary text-center py-4">Log at least 2 moods to see trends</p>
          )}
        </div>
      )}

      {/* NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {notesLoading ? (
            <Skeleton className="h-16 rounded-2xl" />
          ) : notes.length > 0 ? (
            notes.map((note) => {
              const author = note.profiles?.name
                ? (note.author_id === user?.id ? 'You' : note.profiles.name)
                : 'Unknown'
              return (
                <Card key={note.id}>
                  <div className="flex items-start gap-2">
                    <p className="text-body flex-1">{note.text}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      {note.author_id === user?.id && (
                        <>
                          <button
                            onClick={() => { setEditingNote(note); setNoteText(note.text); setNoteSheet(true) }}
                            className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete this note?')) deleteNote.mutate(note.id) }}
                            className="p-1.5 text-text-secondary hover:text-coral transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-caption text-text-secondary mt-1">
                    {author} · {format(new Date(note.created_at), 'd MMM')}
                  </p>
                </Card>
              )
            })
          ) : (
            <p className="text-body text-text-secondary text-center py-8">No notes yet</p>
          )}
          <Button
            className="w-full"
            onClick={() => { setEditingNote(null); setNoteText(''); setNoteSheet(true) }}
          >
            <Plus size={18} /> Add Note
          </Button>
        </div>
      )}

      {/* MOOD SHEET */}
      <BottomSheet open={moodSheet} onClose={() => setMoodSheet(false)}>
        <div className="space-y-5 pb-4">
          <h2 className="text-h2 text-primary">How is {child?.name || 'your child'} feeling?</h2>
          <div className="flex gap-3 justify-center">
            {[3, 2, 1].map((mood) => (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all min-w-[80px] ${
                  selectedMood === mood ? 'border-primary bg-primary-light scale-105' : 'border-border bg-white'
                }`}
              >
                <span className="text-3xl">{MOOD_EMOJI[mood]}</span>
                <span className="text-caption font-medium">{MOOD_LABEL[mood]}</span>
              </button>
            ))}
          </div>
          <div>
            <p className="text-body font-semibold mb-2">Note (optional)</p>
            <textarea
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="Any context..."
              rows={3}
              className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
            />
          </div>
          <Button className="w-full" disabled={!selectedMood} loading={addMood.isPending} onClick={() => addMood.mutate()}>
            Save
          </Button>
        </div>
      </BottomSheet>

      {/* NOTE SHEET */}
      <BottomSheet open={noteSheet} onClose={() => { setNoteSheet(false); setEditingNote(null); setNoteText('') }}>
        <div className="space-y-4 pb-4">
          <h2 className="text-h2 text-primary">{editingNote ? 'Edit Note' : 'Add Note'}</h2>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write a note about how things are going..."
            rows={5}
            className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
            autoFocus
          />
          <Button
            className="w-full"
            disabled={!noteText.trim()}
            loading={addNote.isPending || updateNote.isPending}
            onClick={() => {
              if (editingNote) updateNote.mutate({ id: editingNote.id, text: noteText })
              else addNote.mutate(noteText)
            }}
          >
            {editingNote ? 'Save Changes' : 'Save Note'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}