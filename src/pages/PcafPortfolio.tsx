import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Plus, X, Lock, RefreshCw, Send, CheckCircle2, ChevronRight, ArrowLeft, ExternalLink } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../auth/AuthContext'
import { facilities as facilitiesApi, pcaf as pcafApi, type ApiFacility, type PcafAsset, type PcafPortfolioSummary } from '../lib/api'
import { PCAF_CALCULATORS } from '../calculators/pcaf/registry'
import type { PcafAssetCalculator } from '../calculators/pcaf'
import AssetCalculator from '../components/pcaf/AssetCalculator'
import PortfolioGrid from '../components/pcaf/PortfolioGrid'
import { num, useAssetClassLabel, usePcafFormat, dqTone } from '../components/pcaf/format'
import { Button } from '../design-system'
import { StatLedger, StateBoundary, EmptyState, SkeletonLedger, SkeletonTable, Skeleton, notify } from '../components/ui'
import ChartFrame, { useChartTheme, chartColors } from '../components/ui/ChartFrame'
import { dur, ease, spring, staggerDelay } from '../motion/tokens'
import { CalcField, CalcSelect, Callout } from '../components/analytics/factors'

/**
 * /calculators/pcaf — PCAF Financed Emissions portfolio.
 *
 * Gated behind `calculators.edit`. Renders the portfolio KPI ledger, the
 * financed-emissions-by-asset-class chart, the data-quality profile, the
 * portfolio table, and a drawer-style "Add asset" panel that surfaces the
 * 9 PCAF asset-class calculators.
 *
 * "Sync to Scope 3" aggregates the portfolio into a single activity_data
 * row (scope=3, category='Cat 15 - Investments') for the chosen facility —
 * that row then propagates to ESRS E1-6 / GRI 305-3 / TCFD / SEC climate
 * disclosures via the standard reporting workflow.
 */
