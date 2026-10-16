import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { BookOpen, PencilLine, Send, Lock } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../lib/rbac'
import { spring } from '../../motion/tokens'
import { useIsInsideRoom, useOthers } from '../../lib/liveblocks'
import { LiveblocksStatus } from '../LiveblocksStatus'
import { StatusPill } from '../ui'
import SaveStatus, { type SaveState } from '../entry/SaveStatus'

export type DisclosureWorkflowStatus = 'draft' | 'in_review' | 'published'

/**
 * Sticky top bar of the disclosure editor: framework, reporting year and
 * status; the autosave state; reading mode; publish (gated, with the reason
 * shown when it can't be used); and the progress rail — approved, in review
 * and drafted segments that grow on a spring as cells move forward.
 */
export interface DisclosureProgressBarProps {
  frameworkName: string
  frameworkCode: string
  reportingYear: number
  workflowStatus: DisclosureWorkflowStatus
  completedCells: number
  totalCells: number
  /** Optional breakdown for the segmented rail. Falls back to completed/total. */
  breakdown?: { approved: number; inReview: number; drafted: number }
  readingMode: boolean
  onToggleReadingMode: () => void
  onPublish: () => void
  publishing?: boolean
  /** Editor-wide autosave state. */
  saveState?: SaveState
  savedAt?: number | null
  /** Publishing needs an open reporting year. */
  canPublishYear?: boolean
}

const STATUS_PILL: Record<DisclosureWorkflowStatus, { status: string; label: string }> = {
  draft: { status: 'draft', label: 'disclosureEditor.progress.status.draft' },
  in_review: { status: 'submitted', label: 'disclosureEditor.progress.status.inReview' },
  published: { status: 'approved', label: 'disclosureEditor.progress.status.published' },
}

