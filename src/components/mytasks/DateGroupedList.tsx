import { useMemo, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'
import { spring } from '../../motion/tokens'
import TaskRow from './TaskRow'
import {
  groupKeyFor, GROUP_LABELS, GROUP_ORDER, DEFAULT_COLLAPSED, type DateGroupKey,
} from './shared'

interface DateGroupedListProps {
  assignments: QuestionAssignment[]
  questionById: Map<string, NexusQuestionnaireItem>
  entityById: Map<string, OrgEntity>
  entities: OrgEntity[]
  members: OrgMember[]
  expandedId: string | null
  focusedId: string | null
  onToggle: (id: string) => void
  onUpdate: (id: string, patch: Partial<QuestionAssignment>) => Promise<void> | void
  /** Optional row-ref registry — exposes per-id DOM nodes for keyboard nav. */
  registerRow?: (id: string, node: HTMLDivElement | null) => void
  /** Controlled collapsed groups (else internal, with "Approved" collapsed). */
  collapsed?: Set<DateGroupKey>
  onToggleGroup?: (k: DateGroupKey) => void
}

const TONE: Partial<Record<DateGroupKey, string>> = {
  returned: 'var(--status-danger)',
  overdue: 'var(--status-danger)',
  today: 'var(--status-warning)',
  submitted: 'var(--status-info)',
  done: 'var(--status-success)',
}

/**
 * List view. Open work is grouped by deadline (Overdue → Later); work that has
 * left the user's hands sits in "Submitted" and "Approved" (collapsed) at the
 * bottom. Rows share a LayoutGroup so a submitted row glides to its new group.
 */
export default function DateGroupedList({
  assignments, questionById, entityById, entities, members,
  expandedId, focusedId, onToggle, onUpdate, registerRow, collapsed, onToggleGroup,
}: DateGroupedListProps) {
  const { t } = useTranslation()
  const [localCollapsed, setLocalCollapsed] = useState<Set<DateGroupKey>>(() => new Set(DEFAULT_COLLAPSED))
  const isCollapsed = (k: DateGroupKey) => (collapsed ?? localCollapsed).has(k)
  const toggleGroup = (k: DateGroupKey) => {
    if (onToggleGroup) return onToggleGroup(k)
    setLocalCollapsed(prev => {
      const n = new Set(prev)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  }

  const groups = useMemo(() => {
    const map = new Map<DateGroupKey, QuestionAssignment[]>()
    for (const a of assignments) {
      const k = groupKeyFor(a)
      const arr = map.get(k) ?? []
      arr.push(a)
      map.set(k, arr)
    }
    return GROUP_ORDER
      .map(k => ({ key: k, label: GROUP_LABELS[k], items: map.get(k) ?? [] }))
      .filter(g => g.items.length > 0)
  }, [assignments])

  return (
    <LayoutGroup id="task-list">
      <div className="space-y-6">
        {groups.map(g => {
          const closed = isCollapsed(g.key)
          return (
            <motion.section key={g.key} layout="position" transition={spring.gentle} aria-labelledby={`group-${g.key}`}>
              <header className="sticky top-0 z-10 -mx-1 px-1 py-1.5 mb-1.5 bg-[var(--bg-app)]/90 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.key)}
                  aria-expanded={!closed}
                  aria-controls={`group-body-${g.key}`}
                  className="inline-flex items-center gap-2 min-h-[32px] rounded-[var(--radius-sm)] pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform duration-fast ${closed ? '' : 'rotate-90'}`}
                    aria-hidden
                  />
                  <span className="w-2 h-2 rounded-full" style={{ background: TONE[g.key] ?? 'var(--text-quaternary)' }} aria-hidden />
                  <h3 id={`group-${g.key}`} className="type-small font-semibold text-[var(--text-primary)] whitespace-nowrap">
                    {t(g.label)}
                  </h3>
                  <span className="text-caption font-semibold tabular-nums px-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                    {g.items.length}
                  </span>
                </button>
              </header>
              {!closed && (
                <div id={`group-body-${g.key}`} className="space-y-2">
                  {g.items.map(a => (
                    <TaskRow
                      key={a.id}
                      ref={registerRow ? (n) => registerRow(a.id, n) : undefined}
                      assignment={a}
                      question={questionById.get(a.questionId)}
                      entity={entityById.get(a.entityId)}
                      expanded={expandedId === a.id}
                      focused={focusedId === a.id}
                      onToggle={() => onToggle(a.id)}
                      onUpdate={patch => onUpdate(a.id, patch)}
                      entities={entities}
                      members={members}
                    />
                  ))}
                </div>
              )}
            </motion.section>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
