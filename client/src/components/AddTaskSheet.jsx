import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { useUIStore } from '../stores/uiStore'
import { notifyTaskAssigned } from '../lib/pushTriggers'
import BottomSheet from './ui/BottomSheet'
import Input from './ui/Input'
import Button from './ui/Button'

export default function AddTaskSheet({ open, onClose }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { family, members, children } = useFamilyStore()
  const { addToast } = useUIStore()

  const [title, setTitle] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [childId, setChildId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const assignableMembers = members.filter((m) => m.user_id && m.joined_at)

  const reset = () => {
    setTitle(''); setAssignedTo(''); setDueDate('')
    setChildId(''); setNotes(''); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!title.trim()) { setError('Task title is required'); return }
    setError('')
    setLoading(true)
    try {
      const { error: insertError } = await supabase.from('tasks').insert([{
        family_id: family.id,
        title: title.trim(),
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        child_id: childId || null,
        notes: notes.trim() || null,
        status: 'open',
      }])
      if (insertError) throw insertError

      queryClient.invalidateQueries({ queryKey: ['tasks', family?.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today', family?.id] })
      queryClient.invalidateQueries({ queryKey: ['insights', 'balance', family?.id] })

      // Notify assigned member (even if it's yourself, for testing purposes)
      if (assignedTo) {
        const assignedMember = assignableMembers.find((m) => m.id === assignedTo)
        const myName = members.find((m) => m.user_id === user?.id)?.profiles?.name || 'Someone'
        if (assignedMember) {
          notifyTaskAssigned(family.id, title.trim(), assignedMember.user_id, myName)
        }
      }

      addToast('Task added', 'success')
      handleClose()
    } catch (err) {
      setError(err.message || 'Failed to save task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Add Task">
      <div className="space-y-4">
        <Input
          label="Task"
          placeholder="e.g. Book dentist appointment"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={error}
        />

        {assignableMembers.length > 0 && (
          <div>
            <p className="text-body font-semibold mb-2">Assign to</p>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white"
            >
              <option value="">Unassigned</option>
              {assignableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profiles?.name
                    ? `${m.profiles.name}${m.user_id === user?.id ? ' (You)' : ''}`
                    : m.user_id === user?.id ? 'You' : 'Member'}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Due date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {children.length > 0 && (
          <div>
            <p className="text-body font-semibold mb-2">Related to (optional)</p>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white"
            >
              <option value="">No child</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <p className="text-body font-semibold mb-2">Notes (optional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any details..."
            rows={3}
            className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white resize-none"
          />
        </div>

        <Button className="w-full" onClick={handleSave} loading={loading}>
          Save Task
        </Button>
      </div>
    </BottomSheet>
  )
}