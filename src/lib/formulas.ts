/**
 * Formula engine wrapper — HyperFormula adapter for the Nexus spreadsheet.
 *
 * Why a wrapper:
 *   HyperFormula's API is sheet-id based and mutation-heavy. Components want a
 *   sheet-name-based, value-in/value-out façade so they can keep their own
 *   row/column indices stable and not leak engine internals.
 *
 * Functions supported (HyperFormula built-ins; not all listed):
 *   - Math:    SUM, AVERAGE, COUNT, COUNTA, COUNTIF, COUNTIFS, SUMIF, SUMIFS,
 *              MIN, MAX, ROUND, ABS, SQRT, POWER
 *   - Logic:   IF, AND, OR, NOT
 *   - Lookup:  VLOOKUP, INDEX, MATCH
 *   - Text:    CONCATENATE, LEFT, RIGHT, MID, LEN
 *   - Date:    YEAR, MONTH, DAY, TODAY (TODAY is stamped on save, not re-run
 *              on every load — see consumers in DataEntrySpreadsheet)
 *
 * Licence: HyperFormula is dual-licensed (GPLv3 / commercial). We use the
 * `gpl-v3` key for self-hosted use; see docs/FORMULAS.md.
 */
import { HyperFormula, type DetailedCellError } from 'hyperformula'

/** A1-style column letters: 0 → "A", 1 → "B", 25 → "Z", 26 → "AA". */
export function columnToLetter(col: number): string {
  let n = col
  let s = ''
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

/** "A1" → { col: 0, row: 0 }, "D5" → { col: 3, row: 4 }. Null on malformed. */
export function parseCellRef(ref: string): { col: number; row: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref.toUpperCase())
  if (!m) return null
  let col = 0
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64)
  return { col: col - 1, row: parseInt(m[2], 10) - 1 }
}

/** "{col: 3, row: 4}" → "D5". */
export function cellLabel(col: number, row: number): string {
  return `${columnToLetter(col)}${row + 1}`
}

export type CellValue = string | number | boolean | null
export type CellResult = CellValue | { error: string; message: string }

export interface FormulaEngine {
  setCell: (sheet: string, row: number, col: number, value: string | number | null) => void
  getCellValue: (sheet: string, row: number, col: number) => CellResult
  getCellFormula: (sheet: string, row: number, col: number) => string | undefined
  recalculate: () => void
  addSheet: (name: string) => void
  hasSheet: (name: string) => boolean
  exportRowMajor: (sheet: string) => CellResult[][]
  destroy: () => void
}

interface InternalCellError {
  type?: string
  value?: string
  message?: string
}

function isDetailedCellError(v: unknown): v is DetailedCellError {
  if (!v || typeof v !== 'object') return false
  const obj = v as InternalCellError
  return typeof obj.type === 'string' || typeof obj.value === 'string'
}

function toCellResult(raw: unknown): CellResult {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' || typeof raw === 'string' || typeof raw === 'boolean') return raw
  if (isDetailedCellError(raw)) {
    const err = raw as InternalCellError
    return {
      error: err.value || `#${err.type ?? 'ERROR'}!`,
      message: err.message || 'Formula error',
    }
  }
  return String(raw)
}

/**
 * Build a fresh engine. Each spreadsheet instance owns one — destroy on unmount.
 */