export default function PcafPortfolio() {
  const { t, i18n } = useTranslation()
  const classLabel = useAssetClassLabel()
  const { f, money, tonnes } = usePcafFormat()
  const { permissions } = useAuth()
  const canEdit = permissions.includes('calculators.edit')
  const [reportingYear, setReportingYear] = useState<number>(() => new Date().getFullYear())
  const [assets, setAssets] = useState<PcafAsset[]>([])
  const [summary, setSummary] = useState<PcafPortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pickedClass, setPickedClass] = useState<PcafAssetCalculator | null>(null)
  const [facilities, setFacilities] = useState<ApiFacility[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [a, s, fl] = await Promise.all([
        pcafApi.listAssets(reportingYear),
        pcafApi.summary(reportingYear),
        facilitiesApi.list().catch(() => [] as ApiFacility[]),
      ])
      setAssets(Array.isArray(a) ? a : [])
      // Guard against a malformed summary (e.g. an empty array from a proxy).
      setSummary(s && typeof s === 'object' && !Array.isArray(s) ? { ...s, by_asset_class: Array.isArray(s.by_asset_class) ? s.by_asset_class : [] } : null)
      setFacilities(Array.isArray(fl) ? fl : [])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : i18n.t('pcaf.page.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [reportingYear, i18n])

  useEffect(() => { if (canEdit) void load() }, [load, canEdit])

  const onSaved = () => {
    setPickedClass(null)
    setAdding(false)
    notify.success(t('pcaf.drawer.saved'))
    void load()
  }

  const byClass = summary?.by_asset_class ?? []
  const barData = useMemo(
    () => byClass
      .map(b => ({ name: classLabel(b.asset_class), financed: num(b.financed_total) }))
      .filter(d => d.financed > 0)
      .sort((a, b) => b.financed - a.financed),
    [byClass, classLabel],
  )

  if (!canEdit) {
    return (
      <div className="page-container">
        <PageHeader title={t('pcaf.page.title')} description={t('pcaf.page.lockedDescription')} />
        <EmptyState
          framed
          icon={Lock}
          title={t('pcaf.page.lockedTitle')}
          body={
            <>
              {t('pcaf.page.lockedBefore')}<code className="font-mono text-[var(--text-primary)]">calculators.edit</code>{t('pcaf.page.lockedAfter')}
            </>
          }
        />
      </div>
    )
  }

  const hasData = summary != null
  const empty = !loading && !loadError && assets.length === 0 && (summary?.asset_count ?? 0) === 0

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('pcaf.page.breadcrumbData'), to: '/data' },
          { label: t('pcaf.page.breadcrumbCalculators'), to: '/calculators' },
          { label: t('pcaf.page.title') },
        ]}
        eyebrow={t('pcaf.page.eyebrow')}
        title={t('pcaf.page.titleWithYear', { year: reportingYear })}
        description={t('pcaf.page.description')}
        actions={
          <>
            <div className="w-[120px]">
              <CalcSelect value={reportingYear} onChange={e => setReportingYear(Number(e.target.value))} aria-label={t('pcaf.page.reportingYear')}>
                {yearOptions().map(y => <option key={y} value={y}>{t('pcaf.page.fyOption', { year: y })}</option>)}
              </CalcSelect>
            </div>
            <Button variant="secondary" size="lg" onClick={() => void load()} icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />} disabled={loading}>
              {t('pcaf.page.refresh')}
            </Button>
            <Button size="lg" onClick={() => { setAdding(true); setPickedClass(null) }} icon={<Plus className="w-4 h-4" />}>
              {t('pcaf.page.addAsset')}
            </Button>
          </>
        }
      />

      <StateBoundary
        loading={loading}
        hasData={hasData}
        error={loadError && !hasData ? loadError : null}
        onRetry={() => void load()}
        errorState={{ title: t('pcaf.page.loadFailed') }}
        skeleton={
          <div className="space-y-5">
            <SkeletonLedger items={4} />
            <div className="grid gap-5 lg:grid-cols-12">
              <Skeleton className="lg:col-span-7 h-[300px]" rounded="lg" />
              <Skeleton className="lg:col-span-5 h-[300px]" rounded="lg" />
            </div>
            <SkeletonTable rows={5} cols={6} framed />
          </div>
        }
        empty={empty}
        emptyState={{
          art: 'noData',
          title: t('pcaf.page.emptyTitle', { year: reportingYear }),
          body: t('pcaf.page.emptyBody'),
          cta: { label: t('pcaf.page.addAsset'), onClick: () => { setAdding(true); setPickedClass(null) } },
        }}
      >
        <div className="space-y-6">
          {loadError && hasData && (
            <Callout tone="danger" title={t('pcaf.page.refreshFailed')}>{loadError}</Callout>
          )}

          <StatLedger
            aria-label={t('pcaf.kpi.label')}
            items={[
              {
                id: 'financed',
                label: t('pcaf.kpi.totalFinanced'),
                value: num(summary?.total_financed_emissions),
                format: 'compact',
                unit: 'tCO₂e',
                tone: 'brand',
                hint: t('pcaf.kpi.totalFinancedSubtle'),
              },
              {
                id: 'dq',
                label: t('pcaf.kpi.weightedDq'),
                value: num(summary?.weighted_data_quality),
                format: 'number',
                precision: 2,
                tone: dqTone(num(summary?.weighted_data_quality) || 5),
                hint: t('pcaf.kpi.weightedDqSubtle'),
              },
              {
                id: 'coverage',
                label: t('pcaf.kpi.coverage'),
                value: num(summary?.coverage_reported_pct),
                format: 'percent',
                precision: 1,
                tone: 'info',
                hint: t('pcaf.kpi.coverageSubtle'),
              },
              {
                id: 'outstanding',
                label: t('pcaf.kpi.outstanding'),
                value: num(summary?.total_outstanding),
                format: n => money(n),
                tone: 'neutral',
                hint: t('pcaf.kpi.assetCount', { count: summary?.asset_count ?? assets.length }),
              },
            ]}
          />

          <div className="grid gap-5 lg:grid-cols-12 items-stretch">
            <ClassChart className="lg:col-span-7" data={barData} formatTonnes={v => f.compact(v)} />
            <DqProfile className="lg:col-span-5" assets={assets} />
          </div>

          {byClass.length > 0 && (
            <section className="surface-paper overflow-hidden" aria-labelledby="pcaf-by-class">
              <h2 id="pcaf-by-class" className="type-h3 text-[var(--text-primary)] px-5 pt-4 pb-3">{t('pcaf.summaryTable.title')}</h2>
              <div className="overflow-x-auto">
                <table className="data-table min-w-[640px]">
                  <thead>
                    <tr>
                      <th>{t('pcaf.summaryTable.assetClass')}</th>
                      <th className="num">{t('pcaf.summaryTable.assets')}</th>
                      <th className="num">{t('pcaf.summaryTable.outstanding')}</th>
                      <th className="num">{t('pcaf.summaryTable.financedEmissions')}</th>
                      <th className="num">{t('pcaf.summaryTable.weightedDq')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byClass.map(b => (
                      <tr key={b.asset_class}>
                        <td className="text-[var(--text-primary)] font-medium">{classLabel(b.asset_class)}</td>
                        <td className="num">{f.number(b.asset_count)}</td>
                        <td className="num">{money(b.outstanding_total)}</td>
                        <td className="num text-[var(--text-primary)] font-medium">{tonnes(b.financed_total)}</td>
                        <td className="num">
                          <span className="nx-pill" data-tone={dqTone(num(b.weighted_dq))} data-size="sm">{f.number(num(b.weighted_dq), { precision: 2 })}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <SyncPanel
            reportingYear={reportingYear}
            facilities={facilities}
            disabled={assets.length === 0}
            formatTonnes={v => tonnes(v)}
          />

          <PortfolioGrid assets={assets} onChange={load} onAdd={() => { setAdding(true); setPickedClass(null) }} />
        </div>
      </StateBoundary>

      <AddAssetDrawer
        open={adding}
        onClose={() => setAdding(false)}
        picked={pickedClass}
        onPick={setPickedClass}
        reportingYear={reportingYear}
        onSaved={onSaved}
      />
    </div>
  )
}

function ClassChart({ data, formatTonnes, className = '' }: { data: Array<{ name: string; financed: number }>; formatTonnes: (v: number) => string; className?: string }) {
  const { t } = useTranslation()
  const ct = useChartTheme()
  const height = Math.max(200, data.length * 44 + 16)
  return (
    <ChartFrame
      className={className}
      title={t('pcaf.charts.byAssetClass')}
      subtitle={t('pcaf.charts.unit')}
      height={height}
      empty={data.length === 0}
      emptyTitle={t('pcaf.charts.empty')}
    >
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }} barCategoryGap={10}>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis type="category" dataKey="name" {...ct.yAxis} tickFormatter={undefined} width={128} interval={0} />
        <Tooltip {...ct.tooltip({ unit: 'tCO2e' })} cursor={{ fill: 'var(--bg-hover)' }} />
        <Bar dataKey="financed" name={t('pcaf.charts.financed')} fill={chartColors.s2} {...ct.bar} radius={[0, 4, 4, 0]} maxBarSize={24}>
          <LabelList dataKey="financed" position="right" formatter={(v: number) => formatTonnes(v)} style={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }} />
        </Bar>
      </BarChart>
    </ChartFrame>
  )
}

