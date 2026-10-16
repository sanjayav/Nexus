import { Fragment, useMemo, useRef, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import ExcelJS from 'exceljs'
import { Download, Plus, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react'
import { DEMO_REPORT, flattenRows, type DemoReport, type ReportSection, type ReportTable, type ReportRow, type CellValue } from '../data/demoReport'
import PageHeader from '../components/PageHeader'
import Button from '../design-system/components/Button'
import JargonTooltip from '../components/JargonTooltip'
import { StatLedger, StatusPill, notify, type StatLedgerItem } from '../components/ui'
import { useFmt } from '../lib/fmt'
import { i18nSlug } from '../reports/spdTemplate'
import ReportSheet from '../components/analytics/reports/ReportSheet'
import { EmissionsByScopeChart, EnergyChart, series } from '../components/analytics/reports/PerfCharts'

type ImportSummary = {
  year: number
  matched: number
  unmatched: number
  unmatchedSamples: string[]
}

export default function SustainabilityPerformanceReport() {
  const { t } = useTranslation()
  const [report, setReport] = useState<DemoReport>(() => structuredClone(DEMO_REPORT))
  const [importOpen, setImportOpen] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [downloading, setDownloading] = useState(false)

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

  const onDownload = async () => {
    setDownloading(true)
    try {
      await downloadTemplate(report)
      notify.success(t('perfReport.toast.templateReady'))
    } catch (e) {
      notify.error(t('perfReport.toast.templateFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setDownloading(false)
    }
  }

  const firstYear = report.years[0]
  const lastYear = report.years[report.years.length - 1]

  return (
    <div className="max-w-[1280px] mx-auto">
      <PageHeader
        breadcrumbs={[{ label: t('perfReport.breadcrumb.reports'), to: '/reports' }, { label: t('perfReport.breadcrumb.here') }]}
        title={t('perfReport.title')}
        subtitle={t('perfReport.subtitle')}
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              loading={downloading}
              icon={<Download className="w-4 h-4" />}
              onClick={() => { void onDownload() }}
            >
              {t('perfReport.actions.downloadTemplate')}
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => { setSummary(null); setImportOpen(true) }}
            >
              {t('perfReport.actions.addYear')}
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {summary && (
          <div
            role="status"
            className="rounded-[var(--radius-xl)] border border-[var(--status-success-line)] bg-[var(--status-success-soft)] p-4 flex items-start gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-[var(--status-success)] flex-shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="type-small font-semibold text-[var(--text-primary)]">
                {t('perfReport.summary.added', { year: summary.year, count: summary.matched })}
              </p>
              {summary.unmatched > 0 && (
                <p className="text-caption text-[var(--status-warning)] mt-1">
                  {t('perfReport.summary.unmatched', { count: summary.unmatched, examples: summary.unmatchedSamples.slice(0, 3).join(t('perfReport.summary.sep')) })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSummary(null)}
              aria-label={t('perfReport.summary.dismiss')}
              className="-m-2 w-10 h-10 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
        )}

        {/* ── Cover ── */}
        <section aria-labelledby="perf-cover" className="surface-hero p-6 sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <p className="text-small font-medium text-[var(--color-brand-strong)]">{t('perfReport.cover.title')}</p>
              <h2 id="perf-cover" className="type-display text-[var(--text-primary)] mt-2 text-balance">
                {report.organisation}
              </h2>
              <p className="type-h3 font-medium text-[var(--text-secondary)] mt-2 tabular-nums">
                {t('perfReport.cover.period', { from: firstYear, to: lastYear, count: report.years.length })}
              </p>
              <p className="type-body text-[var(--text-secondary)] mt-5 max-w-[68ch] text-pretty">
                {t('perfReport.cover.intro')}
                <JargonTooltip term="GRI Standards 2021">{t('perfReport.cover.jargon.gri2021')}</JargonTooltip>
                {t('perfReport.cover.sep')}
                <JargonTooltip term="IFRS S1">{t('perfReport.cover.jargon.ifrsS1')}</JargonTooltip>
                {t('perfReport.cover.sep')}
                <JargonTooltip term="IFRS S2">{t('perfReport.cover.jargon.ifrsS2')}</JargonTooltip>
                {t('perfReport.cover.and')}
                <JargonTooltip term="SASB">{t('perfReport.cover.jargon.sasb')}</JargonTooltip>
                {t('perfReport.cover.end')}
              </p>
            </div>
            <nav aria-label={t('perfReport.contents.title')} className="hidden md:block lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
              <p className="text-caption font-medium text-[var(--text-tertiary)]">{t('perfReport.contents.title')}</p>
              <ol className="mt-3 space-y-0.5">
                {report.sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#perf-${s.id}`}
                      onClick={e => {
                        e.preventDefault()
                        document.getElementById(`perf-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="group flex items-baseline gap-3 py-1.5 min-h-[32px] text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <span className="w-4 text-caption tabular-nums text-[var(--text-quaternary)] group-hover:text-[var(--color-brand)]">{i + 1}</span>
                      <span className="min-w-0">{t(`perfReport.demo.sections.${s.id}`, { defaultValue: s.title })}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </section>

        <KpiLedger report={report} />

        <div className="grid gap-5 lg:grid-cols-2">
          <EmissionsByScopeChart report={report} />
          <EnergyChart report={report} />
        </div>

        {report.sections.map((section, i) => (
          <SectionBlock key={section.id} section={section} years={report.years} index={i + 1} />
        ))}

        <p className="text-caption text-[var(--text-tertiary)] pt-2">{t('perfReport.footnote')}</p>
      </div>

      <AddYearSheet
        open={importOpen}
        report={report}
        onClose={() => setImportOpen(false)}
        onImport={(year, rows, s) => {
          addYear(year, rows)
          setSummary(s)
          setImportOpen(false)
          notify.success(t('perfReport.summary.added', { year: s.year, count: s.matched }))
        }}
      />
    </div>
  )
}

// ─── KPI ledger ───────────────────────────────────────────────────────
function KpiLedger({ report }: { report: DemoReport }) {
  const { t } = useTranslation()
  const f = useFmt()
  const items = useMemo<StatLedgerItem[]>(() => {
    // Latest year with a value, its predecessor, and the full spark series.
    const build = (
      id: string,
      values: Array<number | null>,
      opts: { unit: string; goodWhen: 'up' | 'down' | 'neutral'; compact?: boolean },
    ): StatLedgerItem => {
      const idx = values.map((v, i) => (v == null ? -1 : i)).filter(i => i >= 0)
      const li = idx[idx.length - 1]
      const pi = idx[idx.length - 2]
      const latest = li == null ? null : values[li]
      const prev = pi == null ? null : values[pi]
      const change = latest != null && prev != null && prev !== 0 ? ((latest - prev) / Math.abs(prev)) * 100 : null
      return {
        id,
        label: t(`perfReport.kpi.${id}`),
        value: latest,
        format: opts.compact ? (n: number) => f.compact(n) : (n: number) => f.number(n, { maxFraction: 0 }),
        unit: opts.unit,
        tone: 'neutral',
        delta: change == null ? undefined : { value: change, percent: true, goodWhen: opts.goodWhen, label: t('perfReport.kpi.vs', { year: report.years[pi] }) },
        spark: values.filter((v): v is number => v != null),
        hint: li == null ? t('perfReport.kpi.noData') : undefined,
      }
    }
    const MT = 1_000_000
    const s1 = series(report, 'nc-ghg-s1', MT)
    const s2 = series(report, 'nc-ghg-s2', MT)
    const s12 = s1.map((v, i) => (v == null && s2[i] == null ? null : (v ?? 0) + (s2[i] ?? 0)))
    return [
      build('scope12', s12, { unit: f.unit('tCO2e'), goodWhen: 'down', compact: true }),
      build('scope3', series(report, 'nc-ghg-s3', MT), { unit: f.unit('tCO2e'), goodWhen: 'down', compact: true }),
      build('energy', series(report, 'nc-en-total'), { unit: 'MWh', goodWhen: 'down', compact: true }),
      build('water', series(report, 'nc-water-w'), { unit: t('perfReport.kpi.mlUnit'), goodWhen: 'down', compact: true }),
      build('employees', series(report, 'hc-total-employee'), { unit: t('perfReport.kpi.personsUnit'), goodWhen: 'neutral' }),
    ]
  }, [report, t, f])
  const last = report.years[report.years.length - 1]
  return (
    <section aria-labelledby="perf-kpi">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 id="perf-kpi" className="type-h3 text-[var(--text-primary)]">{t('perfReport.kpi.title', { year: last })}</h2>
        <span className="text-caption text-[var(--text-tertiary)]">{t('perfReport.kpi.scope')}</span>
      </div>
      <StatLedger items={items} aria-label={t('perfReport.kpi.title', { year: last })} />
    </section>
  )
}

// ─── Section ──────────────────────────────────────────────────────────
function SectionBlock({ section, years, index }: { section: ReportSection; years: number[]; index: number }) {
  const { t } = useTranslation()
  const indicators = section.tables.reduce((n, tb) => n + tb.rows.filter(r => r.unit !== '').length, 0)
  return (
    <section id={`perf-${section.id}`} aria-labelledby={`perf-${section.id}-h`} className="scroll-mt-6 pt-6">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4 pb-3 border-b border-[var(--border-default)]">
        <span className="type-h2 tabular-nums text-[var(--text-quaternary)]" aria-hidden>{index}</span>
        <h2 id={`perf-${section.id}-h`} className="type-h2 text-[var(--text-primary)]">
          {t(`perfReport.demo.sections.${section.id}`, { defaultValue: section.title })}
        </h2>
        {section.scope === 'jv' && <StatusPill tone="info" size="sm">{t('perfReport.section.jv')}</StatusPill>}
        <span className="text-caption text-[var(--text-tertiary)] sm:ml-auto">{t('perfReport.section.count', { count: indicators })}</span>
      </header>
      <div className="space-y-4">
        {section.tables.map(table => (
          <ReportTableBlock key={table.id} table={table} years={years} />
        ))}
      </div>
    </section>
  )
}

// ─── Table ────────────────────────────────────────────────────────────
const TH = 'px-4 py-2.5 text-caption font-medium text-[var(--text-secondary)] whitespace-nowrap'
// Below sm the label column stays pinned while the year columns scroll.
const STICKY = 'sticky left-0 z-[1] sm:static shadow-[1px_0_0_var(--border-subtle)] sm:shadow-none'

function ReportTableBlock({ table, years }: { table: ReportTable; years: number[] }) {
  const { t } = useTranslation()
  const hasSplit = table.rows.some(r => r.split === 'mf')
  const last = years[years.length - 1]
  const title = table.title ? t(`perfReport.demo.tables.${table.id}`, { defaultValue: table.title }) : null

  return (
    <div className="surface-paper overflow-hidden">
      {title && (
        <div className="px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)]">
          <h3 className="type-small font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full tabular-nums border-collapse">
          {title && <caption className="sr-only">{title}</caption>}
          <thead className="bg-[var(--bg-secondary)]">
            <tr>
              <th scope="col" rowSpan={hasSplit ? 2 : 1} className={`${TH} text-left w-[96px] hidden sm:table-cell`}>{t('perfReport.table.gri')}</th>
              <th scope="col" rowSpan={hasSplit ? 2 : 1} className={`${TH} ${STICKY} bg-[var(--bg-secondary)] text-left min-w-[180px] sm:min-w-[240px]`}>{t('perfReport.table.requiredData')}</th>
              <th scope="col" rowSpan={hasSplit ? 2 : 1} className={`${TH} text-left min-w-[120px] hidden sm:table-cell`}>{t('perfReport.table.unit')}</th>
              {years.map(y => (
                <th
                  key={y}
                  scope="colgroup"
                  colSpan={hasSplit ? 2 : 1}
                  className={`${TH} text-right border-l border-[var(--border-subtle)] ${y === last ? 'text-[var(--text-primary)] font-semibold' : ''}`}
                >
                  {y}
                </th>
              ))}
            </tr>
            {hasSplit && (
              <tr className="border-t border-[var(--border-subtle)]">
                {years.map(y => (
                  <Fragment key={y}>
                    <th scope="col" className={`${TH} py-1.5 text-right text-[var(--text-tertiary)] border-l border-[var(--border-subtle)] min-w-[76px]`}>{t('perfReport.table.male')}</th>
                    <th scope="col" className={`${TH} py-1.5 text-right text-[var(--text-tertiary)] min-w-[76px]`}>{t('perfReport.table.female')}</th>
                  </Fragment>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
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
  const { t } = useTranslation()
  const f = useFmt()
  const na = t('perfReport.table.na')
  const indent = row.indent ?? 0
  const isHeader = row.unit === '' && Object.values(row.values).every(v => v == null)
  const last = years[years.length - 1]
  const cell = (n: number | null) => (n == null ? <span className="text-[var(--text-quaternary)]">{na}</span> : f.exact(n))
  const unitLabel = row.unit ? f.unit(t(`perfReport.demo.units.${i18nSlug(row.unit)}`, { defaultValue: row.unit })) : ''
  const valueClass = (y: number) => `text-small text-right whitespace-nowrap ${y === last ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`

  if (isHeader) {
    return (
      <tr className="bg-[var(--bg-secondary)]">
        <td className="px-4 py-2 text-caption font-mono text-[var(--text-tertiary)] align-top whitespace-nowrap hidden sm:table-cell">{row.gri ?? ''}</td>
        <th scope="rowgroup" colSpan={2 + years.length * (hasSplit ? 2 : 1)} className="px-4 py-2 text-left type-small font-semibold text-[var(--text-primary)]">
          <span className="sticky left-4 sm:static">{t(`perfReport.demo.rows.${row.id}`, { defaultValue: row.label })}</span>
          {row.gri && <span className="sm:hidden ml-2 text-caption font-mono font-normal text-[var(--text-tertiary)]">{row.gri}</span>}
        </th>
      </tr>
    )
  }

  return (
    <tr className="group hover:bg-[var(--bg-hover)] transition-colors">
      <td className="px-4 py-2.5 text-caption font-mono text-[var(--text-tertiary)] align-top whitespace-nowrap hidden sm:table-cell">{row.gri ?? ''}</td>
      <th scope="row" className={`${STICKY} bg-[var(--bg-primary)] group-hover:bg-[var(--bg-hover)] sm:bg-transparent px-4 py-2.5 text-left text-small font-normal text-[var(--text-primary)]`} style={{ paddingLeft: 16 + indent * 12 }}>
        {t(`perfReport.demo.rows.${row.id}`, { defaultValue: row.label })}
        <span className="block sm:hidden mt-0.5 text-caption text-[var(--text-tertiary)]">
          {[unitLabel, row.gri].filter(Boolean).join(' · ')}
        </span>
      </th>
      <td className="px-4 py-2.5 text-caption text-[var(--text-tertiary)] hidden sm:table-cell">{unitLabel}</td>
      {years.map(y => {
        const val = row.values[y]
        if (row.split === 'mf') {
          const mf = (val ?? null) as { male: number | null; female: number | null } | null
          return (
            <Fragment key={y}>
              <td className={`px-3 py-2.5 border-l border-[var(--border-subtle)] ${valueClass(y)}`}>{cell(mf?.male ?? null)}</td>
              <td className={`px-3 py-2.5 ${valueClass(y)}`}>{cell(mf?.female ?? null)}</td>
            </Fragment>
          )
        }
        return (
          <td key={y} colSpan={hasSplit ? 2 : 1} className={`px-4 py-2.5 border-l border-[var(--border-subtle)] ${valueClass(y)}`}>
            {cell(typeof val === 'number' ? val : null)}
          </td>
        )
      })}
    </tr>
  )
}

// ─── Add-year sheet ───────────────────────────────────────────────────
function AddYearSheet({ open, report, onClose, onImport }: {
  open: boolean
  report: DemoReport
  onClose: () => void
  onImport: (year: number, rows: Record<string, CellValue>, summary: ImportSummary) => void
}) {
  const { t } = useTranslation()
  const nextYear = Math.max(...report.years) + 1
  const [year, setYear] = useState<number>(nextYear)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const yearExists = report.years.includes(year)

  // Reset the form each time the sheet opens.
  const [openedFor, setOpenedFor] = useState<boolean>(false)
  if (open !== openedFor) {
    setOpenedFor(open)
    if (open) {
      setYear(nextYear)
      setError(null)
      setParsing(false)
    }
  }

  const handleFile = (file: File) => {
    setError(null); setParsing(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(data)
        const sheet = wb.worksheets[0]
        if (!sheet) throw new Error(t('perfReport.modal.noSheets'))

        // First row is the header. Build header list, then map each row to
        // a `{ header: value }` record — same shape XLSX.sheet_to_json gave.
        const headerRow = sheet.getRow(1)
        const headers: string[] = []
        const colCount = sheet.actualColumnCount || sheet.columnCount || 0
        for (let i = 1; i <= colCount; i++) {
          headers.push(String(headerRow.getCell(i).value ?? '').trim())
        }

        const json: Record<string, unknown>[] = []
        sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return
          const obj: Record<string, unknown> = {}
          headers.forEach((h, i) => {
            if (!h) return
            const v = row.getCell(i + 1).value
            if (v == null) {
              obj[h] = ''
            } else if (typeof v === 'object') {
              const o = v as { result?: unknown; text?: unknown; richText?: { text?: unknown }[] }
              if (o.result != null) obj[h] = o.result
              else if (o.text != null) obj[h] = o.text
              else if (Array.isArray(o.richText)) obj[h] = o.richText.map((rt) => String(rt?.text ?? '')).join('')
              else obj[h] = v
            } else {
              obj[h] = v
            }
          })
          json.push(obj)
        })

        const { matched, unmatched, unmatchedSamples, rows } = mapExcelRows(report, json)
        onImport(year, rows, { year, matched, unmatched, unmatchedSamples })
      } catch (err) {
        setError(err instanceof Error ? err.message : t('perfReport.modal.parseFailed'))
      } finally {
        setParsing(false)
      }
    }
    reader.onerror = () => {
      setError(t('perfReport.modal.parseFailed'))
      setParsing(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const loadDemo = () => {
    setError(null)
    // Synthesise a realistic year: small drift on every numeric historical value.
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
    <ReportSheet
      open={open}
      onClose={onClose}
      busy={parsing}
      kicker={t('perfReport.modal.kicker')}
      title={t('perfReport.modal.title')}
      description={<Trans i18nKey="perfReport.modal.description" components={{ mono: <code className="font-mono text-[var(--text-primary)]" /> }} />}
      footer={
        <>
          <button
            type="button"
            onClick={loadDemo}
            disabled={parsing}
            className="text-small font-medium text-[var(--color-brand-strong)] hover:underline underline-offset-4 min-h-[40px] text-left disabled:opacity-50"
          >
            {t('perfReport.modal.generateSample', { year })}
          </button>
          <Button variant="secondary" size="md" onClick={onClose} disabled={parsing}>{t('common.cancel')}</Button>
        </>
      }
    >
      <label htmlFor="perf-year" className="block text-small font-medium text-[var(--text-primary)] mb-1.5">{t('perfReport.modal.year')}</label>
      <input
        id="perf-year"
        type="number"
        inputMode="numeric"
        value={year}
        onChange={e => setYear(Number(e.target.value))}
        min={2020}
        max={2100}
        aria-describedby={yearExists ? 'perf-year-hint' : undefined}
        className="w-full px-3 h-10 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body tabular-nums text-[var(--text-primary)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] outline-none"
      />
      {yearExists && (
        <p id="perf-year-hint" className="mt-1.5 text-caption text-[var(--status-warning)]">{t('perfReport.modal.yearExists', { year })}</p>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        disabled={parsing}
        className={`mt-4 w-full rounded-[var(--radius-xl)] border border-dashed p-6 flex flex-col items-center gap-3 transition-colors ${
          dragging ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--border-strong)] hover:border-[var(--color-brand)] hover:bg-[var(--bg-secondary)]'
        }`}
      >
        {parsing ? (
          <Loader2 className="w-6 h-6 text-[var(--color-brand)] animate-spin" aria-hidden />
        ) : (
          <FileSpreadsheet className="w-6 h-6 text-[var(--color-brand)]" aria-hidden />
        )}
        <span className="text-center">
          <span className="block type-small font-semibold text-[var(--text-primary)]">
            {parsing ? t('perfReport.modal.parsing') : t('perfReport.modal.drop', { year })}
          </span>
          <span className="block text-caption text-[var(--text-tertiary)] mt-1">
            <Trans i18nKey="perfReport.modal.dropHint" components={{ mono: <code className="font-mono" /> }} />
          </span>
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--status-danger-soft)] border border-[var(--status-danger-line)]">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--status-danger)]" aria-hidden />
          <span className="text-small text-[var(--status-danger)]">{error}</span>
        </div>
      )}
    </ReportSheet>
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

function mapExcelRows(report: DemoReport, raw: Record<string, unknown>[]): {
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
async function downloadTemplate(report: DemoReport) {
  const flat = flattenRows(report)
  const lastYear = Math.max(...report.years)

  // Always emit the same column set so the importer's `pick(...)` aliases
  // line up regardless of whether the row is split male/female or not.
  const columns = ['Section', 'Table', 'id', 'GRI', 'Required Data', 'Unit', 'Value', 'Male', 'Female'] as const

  const data = flat.map(({ section, table, row }) => {
    const last = row.values[lastYear]
    const out: Record<string, unknown> = {
      Section: section,
      Table: table,
      id: row.id,
      GRI: row.gri ?? '',
      'Required Data': row.label,
      Unit: row.unit,
      Value: '',
      Male: '',
      Female: '',
    }
    if (row.split === 'mf') {
      const mf = last as { male: number | null; female: number | null } | null
      out.Male = mf?.male ?? ''
      out.Female = mf?.female ?? ''
    } else {
      out.Value = typeof last === 'number' ? last : ''
    }
    return out
  })

  const wb = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet('Performance Data')
  sheet.columns = columns.map((c) => ({ header: c, key: c }))
  sheet.addRows(data)

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Demo_Performance_Data_Template.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
