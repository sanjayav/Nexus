import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, AlertCircle, Link2 } from 'lucide-react'
import type { NexusQuestionnaireItem, ConceptPeer } from '../../lib/api'
import type { QuestionAssignment } from '../../lib/orgStore'
import { formatValue } from '../../reports/spdTemplate'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../lib/rbac'
import { getFramework } from '../../lib/frameworks'
import { riseIn } from '../motion'
import { useIsInsideRoom, useOthers, useUpdateMyPresence } from '../../lib/liveblocks'

/**
 * Middle-pane "document" renderer for the disclosure editor.
 *
 * Renders the questionnaire as a typeset document: each subsection becomes a
 * h2/h3 group, each line item gets a plain-English label, the value renders
 * inline as a click-to-edit cell, and a tiny metadata strip sits underneath.
 *
 * Edits flow through `onSave(item, value)`; the caller owns autosave + status
 * transitions. Tab/Enter walk the next editable cell.
 */
export interface DisclosureDocumentCellState {
  /** Assignment, if one exists for this questionnaire item. */
  assignment: QuestionAssignment | null
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  errorMessage?: string | null
}

export interface DisclosureDocumentProps {
  /** Subsection id rendered in sequence; tree-click scrolls to this section. */
  subsectionId: string | null
  /** Full questionnaire items, already filtered to the framework. */
  items: NexusQuestionnaireItem[]
  /** Cell state map keyed by questionnaire_item_id. */
  cellState: Record<string, DisclosureDocumentCellState>
  /** Currently focussed cell id (controls right-rail content). */
  activeCellId: string | null
  onActiveCellChange: (questionnaireItemId: string) => void
  /** Autosave hook — fires on blur with the new numeric value (or null to clear). */
  onSave: (item: NexusQuestionnaireItem, newValue: number | null) => Promise<void> | void
  readingMode: boolean
  /** Whether the current user is allowed to edit values. */
  canEdit: boolean
  /** Fired when each subsection group mounts — caller uses it to wire scroll-to. */
  registerSectionAnchor: (subsectionId: string, el: HTMLElement | null) => void
  /** Optional per-cell linked-data peers — used for the inline "🔗 N" badge. */
  linkedPeersByItem?: Record<string, ConceptPeer[]>
}

interface GroupedSection {
  subsectionId: string
  section: string
  subsection: string
  items: NexusQuestionnaireItem[]
}

function groupItems(items: NexusQuestionnaireItem[]): GroupedSection[] {
  const map = new Map<string, GroupedSection>()
  for (const it of items) {
    const id = `${it.section}::${it.subsection}`
    if (!map.has(id)) {
      map.set(id, { subsectionId: id, section: it.section, subsection: it.subsection, items: [] })
    }
    map.get(id)!.items.push(it)
  }
  return Array.from(map.values())
}

