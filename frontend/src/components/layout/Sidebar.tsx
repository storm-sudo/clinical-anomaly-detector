import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  Activity,
  AlertTriangle,
  FileText,
  Settings,
  LogOut,
  Dna,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/analyses/new', label: 'Analyses', icon: Activity },
  { to: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: FileText },
]

const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col border-r border-gray-200 relative bg-white"
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <NavLink to="/dashboard" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-black text-white shadow-sm"
          >
            <Dna size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-none">ClinicalAD</div>
            <div className="text-xs text-gray-500 mt-0.5">Anomaly Detector</div>
          </div>
        </NavLink>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider px-2 mb-2">
          Navigation
        </div>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                isActive
                  ? 'text-white bg-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  className={`flex-shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                <span>{label}</span>
                {isActive && (
                  <ChevronRight size={14} className="ml-auto text-white/50" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Quick action */}
        <div className="pt-4 pb-2">
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider px-2 mb-2">
            Quick Actions
          </div>
          <NavLink
            to="/analyses/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-black hover:bg-gray-800 text-white shadow-sm transition-all"
          >
            <Activity size={14} />
            New Analysis
          </NavLink>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3 space-y-0.5">
        {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'text-white bg-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            <Icon size={17} className="flex-shrink-0 text-gray-400" />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* User info */}
        <div
          className="mt-2 px-3 py-2.5 rounded-xl flex items-center gap-3 border border-gray-100 bg-gray-50"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold bg-gray-900 text-white"
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-900 truncate">{user?.name ?? 'User'}</div>
            <div className="text-[10px] text-gray-500 truncate font-medium uppercase tracking-wider">{user?.role ?? 'USER'}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all flex-shrink-0"
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
