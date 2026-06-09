import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function OnboardingFamilyPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setFamilyId, setFamilyName } = useOnboardingStore()
  const [familyName, setFamilyNameLocal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleContinue = async () => {
    if (!familyName.trim()) return
    const { data: { session } } = await supabase.auth.getSession()
  console.log('session:', session)
  console.log('user from store:', user)
    setError('')
    setLoading(true)
    try {
      // Create family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert([{ name: familyName.trim(), owner_id: user.id }])
        .select()
        .single()
      if (familyError) throw familyError

      // Add user as parent in family_members
      const { error: memberError } = await supabase
        .from('family_members')
        .insert([{
          family_id: family.id,
          user_id: user.id,
          role: 'parent',
          joined_at: new Date().toISOString(),
        }])
      if (memberError) throw memberError

      setFamilyId(family.id)
      setFamilyName(family.name)
      navigate('/onboarding/partner')
    } catch (err) {
      setError(err.message || 'Failed to create family. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-primary mb-2">Create Your Family</h1>
        <p className="text-body text-text-secondary">Give your family a name to get started</p>
      </div>

      <Input
        label="Family Name"
        placeholder="e.g., The Shahs"
        value={familyName}
        onChange={(e) => setFamilyNameLocal(e.target.value)}
        error={error}
      />

      <Button
        className="w-full"
        onClick={handleContinue}
        disabled={!familyName.trim()}
        loading={loading}
      >
        Continue
      </Button>
    </div>
  )
}