/**
 * Spreadsheet helpers for bulk data import and templates. Pure functions, no
 * React and no DOM, so they run in tests and could move to a worker.
 *
 * SheetJS is passed in rather than imported, which keeps it out of the entry
 * chunk (pages load it with `await import('xlsx')`) while tests import it
 * normally.
 */
import type * as XLSXNamespace from 'xlsx'

type XlsxLib = typeof XLSXNamespace

export type Grid = string[][]
export interface ParsedSheet {
  name: string
  rows: Grid
  /** 1-based sheet row number of `rows[0]` (a sheet's used range may not start at row 1). */
  firstRow: number
}

// ───────────────────────────── Reading ─────────────────────────────

/**
 * Trim cells and drop trailing empty cells and trailing empty rows. Blank
 * rows in the middle are kept (as `[]`) so row indexes still match the
 * line numbers the user sees in Excel.
 */
function clean(rows: unknown[][]): Grid {
  const out: Grid = rows.map(row => {
    const cells = row.map(c => (c == null ? '' : String(c).trim()))
    while (cells.length && cells[cells.length - 1] === '') cells.pop()
    return cells
  })
  while (out.length && !out[out.length - 1].length) out.pop()
  return out
}

/** Rows that have at least one non-empty cell. */
export const filledRows = (rows: Grid) => rows.filter(r => r.length > 0)

/** Every sheet of an .xlsx / .xls workbook as rows of display text (what the user sees in Excel). */
export function parseWorkbook(buffer: ArrayBuffer, XLSX: Pick<XlsxLib, 'read' | 'utils'>): { sheets: ParsedSheet[] } {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  return {
    sheets: wb.SheetNames.map(name => {
      const ws = wb.Sheets[name]
      if (!ws?.['!ref']) return { name, rows: [], firstRow: 1 }
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '', blankrows: true })
      return { name, rows: clean(rows), firstRow: XLSX.utils.decode_range(ws['!ref']).s.r + 1 }
    }),
  }
}

/**
 * Decode a text file. Excel on Chinese Windows saves "CSV" as GB18030/GBK,
 * not UTF-8, so fall back to it when the bytes are not valid UTF-8.
 */
export function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('gb18030').decode(buffer)
  }
}

/**
 * Parse TSV (Excel clipboard) or CSV text. Handles quoted cells with
 * embedded delimiters, quotes ("") and line breaks, CRLF and a UTF-8 BOM.
 * The delimiter is a tab when the first line has one, otherwise a comma
 * (or a semicolon when the first line has more of those than commas).
 */
