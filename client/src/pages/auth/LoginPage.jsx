import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { addToast } = useUIStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    try {
      await login(email, password)
      addToast('Welcome back!', 'success')
      navigate('/home')
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-primary mb-2">Welcome Back</h1>
        <p className="text-body text-text-secondary">Sign in to your Family OS account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-coral-light border border-coral">
            <p className="text-body text-coral">{error}</p>
          </div>
        )}

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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <Button type="submit" className="w-full" loading={loading} disabled={loading}>
          Sign In
        </Button>
      </form>
      <div className="text-right -mt-2">
  <Link to="/forgot-password" className="text-caption text-primary hover:underline">
    Forgot password?
  </Link>
</div>

      <p className="text-center text-body">
        Don't have an account?{' '}
        <Link to="/signup" className="text-primary font-semibold hover:underline">
          Sign up
        </Link>
      </p>
      <div className="mt-8 text-center space-x-4">
  <a href="/privacy" className="text-caption text-text-secondary hover:text-primary">Privacy Policy</a>
  <span className="text-caption text-text-secondary">·</span>
  <a href="/terms" className="text-caption text-text-secondary hover:text-primary">Terms of Service</a>
</div>
    </div>
    
  )
}