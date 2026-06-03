import { useNavigate } from 'react-router-dom'
import { ArrowRight, Calendar, CheckCircle2, Sparkles, SkipForward } from 'lucide-react'
import type { QuestionAssignment } from '../../lib/orgStore'
import { getFramework } from '../../lib/frameworks'
import { deadlineLabel, isOverdue, daysUntilDue } from './shared'

interface FocusCardProps {
  focus: QuestionAssignment | null
  totalApproved: number
  onSkip: () => void
  onSeeApproved: () => void
}

/**
 * The "what to do next" card. Picks ONE highest-priority open task and
 * surfaces it with framework chips, plain-English deadline and CTAs.
 *
 * When the user has nothing open, shows a calm congratulation card.
 */
export default function FocusCard({ focus, totalApproved, onSkip, onSeeApproved }: FocusCardProps) {
  const navigate = useNavigate()

  if (!focus) {
    return (
      <div className="card-premium p-5 flex items-center justify-between gap-4 flex-wrap" data-testid="focus-card-empty">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-full bg-[var(--accent-green-light)] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[var(--status-ok)]" />
          </span>
          <div>
            <div className="h-section text-[var(--text-primary)]">You're caught up.</div>
            <p className="body text-[var(--text-secondary)] text-[var(--text-sm)] mt-0.5">
              No open disclosures right now. {totalApproved > 0 && (
                <>You have <strong className="tabular-nums text-[var(--text-primary)]">{totalApproved}</strong> approved this period.</>
              )}
            </p>
          </div>
        </div>
        {totalApproved > 0 && (
          <button onClick={onSeeApproved} className="btn-secondary inline-flex items-center gap-1.5 text-[var(--text-sm)]">
            See approved history <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  const fw = getFramework(focus.framework_id)
  const overdue = isOverdue(focus)
  const d = daysUntilDue(focus.due_date)
  const dueSoon = !overdue && d != null && d <= 7
  const preview = (focus.comment || focus.narrative_body || focus.line_item || '').slice(0, 140)

  const deadlineTone = overdue
    ? 'bg-[var(--accent-red-light)] text-[var(--status-reject)] border border-[var(--status-reject)]/30'
    : dueSoon
      ? 'bg-[var(--accent-amber-light)] text-[var(--status-draft)] border border-[var(--status-draft)]/30'
      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'

  return (
    <div
      className="card-premium p-5 sm:p-6 relative overflow-hidden transition-all hover:-translate-y-px hover:border-[var(--color-brand)]/30"
      data-testid="focus-card"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-brand)]/40 to-transparent" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
              <Sparkles className="w-3 h-3" /> Up next
            </span>
            {fw && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `${fw.color}22`, color: fw.color }}
              >
                {fw.code}
              </span>
            )}
            <span className="text-[10px] font-bold text-[var(--color-brand)] tabular-nums">{focus.gri_code}</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${deadlineTone}`}
            >
              <Calendar className="w-3 h-3" /> {deadlineLabel(focus.due_date, focus.status)}
            </span>
          </div>

          <h2 className="h-section text-[var(--text-primary)] leading-snug">
            {focus.line_item}
          </h2>
          {preview && preview !== focus.line_item && (
            <p className="body text-[var(--text-secondary)] text-[var(--text-sm)] mt-1.5 line-clamp-2 max-w-2xl">
              {preview}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onSkip}
            className="btn-secondary inline-flex items-center gap-1.5 text-[var(--text-sm)]"
            aria-label="Skip this task for now"
          >
            <SkipForward className="w-3.5 h-3.5" /> Skip for now
          </button>
          <button
            onClick={() => navigate(`/data/entry/${focus.questionId}`)}
            className="btn-primary inline-flex items-center gap-1.5 text-[var(--text-sm)]"
          >
            Open <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
