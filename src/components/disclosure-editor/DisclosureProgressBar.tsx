import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { BookOpen, PencilLine, Send } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../lib/rbac'
import { barFill, EASE_OUT_EXPO } from '../motion'
import { useIsInsideRoom, useOthers } from '../../lib/liveblocks'
import { LiveblocksStatus } from '../LiveblocksStatus'

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

/** i18n keys for each workflow status. */
const STATUS_LABEL: Record<DisclosureWorkflowStatus, string> = {
  draft: 'disclosureEditor.progress.status.draft',
  in_review: 'disclosureEditor.progress.status.inReview',
  published: 'disclosureEditor.progress.status.published',
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
  const { t } = useTranslation()
  const canPublish = hasPermission(permissions, 'reports.publish')
  const pct = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0
  const remaining = Math.max(0, totalCells - completedCells)
  const publishDisabled = !canPublish || remaining > 0 || publishing
  const tooltip = !canPublish
    ? t('disclosureEditor.progress.noPermission')
    : remaining > 0
      ? t('disclosureEditor.progress.remaining', { count: remaining })
      : publishing
        ? t('disclosureEditor.progress.publishing')
        : t('disclosureEditor.progress.publishReport')

  return (
    <div className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 backdrop-blur">
      <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center gap-2 sm:gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 h-5 rounded-[var(--radius-xs)] bg-[var(--color-brand-soft)] text-micro font-bold uppercase tracking-[0.06em] text-[var(--color-brand-strong)]">
              {frameworkCode}
            </span>
            <h1 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)] truncate">
              {frameworkName}
            </h1>
            <span className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] font-mono">FY{reportingYear}</span>
            <span className={`inline-flex items-center px-2 h-5 rounded-full text-micro font-semibold uppercase tracking-[0.06em] ${STATUS_PILL[workflowStatus]}`}>
              {t(STATUS_LABEL[workflowStatus])}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 text-[length:var(--text-xs)] text-[var(--text-secondary)] tabular-nums">
          <span className="font-semibold text-[var(--text-primary)]">{completedCells}</span>
          <span>{t('disclosureEditor.progress.of')}</span>
          <span className="font-semibold text-[var(--text-primary)]">{totalCells}</span>
          <span>{t('disclosureEditor.progress.cellsComplete')}</span>
          <span className="px-1.5 text-[var(--text-tertiary)]">·</span>
          <span className="font-semibold text-[var(--color-brand-strong)]">{pct}%</span>
        </div>

        <button
          type="button"
          onClick={onToggleReadingMode}
          className={`inline-flex items-center gap-1.5 h-9 sm:h-8 min-h-[36px] px-3 rounded-[var(--radius-sm)] border text-[length:var(--text-xs)] font-semibold transition-colors ${
            readingMode
              ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
              : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
          }`}
          aria-pressed={readingMode}
          title={readingMode ? t('disclosureEditor.progress.toEdit') : t('disclosureEditor.progress.toReading')}
        >
          {readingMode ? <PencilLine className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
          {readingMode ? t('disclosureEditor.progress.edit') : t('disclosureEditor.progress.reading')}
        </button>

        <LiveblocksStatus />
        <PresenceAvatars />

        <button
          type="button"
          onClick={onPublish}
          disabled={publishDisabled}
          title={tooltip}
          className="inline-flex items-center gap-1.5 h-9 sm:h-8 min-h-[36px] px-3 rounded-[var(--radius-sm)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-xs)] font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('disclosureEditor.progress.publishReport')}</span>
          <span className="sm:hidden">{t('disclosureEditor.progress.publish')}</span>
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-2">
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

/**
 * Stacked-avatar row for everyone else currently in the room. Renders nothing
 * when (a) we're not inside a `<RoomProvider>` (collab disabled) or (b)
 * nobody else is connected. Caps at 5 avatars + a "+N" pill to stop the bar
 * from collapsing under load — Liveblocks' free tier maxes out at 25/room.
 *
 * Self-guarded by `useIsInsideRoom` so the component can be safely dropped
 * into the progress bar even when its parent skips the RoomProvider (e.g.
 * on the public report viewer or under test).
 */
function PresenceAvatars() {
  const inside = useIsInsideRoom()
  if (!inside) return null
  return <PresenceAvatarsInner />
}

function PresenceAvatarsInner() {
  const others = useOthers()
  const { t } = useTranslation()
  if (others.length === 0) return null
  const visible = others.slice(0, 5)
  const overflow = others.length - visible.length
  return (
    <div className="flex -space-x-2 items-center" aria-label={t('disclosureEditor.progress.othersAria', { count: others.length })}>
      {visible.map(({ connectionId, info }) => {
        const name = info?.name ?? t('disclosureEditor.progress.user')
        const color = info?.color ?? '#10B981'
        return (
          <div
            key={connectionId}
            className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-semibold text-white border-2 border-[var(--bg-primary)] shadow-sm"
            style={{ background: color }}
            title={info?.email ? `${name} (${info.email})` : name}
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
        )
      })}
      {overflow > 0 && (
        <div
          className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] text-caption font-semibold text-[var(--text-secondary)] flex items-center justify-center border-2 border-[var(--bg-primary)] shadow-sm tabular-nums"
          title={t('disclosureEditor.progress.moreInRoom', { count: overflow })}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
