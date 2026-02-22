import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import Coach from './pages/Coach'
import Dashboard from './pages/Dashboard'
import Subscriptions from './pages/Subscriptions'
import { supabase } from './lib/supabase'

function App() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [sessionEmail, setSessionEmail] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        setSessionEmail('')
        return
      }

      setSessionEmail(data?.session?.user?.email || '')
    }

    syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email || '')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSessionEmail('')
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <Navbar
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((prev) => !prev)}
        isAuthenticated={Boolean(sessionEmail)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignedIn={(email) => setSessionEmail(email)}
      />
    </div>
  )
}

export default App
