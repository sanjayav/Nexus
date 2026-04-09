import { useState, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Send,
  UserPlus,
  Calculator,
  CalendarDays,
  MessageSquare,
  RotateCcw,
  X,
  FileCheck,
  Leaf,
  Globe,
  Building2,
  Scale,
  AlertCircle,
} from 'lucide-react'
import { Card, Badge } from '../design-system'
import {
  FRAMEWORKS,
  GROUP_THEME_COLORS,
  MODULE_TAG_COLORS,
} from '../data/frameworkData'
import {
  FIELD_TEMPLATES,
  DISCLOSURE_FIELDS,
  DEMO_AUTO_VALUES,
  type DisclosureField,
} from '../data/disclosureFields'
import { useAuth } from '../auth/AuthContext'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

type DisclosureStatus = 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected'

interface DisclosureState {
  frameworkId: string
  code: string
  status: DisclosureStatus
  assignedTo: string | null
  dueDate: string | null
  values: Record<string, string | number | boolean>
  comments: { user: string; text: string; date: string }[]
  lastUpdated: string | null
}

type View = 'landing' | `framework:${string}` | `disclosure:${string}:${string}`

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const STATUS_CONFIG: Record<DisclosureStatus, { label: string; variant: 'gray' | 'amber' | 'blue' | 'purple' | 'green' | 'red' }> = {
  not_started: { label: 'Not Started', variant: 'gray' },
  in_progress: { label: 'In Progress', variant: 'amber' },
  submitted: { label: 'Submitted', variant: 'blue' },
  under_review: { label: 'Under Review', variant: 'purple' },
  approved: { label: 'Approved', variant: 'green' },
  rejected: { label: 'Changes Requested', variant: 'red' },
}

const DEMO_USERS = ['Jane Mitchell', 'Tom Harris', 'Sarah Chen', 'Alex Rivera']

const FRAMEWORK_ICONS: Record<string, typeof FileCheck> = {
  'gri-305': FileCheck,
  'gri-102': Leaf,
  'tcfd': Globe,
  'csrd-e1': Building2,
  'issb-s2': Scale,
}

/* ═══════════════════════════════════════════
   Status dot color helper
   ═══════════════════════════════════════════ */

const STATUS_DOT_COLORS: Record<DisclosureStatus, string> = {
  not_started: 'var(--text-tertiary)',
  in_progress: 'var(--accent-amber)',
  submitted: 'var(--accent-blue)',
  under_review: 'var(--accent-purple)',
  approved: 'var(--accent-green)',
  rejected: 'var(--accent-red)',
}

/* ═══════════════════════════════════════════
   Build initial demo data
   ═══════════════════════════════════════════ */

function buildKey(frameworkId: string, code: string): string {
  return `${frameworkId}::${code}`
}

function makeAutoValues(code: string): Record<string, string | number | boolean> {
  const templateKey = DISCLOSURE_FIELDS[code]
  const fields = FIELD_TEMPLATES[templateKey] ?? FIELD_TEMPLATES['narrative'] ?? []
  const vals: Record<string, string | number | boolean> = {}
  for (const f of fields) {
    if (f.type === 'auto' && f.autoSource && DEMO_AUTO_VALUES[f.autoSource] !== undefined) {
      vals[f.key] = DEMO_AUTO_VALUES[f.autoSource]
    }
  }
  return vals
}

