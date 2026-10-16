import { useEffect, useRef, useState } from 'react'
import { Search, LogOut, ChevronDown, Command, Globe, Plus, ClipboardList, Paperclip, UserCog, FileText, Sparkles, Menu } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FrameworkSelector } from '../../components/FrameworkBadge'
import NotificationsBell from '../../components/NotificationsBell'
import { useOpenPalette, useMobileNav } from '../../components/AppShell'
import ThemeToggle from '../../components/ThemeToggle'
import { setUiLanguage } from '../../components/settings/languagePreference'

/** Values are i18n keys, rendered with t(). */
const routeLabels: Record<string, { title: string; section?: string }> = {
  // Work
  '/':                   { title: 'shell.nav.items.myDay',              section: 'shell.nav.groups.work' },
  '/my-day':             { title: 'shell.nav.items.myDay',              section: 'shell.nav.groups.work' },
  '/dashboard':          { title: 'shell.nav.items.myDay',              section: 'shell.nav.groups.work' },
  '/my-tasks':           { title: 'shell.nav.items.tasks',               section: 'shell.nav.groups.work' },
  '/inbox':              { title: 'shell.nav.items.inbox',               section: 'shell.nav.groups.work' },
  '/work/calendar':      { title: 'shell.routes.calendar',            section: 'shell.nav.groups.work' },
  '/work/review':        { title: 'shell.routes.reviewQueue',        section: 'shell.nav.groups.work' },
  '/work/approval':      { title: 'shell.routes.approvalQueue',      section: 'shell.nav.groups.work' },
  // Reports
  '/reports':            { title: 'shell.nav.items.activeReports',      section: 'shell.nav.groups.reports' },
  '/reports/templates':  { title: 'shell.nav.items.templates',           section: 'shell.nav.groups.reports' },
  '/reports/library':    { title: 'shell.nav.items.disclosuresLibrary', section: 'shell.nav.groups.reports' },
  '/reports/index':      { title: 'shell.nav.items.disclosuresLibrary', section: 'shell.nav.groups.reports' },
  '/reports/ai':         { title: 'shell.nav.items.aiReport',           section: 'shell.nav.groups.analytics' },
  '/reports/ixbrl':      { title: 'shell.routes.ixbrlPreview',          section: 'shell.nav.groups.reports' },
  '/reports/performance':{ title: 'shell.routes.performanceReport',     section: 'shell.nav.groups.reports' },
  // Data
  '/data':               { title: 'shell.nav.items.dataCollection',      section: 'shell.nav.groups.data' },
  '/data/green-ledger':  { title: 'shell.nav.items.greenLedger',         section: 'shell.nav.groups.data' },
  '/data/entry':         { title: 'shell.nav.items.dataCollection',      section: 'shell.nav.groups.data' },
  '/data/pcaf':          { title: 'shell.nav.items.pcafPortfolio',       section: 'shell.nav.groups.data' },
  '/calculators/pcaf':   { title: 'shell.nav.items.pcafPortfolio',       section: 'shell.nav.groups.data' },
  '/data/standard':      { title: 'shell.nav.items.dataStandard',        section: 'shell.nav.groups.data' },
  '/data/spreadsheet':   { title: 'shell.nav.items.spreadsheet',         section: 'shell.nav.groups.data' },
  '/data/evidence':      { title: 'shell.nav.items.evidence',            section: 'shell.nav.groups.data' },
  '/data/connectors':    { title: 'shell.nav.items.connectors',          section: 'shell.nav.groups.data' },
  '/data/ef-library':    { title: 'shell.nav.items.emissionFactors',    section: 'shell.nav.groups.data' },
  '/data/anomalies':     { title: 'shell.nav.items.anomalies',           section: 'shell.nav.groups.data' },
  '/calculators':        { title: 'shell.nav.items.calculators',         section: 'shell.nav.groups.data' },
  // Analytics
  '/analytics':          { title: 'shell.nav.items.analytics',           section: 'shell.nav.groups.analytics' },
  // Legacy aliases — keep so deep links still get a readable breadcrumb.
  '/questionnaires':     { title: 'shell.nav.items.templates',           section: 'shell.nav.groups.reports' },
  '/workflow':           { title: 'shell.routes.workflow' },
  '/workflow/review':    { title: 'shell.routes.reviewQueue',        section: 'shell.nav.groups.work' },
  '/workflow/approval':  { title: 'shell.routes.approvalQueue',      section: 'shell.nav.groups.work' },
  '/aggregator':         { title: 'shell.routes.groupRollup',        section: 'shell.nav.groups.reports' },
  // Admin tray
  '/welcome':            { title: 'shell.routes.guidedSetup',         section: 'shell.nav.groups.admin' },
  '/onboarding':         { title: 'shell.routes.onboarding',          section: 'shell.nav.groups.admin' },
  '/admin/org':          { title: 'shell.routes.organisation',        section: 'shell.nav.groups.admin' },
  '/admin/periods':      { title: 'shell.nav.items.reportingCycles',    section: 'shell.nav.groups.admin' },
  '/admin/materiality':  { title: 'shell.nav.items.materiality',         section: 'shell.nav.groups.admin' },
  '/admin/org/legacy':   { title: 'shell.nav.items.orgStructure',        section: 'shell.nav.groups.admin' },
  '/admin/audit/blockchain': { title: 'shell.nav.items.blockchain',      section: 'shell.nav.groups.admin' },
  '/admin/assignments':  { title: 'shell.nav.items.assignments',         section: 'shell.nav.groups.data' },
  '/admin/users':        { title: 'shell.nav.items.usersRoles',       section: 'shell.nav.groups.admin' },
  '/admin/ef-library':   { title: 'shell.nav.items.emissionFactors',    section: 'shell.nav.groups.admin' },
  '/admin/gwp':          { title: 'shell.routes.gwpValues',          section: 'shell.nav.groups.admin' },
  '/admin/audit':        { title: 'shell.nav.items.activityHistory',    section: 'shell.nav.groups.admin' },
  '/admin/data-standard':{ title: 'shell.nav.items.dataStandard',       section: 'shell.nav.groups.admin' },
  '/admin/targets':      { title: 'shell.nav.items.climateTargets',     section: 'shell.nav.groups.admin' },
  '/admin/blockchain':   { title: 'shell.nav.items.blockchain',          section: 'shell.nav.groups.admin' },
  '/admin/system-status':{ title: 'shell.nav.items.systemStatus',       section: 'shell.nav.groups.admin' },
  '/admin/api-keys':     { title: 'shell.nav.items.apiKeys',            section: 'shell.nav.groups.admin' },
  '/admin/scim':         { title: 'shell.nav.items.scim',                section: 'shell.nav.groups.admin' },
  '/settings':           { title: 'shell.nav.items.settings',            section: 'shell.nav.groups.admin' },
  '/admin/settings':     { title: 'shell.nav.items.settings',            section: 'shell.nav.groups.admin' },
}

