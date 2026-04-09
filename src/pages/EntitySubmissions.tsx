import { useState, useRef } from 'react'
import {
  Database,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Download,
  X,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { Card, Badge } from '../design-system'
import { dataSubmissions, dataEntities, DataSubmission } from '../data/moduleData'

type EntityTab = 'intercompany' | 'subsidiary' | 'supplier'

const FORMAT_BADGE: Record<DataSubmission['format'], 'amber' | 'teal' | 'blue' | 'purple'> = {
  raw: 'amber',
  measured: 'teal',
  reported: 'blue',
  'supplier-provided': 'purple',
}

const STATUS_CONFIG: Record<DataSubmission['status'], { badge: 'green' | 'blue' | 'amber' | 'red'; icon: typeof CheckCircle2 }> = {
  complete: { badge: 'green', icon: CheckCircle2 },
  submitted: { badge: 'blue', icon: Upload },
  pending: { badge: 'amber', icon: Clock },
  overdue: { badge: 'red', icon: AlertCircle },
}

interface UploadedFile {
  name: string
  size: string
  rows: number
  warnings: number
  status: 'validating' | 'validated' | 'error'
}

export default function EntitySubmissions() {
  const [activeTab, setActiveTab] = useState<EntityTab>('intercompany')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = dataSubmissions.filter((s) => s.entityType === activeTab)
  const totalCount = filtered.length
  const completeCount = filtered.filter((s) => s.status === 'complete').length
  const pendingSubmittedCount = filtered.filter((s) => s.status === 'pending' || s.status === 'submitted').length
  const overdueCount = filtered.filter((s) => s.status === 'overdue').length

  const tabs: { key: EntityTab; label: string }[] = [
    { key: 'intercompany', label: 'Intercompany' },
    { key: 'subsidiary', label: 'Subsidiary' },
    { key: 'supplier', label: 'Supplier' },
  ]

  function handleUploadComplete() {
    setUploadModalOpen(false)
    setToast('File uploaded and validated — 14 data rows imported successfully')
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[var(--text-sm)] font-medium shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-amber-light)] border border-amber-100 flex items-center justify-center">
            <Database className="w-5 h-5 text-[var(--accent-amber)]" />
          </div>
          <div>
            <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">Entity Submissions</h1>
            <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)] max-w-3xl">
              Upload Excel or CSV files from intercompany divisions, subsidiaries, and suppliers.
            </p>
          </div>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" /> Upload File
        </button>
      </div>

      {/* Template Download Strip */}
      <Card padding="sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-[var(--accent-teal)]" />
            <div>
              <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Download Data Templates</p>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Standardised Excel/CSV templates with built-in validation rules</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Emissions Template', ext: '.xlsx' },
              { label: 'Energy Data Template', ext: '.xlsx' },
              { label: 'Supplier Data Template', ext: '.csv' },
              { label: 'Water & Waste Template', ext: '.xlsx' },
            ].map((t) => (
              <button
                key={t.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[var(--text-xs)] font-medium hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <Download className="w-3 h-3" />
                {t.label}
                <span className="text-[var(--text-tertiary)]">{t.ext}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Entity Tabs */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-[var(--text-sm)] font-medium transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)] shadow-sm'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Submissions', value: totalCount, icon: Database, color: 'var(--accent-teal)' },
          { label: 'Complete', value: completeCount, icon: CheckCircle2, color: 'var(--accent-green)' },
          { label: 'Pending / Submitted', value: pendingSubmittedCount, icon: Clock, color: 'var(--accent-amber)' },
          { label: 'Overdue', value: overdueCount, icon: AlertCircle, color: 'var(--accent-red)' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}10`, border: `1px solid ${s.color}25` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tabular-nums">{s.value}</p>
            </Card>
          )
        })}
      </div>

      {/* Recent Uploads */}
      <Card>
        <h2 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">Recent File Uploads</h2>
        <div className="space-y-2">
          {[
            { name: 'MTP_Olefins_Q1_2026_Emissions.xlsx', entity: 'Map Ta Phut Olefins', date: '2026-04-02', rows: 48, status: 'processed' as const, format: 'Excel' },
            { name: 'Rayong_Refinery_Energy_Q1.csv', entity: 'Rayong Refinery', date: '2026-04-01', rows: 36, status: 'processed' as const, format: 'CSV' },
            { name: 'PTTAC_Water_Waste_Q1.xlsx', entity: 'PTT Asahi Chemical', date: '2026-03-30', rows: 24, status: 'processed' as const, format: 'Excel' },
            { name: 'SCG_Chemicals_Scope3_Estimated.csv', entity: 'SCG Chemicals (Supplier)', date: '2026-03-28', rows: 12, status: 'warning' as const, format: 'CSV' },
            { name: 'ENVICCO_Circular_Metrics.xlsx', entity: 'ENVICCO', date: '2026-03-25', rows: 18, status: 'processed' as const, format: 'Excel' },
          ].map((file) => (
            <div key={file.name} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors group">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                file.format === 'Excel' ? 'bg-emerald-50 border border-emerald-100' : 'bg-blue-50 border border-blue-100'
              }`}>
                <FileSpreadsheet className={`w-4 h-4 ${file.format === 'Excel' ? 'text-emerald-500' : 'text-blue-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] truncate">{file.name}</p>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{file.entity} · {file.rows} rows · {file.date}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={file.status === 'processed' ? 'green' : 'amber'} dot>
                  {file.status === 'processed' ? 'Processed' : '2 warnings'}
                </Badge>
                <Badge variant="gray">{file.format}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Submissions Table */}
      <Card>
        <h2 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Submissions
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
          <table className="w-full text-[var(--text-xs)]">
            <thead>
              <tr className="bg-[var(--bg-secondary)]">
                {['Entity Name', 'Data Type', 'Period', 'Format', 'Value', 'Submitted By', 'Date', 'Status'].map((h) => (
                  <th key={h} className="text-left font-semibold text-[var(--text-secondary)] px-4 py-2.5 whitespace-nowrap border-b border-[var(--border-subtle)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => {
                const cfg = STATUS_CONFIG[sub.status]
                return (
                  <tr key={sub.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap">{sub.entityName}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{sub.dataType}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{sub.period}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><Badge variant={FORMAT_BADGE[sub.format]}>{sub.format}</Badge></td>
                    <td className="px-4 py-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap tabular-nums">
                      {sub.value} <span className="text-[var(--text-tertiary)] font-normal">{sub.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{sub.submittedBy}</td>
                    <td className="px-4 py-2.5 text-[var(--text-tertiary)] whitespace-nowrap">{sub.submittedDate || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge variant={cfg.badge} dot>{sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <UploadModal onClose={() => setUploadModalOpen(false)} onComplete={handleUploadComplete} />
      )}
    </div>
  )
}


/* ══════════════════════════════════════
   Upload Modal
   ══════════════════════════════════════ */
function UploadModal({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [entity, setEntity] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function simulateUpload(fileName: string, fileSize: number) {
    const sizeStr = fileSize > 1024 * 1024
      ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${(fileSize / 1024).toFixed(0)} KB`
    setUploadedFile({ name: fileName, size: sizeStr, rows: 0, warnings: 0, status: 'validating' })
    setTimeout(() => {
      setUploadedFile({ name: fileName, size: sizeStr, rows: 14, warnings: 1, status: 'validated' })
    }, 1500)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) simulateUpload(file.name, file.size)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) simulateUpload(file.name, file.size)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-teal-light)] border border-teal-100 flex items-center justify-center">
              <Upload className="w-4 h-4 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h3 className="font-display text-[var(--text-base)] font-bold text-[var(--text-primary)]">Upload Data File</h3>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Accepted formats: .xlsx, .xls, .csv</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Entity Selector */}
          <div>
            <label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Reporting Entity</label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1"
            >
              <option value="">Select entity...</option>
              {dataEntities.map((ent) => (
                <option key={ent.id} value={ent.id}>{ent.name} ({ent.type})</option>
              ))}
            </select>
          </div>

          {/* Drop Zone */}
          {!uploadedFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-subtle)]'
                  : 'border-[var(--border-default)] hover:border-[var(--accent-teal)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileInput} className="hidden" />
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-6 h-6 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-1">Drag & drop your file here</p>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-4">or click to browse</p>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="green">.xlsx</Badge>
                <Badge variant="green">.xls</Badge>
                <Badge variant="blue">.csv</Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] truncate">{uploadedFile.name}</p>
                    <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{uploadedFile.size}</p>
                  </div>
                  <button onClick={() => setUploadedFile(null)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--accent-red)] transition-all cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {uploadedFile.status === 'validating' && (
                  <div className="mt-3 flex items-center gap-2 text-[var(--accent-blue)]">
                    <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-[var(--accent-blue)] rounded-full animate-spin" />
                    <span className="text-[var(--text-xs)] font-semibold">Validating file structure...</span>
                  </div>
                )}

                {uploadedFile.status === 'validated' && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[var(--text-xs)] font-semibold">Validation passed</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Data Rows', value: uploadedFile.rows, color: 'var(--text-primary)' },
                        { label: 'Valid', value: 12, color: 'var(--accent-green)' },
                        { label: 'Warnings', value: uploadedFile.warnings, color: 'var(--accent-amber)' },
                      ].map(s => (
                        <div key={s.label} className="bg-[var(--bg-tertiary)] rounded-lg p-2.5 text-center">
                          <p className="text-[var(--text-lg)] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    {uploadedFile.warnings > 0 && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent-amber)] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[var(--text-xs)] font-semibold text-[var(--accent-amber)]">1 warning found</p>
                          <p className="text-[var(--text-xs)] text-amber-600/70 mt-0.5">Row 8: Emissions value 52,000 is 3x above historical average — flagged for review</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
            Cancel
          </button>
          <button
            onClick={onComplete}
            disabled={!uploadedFile || uploadedFile.status !== 'validated'}
            className="flex-1 h-9 rounded-lg bg-[var(--accent-teal)] text-white text-[var(--text-sm)] font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Import Data
          </button>
        </div>
      </div>
    </div>
  )
}
