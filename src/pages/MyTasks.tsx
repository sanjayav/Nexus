import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { showWarning } from '../lib/toast'
import { useAuth } from '../auth/AuthContext'
import { orgStore, type QuestionAssignment, type OrgEntity, type OrgMember } from '../lib/orgStore'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import EmptyState from '../components/EmptyState'
import { EmptyTasksIllustration } from '../data/illustrations'
import { resolveRole } from '../lib/rbac'
import PipelineJourney, { NextAction } from '../components/PipelineJourney'
import { computePipeline, focusStage } from '../lib/journey'
import { useOrgData } from '../lib/useOrgData'
import { useFramework } from '../lib/frameworks'
import SavedViewsBar from '../components/SavedViewsBar'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import { FadeIn } from '../components/MotionPrimitives'

import FocusCard from '../components/mytasks/FocusCard'
import StatsStrip from '../components/mytasks/StatsStrip'
import ViewToggle from '../components/mytasks/ViewToggle'
import DateGroupedList from '../components/mytasks/DateGroupedList'
import TaskBoard from '../components/mytasks/TaskBoard'
import TaskCalendar from '../components/mytasks/TaskCalendar'
import KeyboardShortcuts from '../components/mytasks/KeyboardShortcuts'
import {
  isOverdue, dueThisWeek, pickFocus,
  type FilterState, type ViewMode,
} from '../components/mytasks/shared'