function buildInitialState(): Map<string, DisclosureState> {
  const m = new Map<string, DisclosureState>()

  const add = (
    fwId: string,
    code: string,
    status: DisclosureStatus,
    assignedTo: string | null,
    dueDate: string | null,
    fillValues: boolean = false,
    comments: { user: string; text: string; date: string }[] = [],
  ) => {
    const values: Record<string, string | number | boolean> = fillValues ? makeAutoValues(code) : {}
    m.set(buildKey(fwId, code), {
      frameworkId: fwId,
      code,
      status,
      assignedTo,
      dueDate,
      values,
      comments,
      lastUpdated: dueDate,
    })
  }

  // GRI 305
  add('gri-305', '305-1', 'approved', 'Jane Mitchell', '2026-03-15', true, [
    { user: 'Jane Mitchell', text: 'All calculator outputs verified against source data. Approved.', date: '2026-03-14' },
    { user: 'Tom Harris', text: 'Cross-checked with facility reports.', date: '2026-03-13' },
  ])
  add('gri-305', '305-2', 'approved', 'Jane Mitchell', '2026-03-15', true)
  add('gri-305', '305-3', 'submitted', 'Tom Harris', '2026-03-20', true)
  add('gri-305', '305-4', 'in_progress', 'Sarah Chen', '2026-03-25', false)
  add('gri-305', '305-5', 'not_started', null, null)
  add('gri-305', '305-6', 'not_started', null, null)
  add('gri-305', '305-7', 'not_started', null, null)

  // GRI 102
  add('gri-102', 'CC-1', 'submitted', 'Tom Harris', '2026-03-20', true, [
    { user: 'Tom Harris', text: 'Board governance section complete. Ready for review.', date: '2026-03-18' },
  ])
  add('gri-102', 'CC-2', 'in_progress', 'Jane Mitchell', '2026-03-25', false)
  add('gri-102', 'CC-3', 'not_started', null, null)
  add('gri-102', 'CC-4', 'in_progress', 'Sarah Chen', '2026-04-01', false)
  add('gri-102', 'CC-5', 'approved', 'Jane Mitchell', '2026-03-15', true)
  add('gri-102', 'CC-6', 'not_started', null, null)
  add('gri-102', 'CC-7', 'not_started', null, null)

  // TCFD
  add('tcfd', 'GOV-a', 'approved', 'Jane Mitchell', '2026-03-10', true)
  add('tcfd', 'GOV-b', 'approved', 'Jane Mitchell', '2026-03-10', true)
  add('tcfd', 'STR-a', 'submitted', 'Tom Harris', '2026-03-20', true)
  add('tcfd', 'STR-b', 'in_progress', 'Tom Harris', '2026-03-25', false)
  add('tcfd', 'STR-c', 'not_started', null, null)
  add('tcfd', 'RM-a', 'submitted', 'Sarah Chen', '2026-03-20', true)
  add('tcfd', 'RM-b', 'not_started', null, null)
  add('tcfd', 'RM-c', 'not_started', null, null)
  add('tcfd', 'MT-a', 'in_progress', 'Sarah Chen', '2026-04-01', false)
  add('tcfd', 'MT-b', 'approved', 'Jane Mitchell', '2026-03-15', true)
  add('tcfd', 'MT-c', 'in_progress', 'Sarah Chen', '2026-04-01', false)

  // CSRD E1
  add('csrd-e1', 'E1-1', 'in_progress', 'Jane Mitchell', '2026-04-15', false)
  add('csrd-e1', 'E1-2', 'not_started', null, null)
  add('csrd-e1', 'E1-3', 'not_started', null, null)
  add('csrd-e1', 'E1-4', 'submitted', 'Tom Harris', '2026-04-01', true)
  add('csrd-e1', 'E1-5', 'approved', 'Jane Mitchell', '2026-03-20', true)
  add('csrd-e1', 'E1-6', 'approved', 'Jane Mitchell', '2026-03-20', true, [
    { user: 'Jane Mitchell', text: 'Auto-populated from Scope 1+2+3 calculators. Verified intensity calculations.', date: '2026-03-19' },
    { user: 'Sarah Chen', text: 'Revenue figure confirmed with finance team.', date: '2026-03-18' },
  ])
  add('csrd-e1', 'E1-7', 'not_started', null, null)
  add('csrd-e1', 'E1-8', 'in_progress', 'Sarah Chen', '2026-04-15', false)
  add('csrd-e1', 'E1-9', 'not_started', null, null)

  // ISSB S2
  add('issb-s2', 'S2.5-7', 'submitted', 'Jane Mitchell', '2026-03-25', true)
  add('issb-s2', 'S2.8-22', 'in_progress', 'Tom Harris', '2026-04-01', false)
  add('issb-s2', 'S2.23-24', 'not_started', null, null)
  add('issb-s2', 'S2.29(a)', 'approved', 'Jane Mitchell', '2026-03-20', true)
  add('issb-s2', 'S2.29(b)', 'approved', 'Jane Mitchell', '2026-03-20', true)
  add('issb-s2', 'S2.29(c)', 'submitted', 'Tom Harris', '2026-04-01', true)
  add('issb-s2', 'S2.29(d-g)', 'not_started', null, null)
  add('issb-s2', 'S2.33-37', 'in_progress', 'Sarah Chen', '2026-04-15', false)

  return m
}

/* ═══════════════════════════════════════════
   Recent activity demo data
   ═══════════════════════════════════════════ */

