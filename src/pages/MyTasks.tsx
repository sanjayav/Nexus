import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../auth/AuthContext'
import { orgStore, type QuestionAssignment, type OrgEntity, type OrgMember } from '../lib/orgStore'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import { computePipeline, nextAction as computeNextAction } from '../lib/journey'
import { useOrgData } from '../lib/useOrgData'
import { useFramework } from '../lib/frameworks'
import SavedViewsBar from '../components/SavedViewsBar'
import PageHeader from '../components/PageHeader'
import { EmptyState, StateBoundary, SkeletonTable, notify } from '../components/ui'

import NextActionHeader from '../components/mytasks/NextActionHeader'
import StatsStrip from '../components/mytasks/StatsStrip'
import ViewToggle from '../components/mytasks/ViewToggle'
import DateGroupedList from '../components/mytasks/DateGroupedList'
import TaskBoard from '../components/mytasks/TaskBoard'
import TaskCalendar from '../components/mytasks/TaskCalendar'
import KeyboardShortcuts from '../components/mytasks/KeyboardShortcuts'
import {
  isOverdue, dueThisWeek, sortForList, groupKeyFor, DEFAULT_COLLAPSED,
  type FilterState, type ViewMode, type DateGroupKey,
} from '../components/mytasks/shared'

/**
 * My Tasks — the contributor's work list.
 *
 * Header: ONE next action (from `lib/journey.nextAction`, the same model My
 * Day uses) with the pipeline as a slim strip. States are truthful: the
 * header and the list never claim "done" while loading, on error, or when
 * nothing is assigned.
 *
 * Deep links: `?open=<assignmentId>` expands that task inline (My Day's
 * "Answer now" lands here, so the user stays in Work), `?day=YYYY-MM-DD`
 * filters the list to one due date (from the calendar).
 */
