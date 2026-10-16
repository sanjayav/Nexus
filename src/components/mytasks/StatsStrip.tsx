import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { NumberTicker } from '../ui'
import { spring } from '../../motion/tokens'
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

type Tone = 'neutral' | 'danger' | 'warning' | 'info' | 'success' | 'brand'
const DOT: Record<Tone, string> = {
  neutral: 'var(--text-quaternary)',
  danger: 'var(--status-danger)',
  warning: 'var(--status-warning)',
  info: 'var(--status-info)',
  success: 'var(--status-success)',
  brand: 'var(--color-brand)',
}

/**
 * Ledger-style filter strip (replaces the six pastel tiles). One paper
 * surface with hairline dividers; each cell is a toggle that filters the
 * list. The active cell carries a sliding brand underline.
 */
export default function StatsStrip({ stats, approvedThisWeek, filter, onChange }: StatsStripProps) {
  const { t } = useTranslation()
  const cells: { key: FilterState; label: string; value: number; tone: Tone }[] = [
    { key: 'all', label: t('tasks.stats.total'), value: stats.total, tone: 'brand' },
    { key: 'overdue', label: t('tasks.stats.overdue'), value: stats.overdue, tone: stats.overdue > 0 ? 'danger' : 'neutral' },
    { key: 'pending', label: t('tasks.stats.open'), value: stats.notStarted, tone: 'neutral' },
    { key: 'in_progress', label: t('tasks.stats.inProgress'), value: stats.inProgress, tone: 'warning' },
    { key: 'submitted', label: t('tasks.stats.submitted'), value: stats.submitted, tone: 'info' },
    { key: 'approved', label: t('tasks.stats.approved7d'), value: approvedThisWeek, tone: 'success' },
  ]

  return (
    <div role="toolbar" aria-label={t('tasks.stats.filterAria')} className="surface-paper overflow-hidden">
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--border-subtle)]">
        {cells.map(c => {
          const active = filter === c.key
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(c.key)}
              className={`relative text-left px-3.5 py-3 sm:px-4 sm:py-3.5 min-h-[64px] min-w-0 transition-colors duration-micro focus-visible:z-10 ${
                active ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span className="flex items-center gap-1.5 text-caption text-[var(--text-tertiary)] font-medium min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DOT[c.tone] }} aria-hidden />
                <span className={`truncate ${active ? 'text-[var(--text-primary)]' : ''}`}>{c.label}</span>
              </span>
              <NumberTicker
                value={c.value}
                className={`type-figure mt-1 text-[22px] sm:text-[24px] ${
                  c.tone === 'danger' ? 'text-[var(--status-danger)]' : 'text-[var(--text-primary)]'
                }`}
              />
              {active && (
                <motion.span
                  layoutId="tasks-filter-underline"
                  transition={spring.snappy}
                  aria-hidden
                  className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--color-brand)]"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
