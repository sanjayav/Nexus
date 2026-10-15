/**
 * Excel-style formula bar — sits above the grid.
 *
 * Layout:
 *   [ D5 ] [ fx ] [ =SUM(D2:D4)                                    ]
 *
 * Behaviour:
 *   - Click into the input to edit the active cell's formula or raw value
 *   - Enter commits, Esc cancels, Tab commits then lets focus fall through
 *   - Read-only when no cell is selected
 */
import { useEffect, useRef, useState } from 'react'
import { FunctionSquare, HelpCircle } from 'lucide-react'

export interface FormulaBarProps {
  /** A1-style label of the active cell — empty when nothing selected. */
  activeCellLabel: string
  /** Current formula text (starts with `=`) or raw value. */
  activeFormula: string
  /** Disabled when no cell is selected. */
  disabled?: boolean
  onCommit: (newValue: string) => void
  onCancel: () => void
  /** Optional examples popover trigger. */
  onShowHelp?: () => void
}

export function FormulaBar({
  activeCellLabel,
  activeFormula,
  disabled,
  onCommit,
  onCancel,
  onShowHelp,
}: FormulaBarProps) {
  const [draft, setDraft] = useState(activeFormula)
  const [dirty, setDirty] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the input in sync with the active cell unless the user is mid-edit.
  useEffect(() => {
    if (!dirty) setDraft(activeFormula)
  }, [activeFormula, dirty])

  const commit = () => {
    if (!dirty) return
    onCommit(draft)
    setDirty(false)
  }

  const cancel = () => {
    setDraft(activeFormula)
    setDirty(false)
    onCancel()
  }

  return (
    <div
      className="flex items-stretch gap-2 px-2 py-1.5 surface-paper border border-[var(--border-subtle)] rounded-[8px]"
      data-testid="formula-bar"
    >
      {/* Cell-ref pill */}
      <div
        className="inline-flex items-center justify-center min-w-[56px] px-2 h-8 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] font-mono text-[11px] font-semibold text-[var(--text-secondary)] tabular-nums"
        aria-label="Active cell reference"
      >
        {activeCellLabel || '—'}
      </div>
      {/* fx indicator */}
      <div
        className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] text-[var(--text-tertiary)]"
        aria-hidden
        title="Formula"
      >
        <FunctionSquare className="w-3.5 h-3.5" />
      </div>
      {/* Editor */}
      <input
        ref={inputRef}
        type="text"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        disabled={disabled}
        value={draft}
        placeholder={disabled ? 'Select a cell to edit' : 'Type a value or =formula'}
        onChange={e => {
          setDraft(e.target.value)
          setDirty(true)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          else if (e.key === 'Escape') { e.preventDefault(); cancel() }
          else if (e.key === 'Tab') { commit() /* let browser advance focus */ }
        }}
        onBlur={() => { if (dirty) commit() }}
        className="flex-1 px-2 h-8 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[12px] font-mono tabular-nums focus:border-[var(--color-brand)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Formula or value editor"
      />
      {onShowHelp && (
        <button
          type="button"
          onClick={onShowHelp}
          className="inline-flex items-center gap-1 px-2 h-8 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Formula help"
          title="Formula examples"
        >
          <HelpCircle className="w-3 h-3" />
          Help
        </button>
      )}
    </div>
  )
}
