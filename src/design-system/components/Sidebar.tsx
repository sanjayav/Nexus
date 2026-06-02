import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  // Section icons
  Briefcase, FileBarChart, Database, BarChart3 as AnalyticsIcon, Cog,
  // Item icons
  LayoutDashboard, Inbox, ClipboardList, Calendar as CalendarIcon,
  FileText, BookMarked, Library,
  UserCog, Plug, BookOpen, Atom, Calculator as CalcIcon, AlertTriangle, Paperclip,
  Sparkles, Building2, Users, Scale, Target as TargetIcon, Settings as SettingsIcon,
  ShieldCheck, Activity, KeyRound,
  // Chrome
  ChevronLeft, ChevronRight, ChevronDown, LogOut,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { resolveRole, ROLE_CATALOG, type PlatformRole } from '../../lib/rbac'
import SetupGuide from '../../components/SetupGuide'
import { useOrgBrand } from '../../lib/useOrgBrand'
import { orgStore } from '../../lib/orgStore'
import NexusBrandCard from '../../components/NexusBrandCard'

type NavItem = {
  path: string
  label: string
  icon: typeof LayoutDashboard
  roles?: PlatformRole[]
  badgeKey?: 'myTasks' | 'reviewQueue' | 'approvalQueue' | 'anomalies'
  /** Small amber dot for flagship features. */
  pin?: boolean
}

type NavGroup = {
  key: string
  label: string
  icon: typeof Briefcase
  items: NavItem[]
  roles?: PlatformRole[]
}

/**
 * Sidebar — IA-reset version. Visible surface cut to four top groups
 * (WORK / REPORTS / DATA / ANALYTICS) plus an icon-only Admin tray that
 * expands on click. All RBAC gates from the previous structure are
 * preserved; this is purely a re-grouping/re-labelling pass.
 */
