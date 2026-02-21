import { useState } from 'react'
import { signIn, signUp, supabaseEnabled } from '../lib/supabase'

function AuthGate({ onAuthed }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabaseEnabled) {
      setMessage('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable login/signup.')
      return
    }

        try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      setMessage(isSignUp ? 'Account created. Check your email if confirmation is enabled.' : 'Logged in!')
    } catch (error) {
      setMessage(error.message)
      return
    }
    onAuthed()
  }

  return (
    <section className="mx-auto mt-14 max-w-md rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{isSignUp ? 'Create account' : 'Welcome back'}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Sign in with Supabase to save your magical budget space.</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} placeholder="Password" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
        <button className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500">{isSignUp ? 'Sign up' : 'Log in'}</button>
      </form>
      {message && <p className="mt-3 text-sm text-indigo-600 dark:text-indigo-300">{message}</p>}
      <button className="mt-3 text-sm text-slate-600 underline dark:text-slate-300" onClick={() => setIsSignUp((s) => !s)}>
        {isSignUp ? 'Already have an account? Log in' : 'Need an account? Sign up'}
      </button>
    </section>
  )
}

export default AuthGate
