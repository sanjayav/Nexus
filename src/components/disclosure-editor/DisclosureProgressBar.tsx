import { motion } from 'framer-motion'
import { BookOpen, PencilLine, Send } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../lib/rbac'
import { barFill, EASE_OUT_EXPO } from '../motion'

export type DisclosureWorkflowStatus = 'draft' | 'in_review' | 'published'

/**
 * Top status bar for the disclosure editor.
 *
 * Renders framework name + reporting year + workflow status pill, a "M of N
 * cells complete" counter with an animated progress fill, a Reading-mode toggle,
 * and a Publish CTA gated behind `reports.publish`.
 */
export interface DisclosureProgressBarProps {
  frameworkName: string
  frameworkCode: string
  reportingYear: number
  workflowStatus: DisclosureWorkflowStatus
  completedCells: number
  totalCells: number
  readingMode: boolean
  onToggleReadingMode: () => void
  onPublish: () => void
  publishing?: boolean
}

const STATUS_LABEL: Record<DisclosureWorkflowStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
}

const STATUS_PILL: Record<DisclosureWorkflowStatus, string> = {
  draft: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  in_review: 'bg-[var(--accent-blue-light)] text-[var(--status-pending)]',
  published: 'bg-[var(--accent-green-light)] text-[var(--status-ok)]',
}

export default function DisclosureProgressBar({
  frameworkName,
  frameworkCode,
  reportingYear,
  workflowStatus,
  completedCells,
  totalCells,
  readingMode,
  onToggleReadingMode,
  onPublish,
  publishing = false,
}: DisclosureProgressBarProps) {
  const { permissions } = useAuth()
  const canPublish = hasPermission(permissions, 'reports.publish')
  const pct = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0
  const remaining = Math.max(0, totalCells - completedCells)
  const publishDisabled = !canPublish || remaining > 0 || publishing
  const tooltip = !canPublish
    ? 'You don’t have permission to publish reports'
    : remaining > 0
      ? `${remaining} cell${remaining === 1 ? '' : 's'} still need values`
      : publishing
        ? 'Publishing…'
        : 'Publish report'

  return (
    <div className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 backdrop-blur">
      <div className="px-6 pt-3 pb-2 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 h-5 rounded-[var(--radius-xs)] bg-[var(--color-brand-soft)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-strong)]">
              {frameworkCode}
            </span>
            <h1 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] truncate">
              {frameworkName}
            </h1>
            <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] font-mono">FY{reportingYear}</span>
            <span className={`inline-flex items-center px-2 h-5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_PILL[workflowStatus]}`}>
              {STATUS_LABEL[workflowStatus]}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 text-[var(--text-xs)] text-[var(--text-secondary)] tabular-nums">
          <span className="font-semibold text-[var(--text-primary)]">{completedCells}</span>
          <span>of</span>
          <span className="font-semibold text-[var(--text-primary)]">{totalCells}</span>
          <span>cells complete</span>
          <span className="px-1.5 text-[var(--text-tertiary)]">·</span>
          <span className="font-semibold text-[var(--color-brand-strong)]">{pct}%</span>
        </div>

        <button
          type="button"
          onClick={onToggleReadingMode}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] border text-[var(--text-xs)] font-semibold transition-colors ${
            readingMode
              ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
              : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
          }`}
          aria-pressed={readingMode}
          title={readingMode ? 'Switch to edit mode' : 'Switch to reading mode'}
        >
          {readingMode ? <PencilLine className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
          {readingMode ? 'Edit' : 'Reading'}
        </button>

        <button
          type="button"
          onClick={onPublish}
          disabled={publishDisabled}
          title={tooltip}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          Publish report
        </button>
      </div>

      <div className="px-6 pb-2">
        <div className="h-1 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[var(--color-brand)]"
            {...barFill(pct)}
            transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
          />
        </div>
      </div>
    </div>
  )
}