const NAV: NavGroup[] = [
  {
    key: 'work', label: 'Work', icon: Briefcase,
    items: [
      { path: '/',                label: 'My Day',     icon: LayoutDashboard },
      { path: '/my-tasks',        label: 'Tasks',      icon: ClipboardList, badgeKey: 'myTasks' },
      { path: '/inbox',           label: 'Inbox',      icon: Inbox },
      { path: '/work/calendar',   label: 'Calendar',   icon: CalendarIcon },
    ],
  },
  {
    key: 'reports', label: 'Reports', icon: FileBarChart,
    items: [
      { path: '/reports',           label: 'Active Reports',      icon: FileText,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner', 'auditor'] },
      { path: '/reports/templates', label: 'Templates',           icon: BookMarked,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner', 'auditor'] },
      { path: '/reports/library',   label: 'Disclosures Library', icon: Library,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner', 'auditor'] },
    ],
  },
  {
    key: 'data', label: 'Data', icon: Database,
    roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager', 'data_contributor'],
    items: [
      { path: '/data',                label: 'Values',            icon: UserCog,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead'] },
      { path: '/data/spreadsheet',    label: 'Spreadsheet',       icon: ClipboardList,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager', 'data_contributor'] },
      { path: '/data/evidence',       label: 'Evidence',          icon: Paperclip },
      { path: '/calculators',         label: 'Calculators',       icon: CalcIcon },
      { path: '/data/connectors',     label: 'Connectors',        icon: Plug },
      { path: '/data/ef-library',     label: 'Emission factors',  icon: BookOpen,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead'] },
      { path: '/data/anomalies',      label: 'Anomalies',         icon: AlertTriangle, badgeKey: 'anomalies' },
    ],
  },
  {
    key: 'analytics', label: 'Analytics', icon: AnalyticsIcon,
    roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager', 'auditor'],
    items: [
      { path: '/analytics',   label: 'Analytics', icon: AnalyticsIcon },
      { path: '/reports/ai',  label: 'AI Report', icon: Sparkles, pin: true,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner'] },
    ],
  },
]

const ADMIN_TRAY: NavItem[] = [
  { path: '/admin/org',           label: 'Organisation',    icon: Building2,    roles: ['platform_admin', 'group_sustainability_officer'] },
  { path: '/admin/users',         label: 'Users & Roles',   icon: Users,        roles: ['platform_admin'] },
  { path: '/admin/materiality',   label: 'Materiality',     icon: Scale,        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner'] },
  { path: '/admin/targets',       label: 'Climate Targets', icon: TargetIcon,   roles: ['platform_admin', 'group_sustainability_officer'] },
  { path: '/admin/data-standard', label: 'Data Standard',   icon: BookOpen,     roles: ['platform_admin', 'group_sustainability_officer'] },
  { path: '/admin/audit',         label: 'Activity History', icon: ShieldCheck, roles: ['platform_admin', 'auditor'] },
  { path: '/admin/api-keys',      label: 'API Keys',        icon: KeyRound,     roles: ['platform_admin'] },
  { path: '/admin/scim',          label: 'SCIM',            icon: KeyRound,     roles: ['platform_admin'] },
  { path: '/admin/blockchain',    label: 'Blockchain',      icon: ShieldCheck,  roles: ['platform_admin', 'auditor'] },
  { path: '/admin/system-status', label: 'System Status',   icon: Activity,     roles: ['platform_admin'] },
  { path: '/admin/settings',      label: 'Settings',        icon: SettingsIcon, roles: ['platform_admin'] },
]

function canSee(role: PlatformRole, required?: PlatformRole[]): boolean {
  if (!required || required.length === 0) return true
  return required.includes(role)
}

const STORE_KEY = 'aeiforo_sidebar_open'
const ADMIN_OPEN_KEY = 'aeiforo_sidebar_admin_open'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const role = resolveRole(user)
  const firstName = user?.name?.split(' ')[0] ?? 'U'
  const roleMeta = ROLE_CATALOG[role]
  const badges = useBadges()
  const brand = useOrgBrand()
  void brand

  // Work out which section the current route belongs to.
  const activeKey = useMemo(() => {
    for (const g of NAV) {
      if (g.items.some(it => isMatch(location.pathname, it.path))) return g.key
    }
    if (ADMIN_TRAY.some(it => isMatch(location.pathname, it.path))) return 'admin'
    return 'work'
  }, [location.pathname])

  // Expanded-section state: start with the active one open, others closed.
  const [openSet, setOpenSet] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
      if (Array.isArray(stored)) return new Set(stored)
    } catch { /* ignore */ }
    return new Set([activeKey])
  })
  useEffect(() => {
    setOpenSet(prev => { if (prev.has(activeKey)) return prev; const next = new Set(prev); next.add(activeKey); return next })
  }, [activeKey])
  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(openSet))) }, [openSet])

  const toggleSection = (k: string) => setOpenSet(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next })

  // Admin tray — collapsed by default. Auto-opens when route is under /admin.
  const [adminOpen, setAdminOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(ADMIN_OPEN_KEY) === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem(ADMIN_OPEN_KEY, adminOpen ? '1' : '0') } catch { /* ignore */ }
  }, [adminOpen])
  useEffect(() => {
    if (activeKey === 'admin') setAdminOpen(true)
  }, [activeKey])

  const visibleAdmin = ADMIN_TRAY.filter(it => canSee(role, it.roles))

  return (
    <aside
      className={`${collapsed ? 'w-[68px]' : 'w-[248px]'} flex-shrink-0 flex flex-col h-screen sticky top-0
        bg-[var(--bg-inverse)] text-white transition-all duration-300 ease-[var(--ease-out-expo)]
        border-r border-white/[0.06] relative overflow-hidden`}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 w-[200px] h-[200px] opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(27,107,123,0.3), transparent 60%)' }}
      />

      {/* Brand lockup */}
      <div className={`h-[64px] flex items-center ${collapsed ? 'justify-center px-0' : 'px-5'} flex-shrink-0 relative`}>
        <NexusBrandCard industry={brand.industry} collapsed={collapsed} variant="dark" />
      </div>

      <SetupGuide collapsed={collapsed} />

      {/* Nav sections */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-2.5'} pb-3 space-y-0.5 relative`}>
        {NAV
          .filter(g => canSee(role, g.roles))
          .map(g => ({ g, visibleItems: g.items.filter(it => canSee(role, it.roles)) }))
          .filter(({ visibleItems }) => visibleItems.length > 0)
          .map(({ g, visibleItems }, i) => (
            <Section
              key={g.key}
              group={g}
              items={visibleItems}
              collapsed={collapsed}
              expanded={openSet.has(g.key)}
              activeKey={activeKey}
              onToggle={() => toggleSection(g.key)}
              badges={badges}
              pathname={location.pathname}
              isFirst={i === 0}
            />
          ))}
      </nav>

      {/* Admin tray — bottom of sidebar, icon-only when closed */}
      {visibleAdmin.length > 0 && (
        <AdminTray
          collapsed={collapsed}
          open={adminOpen}
          onToggle={() => setAdminOpen(o => !o)}
          items={visibleAdmin}
          pathname={location.pathname}
        />
      )}

      {/* User + logout */}
      <div className={`flex-shrink-0 border-t border-white/[0.06] ${collapsed ? 'px-2' : 'px-3'} py-3 space-y-2 relative`}>
        <div
          className={`flex items-center ${collapsed ? 'justify-center py-2' : 'gap-3 px-2 py-2'} rounded-[10px]`}
          style={{ background: 'rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #2fa98e, #1B6B7B)',
              boxShadow: '0 2px 8px rgba(27,107,123,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {firstName[0]}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/90 truncate leading-tight">{user?.name}</p>
                <p className="text-[10px] text-white/45 truncate leading-tight mt-0.5 font-medium">{roleMeta.name}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white/35 hover:text-white/85 hover:bg-white/[0.06] transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center h-7 rounded-[6px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  )
}

function isMatch(pathname: string, target: string): boolean {
  if (target === '/') return pathname === '/' || pathname === '/my-day' || pathname === '/dashboard'
  return pathname === target || pathname.startsWith(target + '/')
}

// ─── Section (collapsible) ─────────────────────────────────────

type BadgeMap = { myTasks: number; reviewQueue: number; approvalQueue: number; anomalies: number }

function Section({
  group, items, collapsed, expanded, activeKey, onToggle, badges, pathname, isFirst,
}: {
  group: NavGroup
  items: NavItem[]
  collapsed: boolean
  expanded: boolean
  activeKey: string
  onToggle: () => void
  badges: BadgeMap
  pathname: string
  isFirst: boolean
}) {
  // Collapsed (icon-rail) mode: flat list of item icons.
  if (collapsed) {
    return (
      <div className={isFirst ? '' : 'mt-1.5 pt-1.5 border-t border-white/[0.04]'}>
        {items.map(it => <IconOnlyItem key={it.path} item={it} badges={badges} pathname={pathname} />)}
      </div>
    )
  }

  return (
    <ExpandedSection
      group={group}
      items={items}
      expanded={expanded}
      activeKey={activeKey}
      onToggle={onToggle}
      badges={badges}
      pathname={pathname}
    />
  )
}

function ExpandedSection({
  group, items, expanded, activeKey, onToggle, badges, pathname,
}: {
  group: NavGroup
  items: NavItem[]
  expanded: boolean
  activeKey: string
  onToggle: () => void
  badges: BadgeMap
  pathname: string
}) {
  const isActive = activeKey === group.key
  const SectIcon = group.icon
  const aggBadge = items.reduce((s, it) => it.badgeKey ? s + (badges[it.badgeKey] ?? 0) : s, 0)

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-[6px] text-[11.5px] font-bold uppercase tracking-[0.08em] transition-colors duration-[120ms] ease-[var(--ease-out-expo)]
          ${isActive && !expanded
            ? 'bg-white/[0.05] text-white'
            : 'text-white/55 hover:text-white/85 hover:bg-white/[0.04]'
          }`}
      >
        <SectIcon className={`w-[14px] h-[14px] flex-shrink-0 transition-colors ${isActive ? 'text-[#2fa98e]' : ''}`} />
        <span className="flex-1 text-left">{group.label}</span>
        {aggBadge > 0 && !expanded && (
          <span
            className="text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full leading-none inline-flex items-center justify-center tabular-nums"
            style={{ background: 'rgba(47,169,142,0.18)', color: '#2fa98e' }}
          >
            {aggBadge}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-white/35 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className="overflow-hidden transition-[max-height,opacity] duration-250 ease-[var(--ease-out-expo)]"
        style={{
          maxHeight: expanded ? `${items.length * 40 + 8}px` : 0,
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="pt-0.5 pb-1 pl-[11px]" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: '18px' }}>
          {items.map(it => <ChildItem key={it.path} item={it} badges={badges} pathname={pathname} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Admin tray ──────────────────────────────────────────────

function AdminTray({
  collapsed, open, onToggle, items, pathname,
}: {
  collapsed: boolean
  open: boolean
  onToggle: () => void
  items: NavItem[]
  pathname: string
}) {
  if (collapsed) {
    // Icon-only rail: the items render in the collapsed gap; render the
    // gear at the bottom of the nav to keep parity.
    return (
      <div className="px-2 pb-2 border-t border-white/[0.04] pt-1.5">
        {items.map(it => <IconOnlyItem key={it.path} item={it} badges={{ myTasks: 0, reviewQueue: 0, approvalQueue: 0, anomalies: 0 }} pathname={pathname} />)}
      </div>
    )
  }
  return (
    <div className="px-2.5 pb-2 border-t border-white/[0.04] pt-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-2.5 h-10 rounded-[6px] text-[12.5px] font-semibold text-white/55 hover:text-white/85 hover:bg-white/[0.04] transition-colors"
      >
        <Cog className="w-[15px] h-[15px] flex-shrink-0" />
        <span className="flex-1 text-left uppercase tracking-[0.08em] text-[11px] font-bold">Admin</span>
        <ChevronDown className={`w-3 h-3 text-white/35 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-250"
        style={{ maxHeight: open ? `${items.length * 32 + 8}px` : 0, opacity: open ? 1 : 0 }}
      >
        <div className="pt-0.5 pl-[11px]" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: '18px' }}>
          {items.map(it => <ChildItem key={it.path} item={it} badges={{ myTasks: 0, reviewQueue: 0, approvalQueue: 0, anomalies: 0 }} pathname={pathname} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Child nav item ───────────────────────────────────────────

function tourTagFor(path: string): string | undefined {
  if (path === '/' || path === '/my-day' || path === '/dashboard') return 'sidebar-home'
  if (path === '/my-tasks') return 'sidebar-home'
  if (path === '/reports/templates') return 'sidebar-templates'
  if (path === '/reports') return 'sidebar-templates'
  return undefined
}

function ChildItem({ item, badges, pathname }: { item: NavItem; badges: BadgeMap; pathname: string }) {
  const Icon = item.icon
  const isActive = isMatch(pathname, item.path)
  const badge = item.badgeKey ? badges[item.badgeKey] : 0
  const tourTag = tourTagFor(item.path)

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      data-tour={tourTag}
      className={`group relative flex items-center gap-2 px-2.5 h-8 rounded-[6px] text-[12.5px] font-medium transition-colors duration-[120ms] ease-[var(--ease-out-expo)]
        ${isActive
          ? 'bg-white/[0.08] text-white'
          : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
        }`}
    >
      {isActive && (
        <span
          className="absolute -left-[12px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
          style={{ background: 'linear-gradient(180deg, #2fa98e, #1B6B7B)', boxShadow: '0 0 8px rgba(47,169,142,0.5)' }}
        />
      )}
      <Icon className={`w-[14px] h-[14px] flex-shrink-0 transition-colors ${isActive ? 'text-[#2fa98e]' : 'group-hover:text-white/80'}`} />
      <span className="truncate flex-1">{item.label}</span>
      {item.pin && !isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#E6A817] flex-shrink-0" title="Flagship feature" />
      )}
      {badge > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 min-w-[17px] h-[17px] rounded-full leading-none inline-flex items-center justify-center tabular-nums"
          style={{
            background: isActive
              ? 'linear-gradient(135deg, #2fa98e, #1B6B7B)'
              : item.badgeKey === 'anomalies' ? 'rgba(230,168,23,0.25)' : 'rgba(255,255,255,0.08)',
            color: item.badgeKey === 'anomalies' && !isActive ? '#E6A817' : 'white',
            boxShadow: isActive ? '0 2px 8px rgba(47,169,142,0.3)' : 'none',
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )
}

// ─── IconOnlyItem (for collapsed sidebar: flat icon rail) ─────

function IconOnlyItem({ item, badges, pathname }: { item: NavItem; badges: BadgeMap; pathname: string }) {
  const Icon = item.icon
  const isActive = isMatch(pathname, item.path)
  const badge = item.badgeKey ? badges[item.badgeKey] : 0
  const tourTag = tourTagFor(item.path)

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={item.label}
      data-tour={tourTag}
      className={`group relative flex items-center justify-center h-9 w-full rounded-[8px] my-0.5 transition-all duration-150
        ${isActive
          ? 'bg-white/[0.08] text-white'
          : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
        }`}
    >
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
          style={{ background: 'linear-gradient(180deg, #2fa98e, #1B6B7B)', boxShadow: '0 0 8px rgba(47,169,142,0.5)' }}
        />
      )}
      <Icon className={`w-[16px] h-[16px] ${isActive ? 'text-[#2fa98e]' : ''}`} />
      {item.pin && !isActive && (
        <span
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E6A817]"
          title="Flagship feature"
        />
      )}
      {badge > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center tabular-nums leading-none"
          style={{
            background: item.badgeKey === 'anomalies'
              ? 'linear-gradient(135deg, #E6A817, #D97706)'
              : 'linear-gradient(135deg, #2fa98e, #1B6B7B)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )
}

// ─── Live badges ──────────────────────────────────────────────

function useBadges() {
  const { user } = useAuth()
  const [badges, setBadges] = useState<BadgeMap>({ myTasks: 0, reviewQueue: 0, approvalQueue: 0, anomalies: 0 })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      try {
        const [rows, anomalies] = await Promise.all([
          orgStore.listAssignments(),
          orgStore.anomalyScan('role', { limit: 1 }).catch(() => ({ summary: { critical: 0, warn: 0, info: 0, total: 0, suppressed_total: 0, by_type: {} } as any })),
        ])
        if (cancelled) return
        const email = user.email.toLowerCase()
        setBadges({
          myTasks: rows.filter(a =>
            a.assigneeEmail.toLowerCase() === email &&
            (a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected')
          ).length,
          reviewQueue: rows.filter(a => a.status === 'submitted').length,
          approvalQueue: rows.filter(a => a.status === 'reviewed').length,
          anomalies: anomalies.summary?.critical ?? 0,
        })
      } catch { /* silent */ }
    }
    load()
    const iv = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [user?.email])

  return badges
}

// Atom kept available for any future submenu (placed at module bottom to silence unused-import noise).
void Atom
