import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { itemLabel } from '../../lib/itemLabel'
import { Check, Loader2, AlertCircle, Link2 } from 'lucide-react'
import type { NexusQuestionnaireItem, ConceptPeer } from '../../lib/api'
import type { QuestionAssignment } from '../../lib/orgStore'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../lib/rbac'
import { getFramework } from '../../lib/frameworks'
import { useFmt } from '../../lib/fmt'
import { localizeUnit } from '../../calculators/labels'
import { useIsInsideRoom, useOthers, useUpdateMyPresence } from '../../lib/liveblocks'
import { StatusPill } from '../ui'
import { iconSwapVariants, crossfadeVariants } from '../../motion/tokens'
import { parseNumeric } from '../entry/persist'
import { sectionLabel, subsectionLabel, relativeTime } from '../entry/labels'

/**
 * Middle-pane "document" renderer for the disclosure editor.
 *
 * The questionnaire reads as a typeset document: each subsection is a group
 * whose header sticks while you scroll it, each line item shows its label,
 * code and unit, and the value is an inline cell.
 *
 * Keyboard: ↑/↓ (or j/k) move between cells, Enter or any digit starts
 * editing, Enter/Tab commit and move on, Esc cancels. Edits flow through
 * `onSave(item, value)` — the caller runs the shared entry pipeline.
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
  /** Autosave hook — fires on commit with the new numeric value (or null to clear). */
  onSave: (item: NexusQuestionnaireItem, newValue: number | null) => Promise<void> | void
  readingMode: boolean
  /** Whether the current user is allowed to edit values. */
  canEdit: boolean
  /** Fired when each subsection group mounts — caller uses it to wire scroll-to. */
  registerSectionAnchor: (subsectionId: string, el: HTMLElement | null) => void
  /** Optional per-cell linked-data peers — used for the inline link badge. */
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
    if (!map.has(id)) map.set(id, { subsectionId: id, section: it.section, subsection: it.subsection, items: [] })
    map.get(id)!.items.push(it)
  }
  return Array.from(map.values())
}

const focusCell = (id: string) => requestAnimationFrame(() => {
  const el = document.querySelector<HTMLElement>(`[data-cell-input="${CSS.escape(id)}"]`)
  el?.focus()
  el?.scrollIntoView({ block: 'nearest' })
})

export default function DisclosureDocument({
  subsectionId, items, cellState, activeCellId, onActiveCellChange, onSave, readingMode, canEdit,
  registerSectionAnchor, linkedPeersByItem,
}: DisclosureDocumentProps) {
  const { t } = useTranslation()
  const grouped = useMemo(() => groupItems(items), [items])
  const orderedCellIds = useMemo(() => grouped.flatMap(g => g.items.map(it => it.id)), [grouped])

  usePublishActiveCell(activeCellId)

  const moveFrom = useCallback((fromId: string, direction: 1 | -1) => {
    const idx = orderedCellIds.indexOf(fromId)
    if (idx < 0) return
    const nextIdx = idx + direction
    if (nextIdx < 0 || nextIdx >= orderedCellIds.length) return
    const nextId = orderedCellIds[nextIdx]
    onActiveCellChange(nextId)
    focusCell(nextId)
  }, [orderedCellIds, onActiveCellChange])

  useEffect(() => {
    if (!subsectionId) return
    const el = document.querySelector<HTMLElement>(`[data-subsection="${CSS.escape(subsectionId)}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [subsectionId])

  return (
    <main className="flex-1 min-w-0 overflow-y-auto disclosure-document bg-[var(--bg-primary)]" data-reading-mode={readingMode}>
      <div className={`mx-auto ${readingMode ? 'max-w-page-prose py-16 px-6 sm:px-8' : 'max-w-[820px] pb-16 pt-2 px-4 sm:px-8 md:px-12'}`}>
        {grouped.length === 0 && (
          <div className="text-center py-20 text-small text-[var(--text-tertiary)]">{t('disclosureEditor.document.empty')}</div>
        )}
        {grouped.map(group => (
          <section
            key={group.subsectionId}
            data-subsection={group.subsectionId}
            ref={el => registerSectionAnchor(group.subsectionId, el)}
            className="mb-10 scroll-mt-2"
            aria-labelledby={`h-${group.subsectionId}`}
          >
            <header className={`sticky top-0 z-[5] -mx-4 sm:-mx-8 px-4 sm:px-8 pt-5 pb-3 mb-4 border-b border-[var(--border-subtle)] ${readingMode ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-primary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-primary)]/85'}`}>
              <div className="text-caption font-semibold text-[var(--color-brand-strong)] mb-0.5">{sectionLabel(t, group.section)}</div>
              <h2 id={`h-${group.subsectionId}`} className={readingMode ? 'type-h1 text-[var(--text-primary)]' : 'type-h2 text-[var(--text-primary)]'}>
                {subsectionLabel(t, group.subsection)}
              </h2>
            </header>

            <div className="space-y-2">
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
                  onMove={dir => moveFrom(item.id, dir)}
                  linkedPeers={linkedPeersByItem?.[item.id] ?? []}
                  remoteEditors={readingMode ? null : <CellRemoteEditors cellId={item.id} />}
                />
              ))}
            </div>
          </section>
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
  onMove: (dir: 1 | -1) => void
  linkedPeers: ConceptPeer[]
  /** Remote-editor presence badges (null when nobody else is here). */
  remoteEditors?: ReactNode
}

