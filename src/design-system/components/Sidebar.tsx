import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  // Section icons
  Home as HomeIcon, Workflow as WorkflowIcon, FileBarChart, Database, Building2, Cog,
  // Item icons
  LayoutDashboard, Inbox,
  CheckSquare, Shield, Network,
  FileText, BookMarked, BarChart3, AlertTriangle,
  Calculator as CalcIcon, BookOpen, Atom,
  Sparkles, Calendar, Scale, UserCog, Users, Target as TargetIcon,
  ShieldCheck, Settings,
  // Chrome
  ChevronLeft, ChevronRight, ChevronDown, Leaf, LogOut,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { resolveRole, ROLE_CATALOG, type PlatformRole } from '../../lib/rbac'
import SetupGuide from '../../components/SetupGuide'
import { useOrgBrand } from '../../lib/useOrgBrand'

type NavItem = {
  path: string
  label: string
  icon: typeof LayoutDashboard
  roles?: PlatformRole[]
  badgeKey?: 'myTasks' | 'reviewQueue' | 'approvalQueue' | 'anomalies'
  /** Small amber dot for flagship features. */
  pin?: boolean
  /** Hidden behind the "Show advanced" toggle by default. */
  advanced?: boolean
}

type NavGroup = {
  key: string
  label: string
  icon: typeof HomeIcon
  items: NavItem[]
  roles?: PlatformRole[]
}

/**
 * Sidebar — role-gated nav. Each role sees only what they can act on.
 *
 * Role matrix:
 *
 *   platform_admin   Home · Workflow · Report · Data · Admin · System    (19 items)
 *   gso              Home · Workflow · Report · Data · Admin · Audit     (13 items)
 *   subsidiary_lead  Home · Workflow · Report · Data · Admin             (11 items)
 *   plant_manager    Home · Workflow · Report · Data                     ( 7 items)
 *   data_contributor Home · Data                                         ( 4 items)
 *   narrative_owner  Home · Report (Publish+Index) · Admin (Materiality) ( 5 items)
 *   auditor          Home · Workflow · Report · System (Audit)           ( 7 items)
 */
