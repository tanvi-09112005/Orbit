import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ChevronLeft, Trash2, Pencil, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Skeleton from '../../components/ui/Skeleton'
import Avatar from '../../components/ui/Avatar'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { children, members } = useFamilyStore()

  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedChildren, setSelectedChildren] = useState([])
  const [responsibleId, setResponsibleId] = useState('')
  const [backupId, setBackupId] = useState('')
  const [notes, setNotes] = useState('')

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })

  const startEdit = () => {
    setTitle(event.title)
    setDate(format(new Date(event.start_at), 'yyyy-MM-dd'))
    setStartTime(format(new Date(event.start_at), 'HH:mm'))
    setEndTime(event.end_at ? format(new Date(event.end_at), 'HH:mm') : '')
    setSelectedChildren(event.child_ids || [])
    setResponsibleId(event.responsible_member_id || '')
    setBackupId(event.backup_member_id || '')
    setNotes(event.notes || '')
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const handleSave = async () => {
    if (!title.trim() || !date) return
    setSaving(true)
    try {
      const startAt = startTime
        ? new Date(`${date}T${startTime}`).toISOString()
        : new Date(`${date}T00:00`).toISOString()
      const endAt = endTime ? new Date(`${date}T${endTime}`).toISOString() : null

      const { error } = await supabase.from('events').update({
        title: title.trim(),
        start_at: startAt,
        end_at: endAt,
        child_ids: selectedChildren,
        responsible_member_id: responsibleId || null,
        backup_member_id: backupId || null,
        notes: notes.trim() || null,
      }).eq('id', id)

      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setEditing(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/family')
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const toggleChild = (childId) => {
    setSelectedChildren((prev) =>
      prev.includes(childId) ? prev.filter((c) => c !== childId) : [...prev, childId]
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    )
  }

  if (!event) {
    return <div className="pt-4"><p className="text-body text-text-secondary">Event not found.</p></div>
  }

  const eventChildren = children.filter((c) => event.child_ids?.includes(c.id))
  const responsible = members.find((m) => m.id === event.responsible_member_id)
  const backup = members.find((m) => m.id === event.backup_member_id)
  const isOwner = event.created_by === user?.id

  // ── EDIT MODE ──────────────────────────────────────────────
  if (editing) {
    return (
      <div className="space-y-5 pt-4 pb-8">
        <div className="flex items-center gap-3">
          <button onClick={cancelEdit} className="p-1" aria-label="Cancel">
            <X size={24} className="text-primary" />
          </button>
          <h1 className="text-h1 text-primary flex-1">Edit Event</h1>
          <button onClick={handleSave} disabled={saving} className="p-1" aria-label="Save">
            <Check size={24} className="text-primary" />
          </button>
        </div>

        <Input label="Event Name" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <Input label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>

        {children.length > 0 && (
          <div>
            <p className="text-body font-semibold mb-2">For which child?</p>
            <div className="flex gap-2 flex-wrap">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => toggleChild(child.id)}
                  className={`px-3 py-1.5 rounded-full text-body font-medium border-2 transition-colors ${
                    selectedChildren.includes(child.id) ? 'text-white border-transparent' : 'bg-white border-border text-text-secondary'
                  }`}
                  style={selectedChildren.includes(child.id) ? { backgroundColor: child.color_hex, borderColor: child.color_hex } : {}}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {members.length > 0 && (
          <div>
            <p className="text-body font-semibold mb-2">Responsible parent</p>
            <select
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">Select parent</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.profiles?.name || 'Parent'}</option>
              ))}
            </select>
          </div>
        )}

        {members.length > 1 && (
          <div>
            <p className="text-body font-semibold mb-2">Backup parent (optional)</p>
            <select
              value={backupId}
              onChange={(e) => setBackupId(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">None</option>
              {members.filter((m) => m.id !== responsibleId).map((m) => (
                <option key={m.id} value={m.id}>{m.profiles?.name || 'Parent'}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <p className="text-body font-semibold mb-2">Notes (optional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
          />
        </div>

        <Button className="w-full" onClick={handleSave} loading={saving}>Save Changes</Button>
      </div>
    )
  }

  // ── VIEW MODE ──────────────────────────────────────────────
  return (
    <div className="space-y-5 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Go back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary flex-1">{event.title}</h1>
        {isOwner && (
          <button onClick={startEdit} className="p-1" aria-label="Edit event">
            <Pencil size={20} className="text-primary" />
          </button>
        )}
      </div>

      <Card className="space-y-4">
        <div>
          <p className="text-caption text-text-secondary mb-0.5">When</p>
          <p className="text-body font-semibold">{format(new Date(event.start_at), 'EEEE, d MMMM yyyy')}</p>
          <p className="text-body text-text-secondary">
            {format(new Date(event.start_at), 'h:mm a')}
            {event.end_at && ` – ${format(new Date(event.end_at), 'h:mm a')}`}
          </p>
        </div>

        {eventChildren.length > 0 && (
          <div>
            <p className="text-caption text-text-secondary mb-1">For</p>
            <div className="flex gap-2 flex-wrap">
              {eventChildren.map((child) => (
                <span key={child.id} className="text-caption font-medium px-2 py-1 rounded-full text-white" style={{ backgroundColor: child.color_hex }}>
                  {child.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {responsible && (
          <div>
            <p className="text-caption text-text-secondary mb-1">Responsible</p>
            <div className="flex items-center gap-2">
              <Avatar name={responsible.profiles?.name || 'Parent'} size="sm" />
              <p className="text-body font-semibold">{responsible.profiles?.name || 'Parent'}</p>
            </div>
          </div>
        )}

        {backup && (
          <div>
            <p className="text-caption text-text-secondary mb-1">Backup</p>
            <div className="flex items-center gap-2">
              <Avatar name={backup.profiles?.name || 'Parent'} size="sm" />
              <p className="text-body font-semibold">{backup.profiles?.name || 'Parent'}</p>
            </div>
          </div>
        )}

        {event.notes && (
          <div>
            <p className="text-caption text-text-secondary mb-0.5">Notes</p>
            <p className="text-body">{event.notes}</p>
          </div>
        )}
      </Card>

      {isOwner && (
        <Button variant="danger" className="w-full" onClick={handleDelete} loading={deleting}>
          <Trash2 size={18} /> Delete Event
        </Button>
      )}
    </div>
  )
}