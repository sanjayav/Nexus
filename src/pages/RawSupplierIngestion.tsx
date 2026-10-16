import { useState, useCallback, useMemo, useRef } from 'react'
import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Keyboard,
  FileSpreadsheet,
  Plug,
  ScanText,
  ShieldCheck,
  Brain,
  Sparkles,
  Router,
  Database,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Columns,
  ArrowRight,
  Search,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { Button } from '../design-system'
import { EmptyState, StatLedger, StatusPill, notify } from '../components/ui'
import ModuleHeader from '../components/analytics/data/ModuleHeader'
import DropZone from '../components/analytics/data/DropZone'
import StepNav from '../components/analytics/data/StepNav'
import ProcessFlow from '../components/analytics/data/ProcessFlow'
import SplitBar from '../components/analytics/data/SplitBar'
import { decodeCsvBytes } from '../lib/csv'
import { useFmt } from '../lib/fmt'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface ParsedSheet {
  name: string
  headers: string[]
  rows: string[][]
  rowCount: number
  colCount: number
}

interface UploadedFile {
  name: string
  size: number
  type: string
  sheets: ParsedSheet[]
  uploadedAt: Date
}

interface ColumnMapping {
  source: string
  target: string
}

type Step = 'upload' | 'preview' | 'mapping' | 'pipeline' | 'history'

const MAX_BYTES = 50 * 1024 * 1024
const ACCEPT = '.xlsx,.csv,.tsv,.txt'

/* ── Mapping target fields (GHG data model) ── */
const TARGET_FIELDS = [
  { value: '', label: '— Skip column —' },
  { value: 'facility_name', label: 'Facility / Site Name' },
  { value: 'source_id', label: 'Source ID' },
  { value: 'source_type', label: 'Source Type' },
  { value: 'emission_scope', label: 'Emission Scope (1/2/3)' },
  { value: 'activity_type', label: 'Activity Type' },
  { value: 'fuel_type', label: 'Fuel Type' },
  { value: 'quantity', label: 'Quantity / Amount' },
  { value: 'unit', label: 'Unit' },
  { value: 'emission_factor', label: 'Emission Factor' },
  { value: 'ef_unit', label: 'EF Unit' },
  { value: 'co2e_tonnes', label: 'CO₂e (tonnes)' },
  { value: 'co2', label: 'CO₂ (tonnes)' },
  { value: 'ch4', label: 'CH₄ (tonnes)' },
  { value: 'n2o', label: 'N₂O (tonnes)' },
  { value: 'reporting_period', label: 'Reporting Period' },
  { value: 'date', label: 'Date' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'supplier_name', label: 'Supplier Name' },
  { value: 'notes', label: 'Notes / Comments' },
]

/** Display label for a target field. `value` stays the stable id; the English
 *  label in TARGET_FIELDS is the fallback. */
function fieldLabel(t: TFunction, value: string): string {
  const english = TARGET_FIELDS.find((f) => f.value === value)?.label ?? value
  return t(`supplier.fields.${value || 'skip'}`, { defaultValue: english })
}

/* ── Auto-mapping heuristics (EN + common Chinese headers) ── */
function autoMapColumn(header: string): string {
  const h = header.toLowerCase().trim()
  if (/facilit|site|plant|location name|工厂|厂区|设施|站点/.test(h)) return 'facility_name'
  if (/source.?id|排放源编号/.test(h)) return 'source_id'
  if (/source.?type|emission.?source|排放源/.test(h)) return 'source_type'
  if (/scope|范围/.test(h)) return 'emission_scope'
  if (/activity.?type|activity|活动/.test(h)) return 'activity_type'
  if (/fuel.?type|fuel|燃料/.test(h)) return 'fuel_type'
  if (/quantit|amount|volume|consumption|数量|用量|消耗量/.test(h)) return 'quantity'
  if (/^unit$|^units$|uom|^单位$/.test(h)) return 'unit'
  if (/emission.?factor|^ef$|排放因子/.test(h)) return 'emission_factor'
  if (/ef.?unit|因子单位/.test(h)) return 'ef_unit'
  if (/co2e|co₂e|total.?emission|tco2|二氧化碳当量|排放量/.test(h)) return 'co2e_tonnes'
  if (/^co2$|^co₂$|carbon.?dioxide|二氧化碳/.test(h)) return 'co2'
  if (/ch4|methane|甲烷/.test(h)) return 'ch4'
  if (/n2o|nitrous|氧化亚氮/.test(h)) return 'n2o'
  if (/period|year|fy|报告期|年度/.test(h)) return 'reporting_period'
  if (/date|month|timestamp|日期|月份/.test(h)) return 'date'
  if (/country|国家/.test(h)) return 'country'
  if (/region|state|province|地区|省/.test(h)) return 'region'
  if (/supplier|vendor|供应商/.test(h)) return 'supplier_name'
  if (/note|comment|remark|备注/.test(h)) return 'notes'
  return ''
}

