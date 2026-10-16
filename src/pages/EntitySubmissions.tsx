import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Upload, CheckCircle2, FileSpreadsheet, Download, X, AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import { Button, Tabs } from '../design-system'
import { EmptyState, StatLedger, StatusPill, notify, type PillTone } from '../components/ui'
import ModuleHeader from '../components/analytics/data/ModuleHeader'
import DropZone from '../components/analytics/data/DropZone'
import { dataSubmissions, dataEntities, type DataSubmission } from '../data/moduleData'
import { downloadCsv } from '../lib/csv'
import { useFmt } from '../lib/fmt'
import { dur, ease } from '../motion/tokens'

type EntityTab = 'intercompany' | 'subsidiary' | 'supplier'

const STATUS_TONE: Record<DataSubmission['status'], { tone: PillTone; dot?: boolean }> = {
  complete: { tone: 'success' },
  submitted: { tone: 'info', dot: true },
  pending: { tone: 'warning', dot: true },
  overdue: { tone: 'danger', dot: true },
}

/** Downloadable templates — CSV with a BOM so Chinese Excel opens them cleanly. */
const TEMPLATES: { id: string; headers: string[] }[] = [
  { id: 'emissions', headers: ['facility_name', 'source_id', 'emission_scope', 'activity_type', 'fuel_type', 'quantity', 'unit', 'emission_factor', 'ef_unit', 'co2e_tonnes', 'reporting_period', 'notes'] },
  { id: 'energy', headers: ['facility_name', 'meter_id', 'energy_type', 'quantity', 'unit', 'reporting_period', 'notes'] },
  { id: 'supplier', headers: ['supplier_name', 'country', 'product_category', 'spend', 'currency', 'co2e_tonnes', 'method', 'reporting_period'] },
  { id: 'waterWaste', headers: ['facility_name', 'water_withdrawal_ml', 'water_discharge_ml', 'waste_generated_t', 'waste_diverted_t', 'hazardous_waste_t', 'reporting_period'] },
]

interface RecentFile {
  name: string
  entity: string
  date: string
  rows: number
  status: 'processed' | 'warning'
  warnings?: number
}

const RECENT: RecentFile[] = [
  { name: 'MTP_Olefins_Q1_2026_Emissions.xlsx', entity: 'Map Ta Phut Olefins', date: '2026-04-02', rows: 48, status: 'processed' },
  { name: 'Rayong_Refinery_Energy_Q1.csv', entity: 'Rayong Refinery', date: '2026-04-01', rows: 36, status: 'processed' },
  { name: 'PTTAC_Water_Waste_Q1.xlsx', entity: 'PTT Asahi Chemical', date: '2026-03-30', rows: 24, status: 'processed' },
  { name: 'SCG_Chemicals_Scope3_Estimated.csv', entity: 'SCG Chemicals (Supplier)', date: '2026-03-28', rows: 12, status: 'warning', warnings: 2 },
  { name: 'ENVICCO_Circular_Metrics.xlsx', entity: 'ENVICCO', date: '2026-03-25', rows: 18, status: 'processed' },
]

