import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuthStore()
  const { addToast } = useUIStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields'); return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match'); return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters'); return
    }
    if (!agreed) {
      setError('Please agree to the Terms and Privacy Policy'); return
    }
    setLoading(true)
    try {
      await signup(email, password, name)
      navigate('/onboarding/family')
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-primary mb-2">Create Account</h1>
        <p className="text-body text-text-secondary">Join Family OS to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-coral-light border border-coral">
            <p className="text-body text-coral">{error}</p>
          </div>
        )}

        <Input
          label="Full Name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          helper="At least 6 characters"
        />
        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />

        {/* Terms checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 accent-primary"
            disabled={loading}
          />
          <span className="text-body text-text-secondary">
            I agree to the{' '}
            <a href="/terms" target="_blank" className="text-primary underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="text-primary underline">
              Privacy Policy
            </a>
          </span>
        </label>

        <Button type="submit" className="w-full" loading={loading} disabled={loading}>
          Create Account
        </Button>
      </form>

      <p className="text-center text-body">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}