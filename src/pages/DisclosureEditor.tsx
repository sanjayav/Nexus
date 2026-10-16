import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarClock } from 'lucide-react'
import {
  nexus,
  conceptMappings,
  type NexusQuestionnaireItem,
  type ConceptPeer,
} from '../lib/api'
import { orgStore, type QuestionAssignment } from '../lib/orgStore'
import { getFramework } from '../lib/frameworks'
import { useAuth } from '../auth/AuthContext'
import { hasPermission } from '../lib/rbac'
import DisclosureProgressBar, { type DisclosureWorkflowStatus } from '../components/disclosure-editor/DisclosureProgressBar'
import DisclosureTree, { type DisclosureTreeSubsection } from '../components/disclosure-editor/DisclosureTree'
import DisclosureDocument, { type DisclosureDocumentCellState } from '../components/disclosure-editor/DisclosureDocument'
import DisclosureCellRail, { type RailSectionSummary } from '../components/disclosure-editor/DisclosureCellRail'
import MobileEditorShell from '../components/disclosure-editor/MobileEditorShell'
import { RoomProvider, roomIdFor } from '../lib/liveblocks'
import { useIsBelowLg } from '../lib/breakpoints'
import { StateBoundary, EmptyState, notify, useConfirm } from '../components/ui'
import { Skeleton } from '../components/Skeleton'
import { useActiveReportingYear } from '../lib/activeReportingYear'
import { persistDraft, NoReportingYearError } from '../components/entry/persist'
import type { SaveState } from '../components/entry/SaveStatus'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; error: string }
  | { kind: 'empty' }
  | { kind: 'ready'; items: NexusQuestionnaireItem[]; assignments: QuestionAssignment[] }

const DONE: ReadonlyArray<QuestionAssignment['status']> = ['approved', 'reviewed', 'submitted']

/**
 * Workiva-style document-centric disclosure editor.
 *
 * Three panes:
 *   • Left  — subsection tree with per-subsection progress.
 *   • Mid   — typeset document with inline cells (keyboard: ↑/↓, Enter, Esc).
 *   • Right — the shared <ValueEntry> for the selected cell (same entry,
 *             evidence, AI extraction and submit as My Tasks), reviewer
 *             decisions, fact details and audit trail; a subsection summary
 *             when nothing is selected.
 *
 * URL: `:frameworkId` selects the framework; `?cell=<id>` deep-links a cell.
 */
