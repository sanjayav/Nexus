import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  autoMapColumns,
  buildTemplateRows,
  buildWorkbook,
  columnLetter,
  decodeText,
  detectHeader,
  inferColumnsFromContent,
  parseDelimited,
  parseWorkbook,
  sameValue,
  summarizeImport,
  toImportPayload,
  validateImport,
  type ImportSection,
} from './spreadsheet'

describe('parseDelimited', () => {
  it('parses Excel clipboard TSV', () => {
    expect(parseDelimited('Field ID\tNew value\r\nscope1_total\t185,349\r\n')).toEqual([
      ['Field ID', 'New value'],
      ['scope1_total', '185,349'],
    ])
  })

  it('handles CSV quotes, escaped quotes, embedded commas and line breaks', () => {
    const csv = 'id,value\na,"one, two"\nb,"say ""hi"""\nc,"line 1\nline 2"\n'
    expect(parseDelimited(csv)).toEqual([
      ['id', 'value'],
      ['a', 'one, two'],
      ['b', 'say "hi"'],
      ['c', 'line 1\nline 2'],
    ])
  })

  it('strips a UTF-8 BOM and trailing empty cells, keeping interior blank rows for line numbers', () => {
    expect(parseDelimited('\uFEFF字段编号,本次填报值,,\n\n,,\nsse_dm_changes,新增“科技伦理”\n\n')).toEqual([
      ['字段编号', '本次填报值'],
      [],
      [],
      ['sse_dm_changes', '新增“科技伦理”'],
    ])
  })

  it('uses semicolons when the first line has more of them than commas', () => {
    expect(parseDelimited('id;value\na;1,5')).toEqual([
      ['id', 'value'],
      ['a', '1,5'],
    ])
  })
})

describe('decodeText', () => {
  it('reads UTF-8 and falls back to GB18030 for Chinese Excel CSVs', () => {
    expect(decodeText(new TextEncoder().encode('范围1').buffer as ArrayBuffer)).toBe('范围1')
    // "范围" in GBK.
    const gbk = new Uint8Array([0xb7, 0xb6, 0xce, 0xa7])
    expect(decodeText(gbk.buffer)).toBe('范围')
  })
})

describe('autoMapColumns', () => {
  it('maps the English template header', () => {
    expect(
      autoMapColumns(['Section ID', 'Section', 'Field ID', 'Field', 'Required', 'Current value', 'New value', 'Unit', 'Note']),
    ).toEqual({
      sectionId: 0,
      fieldId: 2,
      field: 3,
      value: 6,
      note: 8,
    })
  })

  it('maps the Chinese template header', () => {
    expect(autoMapColumns(['章节编号', '章节名称', '字段编号', '字段名称', '必填', '当前值', '本次填报值', '单位', '备注'])).toEqual({
      sectionId: 0,
      fieldId: 2,
      field: 3,
      value: 6,
      note: 8,
    })
  })

  it('maps free-form headers from data owners', () => {
    expect(autoMapColumns(['指标代码', '指标名称', '上年数值', '本期数值', '数据来源'])).toEqual({
      fieldId: 0,
      field: 1,
      value: 3,
      note: 4,
    })
    expect(autoMapColumns(['Indicator code', 'Metric name', 'Previous value', 'Reported value (FY2026)', 'Remarks'])).toEqual({
      fieldId: 0,
      field: 1,
      value: 3,
      note: 4,
    })
  })

  it('never maps the current-value column as the new value', () => {
    expect(autoMapColumns(['Field ID', 'Current value']).value).toBeUndefined()
    expect(autoMapColumns(['字段编号', '当前值']).value).toBeUndefined()
  })
})

describe('detectHeader / inferColumnsFromContent', () => {
  it('finds a header below a title row', () => {
    const rows = [['绿源控股集团 数据填报模板'], ['字段编号', '本次填报值'], ['scope1_total', '1']]
    const d = detectHeader(rows)
    expect(d.headerRow).toBe(1)
    expect(d.body).toEqual([['scope1_total', '1']])
  })

  it('infers columns from known field IDs when there is no header', () => {
    const rows = [
      ['scope1_total', '185,349'],
      ['scope1_gases', 'CO₂'],
    ]
    expect(detectHeader(rows).headerRow).toBe(-1)
    expect(inferColumnsFromContent(rows, { sectionIds: [], fieldIds: ['scope1_total', 'scope1_gases'], labels: [] })).toEqual({
      fieldId: 0,
      value: 1,
    })
  })

  it('names columns like Excel', () => {
    expect([0, 25, 26, 27].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'AB'])
  })
})

const sections: ImportSection[] = [
  {
    id: 'CNSSE-CLIM-MT',
    locked: false,
    fields: [
      { id: 'scope1_total', type: 'text', labels: ['Scope 1 GHG emissions (tCO2e)', '范围1 温室气体排放（tCO₂e）'] },
      { id: 'scope1_gases', type: 'text', labels: ['Gases included'] },
      { id: 'scope2_note', type: 'textarea', labels: ['Scope 2 note'] },
    ],
    values: { scope1_total: '185,349', scope1_gases: '', scope2_note: '' },
  },
  {
    id: 'CNSSE-GEN',
    locked: true,
    fields: [{ id: 'sse_dm_changes', type: 'textarea', labels: ['Changes compared with prior period'] }],
    values: { sse_dm_changes: '较 2025 年新增' },
  },
]
const mapping = { sectionId: 0, fieldId: 1, value: 2, note: 3 }

