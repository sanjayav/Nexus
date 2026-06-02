import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
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
import DisclosureCellRail from '../components/disclosure-editor/DisclosureCellRail'

const ACTIVE_REPORTING_YEAR_ID = '11000000-0000-0000-0000-000000000026'
const ACTIVE_YEAR = 2026

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; error: string }
  | { kind: 'empty' }
  | { kind: 'ready'; items: NexusQuestionnaireItem[]; assignments: QuestionAssignment[] }

/**
 * Workiva-style document-centric disclosure editor.
 *
 * Three panes:
 *   • Left  — subsection tree, scroll/filter, status icons + completion counts.
 *   • Mid   — typeset document with inline-editable cells (autosave on blur).
 *   • Right — selected-cell drilldown: status, metadata, linked data, evidence,
 *             comments, audit trail.
 *
 * URL parameters:
 *   • `:frameworkId`  — path param, selects which framework is being edited.
 *   • `?cell=<id>`    — query string syncing the focussed cell, enabling
 *                       deep links straight to a specific disclosure.
 */
export default function DisclosureEditor() {
  const { frameworkId = 'gri' } = useParams<{ frameworkId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, permissions } = useAuth()

  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [readingMode, setReadingMode] = useState(false)
  const [linkedPeersByItem, setLinkedPeersByItem] = useState<Record<string, ConceptPeer[]>>({})
  const [activeCellId, setActiveCellId] = useState<string | null>(searchParams.get('cell'))
  const [activeSubsectionId, setActiveSubsectionId] = useState<string | null>(null)
  const [cellSaveStates, setCellSaveStates] = useState<Record<string, DisclosureDocumentCellState>>({})
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
      setState({ kind: 'error', error: e instanceof Error ? e.message : 'Failed to load framework' })
    }
  }, [frameworkId])

  useEffect(() => { void load() }, [load])

  // Bulk-fetch per-cell linked peers so the inline "🔗 N" badge can render
  // without N round-trips. Best-effort — failures degrade silently.
  useEffect(() => {
    if (state.kind !== 'ready') return
    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        state.items.map(async it => {
          try {
            const res = await conceptMappings.forQuestion(it.id)
            const peers = res.mappings.filter(p => p.questionnaire_item_id !== it.id)
            return [it.id, peers] as const
          } catch {
            return [it.id, [] as ConceptPeer[]] as const
          }
        }),
      )
      if (cancelled) return
      setLinkedPeersByItem(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [state])

  // Build assignment lookup by questionnaire item id.
  const assignmentByItem = useMemo(() => {
    if (state.kind !== 'ready') return new Map<string, QuestionAssignment>()
    const m = new Map<string, QuestionAssignment>()
    // Latest wins — assignment updates carry last_updated.
    for (const a of state.assignments) {
      const existing = m.get(a.questionId)
      if (!existing || (a.last_updated && existing.last_updated && a.last_updated > existing.last_updated)) {
        m.set(a.questionId, a)
      } else if (!existing) {
        m.set(a.questionId, a)
      }
    }
    return m
  }, [state])

  // Per-cell render state for the document.
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

  // Aggregate subsection list for the tree.
  const subsections = useMemo<DisclosureTreeSubsection[]>(() => {
    if (state.kind !== 'ready') return []
    const map = new Map<string, DisclosureTreeSubsection>()
    for (const item of state.items) {
      const id = `${item.section}::${item.subsection}`
      const existing = map.get(id) ?? {
        id,
        section: item.section,
        label: item.subsection,
        code: deriveSubsectionCode(item),
        total: 0,
        completed: 0,
      }
      existing.total += 1
      const a = assignmentByItem.get(item.id)
      if (a && (a.status === 'approved' || a.status === 'reviewed' || a.status === 'submitted')) {
        existing.completed += 1
      }
      map.set(id, existing)
    }
    return Array.from(map.values())
  }, [state, assignmentByItem])

  const { completedCells, totalCells } = useMemo(() => {
    let c = 0, t = 0
    for (const s of subsections) { c += s.completed; t += s.total }
    return { completedCells: c, totalCells: t }
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

  // When the active cell changes, ensure the matching subsection is the active one in the tree.
  useEffect(() => {
    if (state.kind !== 'ready' || !activeCellId) return
    const item = state.items.find(i => i.id === activeCellId)
    if (item) setActiveSubsectionId(`${item.section}::${item.subsection}`)
  }, [activeCellId, state])

  const handleTreeSelect = useCallback((id: string) => {
    setActiveSubsectionId(id)
    // Scroll the section into view.
    const el = sectionAnchorsRef.current.get(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const registerSectionAnchor = useCallback((id: string, el: HTMLElement | null) => {
    sectionAnchorsRef.current.set(id, el)
  }, [])

  const setCellSave = useCallback((id: string, next: DisclosureDocumentCellState) => {
    setCellSaveStates(prev => ({ ...prev, [id]: next }))
  }, [])

  // Autosave handler: updates assignment (if any) + mirrors to data_value.
  const handleSave = useCallback(async (item: NexusQuestionnaireItem, newValue: number | null) => {
    const assignment = assignmentByItem.get(item.id) ?? null
    setCellSave(item.id, { assignment, saveState: 'saving', errorMessage: null })
    try {
      if (assignment) {
        await orgStore.updateAssignment(assignment.id, {
          value: newValue,
          status: assignment.status === 'not_started' ? 'in_progress' : assignment.status,
        })
      }
      if (newValue != null) {
        try {
          await nexus.enterValue({
            question_id: item.id,
            reporting_year_id: ACTIVE_REPORTING_YEAR_ID,
            value: newValue,
            unit: item.unit ?? undefined,
            mode: 'Manual',
          })
        } catch (e) {
          // Non-fatal — assignment is the user-facing record. Keep saved state.
          console.warn('[disclosure-editor] enterValue mirror failed', e)
        }
      }
      // Optimistically patch local state.
      setState(prev => {
        if (prev.kind !== 'ready') return prev
        return {
          ...prev,
          assignments: prev.assignments.map(a =>
            a.questionId === item.id
              ? { ...a, value: newValue, status: a.status === 'not_started' ? 'in_progress' : a.status, last_updated: new Date().toISOString() }
              : a,
          ),
        }
      })
      const refreshed = assignmentByItem.get(item.id) ?? null
      setCellSave(item.id, { assignment: refreshed, saveState: 'saved', errorMessage: null })
      window.setTimeout(() => {
        setCellSaveStates(prev => {
          const cur = prev[item.id]
          if (cur?.saveState === 'saved') {
            const next = { ...prev }
            next[item.id] = { ...cur, saveState: 'idle' }
            return next
          }
          return prev
        })
      }, 2000)
    } catch (e) {
      setCellSave(item.id, {
        assignment,
        saveState: 'error',
        errorMessage: e instanceof Error ? e.message : 'Save failed',
      })
    }
  }, [assignmentByItem, setCellSave])

  // Selected-cell workflow transitions.
  const handleWorkflowAction = useCallback(async (action: 'submit' | 'approve' | 'reject') => {
    if (!activeCellId) return
    const assignment = assignmentByItem.get(activeCellId)
    if (!assignment) return
    setWorkflowBusy(true)
    try {
      const nextStatus: QuestionAssignment['status'] =
        action === 'submit' ? 'submitted' :
        action === 'approve' ? 'approved' :
        'rejected'
      await orgStore.updateAssignment(assignment.id, { status: nextStatus })
      // Mirror into workflow data_value (best-effort).
      try {
        if (action === 'submit')      await nexus.submit(assignment.id)
        else if (action === 'approve') await nexus.approve(assignment.id, 'approve')
        else                          await nexus.approve(assignment.id, 'reject')
      } catch { /* swallow — assignment.status is the source of truth for UI */ }
      setState(prev => {
        if (prev.kind !== 'ready') return prev
        return {
          ...prev,
          assignments: prev.assignments.map(a =>
            a.id === assignment.id ? { ...a, status: nextStatus, last_updated: new Date().toISOString() } : a,
          ),
        }
      })
    } catch (e) {
      console.warn('[disclosure-editor] workflow transition failed', e)
    } finally {
      setWorkflowBusy(false)
    }
  }, [activeCellId, assignmentByItem])

  const handlePublish = useCallback(async () => {
    if (!hasPermission(permissions, 'reports.publish')) return
    setPublishing(true)
    try {
      await nexus.publish(ACTIVE_REPORTING_YEAR_ID)
      navigate('/reports')
    } catch (e) {
      console.warn('[disclosure-editor] publish failed', e)
    } finally {
      setPublishing(false)
    }
  }, [permissions, navigate])

  // ── Render ──────────────────────────────────────────────────
  if (!framework) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]">
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Framework not found</h3>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">No framework matches “{frameworkId}”.</p>
        <button onClick={() => navigate('/reports/templates')} className="mt-3 inline-flex items-center gap-1 text-[var(--text-sm)] font-medium text-[var(--color-brand)] hover:underline">
          <ArrowLeft className="w-3 h-3" /> Back to templates
        </button>
      </div>
    )
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" />
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Unable to load disclosures</h3>
            <p className="text-[var(--text-sm)] text-[var(--text-secondary)] font-mono mt-1">{state.error}</p>
            <button onClick={() => void load()} className="mt-3 text-[var(--text-sm)] font-medium text-[var(--color-brand)] hover:underline">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  if (state.kind === 'empty') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] text-center">
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">No disclosures yet</h3>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
          The questionnaire for {framework.code} is empty. Run the seed to populate it.
        </p>
      </div>
    )
  }

  const activeItem = activeCellId ? state.items.find(i => i.id === activeCellId) ?? null : null
  const activeAssignment = activeCellId ? assignmentByItem.get(activeCellId) ?? null : null
  const canEdit = hasPermission(permissions, 'data.upload') && !!user

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] -mx-6 -my-6">
      <DisclosureProgressBar
        frameworkName={framework.name}
        frameworkCode={framework.code}
        reportingYear={ACTIVE_YEAR}
        workflowStatus={workflowStatus}
        completedCells={completedCells}
        totalCells={totalCells}
        readingMode={readingMode}
        onToggleReadingMode={() => setReadingMode(m => !m)}
        onPublish={() => void handlePublish()}
        publishing={publishing}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <DisclosureTree
          subsections={subsections}
          activeSubsectionId={activeSubsectionId}
          onSelect={handleTreeSelect}
          readingMode={readingMode}
        />

        <DisclosureDocument
          subsectionId={activeSubsectionId}
          items={state.items}
          cellState={cellState}
          activeCellId={activeCellId}
          onActiveCellChange={setActiveCellId}
          onSave={handleSave}
          readingMode={readingMode}
          canEdit={canEdit}
          registerSectionAnchor={registerSectionAnchor}
          linkedPeersByItem={linkedPeersByItem}
        />

        {!readingMode && (
          <DisclosureCellRail
            item={activeItem}
            assignment={activeAssignment}
            onWorkflowAction={handleWorkflowAction}
            workflowBusy={workflowBusy}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Pick a stable short code per subsection — prefers the GRI / disclosure code
 * when every item under the subsection shares one, otherwise falls back to a
 * truncated subsection slug.
 */
function deriveSubsectionCode(item: NexusQuestionnaireItem): string {
  if (item.gri_code) return item.gri_code.split(/[-–]/)[0] + (item.gri_code.includes('-') ? '-' + item.gri_code.split('-').slice(1).join('-') : '')
  return item.subsection.slice(0, 6).toUpperCase()
}
