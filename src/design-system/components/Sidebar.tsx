import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  // Section icons
  Briefcase, FileBarChart, Database, BarChart3 as AnalyticsIcon, Cog,
  // Item icons
  LayoutDashboard, Inbox, ClipboardList,
  FileText, BookMarked, Library,
  UserCog, Plug, BookOpen, Atom, Calculator as CalcIcon, AlertTriangle, Paperclip,
  Sparkles, Users, Scale, Target as TargetIcon, Settings as SettingsIcon,
  ShieldCheck, Activity, KeyRound, Leaf, CalendarRange, Hash,
  // Chrome
  ChevronLeft, ChevronRight, ChevronDown, LogOut,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { resolveRole, ROLE_CATALOG, type PlatformRole } from '../../lib/rbac'
import SetupGuide from '../../components/SetupGuide'
import { useOrgBrand } from '../../lib/useOrgBrand'
import { orgStore } from '../../lib/orgStore'
import NexusBrandCard from '../../components/NexusBrandCard'
import { ContourField } from '../illustrations/ContourField'
import { spring } from '../../motion/tokens'
import { useFramework } from '../../lib/frameworks'
import { isOpenAssignment } from '../../lib/journey'

type NavItem = {
  path: string
  /** i18n key — rendered with t(). */
  label: string
  icon: typeof LayoutDashboard
  roles?: PlatformRole[]
  badgeKey?: 'myTasks' | 'reviewQueue' | 'approvalQueue' | 'anomalies'
  /** Small amber dot for flagship features. */
  pin?: boolean
}

