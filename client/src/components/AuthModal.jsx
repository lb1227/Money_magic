import { useEffect, useMemo, useState } from 'react'

const USERS_KEY = 'moneyMagicUsers'
const SESSION_KEY = 'moneyMagicSessionEmail'

const readUsers = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function AuthModal({ open, onClose, onSignedIn }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setMode('login')
    setEmail('')
    setPassword('')
    setError('')
  }, [open])

  const title = useMemo(() => (mode === 'signup' ? 'Create account' : 'Log in'), [mode])

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const users = readUsers()

    if (mode === 'login') {
      if (!users[normalizedEmail]) {
        setError('No email found. Do you want to make an account?')
        return
      }
      if (users[normalizedEmail] !== password) {
        setError('Incorrect password.')
        return
      }

      localStorage.setItem(SESSION_KEY, normalizedEmail)
      onSignedIn(normalizedEmail)
      onClose()
      return
    }

    if (users[normalizedEmail]) {
      setError('This email already has an account. Please log in.')
      return
    }

    const nextUsers = { ...users, [normalizedEmail]: password }
    localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers))
    localStorage.setItem(SESSION_KEY, normalizedEmail)
    onSignedIn(normalizedEmail)
    onClose()
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
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {error}{' '}
              {mode === 'login' && error.toLowerCase().startsWith('no email found') ? (
                <button
                  type="button"
                  onClick={switchToSignup}
                  className="font-medium underline"
                >
                  Yes, switch to sign up
                </button>
              ) : null}
            </p>
          )}

          <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
            {mode === 'signup' ? 'Sign up' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export { SESSION_KEY }
export default AuthModal
