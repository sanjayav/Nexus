import { useState, useRef } from 'react'
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Send,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  X,
  Trash2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, Badge } from '../design-system'
import { suppliers, formatNumber } from '../data/pttgcData'

const TOOLTIP_STYLE = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 12,
  color: 'var(--text-primary)',
  fontSize: 12,
}

export default function SupplierData() {
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const totalSuppliers = suppliers.length
  const avgCompleteness = Math.round(
    suppliers.reduce((sum, s) => sum + s.dataCompleteness, 0) / totalSuppliers
  )
  const supplierProvidedCount = suppliers.filter((s) => s.dataFormat === 'supplier-provided').length
  const estimatedCount = suppliers.filter((s) => s.dataFormat === 'estimated').length

  const chartData = suppliers
    .slice()
    .sort((a, b) => b.estimatedEmissions - a.estimatedEmissions)
    .map((s) => ({
      name: s.name.length > 18 ? s.name.slice(0, 16) + '...' : s.name,
      fullName: s.name,
      emissions: s.estimatedEmissions,
    }))

  function handleRequestData(id: string, name: string) {
    setRequestedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setToast(`Template sent to ${name} — awaiting their Excel/CSV upload`)
    setTimeout(() => setToast(null), 4000)
  }

  function handleUploadComplete() {
    setUploadModalOpen(false)
    setToast('Supplier file uploaded — 8 emission records imported, replacing estimates with actuals')
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-teal-light)] text-[var(--accent-teal)] border border-[var(--accent-teal)]/20 text-[var(--text-sm)] font-medium shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-green-light)] border border-green-200 flex items-center justify-center">
            <Truck className="w-5 h-5 text-[var(--accent-green)]" />
          </div>
          <div>
            <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)]">Supplier Data Collection</h1>
            <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)] max-w-3xl">
              Scope 3 supply chain emissions. Send standardised Excel/CSV templates to suppliers,
              then upload their completed files to replace estimates with actual data.
            </p>
          </div>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-[var(--accent-teal)] text-white text-[var(--text-sm)] font-medium hover:opacity-90 transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Upload Supplier File
        </button>
      </div>

      {/* Template Strip */}
      <Card padding="sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-[var(--accent-teal)]" />
            <div>
              <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Supplier Data Templates</p>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Download and send to suppliers. Pre-formatted with emission categories, units, and validation.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Scope 3 Emissions', ext: '.xlsx' },
              { label: 'Transport & Logistics', ext: '.csv' },
              { label: 'Material Footprint', ext: '.xlsx' },
            ].map((t) => (
              <button
                key={t.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[var(--text-xs)] font-medium hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                {t.label}
                <span className="text-[var(--text-quaternary)]">{t.ext}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: totalSuppliers, icon: Truck, accent: 'teal' as const },
          { label: 'Avg Completeness', value: `${avgCompleteness}%`, icon: CheckCircle2, accent: 'blue' as const },
          { label: 'File Uploaded', value: supplierProvidedCount, icon: FileSpreadsheet, accent: 'green' as const },
          { label: 'Estimated Only', value: estimatedCount, icon: AlertCircle, accent: 'amber' as const },
        ].map((card) => {
          const Icon = card.icon
          const accentVar = `var(--accent-${card.accent})`
          const lightVar = `var(--accent-${card.accent}-light)`
          return (
            <Card key={card.label}>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: lightVar, border: `1px solid ${accentVar}30` }}
                >
                  <Icon className="w-4 h-4" style={{ color: accentVar }} />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {card.label}
                </span>
              </div>
              <span className="text-[var(--text-2xl)] font-display font-bold text-[var(--text-primary)]">{card.value}</span>
            </Card>
          )
        })}
      </div>

      {/* Supplier Table */}
      <Card>
        <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mb-4">Supplier Emissions</h2>

        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-[var(--text-sm)]">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                {[
                  'Supplier',
                  'Category',
                  'Emissions (tCO\u2082e)',
                  'Data Completeness',
                  'Data Source',
                  'Last Updated',
                  'Status',
                  '',
                ].map((h, i) => (
                  <th
                    key={i}
                    className="text-left font-semibold text-[var(--text-tertiary)] text-[var(--text-xs)] uppercase tracking-wider px-5 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup) => {
                const isRequested = requestedIds.has(sup.id)
                return (
                  <tr
                    key={sup.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <td className="px-5 py-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap">
                      {sup.name}
                    </td>
                    <td className="px-5 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{sup.category}</td>
                    <td className="px-5 py-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap tabular-nums">
                      {formatNumber(sup.estimatedEmissions)}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sup.dataCompleteness >= 80
                                ? 'bg-[var(--accent-teal)]'
                                : sup.dataCompleteness >= 50
                                  ? 'bg-[var(--accent-amber)]'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${sup.dataCompleteness}%` }}
                          />
                        </div>
                        <span className="text-[var(--text-xs)] text-[var(--text-secondary)] w-8 text-right tabular-nums">
                          {sup.dataCompleteness}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <Badge variant={sup.dataFormat === 'supplier-provided' ? 'teal' : 'amber'}>
                        {sup.dataFormat === 'supplier-provided' ? 'Excel/CSV' : 'Estimated'}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-[var(--text-tertiary)] whitespace-nowrap">
                      {sup.lastUpdated}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <StatusBadge status={sup.status} />
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-right">
                      {sup.status !== 'complete' && !isRequested ? (
                        <button
                          onClick={() => handleRequestData(sup.id, sup.name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-teal-light)] text-[var(--accent-teal)] border border-[var(--accent-teal)]/20 text-[var(--text-xs)] font-medium hover:opacity-80 transition-colors cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          Send Template
                        </button>
                      ) : isRequested ? (
                        <span className="text-[var(--text-xs)] text-[var(--text-quaternary)]">Template Sent</span>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Emissions Bar Chart */}
      <Card>
        <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mb-1">
          Emissions by Supplier
        </h2>
        <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mb-6">
          Scope 3 upstream emissions contribution per supplier (tCO&#8322;e).
        </p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                interval={0}
                stroke="var(--border-subtle)"
              />
              <YAxis
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                stroke="var(--border-subtle)"
                tickFormatter={(v: number) => formatNumber(v)}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number) => [formatNumber(value) + ' tCO\u2082e', 'Emissions']}
                labelFormatter={(label: string) => {
                  const match = chartData.find((d) => d.name === label)
                  return match ? match.fullName : label
                }}
              />
              <Bar dataKey="emissions" fill="var(--accent-teal)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <SupplierUploadModal
          onClose={() => setUploadModalOpen(false)}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: 'complete' | 'partial' | 'incomplete' }) {
  const config = {
    complete: { variant: 'green' as const, label: 'Complete' },
    partial: { variant: 'amber' as const, label: 'Partial' },
    incomplete: { variant: 'red' as const, label: 'Incomplete' },
  }
  const c = config[status]
  return <Badge variant={c.variant} dot>{c.label}</Badge>
}

function SupplierUploadModal({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete: () => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; rows: number; status: 'validating' | 'validated' } | null>(null)
  const [supplier, setSupplier] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function simulateUpload(fileName: string, fileSize: number) {
    const sizeStr = fileSize > 1024 * 1024
      ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${(fileSize / 1024).toFixed(0)} KB`

    setUploadedFile({ name: fileName, size: sizeStr, rows: 0, status: 'validating' })
    setTimeout(() => {
      setUploadedFile({ name: fileName, size: sizeStr, rows: 8, status: 'validated' })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-teal-light)] border border-teal-200 flex items-center justify-center">
              <Upload className="w-4 h-4 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Upload Supplier Data</h3>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Upload a completed supplier Excel/CSV file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Supplier Selector */}
          <div>
            <label className="block text-[var(--text-xs)] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
              Supplier
            </label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] px-4 py-2.5 focus:outline-none focus:border-[var(--accent-teal)]"
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
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
                  ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-light)]'
                  : 'border-[var(--border-default)] hover:border-[var(--text-tertiary)] bg-[var(--bg-secondary)]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-6 h-6 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-1">
                Drop supplier's Excel or CSV file
              </p>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-3">or click to browse</p>
              <div className="flex items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5">
                  <FileSpreadsheet className="w-2.5 h-2.5" /> .xlsx
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5">
                  <FileText className="w-2.5 h-2.5" /> .csv
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] truncate">{uploadedFile.name}</p>
                  <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{uploadedFile.size}</p>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {uploadedFile.status === 'validating' && (
                <div className="mt-3 flex items-center gap-2 text-[var(--accent-blue)]">
                  <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-[var(--accent-blue)] rounded-full animate-spin" />
                  <span className="text-[var(--text-xs)] font-semibold">Validating against template schema...</span>
                </div>
              )}
              {uploadedFile.status === 'validated' && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-[var(--accent-teal)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[var(--text-xs)] font-semibold">Validation passed — {uploadedFile.rows} emission records found</span>
                  </div>
                  <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
                    Estimated values will be replaced with supplier-provided actuals on import.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-[var(--border-default)]">
          <button
            onClick={onClose}
            className="flex-1 px-4 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onComplete}
            disabled={!uploadedFile || uploadedFile.status !== 'validated'}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl bg-[var(--accent-teal)] text-white text-[var(--text-sm)] font-medium hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import Data
          </button>
        </div>
      </div>
    </div>
  )
}
