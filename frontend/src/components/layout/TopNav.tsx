import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/datasets': 'Datasets',
  '/analyses/new': 'New Analysis',
  '/anomalies': 'Anomaly Explorer',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/datasets/')) return 'Dataset Details'
  if (pathname.startsWith('/analyses/')) return 'Analysis Results'
  return 'ClinicalAD'
}

export function TopNav() {
  const { user } = useAuthStore()
  const { pathname } = useLocation()
  const title = getPageTitle(pathname)

  return (
    <header
      className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-40"
    >
      {/* Left: Page title */}
      <div>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search…"
            className="input-field pl-9 py-1.5 w-48 text-xs border-gray-200 h-9"
          />
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all">
          <Bell size={16} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"
          />
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer bg-gray-900 text-white"
          title={user?.name ?? 'User'}
        >
          {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  )
}