/* ── Pipeline stages ── */
const PIPELINE_STAGES = [
  { id: 'schema', icon: ShieldCheck },
  { id: 'semantic', icon: Brain },
  { id: 'enrichment', icon: Sparkles },
  { id: 'routing', icon: Router },
  { id: 'repository', icon: Database },
] as const

/* ── File parsing ── */
class ParseError extends Error {
  constructor(public code: 'xls' | 'tooLarge' | 'empty' | 'unreadable', detail?: string) {
    super(detail ?? code)
  }
}

function sheetFromGrid(name: string, grid: string[][]): ParsedSheet {
  const headers = (grid[0] || []).map((h) => String(h).trim())
  const rows = grid.slice(1).filter((r) => r.some((c) => c !== ''))
  return { name, headers, rows, rowCount: rows.length, colCount: headers.length }
}

async function parseWorkbook(file: File): Promise<ParsedSheet[]> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  if (file.size > MAX_BYTES) throw new ParseError('tooLarge')
  if (ext === 'xls') throw new ParseError('xls')
  const data = await file.arrayBuffer()

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    // Encoding detection handles Chinese Excel's GB18030 "CSV (逗号分隔)".
    const { text } = decodeCsvBytes(data)
    const res = Papa.parse<string[]>(text, { skipEmptyLines: true, delimiter: ext === 'tsv' ? '\t' : '' })
    const grid = (res.data as string[][]).map((r) => r.map((c) => String(c ?? '')))
    return [sheetFromGrid(file.name.replace(/\.[^.]+$/, ''), grid)]
  }

  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(data)
  } catch (e) {
    throw new ParseError('unreadable', e instanceof Error ? e.message : String(e))
  }
  // Cell value coercion — everything as a string, empty cells as ''.
  const toCell = (v: unknown): string => {
    if (v == null) return ''
    if (v instanceof Date) return v.toISOString()
    if (typeof v === 'object') {
      const obj = v as { result?: unknown; text?: unknown; richText?: { text?: unknown }[]; hyperlink?: unknown }
      if (obj.result != null) return String(obj.result)
      if (obj.text != null) return String(obj.text)
      if (Array.isArray(obj.richText)) return obj.richText.map((rt) => String(rt?.text ?? '')).join('')
      if (obj.hyperlink != null) return String(obj.hyperlink)
    }
    return String(v)
  }
  return workbook.worksheets.map((ws) => {
    const colCount = ws.actualColumnCount || ws.columnCount || 0
    const grid: string[][] = []
    ws.eachRow({ includeEmpty: false }, (row) => {
      const arr: string[] = new Array(colCount).fill('')
      for (let i = 1; i <= colCount; i++) arr[i - 1] = toCell(row.getCell(i).value)
      grid.push(arr)
    })
    return sheetFromGrid(ws.name, grid)
  })
}

function fileSize(bytes: number, f: ReturnType<typeof useFmt>): string {
  return bytes > 1024 * 1024 ? `${f.number(bytes / (1024 * 1024), { precision: 1 })} MB` : `${f.number(bytes / 1024, { precision: 1 })} KB`
}

