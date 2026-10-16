import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import {
  BadgeCheck, CalendarPlus, Clock, Copy, Download, ExternalLink, FileSpreadsheet, FileText, Hash,
  Loader2, RotateCw, Send, Share2, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import { useOrgData } from '../lib/useOrgData'
import { useFramework } from '../lib/frameworks'
import {
  orgStore, type Anomaly, type AssuranceRequest, type PublishedReport, type PublishReportResult,
  type QuestionAssignment, type ReportingPeriod,
} from '../lib/orgStore'
import { useFmt } from '../lib/fmt'
import PageHeader from '../components/PageHeader'
import Button from '../design-system/components/Button'
import ExcelImport from '../components/ExcelImport'
import JargonTooltip from '../components/JargonTooltip'
import {
  ConfirmSheet, EmptyState, NumberTicker, Skeleton, SkeletonCard, StateBoundary, StatusPill, notify, useConfirm,
} from '../components/ui'
import ReadinessChecklist, { type ReadinessCheck } from '../components/review/ReadinessChecklist'
import LangSegment from '../components/review/LangSegment'
import PublishMoment, { type PublishedResult } from '../components/review/PublishMoment'
import { frameworkName, reportLangTag, toReportLang, type ReportLang } from '../components/review/reportLang'
import { barFill, popIn, riseIn } from '../motion/tokens'
import type { ExcelRow } from '../data/pttepDemoData'
import { computeEmissionsTotals, valueForAssignment, type EmissionsTotals } from '../lib/excelToEmissions'

/** The API adds `locale` to published reports (report_artifacts.locale). */
type Report = PublishedReport & { locale?: string | null }

/** Below this approval share (or with any critical anomaly) the publisher must type the period to confirm. */
const LOW_READINESS_PCT = 50

export default function ReportPublishing() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const confirm = useConfirm()
  const { data: orgData, loading: orgLoading, error: orgError, reload: reloadOrgData } = useOrgData()
  const { active: framework } = useFramework()

  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [periods, setPeriods] = useState<ReportingPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [reports, setReports] = useState<Report[]>([])
  const [assurance, setAssurance] = useState<AssuranceRequest[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[] | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [reportLang, setReportLang] = useState<ReportLang>(toReportLang(i18n.language) ?? 'en')
  const [moment, setMoment] = useState<PublishedResult | null>(null)
  const [assuranceOpen, setAssuranceOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ totals: EmissionsTotals; updated: number; failed: number } | null>(null)
  const [shareReport, setShareReport] = useState<Report | null>(null)

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    try {
      const [ps, reps, asrs] = await Promise.all([
        orgStore.listPeriods(),
        orgStore.listPublishedReports(),
        orgStore.listAssuranceRequests(),
      ])
      const fwPeriods = ps.filter(p => p.framework_id === framework.id)
      setPeriods(fwPeriods)
      setReports((reps as Report[]).filter(r => r.framework_id === framework.id))
      setAssurance(asrs.filter(a => ps.find(p => p.id === a.period_id)?.framework_id === framework.id))
      setSelectedPeriodId(cur => {
        if (cur && fwPeriods.some(p => p.id === cur)) return cur
        return (fwPeriods.find(p => p.status === 'active') ?? fwPeriods[0])?.id ?? ''
      })
      setError(null)
      setLoaded(true)
    } catch (e) {
      if (opts.silent) notify.error(t('publishing.errors.loadFailed'), { description: e instanceof Error ? e.message : undefined })
      else setError(e ?? new Error(t('publishing.errors.loadFailed')))
    } finally {
      setLoading(false)
    }
    // The anomaly scan is advisory: if it fails the checklist says "couldn't check", never "clear".
    orgStore.anomalyScan('role', { limit: 500 })
      .then(r => setAnomalies(r.anomalies))
      .catch(() => setAnomalies(null))
  }, [framework.id, t])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setReportLang(toReportLang(i18n.language) ?? 'en') }, [i18n.language])

  // "+ New report" handoff from the top bar opens the Excel import.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('action') === 'new-report') {
      setImportOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const period = periods.find(p => p.id === selectedPeriodId) ?? null
  const fwName = frameworkName(framework.id, i18n.language)

  const periodAssignments = useMemo<QuestionAssignment[]>(() => {
    if (!orgData || !period) return []
    return orgData.assignments.filter(a => a.framework_id === framework.id && (a.period_id === period.id || !a.period_id))
  }, [orgData, period, framework.id])

  const readiness = useMemo(() => {
    const total = periodAssignments.length
    const approvedRows = periodAssignments.filter(a => a.status === 'approved')
    const approved = approvedRows.length
    const inFlight = periodAssignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length
    const open = total - approved - inFlight
    const pct = total === 0 ? 0 : Math.round((approved / total) * 100)
    const withEvidence = approvedRows.filter(a => (a.evidence_ids ?? []).length > 0).length
    const ids = new Set(periodAssignments.map(a => a.id))
    const open_anoms = anomalies?.filter(a => ids.has(a.assignment_id) && !a.suppressed && (a.severity === 'critical' || a.severity === 'warn')) ?? null
    const critical = open_anoms?.filter(a => a.severity === 'critical').length ?? 0
    return { total, approved, inFlight, open, pct, withEvidence, anomalies: open_anoms, critical, canPublish: approved > 0 }
  }, [periodAssignments, anomalies])

  const latestForPeriod = reports.find(r => r.period_id === selectedPeriodId)
  const periodAssurance = assurance.filter(a => a.period_id === selectedPeriodId)
  const signed = periodAssurance.find(a => a.status === 'signed')
  const pending = periodAssurance.find(a => a.status === 'pending')

  const checks: ReadinessCheck[] = useMemo(() => {
    if (!period) return []
    const r = readiness
    const list: ReadinessCheck[] = [
      {
        id: 'approved',
        state: r.total === 0 || r.approved === 0 ? 'block' : r.approved === r.total ? 'pass' : 'warn',
        label: t('publishing.checks.approved'),
        value: `${f.number(r.approved)} / ${f.number(r.total)}`,
        detail: r.approved === 0
          ? t('publishing.checks.approvedNone')
          : r.approved === r.total ? t('publishing.checks.approvedAll') : t('publishing.checks.approvedSome', { count: r.total - r.approved }),
        action: r.approved < r.total && r.total > 0 ? { label: t('publishing.checks.openApproval'), to: '/workflow/approval' } : undefined,
      },
      {
        id: 'anomalies',
        state: r.anomalies == null ? 'unknown' : r.anomalies.length === 0 ? 'pass' : r.critical > 0 ? 'block' : 'warn',
        label: t('publishing.checks.anomalies'),
        value: r.anomalies == null ? '—' : f.number(r.anomalies.length),
        detail: r.anomalies == null
          ? t('publishing.checks.anomaliesUnknown')
          : r.anomalies.length === 0 ? t('publishing.checks.anomaliesNone') : t('publishing.checks.anomaliesSome', { critical: r.critical, count: r.anomalies.length }),
        action: r.anomalies && r.anomalies.length > 0 ? { label: t('publishing.checks.openAnomalies'), to: '/data/anomalies' } : undefined,
      },
      {
        id: 'assurance',
        state: signed ? 'pass' : 'warn',
        label: t('publishing.checks.assurance'),
        value: signed ? t('publishing.pill.assured') : pending ? t('publishing.pill.pending') : t('publishing.pill.unaudited'),
        detail: signed
          ? t('publishing.checks.assuranceSigned', { firm: signed.auditor_firm ?? signed.auditor_email })
          : t('publishing.checks.assuranceDraft'),
        action: signed || pending ? undefined : { label: t('publishing.actions.requestAssurance'), onClick: () => setAssuranceOpen(true) },
      },
      {
        id: 'evidence',
        state: r.approved === 0 ? 'unknown' : r.withEvidence === r.approved ? 'pass' : 'warn',
        label: t('publishing.checks.evidence'),
        value: r.approved === 0 ? '—' : f.percent((r.withEvidence / r.approved) * 100),
        detail: r.approved === 0
          ? t('publishing.checks.evidenceNone')
          : t('publishing.checks.evidenceSome', { with: r.withEvidence, count: r.approved }),
      },
    ]
    return list
  }, [period, readiness, signed, pending, t, f])

  const lowReadiness = readiness.pct < LOW_READINESS_PCT || readiness.critical > 0
  const blockedReason = !period
    ? t('publishing.blocked.noPeriod')
    : readiness.total === 0 ? t('publishing.blocked.noAssignments')
    : readiness.approved === 0 ? t('publishing.blocked.noneApproved')
    : null

  const publish = async () => {
    if (!period) return
    const res = await orgStore.publishReport(period.id, signed?.id, reportLangTag(reportLang)) as Partial<PublishReportResult> & { locale?: string }
    if (!res || typeof res !== 'object' || !res.id) throw new Error(t('publishing.errors.publishUnexpected'))
    const token = typeof res.verification_token === 'string' ? res.verification_token : null
    setMoment({
      id: res.id,
      version: Number(res.version) || (latestForPeriod?.version ?? 0) + 1,
      sha256: typeof res.pdf_sha256 === 'string' ? res.pdf_sha256 : null,
      verifyUrl: typeof res.verify_url === 'string' ? res.verify_url : token ? `${window.location.origin}/verify/${token}` : null,
      verifyPath: token ? `/verify/${token}` : null,
      anchored: !!res.anchored,
      isDraft: res.is_draft !== false,
      lang: toReportLang(res.locale) ?? reportLang,
      periodLabel: period.label,
      framework: frameworkName(framework.id, reportLang),
    })
    void load({ silent: true })
  }

  const handleExcelImport = async (rows: ExcelRow[]) => {
    if (!period) return
    setImportOpen(false)
    setImporting(true)
    setImportResult(null)
    const totals = computeEmissionsTotals(rows)
    let updated = 0
    let failed = 0
    try {
      await reloadOrgData()
      const fresh = await orgStore.listAssignments()
      const all = fresh.filter(a => a.framework_id === framework.id && (a.period_id === period.id || !a.period_id))
      const emissions = all.filter(a => a.gri_code?.startsWith('305-'))
      const targets = emissions.length > 0 ? emissions : all
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
    } catch (e) {
      notify.error(t('publishing.errors.importFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setImporting(false)
    }
  }

  const fileBase = (r: Report) => `${r.framework_id}-${r.period_label.replace(/\s+/g, '')}-v${r.version}`
  const download = async (kind: 'pdf' | 'docx' | 'ixbrl', r: Report) => {
    try {
      if (kind === 'pdf') await orgStore.downloadReportPdf(r.id, `${fileBase(r)}.pdf`)
      else if (kind === 'docx') await orgStore.downloadReportDocx(r.id, `${fileBase(r)}.docx`)
      else await orgStore.downloadReportIxbrl(r.id, `${fileBase(r)}.xhtml`)
    } catch (e) {
      notify.error(t('publishing.errors.downloadFailed'), { description: e instanceof Error ? e.message : undefined })
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        stage="publish"
        eyebrow={t('publishing.eyebrow')}
        title={t('publishing.title')}
        subtitle={t('publishing.subtitle')}
        actions={period ? (
          <>
            <Button
              variant="secondary"
              icon={importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              onClick={() => setImportOpen(true)}
              disabled={importing}
            >
              {importing ? t('publishing.actions.importing') : t('publishing.actions.importFromExcel')}
            </Button>
            <Button variant="secondary" icon={<ShieldCheck className="w-4 h-4" />} onClick={() => setAssuranceOpen(true)}>
              {t('publishing.actions.requestAssurance')}
            </Button>
          </>
        ) : undefined}
      />

      <StateBoundary
        loading={loading || (orgLoading && !orgData)}
        error={error ?? (orgError && !orgData ? orgError : null)}
        hasData={loaded && !!orgData}
        onRetry={() => { void load(); void reloadOrgData() }}
        errorState={{ variant: 'error', title: t('publishing.errors.unableToLoad'), body: t('publishing.errors.unableToLoadBody') }}
        skeleton={<PublishSkeleton />}
        empty={periods.length === 0}
        emptyState={{
          art: 'setup',
          title: t('publishing.period.noneTitle'),
          body: t('publishing.period.none'),
          cta: { label: t('publishing.period.create'), to: '/admin/periods', icon: <CalendarPlus className="w-4 h-4" /> },
        }}
      >
        <div className="space-y-8">
          {importResult && (
            <ImportResultBanner
              result={importResult}
              onClose={() => setImportResult(null)}
              onReview={() => { setImportResult(null); setSheetOpen(true) }}
            />
          )}

          {/* Period */}
          <section aria-labelledby="period-h">
            <h2 id="period-h" className="type-h3 text-[var(--text-primary)]">{t('publishing.period.title')}</h2>
            <p className="type-small text-[var(--text-secondary)] mt-0.5">{t('publishing.period.subtitle', { framework: fwName })}</p>
            <div className="flex flex-wrap gap-2 mt-3" role="radiogroup" aria-labelledby="period-h">
              {periods.map(p => {
                const on = selectedPeriodId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSelectedPeriodId(p.id)}
                    className={`h-10 pl-3.5 pr-2 inline-flex items-center gap-2.5 rounded-[var(--radius-md)] border text-small font-semibold whitespace-nowrap transition-colors duration-micro ${
                      on ? 'border-[var(--border-focus)] bg-[var(--color-brand-soft)] text-[var(--text-primary)]' : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {p.label}
                    <StatusPill size="sm" tone={p.status === 'active' ? 'info' : p.status === 'published' ? 'brand' : 'neutral'}>
                      {t(`publishing.period.status.${p.status}`, { defaultValue: p.status })}
                    </StatusPill>
                  </button>
                )
              })}
            </div>
          </section>

          {period && (
            <ReadinessHero
              periodLabel={period.label}
              readiness={readiness}
              checks={checks}
              blockedReason={blockedReason}
              republish={!!latestForPeriod}
              onPublish={() => setSheetOpen(true)}
            />
          )}

          {latestForPeriod && (
            <section aria-labelledby="latest-h">
              <h2 id="latest-h" className="type-h3 text-[var(--text-primary)]">{t('publishing.latest.title', { version: latestForPeriod.version })}</h2>
              <p className="type-small text-[var(--text-secondary)] mt-0.5 mb-3">{t('publishing.latest.subtitle', { date: f.dateTime(latestForPeriod.published_at) })}</p>
              <ArtifactCard report={latestForPeriod} onShare={setShareReport} onDownload={download} />
            </section>
          )}

          <section aria-labelledby="history-h">
            <h2 id="history-h" className="type-h3 text-[var(--text-primary)]">{t('publishing.history.title')}</h2>
            <p className="type-small text-[var(--text-secondary)] mt-0.5 mb-3">{t('publishing.history.subtitle')}</p>
            {reports.length === 0 ? (
              <EmptyState
                framed
                density="compact"
                art="published"
                title={t('publishing.history.emptyTitle')}
                body={t('publishing.history.emptyDesc')}
              />
            ) : (
              <HistoryTable reports={reports} onShare={setShareReport} onDownload={download} />
            )}
          </section>

          {period && (
            <section aria-labelledby="assurance-h">
              <h2 id="assurance-h" className="type-h3 text-[var(--text-primary)]">{t('publishing.assurance.title')}</h2>
              <p className="type-small text-[var(--text-secondary)] mt-0.5 mb-3 max-w-3xl">
                {t('publishing.assurance.subtitle1')}
                <JargonTooltip term={t('publishing.assurance.isaeTerm')}>{t('publishing.assurance.isaeDef')}</JargonTooltip>
                {t('publishing.assurance.subtitle2')}
              </p>
              {periodAssurance.length === 0 ? (
                <EmptyState
                  framed
                  density="compact"
                  art="setup"
                  title={t('publishing.assurance.emptyTitle')}
                  body={t('publishing.assurance.emptyDesc')}
                  cta={{ label: t('publishing.actions.requestAssurance'), onClick: () => setAssuranceOpen(true), icon: <ShieldCheck className="w-4 h-4" /> }}
                />
              ) : (
                <div className="space-y-3">
                  {periodAssurance.map((a, i) => (
                    <AssuranceRow key={a.id} req={a} i={i} onChange={() => void load({ silent: true })} confirm={confirm} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </StateBoundary>

      {/* Pre-publish review: what is irreversible, in which language, at what readiness. */}
      {period && (
        <ConfirmSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          size="lg"
          title={t(latestForPeriod ? 'publishing.sheet.titleRepublish' : 'publishing.sheet.title', { period: period.label, version: (latestForPeriod?.version ?? 0) + 1 })}
          description={t('publishing.sheet.irreversible', { count: readiness.approved })}
          confirmLabel={t('publishing.sheet.confirm')}
          requireText={lowReadiness ? period.label : undefined}
          onConfirm={publish}
        >
          <div className="space-y-5">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] px-4">
              <ReadinessChecklist checks={checks} compact aria-label={t('publishing.checks.aria')} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="type-small font-semibold text-[var(--text-primary)]">{t('publishing.sheet.language')}</div>
                <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('publishing.sheet.languageHint')}</div>
              </div>
              <LangSegment value={reportLang} onChange={setReportLang} label={t('publishing.sheet.language')} />
            </div>
            {!signed && (
              <p className="flex gap-2.5 p-3 rounded-[var(--radius-md)] bg-[var(--status-warning-soft)] text-small text-[var(--text-primary)]">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--status-warning)]" aria-hidden />
                {t('publishing.sheet.draftWarning')}
              </p>
            )}
            {lowReadiness && (
              <p className="text-small text-[var(--status-danger)]">
                {readiness.critical > 0
                  ? t('publishing.sheet.lowCritical', { count: readiness.critical })
                  : t('publishing.sheet.lowCoverage', { pct: readiness.pct })}
              </p>
            )}
          </div>
        </ConfirmSheet>
      )}

      <PublishMoment
        result={moment}
        onClose={() => setMoment(null)}
        onDownload={(r) => void orgStore.downloadReportPdf(r.id, `${framework.id}-${r.periodLabel.replace(/\s+/g, '')}-v${r.version}.pdf`).catch(e => notify.error(t('publishing.errors.downloadFailed'), { description: e instanceof Error ? e.message : undefined }))}
      />

      {period && (
        <RequestAssuranceSheet
          open={assuranceOpen}
          onOpenChange={setAssuranceOpen}
          period={period}
          onCreated={() => { notify.success(t('publishing.modal.created')); void load({ silent: true }) }}
        />
      )}

      {shareReport && <ShareSheet report={shareReport} onClose={() => setShareReport(null)} />}

      {importOpen && <ExcelImport onImport={handleExcelImport} onClose={() => setImportOpen(false)} />}
    </div>
  )
}

/* ── Readiness ───────────────────────────────────────────────────────── */

function ReadinessHero({ periodLabel, readiness, checks, blockedReason, republish, onPublish }: {
  periodLabel: string
  readiness: { total: number; approved: number; inFlight: number; open: number; pct: number }
  checks: ReadinessCheck[]
  blockedReason: string | null
  republish: boolean
  onPublish: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const r = readiness
  const seg = (n: number) => (r.total === 0 ? 0 : (n / r.total) * 100)
  const segments = [
    { key: 'approved', pct: seg(r.approved), color: 'var(--status-success)', label: t('publishing.readiness.approved'), n: r.approved },
    { key: 'inReview', pct: seg(r.inFlight), color: 'var(--status-info)', label: t('publishing.readiness.inReview'), n: r.inFlight },
    { key: 'open', pct: seg(r.open), color: 'var(--border-strong)', label: t('publishing.readiness.open'), n: r.open },
  ]
  return (
    <motion.section {...popIn(0)} aria-labelledby="readiness-h" className="surface-hero p-5 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="min-w-0">
          <div className="text-caption font-semibold text-[var(--text-secondary)]">{t('publishing.readiness.kicker', { period: periodLabel })}</div>
          <h2 id="readiness-h" className="sr-only">{t('publishing.readiness.heading')}</h2>
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <span className="type-figure text-[56px] leading-[60px] text-[var(--text-primary)]">
              <NumberTicker value={r.pct} format="percent" />
            </span>
            <span className="type-body text-[var(--text-secondary)]">
              {r.total === 0 ? t('publishing.readiness.noneAssigned') : t('publishing.readiness.approvedOf', { approved: f.number(r.approved), total: f.number(r.total) })}
            </span>
          </div>

          {/* Segmented coverage bar: approved → in review → open, filling in sequence. */}
          <div className="mt-5 flex h-2.5 w-full max-w-xl overflow-hidden rounded-full bg-[var(--bg-tertiary)]" role="img" aria-label={segments.map(s => `${s.label} ${s.n}`).join(', ')}>
            {segments.map((s, i) => (
              <motion.div key={s.key} {...(reduce ? { initial: false, animate: { width: `${s.pct}%` } } : barFill(s.pct, 0.15 + i * 0.25))} style={{ background: s.color }} className="h-full" />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-small text-[var(--text-secondary)]">
            {segments.map(s => (
              <li key={s.key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label} <span className="tabular-nums font-semibold text-[var(--text-primary)]">{f.number(s.n)}</span>
              </li>
            ))}
          </ul>

          <p className="type-small text-[var(--text-secondary)] mt-6 max-w-xl">
            {t('publishing.readiness.body1')}
            <JargonTooltip term={t('publishing.readiness.shaTerm')}>{t('publishing.readiness.shaDef')}</JargonTooltip>
            {t('publishing.readiness.body2')}
            <JargonTooltip term={t('publishing.readiness.calendarTerm')}>{t('publishing.readiness.calendarDef')}</JargonTooltip>
            {t('publishing.readiness.body3')}
          </p>
        </div>

        <div className="rounded-[var(--radius-xl)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] px-5 pt-2 pb-5 flex flex-col">
          <ReadinessChecklist checks={checks} aria-label={t('publishing.checks.aria')} />
          <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<Send className="w-4 h-4" />}
              onClick={onPublish}
              disabled={!!blockedReason}
              aria-describedby={blockedReason ? 'publish-blocked' : undefined}
            >
              {republish ? t('publishing.actions.reviewRepublish') : t('publishing.actions.reviewPublish')}
            </Button>
            {blockedReason && <p id="publish-blocked" className="text-caption text-[var(--text-tertiary)] mt-2 text-center">{blockedReason}</p>}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

/* ── Artifacts ───────────────────────────────────────────────────────── */

type DownloadFn = (kind: 'pdf' | 'docx' | 'ixbrl', r: Report) => void

function LangChip({ locale }: { locale?: string | null }) {
  const { t } = useTranslation()
  const l = toReportLang(locale)
  if (!l) return <span className="text-caption text-[var(--text-tertiary)]">—</span>
  return <span className="chip whitespace-nowrap" lang={l === 'zh' ? 'zh-CN' : 'en'}>{t(`reviewUi.lang.${l}`)}</span>
}

function AssuredPill({ r }: { r: Report }) {
  const { t } = useTranslation()
  return r.is_draft
    ? <StatusPill tone="warning" size="sm">{t('publishing.artifact.draft')}</StatusPill>
    : <StatusPill tone="success" size="sm" icon={<BadgeCheck />}>{r.auditor_firm ?? t('publishing.artifact.assured')}</StatusPill>
}

function ArtifactCard({ report, onShare, onDownload }: { report: Report; onShare: (r: Report) => void; onDownload: DownloadFn }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  return (
    <motion.div {...riseIn(0)} className="surface-paper p-5 sm:p-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center flex-shrink-0 bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="type-small font-semibold text-[var(--text-primary)]">
                {t('publishing.artifact.version', { version: report.version, framework: frameworkName(report.framework_id, i18n.language) })}
              </span>
              <AssuredPill r={report} />
              <LangChip locale={report.locale} />
            </div>
            <div className="text-caption text-[var(--text-tertiary)] mt-1">
              {t('publishing.artifact.meta', { size: f.number(report.pdf_size / 1024, { maxFraction: 1 }), name: report.published_by_name })}
            </div>
            <div className="text-caption text-[var(--text-secondary)] mt-2 flex items-center gap-1.5 font-mono min-w-0">
              <Hash className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{report.pdf_sha256}</span>
            </div>
            {report.anchor_tip_hash && (
              <div className="text-caption text-[var(--status-success)] mt-1.5 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5" />
                {t('publishing.artifact.anchoredOn', { date: report.anchored_at ? f.date(report.anchored_at) : '—' })}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 flex-shrink-0">
          <a href={`/verify/${report.verification_token}`} target="_blank" rel="noreferrer" className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] whitespace-nowrap">
            <ExternalLink className="w-4 h-4" /> {t('publishing.artifact.verify')}
          </a>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={() => onDownload('ixbrl', report)} title={t('publishing.artifact.ixbrlTitle')}>iXBRL</Button>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={() => onDownload('docx', report)} title={t('publishing.artifact.wordTitle')}>{t('publishing.artifact.word')}</Button>
          <Button variant="secondary" icon={<Share2 className="w-4 h-4" />} onClick={() => onShare(report)} title={t('publishing.artifact.shareTitle')}>{t('publishing.artifact.sharePublicly')}</Button>
          <Button variant="primary" className="col-span-2 sm:col-span-1" icon={<Download className="w-4 h-4" />} onClick={() => onDownload('pdf', report)}>{t('publishing.artifact.download')}</Button>
        </div>
      </div>
    </motion.div>
  )
}

function HistoryTable({ reports, onShare, onDownload }: { reports: Report[]; onShare: (r: Report) => void; onDownload: DownloadFn }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const iconBtn = 'w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors duration-micro'
  const textBtn = 'h-9 px-2.5 inline-flex items-center rounded-[var(--radius-md)] text-caption font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors duration-micro'
  const actions = (r: Report) => (
    <div className="inline-flex items-center gap-0.5">
      <a href={`/verify/${r.verification_token}`} target="_blank" rel="noreferrer" className={iconBtn} title={t('publishing.history.publicVerification')} aria-label={t('publishing.history.publicVerification')}>
        <ExternalLink className="w-4 h-4" />
      </a>
      <button type="button" onClick={() => onDownload('pdf', r)} className={iconBtn} title={t('publishing.history.downloadPdf')} aria-label={t('publishing.history.downloadPdf')}>
        <Download className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => onDownload('docx', r)} className={textBtn} title={t('publishing.history.downloadWord')}>{t('publishing.artifact.word')}</button>
      <button type="button" onClick={() => onDownload('ixbrl', r)} className={textBtn} title={t('publishing.history.downloadIxbrl')}>iXBRL</button>
      <button type="button" onClick={() => onShare(r)} className={iconBtn} title={t('publishing.history.sharePublicly')} aria-label={t('publishing.history.sharePublicly')}>
        <Share2 className="w-4 h-4" />
      </button>
    </div>
  )
  return (
    <div className="surface-paper overflow-hidden">
      <table className="data-table hidden md:table">
        <thead>
          <tr>
            <th>{t('publishing.history.colVersion')}</th>
            <th>{t('publishing.history.colPeriod')}</th>
            <th>{t('publishing.history.colLanguage')}</th>
            <th>{t('publishing.history.colAssurance')}</th>
            <th>{t('publishing.history.colHash')}</th>
            <th>{t('publishing.history.colPublished')}</th>
            <th className="text-right">{t('publishing.history.colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r.id}>
              <td className="font-semibold text-[var(--text-primary)] tabular-nums">v{r.version}</td>
              <td>
                <div className="text-[var(--text-primary)] font-medium whitespace-nowrap">{r.period_label}</div>
                <div className="text-caption text-[var(--text-tertiary)] truncate max-w-[200px]">{frameworkName(r.framework_id, i18n.language)}</div>
              </td>
              <td><LangChip locale={r.locale} /></td>
              <td><AssuredPill r={r} /></td>
              <td className="font-mono text-caption">
                <span title={r.pdf_sha256}>{r.pdf_sha256.slice(0, 12)}…</span>
                {r.anchor_tip_hash && <BadgeCheck className="inline w-3.5 h-3.5 ml-1.5 -mt-0.5 text-[var(--status-success)]" aria-label={t('publishing.history.anchored')} />}
              </td>
              <td className="whitespace-nowrap">
                <div>{f.date(r.published_at)}</div>
                <div className="text-caption text-[var(--text-tertiary)]">{r.published_by_name}</div>
              </td>
              <td className="text-right">{actions(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="md:hidden divide-y divide-[var(--border-subtle)]">
        {reports.map(r => (
          <li key={r.id} className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="type-small font-semibold text-[var(--text-primary)]">v{r.version} · {r.period_label}</span>
              <AssuredPill r={r} />
              <LangChip locale={r.locale} />
            </div>
            <div className="text-caption text-[var(--text-tertiary)] mt-1">{f.date(r.published_at)} · {r.published_by_name}</div>
            <div className="text-caption font-mono text-[var(--text-secondary)] mt-1 truncate">{r.pdf_sha256}</div>
            <div className="mt-2 -ml-2">{actions(r)}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Import result ───────────────────────────────────────────────────── */

function ImportResultBanner({ result, onClose, onReview }: {
  result: { totals: EmissionsTotals; updated: number; failed: number }
  onClose: () => void
  onReview: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const { totals, updated, failed } = result
  const ok = updated > 0
  return (
    <motion.div {...popIn(0)} role="status" className="surface-paper p-5 relative" style={{ background: ok ? 'var(--status-success-soft)' : 'var(--status-warning-soft)' }}>
      <button type="button" onClick={onClose} aria-label={t('publishing.share.close')} className="absolute top-3 right-3 w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-10">
        <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: ok ? 'var(--status-success)' : 'var(--status-warning)' }} aria-hidden />
        <div className="min-w-0">
          <div className="type-small font-semibold text-[var(--text-primary)]">
            {ok ? t('publishing.import.successHeadline', { rows: totals.rows, count: updated }) : t('publishing.import.noMatch')}
          </div>
          <div className="text-caption text-[var(--text-secondary)] mt-1">
            {t('publishing.import.computedTotals')}{' '}
            <strong><JargonTooltip term={t('publishing.import.scope1Term')}>{t('publishing.import.scope1Def')}</JargonTooltip></strong>{' '}{f.number(totals.scope1)} ·{' '}
            <strong><JargonTooltip term={t('publishing.import.scope2Term')}>{t('publishing.import.scope2Def')}</JargonTooltip></strong>{' '}{f.number(totals.scope2)} ·{' '}
            <strong><JargonTooltip term={t('publishing.import.scope3Term')}>{t('publishing.import.scope3Def')}</JargonTooltip></strong>{' '}{f.number(totals.scope3)} {f.unit('tCO2e')}
            {failed > 0 && <span className="text-[var(--status-danger)]"> · {t('publishing.import.updatesFailed', { count: failed })}</span>}
          </div>
          {ok && (
            <div className="mt-3">
              <Button variant="primary" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={onReview}>{t('publishing.actions.reviewPublish')}</Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Assurance ───────────────────────────────────────────────────────── */

function AssuranceRow({ req, i, onChange, confirm }: { req: AssuranceRequest; i: number; onChange: () => void; confirm: ReturnType<typeof useConfirm> }) {
  const { t } = useTranslation()
  const f = useFmt()
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)

  const showLink = async (rotate: boolean) => {
    if (rotate && !(await confirm({ title: t('publishing.assuranceRow.confirmRotateTitle'), description: t('publishing.assuranceRow.confirmRotate'), confirmLabel: t('publishing.assuranceRow.rotate'), tone: 'destructive' }))) return
    setBusy(true)
    try {
      const { upload_token } = rotate ? await orgStore.rotateAssuranceToken(req.id) : await orgStore.getAssuranceUploadLink(req.id)
      const url = `${window.location.origin}/assure/${upload_token}`
      setLink(url)
      try {
        await navigator.clipboard.writeText(url)
        notify.success(t(rotate ? 'publishing.assuranceRow.rotatedCopied' : 'publishing.assuranceRow.copied'))
      } catch {
        notify.info(t('publishing.assuranceRow.copyManually'))
      }
    } catch (e) {
      notify.error(t('publishing.errors.unableToGetLink'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async () => {
    if (!(await confirm({ title: t('publishing.assuranceRow.confirmWithdraw'), description: t('publishing.assuranceRow.confirmWithdrawBody'), confirmLabel: t('publishing.assuranceRow.withdraw'), tone: 'destructive' }))) return
    setBusy(true)
    try {
      await orgStore.withdrawAssurance(req.id)
      notify.success(t('publishing.assuranceRow.withdrawn'))
      onChange()
    } catch (e) {
      notify.error(t('publishing.errors.failed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const tone = req.status === 'signed' ? 'success' : req.status === 'pending' ? 'warning' : 'neutral'
  return (
    <motion.div {...riseIn(i)} className="surface-paper p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="type-small font-semibold text-[var(--text-primary)]">{req.auditor_firm ?? req.auditor_name ?? req.auditor_email}</span>
            <StatusPill tone={tone} size="sm" dot={req.status === 'pending'}>{t(`publishing.assuranceRow.status.${req.status}`, { defaultValue: req.status })}</StatusPill>
            {req.opinion_type && <span className="chip">{req.opinion_type === 'reasonable' ? t('publishing.assuranceRow.reasonable') : t('publishing.assuranceRow.limited')}</span>}
          </div>
          <div className="text-caption text-[var(--text-tertiary)] mt-1">
            {t('publishing.assuranceRow.requested', { email: req.auditor_email, date: f.date(req.requested_at) })}
            {req.signed_at && t('publishing.assuranceRow.signedBy', { date: f.date(req.signed_at), name: req.signed_by })}
          </div>
          {req.notes && <p className="type-small text-[var(--text-secondary)] mt-2 max-w-[70ch]">{req.notes}</p>}
          {req.statement_sha256 && (
            <div className="text-caption text-[var(--text-tertiary)] mt-2 font-mono">{t('publishing.assuranceRow.statementHash', { hash: req.statement_sha256.slice(0, 20) })}</div>
          )}
          {link && (
            <div className="mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)]">
              <div className="text-caption font-semibold text-[var(--text-secondary)] mb-1">{t('publishing.assuranceRow.linkCopied')}</div>
              <code className="font-mono text-caption text-[var(--color-brand-strong)] break-all">{link}</code>
              <div className="text-caption text-[var(--text-tertiary)] mt-1.5">{t('publishing.assuranceRow.linkHelp')}</div>
            </div>
          )}
        </div>
        {req.status === 'pending' && (
          <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
            <Button size="sm" variant="secondary" icon={<Copy className="w-3.5 h-3.5" />} onClick={() => void showLink(false)} disabled={busy}>{t('publishing.assuranceRow.copyLink')}</Button>
            <Button size="sm" variant="ghost" icon={<RotateCw className="w-3.5 h-3.5" />} onClick={() => void showLink(true)} disabled={busy}>{t('publishing.assuranceRow.rotate')}</Button>
            <Button size="sm" variant="ghost" icon={<X className="w-3.5 h-3.5" />} onClick={() => void withdraw()} disabled={busy}>{t('publishing.assuranceRow.withdraw')}</Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RequestAssuranceSheet({ open, onOpenChange, period, onCreated }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  period: ReportingPeriod
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const [firm, setFirm] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [opinion, setOpinion] = useState<'limited' | 'reasonable'>('limited')
  const [isae, setIsae] = useState('ISAE 3000 (Revised)')
  const [notes, setNotes] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  useEffect(() => { if (open) setEmailError(null) }, [open])

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError(t('publishing.errors.auditorEmailRequired'))
      throw new Error(t('publishing.errors.auditorEmailRequired'))
    }
    await orgStore.requestAssurance({
      period_id: period.id,
      auditor_email: email.trim(),
      auditor_firm: firm || undefined,
      auditor_name: name || undefined,
      opinion_type: opinion,
      isae_reference: isae,
      notes: notes || undefined,
    })
    setFirm(''); setName(''); setEmail(''); setNotes('')
    onCreated()
  }

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('publishing.modal.title')}
      description={t('publishing.modal.intro', { period: period.label })}
      confirmLabel={t('publishing.modal.create')}
      cancelLabel={t('publishing.modal.cancel')}
      onConfirm={submit}
    >
      <div className="space-y-3.5">
        <Field label={t('publishing.modal.firm')} placeholder={t('publishing.modal.firmPlaceholder')} value={firm} onChange={setFirm} />
        <Field label={t('publishing.modal.contactName')} placeholder={t('publishing.modal.contactNamePlaceholder')} value={name} onChange={setName} />
        <Field label={t('publishing.modal.contactEmail')} placeholder="partner@firm.com" value={email} onChange={v => { setEmail(v); setEmailError(null) }} type="email" error={emailError} required />
        <fieldset>
          <legend className="text-small font-semibold text-[var(--text-secondary)] mb-1.5">{t('publishing.modal.level')}</legend>
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup">
            {(['limited', 'reasonable'] as const).map(o => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={opinion === o}
                onClick={() => setOpinion(o)}
                className={`h-10 rounded-[var(--radius-md)] border text-small font-semibold transition-colors ${opinion === o ? 'border-[var(--border-focus)] bg-[var(--color-brand-soft)] text-[var(--text-primary)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
              >
                {o === 'limited' ? t('publishing.modal.limited') : t('publishing.modal.reasonable')}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label={t('publishing.modal.standard')} placeholder="ISAE 3000 (Revised)" value={isae} onChange={setIsae} />
        <Field label={t('publishing.modal.notes')} placeholder={t('publishing.modal.notesPlaceholder')} value={notes} onChange={setNotes} as="textarea" />
      </div>
    </ConfirmSheet>
  )
}

function Field({ label, placeholder, value, onChange, type = 'text', as = 'input', error, required }: {
  label: string; placeholder?: string; value: string; onChange: (v: string) => void; type?: string; as?: 'input' | 'textarea'; error?: string | null; required?: boolean
}) {
  const cls = `w-full px-3 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] type-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors ${error ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)] focus:border-[var(--border-focus)]'}`
  return (
    <label className="block">
      <span className="text-small font-semibold text-[var(--text-secondary)] mb-1.5 block">{label}</span>
      {as === 'textarea'
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${cls} py-2.5 resize-none`} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} aria-invalid={!!error} className={`${cls} h-10`} />}
      {error && <span role="alert" className="text-caption text-[var(--status-danger)] mt-1 block">{error}</span>}
    </label>
  )
}

/**
 * Public share link for a published report. The token is shown once; the
 * password is never round-tripped (the server keeps a bcrypt hash).
 */
function ShareSheet({ report, onClose }: { report: Report; onClose: () => void }) {
  const { t } = useTranslation()
  const f = useFmt()
  const [days, setDays] = useState(30)
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<{ url: string; expires_at: string | null } | null>(null)
  const [open, setOpen] = useState(true)
  // The first sheet "succeeds" into the second: swallow the close that follows generation.
  const generated = useRef(false)

  const close = (o: boolean) => {
    if (o) return
    if (generated.current) { generated.current = false; return }
    setOpen(false)
    setTimeout(onClose, 260)
  }

  if (!result) {
    return (
      <ConfirmSheet
        open={open}
        onOpenChange={close}
        title={t('publishing.share.title')}
        description={t('publishing.share.intro')}
        confirmLabel={t('publishing.share.generate')}
        cancelLabel={t('publishing.share.cancel')}
        onConfirm={async () => {
          const r = await orgStore.createShareLink({ reportId: report.id, expiresInDays: days > 0 ? days : undefined, password: password || undefined })
          generated.current = true
          setResult({ url: `${window.location.origin}${r.url}`, expires_at: r.expires_at })
        }}
      >
        <div className="space-y-3.5">
          <label className="block">
            <span className="text-small font-semibold text-[var(--text-secondary)] mb-1.5 block">{t('publishing.share.expires')}</span>
            <input type="number" min={0} max={365} value={days} onChange={e => setDays(Number(e.target.value))} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] type-small text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]" />
          </label>
          <label className="block">
            <span className="text-small font-semibold text-[var(--text-secondary)] mb-1.5 block">{t('publishing.share.password')}</span>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('publishing.share.passwordPlaceholder')} autoComplete="off" className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] type-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--border-focus)]" />
          </label>
        </div>
      </ConfirmSheet>
    )
  }

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={close}
      title={t('publishing.share.ready')}
      description={t('publishing.share.readyBody')}
      confirmLabel={t('publishing.share.copyAndClose')}
      cancelLabel={t('publishing.share.done')}
      onConfirm={async () => {
        try {
          await navigator.clipboard.writeText(result.url)
          notify.success(t('publishing.share.copied'))
        } catch {
          notify.info(t('publishing.assuranceRow.copyManually'))
        }
      }}
    >
      <div className="space-y-2">
        <code className="block font-mono text-caption text-[var(--color-brand-strong)] bg-[var(--bg-secondary)] px-3 py-2.5 rounded-[var(--radius-md)] break-all">{result.url}</code>
        {result.expires_at && <div className="text-caption text-[var(--text-tertiary)]">{t('publishing.share.expiresOn', { date: f.dateTime(result.expires_at) })}</div>}
        {password && <div className="text-caption text-[var(--text-tertiary)]">{t('publishing.share.passwordActive')}</div>}
      </div>
    </ConfirmSheet>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────────── */

function PublishSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex gap-2"><Skeleton height={40} width={120} /><Skeleton height={40} width={120} /></div>
      <Skeleton height={300} rounded="lg" />
      <SkeletonCard />
    </div>
  )
}