const NAV: NavGroup[] = [
  {
    key: 'home', label: 'Home', icon: HomeIcon,
    items: [
      { path: '/dashboard',  label: 'Overview',   icon: LayoutDashboard },
      // Personal queue — only for roles that *do* task work. Admins, GSOs
      // and auditors oversee rather than execute, so they don't get this.
      { path: '/my-tasks',   label: 'My tasks',   icon: Inbox, badgeKey: 'myTasks',
        roles: ['data_contributor', 'plant_manager', 'narrative_owner'] },
    ],
  },
  {
    key: 'workflow', label: 'Workflow', icon: WorkflowIcon,
    roles: ['subsidiary_lead', 'plant_manager', 'group_sustainability_officer', 'platform_admin', 'auditor'],
    items: [
      { path: '/workflow/review',   label: 'Review queue',   icon: CheckSquare, badgeKey: 'reviewQueue',
        roles: ['subsidiary_lead', 'plant_manager', 'platform_admin'] },
      { path: '/workflow/approval', label: 'Approval queue', icon: Shield, badgeKey: 'approvalQueue',
        roles: ['group_sustainability_officer', 'platform_admin'] },
      { path: '/aggregator', label: 'Group rollup', icon: Network, advanced: true,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'auditor'] },
    ],
  },
  {
    key: 'report', label: 'Report', icon: FileBarChart,
    // Contributors don't publish reports or read cross-cutting analytics;
    // anomalies surface inside their data-entry screens instead.
    roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead',
            'plant_manager', 'narrative_owner', 'auditor'],
    items: [
      { path: '/reports',             label: 'Publish centre', icon: FileText,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner', 'auditor'] },
      { path: '/reports/performance', label: 'Performance data', icon: FileBarChart,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner', 'auditor'] },
      { path: '/reports/index',       label: 'GRI index',      icon: BookMarked, advanced: true,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner', 'auditor'] },
      // Analytics + Anomalies are for people who act on numbers. Narrative
      // owners write prose; they don't need these.
      { path: '/analytics',           label: 'Analytics',      icon: BarChart3,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager', 'auditor'] },
      { path: '/analytics/anomalies', label: 'Anomalies',      icon: AlertTriangle, badgeKey: 'anomalies',
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager', 'auditor'] },
    ],
  },
  {
    key: 'data', label: 'Data', icon: Database,
    roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager', 'data_contributor'],
    items: [
      { path: '/data/standard', label: 'Data standard', icon: BookOpen, pin: true },
      { path: '/calculators',   label: 'Calculators',   icon: CalcIcon },
      // EF library & GWP values moved to Admin — they're maintained
      // reference tables, not something data contributors touch.
    ],
  },
  {
    key: 'admin', label: 'Admin', icon: Building2,
    roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner'],
    items: [
      { path: '/onboarding',         label: 'Setup guide',      icon: Sparkles, pin: true,
        roles: ['platform_admin'] },
      { path: '/admin/periods',      label: 'Reporting cycles', icon: Calendar,
        roles: ['platform_admin', 'group_sustainability_officer'] },
      { path: '/admin/materiality',  label: 'Materiality',      icon: Scale,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner'] },
      { path: '/admin/targets',      label: 'Climate targets',  icon: TargetIcon,
        roles: ['platform_admin', 'group_sustainability_officer'] },
      { path: '/admin/assignments',  label: 'Assignments',      icon: UserCog,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead'] },
      { path: '/admin/users',        label: 'Users & roles',    icon: Users,
        roles: ['platform_admin'] },
      { path: '/admin/ef-library',   label: 'EF library',       icon: BookOpen, advanced: true,
        roles: ['platform_admin'] },
      { path: '/admin/gwp',          label: 'GWP values',       icon: Atom, advanced: true,
        roles: ['platform_admin'] },
    ],
  },
  {
    key: 'system', label: 'System', icon: Cog,
    // GSOs access audit trail inline from the report detail page.
    // Only admins and auditors need a dedicated System section.
    roles: ['platform_admin', 'auditor'],
    items: [
      { path: '/admin/audit', label: 'Audit trail', icon: ShieldCheck, advanced: true,
        roles: ['platform_admin', 'auditor'] },
      { path: '/settings',    label: 'Settings',    icon: Settings,
        roles: ['platform_admin'] },
    ],
  },
]

function canSee(role: PlatformRole, required?: PlatformRole[]): boolean {
  if (!required || required.length === 0) return true
  return required.includes(role)
}

function hasAdvancedForRole(role: PlatformRole): boolean {
  return NAV.some(g => canSee(role, g.roles) && g.items.some(it => it.advanced && canSee(role, it.roles)))
}

const STORE_KEY = 'aeiforo_sidebar_open'
const ADVANCED_KEY = 'aeiforo_sidebar_advanced'

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
  const primary = brand.primary_color || '#1B6B7B'
  const secondary = brand.secondary_color || '#1e8e7a'

  // Work out which section the current route belongs to.
  const activeKey = useMemo(() => {
    for (const g of NAV) {
      if (g.items.some(it => location.pathname === it.path || location.pathname.startsWith(it.path + '/'))) return g.key
    }
    return 'home'
  }, [location.pathname])

  // Expanded-section state: start with the active one open, others closed. Persist toggles.
  const [openSet, setOpenSet] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
      if (Array.isArray(stored)) return new Set(stored)
    } catch { /* ignore */ }
    return new Set([activeKey])
  })
  // Auto-open the active section so the current page is always reachable.
  useEffect(() => {
    setOpenSet(prev => { if (prev.has(activeKey)) return prev; const next = new Set(prev); next.add(activeKey); return next })
  }, [activeKey])
  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(openSet))) }, [openSet])

  const toggleSection = (k: string) => setOpenSet(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next })

  // "Show advanced" — hides utility items by default to reduce nav clutter.
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => {
    try { return localStorage.getItem(ADVANCED_KEY) === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem(ADVANCED_KEY, showAdvanced ? '1' : '0') } catch { /* ignore */ }
  }, [showAdvanced])

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

      {/* Logo */}
      <div className={`h-[64px] flex items-center ${collapsed ? 'justify-center px-0' : 'px-5'} flex-shrink-0 relative`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div
              className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
                boxShadow: `0 4px 12px ${primary}55, inset 0 1px 0 rgba(255,255,255,0.15)`,
              }}
            >
              {brand.logo_mark ? (
                <span className="text-[10.5px] font-display font-bold text-white tracking-[0.04em]">{brand.logo_mark}</span>
              ) : (
                <Leaf className="w-[18px] h-[18px] text-white" />
              )}
            </div>
            <div className="leading-none min-w-0">
              <span className="text-[14.5px] font-display font-bold tracking-[-0.025em] block text-white truncate">{brand.name}</span>
              <span className="text-[9.5px] text-white/40 font-medium mt-[3px] block tracking-[0.08em] uppercase truncate">
                {brand.industry ? `${brand.industry} · ESG` : 'Carbon \u00b7 ESG'}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
              boxShadow: `0 4px 12px ${primary}55, inset 0 1px 0 rgba(255,255,255,0.15)`,
            }}
          >
            {brand.logo_mark ? (
              <span className="text-[10.5px] font-display font-bold text-white tracking-[0.04em]">{brand.logo_mark}</span>
            ) : (
              <Leaf className="w-[18px] h-[18px] text-white" />
            )}
          </div>
        )}
      </div>

      {/* Setup guide widget */}
      <SetupGuide collapsed={collapsed} />

      {/* Nav sections */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-2.5'} pb-3 space-y-0.5 relative`}>
        {NAV
          .filter(g => canSee(role, g.roles))
          .map(g => ({ g, visibleItems: g.items.filter(it => canSee(role, it.roles) && (showAdvanced || !it.advanced)) }))
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

        {!collapsed && hasAdvancedForRole(role) && (
          <button
            onClick={() => setShowAdvanced(s => !s)}
            className="mt-3 w-full flex items-center gap-2 px-2.5 h-8 rounded-[6px] text-[11px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-colors cursor-pointer"
            title={showAdvanced ? 'Hide advanced items' : 'Show advanced items (EF library, GWP values, audit trail, etc.)'}
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            <span className="flex-1 text-left">{showAdvanced ? 'Hide advanced' : 'Show advanced'}</span>
          </button>
        )}
      </nav>

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
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  )
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
  const isActive = activeKey === group.key
  const aggBadge = items.reduce((s, it) => it.badgeKey ? s + (badges[it.badgeKey] ?? 0) : s, 0)

  // ──────────────────────────────────────────────────────────
  // Collapsed (icon-rail) mode: flat list of item icons, with a
  // tiny divider between sections so the grouping is still visible.
  // This is the standard pattern (Linear, VS Code, GitHub) and what
  // the sidebar used before the section-collapse refactor.
  // ──────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className={isFirst ? '' : 'mt-1.5 pt-1.5 border-t border-white/[0.04]'}>
        {items.map(it => <IconOnlyItem key={it.path} item={it} badges={badges} pathname={pathname} />)}
      </div>
    )
  }

  // Void unused locals in this branch
  void isActive; void aggBadge; void onToggle

  // Expanded-sidebar mode: collapsible section with chevron + children
  return <ExpandedSection group={group} items={items} expanded={expanded} activeKey={activeKey} onToggle={onToggle} badges={badges} pathname={pathname} />
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
        className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-[6px] text-[12.5px] font-semibold tracking-[-0.003em] transition-colors duration-[120ms] ease-[var(--ease-out-expo)]
          ${isActive && !expanded
            ? 'bg-white/[0.05] text-white'
            : 'text-white/75 hover:text-white hover:bg-white/[0.04]'
          }`}
      >
        <SectIcon className={`w-[16px] h-[16px] flex-shrink-0 transition-colors ${isActive ? 'text-[#2fa98e]' : ''}`} />
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
          className={`w-3.5 h-3.5 text-white/35 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Children */}
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

// ─── Child nav item ───────────────────────────────────────────

function ChildItem({ item, badges, pathname }: { item: NavItem; badges: BadgeMap; pathname: string }) {
  const Icon = item.icon
  const isActive = pathname === item.path || pathname.startsWith(item.path + '/')
  const badge = item.badgeKey ? badges[item.badgeKey] : 0

  return (
    <NavLink
      to={item.path}
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
  const isActive = pathname === item.path || pathname.startsWith(item.path + '/')
  const badge = item.badgeKey ? badges[item.badgeKey] : 0

  return (
    <NavLink
      to={item.path}
      title={item.label}
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
        const { orgStore } = await import('../../lib/orgStore')
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
