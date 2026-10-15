import { Clock, PencilLine, Send, CheckCircle2, AlertTriangle, LayoutGrid } from 'lucide-react'
import type { FilterState } from './shared'

interface Stats {
  total: number
  overdue: number
  notStarted: number
  inProgress: number
  submitted: number
  approved: number
}

interface StatsStripProps {
  stats: Stats
  approvedThisWeek: number
  filter: FilterState
  onChange: (f: FilterState) => void
}

/**
 * Compact one-row stats strip — replaces the gradient hero. Each tile is a
 * filter chip. Active tile gets a thicker border + brand-tinted background.
 */
export default function StatsStrip({ stats, approvedThisWeek, filter, onChange }: StatsStripProps) {
  const tiles: { key: FilterState; label: string; value: number; icon: typeof Clock; tone?: 'danger' }[] = [
    { key: 'all',         label: 'Total',         value: stats.total,       icon: LayoutGrid },
    { key: 'overdue',     label: 'Overdue',       value: stats.overdue,     icon: AlertTriangle, tone: 'danger' },
    { key: 'pending',     label: 'Open',          value: stats.notStarted,  icon: Clock },
    { key: 'in_progress', label: 'In progress',   value: stats.inProgress,  icon: PencilLine },
    { key: 'submitted',   label: 'Submitted',     value: stats.submitted,   icon: Send },
    { key: 'approved',    label: `Approved · 7d`, value: approvedThisWeek,  icon: CheckCircle2 },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" role="toolbar" aria-label="Filter by status">
      {tiles.map(t => {
        const active = filter === t.key
        const danger = t.tone === 'danger' && t.value > 0
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.key)}
            className={`group text-left rounded-[var(--radius-md)] p-3 min-h-[68px] transition-all border ${
              active
                ? danger
                  ? 'border-[var(--status-reject)]/60 bg-[var(--accent-red-light)]/40 shadow-sm'
                  : 'border-[var(--color-brand)]/60 bg-[var(--color-brand-soft)]/50 shadow-sm'
                : danger
                  ? 'border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]/20 hover:border-[var(--status-reject)]/40'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card-premium)] hover:border-[var(--color-brand)]/30 hover:-translate-y-px'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              <t.icon className={`w-3 h-3 ${danger ? 'text-[var(--status-reject)]' : ''}`} />
              <span className={danger ? 'text-[var(--status-reject)]' : ''}>{t.label}</span>
            </div>
            <div className={`text-[22px] font-bold tabular-nums mt-1 ${
              danger ? 'text-[var(--status-reject)]' : 'text-[var(--text-primary)]'
            }`}>
              {t.value}
            </div>
          </button>
        )
      })}
    </div>
  )
}
