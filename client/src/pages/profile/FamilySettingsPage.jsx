import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInYears } from 'date-fns'
import { ChevronLeft, Plus, ChevronRight, LogOut, UserPlus, Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import { useUIStore } from '../../stores/uiStore'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import BottomSheet from '../../components/ui/BottomSheet'
import InviteMemberSheet from '../../components/InviteMemberSheet'

export default function FamilySettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { family, members, children, setFamily, fetchFamily, reset } = useFamilyStore()
  const { addToast } = useUIStore()

  const [familyName, setFamilyName] = useState(family?.name || '')
  const [savingName, setSavingName] = useState(false)
  const [addChildSheet, setAddChildSheet] = useState(false)
  const [linkChildSheet, setLinkChildSheet] = useState(false)
  const [inviteSheet, setInviteSheet] = useState(false)
  const [childName, setChildName] = useState('')
  const [childDob, setChildDob] = useState('')
  const [childSchool, setChildSchool] = useState('')
  const [savingChild, setSavingChild] = useState(false)
  const [linkChildEmail, setLinkChildEmail] = useState('')
  const [linkChildId, setLinkChildId] = useState('')
  const [linkingChild, setLinkingChild] = useState(false)
  const [copiedToken, setCopiedToken] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const isOwner = family?.owner_id === user?.id

  const pendingMembers = members.filter((m) => !m.user_id && m.invite_email)
  const activeMembers = members.filter((m) => m.user_id)

  const handleSaveName = async () => {
    if (!familyName.trim() || familyName === family?.name) return
    setSavingName(true)
    try {
      const { error } = await supabase.from('families').update({ name: familyName.trim() }).eq('id', family.id)
      if (error) throw error
      setFamily({ ...family, name: familyName.trim() })
      addToast('Family name updated', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSavingName(false)
    }
  }

  const handleAddChild = async () => {
    if (!childName.trim()) return
    setSavingChild(true)
    const COLORS = ['#534AB7', '#0F6E56', '#993C1D', '#854F0B', '#2D1B8E']
    try {
      const { error } = await supabase.from('children').insert([{
        family_id: family.id,
        name: childName.trim(),
        dob: childDob || null,
        school_name: childSchool.trim() || null,
        color_hex: COLORS[children.length % COLORS.length],
      }])
      if (error) throw error
      await fetchFamily()
      setChildName(''); setChildDob(''); setChildSchool('')
      setAddChildSheet(false)
      addToast('Child added', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSavingChild(false)
    }
  }

  const handleLinkChild = async () => {
    if (!linkChildEmail.trim() || !linkChildId) return
    setLinkingChild(true)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', linkChildEmail.trim().toLowerCase())
        .maybeSingle()

      if (profileError || !profile) {
        addToast('No account found with that email. Make sure the child has signed up first.', 'error')
        setLinkingChild(false)
        return
      }

      const { data: existing } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', family.id)
        .eq('user_id', profile.id)
        .maybeSingle()

      if (!existing) {
        const { error: memberError } = await supabase.from('family_members').insert([{
          family_id: family.id,
          user_id: profile.id,
          role: 'child',
          joined_at: new Date().toISOString(),
          permissions: {},
        }])
        if (memberError) throw memberError
      }

      const { error: childError } = await supabase
        .from('children')
        .update({ user_id: profile.id })
        .eq('id', linkChildId)
      if (childError) throw childError

      await fetchFamily()
      setLinkChildEmail(''); setLinkChildId('')
      setLinkChildSheet(false)
      addToast('Child account linked', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLinkingChild(false)
    }
  }

  const handleCancelInvite = async (memberId) => {
    if (!confirm('Cancel this invite?')) return
    try {
      const { error } = await supabase.from('family_members').delete().eq('id', memberId)
      if (error) throw error
      await fetchFamily()
      addToast('Invite cancelled', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const handleCopyInviteLink = async (token) => {
    const link = `${window.location.origin}/join?token=${token}`
    await navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
    addToast('Link copied', 'success')
  }

  const handleLeaveFamily = async () => {
    if (!confirm('Leave this family? You will lose all access.')) return
    setLeaving(true)
    try {
      const myMember = members.find((m) => m.user_id === user?.id)
      if (!myMember) throw new Error('Member not found')
      const { error } = await supabase.from('family_members').delete().eq('id', myMember.id)
      if (error) throw error
      reset()
      await logout()
      navigate('/login')
    } catch (err) {
      addToast(err.message, 'error')
      setLeaving(false)
    }
  }

  const handleDeleteFamily = async () => {
    if (!confirm('Delete this family? This cannot be undone.')) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('families').delete().eq('id', family.id)
      if (error) throw error
      reset()
      navigate('/login')
    } catch (err) {
      addToast(err.message, 'error')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary">Family Settings</h1>
      </div>

      {/* Family name */}
      <div>
        <Input label="Family Name" value={familyName} onChange={(e) => setFamilyName(e.target.value)} onBlur={handleSaveName} />
        {savingName && <p className="text-caption text-text-secondary mt-1">Saving...</p>}
      </div>

      {/* Active Members */}
      <div>
        <h3 className="text-h3 font-semibold mb-3">Members</h3>
        <div className="space-y-2">
          {activeMembers.map((member) => (
            <Card
              key={member.id}
              className="flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/profile/member/${member.id}`)}
            >
              <div className="flex items-center gap-3">
                <Avatar name={member.profiles?.name || 'Member'} size="md" />
                <div>
                  <p className="text-body font-semibold">
                    {member.user_id === user?.id
                      ? `${member.profiles?.name || 'You'} (You)`
                      : member.profiles?.name || 'Member'}
                  </p>
                  <p className="text-caption text-text-secondary capitalize">{member.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={member.role === 'parent' ? 'primary' : 'gray'}>{member.role}</Badge>
                <ChevronRight size={16} className="text-text-secondary" />
              </div>
            </Card>
          ))}
        </div>

        {/* Pending invites */}
        {pendingMembers.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-caption text-text-secondary">Pending invites</p>
            {pendingMembers.map((member) => (
              <Card key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-body text-text-secondary">?</span>
                  </div>
                  <div>
                    <p className="text-body font-semibold">{member.invite_email}</p>
                    <p className="text-caption text-text-secondary capitalize">{member.role} · Pending</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {member.invite_token && (
                    <button
                      onClick={() => handleCopyInviteLink(member.invite_token)}
                      className="p-2 text-primary hover:bg-primary-light rounded-lg transition-colors"
                      aria-label="Copy invite link"
                    >
                      {copiedToken === member.invite_token ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => handleCancelInvite(member.id)}
                      className="text-caption text-coral font-semibold hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <Button variant="secondary" className="w-full mt-3" onClick={() => setInviteSheet(true)}>
          <Plus size={18} /> Invite Partner / Guardian
        </Button>
      </div>

      {/* Children */}
      <div>
        <h3 className="text-h3 font-semibold mb-3">Children</h3>
        <div className="space-y-2">
          {children.map((child) => {
            const age = child.dob ? differenceInYears(new Date(), new Date(child.dob)) : null
            const hasLogin = !!child.user_id
            return (
              <Card key={child.id} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                  style={{ backgroundColor: child.color_hex }}
                >
                  {child.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-body font-semibold">{child.name}</p>
                  <p className="text-caption text-text-secondary">
                    {age !== null ? `Age ${age}` : ''}
                    {age !== null && child.school_name ? ' • ' : ''}
                    {child.school_name || ''}
                  </p>
                </div>
                {hasLogin ? (
                  <Badge variant="teal">Has login</Badge>
                ) : (
                  <button
                    onClick={() => { setLinkChildId(child.id); setLinkChildSheet(true) }}
                    className="text-caption text-primary font-semibold hover:underline flex items-center gap-1 flex-shrink-0"
                  >
                    <UserPlus size={14} /> Link login
                  </button>
                )}
              </Card>
            )
          })}
        </div>
        <Button variant="secondary" className="w-full mt-3" onClick={() => setAddChildSheet(true)}>
          <Plus size={18} /> Add Child
        </Button>
      </div>

      {/* Danger zone */}
      <div className="border-2 border-coral rounded-2xl p-4 space-y-3">
        <h3 className="text-h3 font-semibold text-coral">Danger Zone</h3>
        {!isOwner && (
          <Button variant="danger" className="w-full" onClick={handleLeaveFamily} loading={leaving}>
            <LogOut size={18} /> Leave Family
          </Button>
        )}
        {isOwner && (
          <Button variant="danger" className="w-full" onClick={handleDeleteFamily} loading={deleting}>
            Delete Family & All Data
          </Button>
        )}
      </div>

      {/* Add Child Sheet */}
      <BottomSheet open={addChildSheet} onClose={() => setAddChildSheet(false)} title="Add Child">
        <div className="space-y-4">
          <Input label="Name" placeholder="Aarav" value={childName} onChange={(e) => setChildName(e.target.value)} />
          <Input label="Date of birth" type="date" value={childDob} onChange={(e) => setChildDob(e.target.value)} />
          <Input label="School name (optional)" placeholder="Delhi Public School" value={childSchool} onChange={(e) => setChildSchool(e.target.value)} />
          <Button className="w-full" loading={savingChild} disabled={!childName.trim()} onClick={handleAddChild}>
            Add Child
          </Button>
        </div>
      </BottomSheet>

      {/* Link Child Sheet */}
      <BottomSheet open={linkChildSheet} onClose={() => { setLinkChildSheet(false); setLinkChildEmail(''); setLinkChildId('') }} title="Link Child Account">
        <div className="space-y-4">
          <div className="bg-primary-light rounded-xl p-3">
            <p className="text-caption text-primary">
              First create a separate Orbit account for your child at the signup page, then enter their email here to link it.
            </p>
          </div>
          <Input
            label="Child's account email"
            type="email"
            placeholder="child@example.com"
            value={linkChildEmail}
            onChange={(e) => setLinkChildEmail(e.target.value)}
          />
          <Button className="w-full" loading={linkingChild} disabled={!linkChildEmail.trim()} onClick={handleLinkChild}>
            Link Account
          </Button>
        </div>
      </BottomSheet>

      <InviteMemberSheet open={inviteSheet} onClose={() => setInviteSheet(false)} />
    </div>
  )
}