import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const { login, signup } = useAuthStore()
  const { fetchFamily } = useFamilyStore()

  const [step, setStep] = useState('loading')
  const [familyName, setFamilyName] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [memberId, setMemberId] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1: validate token
  useEffect(() => {
    if (!token) { setStep('invalid'); return }
    validateToken()
  }, [token])

  const validateToken = async () => {
    const { data, error } = await supabase
      .from('family_members')
      .select('id, role, family_id, user_id, families(name)')
      .eq('invite_token', token)
      .maybeSingle()

    if (error || !data) { setStep('invalid'); return }

    if (data.user_id) {
      setStep('already_claimed'); return
    }

    setMemberId(data.id)
    setFamilyName(data.families?.name || 'Your Family')
    setInviteRole(data.role)
    setStep('preview')
  }

  // Step 2: claim — called after auth is confirmed
  // memberId is captured in closure; we pass it explicitly to avoid stale state
  const claimInvite = async (resolvedMemberId) => {
    setStep('joining')
    try {
      // Get current user directly from Supabase — don't rely on store timing
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      if (userError || !currentUser) throw new Error('Session not found after auth')

      const { error: updateError } = await supabase
        .from('family_members')
        .update({
          user_id: currentUser.id,
          joined_at: new Date().toISOString(),
          invite_token: null,
        })
        .eq('id', resolvedMemberId)
        .is('user_id', null) // only claim if still unclaimed

      if (updateError) throw updateError

      // Small delay to let DB write propagate before fetching
      await new Promise((r) => setTimeout(r, 500))
      await fetchFamily()

      setStep('done')
      setTimeout(() => navigate('/home', { replace: true }), 1500)
    } catch (err) {
      console.error('Claim failed:', err)
      setStep('error')
    }
  }

  const handleSignup = async () => {
    if (!name.trim()) { setAuthError('Name is required'); return }
    if (!email.trim() || !password) { setAuthError('Email and password are required'); return }
    setAuthError('')
    setLoading(true)
    const capturedMemberId = memberId // capture before any async state changes
    try {
      await signup(email.trim(), password, name.trim())
      await claimInvite(capturedMemberId)
    } catch (err) {
      setAuthError(err.message)
      setStep('signup') // go back on failure
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) { setAuthError('Email and password are required'); return }
    setAuthError('')
    setLoading(true)
    const capturedMemberId = memberId
    try {
      await login(email.trim(), password)
      await claimInvite(capturedMemberId)
    } catch (err) {
      setAuthError(err.message)
      setStep('login')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────

  if (step === 'loading') return (
    <JoinShell>
      <p className="text-body text-text-secondary text-center">Checking invite...</p>
    </JoinShell>
  )

  if (step === 'invalid') return (
    <JoinShell>
      <div className="text-center space-y-3">
        <p className="text-3xl">🔗</p>
        <h1 className="text-h1 text-primary">Invalid invite</h1>
        <p className="text-body text-text-secondary">This link is invalid or has already been used.</p>
        <Button onClick={() => navigate('/login')} className="w-full mt-4">Go to Login</Button>
      </div>
    </JoinShell>
  )

  if (step === 'already_claimed') return (
    <JoinShell>
      <div className="text-center space-y-3">
        <p className="text-3xl">✅</p>
        <h1 className="text-h1 text-primary">Already joined</h1>
        <p className="text-body text-text-secondary">This invite has already been used. Just log in.</p>
        <Button onClick={() => navigate('/login')} className="w-full mt-4">Go to Login</Button>
      </div>
    </JoinShell>
  )

  if (step === 'joining') return (
    <JoinShell>
      <div className="text-center space-y-3">
        <p className="text-2xl animate-pulse">⏳</p>
        <p className="text-body text-text-secondary">Joining {familyName}...</p>
      </div>
    </JoinShell>
  )

  if (step === 'done') return (
    <JoinShell>
      <div className="text-center space-y-3">
        <p className="text-4xl">🎉</p>
        <h1 className="text-h1 text-primary">You're in!</h1>
        <p className="text-body text-text-secondary">Welcome to {familyName}. Taking you there now...</p>
      </div>
    </JoinShell>
  )

  if (step === 'error') return (
    <JoinShell>
      <div className="text-center space-y-3">
        <p className="text-3xl">⚠️</p>
        <h1 className="text-h1 text-primary">Something went wrong</h1>
        <p className="text-body text-text-secondary">Couldn't link you to the family. Check console for details.</p>
        <Button onClick={() => setStep('preview')} className="w-full mt-4">Try Again</Button>
      </div>
    </JoinShell>
  )

  if (step === 'preview') return (
    <JoinShell>
      <div className="text-center space-y-2 mb-8">
        <p className="text-4xl">👋</p>
        <h1 className="text-h1 text-primary">You've been invited</h1>
        <p className="text-body text-text-secondary">
          Join <span className="font-semibold text-primary">{familyName}</span> as a{' '}
          <span className="font-semibold capitalize">{inviteRole}</span>
        </p>
      </div>
      <div className="space-y-3">
        <Button className="w-full" onClick={() => setStep('signup')}>Create account</Button>
        <Button variant="secondary" className="w-full" onClick={() => setStep('login')}>I have an account</Button>
      </div>
    </JoinShell>
  )

  if (step === 'signup') return (
    <JoinShell>
      <div className="space-y-2 mb-6 text-center">
        <h1 className="text-h1 text-primary">Create your account</h1>
        <p className="text-body text-text-secondary">You'll join {familyName} automatically</p>
      </div>
      <div className="space-y-4">
        <Input label="Your name" placeholder="Priya" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {authError && <p className="text-caption text-coral">{authError}</p>}
        <Button className="w-full" onClick={handleSignup} loading={loading}>Join Family</Button>
        <button onClick={() => setStep('preview')} className="w-full text-body text-text-secondary hover:text-primary transition-colors">Back</button>
      </div>
    </JoinShell>
  )

  if (step === 'login') return (
    <JoinShell>
      <div className="space-y-2 mb-6 text-center">
        <h1 className="text-h1 text-primary">Log in to join</h1>
        <p className="text-body text-text-secondary">You'll join {familyName} automatically</p>
      </div>
      <div className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {authError && <p className="text-caption text-coral">{authError}</p>}
        <Button className="w-full" onClick={handleLogin} loading={loading}>Join Family</Button>
        <button onClick={() => setStep('preview')} className="w-full text-body text-text-secondary hover:text-primary transition-colors">Back</button>
      </div>
    </JoinShell>
  )

  return null
}

function JoinShell({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h2 className="text-h2 text-primary font-serif">Family OS</h2>
        </div>
        {children}
      </div>
    </div>
  )
}