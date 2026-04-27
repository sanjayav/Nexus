import { Fragment, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Download, Plus, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react'
import { PTTGC_REPORT, flattenRows, type PttgcReport, type ReportSection, type ReportTable, type ReportRow, type CellValue } from '../data/pttgcReport'
import PageHeader from '../components/PageHeader'
import Button from '../design-system/components/Button'
import JargonTooltip from '../components/JargonTooltip'

type ImportSummary = {
  year: number
  matched: number
  unmatched: number
  unmatchedSamples: string[]
}

export default function SustainabilityPerformanceReport() {
  const [report, setReport] = useState<PttgcReport>(() => structuredClone(PTTGC_REPORT))
  const [importOpen, setImportOpen] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const addYear = (year: number, rows: Record<string, CellValue>) => {
    setReport(prev => {
      const next = structuredClone(prev)
      if (!next.years.includes(year)) {
        next.years = [...next.years, year].sort((a, b) => a - b)
      }
      for (const section of next.sections) {
        for (const table of section.tables) {
          for (const row of table.rows) {
            row.values[year] = rows[row.id] ?? null
          }
        }
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Sustainability Performance Data"
        subtitle={(
          <>
            {report.organisation} —{' '}
            <JargonTooltip term="GRI">Global Reporting Initiative — the most widely-adopted standard for sustainability reporting. GRI Standards 2021 covers economic, environmental, and social topics with specific disclosures (e.g. 305-1 = direct GHG emissions).</JargonTooltip>
            {' / '}
            <JargonTooltip term="IFRS S1+S2">IFRS Sustainability Disclosure Standards — issued by the ISSB (International Sustainability Standards Board). S1 covers general sustainability-related financial disclosures; S2 specifically targets climate-related risks and opportunities.</JargonTooltip>
            {' / '}
            <JargonTooltip term="SASB">Sustainability Accounting Standards Board — industry-specific metrics designed for investor decision-useful disclosures. Now part of the IFRS Foundation alongside ISSB.</JargonTooltip>
            . Year columns are dynamic; import a new year to append a column.
          </>
        )}
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              icon={<Download className="w-4 h-4" />}
              onClick={() => downloadTemplate(report)}
            >
              Download Excel template
            </Button>
            <Button
              variant="brand"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => { setSummary(null); setImportOpen(true) }}
            >
              Add reporting year
            </Button>
          </>
        }
      />

      {summary && (
        <div className="surface-paper p-4 flex items-start gap-3 relative" style={{ borderColor: 'rgba(46,125,50,0.3)' }}>
          <CheckCircle2 className="w-5 h-5 text-[var(--status-ok)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-[var(--text-primary)]">
              {summary.year} column added · {summary.matched} indicator{summary.matched === 1 ? '' : 's'} populated
            </div>
            {summary.unmatched > 0 && (
              <div className="text-[12px] text-[var(--status-draft)] mt-1">
                {summary.unmatched} row(s) in the file did not match any indicator. Examples: {summary.unmatchedSamples.slice(0, 3).join(' · ')}
              </div>
            )}
          </div>
          <button onClick={() => setSummary(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cover */}
      <div className="surface-hero p-8">
        <div className="kicker mb-2">PTTGC</div>
        <h2 className="text-display text-[28px] text-[var(--text-primary)] mb-2">{report.subtitle}</h2>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          Operational performance for the period 1 January – 31 December, including companies in which GC holds 50%+ shares and HMC Polymers Co., Ltd. Prepared in accordance with{' '}
          <JargonTooltip term="GRI Standards 2021">The latest revision of the Global Reporting Initiative standards, modular by topic (universal, economic, environmental, social) — the de-facto sustainability reporting framework worldwide.</JargonTooltip>
          ,{' '}
          <JargonTooltip term="IFRS S1">General Requirements for Disclosure of Sustainability-related Financial Information — investors-first sustainability reporting baseline issued by the ISSB.</JargonTooltip>
          ,{' '}
          <JargonTooltip term="IFRS S2">Climate-related Disclosures — sets out specific requirements for reporting climate risks, opportunities, scenario analysis, and Scope 1/2/3 emissions.</JargonTooltip>
          , and{' '}
          <JargonTooltip term="SASB">Sustainability Accounting Standards Board — industry-specific KPIs (e.g. for chemicals, oil & gas) designed for investor relevance.</JargonTooltip>
          .
        </p>
      </div>

      {report.sections.map(section => (
        <SectionBlock key={section.id} section={section} years={report.years} />
      ))}

      {importOpen && (
        <AddYearModal
          report={report}
          onClose={() => setImportOpen(false)}
          onImport={(year, rows, summary) => {
            addYear(year, rows)
            setSummary(summary)
            setImportOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────
function SectionBlock({ section, years }: { section: ReportSection; years: number[] }) {
  const accent = section.scope === 'jv'
    ? { bg: '#7C3AED', label: 'JV' }
    : sectionAccent(section.id)

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-6 rounded-full" style={{ background: accent.bg }} />
        <h3 className="font-display text-[20px] font-bold text-[var(--text-primary)] tracking-[-0.01em]">{section.title}</h3>
        <span className="chip" style={{ background: `${accent.bg}15`, color: accent.bg, borderColor: `${accent.bg}40` }}>{accent.label}</span>
      </div>
      <div className="space-y-4">
        {section.tables.map(table => (
          <ReportTableBlock key={table.id} table={table} years={years} accent={accent.bg} />
        ))}
      </div>
    </section>
  )
}

function sectionAccent(id: ReportSection['id']): { bg: string; label: string } {
  switch (id) {
    case 'financial':   return { bg: '#1B6B7B', label: 'Financial Capital' }
    case 'manufacture': return { bg: '#3B8A9B', label: 'Manufacture Capital' }
    case 'human':       return { bg: '#E6A817', label: 'Human Capital' }
    case 'social':      return { bg: '#C2410C', label: 'Social Capital' }
    case 'natural':     return { bg: '#2E7D32', label: 'Natural Capital' }
    default:            return { bg: '#7C3AED', label: 'JV' }
  }
}

// ─── Table ────────────────────────────────────────────────────────────
function ReportTableBlock({ table, years, accent }: { table: ReportTable; years: number[]; accent: string }) {
  const hasSplit = table.rows.some(r => r.split === 'mf')

  return (
    <div className="surface-paper overflow-hidden">
      {table.title && (
        <div className="px-5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">{table.title}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] tabular-nums">
          <thead>
            <tr style={{ background: `${accent}10` }}>
              <th rowSpan={hasSplit ? 2 : 1} className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] text-[10.5px] border-b border-[var(--border-subtle)] w-[90px]">GRI</th>
              <th rowSpan={hasSplit ? 2 : 1} className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] text-[10.5px] border-b border-[var(--border-subtle)]">Required Data</th>
              <th rowSpan={hasSplit ? 2 : 1} className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] text-[10.5px] border-b border-[var(--border-subtle)] w-[140px]">Unit</th>
              {years.map(y => (
                <th key={y} colSpan={hasSplit ? 2 : 1} className="text-center px-4 py-2 font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] text-[10.5px] border-b border-[var(--border-subtle)] border-l border-[var(--border-subtle)]">
                  {y}
                </th>
              ))}
            </tr>
            {hasSplit && (
              <tr style={{ background: `${accent}08` }}>
                {years.map(y => (
                  <Fragment key={y}>
                    <th className="text-right px-3 py-1.5 font-medium text-[var(--text-tertiary)] text-[10px] border-b border-[var(--border-subtle)] border-l border-[var(--border-subtle)] w-[80px]">Male</th>
                    <th className="text-right px-3 py-1.5 font-medium text-[var(--text-tertiary)] text-[10px] border-b border-[var(--border-subtle)] w-[80px]">Female</th>
                  </Fragment>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {table.rows.map(row => (
              <ReportRowEl key={row.id} row={row} years={years} hasSplit={hasSplit} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReportRowEl({ row, years, hasSplit }: { row: ReportRow; years: number[]; hasSplit: boolean }) {
  const indent = row.indent ?? 0
  const isHeader = row.unit === '' && Object.values(row.values).every(v => v == null)
  return (
    <tr className={isHeader ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'}>
      <td className="px-4 py-2 text-[10.5px] font-mono text-[var(--text-tertiary)] align-top">{row.gri ?? ''}</td>
      <td className="px-4 py-2 text-[12px] text-[var(--text-primary)]" style={{ paddingLeft: 16 + indent * 16, fontWeight: isHeader ? 600 : 400 }}>
        {row.label}
      </td>
      <td className="px-4 py-2 text-[11.5px] text-[var(--text-tertiary)]">{row.unit}</td>
      {years.map(y => {
        const val = row.values[y]
        if (row.split === 'mf') {
          const mf = (val ?? null) as { male: number | null; female: number | null } | null
          return (
            <Fragment key={y}>
              <td className="px-3 py-2 text-right text-[12px] text-[var(--text-primary)] border-l border-[var(--border-subtle)]">{fmt(mf?.male ?? null)}</td>
              <td className="px-3 py-2 text-right text-[12px] text-[var(--text-primary)]">{fmt(mf?.female ?? null)}</td>
            </Fragment>
          )
        }
        return (
          <td
            key={y}
            colSpan={hasSplit ? 2 : 1}
            className="px-4 py-2 text-right text-[12px] text-[var(--text-primary)] border-l border-[var(--border-subtle)]"
          >
            {fmt(typeof val === 'number' ? val : null)}
          </td>
        )
      })}
    </tr>
  )
}

function fmt(n: number | null): string {
  if (n == null) return 'NA'
  if (n === 0) return '0'
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (Math.abs(n) < 1 && n !== 0) return n.toFixed(2)
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// ─── Add-Year Modal ───────────────────────────────────────────────────
function AddYearModal({ report, onClose, onImport }: {
  report: PttgcReport
  onClose: () => void
  onImport: (year: number, rows: Record<string, CellValue>, summary: ImportSummary) => void
}) {
  const nextYear = Math.max(...report.years) + 1
  const [year, setYear] = useState<number>(nextYear)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setError(null); setParsing(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        const { matched, unmatched, unmatchedSamples, rows } = mapExcelRows(report, json)
        onImport(year, rows, { year, matched, unmatched, unmatchedSamples })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse Excel')
      } finally {
        setParsing(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const loadDemo = () => {
    setError(null)
    // Synthesise a realistic 2026 set: small drift on every numeric historical value.
    const rows: Record<string, CellValue> = {}
    for (const { row } of flattenRows(report)) {
      const last = row.values[Math.max(...report.years)]
      if (last == null) {
        rows[row.id] = null
      } else if (typeof last === 'number') {
        rows[row.id] = roundLike(last, last * (0.95 + Math.random() * 0.1))
      } else {
        rows[row.id] = {
          male: last.male == null ? null : roundLike(last.male, last.male * (0.95 + Math.random() * 0.1)),
          female: last.female == null ? null : roundLike(last.female, last.female * (0.95 + Math.random() * 0.1)),
        }
      }
    }
    onImport(year, rows, { year, matched: Object.keys(rows).length, unmatched: 0, unmatchedSamples: [] })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="surface-paper max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="kicker">Append</span>
            <h2 className="text-display text-[20px] text-[var(--text-primary)] mt-0.5">Add reporting year</h2>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Upload an Excel with the year's values. Each row is matched by <span className="font-mono">id</span> (or by <span className="font-mono">GRI</span> + <span className="font-mono">Required Data</span>) to an existing indicator. Unmatched rows are flagged.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">Year</label>
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            min={2020}
            max={2100}
            className="w-full px-3 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none"
          />
        </div>

        <div
          className="border-2 border-dashed border-[var(--border-default)] rounded-[12px] p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--color-brand)] hover:bg-[var(--bg-secondary)] transition-all"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
          {parsing ? <Loader2 className="w-6 h-6 text-[var(--color-brand)] animate-spin" /> : <FileSpreadsheet className="w-6 h-6 text-[var(--color-brand)]" />}
          <div className="text-center">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">Drop your Excel for FY {year}</div>
            <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1">Use the downloaded template — the <span className="font-mono">id</span> column is the key</div>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-[8px] bg-red-50 border border-red-100">
            <AlertTriangle className="w-4 h-4 text-[var(--accent-red)]" />
            <span className="text-[12px] text-[var(--accent-red)]">{error}</span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={loadDemo} className="text-[12px] text-[var(--color-brand-strong)] hover:underline cursor-pointer">
            Or generate sample {year} data (demo)
          </button>
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function roundLike(prev: number, next: number): number {
  if (Number.isInteger(prev)) return Math.round(next)
  if (Math.abs(prev) < 10) return Math.round(next * 100) / 100
  return Math.round(next * 10) / 10
}

// ─── Excel mapping ────────────────────────────────────────────────────
function norm(s: string): string {
  return s.toLowerCase().trim().replace(/[\s_/-]+/g, ' ').replace(/[^\w ]/g, '')
}

function mapExcelRows(report: PttgcReport, raw: Record<string, unknown>[]): {
  matched: number
  unmatched: number
  unmatchedSamples: string[]
  rows: Record<string, CellValue>
} {
  const flat = flattenRows(report)
  const byId = new Map(flat.map(f => [f.row.id, f.row]))
  const byLabel = new Map(flat.map(f => [norm(f.row.label), f.row]))
  const byGriLabel = new Map(flat.map(f => [norm(`${f.row.gri ?? ''} ${f.row.label}`), f.row]))

  const out: Record<string, CellValue> = {}
  let matched = 0
  let unmatched = 0
  const unmatchedSamples: string[] = []

  for (const r of raw) {
    const idCol = pick(r, ['id', 'row id', 'indicator id'])
    const griCol = pick(r, ['gri', 'gri code', 'gri_code'])
    const labelCol = pick(r, ['required data', 'indicator', 'label', 'metric', 'description'])
    const valCol = pick(r, ['value', 'amount', 'qty', 'quantity'])
    const maleCol = pick(r, ['male', 'm'])
    const femaleCol = pick(r, ['female', 'f'])

    let row: ReportRow | undefined
    if (idCol) row = byId.get(String(idCol).trim())
    if (!row && labelCol) row = byLabel.get(norm(String(labelCol)))
    if (!row && griCol && labelCol) row = byGriLabel.get(norm(`${griCol} ${labelCol}`))

    if (!row) {
      unmatched += 1
      if (unmatchedSamples.length < 5) unmatchedSamples.push(String(labelCol ?? idCol ?? '?').slice(0, 60))
      continue
    }

    if (row.split === 'mf') {
      out[row.id] = {
        male: toNum(maleCol),
        female: toNum(femaleCol),
      }
    } else {
      out[row.id] = toNum(valCol)
    }
    matched += 1
  }

  return { matched, unmatched, unmatchedSamples, rows: out }
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  const lowered = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase().trim(), v]))
  for (const k of keys) {
    if (lowered[k] !== undefined && lowered[k] !== '') return lowered[k]
  }
  return undefined
}

function toNum(x: unknown): number | null {
  if (x === undefined || x === null || x === '') return null
  const n = Number(String(x).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

// ─── Excel template download ──────────────────────────────────────────
function downloadTemplate(report: PttgcReport) {
  const flat = flattenRows(report)
  const wb = XLSX.utils.book_new()
  const data = flat.map(({ section, table, row }) => {
    const lastYear = Math.max(...report.years)
    const last = row.values[lastYear]
    const row_: Record<string, unknown> = {
      Section: section,
      Table: table,
      id: row.id,
      GRI: row.gri ?? '',
      'Required Data': row.label,
      Unit: row.unit,
    }
    if (row.split === 'mf') {
      const mf = last as { male: number | null; female: number | null } | null
      row_.Male = mf?.male ?? ''
      row_.Female = mf?.female ?? ''
    } else {
      row_.Value = typeof last === 'number' ? last : ''
    }
    return row_
  })
  const sheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, sheet, 'Performance Data')
  XLSX.writeFile(wb, `PTTGC_Performance_Data_Template.xlsx`)
}
