import { useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { ArrowRight, Calendar, MessageSquare, SkipForward } from 'lucide-react'
import type { QuestionAssignment } from '../../lib/orgStore'
import { getFramework } from '../../lib/frameworks'
import { itemLabel } from '../../lib/itemLabel'
import { taskRoute } from '../../lib/journey'
import { Illustration, StatusPill } from '../ui'
import { deadlineLabel, isOverdue, daysUntilDue } from './shared'

interface FocusCardProps {
  focus: QuestionAssignment | null
  totalApproved: number
  onSkip: () => void
  onSeeApproved: () => void
  /** 'fix' when the task was sent back. Default 'answer'. */
  kind?: 'answer' | 'fix'
  /** Opens the task. Default: open it inline in My Tasks. */
  onOpen?: (a: QuestionAssignment) => void
  entityName?: string
  /** One sentence of context under the title. */
  reason?: string
}

/**
 * The body of the "Your next action" header: ONE task (picked by
 * `lib/journey.nextAction`), with its code, entity, deadline and a primary
 * "Answer now". The empty branch is the *cleared* state only — callers must
 * not render it while loading, on error, or when nothing is assigned.
 */
export default function FocusCard({
  focus, totalApproved, onSkip, onSeeApproved, kind = 'answer', onOpen, entityName, reason,
}: FocusCardProps) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  if (!focus) {
    return (
      <div className="flex items-center gap-4 flex-wrap" data-testid="focus-card-empty">
        <Illustration name="cleared" size={72} className="flex-shrink-0 -my-2" />
        <div className="min-w-0 flex-1">
          <h2 className="type-h3 text-[var(--text-primary)]">{t('tasks.focus.caughtUp')}</h2>
          <p className="type-small text-[var(--text-secondary)] mt-0.5">
            {t('tasks.focus.noOpen')}{' '}
            {totalApproved > 0 && (
              <Trans
                i18nKey="tasks.focus.approvedThisPeriod"
                values={{ count: totalApproved }}
                components={{ b: <strong className="tabular-nums text-[var(--text-primary)]" /> }}
              />
            )}
          </p>
        </div>
        {totalApproved > 0 && (
          <button
            type="button"
            onClick={onSeeApproved}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
          >
            {t('tasks.focus.seeApproved')} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
      </div>
    )
  }

  const fw = getFramework(focus.framework_id)
  const overdue = isOverdue(focus)
  const d = daysUntilDue(focus.due_date)
  const dueSoon = !overdue && d != null && d <= 7
  const label = itemLabel(focus, i18n.language)
  const open = () => (onOpen ? onOpen(focus) : navigate(taskRoute(focus)))

  return (
    <div className="min-w-0" data-testid="focus-card">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="type-caption font-semibold text-[var(--color-brand-strong)] whitespace-nowrap">
          {kind === 'fix' ? t('tasks.next.kind.fix') : t('tasks.focus.upNext')}
        </span>
        {focus.due_date && (
          <StatusPill
            tone={overdue ? 'danger' : dueSoon ? 'warning' : 'neutral'}
            icon={<Calendar aria-hidden />}
            size="sm"
          >
            {deadlineLabel(focus.due_date, focus.status, t, i18n.language)}
          </StatusPill>
        )}
      </div>

      <h2 className="type-h2 text-[var(--text-primary)] mt-1.5 line-clamp-2 text-balance">{label}</h2>

      <div className="mt-1.5 flex items-center gap-x-2 gap-y-1 flex-wrap text-caption text-[var(--text-tertiary)]">
        {fw && <span className="font-semibold text-[var(--text-secondary)] whitespace-nowrap">{fw.code}</span>}
        <span className="font-mono tabular-nums text-[var(--text-secondary)]">{focus.gri_code}</span>
        {entityName && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate max-w-[16rem]">{entityName}</span>
          </>
        )}
      </div>

      {kind === 'fix' && focus.comment ? (
        <p className="mt-3 flex items-start gap-2 type-small text-[var(--text-secondary)] max-w-2xl">
          <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--status-danger)]" aria-hidden />
          <span className="line-clamp-2">“{focus.comment}”</span>
        </p>
      ) : reason ? (
        <p className="mt-3 type-small text-[var(--text-secondary)] max-w-2xl">{reason}</p>
      ) : null}

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] active:scale-[0.98] transition-[background-color,transform] duration-150 whitespace-nowrap shadow-[var(--btn-primary-shadow)]"
        >
          {kind === 'fix' ? t('tasks.next.fixNow') : t('tasks.next.answerNow')} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-[var(--radius-md)] text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
          aria-label={t('tasks.focus.skipAria')}
        >
          <SkipForward className="w-3.5 h-3.5" aria-hidden /> {t('tasks.focus.skip')}
        </button>
      </div>
    </div>
  )
}