/** Longest-prefix fallback so detail pages (e.g. /data/connectors/:id) keep their parent's name. */
function routeFor(pathname: string): { title: string; section?: string } | undefined {
  let best: string | null = null
  for (const key of Object.keys(routeLabels)) {
    if (key !== '/' && pathname.startsWith(key + '/') && (!best || key.length > best.length)) best = key
  }
  return best ? routeLabels[best] : undefined
}

export default function TopBar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const location = useLocation()
  const firstName = user?.name?.split(' ')[0] || t('shell.topbar.there')
  const route = routeLabels[location.pathname] ?? routeFor(location.pathname)
  const openPalette = useOpenPalette()
  const mobileNav = useMobileNav()

  return (
    <header
      className="topbar-surface h-[52px] flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2 sticky top-0 z-30 flex-shrink-0 relative"
    >
      {/* Left — hamburger (mobile only) + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {mobileNav.isMobile && (
          <button
            type="button"
            onClick={() => mobileNav.setOpen(!mobileNav.open)}
            aria-label={mobileNav.open ? t('shell.topbar.closeNav') : t('shell.topbar.openNav')}
            aria-expanded={mobileNav.open}
            aria-controls="mobile-nav-drawer"
            className="w-10 h-10 -ml-1 flex items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {route?.section && (
          <>
            <span className="hidden sm:inline text-[12.5px] text-[var(--text-tertiary)] font-medium">{t(route.section)}</span>
            <span className="hidden sm:inline text-[var(--text-quaternary)] text-caption">/</span>
          </>
        )}
        <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.01em] truncate">
          {route?.title ? t(route.title) : user?.name ? t('shell.topbar.greeting', { name: firstName }) : t('shell.topbar.greetingAnon')}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Framework selector */}
        <div className="hidden md:block">
          <FrameworkSelector size="sm" />
        </div>

        {/* Universal create */}
        <NewMenu />

        <div className="hidden sm:block w-px h-5 bg-[var(--border-default)] mx-1" />

        {/* Search (command palette style). On mobile collapses to icon-only,
            preserving the 44×44 touch target. */}
        <button
          data-tour="topbar-search"
          onClick={openPalette}
          className="flex items-center gap-2 h-10 sm:h-8 w-10 sm:w-auto justify-center sm:pl-3 sm:pr-1.5 rounded-[8px] sm:border sm:border-[var(--border-default)] sm:bg-[var(--bg-primary)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] sm:hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-colors duration-[120ms] ease-[var(--ease-out-expo)] cursor-pointer"
          aria-label={t('shell.topbar.openPalette')}
        >
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="text-[12.5px] hidden md:inline font-medium">{t('nav.search')}</span>
          <span className="hidden md:flex items-center gap-0.5 ml-3 kbd">
            <Command className="w-2.5 h-2.5" />K
          </span>
        </button>

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Color theme toggle — light / auto / dark. Hidden on the smallest
            screens (it lives in Settings → Display) to keep the bar uncluttered. */}
        <div className="hidden lg:block">
          <ThemeToggle size="compact" />
        </div>

        {/* Live notifications */}
        <NotificationsBell />

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-[var(--border-default)] mx-1" />

        {/* User menu */}
        <button className="flex items-center gap-2 h-10 sm:h-8 pl-0.5 pr-2 rounded-[8px] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, var(--accent-600), var(--accent-800))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px var(--status-success-line)',
            }}
          >
            {firstName[0]}
          </div>
          <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
        </button>

        {/* Logout — hidden on mobile (drawer already shows a sign-out affordance) */}
        <button
          onClick={logout}
          className="hidden sm:flex w-8 h-8 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-all cursor-pointer"
          title={t('nav.logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

/** Universal "+ New" menu — appears in the TopBar between framework and search. */
function NewMenu() {
  const { t } = useTranslation()
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
        title={t('shell.newMenu.title')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center justify-center gap-1.5 h-10 sm:h-8 w-10 sm:w-auto sm:pl-2 sm:pr-2.5 rounded-[8px] sm:border sm:border-[var(--border-default)] sm:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] sm:hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors text-[12.5px] font-semibold cursor-pointer"
      >
        <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        <span className="hidden sm:inline">{t('shell.newMenu.new')}</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t('shell.newMenu.ariaLabel')}
          className="absolute right-0 top-full mt-1.5 min-w-[240px] surface-paper p-1.5 shadow-lg z-50 rounded-[10px]"
        >
          <NewMenuItem icon={ClipboardList} label={t('shell.newMenu.value')} hint={t('shell.newMenu.valueHint')} onClick={() => go(`/disclosure-editor/${lastFramework}?view=spreadsheet`)} />
          <NewMenuItem icon={Paperclip} label={t('shell.newMenu.evidence')} hint={t('shell.newMenu.evidenceHint')} onClick={() => go('/data/evidence?upload=1')} />
          <NewMenuItem icon={UserCog} label={t('shell.newMenu.assignment')} hint={t('shell.newMenu.assignmentHint')} onClick={() => go('/admin/assignments?action=bulk-assign')} />
          <NewMenuItem icon={FileText} label={t('shell.newMenu.report')} hint={t('shell.newMenu.reportHint')} onClick={() => go('/reports?action=new-report')} />
          <NewMenuItem icon={Sparkles} label={t('shell.newMenu.aiNarrative')} hint={t('shell.newMenu.aiNarrativeHint')} onClick={() => go('/reports/ai')} />
          <div className="border-t border-[var(--border-subtle)] my-1" />
          <div className="px-2 py-1.5 text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] flex items-center justify-between">
            <span>{t('shell.newMenu.shortcut')}</span>
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
        <div className="text-caption text-[var(--text-tertiary)] truncate mt-0.5">{hint}</div>
      </div>
    </button>
  )
}

const LOCALES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'th', label: 'ไทย' },
  { code: 'zh', label: '简体中文' },
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
              onClick={() => { void setUiLanguage(l.code); setOpen(false) }}
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
