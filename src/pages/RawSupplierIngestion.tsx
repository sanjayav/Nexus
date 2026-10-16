import { useState, useRef, useCallback, useMemo } from 'react'
import ExcelJS from 'exceljs'
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
  Loader2,
  Table2,
  Columns,
  ArrowRight,
  Search,
  ChevronLeft,
  Trash2,
  ArrowUpDown,
} from 'lucide-react'
import { Card, Badge, Tabs } from '../design-system'

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

/* ── Auto-mapping heuristics ── */
function autoMapColumn(header: string): string {
  const h = header.toLowerCase().trim()
  if (/facilit|site|plant|location name/.test(h)) return 'facility_name'
  if (/source.?id/.test(h)) return 'source_id'
  if (/source.?type|emission.?source/.test(h)) return 'source_type'
  if (/scope/.test(h)) return 'emission_scope'
  if (/activity.?type|activity/.test(h)) return 'activity_type'
  if (/fuel.?type|fuel/.test(h)) return 'fuel_type'
  if (/quantit|amount|volume|consumption/.test(h)) return 'quantity'
  if (/^unit$|^units$|uom/.test(h)) return 'unit'
  if (/emission.?factor|^ef$/.test(h)) return 'emission_factor'
  if (/ef.?unit/.test(h)) return 'ef_unit'
  if (/co2e|co₂e|total.?emission|tco2/.test(h)) return 'co2e_tonnes'
  if (/^co2$|^co₂$|carbon.?dioxide/.test(h)) return 'co2'
  if (/ch4|methane/.test(h)) return 'ch4'
  if (/n2o|nitrous/.test(h)) return 'n2o'
  if (/period|year|fy/.test(h)) return 'reporting_period'
  if (/date|month|timestamp/.test(h)) return 'date'
  if (/country/.test(h)) return 'country'
  if (/region|state|province/.test(h)) return 'region'
  if (/supplier|vendor/.test(h)) return 'supplier_name'
  if (/note|comment|remark/.test(h)) return 'notes'
  return ''
}

/* ── Pipeline stages (unchanged) ── */
const PIPELINE_STAGES = [
  { id: 'schema', title: 'Schema Validation', desc: 'Data type checks, required fields, format conformance', icon: ShieldCheck, accent: 'var(--accent-teal)' },
  { id: 'semantic', title: 'Semantic Validation', desc: 'Cross-field logic, unit consistency, threshold guards', icon: Brain, accent: 'var(--accent-blue)' },
  { id: 'enrichment', title: 'Data Enrichment', desc: 'Auto-fill emission factors, add metadata, normalise units', icon: Sparkles, accent: 'var(--accent-purple)' },
  { id: 'routing', title: 'Calculator Routing', desc: 'Route to correct GHG Protocol calculator module', icon: Router, accent: 'var(--accent-amber)' },
  { id: 'repository', title: 'Data Repository', desc: 'Immutable storage with blockchain-anchored audit trail', icon: Database, accent: 'var(--accent-green)' },
]