export default function MyTasks() {
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()

  const [assignments, setAssignments] = useState<QuestionAssignment[]>([])
  const [questions, setQuestions] = useState<NexusQuestionnaireItem[]>([])
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [treeWarning, setTreeWarning] = useState<string | null>(null)

  const [filter, setFilter] = useState<FilterState>('all')
  const [view, setView] = useState<ViewMode>('list')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [focusIdx, setFocusIdx] = useState(0)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [dayFilter, setDayFilter] = useState<string | null>(null)
  const [skipIds, setSkipIds] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<DateGroupKey>>(() => new Set(DEFAULT_COLLAPSED))

  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const registerRow = useCallback((id: string, n: HTMLDivElement | null) => {
    if (n) rowRefs.current.set(id, n)
    else rowRefs.current.delete(id)
  }, [])

  /** Throws on failure so callers can show a truthful error. */
  const refresh = useCallback(async () => {
    if (!user?.email) return
    const [rows, ents, mems] = await Promise.all([
      orgStore.myAssignments(),
      orgStore.listEntities(),
      orgStore.listMembers(),
    ])
    setAssignments(rows.filter(a => a.framework_id === framework.id))
    setEntities(ents)
    setMembers(mems)
    setLoaded(true)
    setError(null)
  }, [user?.email, framework.id])

  const load = useCallback(async (isCancelled: () => boolean = () => false) => {
    setLoading(true)
    setError(null)
    try {
      await refresh()
    } catch (e) {
      if (!isCancelled()) setError(e instanceof Error ? e : new Error(String(e)))
    }
    try {
      const tree = await nexus.tree(framework.id)
      if (!isCancelled()) { setQuestions(tree); setTreeWarning(null) }
    } catch (e) {
      if (!isCancelled()) setTreeWarning(e instanceof Error ? e.message : t('tasks.page.treeLoadFailed'))
    }
    if (!isCancelled()) setLoading(false)
  }, [refresh, framework.id, t])

  useEffect(() => {
    let cancelled = false
    void load(() => cancelled)
    return () => { cancelled = true }
  }, [load])

  const entityById = useMemo(() => new Map(entities.map(e => [e.id, e])), [entities])
  const questionById = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions])

  const filtered = useMemo(() => {
    const matched = assignments.filter(a => {
      if (dayFilter && a.due_date !== dayFilter) return false
      if (filter === 'all') return true
      if (filter === 'overdue') return isOverdue(a)
      if (filter === 'pending') return a.status === 'not_started'
      if (filter === 'in_progress') return a.status === 'in_progress'
      if (filter === 'submitted') return a.status === 'submitted' || a.status === 'reviewed'
      if (filter === 'approved') return a.status === 'approved'
      return true
    })
    // Same order as the grouped list, so j/k moves down the screen.
    return sortForList(matched)
  }, [assignments, filter, dayFilter])

  // Rows the keyboard can reach (collapsed groups are skipped).
  const navigable = useMemo(
    () => (view === 'list' ? filtered.filter(a => !collapsed.has(groupKeyFor(a))) : []),
    [filtered, collapsed, view],
  )

  const stats = useMemo(() => ({
    total: assignments.length,
    overdue: assignments.filter(isOverdue).length,
    dueThisWeek: assignments.filter(dueThisWeek).length,
    notStarted: assignments.filter(a => a.status === 'not_started').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    submitted: assignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length,
    approved: assignments.filter(a => a.status === 'approved').length,
  }), [assignments])

  const approvedThisWeek = useMemo(() => {
    const wk = Date.now() - 7 * 24 * 60 * 60 * 1000
    return assignments.filter(a => a.status === 'approved' && a.last_updated && new Date(a.last_updated).getTime() >= wk).length
  }, [assignments])

  const { data: orgData } = useOrgData()
  // i18n.language: computePipeline returns translated labels — recompute on a live language switch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pipeline = useMemo(() => computePipeline(user, orgData ?? null), [user, orgData, i18n.language])

  // The one "what next" model — shared with My Day.
  const action = useMemo(() => {
    if (!loaded) return null
    const all = orgData?.assignments.filter(a => a.framework_id === framework.id) ?? null
    const full = computeNextAction(user, { mine: assignments, all, org: orgData ?? null })
    if (skipIds.size === 0 || !full.assignment) return full
    const alt = computeNextAction(user, { mine: assignments.filter(a => !skipIds.has(a.id)), all, org: orgData ?? null })
    return alt.assignment ? { ...full, kind: alt.kind, assignment: alt.assignment } : full
  }, [loaded, user, assignments, orgData, framework.id, skipIds])

  /**
   * Persist a patch from the inline answer panel. Throws on failure — the
   * shared entry surface (ValueEntry) owns the save/submit toasts and needs
   * the error to show its own. On submit the row collapses after the panel's
   * success moment and glides into the "Submitted" group (layoutId).
   */
  const collapseTimer = useRef<number | null>(null)
  useEffect(() => () => { if (collapseTimer.current) window.clearTimeout(collapseTimer.current) }, [])
  const updateAssignment = useCallback(async (id: string, patch: Partial<QuestionAssignment>) => {
    const prev = assignments.find(a => a.id === id)
    await orgStore.updateAssignment(id, patch)
    try { await refresh() } catch { /* keep the last good list; the next load surfaces the error */ }
    if (patch.status === 'submitted' && prev && prev.status !== 'submitted') {
      if (collapseTimer.current) window.clearTimeout(collapseTimer.current)
      collapseTimer.current = window.setTimeout(() => setExpanded(cur => (cur === id ? null : cur)), 1400)
    }
  }, [assignments, refresh])

  /** Board drag-and-drop: status change with feedback and Undo. */
  const moveOnBoard = useCallback(async (id: string, patch: Partial<QuestionAssignment>) => {
    const prev = assignments.find(a => a.id === id)
    try {
      await updateAssignment(id, patch)
    } catch (e) {
      notify.error(t('tasks.toast.saveFailed'), { description: e instanceof Error ? e.message : undefined })
      return
    }
    if (prev && patch.status && patch.status !== prev.status) {
      notify.success(t('tasks.toast.moved', { code: prev.gri_code, status: t(`ui.status.${patch.status}`) }), {
        undo: () => {
          updateAssignment(id, { status: prev.status }).catch(e =>
            notify.error(t('tasks.toast.saveFailed'), { description: e instanceof Error ? e.message : undefined }))
        },
      })
    }
  }, [assignments, updateAssignment, t])

  /** Open one task inline: list view, nothing hiding it, expanded and in view. */
  const openTask = useCallback((id: string) => {
    const a = assignments.find(x => x.id === id)
    if (!a) return
    setView('list')
    setFilter('all')
    setDayFilter(null)
    setCollapsed(prev => {
      const k = groupKeyFor(a)
      if (!prev.has(k)) return prev
      const n = new Set(prev); n.delete(k); return n
    })
    setExpanded(id)
    requestAnimationFrame(() => {
      const node = rowRefs.current.get(id)
      node?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }, [assignments])

  // Deep links (?open= / ?day=), applied once the data is here.
  const handledParams = useRef<string | null>(null)
  useEffect(() => {
    if (!loaded) return
    const key = params.toString()
    if (handledParams.current === key) return
    handledParams.current = key
    const open = params.get('open')
    const day = params.get('day')
    if (open) openTask(open)
    else if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) { setDayFilter(day); setView('list') }
    if (open || day) {
      const next = new URLSearchParams(params)
      next.delete('open'); next.delete('day')
      setParams(next, { replace: true })
    }
  }, [loaded, params, setParams, openTask])

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      const editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable
      if (editing && e.key !== 'Escape') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '?') { e.preventDefault(); setShortcutsOpen(s => !s); return }
      if (e.key === 'Escape') {
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (expanded) { setExpanded(null); return }
        return
      }
      if (e.key === '1') { setView('list'); return }
      if (e.key === '2') { setView('board'); return }
      if (e.key === '3') { setView('calendar'); return }
      if (view !== 'list' || navigable.length === 0) return
      if (e.key === 'j') {
        e.preventDefault()
        setFocusIdx(i => Math.min(i + 1, navigable.length - 1))
      } else if (e.key === 'k') {
        e.preventDefault()
        setFocusIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const a = navigable[focusIdx]
        if (a) setExpanded(prev => prev === a.id ? null : a.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, navigable, focusIdx, shortcutsOpen, expanded])

  useEffect(() => {
    if (focusIdx >= navigable.length) setFocusIdx(Math.max(0, navigable.length - 1))
  }, [navigable.length, focusIdx])

  const focusedId = view === 'list' && navigable.length > 0 ? navigable[focusIdx]?.id ?? null : null

  // Scroll focused row into view on j/k.
  useEffect(() => {
    if (!focusedId) return
    const node = rowRefs.current.get(focusedId)
    if (node) node.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedId])

  const handlePickDay = (iso: string) => {
    setDayFilter(iso)
    setView('list')
  }

  const toggleGroup = (k: DateGroupKey) => setCollapsed(prev => {
    const n = new Set(prev)
    if (n.has(k)) n.delete(k)
    else n.add(k)
    return n
  })

  const clearFilters = () => { setFilter('all'); setDayFilter(null) }
  const hasWork = loaded && !error && stats.total > 0

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t('tasks.page.title')}
        description={
          !loaded || error
            ? undefined
            : stats.total === 0
              ? t('tasks.page.descriptionEmpty')
              : t('tasks.page.descriptionStats', { overdue: stats.overdue, week: stats.dueThisWeek, total: stats.total })
        }
      />

      <NextActionHeader
        loading={loading && !loaded}
        error={!loaded ? error : null}
        onRetry={() => void load()}
        action={action}
        stages={orgData ? pipeline : []}
        entityName={(a) => entityById.get(a.entityId)?.name}
        onOpenTask={(a) => openTask(a.id)}
        onSkip={() => action?.assignment && setSkipIds(s => { const n = new Set(s); n.add(action.assignment!.id); return n })}
        onSeeApproved={() => { setFilter('approved'); setView('list'); setCollapsed(c => { const n = new Set(c); n.delete('done'); return n }) }}
        onShowSubmitted={() => { setFilter('submitted'); setView('list') }}
      />

      {hasWork && (
        <StatsStrip
          stats={stats}
          approvedThisWeek={approvedThisWeek}
          filter={filter}
          onChange={(f) => {
            setFilter(f)
            setDayFilter(null)
            if (f === 'approved') setCollapsed(c => { const n = new Set(c); n.delete('done'); return n })
          }}
        />
      )}

      {hasWork && (
        <div className="flex items-center gap-3 flex-wrap">
          <ViewToggle view={view} onChange={setView} />
          {dayFilter && (
            <span className="chip chip-active">
              {t('tasks.page.filteredTo')} <span className="tabular-nums">{dayFilter}</span>
              <button type="button" onClick={() => setDayFilter(null)} className="font-semibold underline-offset-2 hover:underline">
                {t('tasks.page.clear')}
              </button>
            </span>
          )}
          <SavedViewsBar
            page="my-tasks"
            filters={{ filter, view } as { filter: FilterState; view: ViewMode }}
            onApply={(f) => {
              const fv = f as { filter?: FilterState; view?: ViewMode }
              if (fv.filter) setFilter(fv.filter)
              if (fv.view) setView(fv.view)
            }}
            className="basis-full sm:basis-auto sm:flex-1 min-w-0"
          />
        </div>
      )}

      {treeWarning && hasWork && (
        <div
          role="status"
          className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--status-warning-soft)] border border-[var(--status-warning-line)] text-[var(--status-warning)] text-caption"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden />
          <span>{t('tasks.page.treeWarningBanner')} {treeWarning}</span>
        </div>
      )}

      {/* The list. Error and "nothing assigned" are told once, in the header. */}
      <StateBoundary
        loading={loading && !loaded}
        hasData={loaded}
        skeleton={<SkeletonTable rows={6} cols={4} />}
      >
        {hasWork && (
          filtered.length === 0 && view !== 'calendar' ? (
            <EmptyState
              variant="filtered"
              framed
              title={filter === 'all' && !dayFilter ? t('tasks.empty.nothingInView') : t('tasks.empty.nothingInBucket')}
              body={t('tasks.empty.filteredBody')}
              onClearFilters={clearFilters}
            />
          ) : view === 'list' ? (
            <DateGroupedList
              assignments={filtered}
              questionById={questionById}
              entityById={entityById}
              entities={entities}
              members={members}
              expandedId={expanded}
              focusedId={focusedId}
              onToggle={(id) => setExpanded(prev => prev === id ? null : id)}
              onUpdate={updateAssignment}
              registerRow={registerRow}
              collapsed={collapsed}
              onToggleGroup={toggleGroup}
            />
          ) : view === 'board' ? (
            <TaskBoard
              assignments={filtered}
              entityById={entityById}
              onUpdate={moveOnBoard}
              onOpen={openTask}
            />
          ) : (
            <TaskCalendar assignments={assignments} onPickDay={handlePickDay} />
          )
        )}
      </StateBoundary>

      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