/* ═══════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════ */
export default function RawSupplierIngestion() {
  const { t } = useTranslation()
  const f = useFmt()
  const [step, setStep] = useState<Step>('upload')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [activeFile, setActiveFile] = useState<UploadedFile | null>(null)
  const [activeSheetIdx, setActiveSheetIdx] = useState(0)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [mappingDone, setMappingDone] = useState(false)
  const [parsing, setParsing] = useState(false)
  const pickerRef = useRef<HTMLInputElement>(null)

  const loadSheet = useCallback((file: UploadedFile, idx: number) => {
    setActiveFile(file)
    setActiveSheetIdx(idx)
    setMappingDone(false)
    const sheet = file.sheets[idx]
    setMappings(sheet ? sheet.headers.map((h) => ({ source: h, target: autoMapColumn(h) })) : [])
  }, [])

  /* ── Parse file ── */
  const parseFile = useCallback(
    async (file: File) => {
      setParsing(true)
      try {
        const sheets = await parseWorkbook(file)
        const rows = sheets.reduce((a, s) => a + s.rowCount, 0)
        if (sheets.length === 0 || rows === 0) throw new ParseError('empty')
        const uploaded: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
          sheets,
          uploadedAt: new Date(),
        }
        setUploadedFiles((prev) => [uploaded, ...prev])
        const firstWithRows = Math.max(0, sheets.findIndex((s) => s.rowCount > 0))
        loadSheet(uploaded, firstWithRows)
        const mapped = sheets[firstWithRows].headers.filter((h) => autoMapColumn(h)).length
        notify.success(t('supplier.toast.parsed', { file: file.name, rows: f.number(rows) }), {
          description: t('supplier.toast.autoMapped', { mapped, total: sheets[firstWithRows].colCount }),
        })
        setStep('preview')
      } catch (err) {
        const code = err instanceof ParseError ? err.code : 'unreadable'
        notify.error(t(`supplier.errors.${code}.title`), {
          description: t(`supplier.errors.${code}.body`, { max: '50 MB' }),
        })
      } finally {
        setParsing(false)
      }
    },
    [f, loadSheet, t],
  )

  const updateMapping = useCallback((colIdx: number, target: string) => {
    setMappingDone(false)
    setMappings((prev) => prev.map((m, i) => (i === colIdx ? { ...m, target } : m)))
  }, [])

  const clearHistory = () => {
    const snapshot = { uploadedFiles, activeFile, activeSheetIdx, mappings, mappingDone, step }
    setUploadedFiles([])
    setActiveFile(null)
    setActiveSheetIdx(0)
    setMappings([])
    setMappingDone(false)
    setStep('upload')
    notify.success(t('supplier.toast.cleared', { count: snapshot.uploadedFiles.length }), {
      undo: () => {
        setUploadedFiles(snapshot.uploadedFiles)
        setActiveFile(snapshot.activeFile)
        setActiveSheetIdx(snapshot.activeSheetIdx)
        setMappings(snapshot.mappings)
        setMappingDone(snapshot.mappingDone)
        setStep('history')
      },
    })
  }

  const activeSheet = activeFile?.sheets[activeSheetIdx] ?? null
  const mappedCount = mappings.filter((m) => m.target !== '').length
  const totalUploaded = uploadedFiles.reduce((acc, file) => acc + file.sheets.reduce((a, s) => a + s.rowCount, 0), 0)

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={t('supplier.title')}
        description={t('supplier.subtitle')}
        actions={
          <>
            <Button variant="primary" icon={<Upload className="w-4 h-4" />} loading={parsing} onClick={() => pickerRef.current?.click()}>
              {t('supplier.uploadFile')}
            </Button>
            <input
              ref={pickerRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-label={t('supplier.uploadFile')}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) parseFile(file)
                e.target.value = ''
              }}
            />
          </>
        }
      />

      <StepNav
        aria-label={t('supplier.stepsAria')}
        active={step}
        onSelect={(id) => setStep(id as Step)}
        steps={[
          { id: 'upload', label: t('supplier.tabs.upload'), done: !!activeSheet },
          { id: 'preview', label: t('supplier.tabs.preview'), done: !!activeSheet && step !== 'preview' && step !== 'upload', locked: !activeSheet, count: activeSheet ? f.number(activeSheet.rowCount) : undefined },
          { id: 'mapping', label: t('supplier.tabs.mapping'), done: mappingDone, locked: !activeSheet, count: activeSheet ? `${mappedCount}/${mappings.length}` : undefined },
          { id: 'pipeline', label: t('supplier.tabs.pipeline'), done: mappingDone && step !== 'pipeline', locked: !mappingDone },
        ]}
        trailing={[{ id: 'history', label: t('supplier.tabs.history'), count: uploadedFiles.length || undefined }]}
      />

      {step === 'upload' && (
        <UploadTab parsing={parsing} onFile={parseFile} uploadedFiles={uploadedFiles} totalRows={totalUploaded} />
      )}

      {step === 'preview' &&
        (activeSheet && activeFile ? (
          <DataPreview
            file={activeFile}
            sheet={activeSheet}
            sheetIdx={activeSheetIdx}
            mappings={mappings}
            onSwitchSheet={(i) => loadSheet(activeFile, i)}
            onGoToMapping={() => setStep('mapping')}
          />
        ) : (
          <EmptyState
            art="upload"
            title={t('supplier.empty.noFile')}
            body={t('supplier.empty.noFileSub')}
            cta={{ label: t('supplier.empty.goToUpload'), onClick: () => setStep('upload') }}
          />
        ))}

      {step === 'mapping' &&
        (activeSheet ? (
          <ColumnMappingTab
            sheet={activeSheet}
            mappings={mappings}
            onUpdate={updateMapping}
            onBack={() => setStep('preview')}
            onConfirm={() => {
              setMappingDone(true)
              setStep('pipeline')
              notify.success(t('supplier.toast.mapped', { mapped: mappedCount, rows: f.number(activeSheet.rowCount) }))
            }}
          />
        ) : (
          <EmptyState
            art="upload"
            title={t('supplier.empty.noMapData')}
            body={t('supplier.empty.noMapDataSub')}
            cta={{ label: t('supplier.empty.goToUpload'), onClick: () => setStep('upload') }}
          />
        ))}

      {step === 'pipeline' && (
        <PipelineTab
          hasData={!!activeSheet}
          mappingDone={mappingDone}
          rowCount={activeSheet?.rowCount ?? 0}
          fileName={activeFile?.name ?? ''}
          onGoToMapping={() => setStep(activeSheet ? 'mapping' : 'upload')}
        />
      )}

      {step === 'history' && (
        <HistoryTab
          files={uploadedFiles}
          activeName={activeFile?.name}
          onSelect={(file) => {
            loadSheet(file, 0)
            setStep('preview')
          }}
          onClear={clearHistory}
          onUpload={() => setStep('upload')}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   1 · Upload
   ═══════════════════════════════════════════ */
const CHANNELS = [
  { id: 'csv', icon: FileSpreadsheet, active: true },
  { id: 'manual', icon: Keyboard, active: false },
  { id: 'api', icon: Plug, active: false },
  { id: 'ocr', icon: ScanText, active: false },
] as const

function UploadTab({
  parsing,
  onFile,
  uploadedFiles,
  totalRows,
}: {
  parsing: boolean
  onFile: (file: File) => void
  uploadedFiles: UploadedFile[]
  totalRows: number
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <StatLedger
        items={[
          { id: 'files', label: t('supplier.upload.kpiFiles'), value: uploadedFiles.length, tone: 'brand' },
          { id: 'rows', label: t('supplier.upload.kpiRows'), value: totalRows, tone: 'neutral' },
          { id: 'sheets', label: t('supplier.upload.kpiSheets'), value: uploadedFiles.reduce((a, file) => a + file.sheets.length, 0), tone: 'neutral' },
          {
            id: 'status',
            label: t('supplier.upload.kpiStatus'),
            value: parsing ? t('supplier.upload.statusParsing') : t('supplier.upload.statusReady'),
            tone: parsing ? 'info' : 'success',
          },
        ]}
      />

      <DropZone
        accept={ACCEPT}
        onFile={onFile}
        busy={parsing}
        title={t('supplier.upload.dropPrompt')}
        dragTitle={t('supplier.upload.dropHere')}
        busyTitle={t('supplier.upload.parsingFile')}
        formats={['.xlsx', '.csv', '.tsv']}
        hint={t('supplier.upload.limits')}
      />

      <section className="surface-paper overflow-hidden" aria-labelledby="supplier-channels">
        <header className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 id="supplier-channels" className="type-h3 text-[var(--text-primary)]">
            {t('supplier.upload.channelsTitle')}
          </h2>
        </header>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--border-subtle)]">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon
            return (
              <li key={ch.id} className="bg-[var(--bg-primary)] flex items-start gap-3 px-5 py-4">
                <span
                  className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 ${
                    ch.active ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-small font-semibold ${ch.active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {t(`supplier.upload.channels.${ch.id}.title`)}
                    </span>
                    <StatusPill tone={ch.active ? 'success' : 'neutral'} dot={ch.active} size="sm">
                      {ch.active ? t('supplier.upload.active') : t('supplier.upload.comingSoon')}
                    </StatusPill>
                  </div>
                  <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t(`supplier.upload.channels.${ch.id}.desc`)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════
   2 · Preview
   ═══════════════════════════════════════════ */
function DataPreview({
  file,
  sheet,
  sheetIdx,
  mappings,
  onSwitchSheet,
  onGoToMapping,
}: {
  file: UploadedFile
  sheet: ParsedSheet
  sheetIdx: number
  mappings: ColumnMapping[]
  onSwitchSheet: (idx: number) => void
  onGoToMapping: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const PAGE_SIZE = 50

  const filteredRows = useMemo(() => {
    let rows = sheet.rows
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      rows = rows.filter((r) => r.some((c) => c.toLowerCase().includes(term)))
    }
    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const va = a[sortCol] ?? ''
        const vb = b[sortCol] ?? ''
        const numA = parseFloat(va)
        const numB = parseFloat(vb)
        if (!isNaN(numA) && !isNaN(numB)) return sortDir === 'asc' ? numA - numB : numB - numA
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      })
    }
    return rows
  }, [sheet.rows, searchTerm, sortCol, sortDir])

  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortCol(colIdx)
      setSortDir('asc')
    }
    setPage(0)
  }

  return (
    <div className="space-y-4">
      <section className="surface-paper px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-small font-semibold text-[var(--text-primary)] truncate">{file.name}</p>
            <p className="text-caption text-[var(--text-tertiary)]">
              {fileSize(file.size, f)} · {t('supplier.preview.sheets', { count: file.sheets.length })} ·{' '}
              {t('supplier.preview.rows', { count: sheet.rowCount, n: f.number(sheet.rowCount) })} · {t('supplier.preview.columns', { count: sheet.colCount })}
            </p>
          </div>
        </div>
        <Button variant="primary" icon={<Columns className="w-4 h-4" />} onClick={onGoToMapping}>
          {t('supplier.preview.mapColumns')}
        </Button>
      </section>

      {file.sheets.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={t('supplier.preview.sheetsAria')}>
          {file.sheets.map((s, i) => (
            <button
              key={s.name + i}
              role="tab"
              aria-selected={i === sheetIdx}
              onClick={() => {
                onSwitchSheet(i)
                setPage(0)
                setSearchTerm('')
              }}
              className={`h-9 px-3 rounded-[var(--radius-sm)] text-small font-medium whitespace-nowrap transition-colors duration-micro ${
                i === sheetIdx ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {s.name}
              <span className="ml-1.5 text-caption tabular-nums text-[var(--text-tertiary)]">{f.number(s.rowCount)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
          <input
            type="search"
            aria-label={t('supplier.preview.searchPlaceholder')}
            placeholder={t('supplier.preview.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(0)
            }}
            className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] transition-colors"
          />
        </div>
        {searchTerm && (
          <span className="text-caption text-[var(--text-tertiary)]">
            {t('supplier.preview.matches', { count: filteredRows.length, n: f.number(filteredRows.length) })}
          </span>
        )}
        <div className="sm:ml-auto flex items-center gap-2">
          <PagerButton label={t('supplier.preview.prev')} disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </PagerButton>
          <span className="text-caption text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
            {f.number(page + 1)} / {f.number(totalPages)}
          </span>
          <PagerButton label={t('supplier.preview.next')} disabled={page >= totalPages - 1} onClick={() => setPage(Math.min(totalPages - 1, page + 1))}>
            <ChevronRight className="w-4 h-4" />
          </PagerButton>
        </div>
      </div>

      <section className="surface-paper overflow-hidden">
        <div className="overflow-x-auto max-h-[560px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-[1]">
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
                <th scope="col" className="px-3 py-2.5 text-caption font-medium text-[var(--text-tertiary)] w-12 text-right">
                  #
                </th>
                {sheet.headers.map((h, i) => {
                  const mapped = mappings[i]?.target
                  const SortIcon = sortCol !== i ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
                  return (
                    <th key={i} scope="col" className="px-3 py-2.5 min-w-[128px] align-top" aria-sort={sortCol === i ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      <button onClick={() => handleSort(i)} className="group flex items-center gap-1.5 text-left">
                        <span className="text-caption font-semibold text-[var(--text-secondary)] truncate max-w-[160px]">
                          {h || t('supplier.preview.colFallback', { n: i + 1 })}
                        </span>
                        <SortIcon
                          className={`w-3 h-3 flex-shrink-0 transition-opacity ${sortCol === i ? 'text-[var(--color-brand)]' : 'text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
                          aria-hidden
                        />
                      </button>
                      {mapped && (
                        <span className="mt-0.5 flex items-center gap-1 text-caption font-medium text-[var(--color-brand)] whitespace-nowrap">
                          <ArrowRight className="w-3 h-3" aria-hidden /> {fieldLabel(t, mapped)}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors duration-micro">
                  <td className="px-3 py-2 text-caption text-[var(--text-tertiary)] text-right tabular-nums">{f.number(page * PAGE_SIZE + ri + 1)}</td>
                  {sheet.headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-2 text-small text-[var(--text-primary)] truncate max-w-[220px] tabular-nums">
                      {row[ci] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && (
            <EmptyState variant="filtered" density="compact" onClearFilters={() => setSearchTerm('')} />
          )}
        </div>
        <footer className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] text-caption text-[var(--text-tertiary)] tabular-nums">
          {t('supplier.preview.showing', {
            from: f.number(filteredRows.length ? page * PAGE_SIZE + 1 : 0),
            to: f.number(Math.min((page + 1) * PAGE_SIZE, filteredRows.length)),
            total: f.number(filteredRows.length),
          })}
        </footer>
      </section>
    </div>
  )
}

function PagerButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-micro"
    >
      {children}
    </button>
  )
}

/* ═══════════════════════════════════════════
   3 · Column mapping
   ═══════════════════════════════════════════ */
function ColumnMappingTab({
  sheet,
  mappings,
  onUpdate,
  onConfirm,
  onBack,
}: {
  sheet: ParsedSheet
  mappings: ColumnMapping[]
  onUpdate: (idx: number, target: string) => void
  onConfirm: () => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const mapped = mappings.filter((m) => m.target).length
  const total = mappings.length

  // Two source columns feeding the same field is almost always a mistake.
  const dupes = useMemo(() => {
    const seen = new Map<string, number[]>()
    mappings.forEach((m, i) => {
      if (!m.target) return
      seen.set(m.target, [...(seen.get(m.target) ?? []), i])
    })
    const out = new Map<number, number>()
    for (const idxs of seen.values()) if (idxs.length > 1) idxs.forEach((i) => out.set(i, idxs.find((j) => j !== i)!))
    return out
  }, [mappings])
  const hasMeasure = mappings.some((m) => m.target === 'quantity' || m.target === 'co2e_tonnes')
  const blocked = mapped === 0 || dupes.size > 0

  return (
    <div className="space-y-4">
      <section className="surface-paper px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="type-h3 text-[var(--text-primary)]">{t('supplier.mapping.title')}</h2>
          <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('supplier.mapping.help')}</p>
        </div>
        <div className="sm:w-56">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-caption text-[var(--text-tertiary)]">{t('supplier.mapping.columnsMapped')}</span>
            <span className="text-small font-semibold tabular-nums text-[var(--text-primary)]">
              {f.number(mapped)} / {f.number(total)}
            </span>
          </div>
          <SplitBar segments={[{ id: 'mapped', value: mapped, color: 'var(--color-brand)' }]} total={total} aria-label={t('supplier.mapping.columnsMapped')} />
        </div>
      </section>

      <section className="surface-paper overflow-hidden">
        <div className="hidden md:grid grid-cols-[32px_minmax(0,1fr)_24px_minmax(0,1fr)_minmax(0,140px)] gap-3 items-center px-5 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] text-caption font-medium text-[var(--text-tertiary)]">
          <span>#</span>
          <span>{t('supplier.mapping.sourceColumn')}</span>
          <span />
          <span>{t('supplier.mapping.targetField')}</span>
          <span>{t('supplier.mapping.sample')}</span>
        </div>
        <ul className="divide-y divide-[var(--border-subtle)]">
          {mappings.map((m, i) => {
            const sampleVals = sheet.rows.slice(0, 3).map((r) => r[i] ?? '').filter(Boolean)
            const dupeOf = dupes.get(i)
            const id = `map-${i}`
            return (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[32px_minmax(0,1fr)_24px_minmax(0,1fr)_minmax(0,140px)] gap-x-3 gap-y-2 items-center px-5 py-3">
                <span className="hidden md:block text-caption text-[var(--text-tertiary)] tabular-nums">{i + 1}</span>
                <label htmlFor={id} className={`text-small font-medium truncate ${m.target ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                  {m.source || t('supplier.preview.colFallback', { n: i + 1 })}
                </label>
                <ArrowRight className={`hidden md:block w-4 h-4 ${m.target ? 'text-[var(--color-brand)]' : 'text-[var(--text-quaternary)]'}`} aria-hidden />
                <div className="min-w-0">
                  <select
                    id={id}
                    value={m.target}
                    onChange={(e) => onUpdate(i, e.target.value)}
                    aria-invalid={dupeOf != null}
                    aria-describedby={dupeOf != null ? `${id}-err` : undefined}
                    className={`w-full h-10 px-3 rounded-[var(--radius-md)] border text-small cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)] transition-colors duration-micro ${
                      dupeOf != null
                        ? 'border-[var(--status-danger)] bg-[var(--status-danger-soft)] text-[var(--text-primary)]'
                        : m.target
                          ? 'border-[var(--status-success-line)] bg-[var(--color-brand-soft)] text-[var(--text-primary)] focus:border-[var(--color-brand)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-tertiary)] focus:border-[var(--color-brand)]'
                    }`}
                  >
                    {TARGET_FIELDS.map((fld) => (
                      <option key={fld.value} value={fld.value}>
                        {fieldLabel(t, fld.value)}
                      </option>
                    ))}
                  </select>
                  {dupeOf != null && (
                    <p id={`${id}-err`} className="text-caption text-[var(--status-danger)] mt-1">
                      {t('supplier.mapping.duplicate', { column: mappings[dupeOf]?.source || t('supplier.preview.colFallback', { n: dupeOf + 1 }) })}
                    </p>
                  )}
                </div>
                <span className="text-caption text-[var(--text-tertiary)] truncate font-mono" title={sampleVals.join(', ')}>
                  <span className="md:hidden">{t('supplier.mapping.sample')}: </span>
                  {sampleVals[0] || '—'}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {!hasMeasure && mapped > 0 && (
        <p className="flex items-start gap-2 text-small text-[var(--status-warning)]" role="status">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
          {t('supplier.mapping.noMeasure')}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-caption text-[var(--text-tertiary)]">{t('supplier.mapping.unmappedNote')}</p>
        <div className="flex items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-initial">
          <Button variant="secondary" icon={<ChevronLeft className="w-4 h-4" />} onClick={onBack}>
            {t('supplier.mapping.back')}
          </Button>
          <Button variant="primary" icon={<CheckCircle2 className="w-4 h-4" />} disabled={blocked} onClick={onConfirm} title={blocked ? t('supplier.mapping.blocked') : undefined}>
            {t('supplier.mapping.confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   4 · Validation pipeline
   ═══════════════════════════════════════════ */
function PipelineTab({
  hasData,
  mappingDone,
  rowCount,
  fileName,
  onGoToMapping,
}: {
  hasData: boolean
  mappingDone: boolean
  rowCount: number
  fileName: string
  onGoToMapping: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  // Simulated validation run: small failure rates in the two validation stages.
  const stages = PIPELINE_STAGES.map((stage, i) => {
    if (!hasData || !mappingDone) return { ...stage, passed: 0, failed: 0, rate: 0 }
    const failed = i === 0 ? Math.floor(rowCount * 0.002) : i === 1 ? Math.floor(rowCount * 0.008) : 0
    const passed = rowCount - failed
    return { ...stage, passed, failed, rate: rowCount > 0 ? (passed / rowCount) * 100 : 0 }
  })

  if (!hasData || !mappingDone) {
    return (
      <EmptyState
        art="upload"
        title={hasData ? t('supplier.pipeline.mappingRequired') : t('supplier.empty.noPipeline')}
        body={hasData ? t('supplier.pipeline.mappingRequiredSub') : t('supplier.empty.noPipelineSub')}
        cta={{ label: hasData ? t('supplier.tabs.mapping') : t('supplier.empty.goToUpload'), onClick: onGoToMapping }}
      />
    )
  }

  const flagged = stages[0].failed + stages[1].failed
  const passed = rowCount - flagged

  return (
    <div className="space-y-6">
      <section className="surface-paper p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h2 className="type-h3 text-[var(--text-primary)]">{t('supplier.pipeline.title')}</h2>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5 break-words">
              {t('supplier.pipeline.processing', { rows: f.number(rowCount), file: fileName })}
            </p>
          </div>
          <StatusPill tone="success" icon={<CheckCircle2 />}>
            {t('supplier.pipeline.complete')}
          </StatusPill>
        </div>
        <ProcessFlow
          aria-label={t('supplier.pipeline.title')}
          steps={stages.map((s) => ({
            id: s.id,
            icon: s.icon,
            state: 'done' as const,
            title: t(`supplier.pipeline.stages.${s.id}.title`),
            desc: t(`supplier.pipeline.stages.${s.id}.desc`),
            meta: (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-small font-semibold tabular-nums text-[var(--text-primary)]">{f.percent(s.rate, { precision: 1 })}</span>
                {s.failed > 0 && (
                  <StatusPill tone="warning" size="sm">
                    {t('supplier.pipeline.flagged', { count: s.failed, n: f.number(s.failed) })}
                  </StatusPill>
                )}
              </div>
            ),
          }))}
        />
        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <span className="text-small font-medium text-[var(--text-secondary)]">{t('supplier.pipeline.throughput')}</span>
            <span className="text-small font-semibold tabular-nums text-[var(--text-primary)]">
              {t('supplier.pipeline.rowsPassed', { passed: f.number(passed), total: f.number(rowCount) })}
            </span>
          </div>
          <SplitBar
            height={10}
            legend
            aria-label={t('supplier.pipeline.throughput')}
            segments={[
              { id: 'passed', value: passed, color: 'var(--color-brand)', label: t('supplier.pipeline.passed'), display: f.number(passed) },
              { id: 'flagged', value: flagged, color: 'var(--status-warning)', label: t('supplier.pipeline.flaggedLabel'), display: f.number(flagged) },
            ]}
          />
        </div>
      </section>

      <section className="surface-paper overflow-hidden" aria-labelledby="supplier-exceptions">
        <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <h2 id="supplier-exceptions" className="type-h3 text-[var(--text-primary)]">
            {t('supplier.pipeline.exceptions')}
          </h2>
          <StatusPill tone={flagged > 0 ? 'warning' : 'success'} dot size="sm">
            {t('supplier.pipeline.total', { count: flagged, n: f.number(flagged) })}
          </StatusPill>
        </header>
        {flagged === 0 ? (
          <EmptyState variant="cleared" density="compact" title={t('supplier.pipeline.noExceptions')} />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {[
              { id: 'schema', n: stages[0].failed, tone: 'warning' as const },
              { id: 'semantic', n: stages[1].failed, tone: 'danger' as const },
            ]
              .filter((r) => r.n > 0)
              .map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${r.tone === 'danger' ? 'text-[var(--status-danger)]' : 'text-[var(--status-warning)]'}`} aria-hidden />
                  <span className="flex-1 min-w-0 text-small text-[var(--text-primary)]">{t(`supplier.pipeline.${r.id}Failures`)}</span>
                  <StatusPill tone="neutral" size="sm">
                    {t(`supplier.pipeline.${r.id}Badge`)}
                  </StatusPill>
                  <span className="text-small font-semibold tabular-nums text-[var(--text-primary)] w-12 text-right">{f.number(r.n)}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════
   History
   ═══════════════════════════════════════════ */
function HistoryTab({
  files,
  activeName,
  onSelect,
  onClear,
  onUpload,
}: {
  files: UploadedFile[]
  activeName?: string
  onSelect: (f: UploadedFile) => void
  onClear: () => void
  onUpload: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  if (files.length === 0) {
    return (
      <EmptyState
        art="upload"
        title={t('supplier.empty.noHistory')}
        body={t('supplier.empty.noHistorySub')}
        cta={{ label: t('supplier.empty.goToUpload'), onClick: onUpload }}
      />
    )
  }

  return (
    <section className="surface-paper overflow-hidden">
      <header className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <span className="text-small text-[var(--text-secondary)]">{t('supplier.history.filesThisSession', { count: files.length })}</span>
        <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onClear}>
          {t('supplier.history.clearAll')}
        </Button>
      </header>
      <ul className="divide-y divide-[var(--border-subtle)]">
        {files.map((file, i) => {
          const rows = file.sheets.reduce((a, s) => a + s.rowCount, 0)
          return (
            <li key={`${file.name}-${i}`}>
              <button
                onClick={() => onSelect(file)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[var(--bg-hover)] transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)]"
              >
                <FileSpreadsheet className="w-5 h-5 text-[var(--color-brand)] flex-shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="text-small font-semibold text-[var(--text-primary)] truncate">{file.name}</p>
                  <p className="text-caption text-[var(--text-tertiary)]">
                    {fileSize(file.size, f)} · {t('supplier.preview.sheets', { count: file.sheets.length })} · {t('supplier.preview.rows', { count: rows, n: f.number(rows) })}
                  </p>
                </div>
                {activeName === file.name && i === 0 && (
                  <StatusPill tone="brand" size="sm">
                    {t('supplier.history.current')}
                  </StatusPill>
                )}
                <span className="hidden sm:inline text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">{f.relative(file.uploadedAt)}</span>
                <ChevronRight className="w-4 h-4 text-[var(--text-quaternary)]" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
