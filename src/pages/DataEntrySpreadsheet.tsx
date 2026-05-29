import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Loader2, CheckCircle2, AlertCircle, Search, Link2, Download, Send, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { orgStore, type QuestionAssignment, type OrgEntity } from '../lib/orgStore'
import { useFramework, getFramework, getActiveFrameworks } from '../lib/frameworks'
import { nexus } from '../lib/api'

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

const STATUS_LABEL: Record<StatusKey, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_CLASS: Record<StatusKey, string> = {
  not_started:  'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]',
  in_progress:  'bg-blue-100 text-blue-800',
  submitted:    'bg-amber-100 text-amber-800',
  reviewed:     'bg-violet-100 text-violet-800',
  approved:     'bg-emerald-100 text-emerald-800',
  rejected:     'bg-rose-100 text-rose-800',
}

const ACTIVE_REPORTING_YEAR_ID = '11000000-0000-0000-0000-000000000026'

export default function DataEntrySpreadsheet() {
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const navigate = useNavigate()

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

  const refresh = useCallback(async () => {
    if (!user?.email) return
    try {
      const [rows, ents] = await Promise.all([
        orgStore.myAssignments(),
        orgStore.listEntities(),
      ])
      setAssignments(rows)
      setEntities(ents)
    } catch (e) {
      console.warn('[spreadsheet] refresh failed', e)
    }
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
      if (q && !a.line_item.toLowerCase().includes(q) && !a.gri_code.toLowerCase().includes(q)) return false
      return true
    })
  }, [assignments, search, statusFilter, frameworkFilter, entityFilter])

  // Persist a single value change to the assignment + (when applicable) push to
  // the workflow data_value via nexus.enterValue. Updates UI optimistically.
  const saveValue = useCallback(async (a: QuestionAssignment, newValue: number | null) => {
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
        value: newValue,
        status: a.status === 'not_started' ? 'in_progress' : a.status,
      })
      // Mirror into data_value so the workflow + reports pipeline see it.
      // Failures here are non-fatal: the assignment is the user-facing record.
      if (newValue !== null) {
        try {
          await nexus.enterValue({
            question_id: a.questionId,
            reporting_year_id: ACTIVE_REPORTING_YEAR_ID,
            value: newValue,
            unit: a.unit ?? undefined,
            mode: 'Manual',
          })
        } catch (e) {
          console.warn('[spreadsheet] enterValue mirror failed', e)
        }
      }

      setAssignments(prev => prev.map(p => p.id === a.id
        ? { ...p, value: newValue, status: p.status === 'not_started' ? 'in_progress' : p.status, last_updated: new Date().toISOString() }
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      setRowSaves(prev => {
        const m = new Map(prev)
        m.set(a.id, { state: 'error', error: msg })
        return m
      })
    }
  }, [])

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
      const msg = e instanceof Error ? e.message : 'Save failed'
      setRowSaves(prev => { const m = new Map(prev); m.set(a.id, { state: 'error', error: msg }); return m })
    }
  }, [])

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
          aria-label="Select all visible rows"
          onChange={e => selectAllVisible(e.target.checked)}
          checked={filtered.length > 0 && filtered.every(a => selected.has(a.id))}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.original.gri_code}`}
          checked={selected.has(row.original.id)}
          onChange={e => toggleSelect(row.original.id, e.target.checked)}
        />
      ),
      size: 40,
    },
    helper.accessor('gri_code', {
      header: 'Code',
      cell: info => (
        <span className="font-mono text-[11px] text-[var(--text-secondary)]">{info.getValue()}</span>
      ),
      size: 110,
    }),
    helper.accessor('line_item', {
      header: 'Disclosure',
      cell: info => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-[12px] text-[var(--text-primary)]">{info.getValue()}</span>
          {/* Linked-data indicator — appears when the assignment is linked
              via concept_mappings. The flag is populated lazily, see effect below. */}
          {info.row.original.is_overdue ? (
            <span className="px-1.5 h-5 inline-flex items-center rounded text-[10px] font-semibold bg-rose-100 text-rose-700">overdue</span>
          ) : null}
        </div>
      ),
      size: 300,
    }),
    helper.accessor('unit', {
      header: 'Unit',
      cell: info => <span className="text-[11px] text-[var(--text-tertiary)]">{info.getValue() ?? '—'}</span>,
      size: 80,
    }),
    helper.accessor('value', {
      header: 'Value',
      cell: info => (
        <EditableValueCell
          assignment={info.row.original}
          rowSave={rowSaves.get(info.row.original.id)}
          onSave={saveValue}
        />
      ),
      size: 160,
    }),
    helper.accessor('status', {
      header: 'Status',
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
      header: 'Assignee',
      cell: ({ row }) => (
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] text-[var(--text-primary)] truncate">{row.original.assigneeName || '—'}</span>
          <span className="text-[10px] text-[var(--text-tertiary)] truncate">{entityById.get(row.original.entityId)?.name ?? ''}</span>
        </div>
      ),
      size: 180,
    },
    helper.accessor('last_updated', {
      header: 'Updated',
      cell: info => {
        const ts = info.getValue()
        if (!ts) return <span className="text-[10px] text-[var(--text-tertiary)]">—</span>
        const d = new Date(ts)
        return <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{d.toLocaleDateString()}</span>
      },
      size: 90,
    }),
    {
      id: 'open',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => navigate(`/data/entry/${row.original.questionId}`)}
          className="text-[10px] font-semibold text-[var(--color-brand)] hover:underline"
        >
          Open
        </button>
      ),
      size: 60,
    },
  ], [filtered, selected, rowSaves, entityById, saveValue, transitionStatus, navigate, helper])

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Save indicator summary
  const savingCount = Array.from(rowSaves.values()).filter(v => v.state === 'saving').length
  const errorCount  = Array.from(rowSaves.values()).filter(v => v.state === 'error').length
  const saveLabel = savingCount > 0
    ? `Saving ${savingCount}…`
    : errorCount > 0
      ? `${errorCount} unsaved`
      : 'All changes saved'

  const bulkSubmit = async () => {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      const ids = Array.from(selected)
      for (const id of ids) {
        const a = assignments.find(x => x.id === id)
        if (!a) continue
        if (a.status === 'in_progress' || a.status === 'not_started') {
          await orgStore.updateAssignment(id, { status: 'submitted' })
        }
      }
      await refresh()
      setSelected(new Set())
    } finally {
      setBulkBusy(false)
    }
  }

  const bulkApprove = async () => {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      const ids = Array.from(selected)
      for (const id of ids) {
        const a = assignments.find(x => x.id === id)
        if (!a) continue
        if (a.status === 'submitted' || a.status === 'reviewed') {
          await orgStore.updateAssignment(id, { status: 'approved' })
        }
      }
      await refresh()
      setSelected(new Set())
    } finally {
      setBulkBusy(false)
    }
  }

  const exportSelectedCsv = () => {
    const rows = filtered.filter(a => selected.has(a.id))
    if (rows.length === 0) return
    const header = ['gri_code', 'line_item', 'unit', 'value', 'status', 'assignee', 'entity', 'last_updated']
    const lines = [header.join(',')]
    for (const r of rows) {
      const fields = [
        r.gri_code, r.line_item, r.unit ?? '', r.value ?? '', r.status,
        r.assigneeName, entityById.get(r.entityId)?.name ?? '', r.last_updated ?? '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`)
      lines.push(fields.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `data-entry-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] gap-2 text-[var(--text-tertiary)]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading assignments…
      </div>
    )
  }

  const frameworks = [{ id: 'all', code: 'All' }, ...getActiveFrameworks().map(f => ({ id: f.id, code: f.code }))]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-display text-[24px] text-[var(--text-primary)] leading-[1.1]">Data entry spreadsheet</h1>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1 max-w-xl">
            Bulk-edit values across every assigned disclosure. Tab to advance, Enter to save and move down,
            Esc to revert. Approved values propagate to every linked framework automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SaveIndicator label={saveLabel} saving={savingCount > 0} error={errorCount > 0} />
        </div>
      </div>

      {/* Filter bar */}
      <div className="surface-paper p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search disclosures…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[12px] focus:border-[var(--color-brand)] outline-none"
          />
        </div>
        <select
          value={frameworkFilter}
          onChange={e => setFrameworkFilter(e.target.value)}
          className="h-9 px-3 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[12px]"
          aria-label="Framework filter"
        >
          {frameworks.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}
        </select>
        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="h-9 px-3 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[12px]"
          aria-label="Entity filter"
        >
          <option value="all">All entities</option>
          {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | StatusKey)}
          className="h-9 px-3 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[12px]"
          aria-label="Status filter"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABEL) as StatusKey[]).map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <div className="ml-auto text-[11px] text-[var(--text-tertiary)] tabular-nums">
          {filtered.length} rows · {selected.size} selected
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="surface-paper p-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-[var(--text-tertiary)] mr-2">{selected.size} selected</span>
          <button
            type="button"
            onClick={bulkSubmit}
            disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] bg-[var(--color-brand)] text-white text-[11px] font-semibold disabled:opacity-50"
          >
            <Send className="w-3 h-3" /> Submit selected
          </button>
          <button
            type="button"
            onClick={bulkApprove}
            disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] bg-emerald-600 text-white text-[11px] font-semibold disabled:opacity-50"
          >
            <ShieldCheck className="w-3 h-3" /> Approve selected
          </button>
          <button
            type="button"
            onClick={exportSelectedCsv}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[11px] font-semibold"
          >
            <Download className="w-3 h-3" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-2 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Clear
          </button>
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
                      className="px-3 py-2 text-[10px] uppercase tracking-[0.08em] font-semibold text-[var(--text-tertiary)]"
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
                  <td colSpan={columns.length} className="text-center py-10 text-[12px] text-[var(--text-tertiary)]">
                    No rows match the current filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    data-row-id={row.original.id}
                    className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]/40 transition-colors ${selected.has(row.original.id) ? 'bg-[var(--accent-teal-subtle)]' : ''}`}
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

      <p className="text-[10px] text-[var(--text-tertiary)] px-1">
        {getFramework(frameworkFilter)?.name ?? 'Cross-framework'} · {filtered.length} rows. Virtualization is disabled
        at this scale — re-enable when the grid exceeds ~500 visible rows.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// EditableValueCell — click → input, Tab/Enter/Esc keys, autosave on blur.
