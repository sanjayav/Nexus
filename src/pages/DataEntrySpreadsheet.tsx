import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { itemLabel } from '../lib/itemLabel'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Search, Download, Send, ShieldCheck, AlertTriangle, X, CalendarClock,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { orgStore, type QuestionAssignment, type OrgEntity } from '../lib/orgStore'
import { useFramework, getFramework, getActiveFrameworks } from '../lib/frameworks'
import { nexus } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import { StateBoundary, EmptyState, StatusPill as Pill, toneForStatus, notify } from '../components/ui'
import { SkeletonTable } from '../components/Skeleton'
import SaveStatus from '../components/entry/SaveStatus'
import { parseNumeric } from '../components/entry/persist'
import { useActiveReportingYear, fetchActiveReportingYear } from '../lib/activeReportingYear'
import {
  asNumber,
  isFormula,
  cellLabel,
  stampToday,
  VALUE_COL_INDEX,
  type FormulaEngine,
  type CellResult,
  type AssignmentRow,
} from '../lib/formulas'
import { FormulaBar } from '../components/spreadsheet/FormulaBar'
import { CellReference, type CellSaveState } from '../components/spreadsheet/CellReference'

// ═══════════════════════════════════════════════════════════════════
// Spreadsheet-style bulk data entry.
//
// Workiva pattern: a grid where every numeric value, status, and assignee is
// directly editable. Tab moves right, Enter moves down, Esc cancels. Autosave
// on blur. Status pills click → workflow actions. Multi-select rows + bulk
// submit / approve / export.
//
// This page is purely additive — the legacy DataEntry.tsx still handles
// single-cell deep-edit (notes, evidence uploads, audit history).
// ═══════════════════════════════════════════════════════════════════

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type StatusKey = QuestionAssignment['status']

interface RowSaveState {
  state: SaveState
  error: string | null
  /** When state='saved', timer that flips back to 'idle' after 2s. */
  timeoutId?: ReturnType<typeof setTimeout>
}

/** i18n keys for each status — render with `t(STATUS_LABEL[s])`. */
const STATUS_LABEL: Record<StatusKey, string> = {
  not_started: 'workflowStatus.status.not_started',
  in_progress: 'workflowStatus.status.in_progress',
  submitted: 'workflowStatus.status.submitted',
  reviewed: 'workflowStatus.status.reviewed',
  approved: 'workflowStatus.status.approved',
  rejected: 'workflowStatus.status.rejected',
}

/** Pre-canned formula recipes for the Help popover. `description` is an i18n key. */
const FORMULA_EXAMPLES: Array<{ formula: string; description: string }> = [
  { formula: '=SUM(D2:D5)',               description: 'dataEntry.sheet.examples.sum' },
  { formula: '=AVERAGE(D2:D10)',          description: 'dataEntry.sheet.examples.average' },
  { formula: '=COUNTIF(E2:E50, "approved")', description: 'dataEntry.sheet.examples.countif' },
  { formula: '=SUMIF(A2:A50, "GRI 305-1", D2:D50)', description: 'dataEntry.sheet.examples.sumif' },
  { formula: '=D5/D10*100',               description: 'dataEntry.sheet.examples.percentage' },
  { formula: '=IF(D5>1000, "high", "ok")', description: 'dataEntry.sheet.examples.if' },
  { formula: '=ROUND(D5*0.4044, 2)',      description: 'dataEntry.sheet.examples.round' },
  { formula: "='gri'!D5",                 description: 'dataEntry.sheet.examples.crossRef' },
  { formula: '=TODAY()',                  description: 'dataEntry.sheet.examples.today' },
]

