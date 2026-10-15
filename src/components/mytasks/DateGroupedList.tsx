import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'
import TaskRow from './TaskRow'
import {
  groupKeyFor, GROUP_LABELS, GROUP_ORDER, type DateGroupKey,
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
}

/**
 * List view, grouped by deadline bucket. Each group has a sticky header
 * with count. Empty groups are hidden.
 *
 * Memoizes the group computation so list-row re-renders don't recompute.
 */
export default function DateGroupedList({
  assignments, questionById, entityById, entities, members,
  expandedId, focusedId, onToggle, onUpdate, registerRow,
}: DateGroupedListProps) {
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
    <div className="space-y-6">
      {groups.map(g => (
        <section key={g.key} aria-labelledby={`group-${g.key}`}>
          <header className="flex items-center gap-2 mb-2 sticky top-0 z-10 bg-[var(--bg-page)]/95 backdrop-blur py-1">
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <h3
              id={`group-${g.key}`}
              className={`label uppercase tracking-wider font-semibold ${
                g.key === 'overdue' ? 'text-[var(--status-reject)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              {g.label}
            </h3>
            <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
              {g.items.length}
            </span>
          </header>
          <div className="space-y-2">
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
        </section>
      ))}
    </div>
  )
}
