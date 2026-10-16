import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { Calendar, Factory, GripVertical } from 'lucide-react'
import type { QuestionAssignment, OrgEntity } from '../../lib/orgStore'
import { getFramework } from '../../lib/frameworks'
import { itemLabel } from '../../lib/itemLabel'
import StatusPill from './StatusPill'
import {
  BOARD_COLUMNS, type BoardColumnKey, isOverdue, deadlineLabel,
} from './shared'

interface TaskBoardProps {
  assignments: QuestionAssignment[]
  entityById: Map<string, OrgEntity>
  onUpdate: (id: string, patch: Partial<QuestionAssignment>) => Promise<void> | void
  onOpen: (id: string) => void
}

/**
 * Kanban board grouped by status. Drag a card from one column to another
 * to change status via the existing update endpoint.
 *
 * Drag flow:
 *   1. PointerSensor activated after 6px movement (preserves click).
 *   2. useDraggable per card + useDroppable per column.
 *   3. onDragEnd: if dropped on a different column id, call onUpdate({ status }).
 */
export default function TaskBoard({ assignments, entityById, onUpdate, onOpen }: TaskBoardProps) {
  const { t } = useTranslation()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeId, setActiveId] = useState<string | null>(null)

  const columns = useMemo(() => {
    const map = new Map<BoardColumnKey, QuestionAssignment[]>()
    for (const a of assignments) {
      // Treat 'reviewed' as part of 'submitted' so we only have 5 columns.
      const key: BoardColumnKey = a.status === 'reviewed' ? 'submitted' : (a.status as BoardColumnKey)
      const arr = map.get(key) ?? []
      arr.push(a)
      map.set(key, arr)
    }
    return BOARD_COLUMNS.map(col => ({ ...col, items: map.get(col.key) ?? [] }))
  }, [assignments])

  const activeAssignment = activeId ? assignments.find(a => a.id === activeId) : null

  const handleStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const handleEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const overId = e.over?.id
    if (!overId) return
    const targetCol = BOARD_COLUMNS.find(c => c.key === overId)
    if (!targetCol) return
    const dragged = assignments.find(a => a.id === e.active.id)
    if (!dragged) return
    const currentCol: BoardColumnKey = dragged.status === 'reviewed' ? 'submitted' : (dragged.status as BoardColumnKey)
    if (currentCol === targetCol.key) return
    onUpdate(dragged.id, { status: targetCol.key })
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={handleEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3" data-testid="task-board">
        {columns.map(col => (
          <BoardColumn
            key={col.key}
            columnKey={col.key}
            label={t(col.label)}
            items={col.items}
            entityById={entityById}
            onOpen={onOpen}
          />
        ))}
      </div>

      <DragOverlay>
        {activeAssignment ? (
          <BoardCard a={activeAssignment} entityById={entityById} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function BoardColumn({
  columnKey, label, items, entityById, onOpen,
}: {
  columnKey: BoardColumnKey
  label: string
  items: QuestionAssignment[]
  entityById: Map<string, OrgEntity>
  onOpen: (id: string) => void
}) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: columnKey })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-[var(--radius-lg)] border p-2.5 min-h-[200px] flex flex-col transition-colors duration-fast ${
        isOver ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]'
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="type-small font-semibold text-[var(--text-primary)] whitespace-nowrap truncate">{label}</h3>
        <span className="text-caption font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
          {items.length}
        </span>
      </div>
      <div className="space-y-2 flex-1">
        {items.map(a => (
          <DraggableCard key={a.id} a={a} entityById={entityById} onOpen={onOpen} />
        ))}
        {items.length === 0 && (
          <div className="text-caption text-[var(--text-tertiary)] text-center py-6 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)]">
            {t('tasks.board.dropHere')}
          </div>
        )}
      </div>
    </div>
  )
}

function DraggableCard({
  a, entityById, onOpen,
}: {
  a: QuestionAssignment
  entityById: Map<string, OrgEntity>
  onOpen: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: a.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={isDragging ? 'opacity-30' : ''}
    >
      <BoardCard a={a} entityById={entityById} dragHandle={listeners} onOpen={onOpen} />
    </div>
  )
}

function BoardCard({
  a, entityById, dragging, dragHandle, onOpen,
}: {
  a: QuestionAssignment
  entityById: Map<string, OrgEntity>
  dragging?: boolean
  dragHandle?: Record<string, any>
  onOpen?: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const fw = getFramework(a.framework_id)
  const entity = entityById.get(a.entityId)
  const overdue = isOverdue(a)

  return (
    <div
      className={`rounded-[var(--radius-md)] border bg-[var(--bg-primary)] p-3 ${
        dragging
          ? 'shadow-[var(--shadow-raised)] border-[var(--color-brand)] cursor-grabbing rotate-1 scale-[1.02]'
          : 'border-[var(--border-default)] shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] hover:-translate-y-px active:translate-y-0'
      } transition-[border-color,transform,box-shadow] duration-fast`}
    >
      <div className="flex items-start gap-2">
        {dragHandle && (
          <button
            {...dragHandle}
            className="-ml-1 -mt-1 w-7 h-7 flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-grab active:cursor-grabbing flex-shrink-0"
            aria-label={t('tasks.board.dragAria')}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-caption font-mono font-semibold text-[var(--color-brand-strong)] tabular-nums">{a.gri_code}</span>
            {fw && <span className="text-caption font-semibold text-[var(--text-tertiary)] whitespace-nowrap">{fw.code}</span>}
          </div>
          <button
            type="button"
            onClick={() => onOpen?.(a.id)}
            className="text-left text-small font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug hover:text-[var(--color-brand)] transition-colors"
          >
            {itemLabel(a, i18n.language)}
          </button>
          <div className="flex items-center gap-2 mt-2 text-caption text-[var(--text-tertiary)] flex-wrap">
            <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
              <Factory className="w-3 h-3 flex-shrink-0" /> {entity?.name ?? t('tasks.board.unknown')}
            </span>
            {a.due_date && (
              <span
                className={`inline-flex items-center gap-1 whitespace-nowrap ${
                  overdue ? 'text-[var(--status-reject)] font-semibold' : ''
                }`}
              >
                <Calendar className="w-3 h-3" /> {deadlineLabel(a.due_date, a.status, t, i18n.language)}
              </span>
            )}
          </div>
          <div className="mt-2">
            <StatusPill status={a.status} size="sm" />
          </div>
        </div>
      </div>
    </div>
  )
}
