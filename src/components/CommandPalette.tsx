import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Search, ArrowRight, LayoutDashboard, Inbox, CheckSquare, Shield, Network,
  FileText, BookMarked, BarChart3, AlertTriangle, Calculator as CalcIcon,
  BookOpen, Atom, Sparkles, Calendar, Scale, UserCog, Users, ShieldCheck,
  Settings, LogOut, Moon, Plus, Clock, Library, Leaf,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { resolveRole, type PlatformRole } from '../lib/rbac'
import { getActiveFrameworks } from '../lib/frameworks'
import { frameworkName } from './FrameworkBadge'

interface Command {
  id: string
  label: string
  hint?: string
  icon: typeof Search
  group: 'Go to' | 'Actions' | 'Frameworks' | 'Recent' | 'System'
  roles?: PlatformRole[]
  run: (ctx: { navigate: (p: string) => void; toggleTheme: () => void; logout: () => void }) => void
  keywords?: string
  kbd?: string
}

const COMMANDS: Command[] = [
  // Navigation
  { id: 'nav-dash',       label: 'Overview',          icon: LayoutDashboard, group: 'Go to', run: c => c.navigate('/dashboard') },
  { id: 'nav-tasks',      label: 'My tasks',          icon: Inbox,           group: 'Go to', roles: ['data_contributor','plant_manager','narrative_owner','platform_admin'], run: c => c.navigate('/my-tasks') },
  { id: 'nav-review',     label: 'Review queue',      icon: CheckSquare,     group: 'Go to', roles: ['subsidiary_lead','plant_manager','platform_admin'], run: c => c.navigate('/workflow/review') },
  { id: 'nav-approval',   label: 'Approval queue',    icon: Shield,          group: 'Go to', roles: ['group_sustainability_officer','platform_admin'], run: c => c.navigate('/workflow/approval') },
  { id: 'nav-rollup',     label: 'Group rollup',      icon: Network,         group: 'Go to', roles: ['platform_admin','group_sustainability_officer','subsidiary_lead','auditor'], run: c => c.navigate('/aggregator') },
  { id: 'nav-reports',    label: 'Publish centre',    icon: FileText,        group: 'Go to', run: c => c.navigate('/reports') },
  { id: 'nav-gri',        label: 'GRI index',         icon: BookMarked,      group: 'Go to', run: c => c.navigate('/reports/index') },
  { id: 'nav-analytics',  label: 'Analytics',         icon: BarChart3,       group: 'Go to', run: c => c.navigate('/analytics') },
  { id: 'nav-anomalies',  label: 'Anomalies',         icon: AlertTriangle,   group: 'Go to', run: c => c.navigate('/analytics/anomalies') },
  { id: 'nav-standard',   label: 'Data standard',     icon: BookOpen,        group: 'Go to', run: c => c.navigate('/data/standard') },
  { id: 'nav-calc',       label: 'Calculators',       icon: CalcIcon,        group: 'Go to', run: c => c.navigate('/calculators') },
  { id: 'nav-scope3',     label: 'Scope 3 calculators', icon: CalcIcon,      group: 'Go to', run: c => c.navigate('/calculators/scope3') },
  { id: 'nav-ef',         label: 'EF library',        icon: Library,         group: 'Go to', roles: ['platform_admin','group_sustainability_officer'], run: c => c.navigate('/admin/ef-library') },
  { id: 'nav-gwp',        label: 'GWP values',        icon: Atom,            group: 'Go to', roles: ['platform_admin','group_sustainability_officer'], run: c => c.navigate('/admin/gwp') },
  { id: 'nav-setup',      label: 'Setup guide',       icon: Sparkles,        group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/welcome'), keywords: 'checklist onboarding 设置 清单' },
  { id: 'nav-welcome',    label: 'Guided setup',      icon: Sparkles,        group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/welcome'), keywords: 'welcome wizard sample data 欢迎 向导 示例数据' },
  { id: 'nav-periods',    label: 'Reporting cycles',  icon: Calendar,        group: 'Go to', roles: ['platform_admin','group_sustainability_officer'], run: c => c.navigate('/admin/periods') },
  { id: 'nav-mat',        label: 'Materiality',       icon: Scale,           group: 'Go to', roles: ['platform_admin','group_sustainability_officer','subsidiary_lead','narrative_owner'], run: c => c.navigate('/admin/materiality') },
  { id: 'nav-assign',     label: 'Assignments',       icon: UserCog,         group: 'Go to', roles: ['platform_admin','group_sustainability_officer','subsidiary_lead'], run: c => c.navigate('/admin/assignments') },
  { id: 'nav-users',      label: 'Users & roles',     icon: Users,           group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/admin/users') },
  { id: 'nav-audit',      label: 'Audit trail',       icon: ShieldCheck,     group: 'Go to', roles: ['platform_admin','group_sustainability_officer','auditor'], run: c => c.navigate('/admin/audit') },
  { id: 'nav-green',      label: 'Green power & credits', icon: Leaf,        group: 'Go to', roles: ['platform_admin','group_sustainability_officer','subsidiary_lead','plant_manager'], run: c => c.navigate('/data/green-ledger'), keywords: 'renewable certificates gec i-rec ccer carbon credits 绿证 绿电 碳信用' },
  { id: 'nav-connectors', label: 'Connectors',        icon: Network,         group: 'Go to', roles: ['platform_admin','group_sustainability_officer'], run: c => c.navigate('/data/connectors') },
  { id: 'nav-inbox',      label: 'Inbox',             icon: Inbox,           group: 'Go to', run: c => c.navigate('/inbox') },
  { id: 'nav-scim',       label: 'SCIM tokens',       icon: Shield,          group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/admin/scim'), keywords: 'identity provisioning' },
  { id: 'nav-apikeys',    label: 'API keys',          icon: Shield,          group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/admin/api-keys') },
  { id: 'nav-system',     label: 'System status',     icon: ShieldCheck,     group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/admin/system-status') },
  { id: 'nav-settings',   label: 'Settings',          icon: Settings,        group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/settings') },

  // Actions
  { id: 'act-new-assign', label: 'New assignment',    icon: Plus,            group: 'Actions', roles: ['platform_admin','group_sustainability_officer','subsidiary_lead'], run: c => c.navigate('/admin/assignments?new=1') },
  { id: 'act-bulk-assign',label: 'Bulk assign',       icon: UserCog,         group: 'Actions', roles: ['platform_admin','group_sustainability_officer','subsidiary_lead'], run: c => c.navigate('/admin/assignments?bulk=1') },
  { id: 'act-run-setup',  label: 'Run setup',         icon: Sparkles,        group: 'Actions', roles: ['platform_admin'], run: c => c.navigate('/welcome') },
  { id: 'act-publish',    label: 'Publish report',    icon: FileText,        group: 'Actions', roles: ['platform_admin','group_sustainability_officer'], run: c => c.navigate('/reports') },
  { id: 'act-new-apikey', label: 'Generate API key',  icon: Plus,            group: 'Actions', roles: ['platform_admin'], run: c => c.navigate('/admin/api-keys?new=1') },
  { id: 'act-export',     label: 'Download data export', icon: FileText,     group: 'Actions', roles: ['platform_admin','group_sustainability_officer','auditor'], run: c => c.navigate('/reports?export=1') },
  { id: 'act-toggle-mfa', label: 'Toggle MFA',        icon: Shield,          group: 'Actions', run: c => c.navigate('/settings?mfa=1') },

  // System
  { id: 'sys-theme',      label: 'Toggle theme',      hint: 'Light / dark',  icon: Moon, group: 'System', run: c => c.toggleTheme() },
  { id: 'sys-logout',     label: 'Sign out',          icon: LogOut,          group: 'System', run: c => c.logout() },
]

/** i18n keys for the command groups (the `group` value stays English as an id). */
const GROUP_KEYS: Record<Command['group'], string> = {
  'Go to': 'shell.palette.groups.goTo',
  'Actions': 'shell.palette.groups.actions',
  'Frameworks': 'shell.palette.groups.frameworks',
  'Recent': 'shell.palette.groups.recent',
  'System': 'shell.palette.groups.system',
}

// ── Recent navigation persistence ─────────────────────────────
interface RecentEntry { path: string; label: string; timestamp: number }
const RECENT_KEY = 'aeiforo_recent_nav'
const RECENT_MAX = 5

function readRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is RecentEntry =>
        e && typeof e.path === 'string' && typeof e.label === 'string' && typeof e.timestamp === 'number'
    ).slice(0, RECENT_MAX)
  } catch { return [] }
}

function writeRecent(entries: RecentEntry[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(entries.slice(0, RECENT_MAX))) } catch { /* ignore */ }
}

/** Push the current location into the recent-nav stack. Mounted once in AppShell. */
export function useTrackRecentNav() {
  const location = useLocation()
  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = location.pathname
    if (path === '/login' || path === '/' || path.startsWith('/verify/') || path.startsWith('/assure/')) return
    // Look up a friendly label from the command catalog if available.
    const match = COMMANDS.find(c => {
      // Match by reading the run fn's target path — best-effort, falls back to path.
      const fn = c.run.toString()
      return c.group === 'Go to' && fn.includes(`'${path}'`)
    })
    const label = match?.label ?? path.replace(/^\//, '').replace(/\//g, ' › ')
    const now = Date.now()
    const existing = readRecent().filter(r => r.path !== path)
    writeRecent([{ path, label, timestamp: now }, ...existing])
  }, [location.pathname])
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const role = resolveRole(user)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const toggleTheme = () => {
    const cur = document.documentElement.dataset.theme || 'light'
    const next = cur === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('aeiforo_theme', next) } catch { /* ignore */ }
  }

  // Read recent nav on open so the list is always fresh.
  const [recent, setRecent] = useState<RecentEntry[]>(() => readRecent())
  useEffect(() => { if (open) setRecent(readRecent()) }, [open])

  // Build the framework commands lazily; the catalog is small enough to map every render.
  const frameworkCommands: Command[] = useMemo(() => {
    return getActiveFrameworks().map(f => ({
      id: `fw-${f.id}`,
      label: frameworkName(f, isZh ? 'zh' : 'en'),
      hint: f.code,
      icon: BookMarked,
      group: 'Frameworks' as const,
      keywords: `${f.code} ${f.name} ${f.body} ${f.coverage.join(' ')}`,
      run: c => c.navigate(`/reports?framework=${encodeURIComponent(f.id)}`),
    }))
  }, [isZh])

  const recentCommands: Command[] = useMemo(() => {
    return recent.map((r, i) => ({
      id: `recent-${i}-${r.path}`,
      label: r.label,
      hint: r.path,
      icon: Clock,
      group: 'Recent' as const,
      run: c => c.navigate(r.path),
    }))
  }, [recent])

  const allCommands = useMemo(
    () => [...COMMANDS, ...frameworkCommands, ...recentCommands],
    [frameworkCommands, recentCommands]
  )

  const visible = useMemo(() => {
    return allCommands.filter(c => !c.roles || c.roles.includes(role))
  }, [allCommands, role])

  // Localised label/hint. Static commands translate by id; recent entries
  // store the English label, so map them back to their command when possible.
  const labelOf = (c: Command): string => {
    if (c.group === 'Frameworks') return c.label
    if (c.group === 'Recent') {
      const src = COMMANDS.find(x => x.label === c.label)
      return src ? t(`shell.palette.cmd.${src.id}`, { defaultValue: src.label }) : c.label
    }
    return t(`shell.palette.cmd.${c.id}`, { defaultValue: c.label })
  }
  const hintOf = (c: Command): string | undefined =>
    c.hint && c.group === 'System' ? t(`shell.palette.hint.${c.id}`, { defaultValue: c.hint }) : c.hint

  const filtered = useMemo(() => {
    if (!query.trim()) return visible
    const q = query.toLowerCase()
    return visible.filter(c =>
      c.label.toLowerCase().includes(q) ||
      labelOf(c).toLowerCase().includes(q) ||
      (c.hint ?? '').toLowerCase().includes(q) ||
      (c.keywords ?? '').toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q) ||
      t(GROUP_KEYS[c.group]).toLowerCase().includes(q)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query, i18n.language])

  // Render groups in a deliberate order so Recent sits at the top when empty query.
  const groupOrder: Command['group'][] = ['Recent', 'Go to', 'Frameworks', 'Actions', 'System']
  const grouped = useMemo(() => {
    const m = new Map<string, Command[]>()
    for (const c of filtered) {
      const arr = m.get(c.group) ?? []
      arr.push(c); m.set(c.group, arr)
    }
    return groupOrder.flatMap(g => {
      const items = m.get(g)
      return items && items.length ? [[g, items] as const] : []
    })
  }, [filtered])

  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlight(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => { setHighlight(0) }, [query])

  const run = (c: Command) => {
    c.run({ navigate, toggleTheme, logout })
    onClose()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(filtered.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const c = filtered[highlight]
      if (c) run(c)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center"
          style={{ paddingTop: 'max(10vh, 60px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: 'rgba(11,18,32,0.35)',
              backdropFilter: 'saturate(180%) blur(6px)',
              WebkitBackdropFilter: 'saturate(180%) blur(6px)',
            }}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-[min(640px,92vw)] rounded-[12px] overflow-hidden"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-modal)',
            }}
            role="dialog"
            aria-label={t('shell.palette.ariaLabel')}
            onKeyDown={onKey}
          >
            {/* Input */}
            <div className="flex items-center gap-2.5 px-4 h-12 border-b border-[var(--border-subtle)]">
              <Search className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('shell.palette.placeholder')}
                className="flex-1 bg-transparent outline-none text-[13.5px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <span className="kbd">esc</span>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[56vh] overflow-y-auto py-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-[12.5px] text-[var(--text-tertiary)]">
                  {t('shell.palette.noMatches')} <span className="font-mono text-[var(--text-primary)]">“{query}”</span>
                </div>
              ) : (
                grouped.map(([group, items]) => (
                  <div key={group} className="px-1.5 py-1">
                    <div className="px-3 pt-2 pb-1 text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)]">
                      {t(GROUP_KEYS[group])}
                    </div>
                    <div>
                      {items.map(c => {
                        const idx = filtered.indexOf(c)
                        const isHot = idx === highlight
                        const Icon = c.icon
                        return (
                          <button
                            key={c.id}
                            onMouseEnter={() => setHighlight(idx)}
                            onClick={() => run(c)}
                            className="w-full flex items-center gap-3 px-3 h-9 rounded-[6px] text-left text-[13px] transition-colors duration-[120ms] ease-[var(--ease-out-expo)]"
                            style={{
                              background: isHot ? 'var(--bg-secondary)' : 'transparent',
                              color: isHot ? 'var(--text-primary)' : 'var(--text-secondary)',
                            }}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75}
                              style={{ color: isHot ? 'var(--color-brand)' : 'var(--text-tertiary)' }}
                            />
                            <span className="flex-1 truncate font-medium">{labelOf(c)}</span>
                            {c.hint && <span className="text-caption text-[var(--text-tertiary)] truncate">{hintOf(c)}</span>}
                            {c.kbd && <span className="kbd">{c.kbd}</span>}
                            {isHot && (
                              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 px-4 h-9 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-caption text-[var(--text-tertiary)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><span className="kbd">↑↓</span> {t('shell.palette.navigate')}</span>
                <span className="inline-flex items-center gap-1"><span className="kbd">↵</span> {t('shell.palette.select')}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="kbd">⌘</span><span className="kbd">K</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/** Hook that opens the command palette on Cmd/Ctrl+K globally. */
export function useCommandPalette(): [boolean, () => void, () => void] {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return [open, () => setOpen(true), () => setOpen(false)]
}

/** Load the persisted theme on app mount. Call once from a top-level component. */
export function useThemeBoot() {
  useEffect(() => {
    try {
      const t = localStorage.getItem('aeiforo_theme')
      if (t === 'dark' || t === 'light') {
        document.documentElement.dataset.theme = t
      }
    } catch { /* ignore */ }
  }, [])
}
