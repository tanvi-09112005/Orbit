import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Supabase sets the session automatically when user lands via reset link
  const handleReset = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      navigate('/home')
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-primary mb-2">Set new password</h1>
        <p className="text-body text-text-secondary">Choose a new password for your account.</p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-coral-light border border-coral">
            <p className="text-body text-coral">{error}</p>
          </div>
        )}
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helper="At least 6 characters"
          disabled={loading}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" className="w-full" loading={loading}>
          Reset Password
        </Button>
      </form>
    </div>
  )
}