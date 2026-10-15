import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Database, CheckSquare, Box, Shield, Bell, Search, Activity, Layers, FileText, BarChart3,
  Focus, Calculator, Settings2, Sparkles, LogOut, Menu, X, ChevronsUpDown, PanelLeftClose,
  PanelLeftOpen, Plug, KeyRound, Plus, ChevronRight, CornerDownLeft, Settings, LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../auth/AuthContext'
import { useStrings } from '../i18n'
import { shellStrings } from '../i18n/pages/shell'
import LanguageSwitcher from './LanguageSwitcher'

type NavKey = keyof typeof shellStrings.en.nav
type GroupKey = keyof typeof shellStrings.en.groups
type RouteKey = keyof typeof shellStrings.en.routes

type NavItem = { key: NavKey; icon: LucideIcon; path: string; match: RegExp; badge?: number }

const NAV_GROUPS: { key: GroupKey; items: NavItem[] }[] = [
  {
    key: 'overview',
    items: [
      { key: 'command', icon: Home, path: '/executive', match: /^\/(executive)?$/ },
      { key: 'portfolio', icon: Layers, path: '/portfolio', match: /^\/portfolio/ },
      { key: 'analytics', icon: BarChart3, path: '/analytics', match: /^\/analytics/ },
    ],
  },
  {
    key: 'workspace',
    items: [
      { key: 'modules', icon: Box, path: '/modules', match: /^\/(modules|frameworks)/ },
      { key: 'tasks', icon: CheckSquare, path: '/tasks', match: /^\/tasks/, badge: 3 },
      { key: 'evidence', icon: Database, path: '/evidence', match: /^\/evidence/ },
    ],
  },
  {
    key: 'measure',
    items: [
      { key: 'carbon', icon: Activity, path: '/carbon', match: /^\/carbon/ },
      { key: 'scope3', icon: Calculator, path: '/scope3', match: /^\/scope3/ },
      { key: 'dma', icon: Focus, path: '/dma', match: /^\/dma/ },
      { key: 'ai', icon: Sparkles, path: '/ai', match: /^\/ai/ },
    ],
  },
  {
    key: 'trust',
    items: [
      { key: 'verify', icon: Shield, path: '/verify', match: /^\/(verify|anchors)/ },
      { key: 'publish', icon: FileText, path: '/publish', match: /^\/(publish|reports)/ },
    ],
  },
  {
    key: 'settings',
    items: [
      { key: 'connectors', icon: Plug, path: '/connectors', match: /^\/connectors/ },
      { key: 'workflow', icon: Settings2, path: '/workflow', match: /^\/workflow/ },
      { key: 'iam', icon: KeyRound, path: '/iam', match: /^\/iam/ },
    ],
  },
]

// Routes outside the sidebar, for the topbar title.
const EXTRA_ROUTES: { key: RouteKey; match: RegExp; parent?: NavKey }[] = [
  { key: 'gaps', match: /^\/analytics\/gaps/, parent: 'analytics' },
  { key: 'benchmark', match: /^\/analytics\/benchmark/, parent: 'analytics' },
  { key: 'questionnaire', match: /^\/modules\/[^/]+\/questionnaire/, parent: 'modules' },
  { key: 'review', match: /^\/modules\/[^/]+\/review/, parent: 'modules' },
  { key: 'events', match: /^\/events/ },
  { key: 'organization', match: /^\/admin\/organization/ },
  { key: 'admin', match: /^\/admin/ },
  { key: 'periodCreate', match: /^\/period\/create/ },
  { key: 'timeline', match: /^\/timeline/ },
  { key: 'ghg', match: /^\/ghg/ },
  { key: 'roles', match: /^\/roles/ },
  { key: 'settingsAnalytics', match: /^\/settings\/analytics/ },
  { key: 'workbench', match: /^\/workbench/ },
]

const FULL_BLEED = /^\/publish|\/questionnaire/

