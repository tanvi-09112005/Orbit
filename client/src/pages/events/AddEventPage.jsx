import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { ChevronLeft } from 'lucide-react'
import { notifyEventAdded } from '../../lib/pushTriggers'
const RECURRENCE_OPTIONS = [
  { value: '',          label: 'Does not repeat' },
  { value: 'daily',     label: 'Every day' },
  { value: 'weekly',    label: 'Every week' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Every month' },
]

export default function AddEventPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { family, members, children } = useFamilyStore()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedChildren, setSelectedChildren] = useState([])
  const [responsibleId, setResponsibleId] = useState('')
  const [backupId, setBackupId] = useState('')
  const [notes, setNotes] = useState('')
  const [recurrence, setRecurrence] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleChild = (childId) => {
    setSelectedChildren((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    )
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('Event name is required'); return }
    if (!date) { setError('Date is required'); return }
    setError('')
    setLoading(true)
    try {
      const startAt = startTime
        ? new Date(`${date}T${startTime}`).toISOString()
        : new Date(`${date}T00:00`).toISOString()
      const endAt = endTime ? new Date(`${date}T${endTime}`).toISOString() : null

      const eventData = {
        family_id: family.id,
        title: title.trim(),
        start_at: startAt,
        end_at: endAt,
        child_ids: selectedChildren,
        responsible_member_id: responsibleId || null,
        backup_member_id: backupId || null,
        notes: notes.trim() || null,
        created_by: user.id,
        recurrence_rule: recurrence || null,
      }

      // Insert the base event
      const { error: insertError } = await supabase.from('events').insert([eventData])
      if (insertError) throw insertError
      notifyEventAdded(family.id, title.trim(), date)

      // If recurring, create the next N occurrences upfront
      if (recurrence) {
        const occurrences = generateOccurrences(startAt, endAt, recurrence, 12)
        if (occurrences.length > 0) {
          const recurringEvents = occurrences.map(({ start, end }) => ({
            ...eventData,
            start_at: start,
            end_at: end,
          }))
          // Insert in batches — ignore errors (non-critical)
          await supabase.from('events').insert(recurringEvents)
        }
      }

      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/family')
    } catch (err) {
      setError(err.message || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Go back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary">Add Event</h1>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-coral-light border border-coral">
          <p className="text-body text-coral">{error}</p>
        </div>
      )}

      <Input
        label="Event Name"
        placeholder="e.g. Soccer practice"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <Input label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      </div>

      {/* Recurrence */}
      <div>
        <p className="text-body font-semibold mb-2">Repeat</p>
        <div className="flex flex-wrap gap-2">
          {RECURRENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRecurrence(opt.value)}
              className={`px-3 py-1.5 rounded-full text-body font-medium border-2 transition-colors ${
                recurrence === opt.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-border text-text-secondary hover:border-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {recurrence && (
          <p className="text-caption text-text-secondary mt-1">
            Creates 12 upcoming occurrences automatically
          </p>
        )}
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div>
          <p className="text-body font-semibold mb-2">For which child?</p>
          <div className="flex gap-2 flex-wrap">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => toggleChild(child.id)}
                className={`px-3 py-1.5 rounded-full text-body font-medium border-2 transition-colors ${
                  selectedChildren.includes(child.id)
                    ? 'text-white border-transparent'
                    : 'bg-white border-border text-text-secondary'
                }`}
                style={selectedChildren.includes(child.id) ? { backgroundColor: child.color_hex, borderColor: child.color_hex } : {}}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Responsible parent */}
      {members.length > 0 && (
        <div>
          <p className="text-body font-semibold mb-2">Responsible parent</p>
          <select
            value={responsibleId}
            onChange={(e) => setResponsibleId(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="">Select parent</option>
            {members.filter((m) => m.user_id && m.joined_at).map((m) => (
              <option key={m.id} value={m.id}>
                {m.profiles?.name || (m.user_id === user?.id ? 'You' : 'Partner')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Backup parent */}
      {members.filter((m) => m.user_id && m.joined_at).length > 1 && (
        <div>
          <p className="text-body font-semibold mb-2">Backup parent (optional)</p>
          <select
            value={backupId}
            onChange={(e) => setBackupId(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="">None</option>
            {members.filter((m) => m.user_id && m.joined_at && m.id !== responsibleId).map((m) => (
              <option key={m.id} value={m.id}>
                {m.profiles?.name || (m.user_id === user?.id ? 'You' : 'Partner')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <p className="text-body font-semibold mb-2">Notes (optional)</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any details..."
          rows={3}
          className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
        />
      </div>

      <Button className="w-full" onClick={handleSave} loading={loading}>
        Save Event
      </Button>
    </div>
  )
}

// Generate recurrence occurrences starting AFTER the base event
function generateOccurrences(baseStartIso, baseEndIso, rule, count) {
  const results = []
  const start = new Date(baseStartIso)
  const end = baseEndIso ? new Date(baseEndIso) : null
  const duration = end ? end.getTime() - start.getTime() : 0

  for (let i = 1; i <= count; i++) {
    const nextStart = new Date(start)
    const nextEnd = end ? new Date(end) : null

    if (rule === 'daily') {
      nextStart.setDate(nextStart.getDate() + i)
      if (nextEnd) nextEnd.setTime(nextStart.getTime() + duration)
    } else if (rule === 'weekly') {
      nextStart.setDate(nextStart.getDate() + i * 7)
      if (nextEnd) nextEnd.setTime(nextStart.getTime() + duration)
    } else if (rule === 'biweekly') {
      nextStart.setDate(nextStart.getDate() + i * 14)
      if (nextEnd) nextEnd.setTime(nextStart.getTime() + duration)
    } else if (rule === 'monthly') {
      nextStart.setMonth(nextStart.getMonth() + i)
      if (nextEnd) nextEnd.setTime(nextStart.getTime() + duration)
    } else {
      break
    }

    results.push({
      start: nextStart.toISOString(),
      end: nextEnd ? nextEnd.toISOString() : null,
    })
  }
  return results
}