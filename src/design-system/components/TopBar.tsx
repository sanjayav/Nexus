import { useEffect, useRef, useState } from 'react'
import { Search, LogOut, ChevronDown, Command, Globe, Plus, ClipboardList, Paperclip, UserCog, FileText, Sparkles } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FrameworkSelector } from '../../components/FrameworkBadge'
import NotificationsBell from '../../components/NotificationsBell'
import { useOpenPalette } from '../../components/AppShell'

const routeLabels: Record<string, { title: string; section?: string }> = {
  // Work
  '/':                   { title: 'My Day',              section: 'Work' },
  '/my-day':             { title: 'My Day',              section: 'Work' },
  '/dashboard':          { title: 'Overview',            section: 'Work' },
  '/my-tasks':           { title: 'Tasks',               section: 'Work' },
  '/inbox':              { title: 'Inbox',               section: 'Work' },
  '/work/calendar':      { title: 'Calendar',            section: 'Work' },
  '/work/review':        { title: 'Review queue',        section: 'Work' },
  '/work/approval':      { title: 'Approval queue',      section: 'Work' },
  // Reports
  '/reports':            { title: 'Active Reports',      section: 'Reports' },
  '/reports/templates':  { title: 'Templates',           section: 'Reports' },
  '/reports/library':    { title: 'Disclosures Library', section: 'Reports' },
  '/reports/index':      { title: 'Disclosures Library', section: 'Reports' },
  '/reports/ai':         { title: 'AI Report',           section: 'Analytics' },
  // Data
  '/data':               { title: 'Values',              section: 'Data' },
  '/data/spreadsheet':   { title: 'Spreadsheet',         section: 'Data' },
  '/data/evidence':      { title: 'Evidence',            section: 'Data' },
  '/data/connectors':    { title: 'Connectors',          section: 'Data' },
  '/data/ef-library':    { title: 'Emission factors',    section: 'Data' },
  '/data/anomalies':     { title: 'Anomalies',           section: 'Data' },
  '/calculators':        { title: 'Calculators',         section: 'Data' },
  // Analytics
  '/analytics':          { title: 'Analytics',           section: 'Analytics' },
  // Legacy aliases — keep so deep links still get a readable breadcrumb.
  '/questionnaires':     { title: 'Templates',           section: 'Reports' },
  '/workflow':           { title: 'Workflow' },
  '/workflow/review':    { title: 'Review queue',        section: 'Work' },
  '/workflow/approval':  { title: 'Approval queue',      section: 'Work' },
  '/aggregator':         { title: 'Group rollup',        section: 'Reports' },
  // Admin tray
  '/onboarding':         { title: 'Onboarding',          section: 'Admin' },
  '/admin/org':          { title: 'Organisation',        section: 'Admin' },
  '/admin/periods':      { title: 'Reporting cycles',    section: 'Admin' },
  '/admin/materiality':  { title: 'Materiality Assessment', section: 'Admin' },
  '/admin/assignments':  { title: 'Values',              section: 'Admin' },
  '/admin/users':        { title: 'Users & Roles',       section: 'Admin' },
  '/admin/ef-library':   { title: 'Emission factors',    section: 'Admin' },
  '/admin/gwp':          { title: 'GWP values',          section: 'Admin' },
  '/admin/audit':        { title: 'Activity History',    section: 'Admin' },
  '/admin/data-standard':{ title: 'Data Standard',       section: 'Admin' },
  '/admin/targets':      { title: 'Climate Targets',     section: 'Admin' },
  '/admin/blockchain':   { title: 'Blockchain',          section: 'Admin' },
  '/admin/system-status':{ title: 'System Status',       section: 'Admin' },
  '/admin/api-keys':     { title: 'API Keys',            section: 'Admin' },
  '/admin/scim':         { title: 'SCIM',                section: 'Admin' },
  '/settings':           { title: 'Settings',            section: 'Admin' },
  '/admin/settings':     { title: 'Settings',            section: 'Admin' },
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

        {/* Universal create */}
        <NewMenu />

        <div className="w-px h-5 bg-[var(--border-default)] mx-1" />

        {/* Search (command palette style) */}
        <button
          data-tour="topbar-search"
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

        {/* Language switcher */}
        <LanguageSwitcher />

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

/** Universal "+ New" menu — appears in the TopBar between framework and search. */
function NewMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  // Close on outside click + ESC.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    if (open) {
      document.addEventListener('mousedown', onDown)
      document.addEventListener('keydown', onKey)
    }
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Keyboard shortcut: `n` to open (skipped when typing into a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return
      e.preventDefault()
      setOpen(o => !o)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const go = (to: string) => { setOpen(false); navigate(to) }

  // Pick up the last visited framework so "New value" jumps straight back
  // into the editor users were in. Falls back to the CSRD E1 starter.
  const lastFramework = (() => {
    try { return localStorage.getItem('aeiforo_last_framework') || 'csrd-e1' }
    catch { return 'csrd-e1' }
  })()

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Create something new (n)"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 h-8 pl-2 pr-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors text-[12.5px] font-semibold cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">New</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Create new"
          className="absolute right-0 top-full mt-1.5 min-w-[240px] surface-paper p-1.5 shadow-lg z-50 rounded-[10px]"
        >
          <NewMenuItem icon={ClipboardList} label="New value" hint="Open the disclosure editor" onClick={() => go(`/disclosure-editor/${lastFramework}?view=spreadsheet`)} />
          <NewMenuItem icon={Paperclip} label="New evidence" hint="Upload a supporting file" onClick={() => go('/data/evidence?upload=1')} />
          <NewMenuItem icon={UserCog} label="New assignment" hint="Bulk-assign disclosures" onClick={() => go('/data?action=bulk-assign')} />
          <NewMenuItem icon={FileText} label="New report" hint="Generate a published report" onClick={() => go('/reports?action=new-report')} />
          <NewMenuItem icon={Sparkles} label="Generate AI narrative" hint="Draft from approved data" onClick={() => go('/reports/ai')} />
          <div className="border-t border-[var(--border-subtle)] my-1" />
          <div className="px-2 py-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] flex items-center justify-between">
            <span>Shortcut</span>
            <span className="kbd">n</span>
          </div>
        </div>
      )}
    </div>
  )
}

function NewMenuItem({
  icon: Icon, label, hint, onClick,
}: {
  icon: typeof Plus
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-[8px] hover:bg-[var(--bg-tertiary)] transition-colors"
    >
      <span className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 bg-[var(--accent-teal-subtle)] text-[var(--color-brand)]">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-[var(--text-primary)] leading-tight">{label}</div>
        <div className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">{hint}</div>
      </div>
    </button>
  )
}

const LOCALES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'th', label: 'ไทย' },
]

function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-lang-switcher]')) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const current = LOCALES.find(l => l.code === i18n.language)?.label
    ?? LOCALES.find(l => i18n.language?.startsWith(l.code))?.label
    ?? 'English'

  return (
    <div className="relative" data-lang-switcher>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-2 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        title={t('language.label')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4" />
        <span className="text-[12px] font-medium hidden md:inline">{current}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 min-w-[140px] surface-paper p-1 shadow-lg z-50">
          {LOCALES.map(l => (
            <button
              key={l.code}
              role="menuitem"
              type="button"
              onClick={() => { void i18n.changeLanguage(l.code); setOpen(false) }}
              className={`block w-full text-left px-2 py-1.5 text-[12.5px] rounded hover:bg-[var(--bg-tertiary)] ${i18n.language === l.code ? 'font-semibold text-[var(--color-brand)]' : 'text-[var(--text-secondary)]'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
