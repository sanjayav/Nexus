import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Download, Send, Loader2, CheckCircle2, AlertCircle,
  Shield, Hash, Clock, FileText, ShieldCheck, Copy, ExternalLink, RotateCw, X, BadgeCheck,
  FileSpreadsheet, Sparkles, Share2,
} from 'lucide-react'
import { useOrgData } from '../lib/useOrgData'
import { useFramework } from '../lib/frameworks'
import { orgStore, type QuestionAssignment, type PublishedReport, type AssuranceRequest, type ReportingPeriod } from '../lib/orgStore'
import PageHeader from '../components/PageHeader'
import SectionHeader from '../design-system/components/SectionHeader'
import Button from '../design-system/components/Button'
import EmptyState from '../design-system/components/EmptyState'
import { SkeletonCard } from '../design-system/components/Skeleton'
import { riseIn, popIn, slideInLeft } from '../components/motion'
import ExcelImport from '../components/ExcelImport'
import JargonTooltip from '../components/JargonTooltip'
import type { ExcelRow } from '../data/pttepDemoData'
import { computeEmissionsTotals, valueForAssignment, type EmissionsTotals } from '../lib/excelToEmissions'

type View = 'loading' | 'ready' | 'error'

/** Locale for date/number display: zh-CN when Chinese, otherwise the
 *  browser default (unchanged English behaviour). */
function useDisplayLocale(): string | undefined {
  const { i18n } = useTranslation()
  return i18n.language?.startsWith('zh') ? 'zh-CN' : undefined
}

