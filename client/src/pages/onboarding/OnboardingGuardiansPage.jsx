import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Copy, Check, Plus, Trash2 } from 'lucide-react'

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function OnboardingGuardiansPage() {
  const navigate = useNavigate()
  const { familyId } = useOnboardingStore()
  const [guardians, setGuardians] = useState([{ email: '' }])
  const [loading, setLoading] = useState(false)
  const [inviteLinks, setInviteLinks] = useState([])
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [error, setError] = useState('')

  const addGuardian = () => setGuardians((prev) => [...prev, { email: '' }])
  const removeGuardian = (i) => setGuardians((prev) => prev.filter((_, idx) => idx !== i))
  const updateEmail = (i, val) => setGuardians((prev) => prev.map((g, idx) => idx === i ? { email: val } : g))

  const handleSendInvites = async () => {
    const validEmails = guardians.map((g) => g.email.trim()).filter((e) => e.length > 0)
    if (validEmails.length === 0) { navigate('/onboarding/done'); return }

    const invalid = validEmails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    if (invalid) { setError(`Invalid email: ${invalid}`); return }

    setError('')
    setLoading(true)
    try {
      const links = []
      for (const email of validEmails) {
        const token = generateToken()
        const { error: insertError } = await supabase.from('family_members').insert([{
          family_id: familyId,
          role: 'guardian',
          invite_email: email.toLowerCase(),
          invite_token: token,
          invited_at: new Date().toISOString(),
          permissions: { view_schedule: true, receive_notifications: true },
        }])
        if (insertError) throw insertError
        links.push({ email, link: `${window.location.origin}/join?token=${token}` })
      }
      setInviteLinks(links)
    } catch (err) {
      setError(err.message || 'Failed to create invites')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (idx) => {
    await navigator.clipboard.writeText(inviteLinks[idx].link)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  if (inviteLinks.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-h1 text-primary mb-2">Links ready!</h1>
          <p className="text-body text-text-secondary">
            Share each link with the respective guardian.
          </p>
        </div>

        <div className="space-y-3">
          {inviteLinks.map((item, idx) => (
            <div key={idx} className="bg-muted rounded-2xl p-4 space-y-2">
              <p className="text-body font-semibold">{item.email}</p>
              <p className="text-caption text-text-secondary font-mono break-all">{item.link}</p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleCopy(idx)}
              >
                {copiedIdx === idx ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
              </Button>
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={() => navigate('/onboarding/done')}>
          Continue
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-primary mb-2">Invite Guardians</h1>
        <p className="text-body text-text-secondary">
          Add grandparents, nannies, or trusted adults. Optional — you can add them later too.
        </p>
      </div>

      <div className="space-y-3">
        {guardians.map((g, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                placeholder="guardian@example.com"
                type="email"
                value={g.email}
                onChange={(e) => updateEmail(idx, e.target.value)}
              />
            </div>
            {guardians.length > 1 && (
              <button
                onClick={() => removeGuardian(idx)}
                className="mt-3 p-2 text-text-secondary hover:text-coral transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-caption text-coral">{error}</p>}

      <button
        onClick={addGuardian}
        className="flex items-center gap-2 text-primary text-body font-semibold hover:underline"
      >
        <Plus size={16} /> Add another guardian
      </button>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => navigate('/onboarding/done')}>
          Skip
        </Button>
        <Button className="flex-1" onClick={handleSendInvites} loading={loading}>
          Generate Links
        </Button>
      </div>
    </div>
  )
}