const DQ_LEVELS = [1, 2, 3, 4, 5] as const

function DqProfile({ assets, className = '' }: { assets: PcafAsset[]; className?: string }) {
  const { t } = useTranslation()
  const { f, money } = usePcafFormat()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduce = useReducedMotion()
  const rows = useMemo(() => {
    const total = assets.reduce((s, a) => s + num(a.outstanding_amount), 0)
    return DQ_LEVELS.map(level => {
      const out = assets.filter(a => Math.round(num(a.data_quality_score)) === level).reduce((s, a) => s + num(a.outstanding_amount), 0)
      return { level, out, share: total > 0 ? out / total : 0 }
    })
  }, [assets])

  return (
    <section ref={ref} className={`surface-paper p-5 ${className}`} aria-labelledby="pcaf-dq">
      <h2 id="pcaf-dq" className="type-h3 text-[var(--text-primary)]">{t('pcaf.dq.title')}</h2>
      <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('pcaf.dq.subtitle')}</p>
      {assets.length === 0 ? (
        <p className="mt-6 text-small text-[var(--text-tertiary)]">{t('pcaf.charts.empty')}</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {rows.map((r, i) => {
            const tone = dqTone(r.level)
            return (
              <li key={r.level}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="nx-pill" data-tone={tone} data-size="sm">{t('pcaf.dq.level', { n: r.level })}</span>
                    <span className="text-caption text-[var(--text-secondary)] truncate">{t(`pcaf.dq.desc${r.level}`)}</span>
                  </span>
                  <span className="text-caption tabular-nums text-[var(--text-primary)] font-semibold whitespace-nowrap">
                    {f.percent(r.share, { ratio: true, precision: r.share > 0 && r.share < 0.1 ? 1 : 0 })}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden" title={money(r.out)}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `var(--status-${tone})` }}
                    initial={reduce ? false : { width: '0%' }}
                    animate={inView || reduce ? { width: `${r.share * 100}%` } : { width: '0%' }}
                    transition={{ duration: dur.draw, ease: ease.out, delay: staggerDelay(i) }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-4 text-caption text-[var(--text-tertiary)]">{t('pcaf.dq.footnote')}</p>
    </section>
  )
}

function SyncPanel({
  reportingYear,
  facilities,
  disabled,
  formatTonnes,
}: {
  reportingYear: number
  facilities: ApiFacility[]
  disabled: boolean
  formatTonnes: (v: number) => string
}) {
  const { t } = useTranslation()
  const { f } = usePcafFormat()
  const [facilityId, setFacilityId] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldErr, setFieldErr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ id: string; total: number; dq: number } | null>(null)

  useEffect(() => {
    if (!facilityId && facilities[0]) setFacilityId(facilities[0].id)
  }, [facilities, facilityId])

  const sync = async () => {
    if (!facilityId) { setFieldErr(t('pcaf.sync.pickFacility')); return }
    setBusy(true)
    setError(null)
    try {
      const r = await pcafApi.syncToScope3({ reportingYear, facilityId })
      setResult({ id: r.activity_data_id, total: r.total_financed_emissions, dq: r.weighted_data_quality })
      notify.success(t('pcaf.sync.toast', { total: formatTonnes(r.total_financed_emissions) }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('pcaf.sync.failed')
      setError(msg)
      notify.error(t('pcaf.sync.failed'), { description: msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="surface-paper p-5" aria-labelledby="pcaf-sync">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="min-w-0 flex-1">
          <h2 id="pcaf-sync" className="type-h3 text-[var(--text-primary)]">{t('pcaf.sync.title')}</h2>
          <p className="text-small text-[var(--text-secondary)] mt-1 max-w-[72ch]">{t('pcaf.sync.description', { year: reportingYear })}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 lg:w-auto">
          <CalcField label={t('pcaf.sync.facility')} error={fieldErr} className="sm:w-[240px]">
            {p => (
              <CalcSelect {...p} value={facilityId} onChange={e => { setFacilityId(e.target.value); setFieldErr(null) }} disabled={facilities.length === 0}>
                {facilities.length === 0 ? <option value="">{t('pcaf.sync.noFacilities')}</option> :
                  facilities.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </CalcSelect>
            )}
          </CalcField>
          <Button size="lg" onClick={sync} loading={busy} disabled={disabled} icon={<Send className="w-4 h-4" />} title={disabled ? t('pcaf.sync.disabledHint') : undefined}>
            {t('pcaf.sync.button')}
          </Button>
        </div>
      </div>
      {error && <div className="mt-3"><Callout tone="danger">{error}</Callout></div>}
      {result && (
        <p className="mt-3 text-small text-[var(--status-success)] inline-flex items-center gap-1.5" role="status">
          <CheckCircle2 className="w-4 h-4" aria-hidden />
          {t('pcaf.sync.success', { total: formatTonnes(result.total), dq: f.number(result.dq, { precision: 2 }), id: result.id.slice(0, 8) })}
        </p>
      )}
    </section>
  )
}

function AddAssetDrawer({
  open,
  onClose,
  picked,
  onPick,
  reportingYear,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  picked: PcafAssetCalculator | null
  onPick: (c: PcafAssetCalculator | null) => void
  reportingYear: number
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const raf = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button, input, select')?.focus())
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'var(--bg-overlay)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pcaf-drawer-title"
            className="relative w-full max-w-2xl h-full overflow-y-auto bg-[var(--bg-elevated)] border-l border-[var(--border-default)] shadow-[var(--shadow-overlay)]"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={spring.gentle}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <div className="min-w-0 flex items-center gap-2">
                {picked && (
                  <button
                    type="button"
                    onClick={() => onPick(null)}
                    aria-label={t('pcaf.drawer.pickDifferent')}
                    className="w-9 h-9 -ml-2 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 id="pcaf-drawer-title" className="type-h2 text-[var(--text-primary)] truncate">
                  {picked ? t(`pcaf.assetClasses.${picked.assetClass}.name`, { defaultValue: picked.name }) : t('pcaf.drawer.title')}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('pcaf.drawer.close')}
                className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="px-5 sm:px-6 py-5">
              {!picked ? (
                <>
                  <p className="text-small text-[var(--text-secondary)] mb-4">{t('pcaf.drawer.intro')}</p>
                  <ul className="surface-paper divide-y divide-[var(--border-subtle)] overflow-hidden">
                    {PCAF_CALCULATORS.map(c => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => onPick(c)}
                          className="w-full text-left px-4 py-3.5 min-h-[56px] flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors duration-micro group"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-small font-semibold text-[var(--text-primary)]">{t(`pcaf.assetClasses.${c.assetClass}.name`, { defaultValue: c.name })}</span>
                            <span className="block text-caption text-[var(--text-tertiary)] mt-0.5">{t(`pcaf.assetClasses.${c.assetClass}.description`, { defaultValue: c.description })}</span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] flex-shrink-0" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="https://carbonaccountingfinancials.com/standard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-caption text-[var(--text-tertiary)] hover:text-[var(--color-brand-strong)]"
                  >
                    {t('pcaf.calculator.methodology')} <ExternalLink className="w-3 h-3" aria-hidden />
                  </a>
                </>
              ) : (
                <AssetCalculator calculator={picked} reportingYear={reportingYear} onSaved={onSaved} />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function yearOptions(): number[] {
  const y = new Date().getFullYear()
  return [y + 1, y, y - 1, y - 2, y - 3, y - 4]
}
