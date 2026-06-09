import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Copy, Check } from 'lucide-react'

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function OnboardingPartnerPage() {
  const navigate = useNavigate()
  const { familyId } = useOnboardingStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleInvite = async () => {
    if (!email.trim()) { navigate('/onboarding/children'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email'); return
    }
    setError('')
    setLoading(true)
    try {
      const token = generateToken()
      const { error: inviteError } = await supabase.from('family_members').insert([{
        family_id: familyId,
        role: 'parent',
        invite_email: email.trim().toLowerCase(),
        invite_token: token,
        invited_at: new Date().toISOString(),
        permissions: {},
      }])
      if (inviteError) throw inviteError
      setInviteLink(`${window.location.origin}/join?token=${token}`)
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
  }

  if (inviteLink) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-h1 text-primary mb-2">Invite sent!</h1>
          <p className="text-body text-text-secondary">
            Share this link with your partner. They'll join your family when they sign up.
          </p>
        </div>

        <div className="bg-teal-light border border-teal rounded-2xl p-4">
          <p className="text-body font-semibold text-teal mb-1">Link ready</p>
          <p className="text-caption text-text-secondary break-all font-mono">{inviteLink}</p>
        </div>

        <Button className="w-full" onClick={handleCopy}>
          {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Link</>}
        </Button>

        <Button variant="secondary" className="w-full" onClick={() => navigate('/onboarding/children')}>
          Continue
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-primary mb-2">Invite Your Partner</h1>
        <p className="text-body text-text-secondary">Optional — you can skip this for now</p>
      </div>

      <Input
        label="Partner's email"
        type="email"
        placeholder="partner@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => navigate('/onboarding/children')}>
          Skip
        </Button>
        <Button className="flex-1" onClick={handleInvite} loading={loading}>
          Generate Link
        </Button>
      </div>
    </div>
  )
}