type NavGroup = {
  key: string
  /** i18n key — rendered with t(). */
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
    key: 'work', label: 'shell.nav.groups.work', icon: Briefcase,
    items: [
      { path: '/',                label: 'shell.nav.items.myDay',     icon: LayoutDashboard },
      { path: '/my-tasks',        label: 'shell.nav.items.tasks',      icon: ClipboardList, badgeKey: 'myTasks' },
      { path: '/inbox',           label: 'shell.nav.items.inbox',      icon: Inbox },
      // Calendar removed from the sidebar — the page itself stays as a
      // "coming soon" placeholder so bookmarks don't 404, but until the
      // event-scheduling layer is real we don't promote it in the nav.
    ],
  },
  {
    key: 'reports', label: 'shell.nav.groups.reports', icon: FileBarChart,
    items: [
      { path: '/reports',           label: 'shell.nav.items.activeReports',      icon: FileText,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner', 'auditor'] },
      { path: '/reports/templates', label: 'shell.nav.items.templates',           icon: BookMarked,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner', 'auditor'] },
      { path: '/reports/library',   label: 'shell.nav.items.disclosuresLibrary', icon: Library,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner', 'auditor'] },
    ],
  },
  {
    key: 'data', label: 'shell.nav.groups.data', icon: Database,
    roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager', 'data_contributor'],
    items: [
      { path: '/admin/assignments',   label: 'shell.nav.items.assignments',       icon: UserCog,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead'] },
      { path: '/data',                label: 'shell.nav.items.dataCollection',    icon: Database,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead'] },
      { path: '/data/spreadsheet',    label: 'shell.nav.items.spreadsheet',       icon: ClipboardList,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager', 'data_contributor'] },
      { path: '/data/evidence',       label: 'shell.nav.items.evidence',          icon: Paperclip },
      { path: '/calculators',         label: 'shell.nav.items.calculators',       icon: CalcIcon },
      { path: '/calculators/pcaf',    label: 'shell.nav.items.pcafPortfolio',    icon: Scale, pin: true,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead'] },
      { path: '/data/green-ledger',   label: 'shell.nav.items.greenLedger',       icon: Leaf,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager'] },
      { path: '/data/connectors',     label: 'shell.nav.items.connectors',        icon: Plug },
      { path: '/data/ef-library',     label: 'shell.nav.items.emissionFactors',  icon: BookOpen,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead'] },
      { path: '/data/anomalies',      label: 'shell.nav.items.anomalies',         icon: AlertTriangle, badgeKey: 'anomalies' },
    ],
  },
  {
    key: 'analytics', label: 'shell.nav.groups.analytics', icon: AnalyticsIcon,
    roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'plant_manager', 'auditor'],
    items: [
      { path: '/analytics',   label: 'shell.nav.items.analytics', icon: AnalyticsIcon },
      { path: '/reports/ai',  label: 'shell.nav.items.aiReport', icon: Sparkles, pin: true,
        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner'] },
    ],
  },
]

const ADMIN_TRAY: NavItem[] = [
  // `/admin/org` was a redirect-only entry pointing at /onboarding — it
  // surfaced as a duplicate "Organisation" link. The onboarding flow is
  // still reachable from the workspace setup card; the legacy org tree
  // editor lives on at /admin/org/legacy.
  { path: '/admin/users',         label: 'shell.nav.items.usersRoles',   icon: Users,        roles: ['platform_admin'] },
  { path: '/admin/periods',       label: 'shell.nav.items.reportingCycles', icon: CalendarRange, roles: ['platform_admin', 'group_sustainability_officer'] },
  { path: '/admin/materiality',   label: 'shell.nav.items.materiality',     icon: Scale,        roles: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead', 'narrative_owner'] },
  { path: '/admin/targets',       label: 'shell.nav.items.climateTargets', icon: TargetIcon,   roles: ['platform_admin', 'group_sustainability_officer'] },
  { path: '/admin/data-standard', label: 'shell.nav.items.dataStandard',   icon: BookOpen,     roles: ['platform_admin', 'group_sustainability_officer'] },
  { path: '/admin/audit',         label: 'shell.nav.items.activityHistory', icon: ShieldCheck, roles: ['platform_admin', 'auditor'] },
  { path: '/admin/api-keys',      label: 'shell.nav.items.apiKeys',        icon: KeyRound,     roles: ['platform_admin'] },
  { path: '/admin/scim',          label: 'shell.nav.items.scim',            icon: KeyRound,     roles: ['platform_admin'] },
  { path: '/admin/blockchain',    label: 'shell.nav.items.blockchain',      icon: Hash,  roles: ['platform_admin', 'auditor'] },
  { path: '/admin/system-status', label: 'shell.nav.items.systemStatus',   icon: Activity,     roles: ['platform_admin'] },
  { path: '/admin/settings',      label: 'shell.nav.items.settings',        icon: SettingsIcon, roles: ['platform_admin'] },
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
  const { t } = useTranslation()
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
        bg-[var(--bg-inverse)] text-white transition-[width] duration-300 ease-[var(--ease-out-expo)]
        shadow-[inset_-1px_0_0_var(--sidebar-edge)] relative overflow-hidden`}
    >
      {/* Signature: faint emerald contour lines behind the brand lockup. */}
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-28 w-[440px] h-[240px]" style={{ color: 'var(--sidebar-accent)', opacity: 0.11 }}>
        <ContourField anchor="top-right" rings={11} seed={7} className="w-full h-full" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 inset-x-0 h-[160px]"
        style={{ background: 'radial-gradient(80% 100% at 100% 0%, rgba(16,185,129,0.10), transparent 70%)' }}
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
      <div className={`flex-shrink-0 border-t border-[var(--sidebar-divider)] ${collapsed ? 'px-2' : 'px-3'} py-3 space-y-2 relative`}>
        <div
          className={`flex items-center ${collapsed ? 'justify-center py-2' : 'gap-3 px-2 py-2'} rounded-[10px]`}
          style={{ background: 'rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-caption font-semibold text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent-600), var(--accent-800))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px rgba(52,211,153,0.25)',
            }}
          >
            {firstName[0]}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-small font-semibold text-[var(--sidebar-fg)] truncate leading-tight">{user?.name}</p>
                <p className="text-caption text-[var(--sidebar-fg-subtle)] truncate leading-tight mt-0.5 font-medium">{t(`shell.roles.${role}.name`, { defaultValue: roleMeta.name })}</p>
              </div>
              <button
                onClick={logout}
                title={t('nav.logout')}
                className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--sidebar-fg-subtle)] hover:text-white hover:bg-[var(--sidebar-hover-bg)] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center h-7 rounded-[6px] text-[var(--sidebar-fg-subtle)] hover:text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover-bg)] transition-colors"
          aria-label={collapsed ? t('shell.sidebar.expand') : t('shell.sidebar.collapse')}
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

const ALL_PATHS = [...NAV.flatMap(g => g.items.map(it => it.path)), ...ADMIN_TRAY.map(it => it.path)]

/** Active only when no more specific nav item also matches (so /data/evidence
 *  lights "Evidence", not "Data collection" as well). */
function isActivePath(pathname: string, target: string): boolean {
  if (!isMatch(pathname, target)) return false
  return !ALL_PATHS.some(p => p !== target && p.length > target.length && isMatch(pathname, p))
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
      <div className={isFirst ? '' : 'mt-1.5 pt-1.5 border-t border-[var(--sidebar-divider)]'}>
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
  const { t } = useTranslation()
  const isActive = activeKey === group.key
  const SectIcon = group.icon
  const aggBadge = items.reduce((s, it) => it.badgeKey ? s + (badges[it.badgeKey] ?? 0) : s, 0)

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-2.5 h-9 lg:h-8 min-h-[44px] lg:min-h-0 rounded-[6px] text-micro font-semibold uppercase tracking-[0.06em] transition-colors duration-[120ms] ease-[var(--ease-out-expo)]
          ${isActive && !expanded
            ? 'bg-[var(--sidebar-hover-bg)] text-white'
            : isActive
              ? 'text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover-bg)]'
              : 'text-[var(--sidebar-fg-muted)] hover:text-white hover:bg-[var(--sidebar-hover-bg)]'
          }`}
      >
        <SectIcon className={`w-[14px] h-[14px] flex-shrink-0 transition-colors ${isActive ? 'text-[var(--sidebar-accent)]' : ''}`} />
        <span className="flex-1 text-left">{t(group.label)}</span>
        {aggBadge > 0 && !expanded && (
          <span
            className="text-micro font-semibold px-1.5 min-w-[18px] h-[18px] rounded-full leading-none inline-flex items-center justify-center tabular-nums"
            style={{ background: 'var(--sidebar-badge-bg)', color: 'var(--sidebar-badge-fg)' }}
          >
            {aggBadge}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-[var(--sidebar-fg-subtle)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className="overflow-hidden transition-[max-height,opacity] duration-250 ease-[var(--ease-out-expo)]"
        style={{
          // 48px-per-row accommodates the 44px touch target plus row gap on
          // mobile; harmless on desktop where rows only need ~32px.
          maxHeight: expanded ? `${items.length * 48 + 12}px` : 0,
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="pt-0.5 pb-1 pl-[11px]" style={{ borderLeft: '1px solid var(--sidebar-divider)', marginLeft: '18px' }}>
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
  const { t } = useTranslation()
  if (collapsed) {
    // Icon-only rail: the items render in the collapsed gap; render the
    // gear at the bottom of the nav to keep parity.
    return (
      <div className="px-2 pb-2 border-t border-[var(--sidebar-divider)] pt-1.5">
        {items.map(it => <IconOnlyItem key={it.path} item={it} badges={{ myTasks: 0, reviewQueue: 0, approvalQueue: 0, anomalies: 0 }} pathname={pathname} />)}
      </div>
    )
  }
  return (
    <div className="px-2.5 pb-2 border-t border-[var(--sidebar-divider)] pt-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-2.5 h-10 rounded-[6px] text-small font-semibold text-[var(--sidebar-fg-muted)] hover:text-white hover:bg-[var(--sidebar-hover-bg)] transition-colors"
      >
        <Cog className="w-[15px] h-[15px] flex-shrink-0" />
        <span className="flex-1 text-left uppercase tracking-[0.06em] text-micro font-semibold">{t('shell.nav.groups.admin')}</span>
        <ChevronDown className={`w-3 h-3 text-[var(--sidebar-fg-subtle)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-250"
        style={{ maxHeight: open ? `${items.length * 48 + 12}px` : 0, opacity: open ? 1 : 0 }}
      >
        <div className="pt-0.5 pl-[11px]" style={{ borderLeft: '1px solid var(--sidebar-divider)', marginLeft: '18px' }}>
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
  const { t } = useTranslation()
  const Icon = item.icon
  const isActive = isActivePath(pathname, item.path)
  const badge = item.badgeKey ? badges[item.badgeKey] : 0
  const tourTag = tourTagFor(item.path)

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      data-tour={tourTag}
      className={`group relative flex items-center gap-2 px-2.5 h-9 lg:h-8 min-h-[44px] lg:min-h-0 rounded-[6px] text-small font-medium transition-colors duration-[120ms] ease-[var(--ease-out-expo)]
        ${isActive
          ? 'text-white'
          : 'text-[var(--sidebar-fg-muted)] hover:text-white hover:bg-[var(--sidebar-hover-bg)]'
        }`}
    >
      {isActive && (
        // Sliding active indicator: the pill and its rail glide between items.
        <motion.span
          layoutId="nav-active"
          transition={spring.snappy}
          aria-hidden
          className="absolute inset-0 rounded-[6px]"
          style={{ background: 'var(--sidebar-active-bg)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.10)' }}
        >
          <span
            className="absolute -left-[12px] top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
            style={{ background: 'var(--sidebar-accent)' }}
          />
        </motion.span>
      )}
      <Icon className={`relative w-[14px] h-[14px] flex-shrink-0 transition-colors ${isActive ? 'text-[var(--sidebar-accent)]' : 'group-hover:text-white/80'}`} />
      <span className="relative truncate flex-1">{t(item.label)}</span>
      {item.pin && !isActive && (
        <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--sidebar-warn)] flex-shrink-0" title={t('shell.sidebar.flagship')} />
      )}
      {badge > 0 && (
        <span
          className="relative text-micro font-semibold px-1.5 min-w-[18px] h-[18px] rounded-full leading-none inline-flex items-center justify-center tabular-nums"
          style={{
            background: isActive
              ? 'var(--sidebar-accent)'
              : item.badgeKey === 'anomalies' ? 'var(--sidebar-warn-bg)' : 'rgba(255,255,255,0.08)',
            color: isActive ? '#03241A' : item.badgeKey === 'anomalies' ? 'var(--sidebar-warn)' : 'var(--sidebar-fg)',
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
  const { t } = useTranslation()
  const Icon = item.icon
  const isActive = isActivePath(pathname, item.path)
  const badge = item.badgeKey ? badges[item.badgeKey] : 0
  const tourTag = tourTagFor(item.path)

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={t(item.label)}
      data-tour={tourTag}
      className={`group relative flex items-center justify-center h-9 w-full rounded-[8px] my-0.5 transition-colors duration-150
        ${isActive
          ? 'text-white'
          : 'text-[var(--sidebar-fg-muted)] hover:text-white hover:bg-[var(--sidebar-hover-bg)]'
        }`}
    >
      {isActive && (
        <motion.span
          layoutId="nav-active-rail"
          transition={spring.snappy}
          aria-hidden
          className="absolute inset-0 rounded-[8px]"
          style={{ background: 'var(--sidebar-active-bg)', boxShadow: 'inset 0 0 0 1px rgba(52,211,153,0.10)' }}
        >
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full" style={{ background: 'var(--sidebar-accent)' }} />
        </motion.span>
      )}
      <Icon className={`relative w-[16px] h-[16px] ${isActive ? 'text-[var(--sidebar-accent)]' : ''}`} />
      {item.pin && !isActive && (
        <span
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--sidebar-warn)]"
          title={t('shell.sidebar.flagship')}
        />
      )}
      {badge > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-micro font-semibold flex items-center justify-center tabular-nums leading-none"
          style={{
            background: item.badgeKey === 'anomalies' ? 'var(--sidebar-warn)' : 'var(--sidebar-accent)',
            color: '#03241A',
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
  const { active: framework } = useFramework()
  const [badges, setBadges] = useState<BadgeMap>({ myTasks: 0, reviewQueue: 0, approvalQueue: 0, anomalies: 0 })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      try {
        const [mine, rows, anomalies] = await Promise.all([
          // Same source and definition as My Day / My Tasks (lib/journey):
          // my assignments in the active framework that are open — not
          // started, in progress or sent back.
          orgStore.myAssignments(),
          orgStore.listAssignments(),
          orgStore.anomalyScan('role', { limit: 1 }).catch(() => ({ summary: { critical: 0, warn: 0, info: 0, total: 0, suppressed_total: 0, by_type: {} } as any })),
        ])
        if (cancelled) return
        const fw = rows.filter(a => a.framework_id === framework.id)
        setBadges({
          myTasks: mine.filter(a => a.framework_id === framework.id && isOpenAssignment(a)).length,
          reviewQueue: fw.filter(a => a.status === 'submitted').length,
          approvalQueue: fw.filter(a => a.status === 'reviewed').length,
          anomalies: anomalies.summary?.critical ?? 0,
        })
      } catch { /* silent */ }
    }
    load()
    const iv = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [user?.email, framework.id])

  return badges
}

// Atom kept available for any future submenu (placed at module bottom to silence unused-import noise).
void Atom