export function createEngine(): FormulaEngine {
  const hf = HyperFormula.buildEmpty({
    licenseKey: 'gpl-v3',
    // useColumnIndex speeds up large COUNTIF/SUMIF columns.
    useColumnIndex: true,
  })
  // Default sheet — callers can add more via addSheet().
  if (hf.getSheetId('Disclosures') === undefined) {
    hf.addSheet('Disclosures')
  }

  const sheetId = (name: string): number => {
    let id = hf.getSheetId(name)
    if (id === undefined) {
      hf.addSheet(name)
      id = hf.getSheetId(name)
    }
    if (id === undefined) throw new Error(`Could not create sheet "${name}"`)
    return id
  }

  return {
    setCell(sheet, row, col, value) {
      const id = sheetId(sheet)
      // HyperFormula treats string "" as empty; pass null through as empty too.
      const cellValue = value === null ? null : value
      hf.setCellContents({ sheet: id, row, col }, [[cellValue as string | number | null]])
    },

    getCellValue(sheet, row, col) {
      const id = hf.getSheetId(sheet)
      if (id === undefined) return null
      return toCellResult(hf.getCellValue({ sheet: id, row, col }))
    },

    getCellFormula(sheet, row, col) {
      const id = hf.getSheetId(sheet)
      if (id === undefined) return undefined
      const f = hf.getCellFormula({ sheet: id, row, col })
      return f ?? undefined
    },

    recalculate() {
      // HyperFormula recalcs on every setCellContents. This is a hook for
      // external batchers; today it's a no-op.
    },

    addSheet(name) {
      if (hf.getSheetId(name) === undefined) hf.addSheet(name)
    },

    hasSheet(name) {
      return hf.getSheetId(name) !== undefined
    },

    exportRowMajor(sheet) {
      const id = hf.getSheetId(sheet)
      if (id === undefined) return []
      const rows = hf.getSheetValues(id) as unknown[][]
      return rows.map(r => r.map(toCellResult))
    },

    destroy() {
      hf.destroy()
    },
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers used by the spreadsheet UI
// ─────────────────────────────────────────────────────────────────────

/** Spreadsheet row mirrors a `QuestionAssignment` row — the value-column is D (index 3). */
export const VALUE_COL_INDEX = 3

export interface AssignmentRow {
  id: string
  code: string
  lineItem: string
  unit: string | null
  value: number | null
  status: string
  assignee?: string
  formula?: string | null
}

/** Seed the engine with the current grid contents. */
export function loadAssignmentsToEngine(
  engine: FormulaEngine,
  assignments: AssignmentRow[],
  sheetName = 'Disclosures',
): void {
  if (!engine.hasSheet(sheetName)) engine.addSheet(sheetName)
  assignments.forEach((a, i) => {
    engine.setCell(sheetName, i, 0, a.code)
    engine.setCell(sheetName, i, 1, a.lineItem)
    engine.setCell(sheetName, i, 2, a.unit ?? '')
    // Formula text wins over value — HyperFormula computes the result.
    const cell = a.formula && a.formula.startsWith('=')
      ? a.formula
      : (a.value ?? '')
    engine.setCell(sheetName, i, VALUE_COL_INDEX, cell)
    engine.setCell(sheetName, i, 4, a.status)
    engine.setCell(sheetName, i, 5, a.assignee ?? '')
  })
}

/** "=SUM(D2:D5)" or "42" → { isFormula, computedNumber }. */
export function isFormula(text: string | null | undefined): boolean {
  if (!text) return false
  return text.trim().startsWith('=')
}

/** Coerce a CellResult to a numeric value (or null for errors / non-numeric). */
export function asNumber(result: CellResult): number | null {
  if (result === null) return null
  if (typeof result === 'number') return Number.isFinite(result) ? result : null
  if (typeof result === 'boolean') return result ? 1 : 0
  if (typeof result === 'string') {
    const trimmed = result.trim()
    if (trimmed === '') return null
    const n = Number(trimmed)
    return Number.isNaN(n) ? null : n
  }
  return null
}

/** Stamp TODAY() at save time — formulas are persisted, but TODAY is "frozen" to
 * the moment of save so a stale tab reopening tomorrow doesn't silently shift. */
export function stampToday(formula: string, today: Date = new Date()): string {
  // Replace bare TODAY() with the ISO date as a DATE(y,m,d) literal so the
  // engine still treats it as a date if surrounding math expects one.
  return formula.replace(/\bTODAY\s*\(\s*\)/gi, () => {
    const y = today.getUTCFullYear()
    const m = today.getUTCMonth() + 1
    const d = today.getUTCDate()
    return `DATE(${y},${m},${d})`
  })
}