const RECENT_ACTIVITY = [
  { user: 'Jane Mitchell', action: 'approved', code: '305-1', framework: 'GRI 305', time: '2 hours ago' },
  { user: 'Tom Harris', action: 'submitted', code: 'CC-1', framework: 'GRI 102', time: '5 hours ago' },
  { user: 'Sarah Chen', action: 'started', code: 'E1-8', framework: 'CSRD E1', time: 'yesterday' },
  { user: 'Jane Mitchell', action: 'approved', code: 'E1-6', framework: 'CSRD E1', time: 'yesterday' },
  { user: 'Tom Harris', action: 'submitted', code: 'STR-a', framework: 'TCFD', time: '2 days ago' },
  { user: 'Sarah Chen', action: 'started', code: 'MT-a', framework: 'TCFD', time: '3 days ago' },
]

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

export default function ReportingFrameworks() {
  const { user } = useAuth()
  const [view, setView] = useState<View>('landing')
  const [disclosures, setDisclosures] = useState<Map<string, DisclosureState>>(() => buildInitialState())
  const [statusFilter, setStatusFilter] = useState<DisclosureStatus | 'all'>('all')
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null) // key or null
  const [assignUser, setAssignUser] = useState('')
  const [assignDate, setAssignDate] = useState('')
  const [assignPriority, setAssignPriority] = useState<'Low' | 'Medium' | 'High'>('Medium')
  const [newComment, setNewComment] = useState('')

  /* ─── Helpers ─── */

  const isAdminOrLead = user?.role === 'PA' || user?.role === 'TL'

  const updateDisclosure = useCallback((key: string, updater: (prev: DisclosureState) => DisclosureState) => {
    setDisclosures(prev => {
      const next = new Map(prev)
      const existing = next.get(key)
      if (existing) {
        next.set(key, updater(existing))
      }
      return next
    })
  }, [])

  const getDisclosuresForFramework = useCallback((fwId: string): DisclosureState[] => {
    const results: DisclosureState[] = []
    disclosures.forEach(d => {
      if (d.frameworkId === fwId) results.push(d)
    })
    return results
  }, [disclosures])

  const countByStatus = useCallback((fwId: string): Record<DisclosureStatus, number> => {
    const counts: Record<DisclosureStatus, number> = {
      not_started: 0, in_progress: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0,
    }
    disclosures.forEach(d => {
      if (d.frameworkId === fwId) counts[d.status]++
    })
    return counts
  }, [disclosures])

  const totalApproved = useMemo(() => {
    let approved = 0
    let total = 0
    disclosures.forEach(d => {
      total++
      if (d.status === 'approved') approved++
    })
    return { approved, total, pct: total > 0 ? Math.round((approved / total) * 100) : 0 }
  }, [disclosures])

  /* ─── Parse view segments ─── */

  const viewParts = view.split(':')
  const viewType = viewParts[0] as 'landing' | 'framework' | 'disclosure'
  const viewFrameworkId = viewType === 'framework' ? viewParts[1] : viewType === 'disclosure' ? viewParts[1] : null
  const viewDisclosureCode = viewType === 'disclosure' ? viewParts.slice(2).join(':') : null

  const activeFramework = viewFrameworkId ? FRAMEWORKS.find(f => f.id === viewFrameworkId) : null

  const findDisclosure = (fwId: string, code: string) => {
    for (const fw of FRAMEWORKS) {
      if (fw.id === fwId) {
        for (const g of fw.groups) {
          for (const d of g.disclosures) {
            if (d.code === code) return { ...d, groupName: g.name, groupTheme: g.theme }
          }
        }
      }
    }
    return null
  }

  /* ─── Avatar helper ─── */

  const Avatar = ({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
    const sizeClass = size === 'md' ? 'w-8 h-8 text-[var(--text-xs)]' : 'w-6 h-6 text-[10px]'
    return (
      <div className={`${sizeClass} rounded-full bg-[var(--accent-teal-light)] text-[var(--accent-teal)] flex items-center justify-center font-bold flex-shrink-0`}>
        {initials}
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     Assignment Modal
     ═══════════════════════════════════════════ */

  const handleAssignSave = () => {
    if (!showAssignModal || !assignUser) return
    updateDisclosure(showAssignModal, prev => ({
      ...prev,
      assignedTo: assignUser,
      dueDate: assignDate || prev.dueDate,
      lastUpdated: new Date().toISOString().split('T')[0],
    }))
    setShowAssignModal(null)
    setAssignUser('')
    setAssignDate('')
    setAssignPriority('Medium')
  }

  const AssignModal = () => {
    if (!showAssignModal) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Card className="w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[var(--text-lg)] font-bold text-[var(--text-primary)]">
              Assign Disclosure
            </h3>
            <button onClick={() => setShowAssignModal(null)} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
              <X className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[var(--text-xs)] font-semibold text-[var(--text-secondary)] mb-1.5">Assign to</label>
              <select
                value={assignUser}
                onChange={e => setAssignUser(e.target.value)}
                className="w-full h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] px-4 focus:outline-none focus:border-[var(--accent-teal)] cursor-pointer"
              >
                <option value="">Select user...</option>
                {DEMO_USERS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[var(--text-xs)] font-semibold text-[var(--text-secondary)] mb-1.5">Due date</label>
              <input
                type="date"
                value={assignDate}
                onChange={e => setAssignDate(e.target.value)}
                className="w-full h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] px-4 focus:outline-none focus:border-[var(--accent-teal)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-xs)] font-semibold text-[var(--text-secondary)] mb-1.5">Priority</label>
              <div className="flex gap-2">
                {(['Low', 'Medium', 'High'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setAssignPriority(p)}
                    className={`flex-1 h-9 rounded-lg text-[var(--text-xs)] font-medium border transition-colors cursor-pointer ${
                      assignPriority === p
                        ? 'bg-[var(--accent-teal-light)] border-[var(--accent-teal)] text-[var(--accent-teal)]'
                        : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => setShowAssignModal(null)}
              className="px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignSave}
              disabled={!assignUser}
              className="px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-white bg-[var(--accent-teal)] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              Assign
            </button>
          </div>
        </Card>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     LANDING VIEW
     ═══════════════════════════════════════════ */

  const renderLanding = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">
          Reporting Frameworks
        </h1>
        <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">
          Manage disclosure responses across GRI, TCFD, CSRD, and ISSB frameworks.
        </p>
      </div>

      {/* Active Period Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-[var(--text-lg)] font-bold text-[var(--text-primary)]">FY 2025-26</h2>
                <Badge variant="green" dot>Active</Badge>
              </div>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
                <CalendarDays className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                1 Apr 2025 — 31 Mar 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Overall Completion</p>
              <p className="text-[var(--text-xl)] font-bold text-[var(--accent-teal)] tabular-nums">{totalApproved.pct}%</p>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{totalApproved.approved}/{totalApproved.total} approved</p>
            </div>
            <div className="w-48">
              <div className="h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${totalApproved.pct}%`,
                    background: 'linear-gradient(90deg, var(--accent-teal), var(--accent-green))',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Framework Progress Grid */}
      <div className="grid grid-cols-5 gap-4">
        {FRAMEWORKS.map(fw => {
          const fwDisclosures = getDisclosuresForFramework(fw.id)
          const counts = countByStatus(fw.id)
          const total = fwDisclosures.length
          const approved = counts.approved
          const pct = total > 0 ? Math.round((approved / total) * 100) : 0
          const Icon = FRAMEWORK_ICONS[fw.id] ?? FileCheck

          return (
            <button
              key={fw.id}
              onClick={() => { setView(`framework:${fw.id}`); setStatusFilter('all') }}
              className="text-left cursor-pointer group"
            >
              <Card hover className="h-full relative overflow-hidden">
                {/* Accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, ${fw.badge.bg}, transparent)` }}
                />

                <div className="flex items-center justify-between mb-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full"
                    style={{ backgroundColor: fw.badge.bg, color: fw.badge.text }}
                  >
                    {fw.badge.label}
                  </span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${fw.badge.bg}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: fw.badge.bg }} />
                  </div>
                </div>

                <h3 className="font-display text-[var(--text-sm)] font-bold text-[var(--text-primary)] leading-snug mb-1">
                  {fw.shortName}
                </h3>

                {/* Progress bar */}
                <div className="mt-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--text-tertiary)]">{approved}/{total} approved</span>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: fw.badge.bg === '#D4A017' ? '#854F0B' : fw.badge.bg }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: fw.badge.bg === '#D4A017' ? '#854F0B' : fw.badge.bg }}
                    />
                  </div>
                </div>

                {/* Status dots */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                  {(Object.keys(STATUS_CONFIG) as DisclosureStatus[]).map(s => {
                    const c = counts[s]
                    if (c === 0) return null
                    return (
                      <div key={s} className="flex items-center gap-0.5" title={`${c} ${STATUS_CONFIG[s].label}`}>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_DOT_COLORS[s] }}
                        />
                        <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{c}</span>
                      </div>
                    )
                  })}
                </div>

                <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </Card>
            </button>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <h2 className="font-display text-[var(--text-base)] font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--accent-teal)]" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {RECENT_ACTIVITY.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <Avatar name={item.user} />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-sm)] text-[var(--text-primary)]">
                  <span className="font-semibold">{item.user}</span>
                  {' '}
                  <span className="text-[var(--text-secondary)]">{item.action}</span>
                  {' '}
                  <span className="font-mono text-[var(--text-xs)] font-bold" style={{ color: 'var(--accent-teal)' }}>{item.code}</span>
                  {' '}
                  <span className="text-[var(--text-tertiary)]">({item.framework})</span>
                </p>
              </div>
              <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] flex-shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  /* ═══════════════════════════════════════════
     FRAMEWORK DETAIL VIEW
     ═══════════════════════════════════════════ */

  const renderFrameworkDetail = () => {
    if (!activeFramework) return null

    const fwDisclosures = getDisclosuresForFramework(activeFramework.id)
    const counts = countByStatus(activeFramework.id)
    const total = fwDisclosures.length
    const approved = counts.approved
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0

    const statusFilters: Array<DisclosureStatus | 'all'> = ['all', 'not_started', 'in_progress', 'submitted', 'approved']
    const filterLabels: Record<string, string> = {
      all: 'All',
      not_started: 'Not Started',
      in_progress: 'In Progress',
      submitted: 'Submitted',
      approved: 'Approved',
    }

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[var(--text-sm)]">
          <button
            onClick={() => setView('landing')}
            className="inline-flex items-center gap-1 text-[var(--accent-teal)] font-medium hover:underline underline-offset-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Reporting Frameworks
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-primary)] font-semibold">{activeFramework.name}</span>
        </div>

        {/* Framework header card */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span
                className="inline-flex items-center px-3 py-1 text-[var(--text-sm)] font-bold rounded-full"
                style={{ backgroundColor: activeFramework.badge.bg, color: activeFramework.badge.text }}
              >
                {activeFramework.badge.label}
              </span>
              <div>
                <h2 className="font-display text-[var(--text-xl)] font-bold text-[var(--text-primary)]">
                  {activeFramework.name}
                </h2>
                <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-0.5">
                  {activeFramework.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right mr-2">
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{approved}/{total} approved</p>
                <div className="w-32 h-2 rounded-full bg-[var(--bg-tertiary)] mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: activeFramework.badge.bg === '#D4A017' ? '#854F0B' : activeFramework.badge.bg }}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  // Find first unassigned
                  const unassigned = fwDisclosures.find(d => !d.assignedTo)
                  if (unassigned) {
                    setShowAssignModal(buildKey(activeFramework.id, unassigned.code))
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[var(--text-xs)] font-medium text-[var(--accent-teal)] border border-[var(--accent-teal)] hover:bg-[var(--accent-teal-light)] transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Assign All
              </button>
            </div>
          </div>
        </Card>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 h-8 rounded-lg text-[var(--text-xs)] font-medium transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)] border border-[var(--accent-teal)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)]'
              }`}
            >
              {filterLabels[s]}
              {s !== 'all' && (
                <span className="ml-1.5 tabular-nums">
                  {counts[s as DisclosureStatus]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Disclosure groups */}
        {activeFramework.groups.map(group => {
          const theme = GROUP_THEME_COLORS[group.theme] ?? GROUP_THEME_COLORS.met

          // Filter disclosures
          const filteredDisclosures = group.disclosures.filter(disc => {
            if (statusFilter === 'all') return true
            const state = disclosures.get(buildKey(activeFramework.id, disc.code))
            return state?.status === statusFilter
          })

          if (filteredDisclosures.length === 0) return null

          return (
            <Card key={group.name} padding="none" className="overflow-hidden">
              {/* Group header */}
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ backgroundColor: theme.bg, borderBottom: `1.5px solid ${theme.border}` }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: theme.text }} />
                <h3 className="font-display text-[var(--text-sm)] font-bold" style={{ color: theme.text }}>
                  {group.name}
                </h3>
                <span className="ml-auto text-[var(--text-xs)] font-medium" style={{ color: theme.text, opacity: 0.7 }}>
                  {filteredDisclosures.length} disclosure{filteredDisclosures.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Disclosure rows */}
              <div className="divide-y divide-[var(--border-subtle)]">
                {filteredDisclosures.map((disc, idx) => {
                  const key = buildKey(activeFramework.id, disc.code)
                  const state = disclosures.get(key)
                  const status = state?.status ?? 'not_started'
                  const cfg = STATUS_CONFIG[status]

                  return (
                    <button
                      key={disc.code}
                      onClick={() => setView(`disclosure:${activeFramework.id}:${disc.code}`)}
                      className="w-full flex items-center px-5 py-3.5 gap-4 text-left hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                      style={{ backgroundColor: idx % 2 === 1 ? 'var(--bg-tertiary)' : 'transparent' }}
                    >
                      {/* Code + Title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-xs)] font-bold font-mono" style={{ color: theme.text }}>
                            {disc.code}
                          </span>
                          <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">
                            {disc.title}
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>

                      {/* Assigned user */}
                      <div className="w-[120px] flex-shrink-0 flex items-center gap-1.5 justify-end">
                        {state?.assignedTo ? (
                          <>
                            <Avatar name={state.assignedTo} />
                            <span className="text-[var(--text-xs)] text-[var(--text-secondary)] truncate">{state.assignedTo.split(' ')[0]}</span>
                          </>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setShowAssignModal(key) }}
                            className="text-[var(--text-xs)] text-[var(--text-tertiary)] hover:text-[var(--accent-teal)] transition-colors cursor-pointer"
                          >
                            Unassigned
                          </button>
                        )}
                      </div>

                      {/* Due date */}
                      <div className="w-[80px] flex-shrink-0 text-right">
                        {state?.dueDate && (
                          <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] tabular-nums">
                            {state.dueDate.slice(5)}
                          </span>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     DISCLOSURE WORKSPACE VIEW
     ═══════════════════════════════════════════ */

  const renderDisclosureWorkspace = () => {
    if (!viewFrameworkId || !viewDisclosureCode || !activeFramework) return null

    const key = buildKey(viewFrameworkId, viewDisclosureCode)
    const state = disclosures.get(key)
    if (!state) return null

    const discInfo = findDisclosure(viewFrameworkId, viewDisclosureCode)
    if (!discInfo) return null

    const templateKey = DISCLOSURE_FIELDS[viewDisclosureCode]
    const fields = FIELD_TEMPLATES[templateKey] ?? FIELD_TEMPLATES['narrative'] ?? []

    const autoFields = fields.filter(f => f.type === 'auto' && f.autoSource && DEMO_AUTO_VALUES[f.autoSource] !== undefined)
    const hasAutoFields = autoFields.length > 0

    // Group fields
    const fieldGroups: Record<string, DisclosureField[]> = {}
    for (const f of fields) {
      const g = f.group || 'General'
      if (!fieldGroups[g]) fieldGroups[g] = []
      fieldGroups[g].push(f)
    }

    const status = state.status
    const cfg = STATUS_CONFIG[status]

    // Value handlers
    const handleFieldChange = (fieldKey: string, value: string | number | boolean) => {
      updateDisclosure(key, prev => ({
        ...prev,
        values: { ...prev.values, [fieldKey]: value },
      }))
    }

    const handleSaveDraft = () => {
      updateDisclosure(key, prev => ({
        ...prev,
        status: prev.status === 'not_started' || prev.status === 'rejected' ? 'in_progress' : prev.status,
        lastUpdated: new Date().toISOString().split('T')[0],
      }))
    }

    const handleSubmit = () => {
      updateDisclosure(key, prev => ({
        ...prev,
        status: 'submitted',
        lastUpdated: new Date().toISOString().split('T')[0],
      }))
    }

    const handleApprove = () => {
      updateDisclosure(key, prev => ({
        ...prev,
        status: 'approved',
        lastUpdated: new Date().toISOString().split('T')[0],
        comments: [...prev.comments, {
          user: user?.name ?? 'Admin',
          text: 'Disclosure approved.',
          date: new Date().toISOString().split('T')[0],
        }],
      }))
    }

    const handleReject = () => {
      updateDisclosure(key, prev => ({
        ...prev,
        status: 'rejected',
        lastUpdated: new Date().toISOString().split('T')[0],
        comments: [...prev.comments, {
          user: user?.name ?? 'Admin',
          text: 'Changes requested. Please review and resubmit.',
          date: new Date().toISOString().split('T')[0],
        }],
      }))
    }

    const handleReopen = () => {
      updateDisclosure(key, prev => ({
        ...prev,
        status: 'in_progress',
        lastUpdated: new Date().toISOString().split('T')[0],
      }))
    }

    const handleAddComment = () => {
      if (!newComment.trim()) return
      updateDisclosure(key, prev => ({
        ...prev,
        comments: [...prev.comments, {
          user: user?.name ?? 'User',
          text: newComment.trim(),
          date: new Date().toISOString().split('T')[0],
        }],
      }))
      setNewComment('')
    }

    const inputClass = "w-full h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] px-4 focus:outline-none focus:border-[var(--accent-teal)]"
    const textareaClass = "w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] px-4 py-3 focus:outline-none focus:border-[var(--accent-teal)] resize-none"

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[var(--text-sm)]">
          <button
            onClick={() => setView('landing')}
            className="inline-flex items-center gap-1 text-[var(--accent-teal)] font-medium hover:underline underline-offset-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Reporting Frameworks
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <button
            onClick={() => { setView(`framework:${viewFrameworkId}`); setStatusFilter('all') }}
            className="text-[var(--accent-teal)] font-medium hover:underline underline-offset-2 cursor-pointer"
          >
            {activeFramework.shortName}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-primary)] font-semibold">{viewDisclosureCode}</span>
        </div>

        {/* Header section */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-[var(--text-lg)] font-bold text-[var(--text-primary)]">
                  {viewDisclosureCode}
                </span>
                <Badge variant={cfg.variant} className="text-[var(--text-sm)]">{cfg.label}</Badge>
              </div>
              <h2 className="font-display text-[var(--text-xl)] font-bold text-[var(--text-primary)]">
                {discInfo.title}
              </h2>
              <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1">
                {discInfo.description}
              </p>

              <div className="flex items-center gap-6 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                {/* Assigned to */}
                <div className="flex items-center gap-2">
                  {state.assignedTo ? (
                    <>
                      <Avatar name={state.assignedTo} size="md" />
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Assigned to</p>
                        <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{state.assignedTo}</p>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowAssignModal(key)}
                      className="inline-flex items-center gap-1.5 text-[var(--text-sm)] text-[var(--accent-teal)] font-medium hover:underline cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" /> Assign
                    </button>
                  )}
                </div>

                {/* Due date */}
                {state.dueDate && (
                  <div>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Due</p>
                    <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] tabular-nums">{state.dueDate}</p>
                  </div>
                )}

                {/* Module tags */}
                <div className="flex items-center gap-1 ml-auto">
                  {discInfo.modules.map(mod => {
                    const tagColor = MODULE_TAG_COLORS[mod.color] ?? MODULE_TAG_COLORS.gray
                    return (
                      <span
                        key={mod.label}
                        className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full"
                        style={{ backgroundColor: tagColor.bg, color: tagColor.text, border: `1px solid ${tagColor.border}` }}
                      >
                        {mod.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
            {(status === 'not_started' || status === 'in_progress') && (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Draft
                </button>
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-white bg-[var(--accent-teal)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Submit for Review
                </button>
              </>
            )}
            {status === 'submitted' && isAdminOrLead && (
              <>
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-white bg-[var(--accent-green)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-[var(--accent-red)] border border-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-colors cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4" />
                  Request Changes
                </button>
              </>
            )}
            {status === 'under_review' && (
              <>
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-white bg-[var(--accent-green)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-[var(--accent-red)] border border-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-colors cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}
            {status === 'approved' && (
              <button
                onClick={handleReopen}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reopen
              </button>
            )}
            {status === 'rejected' && (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Draft
                </button>
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-white bg-[var(--accent-teal)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Resubmit
                </button>
              </>
            )}
          </div>
        </Card>

        {/* Calculator auto panel (top banner when auto fields present) */}
        {hasAutoFields && (
          <Card className="border-l-4 border-l-[var(--accent-teal)]">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-[var(--accent-teal)]" />
              <h3 className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">Auto-populated from calculators</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {autoFields.map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <Badge variant="teal">Auto</Badge>
                  <span className="text-[var(--text-xs)] text-[var(--text-secondary)]">{f.label}:</span>
                  <span className="text-[var(--text-sm)] font-bold text-[var(--text-primary)] tabular-nums">
                    {DEMO_AUTO_VALUES[f.autoSource!]?.toLocaleString()}{f.unit ? ` ${f.unit}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Data Entry Form */}
        <Card>
          <h3 className="font-display text-[var(--text-base)] font-bold text-[var(--text-primary)] mb-5">
            Disclosure Data
          </h3>

          <div className="space-y-6">
            {Object.entries(fieldGroups).map(([groupName, groupFields]) => (
              <div key={groupName}>
                <h4 className="text-[var(--text-xs)] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 pb-2 border-b border-[var(--border-subtle)]">
                  {groupName}
                </h4>
                <div className="space-y-4">
                  {groupFields.map(field => {
                    const isAuto = field.type === 'auto'
                    const autoVal = isAuto && field.autoSource ? DEMO_AUTO_VALUES[field.autoSource] : undefined
                    const currentValue = isAuto && autoVal !== undefined
                      ? autoVal
                      : state.values[field.key] ?? ''

                    return (
                      <div key={field.key}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <label className="text-[var(--text-xs)] font-semibold text-[var(--text-secondary)]">
                            {field.label}
                            {field.required && <span className="text-[var(--accent-red)] ml-0.5">*</span>}
                          </label>
                          {isAuto && (
                            <Badge variant="teal" className="text-[9px] py-0">
                              <Calculator className="w-2.5 h-2.5" />
                              Auto
                            </Badge>
                          )}
                          {field.unit && (
                            <span className="text-[10px] text-[var(--text-tertiary)]">{field.unit}</span>
                          )}
                        </div>

                        {field.type === 'auto' && (
                          <input
                            type="text"
                            readOnly
                            value={autoVal !== undefined ? autoVal.toLocaleString() : 'N/A'}
                            className={`${inputClass} bg-[var(--accent-green-light)] cursor-default`}
                            style={{ borderColor: 'var(--accent-teal)', opacity: 0.9 }}
                          />
                        )}

                        {field.type === 'number' && (
                          <input
                            type="number"
                            value={currentValue as string | number}
                            onChange={e => handleFieldChange(field.key, e.target.value === '' ? '' : parseFloat(e.target.value))}
                            placeholder={field.placeholder}
                            className={inputClass}
                          />
                        )}

                        {field.type === 'text' && (
                          <input
                            type="text"
                            value={currentValue as string}
                            onChange={e => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className={inputClass}
                          />
                        )}

                        {field.type === 'textarea' && (
                          <textarea
                            rows={3}
                            value={currentValue as string}
                            onChange={e => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className={textareaClass}
                          />
                        )}

                        {field.type === 'select' && (
                          <select
                            value={currentValue as string}
                            onChange={e => handleFieldChange(field.key, e.target.value)}
                            className={`${inputClass} cursor-pointer`}
                          >
                            <option value="">Select...</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                        {field.type === 'boolean' && (
                          <label className="inline-flex items-center gap-3 cursor-pointer">
                            <button
                              type="button"
                              onClick={() => handleFieldChange(field.key, !currentValue)}
                              className={`relative inline-flex items-center w-10 h-5 rounded-full transition-colors cursor-pointer ${
                                currentValue
                                  ? 'bg-[var(--accent-teal)]'
                                  : 'bg-[var(--bg-tertiary)] border border-[var(--border-default)]'
                              }`}
                            >
                              <span
                                className={`inline-block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                  currentValue ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <span className="text-[var(--text-sm)] text-[var(--text-secondary)]">
                              {currentValue ? 'Yes' : 'No'}
                            </span>
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Comments Section */}
        <Card>
          <h3 className="font-display text-[var(--text-base)] font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--accent-teal)]" />
            Comments
            {state.comments.length > 0 && (
              <span className="text-[var(--text-xs)] font-medium text-[var(--text-tertiary)]">
                ({state.comments.length})
              </span>
            )}
          </h3>

          {state.comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {state.comments.map((c, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-[var(--bg-secondary)]">
                  <Avatar name={c.user} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{c.user}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{c.date}</span>
                    </div>
                    <p className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment */}
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                rows={2}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className={textareaClass}
              />
            </div>
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="self-end px-4 h-9 rounded-lg text-[var(--text-sm)] font-medium text-white bg-[var(--accent-teal)] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              Send
            </button>
          </div>
        </Card>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     Render
     ═══════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {viewType === 'landing' && renderLanding()}
      {viewType === 'framework' && renderFrameworkDetail()}
      {viewType === 'disclosure' && renderDisclosureWorkspace()}
      <AssignModal />
    </div>
  )
}
