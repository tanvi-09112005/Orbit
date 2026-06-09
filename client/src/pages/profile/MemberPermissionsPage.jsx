import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2, ShieldCheck, ShieldOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import { useUIStore } from '../../stores/uiStore'
import Card from '../../components/ui/Card'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const PERMISSION_KEYS = [
  { key: 'view_schedule',         label: 'View Schedule',           defaultOn: true  },
  { key: 'receive_notifications', label: 'Receive Notifications',   defaultOn: true  },
  { key: 'view_mood',             label: 'View Mood Updates',       defaultOn: false },
  { key: 'view_screen_time',      label: 'View Screen Time',        defaultOn: false },
  { key: 'view_insights',         label: 'View Insights & Reports', defaultOn: false },
  { key: 'edit_tasks',            label: 'Edit Tasks',              defaultOn: false },
]

export default function MemberPermissionsPage() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { family, members, updateMember, fetchFamily } = useFamilyStore()
  const { addToast } = useUIStore()

  const member = members.find((m) => m.id === memberId)
  const myMember = members.find((m) => m.user_id === user?.id)
  const isOwner = family?.owner_id === user?.id
  const isMe = member?.user_id === user?.id

  const existingPerms = member?.permissions || {}
  const [perms, setPerms] = useState(() => {
    const init = {}
    PERMISSION_KEYS.forEach(({ key, defaultOn }) => {
      init[key] = existingPerms[key] !== undefined ? existingPerms[key] : defaultOn
    })
    return init
  })

  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [changingRole, setChangingRole] = useState(false)

  const toggle = (key) => {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('family_members')
        .update({ permissions: { ...existingPerms, ...perms } })
        .eq('id', memberId)
      if (error) throw error
      updateMember(memberId, { permissions: { ...existingPerms, ...perms } })
      setDirty(false)
      addToast('Permissions saved', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChangeRole = async () => {
    const newRole = member.role === 'guardian' ? 'parent' : 'guardian'
    const label = newRole === 'parent' ? 'promote to Parent' : 'demote to Guardian'
    if (!confirm(`Are you sure you want to ${label}? This changes what they can access.`)) return
    setChangingRole(true)
    try {
      const { error } = await supabase
        .from('family_members')
        .update({ role: newRole })
        .eq('id', memberId)
      if (error) throw error
      await fetchFamily()
      addToast(`Role changed to ${newRole}`, 'success')
      navigate(-1)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setChangingRole(false)
    }
  }

  const handleRemove = async () => {
    const name = member.profiles?.name || member.invite_email || 'this member'
    if (!confirm(`Remove ${name} from the family? They will lose all access.`)) return
    setRemoving(true)
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId)
      if (error) throw error
      await fetchFamily()
      addToast('Member removed', 'success')
      navigate(-1)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setRemoving(false)
    }
  }

  if (!member) {
    return (
      <div className="pt-4">
        <p className="text-body text-text-secondary">Member not found.</p>
      </div>
    )
  }

  // Parent viewing another parent — show role info + remove only (no permission toggles)
  if (member.role === 'parent') {
    return (
      <div className="pt-4 space-y-6 pb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft size={24} className="text-primary" />
          </button>
          <h1 className="text-h1 text-primary">Member</h1>
        </div>

        <div className="flex items-center gap-3">
          <Avatar name={member.profiles?.name || 'Parent'} size="lg" />
          <div>
            <p className="text-body font-semibold">
              {isMe
                ? `${member.profiles?.name || 'You'} (You)`
                : member.profiles?.name || member.invite_email || 'Parent'}
            </p>
            <Badge variant="primary">Parent</Badge>
          </div>
        </div>

        <Card className="bg-primary-light">
          <p className="text-body text-primary">Parents always have full access to all family data.</p>
        </Card>

        {/* Owner can demote co-parent to guardian or remove them */}
        {isOwner && !isMe && (
          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleChangeRole}
              loading={changingRole}
            >
              <ShieldOff size={18} /> Demote to Guardian
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={handleRemove}
              loading={removing}
            >
              <Trash2 size={18} /> Remove from Family
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Guardian view — permissions + promote + remove
  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary">Permissions</h1>
      </div>

      <div className="flex items-center gap-3">
        <Avatar name={member.profiles?.name || 'Guardian'} size="lg" />
        <div>
          <p className="text-body font-semibold">
            {member.profiles?.name || member.invite_email || 'Guardian'}
          </p>
          <p className="text-caption text-text-secondary capitalize">{member.role}</p>
          {!member.user_id && (
            <p className="text-caption text-amber font-semibold">Invite pending</p>
          )}
        </div>
      </div>

      {/* Permission toggles — only for joined (non-pending) guardians */}
      {member.user_id ? (
        <div className="space-y-3">
          {PERMISSION_KEYS.map(({ key, label }) => (
            <Card key={key} className="flex items-center justify-between">
              <p className="text-body font-semibold">{label}</p>
              <button
                onClick={() => toggle(key)}
                className={`w-12 h-6 rounded-full transition-colors relative ${perms[key] ? 'bg-primary' : 'bg-border'}`}
                role="switch"
                aria-checked={perms[key]}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    perms[key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-amber-light border border-amber">
          <p className="text-body text-amber font-semibold">Invite pending</p>
          <p className="text-caption text-text-secondary mt-1">
            Permissions will be configurable once they join.
          </p>
        </Card>
      )}

      {dirty && (
        <Button className="w-full" onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      )}

      {/* Owner actions */}
      {isOwner && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-caption text-text-secondary">Owner actions</p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleChangeRole}
            loading={changingRole}
          >
            <ShieldCheck size={18} /> Promote to Parent
          </Button>
          <Button
            variant="danger"
            className="w-full"
            onClick={handleRemove}
            loading={removing}
          >
            <Trash2 size={18} /> Remove from Family
          </Button>
        </div>
      )}
    </div>
  )
}