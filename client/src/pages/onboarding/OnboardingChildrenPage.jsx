import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Trash2 } from 'lucide-react'

const CHILD_COLORS = ['#534AB7', '#0F6E56', '#993C1D', '#854F0B', '#2D1B8E']

const emptyChild = () => ({ name: '', dob: '', school_name: '' })

export default function OnboardingChildrenPage() {
  const navigate = useNavigate()
  const { familyId } = useOnboardingStore()
  const [children, setChildren] = useState([emptyChild()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updateChild = (index, field, value) => {
    setChildren((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  const addChild = () => setChildren((prev) => [...prev, emptyChild()])

  const removeChild = (index) => {
    if (children.length === 1) return
    setChildren((prev) => prev.filter((_, i) => i !== index))
  }

  const handleContinue = async () => {
    const valid = children.every((c) => c.name.trim())
    if (!valid) { setError('Please enter a name for each child.'); return }
    setError('')
    setLoading(true)
    try {
      const rows = children.map((c, i) => ({
        family_id: familyId,
        name: c.name.trim(),
        dob: c.dob || null,
        school_name: c.school_name.trim() || null,
        color_hex: CHILD_COLORS[i % CHILD_COLORS.length],
      }))
      const { error: childError } = await supabase.from('children').insert(rows)
      if (childError) throw childError
      navigate('/onboarding/guardians')
    } catch (err) {
      setError(err.message || 'Failed to save children.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-primary mb-2">Add Your Children</h1>
        <p className="text-body text-text-secondary">Add at least one child to continue</p>
      </div>

      <div className="space-y-5">
        {children.map((child, index) => (
          <div key={index} className="bg-muted rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-h3 text-primary">Child {index + 1}</span>
              {children.length > 1 && (
                <button
                  onClick={() => removeChild(index)}
                  className="p-1 text-text-secondary hover:text-coral transition-colors"
                  aria-label="Remove child"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <Input
              label="Name"
              placeholder="Aarav"
              value={child.name}
              onChange={(e) => updateChild(index, 'name', e.target.value)}
            />
            <Input
              label="Date of birth"
              type="date"
              value={child.dob}
              onChange={(e) => updateChild(index, 'dob', e.target.value)}
            />
            <Input
              label="School name (optional)"
              placeholder="Delhi Public School"
              value={child.school_name}
              onChange={(e) => updateChild(index, 'school_name', e.target.value)}
            />
          </div>
        ))}
      </div>

      {error && <p className="text-caption text-coral">{error}</p>}

      <Button variant="ghost" className="w-full" onClick={addChild}>
        + Add Another Child
      </Button>

      <Button className="w-full" onClick={handleContinue} loading={loading}>
        Continue
      </Button>
    </div>
  )
}