import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useFamilyStore } from '../stores/familyStore'
import { useUIStore } from '../stores/uiStore'
import BottomSheet from './ui/BottomSheet'
import Input from './ui/Input'
import Button from './ui/Button'
import { Copy, Check } from 'lucide-react'

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function InviteMemberSheet({ open, onClose }) {
  const { family, fetchFamily } = useFamilyStore()
  const { addToast } = useUIStore()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState('parent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleClose = () => {
    setEmail(''); setRole('parent'); setError(''); setInviteLink(''); setCopied(false)
    onClose()
  }

  const handleInvite = async () => {
    if (!email.trim()) { setError('Email is required'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email'); return }
    setError('')
    setLoading(true)
    try {
      const token = generateToken()
      const inviteEmail = email.trim().toLowerCase()

      // Check not already a member
      const { data: existing } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', family.id)
        .eq('invite_email', inviteEmail)
        .maybeSingle()

      if (existing) { setError('This person has already been invited'); setLoading(false); return }

      const { error: insertError } = await supabase.from('family_members').insert([{
        family_id: family.id,
        role,
        invite_email: inviteEmail,
        invite_token: token,
        invited_at: new Date().toISOString(),
        permissions: {},
      }])
      if (insertError) throw insertError

      await fetchFamily()

      const link = `${window.location.origin}/join?token=${token}`
      setInviteLink(link)
    } catch (err) {
      setError(err.message || 'Failed to create invite')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast('Link copied to clipboard', 'success')
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Invite Someone">
      <div className="space-y-4">
        {!inviteLink ? (
          <>
            <Input
              label="Email address"
              type="email"
              placeholder="partner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
            />

            <div>
              <p className="text-body font-semibold mb-2">Role</p>
              <div className="flex gap-3">
                {['parent', 'guardian'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 py-3 rounded-xl border-2 text-body font-semibold capitalize transition-colors ${
                      role === r ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-secondary'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-caption text-text-secondary mt-2">
                {role === 'parent'
                  ? 'Full access — can add events, tasks, and view all data.'
                  : 'Limited access — you control what guardians can see.'}
              </p>
            </div>

            <Button className="w-full" onClick={handleInvite} loading={loading}>
              Generate Invite Link
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-teal-light border border-teal rounded-xl p-4">
              <p className="text-body font-semibold text-teal mb-1">Invite link created!</p>
              <p className="text-caption text-text-secondary">
                Share this link with {email}. They'll sign up and join your family automatically.
              </p>
            </div>

            <div className="bg-muted rounded-xl p-3 break-all">
              <p className="text-caption font-mono text-text-secondary">{inviteLink}</p>
            </div>

            <Button className="w-full" onClick={handleCopy}>
              {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Link</>}
            </Button>

            <button
              onClick={handleClose}
              className="w-full text-body text-text-secondary hover:text-primary transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
