import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useFamilyStore } from '../../stores/familyStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import BottomSheet from '../../components/ui/BottomSheet'
import Input from '../../components/ui/Input'

export default function ActivitiesPage() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { children, members } = useFamilyStore()
  const child = children.find((c) => c.id === childId)
  const [addSheet, setAddSheet] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null)

  // Add form
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [scheduleText, setScheduleText] = useState('')

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('*').eq('child_id', childId).order('name')
      if (error) throw error
      return data
    },
  })

  const addActivity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('activities').insert([{
        child_id: childId, name: name.trim(), location: location.trim() || null,
        responsible_member_id: responsibleId || null,
        schedule: scheduleText ? { description: scheduleText } : {},
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', childId] })
      queryClient.invalidateQueries({ queryKey: ['activities', 'next', childId] })
      setName(''); setLocation(''); setResponsibleId(''); setScheduleText(''); setAddSheet(false)
    },
  })

  const updateActivity = useMutation({
    mutationFn: async ({ id, name, location, responsible_member_id, schedule }) => {
      const { error } = await supabase.from('activities').update({
        name, location: location || null, responsible_member_id: responsible_member_id || null, schedule,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', childId] })
      queryClient.invalidateQueries({ queryKey: ['activities', 'next', childId] })
      setEditingActivity(null)
    },
  })

  const deleteActivity = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('activities').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', childId] })
      queryClient.invalidateQueries({ queryKey: ['activities', 'next', childId] })
    },
  })

  return (
    <div className="space-y-4 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/children/${childId}`)} className="p-1" aria-label="Back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary">{child?.name ? `${child.name}'s Activities` : 'Activities'}</h1>
      </div>

      {isLoading ? (
        <><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></>
      ) : activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity) => {
            const responsible = members.find((m) => m.id === activity.responsible_member_id)
            return (
              <Card key={activity.id}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-body font-semibold">{activity.name}</p>
                    {activity.schedule?.description && (
                      <p className="text-caption text-text-secondary">{activity.schedule.description}</p>
                    )}
                    {activity.location && (
                      <p className="text-caption text-text-secondary">{activity.location}</p>
                    )}
                    {responsible && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Avatar name={responsible.profiles?.name || 'Parent'} size="sm" />
                        <p className="text-caption text-text-secondary">{responsible.profiles?.name || 'Parent'}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingActivity(activity)} className="p-1.5 text-text-secondary hover:text-primary transition-colors" aria-label="Edit">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this activity?')) deleteActivity.mutate(activity.id) }}
                      className="p-1.5 text-text-secondary hover:text-coral transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={() => <span className="text-4xl">⚽</span>} title="No activities yet" description="Add sports, clubs, or hobbies." />
      )}

      <Button className="w-full" onClick={() => setAddSheet(true)}>
        <Plus size={18} /> Add Activity
      </Button>

      {/* ADD SHEET */}
      <BottomSheet open={addSheet} onClose={() => setAddSheet(false)}>
        <ActivityForm
          title="Add Activity"
          members={members}
          onSave={(vals) => {
            setName(vals.name); setLocation(vals.location); setResponsibleId(vals.responsibleId); setScheduleText(vals.scheduleText)
            addActivity.mutate()
          }}
          onClose={() => setAddSheet(false)}
          loading={addActivity.isPending}
        />
      </BottomSheet>

      {/* EDIT SHEET */}
      {editingActivity && (
        <BottomSheet open={true} onClose={() => setEditingActivity(null)}>
          <ActivityForm
            title="Edit Activity"
            members={members}
            initial={editingActivity}
            onSave={(vals) => updateActivity.mutate({
              id: editingActivity.id,
              name: vals.name,
              location: vals.location,
              responsible_member_id: vals.responsibleId,
              schedule: vals.scheduleText ? { description: vals.scheduleText } : {},
            })}
            onClose={() => setEditingActivity(null)}
            loading={updateActivity.isPending}
          />
        </BottomSheet>
      )}
    </div>
  )
}

function ActivityForm({ title, members, initial, onSave, onClose, loading }) {
  const [name, setName] = useState(initial?.name || '')
  const [location, setLocation] = useState(initial?.location || '')
  const [responsibleId, setResponsibleId] = useState(initial?.responsible_member_id || '')
  const [scheduleText, setScheduleText] = useState(initial?.schedule?.description || '')

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-h2 text-primary">{title}</h2>
      <Input label="Activity name" placeholder="Swimming" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Schedule (optional)" placeholder="Tuesdays & Thursdays, 4–5 PM" value={scheduleText} onChange={(e) => setScheduleText(e.target.value)} />
      <Input label="Location (optional)" placeholder="City Aquatic Centre" value={location} onChange={(e) => setLocation(e.target.value)} />
      {members.length > 0 && (
        <div>
          <p className="text-body font-semibold mb-2">Responsible parent (optional)</p>
          <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)} className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white">
            <option value="">Select parent</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.profiles?.name || 'Parent'}</option>)}
          </select>
        </div>
      )}
      <Button className="w-full" loading={loading} disabled={!name.trim()} onClick={() => onSave({ name, location, responsibleId, scheduleText })}>
        {initial ? 'Save Changes' : 'Save'}
      </Button>
    </div>
  )
}