export default function DisclosureDocument({
  subsectionId,
  items,
  cellState,
  activeCellId,
  onActiveCellChange,
  onSave,
  readingMode,
  canEdit,
  registerSectionAnchor,
  linkedPeersByItem,
}: DisclosureDocumentProps) {
  const grouped = useMemo(() => groupItems(items), [items])
  const orderedCellIds = useMemo(() => items.map(it => it.id), [items])

  // Broadcast active cell to room peers (no-op when outside a RoomProvider).
  // Per-cell badges in <DisclosureLine> read this back via useOthers().
  usePublishActiveCell(activeCellId)

  // Editable-cell flow: tab/enter moves to the next item.
  const advanceToCell = useCallback((fromId: string, direction: 1 | -1) => {
    const idx = orderedCellIds.indexOf(fromId)
    if (idx < 0) return
    const nextIdx = idx + direction
    if (nextIdx < 0 || nextIdx >= orderedCellIds.length) return
    const nextId = orderedCellIds[nextIdx]
    onActiveCellChange(nextId)
    // Focus the cell input after React commits.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-cell-input="${nextId}"]`)
      el?.focus()
    })
  }, [orderedCellIds, onActiveCellChange])

  useEffect(() => {
    if (!subsectionId) return
    const el = document.querySelector<HTMLElement>(`[data-subsection="${subsectionId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [subsectionId])

  return (
    <main className="flex-1 min-w-0 overflow-y-auto disclosure-document" data-reading-mode={readingMode}>
      <div className={`mx-auto ${readingMode ? 'max-w-page-prose py-16 px-8' : 'max-w-[800px] py-10 px-6 md:px-12'}`}>
        {grouped.length === 0 && (
          <div className="text-center py-20 text-[var(--text-sm)] text-[var(--text-tertiary)]">
            No disclosures in this framework yet.
          </div>
        )}
        {grouped.map((group, gi) => (
          <motion.section
            key={group.subsectionId}
            data-subsection={group.subsectionId}
            ref={el => registerSectionAnchor(group.subsectionId, el)}
            {...riseIn(Math.min(gi, 5))}
            className="mb-12"
          >
            <header className="mb-6 pb-2 border-b border-[var(--border-subtle)]">
              <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--color-brand)] mb-1">
                {group.section}
              </div>
              <h2 className={`font-display font-semibold text-[var(--text-primary)] ${readingMode ? 'text-[28px] leading-snug' : 'text-[var(--text-xl)]'}`}>
                {group.subsection}
              </h2>
            </header>

            <div className="space-y-6">
              {group.items.map(item => (
                <DisclosureLine
                  key={item.id}
                  item={item}
                  state={cellState[item.id]}
                  isActive={activeCellId === item.id}
                  readingMode={readingMode}
                  canEdit={canEdit}
                  onFocus={() => onActiveCellChange(item.id)}
                  onSave={async (val) => { await onSave(item, val) }}
                  onAdvance={dir => advanceToCell(item.id, dir)}
                  linkedPeers={linkedPeersByItem?.[item.id] ?? []}
                  remoteEditors={readingMode ? null : <CellRemoteEditors cellId={item.id} />}
                />
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </main>
  )
}

interface DisclosureLineProps {
  item: NexusQuestionnaireItem
  state: DisclosureDocumentCellState | undefined
  isActive: boolean
  readingMode: boolean
  canEdit: boolean
  onFocus: () => void
  onSave: (newValue: number | null) => Promise<void>
  onAdvance: (dir: 1 | -1) => void
  linkedPeers: ConceptPeer[]
  /** Remote-editor presence badges. Always passed; renders to null when no
   *  one else has the cell active (so the layout doesn't shift). */
  remoteEditors?: ReactNode
}

function DisclosureLine({ item, state, isActive, readingMode, canEdit, onFocus, onSave, onAdvance, linkedPeers, remoteEditors }: DisclosureLineProps) {
  const { user, permissions } = useAuth()
  const assignment = state?.assignment ?? null
  const value = assignment?.value ?? null
  const status = assignment?.status ?? 'not_started'
  const isAssignee = assignment?.assigneeEmail
    ? assignment.assigneeEmail.toLowerCase() === (user?.email ?? '').toLowerCase()
    : false
  // Editing requires data.upload AND (you're the assignee OR workflow.approve).
  const allowEdit = canEdit
    && !readingMode
    && hasPermission(permissions, 'data.upload')
    && (isAssignee || hasPermission(permissions, 'workflow.approve'))

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>(value != null ? String(value) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  // Subtle border tint when another editor has this cell focused. Falls back
  // to null outside a RoomProvider (solo mode) or in reading mode, so the
  // layout never shifts and read-only views stay quiet.
  const remoteBorderColor = useRemoteCellBorderColor(item.id, readingMode)
  // Soft 1.5px ring at 40-alpha — reads as ambient presence, not validation.
  // Skipped while the local cell is the active one (the brand-coloured focus
  // ring takes precedence).
  const remoteRingStyle = (!readingMode && !isActive && remoteBorderColor)
    ? { boxShadow: `0 0 0 1.5px ${remoteBorderColor}40` }
    : undefined

  useEffect(() => { setDraft(value != null ? String(value) : '') }, [value])

  const commit = useCallback(async () => {
    setEditing(false)
    const next = draft.trim() === '' ? null : Number(draft)
    if (next != null && Number.isNaN(next)) return
    if (next === value) return
    await onSave(next)
  }, [draft, value, onSave])

  const cellClasses = isActive
    ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/20'
    : 'border-[var(--border-default)] hover:border-[var(--color-brand)]/40'

  return (
    <div
      className={`group relative rounded-[var(--radius-md)] -mx-3 px-3 py-2 transition-shadow ${isActive ? 'bg-[var(--color-brand-soft)]/30' : ''}`}
      style={remoteRingStyle}
      onClick={onFocus}
    >
      {/* Remote editors currently focussed on this cell — overlays at the
          top-right corner so they don't shift the surrounding layout. */}
      {!readingMode && remoteEditors && (
        <div className="absolute top-2 right-3 z-10">{remoteEditors}</div>
      )}

      <div className="mb-1.5">
        <div className={`font-medium text-[var(--text-primary)] ${readingMode ? 'text-[17px] leading-relaxed' : 'text-[var(--text-base)]'}`}>
          {item.line_item}
        </div>
        <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-0.5">
          {item.gri_code}
          {item.scope_split ? ` · ${item.scope_split}` : ''}
          {item.unit ? ` · ${item.unit}` : ''}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {readingMode || !allowEdit || !editing ? (
          readingMode ? (
            // Reading mode — typeset inline as flowing prose, not as a button.
            <span
              className="inline-flex items-baseline gap-2"
              aria-label={`Value for ${item.line_item}`}
            >
              <span className="tabular-nums font-semibold text-[var(--text-primary)] text-[18px]">
                {value != null ? formatValue(value) : '—'}
              </span>
              {item.unit && (
                <span className="text-[14px] text-[var(--text-tertiary)]">{item.unit}</span>
              )}
              <LinkedBadge peers={linkedPeers} />
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onFocus()
                if (allowEdit) {
                  setEditing(true)
                  requestAnimationFrame(() => inputRef.current?.focus())
                }
              }}
              data-cell-input={item.id}
              className={`inline-flex items-baseline gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-left transition-all min-w-[180px] ${cellClasses} ${
                !allowEdit ? 'cursor-default' : 'cursor-text'
              } bg-[var(--bg-primary)]`}
              aria-label={`Value for ${item.line_item}`}
            >
              <span className="tabular-nums font-semibold text-[var(--text-primary)] text-[var(--text-lg)]">
                {value != null ? formatValue(value) : '—'}
              </span>
              {item.unit && (
                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{item.unit}</span>
              )}
              <LinkedBadge peers={linkedPeers} />
            </button>
          )
        ) : (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            data-cell-input={item.id}
            onBlur={() => { void commit() }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void commit(); onAdvance(1) }
              else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setDraft(value != null ? String(value) : '') }
              else if (e.key === 'Tab') { e.preventDefault(); void commit(); onAdvance(e.shiftKey ? -1 : 1) }
            }}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-brand)] bg-[var(--bg-primary)] text-[var(--text-lg)] font-semibold tabular-nums text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none w-[180px]"
          />
        )}

        <StatusChip status={status} readingMode={readingMode} />

        {assignment?.last_updated && (
          <span className="text-[10px] text-[var(--text-tertiary)]">
            Updated {relativeTime(assignment.last_updated)}
          </span>
        )}
        {assignment?.assigneeName && (
          <span className="text-[10px] text-[var(--text-tertiary)]">· {assignment.assigneeName}</span>
        )}

        {state?.saveState === 'saving' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>
        )}
        {state?.saveState === 'saved' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--status-ok)]"><Check className="w-3 h-3" /> Saved</span>
        )}
        {state?.saveState === 'error' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--status-reject)]" title={state.errorMessage ?? undefined}>
            <AlertCircle className="w-3 h-3" /> Save failed
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Inline "🔗 N" badge that surfaces how many other frameworks a value
 * propagates to via the concept-mapping graph. Tooltip on hover lists
 * the peers (framework code · disclosure code).
 */
function LinkedBadge({ peers }: { peers: ConceptPeer[] }) {
  if (!peers.length) return null
  // Group by framework so "GRI 305-1 · GRI 305-2" collapses for the badge title.
  const tooltip = `Also appears in ${peers.map(p => `${frameworkLabel(p.framework_id)} ${p.gri_code ?? ''}`.trim()).join(', ')}`
  return (
    <span
      className="ml-1 inline-flex items-center gap-0.5 px-1.5 h-4 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-[10px] font-semibold tabular-nums cursor-help"
      title={tooltip}
      aria-label={tooltip}
    >
      <Link2 className="w-2.5 h-2.5" />
      {peers.length}
    </span>
  )
}

function frameworkLabel(id: string): string {
  return getFramework(id)?.code ?? id.toUpperCase()
}

function StatusChip({ status, readingMode = false }: { status: QuestionAssignment['status']; readingMode?: boolean }) {
  const map: Record<QuestionAssignment['status'], { label: string; cls: string }> = {
    not_started: { label: 'Not started', cls: 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]' },
    in_progress: { label: 'Draft', cls: 'bg-[var(--accent-amber-light)] text-[var(--status-draft)]' },
    submitted: { label: 'Submitted', cls: 'bg-[var(--accent-blue-light)] text-[var(--status-pending)]' },
    reviewed: { label: 'Reviewed', cls: 'bg-[var(--accent-blue-light)] text-[var(--status-pending)]' },
    approved: { label: 'Approved', cls: 'bg-[var(--accent-green-light)] text-[var(--status-ok)]' },
    rejected: { label: 'Rejected', cls: 'bg-[var(--accent-red-light)] text-[var(--status-reject)]' },
  }
  const m = map[status]
  // Reading mode — quieter, grayer, smaller.
  if (readingMode) {
    return (
      <span className="inline-flex items-center px-1.5 h-4 rounded-[var(--radius-xs)] text-[9px] font-normal text-[var(--text-tertiary)] bg-transparent border border-[var(--border-subtle)] no-print-status">
        {m.label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-1.5 h-4 rounded-[var(--radius-xs)] text-[9px] font-semibold uppercase tracking-wider ${m.cls}`}>
      {m.label}
    </span>
  )
}

function relativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime()
    const diffSec = Math.max(1, Math.round((Date.now() - then) / 1000))
    if (diffSec < 60) return `${diffSec}s ago`
    const m = Math.round(diffSec / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.round(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.round(h / 24)
    return `${d}d ago`
  } catch { return iso }
}

/**
 * Push the local user's currently-focused cell to room presence so peers can
 * render the "X is here" badge. No-op outside a `<RoomProvider>` — the hook
 * binding lives in `lib/liveblocks.ts` and silently swallows updates when
 * collab is disabled, so callers don't need to gate on `useIsInsideRoom`.
 *
 * `useUpdateMyPresence` is stable, but `selectionAt` only refreshes on actual
 * cell changes — Liveblocks already throttles presence at 100ms, so we don't
 * need to debounce here.
 */
function usePublishActiveCell(activeCellId: string | null) {
  const inside = useIsInsideRoom()
  const update = useUpdateMyPresence()
  useEffect(() => {
    if (!inside) return
    update({ activeCellId, selectionAt: Date.now() })
  }, [inside, activeCellId, update])
}

/**
 * Hook: returns the stable per-user tint of the *first* remote editor
 * currently focused on `cellId`, or null when nobody else is here, when
 * collab is disabled, or in reading mode.
 *
 * Both `useIsInsideRoom()` and `useOthers()` are called unconditionally so
 * React's rules-of-hooks lint stays happy. The editor always wraps its tree
 * in a `<RoomProvider>` (with a `<CollabBoundary>` upstream catching hard
 * failures), so `useOthers()` is safe to call here — `useIsInsideRoom()`
 * just lets us short-circuit cheaply when the room hasn't connected yet.
 */
