import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { useUIStore } from '../stores/uiStore'
import BottomSheet from './ui/BottomSheet'
import Input from './ui/Input'
import Button from './ui/Button'

export default function EditTaskSheet({ task, onClose }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { family, members, children } = useFamilyStore()
  const { addToast } = useUIStore()

  const [title, setTitle] = useState(task.title)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '')
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [childId, setChildId] = useState(task.child_id || '')
  const [notes, setNotes] = useState(task.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!title.trim()) { setError('Task title is required'); return }
    setError('')
    setLoading(true)
    try {
      const { error: updateError } = await supabase.from('tasks').update({
        title: title.trim(),
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        child_id: childId || null,
        notes: notes.trim() || null,
      }).eq('id', task.id)
      if (updateError) throw updateError

      queryClient.invalidateQueries({ queryKey: ['tasks', family?.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today', family?.id] })
      addToast('Task updated', 'success')
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={true} onClose={onClose} title="Edit Task">
      <div className="space-y-4">
        <Input
          label="Task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={error}
        />

        {members.length > 0 && (
          <div>
            <p className="text-body font-semibold mb-2">Assign to</p>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profiles?.name || (m.user_id === user?.id ? 'You' : 'Partner')}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input label="Due date (optional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

        {children.length > 0 && (
          <div>
            <p className="text-body font-semibold mb-2">Related to (optional)</p>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white"
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
            rows={3}
            className="w-full border border-border rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
          />
        </div>

        <Button className="w-full" onClick={handleSave} loading={loading}>Save Changes</Button>
      </div>
    </BottomSheet>
  )
}