export function parseDelimited(text: string): Grid {
  const src = text.replace(/^\uFEFF/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const count = (ch: string) => firstLine.split(ch).length - 1
  const delim = firstLine.includes('\t') ? '\t' : count(';') > count(',') ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let atCellStart = true

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
      continue
    }
    if (ch === '"' && atCellStart) {
      quoted = true
      atCellStart = false
    } else if (ch === delim) {
      row.push(cell)
      cell = ''
      atCellStart = true
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      atCellStart = true
    } else {
      cell += ch
      atCellStart = false
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return clean(rows)
}

// ───────────────────────────── Column mapping ─────────────────────────────

export type ColumnKey = 'sectionId' | 'fieldId' | 'field' | 'value' | 'note'
export type ColumnMapping = Partial<Record<ColumnKey, number>>
export const COLUMN_KEYS: ColumnKey[] = ['sectionId', 'fieldId', 'field', 'value', 'note']

/** Lowercase, drop spaces, punctuation and brackets (both widths) so "Field ID", "field_id" and "字段编号（ID）" compare. */
export function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[\s_\-—–·.:：,，、/\\|*＊#'"“”‘’()（）[\]【】]/g, '')
}

/** Header synonyms in English and Chinese, already normalized. Exact matches win over partial ones. */
const SYNONYMS: Record<ColumnKey, string[]> = {
  sectionId: [
    'sectionid',
    'sectioncode',
    'sectionno',
    'sectionkey',
    'disclosureid',
    'chapterid',
    '章节编号',
    '章节id',
    '章节代码',
    '章节编码',
    '板块编号',
    '部分编号',
  ],
  fieldId: [
    'fieldid',
    'fieldcode',
    'fieldkey',
    'indicatorid',
    'indicatorcode',
    'metricid',
    'metriccode',
    'datapointid',
    'questionid',
    'kpiid',
    'id',
    'code',
    'key',
    '字段编号',
    '字段id',
    '字段代码',
    '字段编码',
    '指标编号',
    '指标代码',
    '指标编码',
    '指标id',
    '数据项编号',
    '编号',
    '代码',
  ],
  field: [
    'field',
    'fieldname',
    'fieldlabel',
    'label',
    'indicator',
    'indicatorname',
    'metric',
    'metricname',
    'question',
    'datapoint',
    'item',
    '字段',
    '字段名称',
    '指标',
    '指标名称',
    '填报项',
    '数据项',
    '项目',
    '问题',
  ],
  value: [
    'newvalue',
    'value',
    'answer',
    'response',
    'data',
    'amount',
    'reportedvalue',
    'thisyear',
    '本次填报值',
    '填报值',
    '新值',
    '本期填报值',
    '本期数值',
    '本期值',
    '本年数值',
    '本年',
    '本期',
    '数值',
    '值',
    '数据',
    '填报数据',
    '填报内容',
    '答复',
    '回答',
  ],
  note: ['note', 'notes', 'comment', 'comments', 'remark', 'remarks', 'memo', 'source', '备注', '说明', '注释', '批注', '数据来源', '来源'],
}

/** Headers that look like a value column but hold the old one. */
const NOT_VALUE = ['current', 'old', 'previous', 'prior', 'lastyear', 'existing', '当前', '原值', '上期', '上年', '去年', '已有']
// Note before value so "Data source" / 数据来源 is a note, not the value.
const KEY_ORDER: ColumnKey[] = ['sectionId', 'fieldId', 'note', 'value', 'field']

/** Guess which column holds which import key from header text (zh + en). */
export function autoMapColumns(header: string[]): ColumnMapping {
  const norm = header.map(normalizeHeader)
  const map: ColumnMapping = {}
  const taken = new Set<number>()
  const assign = (key: ColumnKey, i: number) => {
    map[key] = i
    taken.add(i)
  }
  const isOldValue = (h: string) => NOT_VALUE.some(w => h.includes(w))

  // Pass 1: exact synonym.
  for (const key of KEY_ORDER) {
    const i = norm.findIndex((h, idx) => !taken.has(idx) && h !== '' && SYNONYMS[key].includes(h) && !(key === 'value' && isOldValue(h)))
    if (i >= 0) assign(key, i)
  }
  // Pass 2: header contains a synonym (≥ 2 chars, so "值" alone doesn't match everything).
  for (const key of KEY_ORDER) {
    if (map[key] !== undefined) continue
    const i = norm.findIndex(
      (h, idx) =>
        !taken.has(idx) &&
        h !== '' &&
        !(key === 'value' && isOldValue(h)) &&
        // "Section" alone names the section title column, not its id.
        !(key === 'field' && /id|编号|代码/.test(h)) &&
        SYNONYMS[key].some(syn => syn.length >= 2 && syn !== 'id' && h.includes(syn)),
    )
    if (i >= 0) assign(key, i)
  }
  return map
}

export interface KnownKeys {
  sectionIds: Iterable<string>
  fieldIds: Iterable<string>
  labels: Iterable<string>
}

/**
 * Guess columns from cell contents, for files without a recognisable header
 * (e.g. a two-column paste of field IDs and values). Only fills keys the
 * header pass left open.
 */
export function inferColumnsFromContent(body: Grid, known: KnownKeys, mapping: ColumnMapping = {}): ColumnMapping {
  const map: ColumnMapping = { ...mapping }
  const width = Math.max(0, ...body.map(r => r.length))
  const taken = new Set(Object.values(map))
  const sets = {
    sectionId: new Set([...known.sectionIds].map(s => s.toLowerCase())),
    fieldId: new Set([...known.fieldIds].map(s => s.toLowerCase())),
    field: new Set([...known.labels].map(normalizeHeader)),
  }
  const ratio = (col: number, test: (v: string) => boolean) => {
    const vals = body.map(r => r[col] ?? '').filter(Boolean)
    return vals.length ? vals.filter(test).length / vals.length : 0
  }
  for (const key of ['fieldId', 'sectionId', 'field'] as const) {
    if (map[key] !== undefined) continue
    const test = key === 'field' ? (v: string) => sets.field.has(normalizeHeader(v)) : (v: string) => sets[key].has(v.toLowerCase())
    let best = -1
    let bestScore = 0.5
    for (let c = 0; c < width; c++) {
      if (taken.has(c)) continue
      const score = ratio(c, test)
      if (score >= bestScore) {
        best = c
        bestScore = score
      }
    }
    if (best >= 0) {
      map[key] = best
      taken.add(best)
    }
  }
  if (map.value === undefined && (map.fieldId !== undefined || map.field !== undefined)) {
    // The value is usually the right-most filled column that isn't a key.
    let best = -1
    let bestFilled = 0
    for (let c = 0; c < width; c++) {
      if (taken.has(c)) continue
      const filled = body.filter(r => r[c]).length
      if (filled && filled >= bestFilled) {
        best = c
        bestFilled = filled
      }
    }
    if (best >= 0) map.value = best
  }
  return map
}

/**
 * Find the header row in the first rows of a sheet (title rows above the
 * header are common). Returns -1 when no row looks like a header.
 */
export function detectHeader(rows: Grid, scan = 10): { headerRow: number; header: string[]; body: Grid } {
  for (let i = 0; i < Math.min(rows.length, scan); i++) {
    if (!rows[i].length) continue
    const m = autoMapColumns(rows[i])
    const hasKey = m.fieldId !== undefined || m.field !== undefined
    if (hasKey && (m.value !== undefined || Object.keys(m).length >= 2)) {
      return { headerRow: i, header: rows[i], body: rows.slice(i + 1) }
    }
  }
  return { headerRow: -1, header: [], body: rows }
}

/** Spreadsheet column letter: 0 → A, 26 → AA. */
export function columnLetter(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

// ───────────────────────────── Validation ─────────────────────────────

export interface ImportField {
  id: string
  type?: string
  /** Every label the field may appear under (source + translations). */
  labels: string[]
}
export interface ImportSection {
  id: string
  /** Submitted or approved: importing reopens it as a draft. */
  locked: boolean
  fields: ImportField[]
  values: Record<string, string>
}

export type RowStatus = 'new' | 'changed' | 'unchanged' | 'warning' | 'error'
export type RowReason =
  'unknown_field' | 'missing_field' | 'duplicate_field' | 'empty_value' | 'same_value' | 'reopens_section' | 'too_long'

export interface ValidatedRow {
  /** 1-based row number in the source sheet, for the user to find it. */
  line: number
  sectionId?: string
  fieldId?: string
  /** What the row used to identify the field (ID or label), as written. */
  ref: string
  oldValue: string
  newValue: string
  note: string
  status: RowStatus
  /** The underlying change, also set when the row carries a warning. */
  change: 'new' | 'changed' | null
  reasons: RowReason[]
}

export const TEXT_LIMIT = 2000

/** "185,349" equals "185349"; other values compare as trimmed text. */
export function sameValue(a: string, b: string): boolean {
  const x = a.trim()
  const y = b.trim()
  if (x === y) return true
  const num = (s: string) => (/^-?[\d,，\s]+(\.\d+)?%?$/.test(s) ? Number(s.replace(/[,，\s%]/g, '')) : NaN)
  const nx = num(x)
  const ny = num(y)
  return !Number.isNaN(nx) && nx === ny && x.endsWith('%') === y.endsWith('%')
}

export function validateImport({
  body,
  mapping,
  sections,
  firstLine = 2,
}: {
  body: Grid
  mapping: ColumnMapping
  sections: ImportSection[]
  /** Sheet row number of `body[0]`. */
  firstLine?: number
}): ValidatedRow[] {
  type Ref = { section: ImportSection; field: ImportField }
  const byKey = new Map<string, Ref>()
  const byId = new Map<string, Ref>()
  const byLabel = new Map<string, Ref>()
  for (const section of sections) {
    for (const field of section.fields) {
      const ref = { section, field }
      byKey.set(`${section.id.toLowerCase()}.${field.id.toLowerCase()}`, ref)
      if (!byId.has(field.id.toLowerCase())) byId.set(field.id.toLowerCase(), ref)
      for (const l of field.labels) {
        const k = normalizeHeader(l)
        if (k && !byLabel.has(k)) byLabel.set(k, ref)
      }
    }
  }
  const cell = (row: string[], key: ColumnKey) => {
    const i = mapping[key]
    return i === undefined ? '' : (row[i] ?? '').trim()
  }

  const seen = new Set<string>()
  const out: ValidatedRow[] = []
  body.forEach((row, idx) => {
    const sectionRef = cell(row, 'sectionId')
    const idRef = cell(row, 'fieldId')
    const labelRef = cell(row, 'field')
    const value = cell(row, 'value')
    const note = cell(row, 'note')
    const ref = idRef || labelRef
    if (!ref && !value) return // blank or decorative row

    const found =
      (sectionRef && idRef && byKey.get(`${sectionRef.toLowerCase()}.${idRef.toLowerCase()}`)) ||
      (idRef && (byId.get(idRef.toLowerCase()) ?? byLabel.get(normalizeHeader(idRef)))) ||
      (labelRef && byLabel.get(normalizeHeader(labelRef))) ||
      undefined

    const base = { line: firstLine + idx, ref, newValue: value, note }
    if (!found) {
      // A row naming no known field and carrying no value is a heading or spacer.
      if (!value) return
      out.push({ ...base, oldValue: '', status: 'error', change: null, reasons: [ref ? 'unknown_field' : 'missing_field'] })
      return
    }

    const { section, field } = found
    const oldValue = section.values[field.id] ?? ''
    const where = { sectionId: section.id, fieldId: field.id, oldValue }
    const key = `${section.id}.${field.id}`

    if (!value) {
      out.push({ ...base, ...where, status: 'unchanged', change: null, reasons: ['empty_value'] })
      return
    }
    if (seen.has(key)) {
      out.push({ ...base, ...where, status: 'error', change: null, reasons: ['duplicate_field'] })
      return
    }
    seen.add(key)
    if (sameValue(oldValue, value)) {
      out.push({ ...base, ...where, status: 'unchanged', change: null, reasons: ['same_value'] })
      return
    }

    const change = oldValue.trim() ? 'changed' : 'new'
    const reasons: RowReason[] = []
    if (section.locked) reasons.push('reopens_section')
    if (field.type === 'textarea' && value.length > TEXT_LIMIT) reasons.push('too_long')
    out.push({ ...base, ...where, status: reasons.length ? 'warning' : change, change, reasons })
  })
  return out
}

export interface ImportSummary {
  new: number
  changed: number
  unchanged: number
  warning: number
  error: number
  /** Rows that will be written: new + changed (warnings included). */
  importable: number
}

export function summarizeImport(rows: ValidatedRow[]): ImportSummary {
  const s: ImportSummary = { new: 0, changed: 0, unchanged: 0, warning: 0, error: 0, importable: 0 }
  for (const r of rows) {
    if (r.change) {
      s[r.change] += 1
      s.importable += 1
    }
    if (r.status === 'unchanged') s.unchanged += 1
    if (r.status === 'warning') s.warning += 1
    if (r.status === 'error') s.error += 1
  }
  return s
}

/** The `sectionId → fieldId → value` payload for `importAnswers`. */
export function toImportPayload(rows: ValidatedRow[]): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {}
  for (const r of rows) {
    if (!r.change || !r.sectionId || !r.fieldId) continue
    ;(out[r.sectionId] ??= {})[r.fieldId] = r.newValue
  }
  return out
}

export interface ImportNote {
  sectionId: string
  fieldId: string
  body: string
}

/** Notes written next to imported values; they become comments on the field so reviewers see the context. */
export function toImportNotes(rows: ValidatedRow[]): ImportNote[] {
  return rows
    .filter(r => r.change && r.sectionId && r.fieldId && r.note.trim())
    .map(r => ({ sectionId: r.sectionId!, fieldId: r.fieldId!, body: r.note.trim() }))
}

// ───────────────────────────── Templates ─────────────────────────────

export interface TemplateSection {
  id: string
  title: string
  fields: { id: string; label: string; required: boolean; value: string; unit?: string }[]
}

/** Template column order. `autoMapColumns` recognises the headers in both languages. */
export const TEMPLATE_COLUMNS = ['sectionId', 'section', 'fieldId', 'field', 'required', 'current', 'value', 'unit', 'note'] as const
export type TemplateColumn = (typeof TEMPLATE_COLUMNS)[number]
/** Column widths in characters, in `TEMPLATE_COLUMNS` order. */
export const TEMPLATE_WIDTHS = [16, 36, 24, 44, 8, 48, 48, 12, 28]

/** Header + one row per field, with current values pre-filled and the new-value column left blank. */
export function buildTemplateRows(sections: TemplateSection[], labels: Record<TemplateColumn, string> & { yes: string; no: string }): Grid {
  const rows: Grid = [TEMPLATE_COLUMNS.map(c => labels[c])]
  for (const s of sections) {
    for (const f of s.fields) rows.push([s.id, s.title, f.id, f.label, f.required ? labels.yes : labels.no, f.value, '', f.unit ?? '', ''])
  }
  return rows
}

/** Excel sheet names: ≤ 31 chars, none of : \ / ? * [ ]. */
export function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet1'
}