export default function DataEntrySpreadsheet() {
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  // The org's own open reporting year. The data_value mirror below writes
  // into it; with no open year the mirror is skipped (assignment edits still
  // save) and a notice points to Reporting cycles.
  const activeYear = useActiveReportingYear()

  const [assignments, setAssignments] = useState<QuestionAssignment[]>([])
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | StatusKey>('all')
  const [frameworkFilter, setFrameworkFilter] = useState<string>(framework.id)
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Per-row save state map.
  const [rowSaves, setRowSaves] = useState<Map<string, RowSaveState>>(new Map())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [loadWarning, setLoadWarning] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const hasRowsRef = useRef(false)
  hasRowsRef.current = assignments.length > 0

  // ── Formula support ────────────────────────────────────────────────
  // Active formula-bar cell (assignment.id). null when nothing selected.
  const [activeCellId, setActiveCellId] = useState<string | null>(null)
  // Help popover.
  const [showFormulaHelp, setShowFormulaHelp] = useState(false)
  // The engine is loaded lazily (HyperFormula is ~400KB) and kept in a ref so
  // mutations don't trigger renders. The bump counter below forces a re-render
  // when computed values change.
  const engineRef = useRef<FormulaEngine | null>(null)
  const [engineReady, setEngineReady] = useState(false)
  const [, setEngineTick] = useState(0)
  const bumpEngine = useCallback(() => setEngineTick(t => (t + 1) % 1_000_000), [])

  const refresh = useCallback(async () => {
    if (!user?.email) return
    try {
      const [rows, ents] = await Promise.all([
        orgStore.myAssignments(),
        orgStore.listEntities(),
      ])
      setAssignments(rows)
      setEntities(ents)
      setLoadWarning(null)
    } catch (e) {
      // Don't blank the grid — surface a banner so the user understands why
      // the rows they were editing aren't visible. Toast fires once per load
      // so background refreshes don't spam.
      const msg = e instanceof Error ? e.message : t('dataEntry.sheet.loadFailed')
      console.warn('[spreadsheet] refresh failed', e)
      // With nothing on screen the page shows a full error state instead.
      if (loadWarning !== msg && hasRowsRef.current) {
        notify.warning(t('dataEntry.sheet.loadFailedToast'))
      }
      setLoadWarning(msg)
    }
  // `loadWarning` is read only to dedupe the toast — including it in deps
  // would cause re-binding on every error message change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email])

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [refresh])

  useEffect(() => { setFrameworkFilter(framework.id) }, [framework.id])

  const entityById = useMemo(() => new Map(entities.map(e => [e.id, e])), [entities])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return assignments.filter(a => {
      if (frameworkFilter !== 'all' && a.framework_id !== frameworkFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (entityFilter !== 'all' && a.entityId !== entityFilter) return false
      if (q && !a.line_item.toLowerCase().includes(q) && !itemLabel(a, i18n.language).toLowerCase().includes(q) && !a.gri_code.toLowerCase().includes(q)) return false
      return true
    })
  }, [assignments, search, statusFilter, frameworkFilter, entityFilter, i18n.language])

  // ── Formula engine lifecycle ──────────────────────────────────────
  //
  // HyperFormula is lazy-loaded on first render so it doesn't bloat the main
  // chunk. The engine instance is recreated whenever the filtered row order
  // changes — row indices into the engine's `Disclosures` sheet must stay in
  // sync with the visible rows so users can write A1-style references that
  // mean what they see.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const mod = await import('../lib/formulas')
      if (cancelled) return
      const fresh: FormulaEngine = mod.createEngine()
      const seed: AssignmentRow[] = filtered.map(a => ({
        id: a.id,
        code: a.gri_code,
        lineItem: a.line_item,
        unit: a.unit ?? null,
        value: a.value ?? null,
        status: a.status,
        assignee: a.assigneeName,
        formula: a.formula ?? null,
      }))
      mod.loadAssignmentsToEngine(fresh, seed)
      // Replace any prior engine — earlier instances might still be in flight
      // if the async boot raced a filter change.
      engineRef.current?.destroy()
      engineRef.current = fresh
      setEngineReady(true)
      bumpEngine()
    })()
    return () => {
      cancelled = true
      engineRef.current?.destroy()
      engineRef.current = null
      setEngineReady(false)
    }
    // The seed depends on row identity, value, and formula text. We deliberately
    // exclude `bumpEngine` (stable) and avoid a deep filtered dep to keep the
    // engine from rebuilding on every keystroke save round-trip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length, filtered.map(a => `${a.id}:${a.value ?? ''}:${a.formula ?? ''}`).join('|')])

  // Cell-index for a given assignment id (engine row, value column).
  const rowIndexOf = useCallback((assignmentId: string): number => {
    return filtered.findIndex(a => a.id === assignmentId)
  }, [filtered])

  // Get the current computed cell result + raw text for a row.
  const cellStateOf = useCallback((assignmentId: string): { raw: string; computed: CellResult } => {
    const a = assignments.find(x => x.id === assignmentId)
    const formula = a?.formula ?? null
    const value = a?.value ?? null
    const raw = formula ?? (value !== null ? String(value) : '')
    const engine = engineRef.current
    const row = rowIndexOf(assignmentId)
    if (!engine || row < 0 || !engineReady) {
      // Without the engine, fall back to the persisted numeric value.
      return { raw, computed: value }
    }
    return { raw, computed: engine.getCellValue('Disclosures', row, VALUE_COL_INDEX) }
  }, [assignments, rowIndexOf, engineReady])

  // Persist a single cell change to the assignment + (when applicable) push to
  // the workflow data_value via nexus.enterValue. Updates UI optimistically.
  //
  // Two input shapes:
  //   - plain number → { value, formula: null }
  //   - `=...` text  → { value: computed, formula: stampedFormula }
  // The server stores both columns; reports always read `value`.
  const saveCell = useCallback(async (
    a: QuestionAssignment,
    input: { value: number | null; formula: string | null },
  ) => {
    setRowSaves(prev => {
      const m = new Map(prev)
      const existing = m.get(a.id)
      if (existing?.timeoutId) clearTimeout(existing.timeoutId)
      m.set(a.id, { state: 'saving', error: null })
      return m
    })

    try {
      // Update the assignment record (the canonical user-facing source of value).
      await orgStore.updateAssignment(a.id, {
        value: input.value,
        formula: input.formula,
        status: a.status === 'not_started' ? 'in_progress' : a.status,
      })
      // Mirror into data_value so the workflow + reports pipeline see it.
      // Failures here are non-fatal: the assignment is the user-facing record.
      // Awaiting the (cached) lookup avoids racing the hook on first edit.
      const year = input.value !== null ? await fetchActiveReportingYear() : null
      const reportingYearId = year?.kind === 'ready' ? year.year.id : null
      if (input.value !== null && reportingYearId) {
        try {
          await nexus.enterValue({
            question_id: a.questionId,
            reporting_year_id: reportingYearId,
            value: input.value,
            unit: a.unit ?? undefined,
            mode: 'Manual',
            formula: input.formula,
          })
        } catch (e) {
          console.warn('[spreadsheet] enterValue mirror failed', e)
        }
      }

      setAssignments(prev => prev.map(p => p.id === a.id
        ? {
            ...p,
            value: input.value,
            formula: input.formula,
            status: p.status === 'not_started' ? 'in_progress' : p.status,
            last_updated: new Date().toISOString(),
          }
        : p))

      setRowSaves(prev => {
        const m = new Map(prev)
        const id = setTimeout(() => {
          setRowSaves(p2 => {
            const n = new Map(p2)
            const cur = n.get(a.id)
            if (cur?.state === 'saved') n.delete(a.id)
            return n
          })
        }, 2000)
        m.set(a.id, { state: 'saved', error: null, timeoutId: id })
        return m
      })
      setLastSavedAt(Date.now())
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('dataEntry.entry.saveFailed')
      setRowSaves(prev => {
        const m = new Map(prev)
        m.set(a.id, { state: 'error', error: msg })
        return m
      })
    }
  }, [t])

  // Parse the user's raw input (formula or number) and dispatch to saveCell.
  // Called from both the in-cell editor and the formula bar.
  const commitCellRaw = useCallback((a: QuestionAssignment, rawText: string) => {
    const trimmed = rawText.trim()
    if (trimmed === '') {
      // Clear out both value and formula.
      saveCell(a, { value: null, formula: null })
      return
    }
    if (isFormula(trimmed)) {
      // Stamp TODAY() to today's date so a stale tab tomorrow doesn't shift.
      const stamped = stampToday(trimmed)
      const row = rowIndexOf(a.id)
      const engine = engineRef.current
      if (engine && row >= 0) {
        engine.setCell('Disclosures', row, VALUE_COL_INDEX, stamped)
        bumpEngine()
        const computed = engine.getCellValue('Disclosures', row, VALUE_COL_INDEX)
        const numeric = asNumber(computed)
        // A formula that evaluates to an error keeps the prior numeric value
        // null but still persists the formula text so the user can fix it.
        saveCell(a, { value: numeric, formula: stamped })
      } else {
        // Engine not ready yet — store the formula text without a computed
        // value; the next engine bootstrap will rehydrate it.
        saveCell(a, { value: null, formula: stamped })
      }
      return
    }
    const parsed = parseNumeric(trimmed)
    if (!parsed.ok) {
      // Not a number and not a formula — flag the cell instead of dropping it silently.
      setRowSaves(prev => { const m = new Map(prev); m.set(a.id, { state: 'error', error: t('dataEntry.sheet.notANumber', { text: trimmed }) }); return m })
      return
    }
    saveCell(a, { value: parsed.value, formula: null })
  }, [saveCell, rowIndexOf, bumpEngine, t])

  const transitionStatus = useCallback(async (a: QuestionAssignment, next: StatusKey) => {
    setRowSaves(prev => {
      const m = new Map(prev)
      m.set(a.id, { state: 'saving', error: null })
      return m
    })
    try {
      await orgStore.updateAssignment(a.id, { status: next })
      setAssignments(prev => prev.map(p => p.id === a.id ? { ...p, status: next } : p))
      setRowSaves(prev => {
        const m = new Map(prev)
        const id = setTimeout(() => {
          setRowSaves(p2 => { const n = new Map(p2); n.delete(a.id); return n })
        }, 2000)
        m.set(a.id, { state: 'saved', error: null, timeoutId: id })
        return m
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('dataEntry.entry.saveFailed')
      setRowSaves(prev => { const m = new Map(prev); m.set(a.id, { state: 'error', error: msg }); return m })
    }
  }, [t])

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected(s => {
      const n = new Set(s)
      if (checked) n.add(id); else n.delete(id)
      return n
    })
  }

  const selectAllVisible = (checked: boolean) => {
    if (!checked) { setSelected(new Set()); return }
    setSelected(new Set(filtered.map(a => a.id)))
  }

  // Build columns. Using `any` for the value-generic — @tanstack/react-table's
  // column-def type is invariant on the value, so a mixed-accessor array of
  // strongly-typed columns can't be inferred as ColumnDef<Row, unknown>[].
  const helper = createColumnHelper<QuestionAssignment>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<QuestionAssignment, any>[]>(() => [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          aria-label={t('dataEntry.sheet.selectAll')}
          onChange={e => selectAllVisible(e.target.checked)}
          checked={filtered.length > 0 && filtered.every(a => selected.has(a.id))}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={t('dataEntry.sheet.selectRow', { code: row.original.gri_code })}
          checked={selected.has(row.original.id)}
          onChange={e => toggleSelect(row.original.id, e.target.checked)}
        />
      ),
      size: 40,
    },
    helper.accessor('gri_code', {
      header: t('dataEntry.sheet.col.code'),
      cell: info => (
        <span className="font-mono text-caption text-[var(--text-secondary)] whitespace-nowrap">{info.getValue()}</span>
      ),
      size: 110,
    }),
    helper.accessor('line_item', {
      header: t('dataEntry.sheet.col.disclosure'),
      cell: info => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-small text-[var(--text-primary)]">{itemLabel(info.row.original, i18n.language) || info.getValue()}</span>
          {/* Linked-data indicator — appears when the assignment is linked
              via concept_mappings. The flag is populated lazily, see effect below. */}
          {info.row.original.is_overdue ? (
            <Pill status="overdue" size="sm" />
          ) : null}
        </div>
      ),
      size: 300,
    }),
    helper.accessor('unit', {
      header: t('dataEntry.entry.unit'),
      cell: info => <span className="text-caption text-[var(--text-tertiary)] whitespace-nowrap">{info.getValue() ?? '—'}</span>,
      size: 80,
    }),
    helper.accessor('value', {
      header: t('dataEntry.sheet.col.value'),
      cell: info => {
        const a = info.row.original
        const { raw, computed } = cellStateOf(a.id)
        const rs = rowSaves.get(a.id)
        const saveState: CellSaveState = !rs
          ? { state: 'idle' }
          : rs.state === 'error'
            ? { state: 'error', message: rs.error ?? t('dataEntry.entry.saveFailed') }
            : rs.state === 'saved'
              ? { state: 'saved' }
              : rs.state === 'saving'
                ? { state: 'saving' }
                : { state: 'idle' }
        return (
          <CellReference
            rawText={raw}
            computed={computed}
            isActive={activeCellId === a.id}
            saveState={saveState}
            onActivate={() => setActiveCellId(a.id)}
            onCommit={text => commitCellRaw(a, text)}
            dataCell="value"
          />
        )
      },
      size: 180,
    }),
    helper.accessor('status', {
      header: t('common.status'),
      cell: info => (
        <StatusPill
          assignment={info.row.original}
          onTransition={transitionStatus}
        />
      ),
      size: 130,
    }),
    {
      id: 'assignee',
      header: t('dataEntry.sheet.col.assignee'),
      cell: ({ row }) => (
        <div className="flex flex-col min-w-0">
          <span className="text-small text-[var(--text-primary)] truncate">{row.original.assigneeName || '—'}</span>
          <span className="text-caption text-[var(--text-tertiary)] truncate">{entityById.get(row.original.entityId)?.name ?? ''}</span>
        </div>
      ),
      size: 180,
    },
    helper.accessor('last_updated', {
      header: t('dataEntry.sheet.col.updated'),
      cell: info => {
        const ts = info.getValue()
        if (!ts) return <span className="text-caption text-[var(--text-tertiary)]">—</span>
        const d = new Date(ts)
        return <span className="text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">{d.toLocaleDateString(i18n.language?.startsWith('zh') ? 'zh-CN' : undefined)}</span>
      },
      size: 90,
    }),
    {
      id: 'open',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => navigate(`/data/entry/${row.original.questionId}?assignment=${encodeURIComponent(row.original.id)}`)}
          className="h-8 px-2 rounded-[var(--radius-sm)] text-caption font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)] whitespace-nowrap"
        >
          {t('dataEntry.evidence.open')}
        </button>
      ),
      size: 60,
    },
  ], [filtered, selected, rowSaves, entityById, cellStateOf, commitCellRaw, activeCellId, transitionStatus, navigate, helper, t, i18n.language])

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Save indicator summary
  const savingCount = Array.from(rowSaves.values()).filter(v => v.state === 'saving').length
  const errorCount  = Array.from(rowSaves.values()).filter(v => v.state === 'error').length
  const sheetSaveState = savingCount > 0 ? 'saving' as const : errorCount > 0 ? 'error' as const : lastSavedAt ? 'saved' as const : 'idle' as const

  /** Bulk status move with an outcome toast (counts what actually moved). */
  const bulkMove = async (from: StatusKey[], to: StatusKey, okKey: string) => {
    if (selected.size === 0) return
    setBulkBusy(true)
    let moved = 0, failed = 0
    const total = selected.size
    try {
      for (const id of Array.from(selected)) {
        const a = assignments.find(x => x.id === id)
        if (!a || !from.includes(a.status)) continue
        try { await orgStore.updateAssignment(id, { status: to }); moved += 1 } catch { failed += 1 }
      }
      await refresh()
      setSelected(new Set())
      const skipped = total - moved - failed
      if (moved > 0) notify.success(t(okKey, { count: moved }), skipped > 0 ? { description: t('dataEntry.sheet.bulkSkipped', { count: skipped }) } : undefined)
      else if (failed === 0) notify.info(t('dataEntry.sheet.bulkNothing'))
      if (failed > 0) notify.error(t('dataEntry.sheet.bulkFailed', { count: failed }))
    } finally {
      setBulkBusy(false)
    }
  }
  const bulkSubmit = () => bulkMove(['in_progress', 'not_started'], 'submitted', 'dataEntry.sheet.bulkSubmitted')
  const bulkApprove = () => bulkMove(['submitted', 'reviewed'], 'approved', 'dataEntry.sheet.bulkApproved')

  const exportSelectedCsv = () => {
    const rows = filtered.filter(a => selected.has(a.id))
    if (rows.length === 0) return
    const header = ['gri_code', 'line_item', 'unit', 'value', 'status', 'assignee', 'entity', 'last_updated']
    // downloadCsv adds the UTF-8 BOM so Excel (incl. Chinese Windows) reads
    // Chinese line items correctly.
    downloadCsv(`data-entry-${Date.now()}.csv`, [
      header,
      ...rows.map(r => [
        r.gri_code, r.line_item, r.unit ?? '', r.value ?? '', r.status,
        r.assigneeName, entityById.get(r.entityId)?.name ?? '', r.last_updated ?? '',
      ]),
    ])
  }

  if (loading || (loadWarning && assignments.length === 0)) {
    return (
      <div className="space-y-4">
        <h1 className="type-h1 text-[var(--text-primary)]">{t('dataEntry.sheet.title')}</h1>
        <StateBoundary
          loading={loading}
          error={loadWarning}
          onRetry={() => { setLoading(true); void refresh().finally(() => setLoading(false)) }}
          errorState={{ title: t('dataEntry.sheet.loadFailed') }}
          skeleton={<SkeletonTable rows={8} cols={6} />}
        >
          {null}
        </StateBoundary>
      </div>
    )
  }

  const frameworks = [{ id: 'all', code: t('common.all') }, ...getActiveFrameworks().map(f => ({ id: f.id, code: f.code }))]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="type-h1 text-[var(--text-primary)]">{t('dataEntry.sheet.title')}</h1>
          <p className="text-small text-[var(--text-secondary)] mt-1 max-w-xl">
            {t('dataEntry.sheet.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SaveStatus state={sheetSaveState} savedAt={lastSavedAt} />
          {errorCount > 0 && <span className="text-caption text-[var(--status-danger)]">{t('dataEntry.sheet.unsaved', { count: errorCount })}</span>}
        </div>
      </div>

      {activeYear.kind === 'none' && (
        <div className="surface-paper">
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

      {/* Load-failure banner — grid still renders any rows that did make it
          into local state from a previous refresh, but the user needs to know
          they're potentially out of date. */}
      {loadWarning && (
        <div
          role="status"
          className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--status-warning-soft)] border border-[var(--status-warning-line)] text-[var(--text-primary)] text-small"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--status-warning)]" aria-hidden />
          <span className="flex-1">{t('dataEntry.sheet.loadBanner')} <span className="text-[var(--text-secondary)]">{loadWarning}</span></span>
          <button type="button" onClick={() => void refresh()} className="h-8 px-2 -my-1 rounded-[var(--radius-sm)] text-small font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)]">{t('dataEntry.picker.retry')}</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="surface-paper p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder={t('dataEntry.sheet.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t('dataEntry.sheet.search')}
            className="w-full pl-9 pr-3 h-10 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none"
          />
        </div>
        <select
          value={frameworkFilter}
          onChange={e => setFrameworkFilter(e.target.value)}
          className="h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small"
          aria-label={t('dataEntry.sheet.frameworkFilter')}
        >
          {frameworks.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}
        </select>
        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small"
          aria-label={t('dataEntry.sheet.entityFilter')}
        >
          <option value="all">{t('dataEntry.sheet.allEntities')}</option>
          {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | StatusKey)}
          className="h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small"
          aria-label={t('dataEntry.sheet.statusFilter')}
        >
          <option value="all">{t('dataEntry.sheet.allStatuses')}</option>
          {(Object.keys(STATUS_LABEL) as StatusKey[]).map(s => (
            <option key={s} value={s}>{t(STATUS_LABEL[s])}</option>
          ))}
        </select>
        <div className="ml-auto text-caption text-[var(--text-tertiary)] tabular-nums">
          {t('dataEntry.sheet.rowsSelected', { rows: filtered.length, selected: selected.size })}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="surface-paper p-3 flex items-center gap-2 flex-wrap">
          <span className="text-small font-semibold text-[var(--text-primary)] mr-2 tabular-nums">{t('dataEntry.sheet.nSelected', { count: selected.size })}</span>
          <button
            type="button"
            onClick={() => void bulkSubmit()}
            disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] text-small font-semibold disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" aria-hidden /> {t('dataEntry.sheet.submitSelected')}
          </button>
          <button
            type="button"
            onClick={() => void bulkApprove()}
            disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--color-brand)] text-small font-semibold disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-brand)]" aria-hidden /> {t('dataEntry.sheet.approveSelected')}
          </button>
          <button
            type="button"
            onClick={exportSelectedCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] text-small font-semibold"
          >
            <Download className="w-3.5 h-3.5" aria-hidden /> {t('dataEntry.sheet.exportCsv')}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-1 h-9 px-2 text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {t('dataEntry.sheet.clear')}
          </button>
        </div>
      )}

      {/* Formula bar — Excel-style. Shows the raw formula or value for the
          active cell; edits here commit the same way as in-cell edits. */}
      {(() => {
        const activeAssignment = activeCellId ? assignments.find(a => a.id === activeCellId) : null
        const row = activeAssignment ? rowIndexOf(activeAssignment.id) : -1
        const label = activeAssignment && row >= 0 ? cellLabel(VALUE_COL_INDEX, row) : ''
        const raw = activeAssignment ? cellStateOf(activeAssignment.id).raw : ''
        return (
          <FormulaBar
            activeCellLabel={label}
            activeFormula={raw}
            disabled={!activeAssignment}
            onCommit={text => {
              if (!activeAssignment) return
              commitCellRaw(activeAssignment, text)
            }}
            onCancel={() => setActiveCellId(null)}
            onShowHelp={() => setShowFormulaHelp(true)}
          />
        )
      })()}

      {/* Formula help popover — examples for users who haven't memorised
          HyperFormula's 380+ functions. Dismiss via the close button or Esc. */}
      {showFormulaHelp && (
        <div
          role="dialog"
          aria-label={t('dataEntry.sheet.formulaExamples')}
          className="surface-paper p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-small font-semibold text-[var(--text-primary)]">{t('dataEntry.sheet.formulaExamples')}</h2>
            <button
              type="button"
              onClick={() => setShowFormulaHelp(false)}
              aria-label={t('dataEntry.sheet.closeHelp')}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-caption">
            {FORMULA_EXAMPLES.map(ex => (
              <li key={ex.formula} className="flex flex-col">
                <code className="font-mono text-[var(--color-brand-strong)]">{ex.formula}</code>
                <span className="text-[var(--text-tertiary)]">{t(ex.description)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-[var(--text-tertiary)]">
            {t('dataEntry.sheet.poweredBy')}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="surface-paper overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th
                      key={h.id}
                      style={{ width: h.getSize() }}
                      className="px-3 py-2.5 text-caption font-semibold text-[var(--text-secondary)] whitespace-nowrap"
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    {assignments.length === 0 ? (
                      <EmptyState art="noData" title={t('dataEntry.sheet.noAssignmentsTitle')} body={t('dataEntry.sheet.noAssignmentsBody')} cta={{ label: t('dataEntry.sheet.openTasks'), onClick: () => navigate('/my-tasks') }} density="compact" />
                    ) : (
                      <EmptyState variant="filtered" title={t('dataEntry.sheet.noRows')} density="compact" onClearFilters={() => { setSearch(''); setStatusFilter('all'); setEntityFilter('all'); setFrameworkFilter('all') }} />
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    data-row-id={row.original.id}
                    className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]/60 transition-colors ${selected.has(row.original.id) ? 'bg-[var(--color-brand-soft)]' : ''}`}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-3 py-2 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-caption text-[var(--text-tertiary)] px-1">
        {t('dataEntry.sheet.footer', {
          framework: (() => { const fw = getFramework(frameworkFilter); return fw ? ((i18n.language?.startsWith('zh') && (fw as { nameZh?: string }).nameZh) || fw.name) : t('dataEntry.sheet.crossFramework') })(),
          count: filtered.length,
        })}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StatusPill — click → menu of valid transitions.
// ─────────────────────────────────────────────────────────────────────

function StatusPill({
  assignment, onTransition,
}: {
  assignment: QuestionAssignment
  onTransition: (a: QuestionAssignment, next: StatusKey) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  // Valid next states from each status (simplified — server is the source of truth).
  const nextStates: Record<StatusKey, StatusKey[]> = {
    not_started: ['in_progress'],
    in_progress: ['submitted'],
    submitted:   ['reviewed', 'rejected'],
    reviewed:    ['approved', 'rejected'],
    approved:    [],
    rejected:    ['in_progress'],
  }
  const options = nextStates[assignment.status]

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => options.length > 0 && setOpen(o => !o)}
        disabled={options.length === 0}
        aria-haspopup={options.length > 0 ? 'menu' : undefined}
        aria-expanded={options.length > 0 ? open : undefined}
        className={`nx-pill ${options.length === 0 ? 'cursor-default' : 'cursor-pointer hover:brightness-95'}`}
        data-tone={toneForStatus(assignment.status)}
        data-size="sm"
      >
        {t(STATUS_LABEL[assignment.status])}
      </button>
      {open && options.length > 0 && (
        <div role="menu" className="absolute left-0 top-8 z-20 surface-paper p-1 min-w-[160px] shadow-[var(--shadow-overlay)]">
          {options.map(next => (
            <button
              key={next}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onTransition(assignment, next) }}
              className="flex items-center gap-2 w-full text-left px-2.5 h-9 rounded-[var(--radius-sm)] text-small text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              <span className="nx-pill" data-tone={toneForStatus(next)} data-size="sm">{t(STATUS_LABEL[next])}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
