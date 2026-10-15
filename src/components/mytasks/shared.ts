import type { QuestionAssignment } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'

export type FilterState = 'all' | 'overdue' | 'pending' | 'in_progress' | 'submitted' | 'approved'
export type ViewMode = 'list' | 'board' | 'calendar'

export function isOverdue(a: { is_overdue?: boolean; due_date: string | null; status: string }): boolean {
  if (a.is_overdue) return true
  if (!a.due_date) return false
  if (a.status === 'approved' || a.status === 'reviewed' || a.status === 'submitted') return false
  return new Date(a.due_date).getTime() < Date.now()
}

export function dueThisWeek(a: { due_date: string | null; status: string }): boolean {
  if (!a.due_date) return false
  if (a.status === 'approved' || a.status === 'reviewed' || a.status === 'submitted') return false
  const days = (new Date(a.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return days >= 0 && days <= 7
}

/** Days until due_date — negative = overdue. Null when no deadline. */
export function daysUntilDue(due_date: string | null): number | null {
  if (!due_date) return null
  const ms = new Date(due_date).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

/** Human, plain-English deadline label. */
export function deadlineLabel(due_date: string | null, status: string): string {
  if (!due_date) return 'No deadline'
  const closed = status === 'approved' || status === 'submitted' || status === 'reviewed'
  const d = daysUntilDue(due_date)
  if (d == null) return 'No deadline'
  if (closed) return new Date(due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (d < 0) return `Overdue ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'}`
  if (d === 0) return 'Due today'
  if (d === 1) return 'Due tomorrow'
  if (d <= 7) return `Due in ${d} days`
  if (d <= 30) return `Due in ${Math.ceil(d / 7)} weeks`
  return new Date(due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Group bucket key for the date-grouped list. */
export type DateGroupKey = 'overdue' | 'today' | 'week' | 'month' | 'later' | 'none'

export function groupKeyFor(a: QuestionAssignment): DateGroupKey {
  if (isOverdue(a)) return 'overdue'
  if (!a.due_date) return 'none'
  const d = daysUntilDue(a.due_date)
  if (d == null) return 'none'
  if (d <= 0) return 'today'
  if (d <= 7) return 'week'
  if (d <= 30) return 'month'
  return 'later'
}

export const GROUP_LABELS: Record<DateGroupKey, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'This week',
  month: 'This month',
  later: 'Later',
  none: 'No deadline',
}

export const GROUP_ORDER: DateGroupKey[] = ['overdue', 'today', 'week', 'month', 'later', 'none']

/** Status columns for the Board view. */
export type BoardColumnKey = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected'

export const BOARD_COLUMNS: { key: BoardColumnKey; label: string }[] = [
  { key: 'not_started', label: 'Not started' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

/** Build a minimal NexusQuestionnaireItem from an assignment. */
export function synthesizeQuestion(a: QuestionAssignment): NexusQuestionnaireItem {
  const firstMode = a.entry_modes?.[0] ?? 'Manual'
  return {
    id: a.questionId,
    section: 'Natural Capital',
    subsection: 'Emissions',
    gri_code: a.gri_code,
    line_item: a.line_item,
    unit: a.unit ?? null,
    scope_split: a.gri_code.startsWith('305-1') ? 'Scope 1'
      : a.gri_code.startsWith('305-2') ? 'Scope 2'
      : a.gri_code.startsWith('305-3') ? 'Scope 3'
      : null,
    default_workflow_role: 'FM',
    entry_mode_default: firstMode,
    target_fy2026: null,
    footnote_refs: [],
    reporting_scope: 'group',
  }
}

export function pickConnector(item: NexusQuestionnaireItem): string {
  if (item.gri_code.startsWith('305-7')) return 'CEMS — Site telemetry'
  if (item.gri_code.startsWith('302-')) return 'Utilities ERP'
  if (item.gri_code.startsWith('303-')) return 'Water meter telemetry'
  if (item.gri_code.startsWith('305-')) return 'GHG Inventory (IPCC)'
  if (item.gri_code.startsWith('401-') || item.gri_code.startsWith('404-')) return 'SuccessFactors — HR'
  if (item.gri_code.startsWith('201-')) return 'SAP ERP — FI/CO'
  return 'Generic ERP'
}

/**
 * Pick the single highest-priority open task for the FocusCard:
 *   1. Most overdue first.
 *   2. Then the closest upcoming deadline.
 *   3. Then anything with no deadline but in progress.
 */
export function pickFocus(assignments: QuestionAssignment[]): QuestionAssignment | null {
  const open = assignments.filter(a =>
    a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected'
  )
  if (open.length === 0) return null
  const scored = open.map(a => {
    const overdue = isOverdue(a)
    const d = daysUntilDue(a.due_date)
    // Lower score == higher priority.
    let score = 0
    if (overdue && d != null) score = d // negative = most overdue ranks lowest
    else if (d != null) score = d + 1
    else score = 9999
    return { a, score }
  })
  scored.sort((x, y) => x.score - y.score)
  return scored[0].a
}