// SheetJS bundles CFB (zip) but types it as `any`; this is the slice we use.
interface CfbEntry {
  content: Uint8Array | number[]
  size: number
}
interface CfbContainer {
  FullPaths: string[]
  FileIndex: CfbEntry[]
}
interface CfbLib {
  read: (data: Uint8Array, opts: { type: 'array' }) => CfbContainer
  write: (c: CfbContainer, opts: { fileType: 'zip'; type: 'array'; compression?: boolean }) => Uint8Array | number[]
}

/**
 * SheetJS Community Edition doesn't write freeze panes, so patch the first
 * sheet's XML in the zip to freeze row 1. Returns the input unchanged if
 * anything looks unexpected.
 */
function freezeHeaderRow(bytes: Uint8Array, cfb: CfbLib): Uint8Array {
  try {
    const zip = cfb.read(bytes, { type: 'array' })
    const idx = zip.FullPaths.findIndex(p => p.endsWith('xl/worksheets/sheet1.xml'))
    const entry = zip.FileIndex[idx]
    if (!entry) return bytes
    const xml = new TextDecoder().decode(new Uint8Array(entry.content))
    const pane =
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>'
    const patched = xml.replace(/<sheetView([^>]*?)\/>/, `<sheetView$1>${pane}</sheetView>`)
    if (patched === xml) return bytes
    entry.content = new TextEncoder().encode(patched)
    entry.size = entry.content.length
    return new Uint8Array(cfb.write(zip, { fileType: 'zip', type: 'array', compression: true }))
  } catch {
    return bytes
  }
}

export interface WorkbookSheetSpec {
  name: string
  rows: Grid
  /** Column widths in characters. */
  widths?: number[]
  /** Add an auto-filter over the used range (first sheet's header row is also frozen). */
  filter?: boolean
}

/** Build an .xlsx file. The first sheet gets a frozen header row. */
export function buildWorkbook(XLSX: Pick<XlsxLib, 'utils' | 'write' | 'CFB'>, sheets: WorkbookSheetSpec[]): Uint8Array {
  const wb = XLSX.utils.book_new()
  for (const spec of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(spec.rows)
    if (spec.widths) ws['!cols'] = spec.widths.map(wch => ({ wch }))
    if (spec.filter && spec.rows.length > 1) {
      const width = Math.max(...spec.rows.map(r => r.length))
      ws['!autofilter'] = { ref: `A1:${columnLetter(width - 1)}${spec.rows.length}` }
    }
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(spec.name))
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer
  return freezeHeaderRow(new Uint8Array(out), XLSX.CFB as CfbLib)
}
