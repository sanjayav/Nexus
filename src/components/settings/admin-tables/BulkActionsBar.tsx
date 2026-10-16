import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { dur, ease } from '../../../motion/tokens'

/**
 * BulkActionsBar — the slide-up bar for multi-select admin tables.
 * Renders into <body> so no page container can clip it. Shows a count, the
 * page's actions, and a clear button. Labels are passed in so the bar has no
 * locale area of its own.
 *
 *   <BulkActionsBar
 *     count={selected.size}
 *     countLabel={t('…selected', { count })}
 *     clearLabel={t('…clearSelection')}
 *     onClear={() => setSelected(new Set())}
 *   >
 *     <button className="…">Change role</button>
 *   </BulkActionsBar>
 */
export interface BulkActionsBarProps {
  count: number
  countLabel: string
  clearLabel: string
  onClear: () => void
  /** Accessible name for the toolbar. */
  label?: string
  children: ReactNode
}

export default function BulkActionsBar({ count, countLabel, clearLabel, onClear, label, children }: BulkActionsBarProps) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="bulk-bar"
          role="toolbar"
          aria-label={label ?? countLabel}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: dur.base, ease: ease.out }}
          className="fixed bottom-4 inset-x-0 mx-auto z-[60] w-[calc(100%-2rem)] max-w-fit
            flex flex-wrap items-center gap-2 sm:gap-3 pl-4 pr-2 py-2
            rounded-[var(--radius-xl)] border border-[var(--border-default)]
            bg-[var(--bg-elevated)] shadow-[var(--shadow-overlay)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pb-2"
        >
          <span className="text-small font-semibold text-[var(--text-primary)] tabular-nums whitespace-nowrap" aria-live="polite">
            {countLabel}
          </span>
          <span className="hidden sm:block w-px h-5 bg-[var(--border-default)]" aria-hidden />
          <div className="flex flex-wrap items-center gap-1.5">{children}</div>
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            title={clearLabel}
            className="ml-auto w-10 h-10 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Compact action button for the bar. */
export function BulkAction({
  onClick,
  icon,
  children,
  tone = 'default',
  disabled,
}: {
  onClick: () => void
  icon?: ReactNode
  children: ReactNode
  tone?: 'default' | 'destructive'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 h-10 sm:h-8 px-3 rounded-[var(--radius-md)] text-small font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        tone === 'destructive'
          ? 'text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