export default function UIAppShell({ children }: { children: React.ReactNode }) {
  const s = useStrings(shellStrings)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // Close the mobile drawer on navigation.
  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const crumbs = useMemo(() => {
    const path = location.pathname
    const extra = EXTRA_ROUTES.find(r => r.match.test(path))
    if (extra) {
      return extra.parent ? [s.nav[extra.parent], s.routes[extra.key]] : [s.routes[extra.key]]
    }
    for (const g of NAV_GROUPS) {
      const item = g.items.find(i => i.match.test(path))
      if (item) return [s.groups[g.key], s.nav[item.key]]
    }
    return [s.home]
  }, [location.pathname, s])

  const displayName = user?.name ?? 'User'
  const userInitial = (user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()

  const sidebar = (mobile: boolean) => {
    const isCollapsed = collapsed && !mobile
    return (
      <div className="flex flex-col h-full">
        {/* Brand + org */}
        <div className={clsx('flex items-center h-14 shrink-0', isCollapsed ? 'justify-center px-2' : 'px-3 gap-2')}>
          <OrgSwitcher collapsed={isCollapsed} label={s.orgLabel} addLabel={s.addOrg} />
          {mobile && (
            <button type="button" onClick={() => setDrawerOpen(false)} className="ml-auto w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100" aria-label={s.closeMenu}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search trigger */}
        <div className={clsx('pb-2', isCollapsed ? 'px-2' : 'px-3')}>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={clsx(
              'w-full h-9 flex items-center gap-2 rounded-[10px] border border-line bg-white text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-colors shadow-sm',
              isCollapsed ? 'justify-center' : 'px-2.5',
            )}
            aria-label={s.search}
          >
            <Search className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="text-[13px] flex-1 text-left">{s.search}</span>
                <kbd className="hidden lg:inline text-[10px] font-mono font-medium text-zinc-400 border border-line rounded px-1 py-px">⌘K</kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={clsx('flex-1 overflow-y-auto scrollbar-none pb-4', isCollapsed ? 'px-2' : 'px-3')}>
          {NAV_GROUPS.map(group => (
            <div key={group.key} className="mt-4 first:mt-2">
              {isCollapsed ? (
                <div className="mx-auto mb-2 w-4 h-px bg-line" />
              ) : (
                <div className="px-2.5 mb-1 text-[11px] font-medium text-zinc-400">{s.groups[group.key]}</div>
              )}
              <ul className="space-y-px">
                {group.items.map(item => {
                  const active = item.match.test(location.pathname)
                  const Icon = item.icon
                  const label = s.nav[item.key]
                  return (
                    <li key={item.key}>
                      <Link
                        to={item.path}
                        title={isCollapsed ? label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={clsx(
                          'group relative flex items-center h-9 rounded-lg text-[13.5px] transition-colors',
                          isCollapsed ? 'justify-center' : 'gap-2.5 px-2.5',
                          active ? 'bg-white text-zinc-900 font-medium shadow-sm ring-1 ring-line' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/[0.04]',
                        )}
                      >
                        <Icon className={clsx('w-[18px] h-[18px] shrink-0', active ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600')} strokeWidth={active ? 2.2 : 1.9} />
                        {!isCollapsed && <span className="truncate">{label}</span>}
                        {item.badge !== undefined &&
                          (isCollapsed ? (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
                          ) : (
                            <span className="ml-auto text-[11px] font-medium tabular min-w-[20px] h-5 px-1.5 rounded-md bg-zinc-900/[0.06] text-zinc-600 flex items-center justify-center">{item.badge}</span>
                          ))}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account */}
        <div className={clsx('border-t border-line shrink-0', isCollapsed ? 'p-2 space-y-1' : 'p-3')}>
          <UserMenu
            collapsed={isCollapsed}
            name={displayName}
            email={user?.email ?? ''}
            initial={userInitial}
            labels={{ admin: s.adminSettings, logout: s.logout }}
            onAdmin={() => navigate('/admin')}
            onLogout={handleLogout}
          />
          {!mobile && (
            <button
              type="button"
              onClick={() => setCollapsed(c => !c)}
              className={clsx('flex items-center gap-2 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-900/[0.04] transition-colors text-xs', isCollapsed ? 'w-full justify-center' : 'mt-1 w-full px-2.5')}
              aria-label={isCollapsed ? s.expand : s.collapse}
              title={isCollapsed ? s.expand : s.collapse}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /> {s.collapse}</>}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] w-full bg-canvas overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={clsx('hidden lg:block shrink-0 border-r border-line bg-[#F1F1ED] transition-[width] duration-200', collapsed ? 'w-[64px]' : 'w-[248px]')}>
        {sidebar(false)}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px] animate-fade-up" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[284px] max-w-[85vw] bg-[#F1F1ED] shadow-pop animate-[fade-up_200ms_ease-out]">
            {sidebar(true)}
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 shrink-0 flex items-center gap-2 px-3 sm:px-6 border-b border-line bg-canvas/80 backdrop-blur supports-[backdrop-filter]:bg-canvas/70 z-30">
          <button type="button" onClick={() => setDrawerOpen(true)} className="lg:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-zinc-100" aria-label={s.openMenu}>
            <Menu className="w-5 h-5" />
          </button>

          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 text-sm">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0 hidden sm:block" />}
                <span className={clsx('truncate', i === crumbs.length - 1 ? 'text-zinc-900 font-medium' : 'text-zinc-500 hidden sm:inline')}>{c}</span>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setPaletteOpen(true)} className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-zinc-100" aria-label={s.search}>
              <Search className="w-[18px] h-[18px]" />
            </button>
            <LanguageSwitcher />
            <button type="button" className="relative w-9 h-9 rounded-[10px] flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors" aria-label={s.notifications}>
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-canvas" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/period/create')}
              className="ml-1 h-9 inline-flex items-center gap-1.5 pl-2.5 pr-3 rounded-[10px] bg-zinc-900 text-white text-[13px] font-medium hover:bg-zinc-800 shadow-sm active:scale-[0.98] transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{s.create}</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div key={location.pathname} className={clsx('min-h-full animate-fade-in', !FULL_BLEED.test(location.pathname) && 'px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1440px] mx-auto')}>
            {children}
          </div>
        </div>
      </main>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          placeholder={s.searchPlaceholder}
          empty={s.noResults}
          items={NAV_GROUPS.flatMap(g => g.items.map(i => ({ label: s.nav[i.key], group: s.groups[g.key], icon: i.icon, path: i.path })))}
          onSelect={path => {
            setPaletteOpen(false)
            navigate(path)
          }}
        />
      )}
    </div>
  )
}

// ─── Org switcher ─────────────────────────────────────────────────────────────

const ORGS = ['Aeiforo Green Energy', 'Asyad Group']

function OrgSwitcher({ collapsed, label, addLabel }: { collapsed: boolean; label: string; addLabel: string }) {
  const [open, setOpen] = useState(false)
  const [org, setOrg] = useState(ORGS[0])
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))

  return (
    <div ref={ref} className={clsx('relative', !collapsed && 'flex-1 min-w-0')}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={label}
        className={clsx('flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/[0.04] transition-colors', collapsed ? 'p-1.5' : 'w-full p-1.5 pr-2')}
      >
        <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 shadow-sm">
          <Box className="w-3.5 h-3.5 text-white" />
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 text-left leading-tight">
              <div className="text-[13px] font-semibold text-zinc-900">
                Nexus<span className="text-brand-500">.</span>
              </div>
              <div className="text-[11px] text-zinc-500 truncate">{org}</div>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400 ml-auto shrink-0" />
          </>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 p-1 bg-white border border-line rounded-xl shadow-pop z-50 animate-scale-in origin-top-left">
          <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-zinc-400">{label}</div>
          {ORGS.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => {
                setOrg(o)
                setOpen(false)
              }}
              className={clsx('w-full text-left px-2.5 h-9 rounded-lg text-sm truncate', o === org ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50')}
            >
              {o}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <button type="button" className="w-full flex items-center gap-2 px-2.5 h-9 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50">
            <Plus className="w-4 h-4" /> {addLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── User menu ────────────────────────────────────────────────────────────────

function UserMenu({
  collapsed, name, email, initial, labels, onAdmin, onLogout,
}: {
  collapsed: boolean
  name: string
  email: string
  initial: string
  labels: { admin: string; logout: string }
  onAdmin: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={clsx('w-full flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/[0.04] transition-colors', collapsed ? 'justify-center p-1.5' : 'p-1.5')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shrink-0 text-xs font-semibold">{initial}</div>
        {!collapsed && (
          <div className="min-w-0 text-left leading-tight flex-1">
            <div className="text-[13px] font-medium text-zinc-900 truncate">{name}</div>
            <div className="text-[11px] text-zinc-500 truncate">{email}</div>
          </div>
        )}
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 mb-1.5 w-56 p-1 bg-white border border-line rounded-xl shadow-pop z-50 animate-scale-in origin-bottom-left">
          <div className="px-2.5 py-2 border-b border-line mb-1">
            <div className="text-[13px] font-medium text-zinc-900 truncate">{name}</div>
            <div className="text-xs text-zinc-500 truncate">{email}</div>
          </div>
          <MenuItem icon={Settings} onClick={() => { setOpen(false); onAdmin() }}>{labels.admin}</MenuItem>
          <MenuItem icon={LogOut} onClick={onLogout} danger>{labels.logout}</MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, children, onClick, danger }: { icon: LucideIcon; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx('w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-sm transition-colors', danger ? 'text-rose-600 hover:bg-rose-50' : 'text-zinc-700 hover:bg-zinc-50')}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  )
}

// ─── Command palette ──────────────────────────────────────────────────────────

function CommandPalette({
  items, onSelect, onClose, placeholder, empty,
}: {
  items: { label: string; group: string; icon: LucideIcon; path: string }[]
  onSelect: (path: string) => void
  onClose: () => void
  placeholder: string
  empty: string
}) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? items.filter(i => i.label.toLowerCase().includes(needle) || i.group.toLowerCase().includes(needle)) : items
  }, [q, items])

  useEffect(() => setIdx(0), [q])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIdx(i => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIdx(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && results[idx]) onSelect(results[idx].path)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-zinc-900/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-pop border border-line overflow-hidden animate-scale-in">
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-line">
          <Search className="w-4 h-4 text-zinc-400" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none" />
          <kbd className="text-[10px] font-mono text-zinc-400 border border-line rounded px-1 py-px">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-zinc-500">{empty}</li>}
          {results.map((r, i) => {
            const Icon = r.icon
            return (
              <li key={r.path}>
                <button
                  type="button"
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => onSelect(r.path)}
                  className={clsx('w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm text-left', i === idx ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600')}
                >
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span className="flex-1 truncate">{r.label}</span>
                  <span className="text-xs text-zinc-400">{r.group}</span>
                  {i === idx && <CornerDownLeft className="w-3.5 h-3.5 text-zinc-400" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function useDismiss(ref: React.RefObject<HTMLElement>, active: boolean, close: () => void) {
  useEffect(() => {
    if (!active) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, active, close])
}
