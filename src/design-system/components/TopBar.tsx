import { Search, Bell, Plus, LogOut, ChevronDown, Command } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useLocation } from 'react-router-dom'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/calculators': 'Calculators',
  '/questionnaires': 'Reporting Frameworks',
  '/data': 'Data Collection',
  '/data/org-setup': 'Organisation Setup',
  '/data/raw-supplier': 'Raw & Supplier Data',
  '/data/measured': 'Measured Data',
  '/workflow': 'Workflow',
  '/aggregator': 'Aggregator',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/admin/org': 'Structure',
  '/admin/users': 'Users & Roles',
  '/admin/ef-library': 'EF Library',
  '/admin/gwp': 'GWP Values',
  '/admin/audit': 'Audit Trail',
  '/settings': 'Settings',
}

export default function TopBar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const firstName = user?.name?.split(' ')[0] || 'there'
  const pageTitle = routeLabels[location.pathname] || ''

  return (
    <header className="h-[60px] bg-[var(--bg-primary)]/80 glass border-b border-[var(--border-default)] flex items-center justify-between px-7 sticky top-0 z-20 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] leading-none">
            {pageTitle || `Hi, ${firstName}`}
          </h1>
          {pageTitle && (
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-none">
              Welcome back, {firstName}
            </p>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {/* Search (command palette style) */}
        <button className="flex items-center gap-2 h-8 pl-3 pr-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-all cursor-pointer group">
          <Search className="w-3.5 h-3.5" />
          <span className="text-[12px] hidden sm:inline">Search...</span>
          <span className="hidden sm:flex items-center gap-0.5 ml-2 text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
            <Command className="w-2.5 h-2.5" />K
          </span>
        </button>

        {/* Create */}
        <button className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-[var(--bg-inverse)] text-[var(--text-inverse)] text-[12px] font-semibold rounded-lg hover:bg-[var(--bg-inverse-soft)] active:scale-[0.97] transition-all cursor-pointer shadow-sm">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create</span>
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-[var(--accent-red)] text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-[var(--bg-primary)]">
            3
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-[var(--border-default)] mx-1.5" />

        {/* User menu */}
        <button className="flex items-center gap-2 h-8 pl-0.5 pr-2 rounded-lg hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent-teal)] to-emerald-500 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
            {firstName[0]}
          </div>
          <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-all cursor-pointer"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