function DisclosureLine({ item, state, isActive, readingMode, canEdit, onFocus, onSave, onMove, linkedPeers, remoteEditors }: DisclosureLineProps) {
  const { user, permissions } = useAuth()
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const label = itemLabel(item, i18n.language)
  const assignment = state?.assignment ?? null
  const value = assignment?.value ?? null
  const status = assignment?.status ?? 'not_started'
  const unit = item.unit ? localizeUnit(t, item.unit) : null
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
  const [invalid, setInvalid] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const errId = `cell-err-${item.id}`

  const remoteBorderColor = useRemoteCellBorderColor(item.id, readingMode)
  const remoteRingStyle = (!readingMode && !isActive && remoteBorderColor) ? { boxShadow: `0 0 0 1.5px ${remoteBorderColor}66` } : undefined

  useEffect(() => { if (!editing) setDraft(value != null ? String(value) : '') }, [value, editing])

  const startEditing = (seed?: string) => {
    if (!allowEdit) return
    onFocus()
    setEditing(true)
    setInvalid(false)
    if (seed !== undefined) setDraft(seed)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      if (seed === undefined) el.select()
    })
  }

  /** Returns false (and stays in edit mode) when the text isn't a number. */
  const commit = useCallback(async (): Promise<boolean> => {
    const parsed = parseNumeric(draft)
    if (!parsed.ok) { setInvalid(true); return false }
    setEditing(false)
    setInvalid(false)
    if (parsed.value === value) return true
    await onSave(parsed.value)
    return true
  }, [draft, value, onSave])

  const cancel = () => {
    setEditing(false); setInvalid(false); setDraft(value != null ? String(value) : '')
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-cell-input="${CSS.escape(item.id)}"]`)?.focus())
  }

  const display = value != null ? f.number(value, { maxFraction: 6 }) : '—'

  return (
    <div
      className={`group relative rounded-[var(--radius-lg)] -mx-3 px-3 py-3 transition-colors ${isActive && !readingMode ? 'bg-[var(--color-brand-soft)]/50' : readingMode ? '' : 'hover:bg-[var(--bg-secondary)]/60'}`}
      style={remoteRingStyle}
      onClick={onFocus}
    >
      {!readingMode && remoteEditors && <div className="absolute top-2 right-3 z-10">{remoteEditors}</div>}

      <div className="mb-2 pr-8">
        <div className={`text-[var(--text-primary)] ${readingMode ? 'text-[17px] leading-relaxed' : 'text-body font-medium'}`}>{label}</div>
        <div className="text-caption text-[var(--text-tertiary)] mt-0.5 tabular-nums">
          <span className="font-mono">{item.gri_code}</span>
          {item.scope_split ? ` · ${t(`disclosureEditor.scope.${item.scope_split}`, { defaultValue: item.scope_split })}` : ''}
          {unit ? ` · ${unit}` : ''}
        </div>
      </div>

      <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
        {readingMode ? (
          <span className="inline-flex items-baseline gap-2" aria-label={t('disclosureEditor.document.valueFor', { item: label })}>
            <span className="type-figure text-[18px] text-[var(--text-primary)]">{display}</span>
            {unit && <span className="text-small text-[var(--text-tertiary)]">{unit}</span>}
            <LinkedBadge peers={linkedPeers} />
          </span>
        ) : editing ? (
          <div className="flex flex-col">
            <div className={`flex items-stretch rounded-[var(--radius-md)] border bg-[var(--bg-primary)] ring-2 ${invalid ? 'border-[var(--status-danger)] ring-[var(--status-danger)]/20' : 'border-[var(--color-brand)] ring-[var(--color-brand)]/20'}`}>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={draft}
                onChange={e => { setDraft(e.target.value); setInvalid(false) }}
                data-cell-input={item.id}
                aria-label={t('disclosureEditor.document.valueFor', { item: label })}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errId : undefined}
                onBlur={() => { void commit() }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') { e.preventDefault(); if (await commit()) onMove(1) }
                  else if (e.key === 'Escape') { e.preventDefault(); cancel() }
                  else if (e.key === 'Tab') { e.preventDefault(); if (await commit()) onMove(e.shiftKey ? -1 : 1) }
                }}
                className="w-[200px] h-11 px-3 bg-transparent outline-none type-figure text-[18px] text-[var(--text-primary)]"
              />
              {unit && <span className="px-3 flex items-center border-l border-[var(--border-subtle)] text-caption text-[var(--text-tertiary)] whitespace-nowrap">{unit}</span>}
            </div>
            {invalid && (
              <span id={errId} role="alert" className="mt-1 text-caption text-[var(--status-danger)]">{t('disclosureEditor.document.invalid')}</span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFocus(); startEditing() }}
            onFocus={onFocus}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); onMove(1) }
              else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); onMove(-1) }
              else if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEditing() }
              else if (/^[0-9.\-]$/.test(e.key) && allowEdit && !e.metaKey && !e.ctrlKey) { e.preventDefault(); startEditing(e.key) }
            }}
            data-cell-input={item.id}
            aria-label={t('disclosureEditor.document.valueFor', { item: label })}
            aria-describedby={`cell-meta-${item.id}`}
            className={`inline-flex items-baseline gap-2 min-w-[200px] h-11 px-3 rounded-[var(--radius-md)] border text-left transition-[border-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/30 bg-[var(--bg-primary)] ${
              isActive ? 'border-[var(--color-brand)] shadow-[0_0_0_1px_var(--color-brand)]' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
            } ${allowEdit ? 'cursor-text' : 'cursor-default'}`}
          >
            <span className={`self-center type-figure text-[18px] ${value != null ? 'text-[var(--text-primary)]' : 'text-[var(--text-quaternary)]'}`}>{display}</span>
            {unit && <span className="self-center text-caption text-[var(--text-tertiary)]">{unit}</span>}
            <span className="self-center ml-auto"><LinkedBadge peers={linkedPeers} /></span>
          </button>
        )}

        {!readingMode && <StatusPill status={status} size="sm" />}
        {readingMode && <span className="no-print-status"><StatusPill status={status} size="sm" /></span>}

        <span id={`cell-meta-${item.id}`} className="text-caption text-[var(--text-tertiary)] inline-flex items-center gap-1.5 min-w-0">
          {assignment?.assigneeName && <span className="truncate max-w-[160px]">{assignment.assigneeName}</span>}
          {assignment?.last_updated && <span className="whitespace-nowrap">· {t('disclosureEditor.document.updated', { time: relativeTime(t, assignment.last_updated) })}</span>}
        </span>

        <span className="inline-flex items-center min-h-[20px]" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {state?.saveState === 'saving' && (
              <motion.span key="saving" variants={crossfadeVariants} initial="initial" animate="enter" exit="exit" className="inline-flex items-center gap-1 text-caption text-[var(--text-tertiary)]">
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> {t('disclosureEditor.document.saving')}
              </motion.span>
            )}
            {state?.saveState === 'saved' && (
              <motion.span key="saved" variants={crossfadeVariants} initial="initial" animate="enter" exit="exit" className="inline-flex items-center gap-1 text-caption text-[var(--status-success)]">
                <motion.span variants={iconSwapVariants} initial="initial" animate="enter" className="inline-flex"><Check className="w-3.5 h-3.5" aria-hidden /></motion.span>
                {t('disclosureEditor.document.saved')}
              </motion.span>
            )}
            {state?.saveState === 'error' && (
              <motion.span key="error" variants={crossfadeVariants} initial="initial" animate="enter" exit="exit" className="inline-flex items-center gap-1 text-caption text-[var(--status-danger)]" title={state.errorMessage ?? undefined}>
                <AlertCircle className="w-3 h-3" aria-hidden /> {state.errorMessage || t('disclosureEditor.page.saveFailed')}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>
    </div>
  )
}

/** Inline link badge: how many other frameworks this value propagates to. */
function LinkedBadge({ peers }: { peers: ConceptPeer[] }) {
  const { t } = useTranslation()
  if (!peers.length) return null
  const tooltip = t('disclosureEditor.document.alsoAppears', { list: peers.map(p => `${frameworkLabel(p.framework_id)} ${p.gri_code ?? ''}`.trim()).join(t('disclosureEditor.document.listSep')) })
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-caption font-semibold tabular-nums cursor-help"
      title={tooltip}
      aria-label={tooltip}
    >
      <Link2 className="w-3 h-3" aria-hidden />
      {peers.length}
    </span>
  )
}

function frameworkLabel(id: string): string {
  return getFramework(id)?.code ?? id.toUpperCase()
}

/** Push the local user's focused cell to room presence (no-op outside a room). */
function usePublishActiveCell(activeCellId: string | null) {
  const inside = useIsInsideRoom()
  const update = useUpdateMyPresence()
  useEffect(() => {
    if (!inside) return
    update({ activeCellId, selectionAt: Date.now() })
  }, [inside, activeCellId, update])
}

/** Tint of the first remote editor focused on `cellId`, or null. */
function useRemoteCellBorderColor(cellId: string, readingMode: boolean): string | null {
  const inside = useIsInsideRoom()
  const others = useOthers()
  if (!inside || readingMode) return null
  const owner = others.find(o => o.presence?.activeCellId === cellId)
  if (!owner) return null
  return owner.info?.color ?? owner.presence?.color ?? null
}

/** Stacked avatars for everyone else focused on a cell (max 3). */
function CellRemoteEditors({ cellId }: { cellId: string }) {
  const inside = useIsInsideRoom()
  if (!inside) return null
  return <CellRemoteEditorsInner cellId={cellId} />
}

function CellRemoteEditorsInner({ cellId }: { cellId: string }) {
  const others = useOthers()
  const { t } = useTranslation()
  const here = others.filter(o => o.presence?.activeCellId === cellId)
  if (here.length === 0) return null
  const visible = here.slice(0, 3)
  const overflow = here.length - visible.length
  return (
    <div className="flex -space-x-1.5 items-center">
      {visible.map(({ connectionId, info, presence }) => {
        const name = info?.name ?? t('disclosureEditor.progress.user')
        return (
          <div
            key={connectionId}
            className="w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold text-white border-2 border-[var(--bg-primary)]"
            style={{ background: presence?.color || info?.color || 'var(--color-brand)' }}
            title={t('disclosureEditor.document.isHere', { name }) + (info?.email ? ` (${info.email})` : '')}
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
        )
      })}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-caption font-semibold text-[var(--text-secondary)] flex items-center justify-center border-2 border-[var(--bg-primary)] tabular-nums" title={t('disclosureEditor.document.moreHere', { count: overflow })}>
          +{overflow}
        </div>
      )}
    </div>
  )
}