export default function EntitySubmissions() {
  const { t } = useTranslation()
  const f = useFmt()
  const [activeTab, setActiveTab] = useState<EntityTab>('intercompany')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [imported, setImported] = useState<RecentFile[]>([])

  const filtered = dataSubmissions.filter((s) => s.entityType === activeTab)
  const count = (pred: (s: DataSubmission) => boolean) => filtered.filter(pred).length
  const recent = [...imported, ...RECENT]

  function handleImported(file: RecentFile) {
    setUploadOpen(false)
    setImported((prev) => [file, ...prev])
    notify.success(t('entitySubmissions.toastImported', { count: file.rows }), {
      description: t('entitySubmissions.toastImportedSub', { file: file.name, entity: file.entity }),
      undo: () => {
        setImported((prev) => prev.filter((x) => x !== file))
        notify.message(t('entitySubmissions.toastReverted', { file: file.name }))
      },
    })
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={t('entitySubmissions.title')}
        description={t('entitySubmissions.subtitle')}
        actions={
          <Button variant="primary" icon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>
            {t('entitySubmissions.uploadFile')}
          </Button>
        }
      />

      {/* Templates */}
      <section className="surface-paper px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4" aria-labelledby="entity-templates">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="entity-templates" className="text-small font-semibold text-[var(--text-primary)]">
              {t('entitySubmissions.templates.title')}
            </h2>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('entitySubmissions.templates.subtitle')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                downloadCsv(`nexus-${tpl.id}-template.csv`, [tpl.headers])
                notify.success(t('entitySubmissions.templates.downloaded', { name: t(`entitySubmissions.templates.${tpl.id}`) }))
              }}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors duration-micro whitespace-nowrap min-w-0"
            >
              <Download className="w-3.5 h-3.5 text-[var(--color-brand)]" aria-hidden />
              {t(`entitySubmissions.templates.${tpl.id}`)}
              <span className="hidden sm:inline text-caption text-[var(--text-tertiary)] font-mono">.csv</span>
            </button>
          ))}
        </div>
      </section>

      <div className="overflow-x-auto -mx-1 px-1 [scrollbar-width:none]">
        <Tabs
          className="w-max"
          aria-label={t('entitySubmissions.tabsAria')}
          tabs={(['intercompany', 'subsidiary', 'supplier'] as EntityTab[]).map((k) => ({
            id: k,
            label: t(`entitySubmissions.tabs.${k}`),
            count: dataSubmissions.filter((s) => s.entityType === k).length,
          }))}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as EntityTab)}
        />
      </div>

      <StatLedger
        items={[
          { id: 'total', label: t('entitySubmissions.stats.total'), value: filtered.length, tone: 'brand' },
          { id: 'complete', label: t('entitySubmissions.stats.complete'), value: count((s) => s.status === 'complete'), tone: 'success' },
          { id: 'pending', label: t('entitySubmissions.stats.pendingSubmitted'), value: count((s) => s.status === 'pending' || s.status === 'submitted'), tone: 'info' },
          { id: 'overdue', label: t('entitySubmissions.stats.overdue'), value: count((s) => s.status === 'overdue'), tone: 'danger' },
        ]}
      />

      {/* Submissions */}
      <section className="surface-paper overflow-hidden" aria-labelledby="entity-table">
        <header className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 id="entity-table" className="type-h3 text-[var(--text-primary)]">
            {t(`entitySubmissions.tableTitle.${activeTab}`)}
          </h2>
        </header>
        {filtered.length === 0 ? (
          <EmptyState density="compact" art="inbox" title={t('entitySubmissions.empty')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[880px]">
              <thead>
                <tr>
                  <th scope="col">{t('entitySubmissions.col.entity')}</th>
                  <th scope="col">{t('entitySubmissions.col.dataType')}</th>
                  <th scope="col">{t('entitySubmissions.col.period')}</th>
                  <th scope="col">{t('entitySubmissions.col.format')}</th>
                  <th scope="col" className="num">
                    {t('entitySubmissions.col.value')}
                  </th>
                  <th scope="col">{t('entitySubmissions.col.submittedBy')}</th>
                  <th scope="col">{t('entitySubmissions.col.date')}</th>
                  <th scope="col">{t('entitySubmissions.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr key={sub.id}>
                    <td className="font-medium !text-[var(--text-primary)] whitespace-nowrap">{sub.entityName}</td>
                    <td className="whitespace-nowrap">{sub.dataType}</td>
                    <td className="whitespace-nowrap">{sub.period}</td>
                    <td>
                      <StatusPill tone="neutral" size="sm">
                        {t(`entitySubmissions.format.${sub.format}`)}
                      </StatusPill>
                    </td>
                    <td className="num !text-[var(--text-primary)] font-semibold">
                      {f.exact(sub.value)} <span className="font-normal text-caption text-[var(--text-tertiary)]">{f.unit(sub.unit)}</span>
                    </td>
                    <td className="whitespace-nowrap">{sub.submittedBy}</td>
                    <td className="whitespace-nowrap tabular-nums">{sub.submittedDate ? f.date(sub.submittedDate) : '—'}</td>
                    <td>
                      <StatusPill tone={STATUS_TONE[sub.status].tone} dot={STATUS_TONE[sub.status].dot} size="sm">
                        {t(`entitySubmissions.status.${sub.status}`)}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent uploads */}
      <section className="surface-paper overflow-hidden" aria-labelledby="entity-recent">
        <header className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 id="entity-recent" className="type-h3 text-[var(--text-primary)]">
            {t('entitySubmissions.recent')}
          </h2>
        </header>
        <ul className="divide-y divide-[var(--border-subtle)]">
          <AnimatePresence initial={false}>
            {recent.map((file) => (
              <motion.li
                key={file.name + file.date}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: dur.base, ease: ease.out }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 sm:gap-4 px-5 py-3.5">
                  <FileSpreadsheet className="w-5 h-5 text-[var(--color-brand)] flex-shrink-0" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-medium text-[var(--text-primary)] truncate">{file.name}</p>
                    <p className="text-caption text-[var(--text-tertiary)]">
                      {file.entity} · {t('entitySubmissions.rows', { count: file.rows })} · <span className="whitespace-nowrap">{f.date(file.date)}</span>
                    </p>
                  </div>
                  <StatusPill tone={file.status === 'processed' ? 'success' : 'warning'} dot size="sm">
                    {file.status === 'processed' ? t('entitySubmissions.processed') : t('entitySubmissions.warnings', { count: file.warnings ?? 1 })}
                  </StatusPill>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <AnimatePresence>{uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} onImported={handleImported} />}</AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════
   Upload dialog: entity → file → validate → import
   ══════════════════════════════════════ */
interface Pending {
  name: string
  size: number
  status: 'validating' | 'validated'
  rows: number
  valid: number
  warnings: number
}

function UploadDialog({ onClose, onImported }: { onClose: () => void; onImported: (file: RecentFile) => void }) {
  const { t } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const titleId = useId()
  const [file, setFile] = useState<Pending | null>(null)
  const [entity, setEntity] = useState('')
  const [entityError, setEntityError] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    selectRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panel.current) {
        const els = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), select, [tabindex="0"]')
        if (!els.length) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (timer.current) window.clearTimeout(timer.current)
      prev?.focus?.()
    }
  }, [onClose])

  function accept(picked: File) {
    const ext = (picked.name.split('.').pop() ?? '').toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      notify.error(t('entitySubmissions.modal.badType'), { description: t('entitySubmissions.modal.formats') })
      return
    }
    setFile({ name: picked.name, size: picked.size, status: 'validating', rows: 0, valid: 0, warnings: 0 })
    timer.current = window.setTimeout(() => {
      setFile((cur) => (cur && cur.name === picked.name ? { ...cur, status: 'validated', rows: 14, valid: 13, warnings: 1 } : cur))
    }, 1500)
  }

  function submit() {
    if (!entity) {
      setEntityError(true)
      selectRef.current?.focus()
      return
    }
    if (!file || file.status !== 'validated') return
    const ent = dataEntities.find((e) => e.id === entity)
    onImported({
      name: file.name,
      entity: ent?.name ?? entity,
      date: new Date().toISOString().slice(0, 10),
      rows: file.rows,
      status: file.warnings ? 'warning' : 'processed',
      warnings: file.warnings,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <motion.div
        className="absolute inset-0"
        style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(2px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: dur.fast }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: dur.base, ease: ease.out }}
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[var(--radius-2xl)] sm:rounded-[var(--radius-xl)] bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-overlay)] flex flex-col"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 id={titleId} className="type-h3 text-[var(--text-primary)]">
              {t('entitySubmissions.modal.title')}
            </h3>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('entitySubmissions.modal.formats')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-10 h-10 -mr-2 -mt-1 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-micro"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-6 space-y-5">
          <div>
            <label htmlFor={`${titleId}-entity`} className="block text-small font-medium text-[var(--text-secondary)] mb-1.5">
              <span className="tabular-nums text-[var(--text-tertiary)] mr-1.5">1</span>
              {t('entitySubmissions.modal.entity')}
            </label>
            <select
              id={`${titleId}-entity`}
              ref={selectRef}
              value={entity}
              aria-invalid={entityError}
              aria-describedby={entityError ? `${titleId}-entity-err` : undefined}
              onChange={(e) => {
                setEntity(e.target.value)
                setEntityError(false)
              }}
              className={`w-full h-10 px-3 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] text-small text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)] focus:border-[var(--color-brand)] ${
                entityError ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)]'
              }`}
            >
              <option value="">{t('entitySubmissions.modal.selectEntity')}</option>
              {dataEntities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name} · {t(`entitySubmissions.tabs.${ent.type}`)}
                </option>
              ))}
            </select>
            {entityError && (
              <p id={`${titleId}-entity-err`} className="text-caption text-[var(--status-danger)] mt-1.5">
                {t('entitySubmissions.modal.entityRequired')}
              </p>
            )}
          </div>

          <div>
            <div className="text-small font-medium text-[var(--text-secondary)] mb-1.5">
              <span className="tabular-nums text-[var(--text-tertiary)] mr-1.5">2</span>
              {t('entitySubmissions.modal.fileLabel')}
            </div>
            {!file ? (
              <DropZone
                compact
                accept=".xlsx,.xls,.csv"
                onFile={accept}
                title={t('entitySubmissions.modal.drop')}
                dragTitle={t('entitySubmissions.modal.dropHere')}
                formats={['.xlsx', '.xls', '.csv']}
              />
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4" aria-live="polite">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-[var(--color-brand)] flex-shrink-0 mt-0.5" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-medium text-[var(--text-primary)] truncate">{file.name}</p>
                    <p className="text-caption text-[var(--text-tertiary)]">
                      {file.size > 1024 * 1024 ? `${f.number(file.size / (1024 * 1024), { precision: 1 })} MB` : `${f.number(file.size / 1024, { precision: 1 })} KB`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label={t('entitySubmissions.modal.remove')}
                    className="w-9 h-9 -mr-1.5 -mt-1.5 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--bg-hover)] transition-colors duration-micro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {file.status === 'validating' ? (
                  <div className="mt-3 flex items-center gap-2 text-[var(--status-info)]">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    <span className="text-caption font-semibold">{t('entitySubmissions.modal.validating')}</span>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2 text-[var(--status-success)]">
                      <CheckCircle2 className="w-4 h-4" aria-hidden />
                      <span className="text-caption font-semibold">{t('entitySubmissions.modal.passed')}</span>
                    </div>
                    <dl className="grid grid-cols-3 gap-px rounded-[var(--radius-md)] overflow-hidden bg-[var(--border-subtle)]">
                      {[
                        { k: 'dataRows', v: file.rows, tone: 'var(--text-primary)' },
                        { k: 'valid', v: file.valid, tone: 'var(--status-success)' },
                        { k: 'warningsLabel', v: file.warnings, tone: 'var(--status-warning)' },
                      ].map((s) => (
                        <div key={s.k} className="bg-[var(--bg-primary)] px-3 py-2.5">
                          <dt className="text-caption text-[var(--text-tertiary)]">{t(`entitySubmissions.modal.${s.k}`)}</dt>
                          <dd className="type-figure text-[20px] leading-7" style={{ color: s.tone }}>
                            {f.number(s.v)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {file.warnings > 0 && (
                      <div className="rounded-[var(--radius-md)] border border-[var(--status-warning-line)] bg-[var(--status-warning-soft)] p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] flex-shrink-0 mt-0.5" aria-hidden />
                        <div>
                          <p className="text-caption font-semibold text-[var(--text-primary)]">{t('entitySubmissions.modal.warningFound', { count: file.warnings })}</p>
                          <p className="text-caption text-[var(--text-secondary)] mt-0.5">{t('entitySubmissions.modal.warningDetail')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] mt-auto">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" className="flex-1" icon={<Upload className="w-4 h-4" />} disabled={!file || file.status !== 'validated'} onClick={submit}>
            {t('entitySubmissions.modal.import')}
          </Button>
        </footer>
      </motion.div>
    </div>
  )
}
