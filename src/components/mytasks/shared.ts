import type { QuestionAssignment } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'
import type { TFunction } from 'i18next'
import { rankOpenAssignments, isAssignmentOverdue } from '../../lib/journey'

export type FilterState = 'all' | 'overdue' | 'pending' | 'in_progress' | 'submitted' | 'approved'
export type ViewMode = 'list' | 'board' | 'calendar'

/** Same rule as `lib/journey.isAssignmentOverdue` (one definition of "overdue"). */
export function isOverdue(a: { is_overdue?: boolean; due_date: string | null; status: string }): boolean {
  return isAssignmentOverdue(a)
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

/** Locale for Intl date formatting: zh → 'zh-CN', otherwise the browser default. */
export function dateLocale(language: string | undefined): string | undefined {
  return language?.startsWith('zh') ? 'zh-CN' : undefined
}

/** Human, plain-language deadline label (translated via `t`). */
export function deadlineLabel(due_date: string | null, status: string, t: TFunction, language?: string): string {
  if (!due_date) return t('workflowStatus.deadline.none')
  const closed = status === 'approved' || status === 'submitted' || status === 'reviewed'
  const d = daysUntilDue(due_date)
  if (d == null) return t('workflowStatus.deadline.none')
  const locale = dateLocale(language)
  if (closed) return new Date(due_date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  if (d < 0) return t('workflowStatus.deadline.overdueDays', { count: Math.abs(d) })
  if (d === 0) return t('workflowStatus.deadline.today')
  if (d === 1) return t('workflowStatus.deadline.tomorrow')
  if (d <= 7) return t('workflowStatus.deadline.inDays', { count: d })
  if (d <= 30) return t('workflowStatus.deadline.inWeeks', { count: Math.ceil(d / 7) })
  return new Date(due_date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

/**
 * Group bucket key for the list view. Open work is bucketed by deadline;
 * work that has left the user's hands gets its own groups so a submitted
 * item never sits under "Due today" (audit: grouping was wrong).
 */
export type DateGroupKey = 'returned' | 'overdue' | 'today' | 'week' | 'month' | 'later' | 'none' | 'submitted' | 'done'

export function groupKeyFor(a: QuestionAssignment): DateGroupKey {
  if (a.status === 'rejected') return 'returned'
  if (a.status === 'submitted' || a.status === 'reviewed') return 'submitted'
  if (a.status === 'approved') return 'done'
  if (isOverdue(a)) return 'overdue'
  if (!a.due_date) return 'none'
  const d = daysUntilDue(a.due_date)
  if (d == null) return 'none'
  if (d <= 0) return 'today'
  if (d <= 7) return 'week'
  if (d <= 30) return 'month'
  return 'later'
}

/** i18n keys for each group bucket — resolve with `t(GROUP_LABELS[k])`. */
export const GROUP_LABELS: Record<DateGroupKey, string> = {
  returned: 'tasks.group.returned',
  overdue: 'tasks.group.overdue',
  today: 'tasks.group.today',
  week: 'tasks.group.week',
  month: 'tasks.group.month',
  later: 'tasks.group.later',
  none: 'tasks.group.none',
  submitted: 'tasks.group.submitted',
  done: 'tasks.group.done',
}

export const GROUP_ORDER: DateGroupKey[] = ['returned', 'overdue', 'today', 'week', 'month', 'later', 'none', 'submitted', 'done']

/** Groups collapsed on first render (finished work stays out of the way). */
export const DEFAULT_COLLAPSED: DateGroupKey[] = ['done']

/** List order = visual order: group rank, then soonest deadline. Keeps j/k in step with the screen. */
export function sortForList(assignments: QuestionAssignment[]): QuestionAssignment[] {
  const rank = new Map(GROUP_ORDER.map((k, i) => [k, i]))
  return [...assignments].sort((a, b) => {
    const ga = rank.get(groupKeyFor(a)) ?? 99
    const gb = rank.get(groupKeyFor(b)) ?? 99
    if (ga !== gb) return ga - gb
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
    return da - db
  })
}

/** Status columns for the Board view. `label` is an i18n key — resolve with `t(label)`. */
export type BoardColumnKey = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected'

export const BOARD_COLUMNS: { key: BoardColumnKey; label: string }[] = [
  { key: 'not_started', label: 'workflowStatus.status.not_started' },
  { key: 'in_progress', label: 'workflowStatus.status.in_progress' },
  { key: 'submitted', label: 'workflowStatus.status.submitted' },
  { key: 'approved', label: 'workflowStatus.status.approved' },
  { key: 'rejected', label: 'workflowStatus.status.rejected' },
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
    line_item_zh: a.line_item_zh ?? null,
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
 * Pick the single highest-priority open task. Delegates to the one ranking in
 * `lib/journey` so My Day and My Tasks always suggest the same item.
 */
export function pickFocus(assignments: QuestionAssignment[]): QuestionAssignment | null {
  return rankOpenAssignments(assignments)[0] ?? null
}
