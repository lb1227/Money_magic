import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import Coach from './pages/Coach'
import Dashboard from './pages/Dashboard'
import Subscriptions from './pages/Subscriptions'
import { clearStoredSession, getCurrentUser, signOut } from './lib/supabase'
import { getActiveDatasetId } from './lib/userProfileStore'

function App() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentUser, setCurrentUser] = useState(getCurrentUser())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const loadActiveDataset = async () => {
      if (!currentUser?.id) return

      try {
        const activeDatasetId = await getActiveDatasetId()
        if (activeDatasetId) {
          localStorage.setItem('datasetId', activeDatasetId)
        }
      } catch {
        // best effort sync
      }
    }

    loadActiveDataset()
  }, [currentUser])

  const handleLogout = async () => {
    await signOut().catch(() => null)
    clearStoredSession()
    localStorage.removeItem('datasetId')
    setCurrentUser(null)
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <Navbar
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((prev) => !prev)}
        isAuthenticated={Boolean(currentUser)}
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
        onSignedIn={() => setCurrentUser(getCurrentUser())}
      />
    </div>
  )
}

export default App
