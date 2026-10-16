import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import type { QuestionAssignment } from '../../lib/orgStore'
import type { NextAction, StageStatus } from '../../lib/journey'
import { Illustration, StateBoundary, Skeleton, SkeletonText } from '../ui'
import FocusCard from './FocusCard'
import PipelineStrip from './PipelineStrip'

export interface NextActionHeaderProps {
  loading: boolean
  error?: unknown
  onRetry?: () => void
  /** From `lib/journey.nextAction` — the one source of "what next". */
  action: NextAction | null
  stages: StageStatus[]
  entityName?: (a: QuestionAssignment) => string | undefined
  onOpenTask: (a: QuestionAssignment) => void
  onSkip: () => void
  onSeeApproved: () => void
  onShowSubmitted: () => void
  className?: string
}

/**
 * NextActionHeader — replaces the three stacked modules on My Tasks
 * ("Do this next" banner, the tall pipeline, the "Up next" card) with ONE
 * header: the next action on top, the six-stage pipeline as a slim strip
 * below. Truthful by construction: loading → skeleton, error → error with
 * retry, nothing assigned → "not assigned yet", and "all caught up" only when
 * the user has assignments and every one is approved.
 */
export default function NextActionHeader({
  loading, error, onRetry, action, stages, entityName, onOpenTask, onSkip, onSeeApproved, onShowSubmitted, className = '',
}: NextActionHeaderProps) {
  const { t } = useTranslation()

  return (
    <section aria-label={t('tasks.next.aria')} className={`surface-paper overflow-hidden flex flex-col ${className}`}>
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-center">
        <StateBoundary
          loading={loading}
          error={error}
          onRetry={onRetry}
          compact
          errorState={{ title: t('tasks.next.errorTitle'), body: t('tasks.next.errorBody'), art: false }}
          skeleton={
            <div className="space-y-3" data-testid="next-action-loading">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-2/3" />
              <SkeletonText lines={1} className="max-w-sm" />
              <Skeleton className="h-10 w-36" rounded="md" />
            </div>
          }
        >
          {() => action && (
            <ActionBody
              action={action}
              entityName={entityName}
              onOpenTask={onOpenTask}
              onSkip={onSkip}
              onSeeApproved={onSeeApproved}
              onShowSubmitted={onShowSubmitted}
            />
          )}
        </StateBoundary>
      </div>
      {stages.length > 0 && (
        <div className="border-t border-[var(--border-subtle)] px-5 sm:px-6 pt-4 pb-4 bg-[var(--bg-secondary)]/40">
          <PipelineStrip stages={stages} />
        </div>
      )}
    </section>
  )
}

function ActionBody({
  action, entityName, onOpenTask, onSkip, onSeeApproved, onShowSubmitted,
}: {
  action: NextAction
  entityName?: (a: QuestionAssignment) => string | undefined
  onOpenTask: (a: QuestionAssignment) => void
  onSkip: () => void
  onSeeApproved: () => void
  onShowSubmitted: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const a = action.assignment

  if ((action.kind === 'answer' || action.kind === 'fix') && a) {
    const reason = action.overdueCount > 0
      ? t('tasks.next.reason.openOverdue', { count: action.openCount, overdue: action.overdueCount })
      : t('tasks.next.reason.open', { count: action.openCount })
    return (
      <FocusCard
        focus={a}
        kind={action.kind}
        totalApproved={action.approvedCount}
        entityName={entityName?.(a)}
        reason={reason}
        onOpen={onOpenTask}
        onSkip={onSkip}
        onSeeApproved={onSeeApproved}
      />
    )
  }

  if (action.kind === 'cleared') {
    return <FocusCard focus={null} totalApproved={action.approvedCount} onSkip={onSkip} onSeeApproved={onSeeApproved} />
  }

  if (action.kind === 'unassigned') {
    return (
      <Message
        art="noData"
        title={t('tasks.next.unassigned.title')}
        body={t('tasks.next.unassigned.body')}
      />
    )
  }

  if (action.kind === 'waiting') {
    return (
      <Message
        art="inbox"
        title={t('tasks.next.waiting.title', { count: action.waitingCount })}
        body={t('tasks.next.waiting.body')}
        cta={{ label: t('tasks.next.waiting.cta'), onClick: onShowSubmitted, secondary: true }}
      />
    )
  }

  // Queue and stage actions (review / approve / onboard / assign / publish).
  const title =
    action.kind === 'review' ? t('tasks.next.review.title', { count: action.reviewCount })
    : action.kind === 'approve' ? t('tasks.next.approve.title', { count: action.approvalCount })
    : t(`tasks.next.${action.kind}.title`)
  const cta =
    action.kind === 'review' ? t('tasks.next.review.cta')
    : action.kind === 'approve' ? t('tasks.next.approve.cta')
    : t(`tasks.next.${action.kind}.cta`)
  const body = action.openCount > 0
    ? t('tasks.next.thenOpen', { count: action.openCount })
    : t(`tasks.next.${action.kind}.body`)

  return (
    <div className="min-w-0">
      <span className="type-caption font-semibold text-[var(--color-brand-strong)]">{t('tasks.next.kicker')}</span>
      <h2 className="type-h2 text-[var(--text-primary)] mt-1.5 text-balance">{title}</h2>
      <p className="type-small text-[var(--text-secondary)] mt-1.5 max-w-2xl">{body}</p>
      <button
        type="button"
        onClick={() => navigate(action.route)}
        className="mt-4 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] active:scale-[0.98] transition-[background-color,transform] duration-150 whitespace-nowrap shadow-[var(--btn-primary-shadow)]"
      >
        {cta} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  )
}

function Message({
  art, title, body, cta,
}: {
  art: 'noData' | 'inbox'
  title: string
  body: string
  cta?: { label: string; onClick: () => void; secondary?: boolean }
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap" role="status">
      <Illustration name={art} size={72} className="flex-shrink-0 -my-2" />
      <div className="min-w-0 flex-1">
        <h2 className="type-h3 text-[var(--text-primary)]">{title}</h2>
        <p className="type-small text-[var(--text-secondary)] mt-0.5 max-w-xl">{body}</p>
      </div>
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
        >
          {cta.label} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}
