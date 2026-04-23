import { Search, LogOut, ChevronDown, Command } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useLocation } from 'react-router-dom'
import { FrameworkSelector } from '../../components/FrameworkBadge'
import NotificationsBell from '../../components/NotificationsBell'
import { useOpenPalette } from '../../components/AppShell'

const routeLabels: Record<string, { title: string; section?: string }> = {
  '/dashboard':          { title: 'Overview',          section: 'Your work' },
  '/my-tasks':           { title: 'My tasks',          section: 'Your work' },
  '/calculators':        { title: 'Calculators' },
  '/questionnaires':     { title: 'Frameworks' },
  '/data':               { title: 'Data collection' },
  '/data/org-setup':     { title: 'Organisation setup' },
  '/data/raw-supplier':  { title: 'Raw & supplier data' },
  '/data/measured':      { title: 'Measured data' },
  '/workflow':           { title: 'Workflow' },
  '/workflow/review':    { title: 'Review queue',      section: 'Pipeline' },
  '/workflow/approval':  { title: 'Approval queue',    section: 'Pipeline' },
  '/aggregator':         { title: 'Group rollup',      section: 'Pipeline' },
  '/reports':            { title: 'Reports',           section: 'Pipeline' },
  '/reports/index':      { title: 'GRI index',         section: 'Pipeline' },
  '/analytics':          { title: 'Analytics',         section: 'Reference' },
  '/onboarding':         { title: 'Onboarding',        section: 'Admin' },
  '/admin/org':          { title: 'Structure',         section: 'Admin' },
  '/admin/periods':      { title: 'Reporting cycles',  section: 'Admin' },
  '/admin/materiality':  { title: 'Materiality',       section: 'Admin' },
  '/admin/assignments':  { title: 'Assignments',       section: 'Admin' },
  '/admin/users':        { title: 'Users & roles',     section: 'Admin' },
  '/admin/ef-library':   { title: 'EF library',        section: 'Reference' },
  '/admin/gwp':          { title: 'GWP values',        section: 'Reference' },
  '/admin/audit':        { title: 'Audit trail',       section: 'System' },
  '/settings':           { title: 'Settings',          section: 'System' },
}

export default function TopBar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const firstName = user?.name?.split(' ')[0] || 'there'
  const route = routeLabels[location.pathname]
  const openPalette = useOpenPalette()

  return (
    <header
      className="h-[52px] flex items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0 relative"
      style={{
        background: 'rgba(247,248,250,0.85)',
        backdropFilter: 'saturate(160%) blur(12px)',
        WebkitBackdropFilter: 'saturate(160%) blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {route?.section && (
          <>
            <span className="text-[12.5px] text-[var(--text-tertiary)] font-medium">{route.section}</span>
            <span className="text-[var(--text-quaternary)] text-[10px]">/</span>
          </>
        )}
        <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.01em] truncate">
          {route?.title ?? `Hi, ${firstName}`}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Framework selector */}
        <FrameworkSelector size="sm" />

        <div className="w-px h-5 bg-[var(--border-default)] mx-1" />

        {/* Search (command palette style) */}
        <button
          onClick={openPalette}
          className="flex items-center gap-2 h-8 pl-3 pr-1.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-colors duration-[120ms] ease-[var(--ease-out-expo)] cursor-pointer"
          aria-label="Open command palette"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-[12.5px] hidden sm:inline font-medium">Search or jump to…</span>
          <span className="hidden sm:flex items-center gap-0.5 ml-3 kbd">
            <Command className="w-2.5 h-2.5" />K
          </span>
        </button>

        {/* Live notifications */}
        <NotificationsBell />

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--border-default)] mx-1" />

        {/* User menu */}
        <button className="flex items-center gap-2 h-8 pl-0.5 pr-2 rounded-[8px] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #2fa98e, #1B6B7B)',
              boxShadow: '0 2px 6px rgba(27,107,123,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {firstName[0]}
          </div>
          <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-all cursor-pointer"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
