import { useLocation, useNavigate } from 'react-router-dom'
import { Search, ChevronDown, User, ChevronRight, LogOut } from 'lucide-react'
import { mockData } from '../data/mockData'
import { useAuth } from '../auth/AuthContext'
import LanguageSelector from './LanguageSelector'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { language } = useLanguage()

  // Generate breadcrumbs based on current route
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean)
    const breadcrumbs: { label: string; path: string }[] = []

    if (paths.length === 0) return breadcrumbs

    // Modules
    if (paths[0] === 'modules') {
      breadcrumbs.push({ label: 'Modules', path: '/modules' })

      if (paths[1]) {
        const module = mockData.modules.find(m => m.id === paths[1])
        breadcrumbs.push({ label: module?.title || paths[1], path: `/modules/${paths[1]}` })

        if (paths[2] === 'questionnaire') {
          breadcrumbs.push({ label: 'Questionnaire', path: `/modules/${paths[1]}/questionnaire` })
        } else if (paths[2] === 'review') {
          breadcrumbs.push({ label: 'Review', path: `/modules/${paths[1]}/review` })
        }
      }
    }
    // Analytics
    else if (paths[0] === 'analytics') {
      breadcrumbs.push({ label: 'Analytics Dashboard', path: '/analytics' })
    }
    // Executive
    else if (paths[0] === 'executive') {
      breadcrumbs.push({ label: 'Executive Overview', path: '/executive' })
    }
    // Evidence
    else if (paths[0] === 'evidence') {
      breadcrumbs.push({ label: 'Evidence Library', path: '/evidence' })
    }
    // Verify
    else if (paths[0] === 'verify') {
      breadcrumbs.push({ label: 'Verification Center', path: '/verify' })
    }
    // Events
    else if (paths[0] === 'events') {
      breadcrumbs.push({ label: 'Anchors & Events', path: '/events' })
    }
    // Reports
    else if (paths[0] === 'reports') {
      breadcrumbs.push({ label: 'Reports', path: '/reports' })
      if (paths[1]) {
        breadcrumbs.push({ label: paths[1], path: `/reports/${paths[1]}` })
        if (paths[2] === 'build') {
          breadcrumbs.push({ label: 'Build', path: `/reports/${paths[1]}/build` })
        }
      }
    }
    // Admin
    else if (paths[0] === 'admin') {
      breadcrumbs.push({ label: 'Admin & Settings', path: '/admin' })
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-dark-surface border-b border-dark-border z-50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left section */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border cursor-pointer hover:border-accent transition-colors">
            <span className="text-sm font-medium">Asyad</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border cursor-pointer hover:border-accent transition-colors">
            <span className="text-sm font-medium">FY2025</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-600" />
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`text-sm transition-colors ${index === breadcrumbs.length - 1
                      ? 'text-white font-medium'
                      : 'text-gray-400 hover:text-accent'
                      }`}
                  >
                    {crumb.label}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center section - Global filters */}
        <div className="flex items-center gap-3">
          <select className="px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-sm cursor-pointer hover:border-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent">
            <option>Business Unit</option>
            <option>Logistics</option>
            <option>Maritime</option>
          </select>
          <input
            type="date"
            className="px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-sm cursor-pointer hover:border-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-1.5 w-64 rounded-lg bg-dark-bg border border-dark-border text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {/* Language Selector */}
          <LanguageSelector />

          {/* User / logout */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col items-end text-xs leading-tight">
              <span className="text-gray-300 font-medium">
                {user?.name ?? 'Demo user'}
              </span>
              <span className="text-gray-500">{user?.email ?? 'admin@aeiforo.co.uk'}</span>
            </div>
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-dark-bg transition-colors border border-transparent hover:border-dark-border"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
              title={t(language, 'common.logout')}
            >
              <User className="w-5 h-5" />
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

