import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Coach from './pages/Coach'
import Dashboard from './pages/Dashboard'
import Subscriptions from './pages/Subscriptions'
import Upload from './pages/Upload'
import AuthGate from './components/AuthGate'
import QuickAddFab from './components/QuickAddFab'

function Shell() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <Navbar theme={theme} toggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
      <Routes>
        <Route path="/upload" element={<Upload />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
      <QuickAddFab onSelect={() => navigate('/upload')} />
    </div>
  )
}

function App() {
  const [authed, setAuthed] = useState(false)

  if (!authed) {
    return <AuthGate onAuthed={() => setAuthed(true)} />
  }

  return <Shell />
}

export default App