/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */
export default function RawSupplierIngestion() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('upload')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [activeFile, setActiveFile] = useState<UploadedFile | null>(null)
  const [activeSheetIdx, setActiveSheetIdx] = useState(0)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [mappingDone, setMappingDone] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── Parse file ── */
  const parseFile = useCallback(async (file: File) => {
    setParsing(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(data)

      // Cell value coercion — mirror the previous XLSX behaviour where
      // `sheet_to_json` returned everything as a string with `defval: ''`.
      const toCell = (v: unknown): string => {
        if (v == null) return ''
        if (v instanceof Date) return v.toISOString()
        if (typeof v === 'object') {
          // exceljs returns rich objects for formulas / hyperlinks / rich text
          const obj = v as { result?: unknown; text?: unknown; richText?: { text?: unknown }[]; hyperlink?: unknown }
          if (obj.result != null) return String(obj.result)
          if (obj.text != null) return String(obj.text)
          if (Array.isArray(obj.richText)) return obj.richText.map((rt) => String(rt?.text ?? '')).join('')
          if (obj.hyperlink != null) return String(obj.hyperlink)
        }
        return String(v)
      }

      const sheets: ParsedSheet[] = workbook.worksheets.map((ws) => {
        const name = ws.name
        // Build a 2-D array, sized by the actual column extent.
        const colCount = ws.actualColumnCount || ws.columnCount || 0
        const grid: string[][] = []
        ws.eachRow({ includeEmpty: false }, (row) => {
          const arr: string[] = new Array(colCount).fill('')
          for (let i = 1; i <= colCount; i++) {
            arr[i - 1] = toCell(row.getCell(i).value)
          }
          grid.push(arr)
        })
        const headers = (grid[0] || []).map((h) => String(h))
        const rows = grid.slice(1).filter((r) => r.some((c) => c !== ''))
        return { name, headers, rows, rowCount: rows.length, colCount: headers.length }
      })

      const uploaded: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        sheets,
        uploadedAt: new Date(),
      }

      setUploadedFiles((prev) => [uploaded, ...prev])
      setActiveFile(uploaded)
      setActiveSheetIdx(0)
      setMappingDone(false)

      // Auto-map columns
      if (sheets.length > 0) {
        const initialMappings = sheets[0].headers.map((h) => ({
          source: h,
          target: autoMapColumn(h),
        }))
        setMappings(initialMappings)
      }

      setActiveTab('preview')
    } catch (err) {
      console.error('Parse error:', err)
    } finally {
      setParsing(false)
    }
  }, [])

  /* ── Drag & drop handlers ── */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) parseFile(file)
    },
    [parseFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) parseFile(file)
      if (e.target) e.target.value = ''
    },
    [parseFile]
  )

  /* ── Sheet switch ── */
  const switchSheet = useCallback(
    (idx: number) => {
      if (!activeFile) return
      setActiveSheetIdx(idx)
      setMappingDone(false)
      const sheet = activeFile.sheets[idx]
      setMappings(sheet.headers.map((h) => ({ source: h, target: autoMapColumn(h) })))
    },
    [activeFile]
  )

  /* ── Mapping change ── */
  const updateMapping = useCallback((colIdx: number, target: string) => {
    setMappings((prev) => prev.map((m, i) => (i === colIdx ? { ...m, target } : m)))
  }, [])

  const activeSheet = activeFile?.sheets[activeSheetIdx] ?? null
  const mappedCount = mappings.filter((m) => m.target !== '').length
  const totalUploaded = uploadedFiles.reduce((acc, f) => acc + f.sheets.reduce((a, s) => a + s.rowCount, 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">
            {t('supplier.title')}
          </h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">
            {t('supplier.subtitle')}
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          <Upload className="w-4 h-4" />
          {t('supplier.uploadFile')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <Tabs
        tabs={[
          { id: 'upload', label: t('supplier.tabs.upload') },
          { id: 'preview', label: t('supplier.tabs.preview'), count: activeSheet?.rowCount },
          { id: 'mapping', label: t('supplier.tabs.mapping'), count: mappedCount || undefined },
          { id: 'pipeline', label: t('supplier.tabs.pipeline') },
          { id: 'history', label: t('supplier.tabs.history'), count: uploadedFiles.length || undefined },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'upload' && (
        <UploadTab
          dragOver={dragOver}
          parsing={parsing}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClickUpload={() => fileInputRef.current?.click()}
          uploadedFiles={uploadedFiles}
          totalRows={totalUploaded}
        />
      )}

      {activeTab === 'preview' && activeSheet && (
        <DataPreview
          file={activeFile!}
          sheet={activeSheet}
          sheetIdx={activeSheetIdx}
          mappings={mappings}
          onSwitchSheet={switchSheet}
          onGoToMapping={() => setActiveTab('mapping')}
        />
      )}

      {activeTab === 'preview' && !activeSheet && (
        <EmptyState
          message={t('supplier.empty.noFile')}
          sub={t('supplier.empty.noFileSub')}
          onAction={() => setActiveTab('upload')}
          actionLabel={t('supplier.empty.goToUpload')}
        />
      )}

      {activeTab === 'mapping' && activeSheet && (
        <ColumnMappingTab
          sheet={activeSheet}
          mappings={mappings}
          onUpdate={updateMapping}
          onConfirm={() => { setMappingDone(true); setActiveTab('pipeline') }}
        />
      )}

      {activeTab === 'mapping' && !activeSheet && (
        <EmptyState
          message={t('supplier.empty.noMapData')}
          sub={t('supplier.empty.noMapDataSub')}
          onAction={() => setActiveTab('upload')}
          actionLabel={t('supplier.empty.goToUpload')}
        />
      )}

      {activeTab === 'pipeline' && (
        <PipelineTab
          hasData={!!activeSheet}
          mappingDone={mappingDone}
          rowCount={activeSheet?.rowCount ?? 0}
          fileName={activeFile?.name ?? ''}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab
          files={uploadedFiles}
          onSelect={(f) => { setActiveFile(f); setActiveSheetIdx(0); switchSheet(0); setActiveTab('preview') }}
          onClear={() => { setUploadedFiles([]); setActiveFile(null); setActiveSheetIdx(0); setMappings([]) }}
        />
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════
   Upload Tab
   ═══════════════════════════════════════════ */
function UploadTab({
  dragOver, parsing, onDragOver, onDragLeave, onDrop, onClickUpload, uploadedFiles, totalRows,
}: {
  dragOver: boolean
  parsing: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onClickUpload: () => void
  uploadedFiles: UploadedFile[]
  totalRows: number
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { id: 'kpiFiles', label: 'Files Uploaded', value: uploadedFiles.length.toString(), accent: 'var(--accent-teal)' },
          { id: 'kpiRows', label: 'Total Rows', value: totalRows.toLocaleString(), accent: 'var(--accent-blue)' },
          { id: 'kpiSheets', label: 'Sheets Parsed', value: uploadedFiles.reduce((a, f) => a + f.sheets.length, 0).toString(), accent: 'var(--accent-purple)' },
          { id: 'kpiStatus', label: 'Status', value: parsing ? t('supplier.upload.statusParsing') : t('supplier.upload.statusReady'), accent: 'var(--accent-green)' },
        ].map((kpi) => (
          <Card key={kpi.label} hover className="group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ background: `linear-gradient(90deg, ${kpi.accent}, transparent)` }} />
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em]">{t(`supplier.upload.${kpi.id}`)}</p>
            <p className="font-display text-[var(--text-3xl)] font-bold text-[var(--text-primary)] mt-1 tabular-nums">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClickUpload}
        className={`
          relative flex flex-col items-center justify-center p-14 rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-300
          ${dragOver
            ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-subtle)] scale-[1.01] shadow-[var(--shadow-glow-teal)]'
            : 'border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal-subtle)]'
          }
          group
        `}
      >
        {parsing ? (
          <Loader2 className="w-10 h-10 text-[var(--accent-teal)] animate-spin mb-4" />
        ) : (
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${
            dragOver
              ? 'bg-[var(--accent-teal-light)] border-[var(--accent-teal)] scale-110'
              : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] group-hover:bg-[var(--accent-teal-light)] group-hover:border-[var(--accent-teal)]'
          } border`}>
            <Upload className={`w-7 h-7 transition-colors ${dragOver ? 'text-[var(--accent-teal)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--accent-teal)]'}`} />
          </div>
        )}

        <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
          {parsing ? t('supplier.upload.parsingFile') : dragOver ? t('supplier.upload.dropHere') : t('supplier.upload.dropPrompt')}
        </h3>
        <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1">
          {t('supplier.upload.or')} <span className="text-[var(--accent-teal)] font-semibold underline underline-offset-2">{t('supplier.upload.clickToBrowse')}</span>
        </p>
        <div className="flex items-center gap-3 mt-5">
          <Badge variant="blue">.xlsx</Badge>
          <Badge variant="blue">.xls</Badge>
          <Badge variant="teal">.csv</Badge>
          <Badge variant="gray">.tsv</Badge>
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-3">
          {t('supplier.upload.limits')}
        </p>
      </div>

      {/* Input channel cards */}
      <div>
        <h2 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-3">{t('supplier.upload.channelsTitle')}</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { id: 'manual', icon: Keyboard, title: 'Manual Entry', desc: 'Form-based input with real-time validation', color: 'teal' as const, accent: 'var(--accent-teal)', active: false },
            { id: 'csv', icon: FileSpreadsheet, title: 'CSV / Excel Upload', desc: 'Active — bulk upload with auto-mapping', color: 'blue' as const, accent: 'var(--accent-blue)', active: true },
            { id: 'api', icon: Plug, title: 'API Connectors', desc: 'ERP & utility provider live feeds', color: 'purple' as const, accent: 'var(--accent-purple)', active: false },
            { id: 'ocr', icon: ScanText, title: 'Document Parse / OCR', desc: 'AI extraction from invoices & bills', color: 'amber' as const, accent: 'var(--accent-amber)', active: false },
          ].map((ch) => {
            const Icon = ch.icon
            return (
              <Card key={ch.title} hover className={`group ${ch.active ? 'border-[var(--accent-blue)] shadow-[var(--shadow-glow-teal)]' : 'opacity-60'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${ch.accent}10`, border: `1px solid ${ch.accent}25` }}>
                    <Icon className="w-5 h-5" style={{ color: ch.accent }} />
                  </div>
                  {ch.active ? <Badge variant="blue" dot>{t('supplier.upload.active')}</Badge> : <Badge variant="gray">{t('supplier.upload.comingSoon')}</Badge>}
                </div>
                <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{t(`supplier.upload.channels.${ch.id}.title`)}</h3>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1">{t(`supplier.upload.channels.${ch.id}.desc`)}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════
   Data Preview Tab
   ═══════════════════════════════════════════ */
function DataPreview({
  file, sheet, sheetIdx, mappings, onSwitchSheet, onGoToMapping,
}: {
  file: UploadedFile
  sheet: ParsedSheet
  sheetIdx: number
  mappings: ColumnMapping[]
  onSwitchSheet: (idx: number) => void
  onGoToMapping: () => void
}) {
  const { t } = useTranslation()
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
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE)

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colIdx)
      setSortDir('asc')
    }
    setPage(0)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* File info bar */}
      <Card padding="sm" className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[var(--accent-blue)]" />
          <div>
            <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{file.name}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{(file.size / 1024).toFixed(1)} KB &middot; {t('supplier.preview.sheets', { count: file.sheets.length })}</p>
          </div>
        </div>
        <div className="h-6 w-px bg-[var(--border-default)]" />

        {/* Sheet selector */}
        {file.sheets.length > 1 && (
          <div className="flex items-center gap-1">
            {file.sheets.map((s, i) => (
              <button
                key={s.name}
                onClick={() => { onSwitchSheet(i); setPage(0); setSearchTerm('') }}
                className={`px-3 py-1 rounded-md text-[var(--text-xs)] font-medium transition-all cursor-pointer ${
                  i === sheetIdx
                    ? 'bg-[var(--accent-blue-light)] text-[var(--accent-blue)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
            <strong className="text-[var(--text-primary)]">{sheet.rowCount.toLocaleString()}</strong> {t('supplier.preview.rowsUnit')} &middot; <strong className="text-[var(--text-primary)]">{sheet.colCount}</strong> {t('supplier.preview.columnsUnit')}
          </span>
          <button
            onClick={onGoToMapping}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-xs)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Columns className="w-3.5 h-3.5" />
            {t('supplier.preview.mapColumns')}
          </button>
        </div>
      </Card>

      {/* Mapped columns preview */}
      {mappings.some((m) => m.target) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{t('supplier.preview.mapped')}</span>
          {mappings.filter((m) => m.target).map((m) => (
            <Badge key={m.source} variant="teal">
              {m.source} → {fieldLabel(t, m.target)}
            </Badge>
          ))}
        </div>
      )}

      {/* Search + pagination controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder={t('supplier.preview.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0) }}
            className="w-full h-9 pl-10 pr-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1 transition-all"
          />
        </div>
        {searchTerm && (
          <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
            {t('supplier.preview.matches', { count: filteredRows.length, n: filteredRows.length.toLocaleString() })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-all cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[var(--text-xs)] text-[var(--text-secondary)] tabular-nums">
            {page + 1} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-all cursor-pointer disabled:cursor-default"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Data table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
                <th className="px-3 py-2.5 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-12 text-center">#</th>
                {sheet.headers.map((h, i) => {
                  const mapped = mappings[i]?.target
                  return (
                    <th key={i} className="px-3 py-2.5 min-w-[120px]">
                      <button
                        onClick={() => handleSort(i)}
                        className="flex items-center gap-1.5 cursor-pointer group"
                      >
                        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider truncate max-w-[150px]">
                          {h || t('supplier.preview.colFallback', { n: i + 1 })}
                        </span>
                        <ArrowUpDown className={`w-3 h-3 flex-shrink-0 transition-colors ${
                          sortCol === i ? 'text-[var(--accent-teal)]' : 'text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100'
                        }`} />
                      </button>
                      {mapped && (
                        <span className="block text-[9px] text-[var(--accent-teal)] font-medium mt-0.5">
                          → {fieldLabel(t, mapped)}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-3 py-2 text-[10px] text-[var(--text-tertiary)] text-center tabular-nums">
                    {page * PAGE_SIZE + ri + 1}
                  </td>
                  {sheet.headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-2 text-[var(--text-sm)] text-[var(--text-primary)] truncate max-w-[200px]">
                      {row[ci] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-default)] flex items-center justify-between">
          <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
            {t('supplier.preview.showing', {
              from: (page * PAGE_SIZE + 1).toLocaleString(),
              to: Math.min((page + 1) * PAGE_SIZE, filteredRows.length).toLocaleString(),
              total: filteredRows.length.toLocaleString(),
            })}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="teal">{t('supplier.preview.columns', { count: sheet.colCount })}</Badge>
            <Badge variant="blue">{t('supplier.preview.rows', { count: sheet.rowCount, n: sheet.rowCount.toLocaleString() })}</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}


/* ═══════════════════════════════════════════
   Column Mapping Tab
   ═══════════════════════════════════════════ */
function ColumnMappingTab({
  sheet, mappings, onUpdate, onConfirm,
}: {
  sheet: ParsedSheet
  mappings: ColumnMapping[]
  onUpdate: (idx: number, target: string) => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const mapped = mappings.filter((m) => m.target).length
  const total = mappings.length

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <Card padding="sm" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Columns className="w-5 h-5 text-[var(--accent-teal)]" />
          <div>
            <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{t('supplier.mapping.title')}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{t('supplier.mapping.help')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[var(--text-xs)] font-bold text-[var(--text-primary)] tabular-nums">{mapped} / {total}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{t('supplier.mapping.columnsMapped')}</p>
          </div>
          <div className="w-20 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(mapped / total) * 100}%`, background: 'linear-gradient(90deg, var(--accent-teal), var(--accent-green))' }}
            />
          </div>
        </div>
      </Card>

      {/* Mapping rows */}
      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-0 items-center px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-8">#</span>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{t('supplier.mapping.sourceColumn')}</span>
          <span className="w-10" />
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{t('supplier.mapping.targetField')}</span>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-24 text-center">{t('supplier.mapping.sample')}</span>
        </div>

        {mappings.map((m, i) => {
          const sampleVals = sheet.rows.slice(0, 3).map((r) => r[i] ?? '').filter(Boolean)
          return (
            <div
              key={i}
              className={`grid grid-cols-[auto_1fr_auto_1fr_auto] gap-0 items-center px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors ${
                m.target ? '' : 'opacity-60'
              }`}
            >
              <span className="text-[10px] text-[var(--text-tertiary)] w-8 tabular-nums">{i + 1}</span>

              {/* Source */}
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] truncate max-w-[200px]">{m.source}</span>
              </div>

              {/* Arrow */}
              <div className="w-10 flex items-center justify-center">
                <ArrowRight className={`w-4 h-4 ${m.target ? 'text-[var(--accent-teal)]' : 'text-[var(--border-default)]'}`} />
              </div>

              {/* Target select */}
              <select
                value={m.target}
                onChange={(e) => onUpdate(i, e.target.value)}
                className={`
                  w-full h-9 px-3 pr-8 text-[var(--text-sm)]
                  bg-[var(--bg-primary)] border rounded-lg appearance-none cursor-pointer
                  transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1
                  ${m.target
                    ? 'border-[var(--accent-teal)] text-[var(--text-primary)] bg-[var(--accent-teal-subtle)]'
                    : 'border-[var(--border-default)] text-[var(--text-tertiary)]'
                  }
                `}
              >
                {TARGET_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{fieldLabel(t, f.value)}</option>
                ))}
              </select>

              {/* Sample values */}
              <div className="w-24 flex items-center justify-center">
                <span className="text-[10px] text-[var(--text-tertiary)] truncate font-mono" title={sampleVals.join(', ')}>
                  {sampleVals[0] || '—'}
                </span>
              </div>
            </div>
          )
        })}
      </Card>

      {/* Confirm */}
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
          {t('supplier.mapping.unmappedNote')}
        </p>
        <button
          onClick={onConfirm}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          {t('supplier.mapping.confirm')}
        </button>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════
   Pipeline Tab
   ═══════════════════════════════════════════ */
function PipelineTab({ hasData, mappingDone, rowCount, fileName }: { hasData: boolean; mappingDone: boolean; rowCount: number; fileName: string }) {
  const { t } = useTranslation()
  // Simulated pipeline progress
  const stages = PIPELINE_STAGES.map((stage, i) => {
    if (!hasData || !mappingDone) return { ...stage, status: 'waiting' as const, passed: 0, failed: 0, rate: 0 }
    // Simulate: all stages pass with slight failures in first two
    const failed = i === 0 ? Math.floor(rowCount * 0.002) : i === 1 ? Math.floor(rowCount * 0.008) : 0
    const passed = rowCount - failed
    return { ...stage, status: 'complete' as const, passed, failed, rate: rowCount > 0 ? parseFloat(((passed / rowCount) * 100).toFixed(1)) : 0 }
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {!hasData && (
        <EmptyState
          message={t('supplier.empty.noPipeline')}
          sub={t('supplier.empty.noPipelineSub')}
        />
      )}

      {hasData && !mappingDone && (
        <Card className="flex items-center gap-4 border-[var(--accent-amber)] bg-[var(--accent-amber-light)]">
          <AlertTriangle className="w-5 h-5 text-[var(--accent-amber)] flex-shrink-0" />
          <div>
            <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{t('supplier.pipeline.mappingRequired')}</p>
            <p className="text-[var(--text-xs)] text-[var(--text-secondary)]">
              {t('supplier.pipeline.mappingRequiredSub')}
            </p>
          </div>
        </Card>
      )}

      {/* Pipeline visualization */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)]">{t('supplier.pipeline.title')}</h3>
            <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">
              {mappingDone ? t('supplier.pipeline.processing', { rows: rowCount.toLocaleString(), file: fileName }) : t('supplier.pipeline.awaiting')}
            </p>
          </div>
          {mappingDone && (
            <Badge variant="green" dot>{t('supplier.pipeline.complete')}</Badge>
          )}
        </div>

        <div className="flex items-stretch gap-0">
          {stages.map((stage, i) => {
            const Icon = stage.icon
            const isComplete = stage.status === 'complete'
            return (
              <div key={stage.id} className="flex items-center flex-1">
                <div className="flex-1 text-center group">
                  <div
                    className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center transition-all group-hover:scale-105 ${
                      isComplete ? '' : 'opacity-40'
                    }`}
                    style={{
                      backgroundColor: `${stage.accent}10`,
                      border: `1.5px solid ${stage.accent}${isComplete ? '60' : '20'}`,
                    }}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6" style={{ color: stage.accent }} />
                    ) : (
                      <Icon className="w-6 h-6" style={{ color: stage.accent }} />
                    )}
                  </div>
                  <h4 className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] mt-3">{t(`supplier.pipeline.stages.${stage.id}.title`)}</h4>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed max-w-[140px] mx-auto">{t(`supplier.pipeline.stages.${stage.id}.desc`)}</p>
                  {isComplete && (
                    <div className="mt-2 space-y-0.5">
                      <span className="text-[var(--text-xs)] font-bold tabular-nums" style={{ color: stage.accent }}>{stage.rate}%</span>
                      {stage.failed > 0 && (
                        <p className="text-[10px] text-[var(--accent-red)]">{t('supplier.pipeline.flagged', { count: stage.failed })}</p>
                      )}
                    </div>
                  )}
                </div>
                {i < stages.length - 1 && (
                  <div className="flex items-center px-1 flex-shrink-0 self-start mt-7">
                    <div className="w-6 flex items-center">
                      <div className={`flex-1 h-[2px] ${isComplete ? 'bg-[var(--accent-teal)]' : 'bg-[var(--border-default)]'}`} />
                      <ChevronRight className={`w-4 h-4 -ml-1 ${isComplete ? 'text-[var(--accent-teal)]' : 'text-[var(--text-tertiary)]'}`} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Throughput bar */}
        {mappingDone && (
          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-xs)] font-medium text-[var(--text-secondary)]">{t('supplier.pipeline.throughput')}</span>
              <span className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] tabular-nums">
                {t('supplier.pipeline.rowsPassed', { passed: stages[stages.length - 1].passed.toLocaleString(), total: rowCount.toLocaleString() })}
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${stages[stages.length - 1].rate}%`,
                  background: 'linear-gradient(90deg, var(--accent-teal), var(--accent-green))',
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Validation exceptions */}
      {mappingDone && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{t('supplier.pipeline.exceptions')}</h3>
            <Badge variant="amber" dot>{t('supplier.pipeline.total', { count: stages[0].failed + stages[1].failed })}</Badge>
          </div>
          <div className="space-y-2">
            {stages[0].failed > 0 && (
              <div className="flex items-center gap-4 p-3 rounded-lg border border-[var(--border-subtle)]">
                <AlertTriangle className="w-4 h-4 text-[var(--accent-amber)] flex-shrink-0" />
                <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] flex-1">{t('supplier.pipeline.schemaFailures')}</span>
                <Badge variant="gray">{t('supplier.pipeline.schemaBadge')}</Badge>
                <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] tabular-nums">{stages[0].failed}</span>
              </div>
            )}
            {stages[1].failed > 0 && (
              <div className="flex items-center gap-4 p-3 rounded-lg border border-[var(--border-subtle)]">
                <AlertTriangle className="w-4 h-4 text-[var(--accent-red)] flex-shrink-0" />
                <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] flex-1">{t('supplier.pipeline.semanticFailures')}</span>
                <Badge variant="gray">{t('supplier.pipeline.semanticBadge')}</Badge>
                <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] tabular-nums">{stages[1].failed}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════
   History Tab
   ═══════════════════════════════════════════ */
function HistoryTab({
  files, onSelect, onClear,
}: {
  files: UploadedFile[]
  onSelect: (f: UploadedFile) => void
  onClear: () => void
}) {
  const { t, i18n } = useTranslation()
  const timeLocale = i18n.language?.startsWith('zh') ? 'zh-CN' : undefined
  if (files.length === 0) {
    return <EmptyState message={t('supplier.empty.noHistory')} sub={t('supplier.empty.noHistorySub')} />
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-sm)] text-[var(--text-secondary)]">{t('supplier.history.filesThisSession', { count: files.length })}</span>
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[var(--text-sm)] font-medium text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('supplier.history.clearAll')}
        </button>
      </div>

      <Card padding="none">
        {files.map((file, i) => (
          <button
            key={`${file.name}-${i}`}
            onClick={() => onSelect(file)}
            className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[var(--bg-hover)] transition-colors cursor-pointer ${
              i < files.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
            }`}
          >
            <FileSpreadsheet className="w-5 h-5 text-[var(--accent-blue)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{file.name}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {(file.size / 1024).toFixed(1)} KB &middot; {t('supplier.preview.sheets', { count: file.sheets.length })} &middot; {t('supplier.preview.rows', { count: file.sheets.reduce((a, s) => a + s.rowCount, 0), n: file.sheets.reduce((a, s) => a + s.rowCount, 0).toLocaleString() })}
              </p>
            </div>
            <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] tabular-nums">
              {file.uploadedAt.toLocaleTimeString(timeLocale)}
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        ))}
      </Card>
    </div>
  )
}


/* ═══════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════ */
function EmptyState({ message, sub, onAction, actionLabel }: { message: string; sub: string; onAction?: () => void; actionLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
        <Table2 className="w-7 h-7 text-[var(--text-tertiary)]" />
      </div>
      <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)]">{message}</h3>
      <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1">{sub}</p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