describe('validateImport', () => {
  const body = [
    ['CNSSE-CLIM-MT', 'scope1_total', '185349'], // same number, different formatting
    ['CNSSE-CLIM-MT', 'scope1_gases', 'CO₂、CH₄', 'GB/T 32150'],
    ['CNSSE-CLIM-MT', 'nope', '1'],
    ['CNSSE-GEN', 'sse_dm_changes', '新增“科技伦理”'],
    ['CNSSE-CLIM-MT', 'scope2_note', 'x'.repeat(2001)],
    ['CNSSE-CLIM-MT', 'scope1_gases', 'CO₂'],
    ['CNSSE-CLIM-MT', 'scope1_total', ''],
    ['', '', ''],
  ]
  const rows = validateImport({ body, mapping, sections, firstLine: 2 })

  it('flags unknown fields as errors', () => {
    expect(rows[2]).toMatchObject({ line: 4, status: 'error', reasons: ['unknown_field'], ref: 'nope' })
  })

  it('treats equal values (including number formatting) and empty cells as unchanged', () => {
    expect(rows[0]).toMatchObject({ status: 'unchanged', reasons: ['same_value'], change: null })
    expect(rows[6]).toMatchObject({ status: 'unchanged', reasons: ['empty_value'] })
    expect(rows).toHaveLength(7) // the blank row is dropped
  })

  it('warns when a submitted or approved section would reopen', () => {
    expect(rows[3]).toMatchObject({ status: 'warning', change: 'changed', reasons: ['reopens_section'], oldValue: '较 2025 年新增' })
  })

  it('warns on long narrative answers and rejects duplicates', () => {
    expect(rows[4]).toMatchObject({ status: 'warning', change: 'new', reasons: ['too_long'] })
    expect(rows[1]).toMatchObject({ status: 'new', change: 'new', note: 'GB/T 32150' })
    expect(rows[5]).toMatchObject({ status: 'error', reasons: ['duplicate_field'] })
  })

  it('summarizes and builds the store payload from importable rows only', () => {
    expect(summarizeImport(rows)).toEqual({ new: 2, changed: 1, unchanged: 2, warning: 2, error: 2, importable: 3 })
    expect(toImportPayload(rows)).toEqual({
      'CNSSE-CLIM-MT': { scope1_gases: 'CO₂、CH₄', scope2_note: 'x'.repeat(2001) },
      'CNSSE-GEN': { sse_dm_changes: '新增“科技伦理”' },
    })
  })

  it('matches fields by label when there is no ID column', () => {
    const out = validateImport({ body: [['范围1 温室气体排放（tCO₂e）', '190,000']], mapping: { field: 0, value: 1 }, sections })
    expect(out[0]).toMatchObject({ sectionId: 'CNSSE-CLIM-MT', fieldId: 'scope1_total', status: 'changed' })
  })

  it('compares numbers loosely but not percentages with plain numbers', () => {
    expect(sameValue('1,000', '1000')).toBe(true)
    expect(sameValue('48.8%', '48.8')).toBe(false)
  })
})

describe('templates', () => {
  const labels = {
    sectionId: 'Section ID',
    section: 'Section',
    fieldId: 'Field ID',
    field: 'Field',
    required: 'Required',
    current: 'Current value',
    value: 'New value',
    unit: 'Unit',
    note: 'Note',
    yes: 'Yes',
    no: 'No',
  }
  const tpl = buildTemplateRows(
    [{ id: 'S1', title: 'Emissions', fields: [{ id: 'scope1_total', label: 'Scope 1', required: true, value: '185,349', unit: 'tCO2e' }] }],
    labels,
  )

  it('lays out one row per field under a recognisable header', () => {
    expect(tpl).toEqual([
      ['Section ID', 'Section', 'Field ID', 'Field', 'Required', 'Current value', 'New value', 'Unit', 'Note'],
      ['S1', 'Emissions', 'scope1_total', 'Scope 1', 'Yes', '185,349', '', 'tCO2e', ''],
    ])
    expect(autoMapColumns(tpl[0])).toMatchObject({ sectionId: 0, fieldId: 2, value: 6 })
  })

  it('round-trips through an .xlsx file with a frozen header row', () => {
    const bytes = buildWorkbook(XLSX, [
      { name: '数据填报', rows: tpl, widths: [10, 20], filter: true },
      { name: '填报说明', rows: [['说明']] },
    ])
    const { sheets } = parseWorkbook(bytes.buffer as ArrayBuffer, XLSX)
    expect(sheets.map(s => s.name)).toEqual(['数据填报', '填报说明'])
    expect(sheets[0].firstRow).toBe(1)
    expect(sheets[0].rows[0]).toEqual(tpl[0])
    expect(sheets[0].rows[1]).toEqual(['S1', 'Emissions', 'scope1_total', 'Scope 1', 'Yes', '185,349', '', 'tCO2e'])
    const wb = XLSX.read(bytes, { type: 'array' })
    expect(wb.Sheets['数据填报']['!autofilter']).toEqual({ ref: 'A1:I2' })
  })
})
