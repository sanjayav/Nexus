import { forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Calendar, ChevronDown, Factory, PencilLine,
  Calculator as CalcIcon, Plug,
} from 'lucide-react'
import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'
import { getFramework } from '../../lib/frameworks'
import { itemLabel } from '../../lib/itemLabel'
import { capitalLabelKey } from '../../reports/spdTemplate'
import { StatusPill as UiPill } from '../ui'
import { spring, dur, ease } from '../../motion/tokens'
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
 * One task row. The header button expands the inline AnswerPanel.
 *
 * One status encoding: the StatusPill (no left colour bar). The deadline is a
 * pill only while the task is open; once it has left the user's hands it is
 * plain text. The row carries a `layoutId`, so when a submit moves it into
 * the "Submitted" group it glides there instead of jumping.
 */
const TaskRow = forwardRef<HTMLDivElement, TaskRowProps>(function TaskRow({
  assignment: a, question, entity, expanded, focused, onToggle, onUpdate, entities, members,
}, ref) {
  const { t, i18n } = useTranslation()
  const modes = a.entry_modes ?? ['Manual']
  const overdue = isOverdue(a)
  const d = daysUntilDue(a.due_date)
  const closed = a.status === 'submitted' || a.status === 'reviewed' || a.status === 'approved'
  const dueSoon = !overdue && !closed && d != null && d <= 7
  const fw = getFramework(a.framework_id)
  const deadline = a.due_date ? deadlineLabel(a.due_date, a.status, t, i18n.language) : null

  return (
    <motion.div
      ref={ref}
      layout="position"
      layoutId={`task-row-${a.id}`}
      transition={spring.gentle}
      data-task-id={a.id}
      className={`rounded-[var(--radius-lg)] border bg-[var(--bg-primary)] transition-[border-color,box-shadow] duration-fast ${
        expanded
          ? 'border-[var(--border-strong)] shadow-[var(--shadow-raised)]'
          : focused
            ? 'border-[var(--color-brand)] shadow-[0_0_0_3px_var(--color-brand-soft)]'
            : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card)]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={t('tasks.row.aria', {
          code: a.gri_code,
          item: itemLabel(a, i18n.language),
          entity: entity?.name ?? t('tasks.row.unknownEntityLower'),
          status: t(`workflowStatus.status.${a.status}`),
        }) + (overdue ? t('tasks.row.ariaOverdue') : '') + (deadline ? `, ${deadline}` : '')}
        className="group w-full text-left px-4 py-3.5 min-h-[64px] flex items-center gap-x-4 gap-y-2 flex-wrap sm:flex-nowrap rounded-[var(--radius-lg)] active:bg-[var(--bg-hover)] transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-inset"
      >
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-caption">
            <span className="font-mono font-semibold tabular-nums text-[var(--color-brand-strong)]">{a.gri_code}</span>
            {fw && <span className="font-semibold text-[var(--text-tertiary)] whitespace-nowrap">{fw.code}</span>}
            {question?.section && (
              <span className="text-[var(--text-tertiary)] truncate">· {t(capitalLabelKey(question.section), { defaultValue: question.section })}</span>
            )}
          </div>
          <div className="mt-0.5 text-body font-semibold text-[var(--text-primary)] line-clamp-2 sm:line-clamp-1">
            {itemLabel(a, i18n.language)}
          </div>
          <div className="flex items-center gap-x-3 gap-y-0.5 mt-1 text-caption text-[var(--text-tertiary)] flex-wrap">
            <span className="inline-flex items-center gap-1 min-w-0">
              <Factory className="w-3 h-3 flex-shrink-0" aria-hidden />
              <span className="truncate">{entity?.name ?? t('tasks.row.unknownEntity')}</span>
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              {modes.map((m, i) => {
                const Icon = m === 'Manual' ? PencilLine : m === 'Calculator' ? CalcIcon : Plug
                return (
                  <span key={m} className="inline-flex items-center gap-0.5">
                    {i > 0 && <span className="mx-0.5" aria-hidden>·</span>}
                    <Icon className="w-3 h-3" aria-hidden /> {t(`tasks.mode.${m}`, { defaultValue: m })}
                  </span>
                )
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {deadline && (closed ? (
            <span className="text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">{deadline}</span>
          ) : (
            <UiPill tone={overdue ? 'danger' : dueSoon ? 'warning' : 'neutral'} icon={<Calendar aria-hidden />} size="sm">
              {deadline}
            </UiPill>
          ))}
          <StatusPill status={a.status} layoutId={`task-pill-${a.id}`} />
          <ChevronDown
            className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-fast ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)]">
              <AnswerPanel
                assignment={a}
                question={question ?? synthesizeQuestion(a)}
                onUpdate={onUpdate}
                entities={entities}
                members={members}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

export default TaskRow
