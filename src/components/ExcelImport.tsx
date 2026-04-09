import { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload,
  FileSpreadsheet,
  X,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Database,
  ArrowRight,
} from 'lucide-react'
import { Card, Badge } from '../design-system'
import { COLUMN_ALIASES, PTTEP_DEMO_DATA } from '../data/pttepDemoData'
import type { ExcelRow } from '../data/pttepDemoData'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface ColumnMapping {
  scope: string
  category: string
  source: string
  fuelOrFactor: string
  quantity: string
  unit: string
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'done'

interface Props {
  onImport: (rows: ExcelRow[]) => void
  onClose: () => void
}

/* ═══════════════════════════════════════════
   Smart column matcher
   ═══════════════════════════════════════════ */
function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { scope: '', category: '', source: '', fuelOrFactor: '', quantity: '', unit: '' }
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = lowerHeaders.findIndex(h => h === alias || h.includes(alias))
      if (idx !== -1 && !Object.values(mapping).includes(headers[idx])) {
        mapping[field as keyof ColumnMapping] = headers[idx]
        break
      }
    }
  }
  return mapping
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function ExcelImport({ onImport, onClose }: Props) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string | number>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({ scope: '', category: '', source: '', fuelOrFactor: '', quantity: '', unit: '' })
  const [mappedRows, setMappedRows] = useState<ExcelRow[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  /* ── Parse Excel file ── */
  const parseFile = useCallback((file: File) => {
    setError('')
    setParsing(true)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' })

        if (json.length === 0) {
          setError('The spreadsheet appears to be empty.')
          setParsing(false)
          return
        }

        const hdrs = Object.keys(json[0])
        setHeaders(hdrs)
        setRawRows(json)
        setMapping(autoMapColumns(hdrs))
        setStep('mapping')
      } catch {
        setError('Could not parse the file. Please ensure it is a valid .xlsx or .csv file.')
      }
      setParsing(false)
    }
    reader.readAsArrayBuffer(file)
  }, [])

  /* ── Drag & drop handlers ── */
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  /* ── Apply mapping ── */
  const applyMapping = () => {
    const rows: ExcelRow[] = rawRows.map((row) => ({
      scope: String(row[mapping.scope] ?? ''),
      category: String(row[mapping.category] ?? ''),
      source: String(row[mapping.source] ?? ''),
      fuelOrFactor: String(row[mapping.fuelOrFactor] ?? ''),
      quantity: Number(row[mapping.quantity]) || 0,
      unit: String(row[mapping.unit] ?? ''),
    })).filter(r => r.quantity > 0)
    setMappedRows(rows)
    setStep('preview')
  }

  /* ── Load demo data ── */
  const loadDemo = () => {
    setMappedRows(PTTEP_DEMO_DATA)
    setFileName('PTTEP_GHG_Inventory_2024.xlsx (demo)')
    setStep('preview')
  }

  /* ── Confirm import ── */
  const confirmImport = () => {
    onImport(mappedRows)
    setStep('done')
  }

  // Group preview rows by scope
  const grouped = mappedRows.reduce<Record<string, ExcelRow[]>>((acc, r) => {
    const key = r.scope || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const scopeColors: Record<string, string> = {
    'Scope 1': 'var(--accent-teal)',
    'Scope 2': 'var(--accent-blue)',
    'Scope 3': 'var(--accent-purple)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-teal-light)] border border-teal-100 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h2 className="font-display text-[var(--text-base)] font-bold text-[var(--text-primary)]">Import Emission Data</h2>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Upload Excel / CSV or load PTTEP demo data</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1.5">
              {['Upload', 'Map', 'Preview'].map((s, i) => {
                const stepIdx = ['upload', 'mapping', 'preview', 'done'].indexOf(step)
                const isActive = i <= stepIdx
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${isActive ? 'bg-[var(--accent-teal)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}>{i + 1}</div>
                    {i < 2 && <div className={`w-6 h-px transition-all ${isActive && i < stepIdx ? 'bg-[var(--accent-teal)]' : 'bg-[var(--border-default)]'}`} />}
                  </div>
                )
              })}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-5 animate-fade-in">
              <div
                className={`
                  relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer
                  ${isDragging
                    ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-subtle)]'
                    : 'border-[var(--border-default)] hover:border-[var(--accent-teal)] hover:bg-[var(--bg-secondary)]'
                  }
                `}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileSelect} className="hidden" />
                {parsing ? (
                  <Loader2 className="w-10 h-10 text-[var(--accent-teal)] animate-spin" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[var(--accent-teal-light)] border border-teal-100 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-[var(--accent-teal)]" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">
                    {parsing ? 'Parsing spreadsheet...' : 'Drop your Excel or CSV file here'}
                  </p>
                  <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1">
                    Supports .xlsx, .xls, .csv — columns are auto-detected
                  </p>
                </div>
                {error && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-100">
                    <AlertTriangle className="w-4 h-4 text-[var(--accent-red)]" />
                    <span className="text-[var(--text-xs)] text-[var(--accent-red)]">{error}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-[var(--border-default)]" />
                <span className="text-[var(--text-xs)] font-medium text-[var(--text-tertiary)]">or</span>
                <div className="flex-1 h-px bg-[var(--border-default)]" />
              </div>

              {/* Demo data button */}
              <button
                onClick={loadDemo}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--accent-teal)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-teal-light)] to-teal-50 border border-teal-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Database className="w-6 h-6 text-[var(--accent-teal)]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Load PTTEP Demo Data</p>
                  <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
                    Pre-loaded GHG inventory: {PTTEP_DEMO_DATA.length} emission sources across Scope 1, 2, 3 — Arthit, Bongkot, S1, Zawtika assets
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-teal)] group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Template hint */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-[var(--text-xs)] font-semibold text-[var(--text-secondary)] mb-2">Expected columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Scope', 'Category', 'Source / Facility', 'Fuel / Factor', 'Quantity', 'Unit'].map(col => (
                    <Badge key={col} variant="gray">{col}</Badge>
                  ))}
                </div>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-2">Column names are flexibly matched — "Fuel Type", "Energy Type", "Emission Factor" all map correctly.</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Column Mapping ── */}
          {step === 'mapping' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <FileSpreadsheet className="w-5 h-5 text-[var(--accent-teal)]" />
                <div className="flex-1">
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{fileName}</p>
                  <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{rawRows.length} rows &middot; {headers.length} columns detected</p>
                </div>
                <Badge variant="teal" dot>Auto-mapped</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(Object.keys(mapping) as (keyof ColumnMapping)[]).map(field => (
                  <div key={field}>
                    <label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5 capitalize">
                      {field === 'fuelOrFactor' ? 'Fuel / Factor' : field}
                      {field === 'quantity' && <span className="text-[var(--accent-red)]"> *</span>}
                    </label>
                    <div className="relative">
                      <select
                        value={mapping[field]}
                        onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full h-10 px-3 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1"
                      >
                        <option value="">— skip —</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview of first 3 raw rows */}
              <div>
                <p className="text-[var(--text-xs)] font-semibold text-[var(--text-secondary)] mb-2">Raw data preview (first 3 rows)</p>
                <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                  <table className="w-full text-[var(--text-xs)]">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)]">
                        {headers.map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap border-b border-[var(--border-subtle)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                          {headers.map(h => (
                            <td key={h} className="px-3 py-2 text-[var(--text-primary)] whitespace-nowrap">{String(row[h])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Preview mapped data ── */}
          {step === 'preview' && (
            <div className="space-y-5 animate-fade-in">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card padding="sm">
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Rows</p>
                  <p className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tabular-nums">{mappedRows.length}</p>
                </Card>
                {['Scope 1', 'Scope 2', 'Scope 3'].map(scope => (
                  <Card key={scope} padding="sm" className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60" style={{ background: `linear-gradient(90deg, ${scopeColors[scope]}, transparent)` }} />
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: scopeColors[scope] }}>{scope}</p>
                    <p className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tabular-nums">{grouped[scope]?.length ?? 0}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">sources</p>
                  </Card>
                ))}
              </div>

              {/* Grouped table */}
              {Object.entries(grouped).map(([scope, rows]) => (
                <div key={scope}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scopeColors[scope] ?? 'var(--text-tertiary)' }} />
                    <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{scope}</p>
                    <Badge variant={scope === 'Scope 1' ? 'teal' : scope === 'Scope 2' ? 'blue' : 'purple'}>{rows.length} rows</Badge>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                    <table className="w-full text-[var(--text-xs)]">
                      <thead>
                        <tr className="bg-[var(--bg-secondary)]">
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap border-b border-[var(--border-subtle)]">Category</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap border-b border-[var(--border-subtle)]">Source</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap border-b border-[var(--border-subtle)]">Fuel / Factor</th>
                          <th className="px-3 py-2 text-right font-semibold text-[var(--text-secondary)] whitespace-nowrap border-b border-[var(--border-subtle)]">Quantity</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap border-b border-[var(--border-subtle)]">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors">
                            <td className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap">{r.category}</td>
                            <td className="px-3 py-2 text-[var(--text-primary)] font-medium">{r.source}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">{r.fuelOrFactor}</td>
                            <td className="px-3 py-2 text-right text-[var(--text-primary)] tabular-nums font-medium">{r.quantity.toLocaleString()}</td>
                            <td className="px-3 py-2 text-[var(--text-tertiary)]">{r.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <h3 className="font-display text-[var(--text-lg)] font-bold text-[var(--text-primary)]">Data Imported Successfully</h3>
                <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1">
                  {mappedRows.length} emission sources loaded into calculators. Open any calculator to see the pre-populated data.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-default)] flex-shrink-0 bg-[var(--bg-secondary)]">
          <div className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
            {step === 'upload' && 'Drag a file or use demo data to get started'}
            {step === 'mapping' && `${rawRows.length} rows from ${fileName}`}
            {step === 'preview' && `${mappedRows.length} rows ready to import`}
          </div>
          <div className="flex items-center gap-2">
            {step !== 'upload' && step !== 'done' && (
              <button onClick={() => setStep(step === 'preview' ? (rawRows.length > 0 ? 'mapping' : 'upload') : 'upload')} className="h-9 px-4 rounded-lg text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
                Back
              </button>
            )}
            {step === 'mapping' && (
              <button onClick={applyMapping} disabled={!mapping.quantity} className="h-9 px-5 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                Preview Data <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {step === 'preview' && (
              <button onClick={confirmImport} className="h-9 px-5 rounded-lg bg-[var(--accent-teal)] text-white text-[var(--text-sm)] font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Import {mappedRows.length} Rows
              </button>
            )}
            {step === 'done' && (
              <button onClick={onClose} className="h-9 px-5 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
