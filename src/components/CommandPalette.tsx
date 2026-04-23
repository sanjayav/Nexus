import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ArrowRight, LayoutDashboard, Inbox, CheckSquare, Shield, Network,
  FileText, BookMarked, BarChart3, AlertTriangle, Calculator as CalcIcon,
  BookOpen, Atom, Sparkles, Calendar, Scale, UserCog, Users, ShieldCheck,
  Settings, LogOut, Moon, Plus,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { resolveRole, type PlatformRole } from '../lib/rbac'

interface Command {
  id: string
  label: string
  hint?: string
  icon: typeof Search
  group: 'Go to' | 'Actions' | 'System'
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
  { id: 'nav-ef',         label: 'EF library',        icon: BookOpen,        group: 'Go to', roles: ['platform_admin','group_sustainability_officer'], run: c => c.navigate('/admin/ef-library') },
  { id: 'nav-gwp',        label: 'GWP values',        icon: Atom,            group: 'Go to', roles: ['platform_admin','group_sustainability_officer'], run: c => c.navigate('/admin/gwp') },
  { id: 'nav-setup',      label: 'Setup guide',       icon: Sparkles,        group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/onboarding') },
  { id: 'nav-periods',    label: 'Reporting cycles',  icon: Calendar,        group: 'Go to', roles: ['platform_admin','group_sustainability_officer'], run: c => c.navigate('/admin/periods') },
  { id: 'nav-mat',        label: 'Materiality',       icon: Scale,           group: 'Go to', roles: ['platform_admin','group_sustainability_officer','subsidiary_lead','narrative_owner'], run: c => c.navigate('/admin/materiality') },
  { id: 'nav-assign',     label: 'Assignments',       icon: UserCog,         group: 'Go to', roles: ['platform_admin','group_sustainability_officer','subsidiary_lead'], run: c => c.navigate('/admin/assignments') },
  { id: 'nav-users',      label: 'Users & roles',     icon: Users,           group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/admin/users') },
  { id: 'nav-audit',      label: 'Audit trail',       icon: ShieldCheck,     group: 'Go to', roles: ['platform_admin','group_sustainability_officer','auditor'], run: c => c.navigate('/admin/audit') },
  { id: 'nav-settings',   label: 'Settings',          icon: Settings,        group: 'Go to', roles: ['platform_admin'], run: c => c.navigate('/settings') },

  // Actions
  { id: 'act-new-assign', label: 'New assignment',    icon: Plus,            group: 'Actions', roles: ['platform_admin','group_sustainability_officer','subsidiary_lead'], run: c => c.navigate('/admin/assignments?new=1') },
  { id: 'act-publish',    label: 'Publish report',    icon: FileText,        group: 'Actions', roles: ['platform_admin','group_sustainability_officer'], run: c => c.navigate('/reports') },

  // System
  { id: 'sys-theme',      label: 'Toggle theme',      hint: 'Light / dark',  icon: Moon, group: 'System', run: c => c.toggleTheme() },
  { id: 'sys-logout',     label: 'Sign out',          icon: LogOut,          group: 'System', run: c => c.logout() },
]

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  const visible = useMemo(() => {
    return COMMANDS.filter(c => !c.roles || c.roles.includes(role))
  }, [role])

  const filtered = useMemo(() => {
    if (!query.trim()) return visible
    const q = query.toLowerCase()
    return visible.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.hint ?? '').toLowerCase().includes(q) ||
      (c.keywords ?? '').toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q)
    )
  }, [visible, query])

  const grouped = useMemo(() => {
    const m = new Map<string, Command[]>()
    for (const c of filtered) {
      const arr = m.get(c.group) ?? []
      arr.push(c); m.set(c.group, arr)
    }
    return Array.from(m.entries())
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
            aria-label="Command palette"
            onKeyDown={onKey}
          >
            {/* Input */}
            <div className="flex items-center gap-2.5 px-4 h-12 border-b border-[var(--border-subtle)]">
              <Search className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search for a page or an action…"
                className="flex-1 bg-transparent outline-none text-[13.5px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <span className="kbd">esc</span>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[56vh] overflow-y-auto py-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-[12.5px] text-[var(--text-tertiary)]">
                  No matches for <span className="font-mono text-[var(--text-primary)]">“{query}”</span>
                </div>
              ) : (
                grouped.map(([group, items]) => (
                  <div key={group} className="px-1.5 py-1">
                    <div className="px-3 pt-2 pb-1 text-[10.5px] uppercase tracking-[0.08em] font-semibold text-[var(--text-tertiary)]">
                      {group}
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
                            <span className="flex-1 truncate font-medium">{c.label}</span>
                            {c.hint && <span className="text-[11px] text-[var(--text-tertiary)] truncate">{c.hint}</span>}
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
            <div className="flex items-center justify-between gap-4 px-4 h-9 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] text-[var(--text-tertiary)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><span className="kbd">↑↓</span> Navigate</span>
                <span className="inline-flex items-center gap-1"><span className="kbd">↵</span> Select</span>
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
