import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const getAuthErrorMessage = (message = '', mode) => {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password. Please try again.'
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email address before logging in.'
  }

  if (normalized.includes('already registered') || normalized.includes('user already registered')) {
    return 'This email is already registered. Please log in instead.'
  }

  if (normalized.includes('password should be at least')) {
    return 'Password is too weak. Use at least 6 characters.'
  }

  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  if (normalized.includes('missing supabase configuration')) {
    return 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your client .env.'
  }

  if (normalized.includes('unable to reach authentication service') || normalized.includes('failed to fetch')) {
    return 'Could not reach Supabase. Please verify your URL/key and network, then try again.'
  }

  if (normalized.includes('invalid email')) {
    return 'Please enter a valid email address.'
  }

  if (mode === 'login') {
    return 'Unable to log in right now. Please try again.'
  }

  return 'Unable to sign up right now. Please try again.'
}

function AuthModal({ open, onClose, onSignedIn }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode('login')
    setEmail('')
    setPassword('')
    setError('')
    setIsSubmitting(false)
  }, [open])

  const title = useMemo(() => (mode === 'signup' ? 'Create account' : 'Log in'), [mode])

  if (!open) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    if (!normalizedEmail || !normalizedPassword) {
      setError('Email and password are required.')
      return
    }

    setIsSubmitting(true)

    let response
    if (mode === 'signup') {
      response = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
      })
    } else {
      response = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      })
    }

    const { data, error: authError } = response

    if (authError) {
      setError(getAuthErrorMessage(authError.message, mode))
      setIsSubmitting(false)
      return
    }

    const signedInEmail = data?.user?.email || normalizedEmail
    onSignedIn(signedInEmail)
    onClose()
    setIsSubmitting(false)
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
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={isSubmitting}>
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
            disabled={isSubmitting}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />

          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Sign up' : 'Log in'}
          </button>

          {mode === 'login' ? (
            <button
              type="button"
              className="w-full text-sm text-indigo-600 underline"
              onClick={switchToSignup}
              disabled={isSubmitting}
            >
              Need an account? Sign up
            </button>
          ) : null}
        </form>
      </div>
    </div>
  )
}

export default AuthModal
