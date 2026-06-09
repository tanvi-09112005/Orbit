import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const NOTIFICATION_KEYS = [
  { key: 'event_reminders', label: 'Event reminders (1hr before)' },
  { key: 'tasks_due_today', label: 'Tasks due today' },
  { key: 'task_assigned', label: 'Partner assigned me a task' },
  { key: 'new_notice', label: 'New school notice uploaded' },
  { key: 'mood_declining', label: 'Mood declining trend (7+ days)' },
  { key: 'weekly_balance', label: 'Weekly balance summary' },
  { key: 'schedule_conflict', label: 'Schedule conflict detected' },
]

export default function NotificationSettingsPage() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuthStore()
  const existing = user?.user_metadata?.notification_prefs || {}

  const [prefs, setPrefs] = useState(() => {
    const init = {}
    NOTIFICATION_KEYS.forEach(({ key }) => {
      init[key] = existing[key] !== undefined ? existing[key] : true
    })
    return init
  })

  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const toggle = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({ notification_prefs: prefs })
      setDirty(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary">Notifications</h1>
      </div>

      <div className="space-y-3">
        {NOTIFICATION_KEYS.map(({ key, label }) => (
          <Card key={key} className="flex items-center justify-between">
            <p className="text-body font-semibold">{label}</p>
            <button
              onClick={() => toggle(key)}
              className={`w-12 h-6 rounded-full transition-colors relative ${prefs[key] ? 'bg-primary' : 'bg-border'}`}
              role="switch"
              aria-checked={prefs[key]}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[key] ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </Card>
        ))}
      </div>

      {dirty && (
        <Button className="w-full" onClick={handleSave} loading={saving}>
          Save
        </Button>
      )}
    </div>
  )
}