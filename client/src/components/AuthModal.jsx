import { useEffect, useMemo, useState } from 'react'
import {
  isSupabaseConfigured,
  signInWithPassword,
  signUpWithPassword,
} from '../lib/supabase'

function AuthModal({ open, onClose, onSignedIn }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode('login')
    setEmail('')
    setPassword('')
    setError('')
  }, [open])

  const title = useMemo(() => (mode === 'signup' ? 'Create account' : 'Log in'), [mode])

  if (!open) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    setLoading(true)

    try {
      if (mode === 'login') {
        await signInWithPassword(normalizedEmail, password)
        onSignedIn()
        onClose()
        return
      }

      const result = await signUpWithPassword(normalizedEmail, password)
      const needsEmailConfirm = !result?.access_token
      if (needsEmailConfirm) {
        setError('Account created. Check your email to confirm, then log in.')
        setMode('login')
        return
      }

      onSignedIn()
      onClose()
    } catch (submitError) {
      const message = String(submitError?.message || '').toLowerCase()

      if (mode === 'login' && (message.includes('invalid login credentials') || message.includes('email not confirmed'))) {
        setError('No email found. Do you want to make an account?')
      } else if (mode === 'signup' && message.includes('already registered')) {
        setError('This email already has an account. Please log in.')
      } else {
        setError(submitError?.message || 'Authentication failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchToSignup = () => {
    setMode('signup')
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-label="Authentication">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            Close
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {error}{' '}
              {mode === 'login' && error.toLowerCase().startsWith('no email found') ? (
                <button type="button" onClick={switchToSignup} className="font-medium underline">
                  Yes, switch to sign up
                </button>
              ) : null}
            </p>
          )}

          <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Sign up' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AuthModal
