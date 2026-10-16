/**
 * Client-side CSV helpers.
 *
 * Export: every CSV starts with a UTF-8 BOM. Excel on Chinese Windows opens a
 * BOM-less CSV in the ANSI code page (GBK), which turns Chinese into mojibake.
 *
 * Import: Chinese Excel's "CSV (逗号分隔)" saves in GB18030/GBK, not UTF-8.
 * `decodeCsvBytes` accepts UTF-8 (with or without BOM), UTF-16 (BOM-marked,
 * Excel's "Unicode Text") and falls back to GB18030 (a superset of GBK) when
 * the bytes are not valid UTF-8.
 */
import Papa from 'papaparse'

export const CSV_BOM = '﻿'

// ─── Export ─────────────────────────────────────────────────────────────

/** RFC 4180 cell: quote when the value contains a quote, comma or newline, or
 *  has leading/trailing whitespace; inner quotes are doubled. */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s: string
  if (typeof v === 'string') s = v
  else if (v instanceof Date) s = v.toISOString()
  else if (typeof v === 'object') s = JSON.stringify(v)
  else s = String(v)
  if (/["\n\r,]/.test(s) || /^\s|\s$/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Rows → CSV text with a leading BOM and CRLF line endings. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return CSV_BOM + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

/** CSV blob ready for download. `toCsv` output already carries the BOM. */
export function csvBlob(rows: ReadonlyArray<ReadonlyArray<unknown>>): Blob {
  return new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
}

/** Trigger a browser download of `rows` as a CSV file. */
export function downloadCsv(filename: string, rows: ReadonlyArray<ReadonlyArray<unknown>>): void {
  const url = URL.createObjectURL(csvBlob(rows))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── Import ─────────────────────────────────────────────────────────────

export type CsvEncoding = 'utf-8' | 'utf-8-bom' | 'utf-16le' | 'utf-16be' | 'gb18030'

/**
 * Decode raw CSV bytes to text, detecting the encoding:
 *   1. BOM: EF BB BF → UTF-8, FF FE → UTF-16LE, FE FF → UTF-16BE.
 *   2. Strict UTF-8 (`fatal: true`): any invalid sequence throws instead of
 *      producing U+FFFD replacement characters.
 *   3. Otherwise GB18030, which covers GBK/GB2312 as saved by Chinese Excel.
 * The returned text never starts with a BOM.
 */
export function decodeCsvBytes(input: ArrayBuffer | Uint8Array): { text: string; encoding: CsvEncoding } {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8-bom' }
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'utf-16le' }
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'utf-16be' }
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' }
  } catch {
    return { text: new TextDecoder('gb18030').decode(bytes), encoding: 'gb18030' }
  }
}

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
  encoding: CsvEncoding
  /** First Papa parse error message, if any. */
  error: string | null
}

/** Parse already-decoded CSV text (first row is the header). */
export function parseCsvText(text: string): Omit<ParsedCsv, 'encoding'> {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })
  const rows = result.data
  const headers = (result.meta.fields ?? Object.keys(rows[0] ?? {})).filter(h => h !== '')
  return { headers, rows, error: result.errors.length > 0 ? result.errors[0].message : null }
}

/** Decode (with encoding detection) and parse CSV bytes. */
export function parseCsvBytes(input: ArrayBuffer | Uint8Array): ParsedCsv {
  const { text, encoding } = decodeCsvBytes(input)
  return { ...parseCsvText(text), encoding }
}

/** Read a File/Blob, detect its encoding and parse it as CSV. */
export async function readCsvFile(file: Blob): Promise<ParsedCsv> {
  return parseCsvBytes(await readBytes(file))
}

/** True when a file should go through the CSV parser rather than ExcelJS. */
export function isCsvFile(file: { name: string; type?: string }): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || name.endsWith('.txt')) return true
  const type = (file.type ?? '').toLowerCase()
  return type === 'text/csv' || type === 'application/csv' || type === 'text/plain'
}

function readBytes(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer()
  // Older jsdom / browsers without Blob.arrayBuffer.
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
