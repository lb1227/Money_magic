import { NavLink } from 'react-router-dom'

const links = [
  { to: '/upload', label: 'Upload + Manual' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/coach', label: 'Coach' },
]

function Navbar({ theme, toggleTheme }) {
  return (
    <nav className="mb-6 rounded-xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/85" aria-label="Main navigation">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-lg font-bold text-transparent">BudgetBuddy Magic</h1>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button onClick={toggleTheme} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
