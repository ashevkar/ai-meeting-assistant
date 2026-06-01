import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV_LINKS = [
  { to: '/dashboard',     label: 'Dashboard' },
  { to: '/action-items',  label: 'Action Items' },
  { to: '/chat',          label: 'Ask AI' },
  { to: '/settings',      label: 'Settings' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()

  if (['/login', '/register'].includes(pathname)) return null

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 text-primary-600 font-bold text-lg hover:text-primary-700 transition-colors shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span>MeetingAI</span>
          </Link>

          <div className="hidden sm:flex items-center gap-1 flex-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {user && (
              <>
                <span className="text-sm text-gray-600 hidden md:block truncate max-w-[160px]">
                  {user.full_name || user.email}
                </span>
                <button onClick={logout} className="btn-secondary text-sm shrink-0">
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
