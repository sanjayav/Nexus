import { forwardRef } from 'react'
import {
  Calendar, ChevronDown, ChevronUp, Factory, PencilLine,
  Calculator as CalcIcon, Plug,
} from 'lucide-react'
import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'
import { getFramework } from '../../lib/frameworks'
import StatusPill from './StatusPill'
import AnswerPanel from './AnswerPanel'
import { isOverdue, daysUntilDue, deadlineLabel, synthesizeQuestion } from './shared'

export interface TaskRowProps {
  assignment: QuestionAssignment
  question: NexusQuestionnaireItem | undefined
  entity: OrgEntity | undefined
  expanded: boolean
  focused?: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<QuestionAssignment>) => Promise<void> | void
  entities: OrgEntity[]
  members: OrgMember[]
}

/**
 * Single task row used by both the date-grouped list and the calendar
 * day-detail. Header button expands the inline AnswerPanel.
 */
const TaskRow = forwardRef<HTMLDivElement, TaskRowProps>(function TaskRow({
  assignment: a, question, entity, expanded, focused, onToggle, onUpdate, entities, members,
}, ref) {
  const statusColor = {
    not_started: 'var(--text-tertiary)',
    in_progress: 'var(--status-draft)',
    submitted:   'var(--status-pending)',
    reviewed:    'var(--status-pending)',
    approved:    'var(--status-ok)',
    rejected:    'var(--status-reject)',
  }[a.status]

  const modes = a.entry_modes ?? ['Manual']
  const overdue = isOverdue(a)
  const d = daysUntilDue(a.due_date)
  const dueSoon = !overdue && d != null && d <= 7
  const fw = getFramework(a.framework_id)

  const dateChip = a.due_date && (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${
        overdue
          ? 'bg-[var(--accent-red-light)] text-[var(--status-reject)] border border-[var(--status-reject)]/30'
          : dueSoon
            ? 'bg-[var(--accent-amber-light)] text-[var(--status-draft)] border border-[var(--status-draft)]/30'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
      }`}
    >
      <Calendar className="w-3 h-3" />
      {deadlineLabel(a.due_date, a.status)}
    </span>
  )

  return (
    <div
      ref={ref}
      className={`rounded-[var(--radius-lg)] border bg-[var(--bg-primary)] transition-all ${
        expanded
          ? 'border-[var(--color-brand)]/40 shadow-md'
          : focused
            ? 'border-[var(--color-brand)]/60 ring-2 ring-[var(--color-brand)]/20'
            : 'border-[var(--border-default)] hover:border-[var(--color-brand)]/30 hover:-translate-y-px'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${a.gri_code} ${a.line_item} for ${entity?.name ?? 'unknown entity'}, status ${a.status}${overdue ? ', overdue' : ''}${a.due_date ? `, ${deadlineLabel(a.due_date, a.status)}` : ''}`}
        className="w-full text-left p-4 min-h-[64px] flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap"
      >
        <span className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: statusColor }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {fw && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `${fw.color}22`, color: fw.color }}
              >
                {fw.code}
              </span>
            )}
            <span className="text-[10px] font-bold text-[var(--color-brand)] tabular-nums">{a.gri_code}</span>
            {question?.section && (
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">· {question.section}</span>
            )}
          </div>
          <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{a.line_item}</div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-tertiary)] flex-wrap">
            <span className="inline-flex items-center gap-1"><Factory className="w-3 h-3" /> {entity?.name ?? 'Unknown entity'}</span>
            <span className="inline-flex items-center gap-1">
              {modes.map((m, i) => {
                const Icon = m === 'Manual' ? PencilLine : m === 'Calculator' ? CalcIcon : Plug
                return (
                  <span key={m} className="inline-flex items-center gap-0.5">
                    {i > 0 && <span className="mx-0.5">·</span>}
                    <Icon className="w-3 h-3" /> {m}
                  </span>
                )
              })}
            </span>
          </div>
        </div>

        {dateChip}
        <StatusPill status={a.status} />
        {expanded
          ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
          : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)]">
          <AnswerPanel
            assignment={a}
            question={question ?? synthesizeQuestion(a)}
            onUpdate={onUpdate}
            entities={entities}
            members={members}
          />
        </div>
      )}
    </div>
  )
})

export default TaskRow