export default function ReportPublishing() {
  const { t, i18n } = useTranslation()
  const locale = useDisplayLocale()
  const isZh = i18n.language?.startsWith('zh') ?? false
  const { data: orgData, loading: orgLoading, reload: reloadOrgData } = useOrgData()
  const { active: framework } = useFramework()
  const [state, setState] = useState<View>('loading')
  const [error, setError] = useState<string | null>(null)
  const [periods, setPeriods] = useState<ReportingPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [reports, setReports] = useState<PublishedReport[]>([])
  const [assurance, setAssurance] = useState<AssuranceRequest[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishBanner, setPublishBanner] = useState<{ verify_url: string; sha256: string; version: number; is_draft: boolean } | null>(null)
  const [assuranceModalOpen, setAssuranceModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ totals: EmissionsTotals; updated: number; failed: number } | null>(null)
  const [autoPublishAfterImport, setAutoPublishAfterImport] = useState(false)
  const [shareDialogReport, setShareDialogReport] = useState<PublishedReport | null>(null)

  const load = async () => {
    setState('loading')
    try {
      const [ps, reps, asrs] = await Promise.all([
        orgStore.listPeriods(),
        orgStore.listPublishedReports(),
        orgStore.listAssuranceRequests(),
      ])
      setPeriods(ps.filter(p => p.framework_id === framework.id))
      setReports(reps.filter((r: PublishedReport) => r.framework_id === framework.id))
      setAssurance(asrs.filter((a: AssuranceRequest) => ps.find(p => p.id === a.period_id)?.framework_id === framework.id))
      if (!selectedPeriodId && ps.length > 0) {
        const active = ps.find(p => p.status === 'active' && p.framework_id === framework.id) ?? ps.find(p => p.framework_id === framework.id)
        if (active) setSelectedPeriodId(active.id)
      }
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('publishing.errors.loadFailed'))
      setState('error')
    }
  }

  useEffect(() => { load() }, [framework.id])

  // "+ New report" handoff from TopBar — open the import-from-Excel modal as
  // the entrypoint for generating a new report. Clear the param so a reload
  // doesn't re-trigger it.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('action') === 'new-report') {
      setImportModalOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const period = periods.find(p => p.id === selectedPeriodId) ?? null

  const periodAssignments = useMemo<QuestionAssignment[]>(() => {
    if (!orgData || !period) return []
    return orgData.assignments.filter(a =>
      a.framework_id === framework.id &&
      (a.period_id === period.id || !a.period_id)
    )
  }, [orgData, period, framework.id])

  const readiness = useMemo(() => {
    const total = periodAssignments.length
    const approved = periodAssignments.filter(a => a.status === 'approved').length
    const inFlight = periodAssignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length
    const open = periodAssignments.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected').length
    const pct = total === 0 ? 0 : Math.round((approved / total) * 100)
    const canPublish = approved > 0
    return { total, approved, inFlight, open, pct, canPublish }
  }, [periodAssignments])

  const latestForPeriod = reports.find(r => r.period_id === selectedPeriodId)
  const signedAssurance = assurance.filter(a => a.period_id === selectedPeriodId && a.status === 'signed')
  const pendingAssurance = assurance.filter(a => a.period_id === selectedPeriodId && a.status === 'pending')

  const handlePublish = async (assurance_request_id?: string) => {
    if (!period) return
    setPublishing(true); setPublishBanner(null)
    try {
      const res = await orgStore.publishReport(period.id, assurance_request_id, i18n.language)
      setPublishBanner({ verify_url: res.verify_url, sha256: res.pdf_sha256, version: res.version, is_draft: res.is_draft })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('publishing.errors.publishFailed'))
    } finally {
      setPublishing(false)
    }
  }

  const handleExcelImport = async (rows: ExcelRow[]) => {
    if (!period) return
    setImportModalOpen(false)
    setImporting(true)
    setImportResult(null)
    setError(null)

    const totals = computeEmissionsTotals(rows)

    let updated = 0
    let failed = 0

    try {
      // Reload to get the freshest assignment list
      await reloadOrgData()
      const fresh = await orgStore.listAssignments()
      const periodAssignmentsAll = fresh.filter(a =>
        a.framework_id === framework.id &&
        (a.period_id === period.id || !a.period_id)
      )

      // Prefer GRI 305 (emissions) assignments; fall back to anything in the period
      const emissionsAssignments = periodAssignmentsAll.filter(a => a.gri_code?.startsWith('305-'))
      const targets = emissionsAssignments.length > 0 ? emissionsAssignments : periodAssignmentsAll

      for (const a of targets) {
        const value = valueForAssignment(a.gri_code ?? '', totals) ?? totals.total
        try {
          await orgStore.updateAssignment(a.id, {
            value,
            unit: 'tCO2e',
            status: 'approved',
            comment: `Auto-populated from Excel import (${rows.length} rows). Scope 1: ${totals.scope1} · Scope 2: ${totals.scope2} · Scope 3: ${totals.scope3} tCO2e.`,
          })
          updated += 1
        } catch {
          failed += 1
        }
      }

      await reloadOrgData()
      setImportResult({ totals, updated, failed })

      if (autoPublishAfterImport && updated > 0) {
        setAutoPublishAfterImport(false)
        await handlePublish(signedAssurance[0]?.id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('publishing.errors.importFailed'))
    } finally {
      setImporting(false)
    }
  }

  if (state === 'loading' || orgLoading) {
    return (
      <div className="space-y-6">
        <div className="h-[120px] rounded-[18px] skeleton" />
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard /><SkeletonCard />
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <EmptyState
        icon={<AlertCircle className="w-7 h-7" />}
        title={t('publishing.errors.unableToLoad')}
        description={error ?? ''}
        actions={<Button variant="secondary" onClick={load}>{t('publishing.retry')}</Button>}
      />
    )
  }

  const fz = framework as { nameZh?: string }
  const frameworkName = (isZh && fz.nameZh) || framework.name

  return (
    <div className="page-container space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: t('publishing.breadcrumbReports'), to: '/reports' },
          { label: t('publishing.title') },
        ]}
        eyebrow={t('publishing.eyebrow')}
        title={t('publishing.title')}
        subtitle={t('publishing.subtitle')}
        actions={
          <>
            {period && (
              <Button
                variant="secondary"
                size="md"
                icon={importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                onClick={() => { setAutoPublishAfterImport(false); setImportModalOpen(true) }}
                disabled={importing || publishing}
              >
                {importing ? t('publishing.actions.importing') : t('publishing.actions.importFromExcel')}
              </Button>
            )}
            {period && (
              <Button
                variant="secondary"
                size="md"
                icon={<ShieldCheck className="w-4 h-4" />}
                onClick={() => setAssuranceModalOpen(true)}
              >
                {t('publishing.actions.requestAssurance')}
              </Button>
            )}
            <Button
              variant="brand"
              size="md"
              icon={publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              onClick={() => handlePublish(signedAssurance[0]?.id)}
              disabled={!period || !readiness.canPublish || publishing}
            >
              {publishing ? t('publishing.actions.publishing') : latestForPeriod ? t('publishing.actions.republish') : t('publishing.actions.publishReport')}
            </Button>
          </>
        }
      />

      {publishBanner && <PublishBanner banner={publishBanner} onClose={() => setPublishBanner(null)} />}

      {shareDialogReport && (
        <ShareDialog
          report={shareDialogReport}
          onClose={() => setShareDialogReport(null)}
        />
      )}

      {importResult && (
        <ImportResultBanner
          result={importResult}
          onClose={() => setImportResult(null)}
          onPublish={() => { setImportResult(null); handlePublish(signedAssurance[0]?.id) }}
          publishing={publishing}
        />
      )}

      {/* Period picker */}
      <section>
        <SectionHeader kicker={t('publishing.period.kicker')} title={t('publishing.period.title')} subtitle={t('publishing.period.subtitle', { framework: frameworkName })} />
        <div className="flex flex-wrap gap-2">
          {periods.length === 0 ? (
            <div className="text-[13px] text-[var(--text-tertiary)]">{t('publishing.period.none')}</div>
          ) : (
            periods.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriodId(p.id)}
                className={`chip ${selectedPeriodId === p.id ? 'chip-active' : ''}`}
              >
                {p.label}
                <span className="text-micro text-[var(--text-quaternary)] uppercase tracking-[0.08em]">{t(`publishing.period.status.${p.status}`, { defaultValue: p.status })}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Readiness card */}
      {period && (
        <section>
          <motion.div {...popIn(0)} className="surface-hero p-8">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="kicker mb-2">{t('publishing.readiness.kicker', { period: period.label })}</div>
                <h2 className="text-display text-[28px] text-[var(--text-primary)]">
                  {readiness.total === 0 ? t('publishing.readiness.noneAssigned') : readiness.approved === readiness.total ? t('publishing.readiness.ready') : t('publishing.readiness.approvedOf', { approved: readiness.approved, total: readiness.total })}
                </h2>
                <p className="text-[13.5px] text-[var(--text-secondary)] mt-2 max-w-xl leading-relaxed">
                  {t('publishing.readiness.body1')}
                  <JargonTooltip term={t('publishing.readiness.shaTerm')}>{t('publishing.readiness.shaDef')}</JargonTooltip>
                  {t('publishing.readiness.body2')}
                  <JargonTooltip term={t('publishing.readiness.calendarTerm')}>{t('publishing.readiness.calendarDef')}</JargonTooltip>
                  {t('publishing.readiness.body3')}
                </p>
                <div className="mt-5 max-w-md">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-micro uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)]">{t('publishing.readiness.coverage')}</span>
                    <span className="text-[14px] font-bold tabular-nums text-[var(--text-primary)]">{readiness.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${readiness.pct}%`,
                        background: readiness.pct === 100
                          ? 'linear-gradient(90deg, #10B981, #2E7D32)'
                          : 'linear-gradient(90deg, #047857, #059669)',
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5 flex-wrap">
                  <Tally label={t('publishing.readiness.approved')} value={readiness.approved} accent="green" />
                  <Tally label={t('publishing.readiness.inReview')} value={readiness.inFlight} accent="blue" />
                  <Tally label={t('publishing.readiness.open')} value={readiness.open} accent="amber" />
                </div>
              </div>

              {/* Current assurance badge */}
              <AssurancePill signed={signedAssurance[0]} pending={pendingAssurance[0]} />
            </div>
          </motion.div>
        </section>
      )}

      {/* Latest artifact for this period */}
      {latestForPeriod && (
        <section>
          <SectionHeader kicker={t('publishing.latest.kicker')} title={t('publishing.latest.title', { version: latestForPeriod.version })} subtitle={t('publishing.latest.subtitle', { date: new Date(latestForPeriod.published_at).toLocaleString(locale) })} />
          <ArtifactCard report={latestForPeriod} onShare={setShareDialogReport} />
        </section>
      )}

      {/* Publish history */}
      <section>
        <SectionHeader kicker={t('publishing.history.kicker')} title={t('publishing.history.title')} subtitle={t('publishing.history.subtitle')} />
        {reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-7 h-7" />}
            title={t('publishing.history.emptyTitle')}
            description={t('publishing.history.emptyDesc')}
          />
        ) : (
          <div className="surface-paper overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-micro uppercase tracking-[0.1em] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="text-left px-5 py-3 font-semibold">{t('publishing.history.colVersion')}</th>
                  <th className="text-left px-5 py-3 font-semibold">{t('publishing.history.colPeriod')}</th>
                  <th className="text-left px-5 py-3 font-semibold">{t('publishing.history.colAssurance')}</th>
                  <th className="text-left px-5 py-3 font-semibold">{t('publishing.history.colHash')}</th>
                  <th className="text-left px-5 py-3 font-semibold">{t('publishing.history.colPublished')}</th>
                  <th className="text-right px-5 py-3 font-semibold">{t('publishing.history.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {reports.map((r, i) => <ReportRow key={r.id} report={r} i={i} onShare={setShareDialogReport} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Assurance requests for this period */}
      {period && (
        <section>
          <SectionHeader
            kicker={t('publishing.assurance.kicker')}
            title={t('publishing.assurance.title')}
            subtitle={(
              <>
                {t('publishing.assurance.subtitle1')}
                <JargonTooltip term={t('publishing.assurance.isaeTerm')}>{t('publishing.assurance.isaeDef')}</JargonTooltip>
                {t('publishing.assurance.subtitle2')}
              </>
            )}
          />
          {assurance.filter(a => a.period_id === period.id).length === 0 ? (
            <EmptyState
              size="sm"
              icon={<Shield className="w-6 h-6" />}
              title={t('publishing.assurance.emptyTitle')}
              description={t('publishing.assurance.emptyDesc')}
              actions={<Button variant="brand" size="md" icon={<ShieldCheck className="w-4 h-4" />} onClick={() => setAssuranceModalOpen(true)}>{t('publishing.actions.requestAssurance')}</Button>}
            />
          ) : (
            <div className="space-y-3">
              {assurance.filter(a => a.period_id === period.id).map((a, i) => (
                <AssuranceRow key={a.id} req={a} i={i} onChange={load} />
              ))}
            </div>
          )}
        </section>
      )}

      {assuranceModalOpen && period && (
        <RequestAssuranceModal
          period={period}
          onClose={() => setAssuranceModalOpen(false)}
          onCreated={() => { setAssuranceModalOpen(false); load() }}
        />
      )}

      {importModalOpen && (
        <ExcelImport
          onImport={handleExcelImport}
          onClose={() => setImportModalOpen(false)}
        />
      )}
    </div>
  )
}

function ImportResultBanner({ result, onClose, onPublish, publishing }: {
  result: { totals: EmissionsTotals; updated: number; failed: number }
  onClose: () => void
  onPublish: () => void
  publishing: boolean
}) {
  const { t } = useTranslation()
  const locale = useDisplayLocale()
  const { totals, updated, failed } = result
  const success = updated > 0
  return (
    <motion.div
      {...popIn(0)}
      className="surface-paper p-5 relative overflow-hidden"
      style={{
        background: success
          ? 'linear-gradient(135deg, rgba(46,125,50,0.06) 0%, transparent 60%)'
          : 'linear-gradient(135deg, rgba(230,168,23,0.06) 0%, transparent 60%)',
        borderColor: success ? 'rgba(46,125,50,0.3)' : 'rgba(230,168,23,0.3)',
      }}
    >
      <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: success ? 'var(--accent-green-light)' : 'var(--accent-amber-light)', color: success ? 'var(--status-ok)' : 'var(--status-draft)' }}>
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
            {success
              ? t('publishing.import.successHeadline', { rows: totals.rows, count: updated })
              : t('publishing.import.noMatch')}
          </div>
          <div className="text-[12px] text-[var(--text-secondary)] mt-1 leading-snug">
            {t('publishing.import.computedTotals')}{' '}
            <strong>
              <JargonTooltip term={t('publishing.import.scope1Term')}>{t('publishing.import.scope1Def')}</JargonTooltip>
            </strong>{' '}
            {totals.scope1.toLocaleString(locale)} ·{' '}
            <strong>
              <JargonTooltip term={t('publishing.import.scope2Term')}>{t('publishing.import.scope2Def')}</JargonTooltip>
            </strong>{' '}
            {totals.scope2.toLocaleString(locale)} ·{' '}
            <strong>
              <JargonTooltip term={t('publishing.import.scope3Term')}>{t('publishing.import.scope3Def')}</JargonTooltip>
            </strong>{' '}
            {totals.scope3.toLocaleString(locale)} tCO₂e
            {failed > 0 && <span className="text-[var(--status-reject)]"> · {t('publishing.import.updatesFailed', { count: failed })}</span>}
          </div>
          {success && (
            <div className="mt-3">
              <Button
                variant="brand"
                size="sm"
                icon={publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                onClick={onPublish}
                disabled={publishing}
              >
                {publishing ? t('publishing.actions.publishing') : t('publishing.actions.publishReportNow')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Sub-components ────────────────────────────────────────

function Tally({ label, value, accent }: { label: string; value: number; accent: 'green' | 'blue' | 'amber' }) {
  const bg = accent === 'green' ? 'var(--accent-green-light)' : accent === 'blue' ? 'var(--accent-blue-light)' : 'var(--accent-amber-light)'
  const fg = accent === 'green' ? 'var(--status-ok)' : accent === 'blue' ? 'var(--status-pending)' : 'var(--status-draft)'
  return (
    <div className="px-3 py-2 rounded-[10px]" style={{ background: bg }}>
      <div className="text-micro uppercase tracking-[0.12em] font-semibold" style={{ color: fg }}>{label}</div>
      <div className="text-[18px] font-bold tabular-nums tracking-[-0.01em]" style={{ color: fg }}>{value}</div>
    </div>
  )
}

function AssurancePill({ signed, pending }: { signed?: AssuranceRequest; pending?: AssuranceRequest }) {
  const { t } = useTranslation()
  const locale = useDisplayLocale()
  if (signed) {
    return (
      <div className="px-4 py-3 rounded-[12px] border border-[var(--status-ok)]/30 bg-[var(--accent-green-light)]/60 min-w-[200px]">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-[var(--status-ok)]" />
          <span className="text-micro uppercase tracking-[0.12em] font-bold text-[var(--status-ok)]">{t('publishing.pill.assured')}</span>
        </div>
        <div className="text-[13.5px] font-semibold text-[var(--text-primary)] mt-1.5 truncate">{signed.auditor_firm ?? signed.auditor_email}</div>
        <div className="text-caption text-[var(--text-tertiary)] mt-0.5">
          {signed.opinion_type === 'reasonable' ? t('publishing.pill.reasonable') : t('publishing.pill.limited')} · {signed.signed_at ? new Date(signed.signed_at).toLocaleDateString(locale) : ''}
        </div>
      </div>
    )
  }
  if (pending) {
    return (
      <div className="px-4 py-3 rounded-[12px] border border-[var(--status-draft)]/30 bg-[var(--accent-amber-light)]/60 min-w-[200px]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--status-draft)]" />
          <span className="text-micro uppercase tracking-[0.12em] font-bold text-[var(--status-draft)]">{t('publishing.pill.pending')}</span>
        </div>
        <div className="text-[13.5px] font-semibold text-[var(--text-primary)] mt-1.5 truncate">{pending.auditor_firm ?? pending.auditor_email}</div>
        <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('publishing.pill.linkActive')}</div>
      </div>
    )
  }
  return (
    <div className="px-4 py-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-secondary)] min-w-[200px]">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-[var(--text-tertiary)]" />
        <span className="text-micro uppercase tracking-[0.12em] font-bold text-[var(--text-tertiary)]">{t('publishing.pill.unaudited')}</span>
      </div>
      <div className="text-[13.5px] font-semibold text-[var(--text-primary)] mt-1.5">{t('publishing.pill.noAssurance')}</div>
      <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('publishing.pill.willPublishDraft')}</div>
    </div>
  )
}

function PublishBanner({ banner, onClose }: { banner: { verify_url: string; sha256: string; version: number; is_draft: boolean }; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <motion.div
      {...popIn(0)}
      className="surface-paper p-5 relative overflow-hidden"
      style={{
        background: banner.is_draft
          ? 'linear-gradient(135deg, rgba(230,168,23,0.06) 0%, transparent 60%)'
          : 'linear-gradient(135deg, rgba(46,125,50,0.06) 0%, transparent 60%)',
        borderColor: banner.is_draft ? 'rgba(230,168,23,0.3)' : 'rgba(46,125,50,0.3)',
      }}
    >
      <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: banner.is_draft ? 'var(--accent-amber-light)' : 'var(--accent-green-light)', color: banner.is_draft ? 'var(--status-draft)' : 'var(--status-ok)' }}>
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
            {banner.is_draft ? t('publishing.banner.publishedDraft', { version: banner.version }) : t('publishing.banner.publishedAssured', { version: banner.version })}
          </div>
          <div className="text-[12px] text-[var(--text-secondary)] mt-1 leading-snug">
            SHA-256: <span className="font-mono">{banner.sha256.slice(0, 24)}…</span> {t('publishing.banner.anchored')}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="font-mono text-caption text-[var(--color-brand-strong)] bg-[var(--bg-secondary)] px-2 py-1 rounded-[6px] border border-[var(--border-subtle)] truncate">{banner.verify_url}</code>
            <button onClick={() => navigator.clipboard.writeText(banner.verify_url)} className="px-2 py-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a href={banner.verify_url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ArtifactCard({ report, onShare }: { report: PublishedReport; onShare: (r: PublishedReport) => void }) {
  const { t } = useTranslation()
  const locale = useDisplayLocale()
  return (
    <motion.div {...popIn(0)} className="surface-paper p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-brand-soft)', color: 'var(--color-brand)' }}>
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">{t('publishing.artifact.version', { version: report.version, framework: report.framework_id.toUpperCase() })}</span>
              {report.is_draft ? (
                <span className="chip" style={{ background: 'var(--accent-amber-light)', color: 'var(--status-draft)', borderColor: 'rgba(230,168,23,0.3)' }}>{t('publishing.artifact.draft')}</span>
              ) : (
                <span className="chip" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)', borderColor: 'rgba(46,125,50,0.3)' }}>{t('publishing.artifact.assured')}</span>
              )}
            </div>
            <div className="text-caption text-[var(--text-tertiary)]">{t('publishing.artifact.meta', { size: (report.pdf_size / 1024).toFixed(1), name: report.published_by_name })}</div>
            <div className="text-caption text-[var(--text-tertiary)] mt-2 flex items-center gap-1.5 font-mono tabular-nums">
              <Hash className="w-3 h-3" />
              {report.pdf_sha256.slice(0, 24)}…{report.pdf_sha256.slice(-8)}
            </div>
            {report.anchor_tip_hash && (
              <div className="text-caption text-[var(--status-ok)] mt-1.5 flex items-center gap-1.5">
                <BadgeCheck className="w-3 h-3" />
                {t('publishing.artifact.anchoredOn', { date: report.anchored_at ? new Date(report.anchored_at).toLocaleDateString(locale) : '—' })}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="md" icon={<ExternalLink className="w-4 h-4" />} onClick={() => window.open(`/verify/${report.verification_token}`, '_blank')}>
            {t('publishing.artifact.verify')}
          </Button>
          <Button variant="secondary" size="md" icon={<Download className="w-4 h-4" />} onClick={() => orgStore.downloadReportIxbrl(report.id, `${report.framework_id}-${report.period_label.replace(/\s+/g, '')}-v${report.version}.xhtml`)} title={t('publishing.artifact.ixbrlTitle')}>
            iXBRL
          </Button>
          <Button variant="secondary" size="md" icon={<Download className="w-4 h-4" />} onClick={() => orgStore.downloadReportDocx(report.id, `${report.framework_id}-${report.period_label.replace(/\s+/g, '')}-v${report.version}.docx`)} title={t('publishing.artifact.wordTitle')}>
            {t('publishing.artifact.word')}
          </Button>
          <Button variant="secondary" size="md" icon={<Share2 className="w-4 h-4" />} onClick={() => onShare(report)} title={t('publishing.artifact.shareTitle')}>
            {t('publishing.artifact.sharePublicly')}
          </Button>
          <Button variant="brand" size="md" icon={<Download className="w-4 h-4" />} onClick={() => orgStore.downloadReportPdf(report.id, `${report.framework_id}-${report.period_label.replace(/\s+/g, '')}-v${report.version}.pdf`)}>
            {t('publishing.artifact.download')}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function ReportRow({ report, i, onShare }: { report: PublishedReport; i: number; onShare: (r: PublishedReport) => void }) {
  const { t } = useTranslation()
  const locale = useDisplayLocale()
  return (
    <motion.tr {...slideInLeft(i)} className="hover:bg-[var(--bg-secondary)]">
      <td className="px-5 py-3">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">v{report.version}</span>
      </td>
      <td className="px-5 py-3">
        <div className="text-[12.5px] text-[var(--text-primary)] font-medium">{report.period_label}</div>
        <div className="text-caption text-[var(--text-tertiary)]">{t('publishing.history.fy', { year: report.period_year })}</div>
      </td>
      <td className="px-5 py-3">
        {report.is_draft ? (
          <span className="chip" style={{ background: 'var(--accent-amber-light)', color: 'var(--status-draft)' }}>{t('publishing.artifact.draft')}</span>
        ) : (
          <span className="chip" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)' }}>{report.auditor_firm ?? t('publishing.history.signed')}</span>
        )}
      </td>
      <td className="px-5 py-3 font-mono text-caption text-[var(--text-tertiary)] tabular-nums">
        {report.pdf_sha256.slice(0, 14)}…
        {report.anchor_tip_hash && <span className="ml-2 inline-flex items-center gap-0.5 text-[var(--status-ok)]"><BadgeCheck className="w-3 h-3" />{t('publishing.history.anchored')}</span>}
      </td>
      <td className="px-5 py-3 text-caption text-[var(--text-secondary)]">
        {new Date(report.published_at).toLocaleDateString(locale)}
        <div className="text-caption text-[var(--text-tertiary)]">{report.published_by_name}</div>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="inline-flex gap-1.5">
          <a href={`/verify/${report.verification_token}`} target="_blank" rel="noreferrer" className="px-2 h-7 inline-flex items-center rounded-[6px] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title={t('publishing.history.publicVerification')}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={() => orgStore.downloadReportPdf(report.id, `${report.framework_id}-v${report.version}.pdf`)} className="px-2 h-7 inline-flex items-center rounded-[6px] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title={t('publishing.history.downloadPdf')}>
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => orgStore.downloadReportDocx(report.id, `${report.framework_id}-v${report.version}.docx`)} className="px-2 h-7 inline-flex items-center rounded-[6px] text-caption font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title={t('publishing.history.downloadWord')}>
            {t('publishing.artifact.word')}
          </button>
          <button onClick={() => orgStore.downloadReportIxbrl(report.id, `${report.framework_id}-v${report.version}.xhtml`)} className="px-2 h-7 inline-flex items-center rounded-[6px] text-caption font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title={t('publishing.history.downloadIxbrl')}>
            iXBRL
          </button>
          <button onClick={() => onShare(report)} className="px-2 h-7 inline-flex items-center rounded-[6px] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title={t('publishing.history.sharePublicly')}>
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </motion.tr>
  )
}

function AssuranceRow({ req, i, onChange }: { req: AssuranceRequest; i: number; onChange: () => void }) {
  const { t } = useTranslation()
  const locale = useDisplayLocale()
  const [busy, setBusy] = useState(false)
  const [showLink, setShowLink] = useState<string | null>(null)

  const copyUploadLink = async () => {
    setBusy(true)
    try {
      const { upload_token } = await orgStore.getAssuranceUploadLink(req.id)
      const url = `${window.location.origin}/assure/${upload_token}`
      await navigator.clipboard.writeText(url)
      setShowLink(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : t('publishing.errors.unableToGetLink'))
    } finally {
      setBusy(false)
    }
  }

  const rotateLink = async () => {
    if (!confirm(t('publishing.assuranceRow.confirmRotate'))) return
    setBusy(true)
    try {
      const { upload_token } = await orgStore.rotateAssuranceToken(req.id)
      const url = `${window.location.origin}/assure/${upload_token}`
      await navigator.clipboard.writeText(url)
      setShowLink(url)
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async () => {
    if (!confirm(t('publishing.assuranceRow.confirmWithdraw'))) return
    setBusy(true)
    try {
      await orgStore.withdrawAssurance(req.id)
      onChange()
    } finally {
      setBusy(false)
    }
  }

  const statusColor =
    req.status === 'signed' ? { bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' }
    : req.status === 'pending' ? { bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)' }
    : { bg: 'var(--bg-tertiary)', fg: 'var(--text-tertiary)' }

  return (
    <motion.div {...riseIn(i)} className="surface-paper p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: statusColor.bg, color: statusColor.fg }}>
            {req.status === 'signed' ? <BadgeCheck className="w-5 h-5" /> : req.status === 'pending' ? <Clock className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{req.auditor_firm ?? req.auditor_name ?? req.auditor_email}</span>
              <span className="chip" style={{ background: statusColor.bg, color: statusColor.fg, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>{t(`publishing.assuranceRow.status.${req.status}`, { defaultValue: req.status })}</span>
              {req.opinion_type && <span className="chip">{req.opinion_type === 'reasonable' ? t('publishing.assuranceRow.reasonable') : t('publishing.assuranceRow.limited')}</span>}
            </div>
            <div className="text-[12px] text-[var(--text-tertiary)] mt-1">
              {t('publishing.assuranceRow.requested', { email: req.auditor_email, date: new Date(req.requested_at).toLocaleDateString(locale) })}
              {req.signed_at && <>{t('publishing.assuranceRow.signedBy', { date: new Date(req.signed_at).toLocaleDateString(locale), name: req.signed_by })}</>}
            </div>
            {req.notes && <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 leading-relaxed">{req.notes}</p>}
            {req.statement_sha256 && (
              <div className="text-caption text-[var(--text-tertiary)] mt-2 font-mono">
                {t('publishing.assuranceRow.statementHash', { hash: req.statement_sha256.slice(0, 20) })}
              </div>
            )}
            {showLink && (
              <div className="mt-3 p-3 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div className="text-micro uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)] mb-1">{t('publishing.assuranceRow.linkCopied')}</div>
                <code className="font-mono text-caption text-[var(--color-brand-strong)] break-all">{showLink}</code>
                <div className="text-caption text-[var(--text-tertiary)] mt-1.5">{t('publishing.assuranceRow.linkHelp')}</div>
              </div>
            )}
          </div>
        </div>

        {req.status === 'pending' && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" variant="secondary" icon={<Copy className="w-3.5 h-3.5" />} onClick={copyUploadLink} disabled={busy}>{t('publishing.assuranceRow.copyLink')}</Button>
            <Button size="sm" variant="ghost" icon={<RotateCw className="w-3.5 h-3.5" />} onClick={rotateLink} disabled={busy}>{t('publishing.assuranceRow.rotate')}</Button>
            <Button size="sm" variant="ghost" icon={<X className="w-3.5 h-3.5" />} onClick={withdraw} disabled={busy}>{t('publishing.assuranceRow.withdraw')}</Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RequestAssuranceModal({ period, onClose, onCreated }: { period: ReportingPeriod; onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation()
  const [firm, setFirm] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [opinion, setOpinion] = useState<'limited' | 'reasonable'>('limited')
  const [isae, setIsae] = useState('ISAE 3000 (Revised)')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!email) { setError(t('publishing.errors.auditorEmailRequired')); return }
    setSubmitting(true); setError(null)
    try {
      await orgStore.requestAssurance({
        period_id: period.id,
        auditor_email: email,
        auditor_firm: firm || undefined,
        auditor_name: name || undefined,
        opinion_type: opinion,
        isae_reference: isae,
        notes: notes || undefined,
      })
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('publishing.errors.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        className="surface-paper max-w-lg w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="kicker">{t('publishing.modal.kicker')}</span>
            <h2 className="text-display text-[22px] text-[var(--text-primary)] mt-0.5">{t('publishing.modal.title')}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed mb-4">
          {t('publishing.modal.intro', { period: period.label })}
        </p>

        <div className="space-y-3">
          <Field label={t('publishing.modal.firm')} placeholder={t('publishing.modal.firmPlaceholder')} value={firm} onChange={setFirm} />
          <Field label={t('publishing.modal.contactName')} placeholder={t('publishing.modal.contactNamePlaceholder')} value={name} onChange={setName} />
          <Field label={t('publishing.modal.contactEmail')} placeholder="partner@firm.com" value={email} onChange={setEmail} type="email" />
          <div>
            <label className="text-micro uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">{t('publishing.modal.level')}</label>
            <div className="flex gap-1.5">
              {(['limited', 'reasonable'] as const).map(o => (
                <button key={o} onClick={() => setOpinion(o)} className={`chip flex-1 justify-center ${opinion === o ? 'chip-active' : ''}`}>
                  {o === 'limited' ? t('publishing.modal.limited') : t('publishing.modal.reasonable')}
                </button>
              ))}
            </div>
          </div>
          <Field label={t('publishing.modal.standard')} placeholder="ISAE 3000 (Revised)" value={isae} onChange={setIsae} />
          <Field label={t('publishing.modal.notes')} placeholder={t('publishing.modal.notesPlaceholder')} value={notes} onChange={setNotes} as="textarea" />
        </div>

        {error && <div className="mt-4 p-3 rounded-[8px] bg-[var(--accent-red-light)] text-[var(--status-reject)] text-[12.5px] font-medium">{error}</div>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>{t('publishing.modal.cancel')}</Button>
          <Button variant="brand" size="md" icon={<ShieldCheck className="w-4 h-4" />} onClick={submit} loading={submitting}>{t('publishing.modal.create')}</Button>
        </div>
      </motion.div>
    </div>
  )
}

function Field({ label, placeholder, value, onChange, type = 'text', as = 'input' }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void; type?: string; as?: 'input' | 'textarea' }) {
  return (
    <label className="block">
      <span className="text-micro uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">{label}</span>
      {as === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none resize-none transition-all"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none transition-all"
        />
      )}
    </label>
  )
}

/**
 * Generates a public token for a published report. The token is revealed
 * ONCE — copying it is the user's responsibility. We never round-trip the
 * password back to the client (server stores a bcrypt hash only).
 */
function ShareDialog({ report, onClose }: { report: PublishedReport; onClose: () => void }) {
  const { t } = useTranslation()
  const locale = useDisplayLocale()
  const [expiresInDays, setExpiresInDays] = useState<number>(30)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ token: string; url: string; expires_at: string | null } | null>(null)

  const generate = async () => {
    setBusy(true); setError(null)
    try {
      const r = await orgStore.createShareLink({
        reportId: report.id,
        expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
        password: password || undefined,
      })
      // Build a full URL so the user can copy-paste with origin intact.
      const fullUrl = `${window.location.origin}${r.url}`
      setResult({ token: r.token, url: fullUrl, expires_at: r.expires_at })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('publishing.errors.shareFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={t('publishing.share.title')}>
      <div className="surface-paper p-6 w-full max-w-lg space-y-4">
        <header className="flex items-center justify-between">
          <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)]">{t('publishing.share.title')}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-tertiary)]" aria-label={t('publishing.share.close')}>
            <X className="w-4 h-4" />
          </button>
        </header>
        <p className="text-[12.5px] text-[var(--text-secondary)]">
          {t('publishing.share.intro')}
        </p>
        {!result && (
          <>
            <label className="block">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{t('publishing.share.expires')}</span>
              <input
                type="number"
                min={0}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px]"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{t('publishing.share.password')}</span>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('publishing.share.passwordPlaceholder')}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px]"
              />
            </label>
            {error && <div className="text-[12px] text-[var(--accent-red)]">{error}</div>}
            <footer className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="chip">{t('publishing.share.cancel')}</button>
              <button type="button" onClick={generate} disabled={busy} className="chip chip-active">
                {busy ? t('publishing.share.generating') : t('publishing.share.generate')}
              </button>
            </footer>
          </>
        )}
        {result && (
          <div className="space-y-3">
            <div className="text-[12.5px] text-[var(--text-primary)] font-semibold">{t('publishing.share.ready')}</div>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 font-mono text-caption text-[var(--color-brand-strong)] bg-[var(--bg-secondary)] px-2 py-2 rounded-[6px] border border-[var(--border-subtle)] truncate">
                {result.url}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(result.url)}
                className="chip inline-flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> {t('publishing.share.copy')}
              </button>
            </div>
            {result.expires_at && (
              <div className="text-caption text-[var(--text-tertiary)]">
                {t('publishing.share.expiresOn', { date: new Date(result.expires_at).toLocaleString(locale) })}
              </div>
            )}
            {password && (
              <div className="text-caption text-[var(--text-tertiary)]">
                {t('publishing.share.passwordActive')}
              </div>
            )}
            <footer className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="chip chip-active">{t('publishing.share.done')}</button>

            </footer>
          </div>
        )}
      </div>
    </div>
  )
}