export default function DisclosureEditor() {
  const { frameworkId = 'gri' } = useParams<{ frameworkId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, permissions } = useAuth()
  const { t, i18n } = useTranslation()
  const confirm = useConfirm()

  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const activeYear = useActiveReportingYear()
  const reportingYearId = activeYear.kind === 'ready' ? activeYear.year.id : null
  const reportingYear = activeYear.kind === 'ready' ? activeYear.year.year : new Date().getFullYear()
  const [readingMode, setReadingMode] = useState(false)
  const [linkedPeersByItem, setLinkedPeersByItem] = useState<Record<string, ConceptPeer[]>>({})
  const isBelowLg = useIsBelowLg()
  const [activeCellId, setActiveCellId] = useState<string | null>(searchParams.get('cell'))
  const [activeSubsectionId, setActiveSubsectionId] = useState<string | null>(null)
  const [cellSaveStates, setCellSaveStates] = useState<Record<string, DisclosureDocumentCellState>>({})
  const [editorSave, setEditorSave] = useState<{ state: SaveState; at: number | null }>({ state: 'idle', at: null })
  const [workflowBusy, setWorkflowBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const sectionAnchorsRef = useRef<Map<string, HTMLElement | null>>(new Map())

  const framework = getFramework(frameworkId)

  // Persist for the TopBar "+ New value" handoff so it returns the user here.
  useEffect(() => {
    try { localStorage.setItem('aeiforo_last_framework', frameworkId) }
    catch { /* ignore storage failures (private mode etc.) */ }
  }, [frameworkId])

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const [tree, assignments] = await Promise.all([
        nexus.tree(frameworkId),
        orgStore.listAssignments().catch(() => orgStore.myAssignments()),
      ])
      if (tree.length === 0) return setState({ kind: 'empty' })
      const filtered = assignments.filter(a => a.framework_id === frameworkId)
      setState({ kind: 'ready', items: tree, assignments: filtered })
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : t('disclosureEditor.page.failedToLoad') })
    }
  }, [frameworkId, t])

  useEffect(() => { void load() }, [load])

  // Bulk-fetch per-cell linked peers for the inline link badge (best-effort).
  const itemIdsKey = state.kind === 'ready' ? state.items.map(i => i.id).join('|') : ''
  useEffect(() => {
    if (state.kind !== 'ready') return
    let cancelled = false
    const items = state.items
    void (async () => {
      const entries = await Promise.all(items.map(async it => {
        try {
          const res = await conceptMappings.forQuestion(it.id)
          return [it.id, res.mappings.filter(p => p.questionnaire_item_id !== it.id)] as const
        } catch {
          return [it.id, [] as ConceptPeer[]] as const
        }
      }))
      if (!cancelled) setLinkedPeersByItem(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdsKey])

  const assignmentByItem = useMemo(() => {
    const m = new Map<string, QuestionAssignment>()
    if (state.kind !== 'ready') return m
    for (const a of state.assignments) {
      const existing = m.get(a.questionId)
      if (!existing || (a.last_updated && existing.last_updated && a.last_updated > existing.last_updated)) m.set(a.questionId, a)
    }
    return m
  }, [state])

  const cellState = useMemo<Record<string, DisclosureDocumentCellState>>(() => {
    if (state.kind !== 'ready') return {}
    const out: Record<string, DisclosureDocumentCellState> = {}
    for (const item of state.items) {
      out[item.id] = {
        assignment: assignmentByItem.get(item.id) ?? null,
        saveState: cellSaveStates[item.id]?.saveState ?? 'idle',
        errorMessage: cellSaveStates[item.id]?.errorMessage,
      }
    }
    return out
  }, [state, assignmentByItem, cellSaveStates])

  const subsections = useMemo<DisclosureTreeSubsection[]>(() => {
    if (state.kind !== 'ready') return []
    const map = new Map<string, DisclosureTreeSubsection>()
    for (const item of state.items) {
      const id = `${item.section}::${item.subsection}`
      const existing = map.get(id) ?? { id, section: item.section, label: item.subsection, code: deriveSubsectionCode(item), total: 0, completed: 0 }
      existing.total += 1
      const a = assignmentByItem.get(item.id)
      if (a && DONE.includes(a.status)) existing.completed += 1
      map.set(id, existing)
    }
    return Array.from(map.values())
  }, [state, assignmentByItem])

  const breakdown = useMemo(() => {
    const b = { approved: 0, inReview: 0, drafted: 0 }
    if (state.kind !== 'ready') return b
    for (const item of state.items) {
      const s = assignmentByItem.get(item.id)?.status
      if (s === 'approved') b.approved += 1
      else if (s === 'submitted' || s === 'reviewed') b.inReview += 1
      else if (s === 'in_progress' || s === 'rejected') b.drafted += 1
    }
    return b
  }, [state, assignmentByItem])

  const { completedCells, totalCells } = useMemo(() => {
    let c = 0, n = 0
    for (const s of subsections) { c += s.completed; n += s.total }
    return { completedCells: c, totalCells: n }
  }, [subsections])

  const workflowStatus: DisclosureWorkflowStatus = useMemo(() => {
    if (totalCells === 0) return 'draft'
    if (completedCells >= totalCells) return 'published'
    if (completedCells > 0) return 'in_review'
    return 'draft'
  }, [completedCells, totalCells])

  // Sync active cell to URL.
  useEffect(() => {
    const current = searchParams.get('cell')
    if (activeCellId && activeCellId !== current) {
      const next = new URLSearchParams(searchParams)
      next.set('cell', activeCellId)
      setSearchParams(next, { replace: true })
    }
  }, [activeCellId, searchParams, setSearchParams])

  // Follow a deep link that changes `?cell` (e.g. Fact details "other locations").
  useEffect(() => {
    const fromUrl = searchParams.get('cell')
    if (fromUrl && fromUrl !== activeCellId) setActiveCellId(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (state.kind !== 'ready' || !activeCellId) return
    const item = state.items.find(i => i.id === activeCellId)
    if (item) setActiveSubsectionId(`${item.section}::${item.subsection}`)
  }, [activeCellId, state])

  const handleTreeSelect = useCallback((id: string) => {
    setActiveSubsectionId(id)
    const el = sectionAnchorsRef.current.get(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const registerSectionAnchor = useCallback((id: string, el: HTMLElement | null) => {
    sectionAnchorsRef.current.set(id, el)
  }, [])

  const setCellSave = useCallback((id: string, next: DisclosureDocumentCellState) => {
    setCellSaveStates(prev => ({ ...prev, [id]: next }))
  }, [])

  const patchLocal = useCallback((questionId: string, patch: Partial<QuestionAssignment>) => {
    setState(prev => prev.kind !== 'ready' ? prev : {
      ...prev,
      assignments: prev.assignments.map(a => a.questionId === questionId ? { ...a, ...patch, last_updated: new Date().toISOString() } : a),
    })
  }, [])

  /** Inline cell commit — the same draft pipeline as <ValueEntry> autosave. */
  const handleSave = useCallback(async (item: NexusQuestionnaireItem, newValue: number | null) => {
    const assignment = assignmentByItem.get(item.id) ?? null
    const previous = assignment?.value ?? null
    setCellSave(item.id, { assignment, saveState: 'saving', errorMessage: null })
    setEditorSave(s => ({ ...s, state: 'saving' }))
    try {
      if (!assignment && newValue == null) {
        setCellSave(item.id, { assignment, saveState: 'idle', errorMessage: null })
        setEditorSave(s => ({ ...s, state: 'idle' }))
        return
      }
      await persistDraft({
        question: item,
        assignment,
        patchAssignment: patch => orgStore.updateAssignment(assignment!.id, patch),
        fields: { value: newValue },
        mode: 'Manual',
      })
      if (assignment) patchLocal(item.id, { value: newValue, status: assignment.status === 'not_started' || assignment.status === 'rejected' ? 'in_progress' : assignment.status })
      setCellSave(item.id, { assignment, saveState: 'saved', errorMessage: null })
      setEditorSave({ state: 'saved', at: Date.now() })
      if (assignment && newValue == null && previous != null) {
        notify.message(t('disclosureEditor.page.cleared', { code: item.gri_code }), {
          undo: () => { void handleSaveRef.current(item, previous) },
        })
      }
      window.setTimeout(() => {
        setCellSaveStates(prev => (prev[item.id]?.saveState === 'saved' ? { ...prev, [item.id]: { ...prev[item.id], saveState: 'idle' } } : prev))
      }, 2000)
    } catch (e) {
      const msg = e instanceof NoReportingYearError ? t('entry.year.noneShort') : e instanceof Error ? e.message : t('disclosureEditor.page.saveFailed')
      setCellSave(item.id, { assignment, saveState: 'error', errorMessage: msg })
      setEditorSave(s => ({ ...s, state: 'error' }))
    }
  }, [assignmentByItem, setCellSave, patchLocal, t])
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  /** Rail form saved/submitted — keep the document in step. */
  const handleAssignmentChange = useCallback((next: QuestionAssignment) => {
    setState(prev => prev.kind !== 'ready' ? prev : { ...prev, assignments: prev.assignments.map(a => (a.id === next.id ? next : a)) })
    setEditorSave({ state: 'saved', at: Date.now() })
  }, [])

  // Reviewer decisions from the rail.
  const handleWorkflowAction = useCallback(async (action: 'submit' | 'approve' | 'reject') => {
    if (!activeCellId) return
    const assignment = assignmentByItem.get(activeCellId)
    if (!assignment) return
    setWorkflowBusy(true)
    const nextStatus: QuestionAssignment['status'] = action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : 'rejected'
    try {
      await orgStore.updateAssignment(assignment.id, { status: nextStatus })
      // Mirror into workflow data_value (best-effort; the assignment is the UI record).
      try {
        if (action === 'submit') await nexus.submit(assignment.id)
        else if (action === 'approve') await nexus.approve(assignment.id, 'approve')
        else await nexus.approve(assignment.id, 'reject')
      } catch { /* swallow */ }
      patchLocal(assignment.questionId, { status: nextStatus })
      notify.success(
        action === 'approve' ? t('disclosureEditor.page.approved', { code: assignment.gri_code })
          : action === 'reject' ? t('disclosureEditor.page.rejected', { code: assignment.gri_code })
            : t('entry.toast.submitted'),
      )
    } catch (e) {
      notify.error(t('disclosureEditor.page.actionFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setWorkflowBusy(false)
    }
  }, [activeCellId, assignmentByItem, patchLocal, t])

  // Publishing is irreversible and hash-anchored → confirm with readiness first.
  const handlePublish = useCallback(async () => {
    if (!hasPermission(permissions, 'reports.publish') || !reportingYearId) return
    const ok = await confirm({
      title: t('disclosureEditor.publish.title', { framework: framework?.code ?? frameworkId, year: reportingYear }),
      description: (
        <div className="space-y-2">
          <p>{t('disclosureEditor.publish.body')}</p>
          <ul className="text-small space-y-1">
            <li>{t('disclosureEditor.publish.ready', { done: completedCells, total: totalCells })}</li>
            <li>{t('disclosureEditor.publish.approved', { count: breakdown.approved })}</li>
            <li>{t('disclosureEditor.publish.inReview', { count: breakdown.inReview })}</li>
          </ul>
        </div>
      ),
      confirmLabel: t('disclosureEditor.progress.publishReport'),
      tone: 'default',
    })
    if (!ok) return
    setPublishing(true)
    try {
      await nexus.publish(reportingYearId)
      notify.success(t('disclosureEditor.publish.done'))
      navigate('/reports')
    } catch (e) {
      notify.error(t('disclosureEditor.publish.failed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setPublishing(false)
    }
  }, [permissions, reportingYearId, confirm, t, framework?.code, frameworkId, reportingYear, completedCells, totalCells, breakdown, navigate])

  const summary = useMemo<RailSectionSummary | null>(() => {
    if (state.kind !== 'ready') return null
    // Follows the tree: one subsection when picked, otherwise the whole framework.
    const sid = activeSubsectionId
    const inSub = sid ? state.items.filter(i => `${i.section}::${i.subsection}` === sid) : state.items
    if (inSub.length === 0) return null
    const s: RailSectionSummary = {
      scope: sid ? 'subsection' : 'framework',
      section: sid ? inSub[0].section : '', subsection: sid ? inSub[0].subsection : '', total: inSub.length,
      approved: 0, inReview: 0, drafted: 0, notStarted: 0, owners: [], nextOpenId: null,
    }
    const owners = new Set<string>()
    for (const it of inSub) {
      const a = assignmentByItem.get(it.id)
      if (a?.assigneeName) owners.add(a.assigneeName)
      const st = a?.status ?? 'not_started'
      if (st === 'approved') s.approved += 1
      else if (st === 'submitted' || st === 'reviewed') s.inReview += 1
      else if (st === 'in_progress' || st === 'rejected') s.drafted += 1
      else s.notStarted += 1
      if (!s.nextOpenId && (a?.value == null) && !DONE.includes(st)) s.nextOpenId = it.id
    }
    s.owners = Array.from(owners)
    return s
  }, [state, activeSubsectionId, assignmentByItem])

  const openCell = useCallback((id: string) => {
    setActiveCellId(id)
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-cell-input="${CSS.escape(id)}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
    })
  }, [])

  // ── Render ──────────────────────────────────────────────────────────
  if (!framework) {
    return (
      <EmptyState
        variant="error"
        title={t('disclosureEditor.page.notFound')}
        body={t('disclosureEditor.page.noMatch', { id: frameworkId })}
        cta={{ label: t('disclosureEditor.page.backToTemplates'), onClick: () => navigate('/reports/templates') }}
      />
    )
  }

  const frameworkName = (i18n.language?.startsWith('zh') && (framework as { nameZh?: string }).nameZh) || framework.name

  if (state.kind !== 'ready') {
    return (
      <div className="flex flex-col h-[calc(100vh-68px)] -mx-4 -my-5 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-7">
        <StateBoundary
          loading={state.kind === 'loading'}
          error={state.kind === 'error' ? state.error : null}
          onRetry={() => void load()}
          errorState={{ title: t('disclosureEditor.page.unableToLoad') }}
          empty={state.kind === 'empty'}
          emptyState={{
            title: t('disclosureEditor.page.emptyTitle'),
            body: t('disclosureEditor.page.emptyBody', { code: framework.code }),
            cta: { label: t('disclosureEditor.page.backToTemplates'), onClick: () => navigate('/reports/templates') },
          }}
          skeleton={<EditorSkeleton />}
        >
          {null}
        </StateBoundary>
      </div>
    )
  }

  const activeItem = activeCellId ? state.items.find(i => i.id === activeCellId) ?? null : null
  const activeAssignment = activeCellId ? assignmentByItem.get(activeCellId) ?? null : null
  const canEdit = hasPermission(permissions, 'data.upload') && !!user

  const treeProps = { subsections, activeSubsectionId, onSelect: handleTreeSelect, readingMode }
  const documentProps = {
    subsectionId: activeSubsectionId,
    items: state.items,
    cellState,
    activeCellId,
    onActiveCellChange: setActiveCellId,
    onSave: handleSave,
    readingMode,
    canEdit,
    registerSectionAnchor,
    linkedPeersByItem,
  }
  const railProps = {
    item: activeItem,
    assignment: activeAssignment,
    onWorkflowAction: handleWorkflowAction,
    workflowBusy,
    frameworkId,
    reportingYear,
    items: state.items,
    onOpenCell: openCell,
    onAssignmentChange: handleAssignmentChange,
    readingMode,
    summary,
  }

  const editorContent = (
    <div className="flex flex-col h-[calc(100vh-68px)] -mx-4 -my-5 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-7">
      <DisclosureProgressBar
        frameworkName={frameworkName}
        frameworkCode={framework.code}
        reportingYear={reportingYear}
        workflowStatus={workflowStatus}
        completedCells={completedCells}
        totalCells={totalCells}
        breakdown={breakdown}
        readingMode={readingMode}
        onToggleReadingMode={() => setReadingMode(m => !m)}
        onPublish={() => void handlePublish()}
        publishing={publishing}
        saveState={editorSave.state}
        savedAt={editorSave.at}
        canPublishYear={!!reportingYearId}
      />

      {activeYear.kind === 'none' && (
        <div className="surface-paper mx-4 mt-3 sm:mx-6">
          <EmptyState
            density="compact"
            icon={CalendarClock}
            title={t('reportingYear.none.title')}
            body={t('reportingYear.none.inlineBody')}
            cta={{ label: t('reportingYear.none.cta'), onClick: () => navigate('/admin/periods') }}
            secondaryCta={{ label: t('reportingYear.none.retry'), onClick: activeYear.reload }}
          />
        </div>
      )}

      {isBelowLg ? (
        <MobileEditorShell treeProps={treeProps} documentProps={documentProps} railProps={railProps} showDetails={!readingMode} />
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <DisclosureTree {...treeProps} />
          <DisclosureDocument {...documentProps} />
          {!readingMode && <DisclosureCellRail {...railProps} />}
        </div>
      )}
    </div>
  )

  // Liveblocks room (org-scoped id). <CollabBoundary> keeps the editor working
  // if the realtime layer throws.
  const orgId = user?.tenantId ?? 'anon'
  const roomId = roomIdFor(frameworkId, orgId)
  return (
    <CollabBoundary fallback={editorContent}>
      <RoomProvider
        id={roomId}
        initialPresence={{
          userId: user?.id ?? null,
          name: user?.name ?? user?.email ?? t('disclosureEditor.page.unknownUser'),
          email: user?.email ?? '',
          color: '',
          activeCellId: activeCellId,
          selectionAt: Date.now(),
        }}
      >
        {editorContent}
      </RoomProvider>
    </CollabBoundary>
  )
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col h-full" aria-hidden>
      <div className="px-6 py-3 border-b border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center gap-3"><Skeleton className="h-6 w-12" /><Skeleton className="h-5 w-56" /><div className="flex-1" /><Skeleton className="h-9 w-32" /></div>
        <Skeleton className="h-1.5 w-full" />
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="hidden lg:block w-[264px] border-r border-[var(--border-subtle)] p-3 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
        <div className="flex-1 p-10 space-y-6 max-w-[820px] mx-auto">
          <Skeleton className="h-7 w-1/3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-11 w-52" /></div>
          ))}
        </div>
        <div className="hidden xl:block w-[380px] border-l border-[var(--border-subtle)] p-5 space-y-3">
          <Skeleton className="h-5 w-1/2" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}

/**
 * Error boundary scoped to the realtime-collab layer: if Liveblocks throws,
 * render the non-collab editor instead.
 */
class CollabBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: Error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[disclosure-editor] realtime collab disabled:', err.message)
    }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Stable short code per subsection (disclosure code when available). */
function deriveSubsectionCode(item: NexusQuestionnaireItem): string {
  if (item.gri_code) return item.gri_code.split(/[-–]/)[0] + (item.gri_code.includes('-') ? '-' + item.gri_code.split('-').slice(1).join('-') : '')
  return item.subsection.slice(0, 6).toUpperCase()
}
