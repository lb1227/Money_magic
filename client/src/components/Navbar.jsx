import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/coach', label: 'Coach' },
]

function Navbar({ darkMode, onToggleTheme, isAuthenticated, onOpenAuthModal, onLogout }) {
  return (
    <nav className="mb-6 rounded-2xl border border-indigo-200/40 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 p-[1px] shadow-glow" aria-label="Main navigation">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 dark:bg-slate-900/95">
        <h1 className="text-lg font-semibold tracking-tight text-indigo-700 dark:text-indigo-300">MoneyMagic</h1>
        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white"
            >
              Log out
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
            >
              Log in
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