function useRemoteCellBorderColor(cellId: string, readingMode: boolean): string | null {
  const inside = useIsInsideRoom()
  const others = useOthers()
  if (!inside || readingMode) return null
  const owner = others.find(o => o.presence?.activeCellId === cellId)
  if (!owner) return null
  return owner.info?.color ?? owner.presence?.color ?? null
}

/**
 * Stacked-avatar overlay for everyone else currently focused on a given cell.
 * Self-guarded so it can be safely rendered outside a RoomProvider — falls
 * back to `null`, which keeps the cell's overall layout stable.
 *
 * Caps at 3 avatars; with the free tier's 25-connection ceiling per room
 * this is plenty, and going wider would crowd the cell border.
 */
function CellRemoteEditors({ cellId }: { cellId: string }) {
  const inside = useIsInsideRoom()
  if (!inside) return null
  return <CellRemoteEditorsInner cellId={cellId} />
}

function CellRemoteEditorsInner({ cellId }: { cellId: string }) {
  const others = useOthers()
  const here = others.filter(o => o.presence?.activeCellId === cellId)
  if (here.length === 0) return null
  const visible = here.slice(0, 3)
  const overflow = here.length - visible.length
  return (
    <div className="flex -space-x-1.5 items-center">
      {visible.map(({ connectionId, info, presence }) => {
        const name = info?.name ?? 'User'
        const color = presence?.color || info?.color || '#10B981'
        return (
          <div
            key={connectionId}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[var(--bg-primary)] shadow-sm"
            style={{ background: color }}
            title={`${name} is here${info?.email ? ` (${info.email})` : ''}`}
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
        )
      })}
      {overflow > 0 && (
        <div
          className="w-5 h-5 rounded-full bg-[var(--bg-tertiary)] text-[9px] font-semibold text-[var(--text-secondary)] flex items-center justify-center border-2 border-[var(--bg-primary)] tabular-nums"
          title={`${overflow} more here`}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
