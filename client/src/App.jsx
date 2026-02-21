import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Coach from './pages/Coach'
import Dashboard from './pages/Dashboard'
import Subscriptions from './pages/Subscriptions'
import Upload from './pages/Upload'

function App() {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <Navbar />
      <Routes>
        <Route path="/upload" element={<Upload />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </div>
  )
}

export default App