// ─────────────────────────────────────────────────────────────────────

function EditableValueCell({
  assignment, rowSave, onSave,
}: {
  assignment: QuestionAssignment
  rowSave: RowSaveState | undefined
  onSave: (a: QuestionAssignment, v: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>(assignment.value != null ? String(assignment.value) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync draft if the assignment value changes from elsewhere (e.g. propagation).
  useEffect(() => {
    if (!editing) {
      setDraft(assignment.value != null ? String(assignment.value) : '')
    }
  }, [assignment.value, editing])

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed === '' && assignment.value == null) return
    if (trimmed === String(assignment.value ?? '')) return
    const parsed = trimmed === '' ? null : Number(trimmed)
    if (parsed !== null && Number.isNaN(parsed)) {
      setDraft(assignment.value != null ? String(assignment.value) : '')
      return
    }
    onSave(assignment, parsed)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(assignment.value != null ? String(assignment.value) : '')
  }

  const moveCell = (dir: 'next' | 'prev' | 'down') => {
    const tr = inputRef.current?.closest('tr') as HTMLTableRowElement | null
    if (!tr) return
    if (dir === 'down') {
      const nextRow = tr.nextElementSibling as HTMLTableRowElement | null
      if (nextRow) {
        const input = nextRow.querySelector<HTMLInputElement>('input[data-cell="value"]')
        input?.focus()
      }
      return
    }
    // next/prev — within row, just rely on default Tab.
    // The browser already handles Tab/Shift+Tab natively; we don't preventDefault.
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="number"
        step="any"
        data-cell="value"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
          else if (e.key === 'Enter') { e.preventDefault(); commit(); setTimeout(() => moveCell('down'), 0) }
          else if (e.key === 'Tab') { commit() /* let browser advance */ }
        }}
        className="w-full px-2 h-8 rounded-[6px] border border-[var(--color-brand)] bg-[var(--bg-primary)] text-[12px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
      />
    )
  }

  const display = assignment.value != null ? String(assignment.value) : '—'
  return (
    <button
      type="button"
      data-cell="value"
      onClick={() => setEditing(true)}
      onFocus={() => setEditing(true)}
      className="w-full text-left h-8 px-2 rounded-[6px] text-[12px] tabular-nums text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-secondary)] focus:outline-none inline-flex items-center justify-between gap-2"
    >
      <span className={assignment.value == null ? 'text-[var(--text-tertiary)]' : ''}>{display}</span>
      {rowSave?.state === 'saving' && <Loader2 className="w-3 h-3 animate-spin text-[var(--color-brand)]" />}
      {rowSave?.state === 'saved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
      {rowSave?.state === 'error' && (
        <span title={rowSave.error ?? ''}><AlertCircle className="w-3 h-3 text-rose-600" /></span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// StatusPill — click → dropdown of valid transitions.
// ─────────────────────────────────────────────────────────────────────

function StatusPill({
  assignment, onTransition,
}: {
  assignment: QuestionAssignment
  onTransition: (a: QuestionAssignment, next: StatusKey) => void
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
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
        className={`inline-flex items-center px-2 h-6 rounded-full text-[10px] font-semibold ${STATUS_CLASS[assignment.status]} ${options.length === 0 ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
      >
        {STATUS_LABEL[assignment.status]}
      </button>
      {open && options.length > 0 && (
        <div className="absolute left-0 top-7 z-20 surface-paper p-1 min-w-[140px] shadow-lg">
          {options.map(next => (
            <button
              key={next}
              type="button"
              onClick={() => { setOpen(false); onTransition(assignment, next) }}
              className="block w-full text-left px-2 h-7 rounded-[5px] text-[11px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              → {STATUS_LABEL[next]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SaveIndicator — top-right "All changes saved" pill.
// ─────────────────────────────────────────────────────────────────────

function SaveIndicator({ label, saving, error }: { label: string; saving: boolean; error: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-semibold ${
      error ? 'bg-rose-100 text-rose-700' :
      saving ? 'bg-amber-100 text-amber-700' :
      'bg-emerald-50 text-emerald-700'
    }`}>
      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> :
       error ? <AlertCircle className="w-3 h-3" /> :
       <Link2 className="w-3 h-3" />}
      {label}
    </div>
  )
}