export default function MyTasks() {
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const navigate = useNavigate()

  const [assignments, setAssignments] = useState<QuestionAssignment[]>([])
  const [questions, setQuestions] = useState<NexusQuestionnaireItem[]>([])
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [treeWarning, setTreeWarning] = useState<string | null>(null)

  const [filter, setFilter] = useState<FilterState>('all')
  const [view, setView] = useState<ViewMode>('list')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [focusIdx, setFocusIdx] = useState(0)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [dayFilter, setDayFilter] = useState<string | null>(null)
  const [skipIds, setSkipIds] = useState<Set<string>>(new Set())

  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const registerRow = useCallback((id: string, n: HTMLDivElement | null) => {
    if (n) rowRefs.current.set(id, n)
    else rowRefs.current.delete(id)
  }, [])

  const refresh = useCallback(async () => {
    if (!user?.email) return
    try {
      const [rows, ents, mems] = await Promise.all([
        orgStore.myAssignments(),
        orgStore.listEntities(),
        orgStore.listMembers(),
      ])
      setAssignments(rows.filter(a => a.framework_id === framework.id))
      setEntities(ents)
      setMembers(mems)
    } catch { /* surfaced elsewhere */ }
  }, [user?.email, framework.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refresh()
      try {
        const t = await nexus.tree(framework.id)
        if (!cancelled) { setQuestions(t); setTreeWarning(null) }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Could not load question definitions'
          setTreeWarning(msg)
          showWarning('Could not load question definitions — values may be missing context')
        }
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.email, framework.id, refresh])

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
    return [...matched].sort((a, b) => {
      const oa = isOverdue(a) ? 0 : 1
      const ob = isOverdue(b) ? 0 : 1
      if (oa !== ob) return oa - ob
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
      return da - db
    })
  }, [assignments, filter, dayFilter])

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

  const role = resolveRole(user)
  const { data: orgData } = useOrgData()
  const pipeline = useMemo(() => computePipeline(user, orgData ?? null), [user, orgData])
  const focus = useMemo(() => focusStage(user, orgData ?? null), [user, orgData])
  const openCount = useMemo(() =>
    assignments.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected').length
  , [assignments])

  const focusTask = useMemo(
    () => pickFocus(assignments.filter(a => !skipIds.has(a.id))),
    [assignments, skipIds]
  )

  const updateAssignment = useCallback(async (id: string, patch: Partial<QuestionAssignment>) => {
    await orgStore.updateAssignment(id, patch)
    await refresh()
  }, [refresh])

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      const editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable
      if (editing && e.key !== 'Escape') return

      if (e.key === '?') { e.preventDefault(); setShortcutsOpen(s => !s); return }
      if (e.key === 'Escape') {
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (expanded) { setExpanded(null); return }
        return
      }
      if (e.key === '1') { setView('list'); return }
      if (e.key === '2') { setView('board'); return }
      if (e.key === '3') { setView('calendar'); return }
      if (view !== 'list' || filtered.length === 0) return
      if (e.key === 'j') {
        e.preventDefault()
        setFocusIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'k') {
        e.preventDefault()
        setFocusIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const a = filtered[focusIdx]
        if (a) setExpanded(prev => prev === a.id ? null : a.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, filtered, focusIdx, shortcutsOpen, expanded])

  useEffect(() => {
    if (focusIdx >= filtered.length) setFocusIdx(Math.max(0, filtered.length - 1))
  }, [filtered.length, focusIdx])

  const focusedId = view === 'list' && filtered.length > 0 ? filtered[focusIdx]?.id ?? null : null

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

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Work', to: '/' }, { label: 'Tasks' }]}
        title="My tasks"
        description={
          stats.total === 0
            ? 'Disclosures assigned to you will appear here.'
            : `${stats.overdue} overdue · ${stats.dueThisWeek} due this week · ${stats.total} total`
        }
      />

      <div className="space-y-4">
        {focus && (
          <NextAction
            stage={focus}
            reason={
              openCount === 0
                ? `All your disclosures are submitted, ${user?.name?.split(' ')[0] ?? ''}. Good work.`
                : `You have ${openCount} disclosure${openCount === 1 ? '' : 's'} open. Start with the one closest to its deadline.`
            }
            cta={openCount === 0 ? 'Browse all tasks' : 'Start working'}
            secondary={openCount > 0 ? 'See approved history' : undefined}
            onPrimary={() => {
              const first = assignments.find(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected')
              if (first) navigate(`/data/entry/${first.questionId}`)
            }}
            onSecondary={() => setFilter('approved')}
          />
        )}
        <PipelineJourney stages={pipeline} activeKey={focus?.stage.key} myRole={role} />
      </div>

      {!loading && (
        <FadeIn>
          <FocusCard
            focus={focusTask}
            totalApproved={stats.approved}
            onSkip={() => focusTask && setSkipIds(s => { const n = new Set(s); n.add(focusTask.id); return n })}
            onSeeApproved={() => setFilter('approved')}
          />
        </FadeIn>
      )}

      {stats.total > 0 && (
        <StatsStrip
          stats={stats}
          approvedThisWeek={approvedThisWeek}
          filter={filter}
          onChange={(f) => { setFilter(f); setDayFilter(null) }}
        />
      )}

      {dayFilter && (
        <div className="flex items-center gap-2 text-[var(--text-xs)]">
          <span className="text-[var(--text-tertiary)]">Filtered to</span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-semibold tabular-nums">
            {dayFilter}
          </span>
          <button
            onClick={() => setDayFilter(null)}
            className="text-[var(--color-brand)] hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <ViewToggle view={view} onChange={setView} />
        <SavedViewsBar
          page="my-tasks"
          filters={{ filter, view } as { filter: FilterState; view: ViewMode }}
          onApply={(f) => {
            const fv = f as { filter?: FilterState; view?: ViewMode }
            if (fv.filter) setFilter(fv.filter)
            if (fv.view) setView(fv.view)
          }}
          className="flex-1 min-w-0"
        />
      </div>

      {treeWarning && (
        <div
          role="status"
          className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[12px]"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Could not load question definitions — assignment values may be missing context. {treeWarning}</span>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : filtered.length === 0 && view !== 'calendar' ? (
        <EmptyList total={stats.total} filter={filter} />
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
        />
      ) : view === 'board' ? (
        <TaskBoard
          assignments={filtered}
          entityById={entityById}
          onUpdate={updateAssignment}
          onOpen={(id) => { setView('list'); setExpanded(id) }}
        />
      ) : (
        <TaskCalendar assignments={assignments} onPickDay={handlePickDay} />
      )}

      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}

function EmptyList({ total, filter }: { total: number; filter: FilterState }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)]">
      <EmptyState
        illustration={total === 0 ? EmptyTasksIllustration : undefined}
        icon={ClipboardList}
        title={total === 0 ? 'No assignments yet' : `Nothing ${filter === 'all' ? 'in view' : 'in this bucket'}`}
        body={total === 0
          ? "Your admin hasn't assigned you GRI line items yet. They will land here as soon as they do."
          : 'Switch tabs or clear filters to see other items.'}
      />
    </div>
  )
}