export default function DisclosureProgressBar({
  frameworkName, frameworkCode, reportingYear, workflowStatus, completedCells, totalCells, breakdown,
  readingMode, onToggleReadingMode, onPublish, publishing = false, saveState = 'idle', savedAt = null, canPublishYear = true,
}: DisclosureProgressBarProps) {
  const { permissions } = useAuth()
  const { t } = useTranslation()
  const canPublish = hasPermission(permissions, 'reports.publish')
  const pct = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0
  const remaining = Math.max(0, totalCells - completedCells)
  const blockedReason = !canPublish
    ? t('disclosureEditor.progress.noPermission')
    : !canPublishYear
      ? t('disclosureEditor.progress.noYear')
      : remaining > 0
        ? t('disclosureEditor.progress.remaining', { count: remaining })
        : null
  const publishDisabled = !!blockedReason || publishing
  const seg = breakdown ?? { approved: completedCells, inReview: 0, drafted: 0 }
  const w = (n: number) => (totalCells > 0 ? `${(n / totalCells) * 100}%` : '0%')
  const pill = STATUS_PILL[workflowStatus]

  return (
    <div className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-primary)]/85">
      <div className="px-4 sm:px-6 pt-3 pb-2.5 flex items-center gap-x-4 gap-y-2 flex-wrap">
        <div className="min-w-0 flex-1 basis-[260px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center px-2 h-6 rounded-[var(--radius-xs)] bg-[var(--color-brand-soft)] text-caption font-semibold text-[var(--color-brand-strong)] whitespace-nowrap flex-shrink-0">
              {frameworkCode}
            </span>
            <h1 className="type-h3 text-[var(--text-primary)] truncate min-w-0" title={frameworkName}>{frameworkName}</h1>
            <span className="text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap flex-shrink-0">FY{reportingYear}</span>
            <StatusPill status={pill.status} size="sm" className="flex-shrink-0">{t(pill.label)}</StatusPill>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <SaveStatus state={saveState} savedAt={savedAt} className="hidden sm:inline-flex mr-1" />
          <button
            type="button"
            onClick={onToggleReadingMode}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] border text-small font-semibold transition-colors whitespace-nowrap ${
              readingMode
                ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
                : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            }`}
            aria-pressed={readingMode}
            title={readingMode ? t('disclosureEditor.progress.toEdit') : t('disclosureEditor.progress.toReading')}
          >
            {readingMode ? <PencilLine className="w-3.5 h-3.5" aria-hidden /> : <BookOpen className="w-3.5 h-3.5" aria-hidden />}
            {readingMode ? t('disclosureEditor.progress.edit') : t('disclosureEditor.progress.reading')}
          </button>
          <LiveblocksStatus />
          <PresenceAvatars />
          <div className="flex items-center gap-2">
            {blockedReason && (
              <span id="publish-blocked" className="hidden lg:inline-flex items-center gap-1 text-caption text-[var(--text-tertiary)] whitespace-nowrap">
                <Lock className="w-3 h-3" aria-hidden /> {blockedReason}
              </span>
            )}
            <button
              type="button"
              onClick={onPublish}
              disabled={publishDisabled}
              aria-describedby={blockedReason ? 'publish-blocked' : undefined}
              title={blockedReason ?? t('disclosureEditor.progress.publishReport')}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden sm:inline">{publishing ? t('disclosureEditor.progress.publishing') : t('disclosureEditor.progress.publishReport')}</span>
              <span className="sm:hidden">{t('disclosureEditor.progress.publish')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress rail */}
      <div className="px-4 sm:px-6 pb-2.5 flex items-center gap-3">
        <div
          className="relative h-1.5 flex-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalCells}
          aria-valuenow={completedCells}
          aria-label={t('disclosureEditor.progress.railAria', { done: completedCells, total: totalCells })}
        >
          <motion.span className="h-full bg-[var(--color-brand)]" initial={{ width: 0 }} animate={{ width: w(seg.approved) }} transition={spring.gentle} />
          <motion.span className="h-full bg-[var(--chart-s2)] opacity-70" initial={{ width: 0 }} animate={{ width: w(seg.inReview) }} transition={{ ...spring.gentle, delay: 0.06 }} />
          <motion.span className="h-full bg-[var(--chart-s3)] opacity-60" initial={{ width: 0 }} animate={{ width: w(seg.drafted) }} transition={{ ...spring.gentle, delay: 0.12 }} />
        </div>
        <div className="flex items-center gap-3 text-caption text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
          <span><strong className="font-semibold text-[var(--text-primary)]">{completedCells}</strong> / {totalCells} <span className="hidden sm:inline">{t('disclosureEditor.progress.cellsComplete')}</span></span>
          <span className="font-semibold text-[var(--color-brand-strong)]">{pct}%</span>
        </div>
      </div>
      {breakdown && (
        <div className="hidden md:flex px-4 sm:px-6 pb-2 -mt-1 items-center gap-4 text-caption text-[var(--text-tertiary)]">
          <Legend swatch="bg-[var(--color-brand)]" label={t('disclosureEditor.progress.legendApproved', { count: breakdown.approved })} />
          <Legend swatch="bg-[var(--chart-s2)] opacity-70" label={t('disclosureEditor.progress.legendReview', { count: breakdown.inReview })} />
          <Legend swatch="bg-[var(--chart-s3)] opacity-60" label={t('disclosureEditor.progress.legendDraft', { count: breakdown.drafted })} />
          {!readingMode && (
            <span className="ml-auto hidden lg:inline-flex items-center gap-3" aria-hidden>
              <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> {t('disclosureEditor.document.kbMove')}</span>
              <span><kbd className="kbd">Enter</kbd> {t('disclosureEditor.document.kbEdit')}</span>
              <span><kbd className="kbd">Esc</kbd> {t('disclosureEditor.document.kbCancel')}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`w-2 h-2 rounded-full ${swatch}`} aria-hidden />
      {label}
    </span>
  )
}

/**
 * Stacked-avatar row for everyone else currently in the room. Renders nothing
 * outside a `<RoomProvider>` or when nobody else is connected.
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
        return (
          <div
            key={connectionId}
            className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-semibold text-white border-2 border-[var(--bg-primary)]"
            style={{ background: info?.color ?? 'var(--color-brand)' }}
            title={info?.email ? `${name} (${info.email})` : name}
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
        )
      })}
      {overflow > 0 && (
        <div
          className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] text-caption font-semibold text-[var(--text-secondary)] flex items-center justify-center border-2 border-[var(--bg-primary)] tabular-nums"
          title={t('disclosureEditor.progress.moreInRoom', { count: overflow })}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
