/**
 * Formula-aware cell renderer for the data-entry spreadsheet.
 *
 * Two states:
 *   - Display mode (default): shows computed value + optional fx indicator.
 *     Clicking activates the cell (selected) — single click sets it as the
 *     formula-bar target. Double-click enters in-cell edit mode.
 *   - Edit mode: text input that accepts both raw values and `=formula`
 *     expressions. Enter / Tab commits; Esc cancels.
 *
 * Errors (#REF!, #VALUE!, #DIV/0!) render in the danger tone with a tooltip carrying the
 * full HyperFormula message.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, CheckCircle2, AlertCircle, FunctionSquare } from 'lucide-react'
import type { CellResult } from '../../lib/formulas'
import { isFormula } from '../../lib/formulas'

export type CellSaveState =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved' }
  | { state: 'error'; message: string }

interface CellErrorShape {
  error: string
  message: string
}

function isCellError(v: CellResult | undefined): v is CellErrorShape {
  return !!v && typeof v === 'object' && 'error' in v
}

export interface CellReferenceProps {
  /** The user-entered text (formula like `=SUM(...)` or a raw value). */
  rawText: string
  /** The computed value from the engine — used for display only. */
  computed: CellResult
  /** Reflects whether this cell is the formula-bar active target. */
  isActive?: boolean
  /** Save status pip — same set as the surrounding row state machine. */
  saveState?: CellSaveState
  /** Single-click: select the cell as the formula-bar target. */
  onActivate?: () => void
  /** Commit a new value (raw or formula). */
  onCommit: (newRaw: string) => void
  /** Optional placeholder when computed is null. */
  placeholder?: string
  /** Optional `name` used by parent for keyboard nav (data-cell="value"). */
  dataCell?: string
}

export function CellReference({
  rawText,
  computed,
  isActive,
  saveState,
  onActivate,
  onCommit,
  placeholder = '—',
  dataCell = 'value',
}: CellReferenceProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(rawText)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(rawText)
  }, [rawText, editing])

  const commit = () => {
    setEditing(false)
    if (draft === rawText) return
    onCommit(draft)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(rawText)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        data-cell={dataCell}
        spellCheck={false}
        autoComplete="off"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
          else if (e.key === 'Enter') { e.preventDefault(); commit() }
          else if (e.key === 'Tab') { commit() /* let browser advance */ }
        }}
        aria-label={t('spreadsheet.editor')}
        className="w-full px-2 h-9 rounded-[var(--radius-sm)] border border-[var(--color-brand)] bg-[var(--bg-primary)] text-small tabular-nums font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
      />
    )
  }

  const hasFormula = isFormula(rawText)
  const cellError = isCellError(computed) ? computed : null
  let display: string
  if (cellError) {
    display = cellError.error
  } else if (computed === null || computed === undefined || computed === '') {
    display = placeholder
  } else {
    display = String(computed)
  }

  return (
    <button
      type="button"
      data-cell={dataCell}
      onClick={() => onActivate?.()}
      onDoubleClick={() => setEditing(true)}
      onFocus={() => onActivate?.()}
      onKeyDown={e => {
        if (e.key === 'F2' || e.key === 'Enter') {
          e.preventDefault()
          setEditing(true)
        }
      }}
      className={`w-full text-left h-9 px-2 rounded-[var(--radius-sm)] text-small tabular-nums hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/40 inline-flex items-center justify-between gap-2 ${
        isActive ? 'ring-1 ring-[var(--color-brand)]' : ''
      } ${cellError || saveState?.state === 'error' ? 'text-[var(--status-danger)]' : 'text-[var(--text-primary)]'}`}
      title={saveState?.state === 'error' ? saveState.message : cellError ? cellError.message : hasFormula ? rawText : undefined}
      aria-invalid={saveState?.state === 'error' || !!cellError || undefined}
    >
      <span className={computed === null && !cellError ? 'text-[var(--text-tertiary)]' : ''}>{display}</span>
      <span className="inline-flex items-center gap-1">
        {hasFormula && !cellError && (
          <FunctionSquare className="w-3 h-3 text-[var(--text-tertiary)]" aria-label={t('spreadsheet.formulaLower')} />
        )}
        {saveState?.state === 'saving' && <Loader2 className="w-3 h-3 animate-spin text-[var(--color-brand)]" />}
        {saveState?.state === 'saved' && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)]" aria-label={t('spreadsheet.saved')} />}
        {saveState?.state === 'error' && (
          <span title={saveState.message}><AlertCircle className="w-3.5 h-3.5 text-[var(--status-danger)]" aria-label={saveState.message} /></span>
        )}
      </span>
    </button>
  )
}
