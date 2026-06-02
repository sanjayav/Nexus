/**
 * Formula-engine unit tests.
 *
 * Exercises the HyperFormula wrapper exposed by src/lib/formulas.ts — the
 * facade the data-entry spreadsheet uses to evaluate Excel-style formulas
 * client-side. These tests guard the integration boundary (sheet routing,
 * value coercion, error mapping) rather than HF's internal evaluator.
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
  createEngine,
  loadAssignmentsToEngine,
  isFormula,
  asNumber,
  stampToday,
  cellLabel,
  parseCellRef,
  columnToLetter,
  VALUE_COL_INDEX,
  type AssignmentRow,
  type FormulaEngine,
} from '../../lib/formulas'

let engine: FormulaEngine | null = null

afterEach(() => {
  engine?.destroy()
  engine = null
})

describe('formulas: helpers', () => {
  it('isFormula detects leading equals after whitespace', () => {
    expect(isFormula('=SUM(A1:A3)')).toBe(true)
    expect(isFormula('  =1+1')).toBe(true)
    expect(isFormula('5000')).toBe(false)
    expect(isFormula('')).toBe(false)
    expect(isFormula(null)).toBe(false)
    expect(isFormula(undefined)).toBe(false)
  })

  it('columnToLetter handles single and double-letter columns', () => {
    expect(columnToLetter(0)).toBe('A')
    expect(columnToLetter(25)).toBe('Z')
    expect(columnToLetter(26)).toBe('AA')
    expect(columnToLetter(27)).toBe('AB')
  })

  it('parseCellRef round-trips with cellLabel', () => {
    expect(parseCellRef('A1')).toEqual({ col: 0, row: 0 })
    expect(parseCellRef('D5')).toEqual({ col: 3, row: 4 })
    expect(parseCellRef('AA10')).toEqual({ col: 26, row: 9 })
    expect(parseCellRef('not-a-ref')).toBeNull()
    expect(cellLabel(0, 0)).toBe('A1')
    expect(cellLabel(3, 4)).toBe('D5')
    expect(cellLabel(26, 9)).toBe('AA10')
  })

  it('asNumber coerces sensible values and rejects garbage', () => {
    expect(asNumber(42)).toBe(42)
    expect(asNumber('3.14')).toBeCloseTo(3.14)
    expect(asNumber(true)).toBe(1)
    expect(asNumber(false)).toBe(0)
    expect(asNumber(null)).toBeNull()
    expect(asNumber('not a number')).toBeNull()
    expect(asNumber({ error: '#DIV/0!', message: 'x' })).toBeNull()
  })

  it('stampToday replaces TODAY() with a DATE(...) literal', () => {
    const fixed = new Date(Date.UTC(2026, 5, 2))
    expect(stampToday('=TODAY()', fixed)).toBe('=DATE(2026,6,2)')
    expect(stampToday('=YEAR(TODAY())', fixed)).toBe('=YEAR(DATE(2026,6,2))')
    expect(stampToday('=A1+1', fixed)).toBe('=A1+1') // untouched
  })
})

describe('formulas: engine basics', () => {
  it('evaluates basic arithmetic', () => {
    engine = createEngine()
    engine.setCell('Disclosures', 0, 0, '=2+2')
    expect(engine.getCellValue('Disclosures', 0, 0)).toBe(4)
  })

  it('computes SUM across a range', () => {
    engine = createEngine()
    engine.setCell('Disclosures', 0, 0, 1)
    engine.setCell('Disclosures', 1, 0, 2)
    engine.setCell('Disclosures', 2, 0, 3)
    engine.setCell('Disclosures', 3, 0, '=SUM(A1:A3)')
    expect(engine.getCellValue('Disclosures', 3, 0)).toBe(6)
  })

  it('computes COUNTIF with a comparator', () => {
    engine = createEngine()
    engine.setCell('Disclosures', 0, 0, 3)
    engine.setCell('Disclosures', 1, 0, 7)
    engine.setCell('Disclosures', 2, 0, 9)
    engine.setCell('Disclosures', 3, 0, 2)
    engine.setCell('Disclosures', 4, 0, '=COUNTIF(A1:A4,">5")')
    expect(engine.getCellValue('Disclosures', 4, 0)).toBe(2)
  })

  it('returns #DIV/0! for division by zero', () => {
    engine = createEngine()
    engine.setCell('Disclosures', 0, 0, '=1/0')
    const v = engine.getCellValue('Disclosures', 0, 0)
    expect(v).toMatchObject({ error: expect.stringContaining('DIV') })
  })

  it('preserves the original formula text via getCellFormula', () => {
    engine = createEngine()
    engine.setCell('Disclosures', 0, 0, '=SUM(1,2,3)')
    expect(engine.getCellFormula('Disclosures', 0, 0)).toBe('=SUM(1,2,3)')
    // Plain values have no formula.
    engine.setCell('Disclosures', 1, 0, 5)
    expect(engine.getCellFormula('Disclosures', 1, 0)).toBeUndefined()
  })

  it('supports cross-sheet references', () => {
    engine = createEngine()
    engine.addSheet('Scope1')
    engine.addSheet('Scope2')
    engine.setCell('Scope1', 0, 0, 100)
    engine.setCell('Scope2', 0, 0, "='Scope1'!A1*2")
    expect(engine.getCellValue('Scope2', 0, 0)).toBe(200)
  })

  it('exportRowMajor returns the materialised grid', () => {
    engine = createEngine()
    engine.setCell('Disclosures', 0, 0, 'A')
    engine.setCell('Disclosures', 0, 1, 10)
    engine.setCell('Disclosures', 1, 0, 'B')
    engine.setCell('Disclosures', 1, 1, '=B1*3')
    const grid = engine.exportRowMajor('Disclosures')
    // First two rows of two columns.
    expect(grid.length).toBeGreaterThanOrEqual(2)
    expect(grid[0][0]).toBe('A')
    expect(grid[0][1]).toBe(10)
    expect(grid[1][1]).toBe(30)
  })

  it('IF + nested logic evaluates correctly', () => {
    engine = createEngine()
    engine.setCell('Disclosures', 0, 0, 1200)
    engine.setCell('Disclosures', 1, 0, '=IF(A1>1000,"high","ok")')
    expect(engine.getCellValue('Disclosures', 1, 0)).toBe('high')
    engine.setCell('Disclosures', 0, 0, 500)
    expect(engine.getCellValue('Disclosures', 1, 0)).toBe('ok')
  })

  it('handles unknown sheet reads without crashing', () => {
    engine = createEngine()
    expect(engine.getCellValue('NoSuchSheet', 0, 0)).toBeNull()
    expect(engine.getCellFormula('NoSuchSheet', 0, 0)).toBeUndefined()
    expect(engine.exportRowMajor('NoSuchSheet')).toEqual([])
  })
})

describe('formulas: assignment seeding', () => {
  const seed: AssignmentRow[] = [
    { id: 'a', code: 'E1-1', lineItem: 'Scope 1 diesel', unit: 'tCO2e', value: 10, status: 'in_progress' },
    { id: 'b', code: 'E1-2', lineItem: 'Scope 1 gas',    unit: 'tCO2e', value: 20, status: 'in_progress' },
    { id: 'c', code: 'E1-T', lineItem: 'Total Scope 1',  unit: 'tCO2e', value: null, status: 'not_started', formula: '=SUM(D1:D2)' },
  ]

  it('loads rows and computes the trailing formula', () => {
    engine = createEngine()
    loadAssignmentsToEngine(engine, seed)
    // Plain values stored at the value column.
    expect(engine.getCellValue('Disclosures', 0, VALUE_COL_INDEX)).toBe(10)
    expect(engine.getCellValue('Disclosures', 1, VALUE_COL_INDEX)).toBe(20)
    // Formula row computes from the prior two.
    expect(engine.getCellValue('Disclosures', 2, VALUE_COL_INDEX)).toBe(30)
    expect(engine.getCellFormula('Disclosures', 2, VALUE_COL_INDEX)).toBe('=SUM(D1:D2)')
  })

  it('recomputes when an upstream cell mutates', () => {
    engine = createEngine()
    loadAssignmentsToEngine(engine, seed)
    engine.setCell('Disclosures', 0, VALUE_COL_INDEX, 100)
    expect(engine.getCellValue('Disclosures', 2, VALUE_COL_INDEX)).toBe(120)
  })
})
