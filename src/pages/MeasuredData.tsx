import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Gauge,
  Zap,
  ShieldCheck,
  FlaskConical,
  ArrowRight,
  ArrowRightLeft,
  Database,
  GitMerge,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Activity,
  Eye,
  Layers,
  Split,
} from 'lucide-react'
import { Tabs } from '../design-system'
import { StatLedger, StatusPill } from '../components/ui'
import ChartFrame, { chartColors, useChartTheme } from '../components/ui/ChartFrame'
import ModuleHeader from '../components/analytics/data/ModuleHeader'
import ProcessFlow from '../components/analytics/data/ProcessFlow'
import SplitBar from '../components/analytics/data/SplitBar'
import { useFmt } from '../lib/fmt'

/* ── Source types (illustrative measured-data catalogue) ── */
const SOURCE_TYPES = [
  { id: 'cems', icon: Gauge, readings: 4_200_000, sources: 14, quality: 'A+', frequency: 'continuous' },
  { id: 'utility', icon: Zap, readings: 892_000, sources: 47, quality: 'A', frequency: 'hourly' },
  { id: 'verified', icon: ShieldCheck, readings: 156_000, sources: 8, quality: 'A+', frequency: 'monthly' },
  { id: 'lab', icon: FlaskConical, readings: 2_847, sources: 22, quality: 'B+', frequency: 'quarterly' },
] as const

const MEASURED_PIPELINE = [
  { id: 'normalise', icon: Filter },
  { id: 'qa', icon: Activity },
  { id: 'classify', icon: Layers },
] as const

const DATA_PATHS = [
  { id: 'direct', icon: ArrowRight, records: 3_800_000, pct: 72, color: chartColors.s1 },
  { id: 'hybrid', icon: ArrowRightLeft, records: 1_500_000, pct: 28, color: chartColors.s3 },
] as const

const ROUTING = [
  { id: 'cems', path: 'direct', records: 4_200_000 },
  { id: 'electricity', path: 'hybrid', records: 620_000 },
  { id: 'gas', path: 'direct', records: 272_000 },
  { id: 'verified', path: 'direct', records: 156_000 },
  { id: 'fuel', path: 'hybrid', records: 1_847 },
  { id: 'process', path: 'hybrid', records: 1_000 },
] as const

const RECON_RULES = [
  { id: 'cemsVsCalc', status: 'active' as const, matches: 342 },
  { id: 'meterVsInvoice', status: 'active' as const, matches: 89 },
  { id: 'verifiedOverride', status: 'active' as const, matches: 156 },
  { id: 'labOverride', status: 'active' as const, matches: 47 },
  { id: 'gapFill', status: 'warning' as const, matches: 18 },
]

const QUALITY_METRICS = [
  { id: 'completeness', value: 98.4, target: 95, unit: '%' },
  { id: 'temporal', value: 99.1, target: 98, unit: '%' },
  { id: 'sourceCoverage', value: 91, target: 90, unit: 'sources' },
  { id: 'anomalyRate', value: 0.3, target: 1.0, unit: '%', inverted: true },
]

export default function MeasuredData() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={t('measured.title')}
        description={t('measured.subtitle')}
        meta={
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <StatusPill tone="success" dot size="sm">
              {t('measured.live')}
            </StatusPill>
            <span className="text-caption text-[var(--text-tertiary)]">{t('measured.lastSync')}</span>
          </span>
        }
      />

      <div className="overflow-x-auto -mx-1 px-1 [scrollbar-width:none]">
        <Tabs
          className="w-max"
          aria-label={t('measured.tabsAria')}
          tabs={[
            { id: 'overview', label: t('measured.tabs.overview') },
            { id: 'paths', label: t('measured.tabs.paths') },
            { id: 'reconciliation', label: t('measured.tabs.reconciliation'), count: RECON_RULES.length },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'paths' && <ProcessingPathsTab />}
      {activeTab === 'reconciliation' && <ReconciliationTab />}
    </div>
  )
}

/* ═══════════════════════════════════
   Overview
   ═══════════════════════════════════ */
function OverviewTab() {
  const { t } = useTranslation()
  const f = useFmt()
  return (
    <div className="space-y-6">
      <StatLedger
        aria-label={t('measured.overview.qualityAria')}
        items={QUALITY_METRICS.map((m) => {
          const good = m.inverted ? m.value <= m.target : m.value >= m.target
          const pct = m.unit === '%'
          return {
            id: m.id,
            label: t(`measured.metrics.${m.id}`),
            value: m.value,
            format: (n: number) => (pct ? f.number(n, { precision: 1 }) : f.number(n)),
            unit: pct ? '%' : t('measured.units.sources'),
            tone: good ? ('success' as const) : ('warning' as const),
            hint: t(m.inverted ? 'measured.overview.targetMax' : 'measured.overview.targetMin', {
              value: pct ? f.percent(m.target, { precision: m.target % 1 ? 1 : 0 }) : f.number(m.target),
            }),
          }
        })}
      />

      <section className="surface-paper overflow-hidden" aria-labelledby="measured-sources">
        <header className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 id="measured-sources" className="type-h3 text-[var(--text-primary)]">
            {t('measured.overview.sourceTypes')}
          </h2>
        </header>
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_110px_90px_80px_120px] gap-4 px-5 py-2.5 bg-[var(--bg-secondary)] text-caption font-medium text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
          <span>{t('measured.overview.source')}</span>
          <span className="text-right">{t('measured.overview.readings')}</span>
          <span className="text-right">{t('measured.overview.sources')}</span>
          <span>{t('measured.overview.quality')}</span>
          <span>{t('measured.overview.frequency')}</span>
        </div>
        <ul className="divide-y divide-[var(--border-subtle)]">
          {SOURCE_TYPES.map((src) => {
            const Icon = src.icon
            return (
              <li key={src.id} className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_110px_90px_80px_120px] gap-x-4 gap-y-3 px-5 py-4 items-center hover:bg-[var(--bg-hover)] transition-colors duration-micro">
                <div className="col-span-2 md:col-span-1 flex items-start gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="text-small font-semibold text-[var(--text-primary)]">
                      {t(`measured.sources.${src.id}.title`)}
                      <span className="font-normal text-[var(--text-tertiary)]"> · {t(`measured.sources.${src.id}.fullTitle`)}</span>
                    </div>
                    <p className="text-caption text-[var(--text-tertiary)] mt-0.5 text-pretty">{t(`measured.sources.${src.id}.desc`)}</p>
                  </div>
                </div>
                <Fact label={t('measured.overview.readings')} className="md:text-right">
                  <span title={f.number(src.readings)}>{f.compact(src.readings)}</span>
                </Fact>
                <Fact label={t('measured.overview.sources')} className="md:text-right">
                  {f.number(src.sources)}
                </Fact>
                <Fact label={t('measured.overview.quality')}>
                  <StatusPill tone={src.quality.startsWith('A') ? 'success' : 'warning'} size="sm">
                    {src.quality}
                  </StatusPill>
                </Fact>
                <Fact label={t('measured.overview.frequency')}>
                  <span className="text-small font-medium text-[var(--text-secondary)] whitespace-nowrap">{t(`measured.frequency.${src.frequency}`)}</span>
                </Fact>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="surface-paper p-5 sm:p-6" aria-labelledby="measured-flow">
        <h2 id="measured-flow" className="type-h3 text-[var(--text-primary)] mb-5">
          {t('measured.overview.processingPipeline')}
        </h2>
        <ProcessFlow
          aria-label={t('measured.overview.processingPipeline')}
          steps={[
            { id: 'in', icon: Database, title: t('measured.overview.sourcesCount', { count: SOURCE_TYPES.length }), desc: t('measured.overview.sourcesDesc') },
            ...MEASURED_PIPELINE.map((s) => ({ id: s.id, icon: s.icon, title: t(`measured.pipeline.${s.id}.title`), desc: t(`measured.pipeline.${s.id}.desc`) })),
            {
              id: 'route',
              icon: Split,
              title: t('measured.overview.route'),
              meta: (
                <SplitBar
                  className="max-w-[200px]"
                  aria-label={t('measured.processing.shareAria')}
                  legend
                  segments={DATA_PATHS.map((p) => ({ id: p.id, value: p.pct, color: p.color, label: t(`measured.processing.${p.id}`), display: f.percent(p.pct) }))}
                />
              ),
            },
            { id: 'repo', icon: Database, title: t('measured.overview.repository'), desc: t('measured.overview.repositoryDesc') },
          ]}
        />
      </section>
    </div>
  )
}

function Fact({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="md:hidden text-caption text-[var(--text-tertiary)] mb-0.5">{label}</div>
      <div className="text-small font-semibold text-[var(--text-primary)] tabular-nums">{children}</div>
    </div>
  )
}

/* ═══════════════════════════════════
   Processing paths
   ═══════════════════════════════════ */
function ProcessingPathsTab() {
  const { t } = useTranslation()
  const f = useFmt()
  const ct = useChartTheme()
  const chartRows = ROUTING.map((r) => ({ name: t(`measured.processing.routing.${r.id}.short`), records: r.records, path: r.path }))

  return (
    <div className="space-y-6">
      <section className="surface-paper overflow-hidden" aria-label={t('measured.tabs.paths')}>
        <div className="px-5 pt-5 pb-4">
          <SplitBar
            height={10}
            legend
            aria-label={t('measured.processing.shareAria')}
            segments={DATA_PATHS.map((p) => ({
              id: p.id,
              value: p.pct,
              color: p.color,
              label: t(`measured.paths.${p.id}.title`),
              display: f.percent(p.pct),
            }))}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
          {DATA_PATHS.map((path) => {
            const Icon = path.icon
            return (
              <article key={path.id} className="bg-[var(--bg-primary)] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 text-[var(--btn-primary-fg)]" style={{ background: path.color }}>
                    <Icon className="w-4 h-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="type-h3 text-[var(--text-primary)]">{t(`measured.paths.${path.id}.title`)}</h3>
                      <StatusPill tone={path.id === 'direct' ? 'success' : 'neutral'} size="sm">
                        {t(`measured.paths.${path.id}.subtitle`)}
                      </StatusPill>
                    </div>
                    <p className="text-small text-[var(--text-tertiary)] mt-1 text-pretty">{t(`measured.paths.${path.id}.desc`)}</p>
                  </div>
                </div>
                <dl className="mt-5 flex items-end gap-8">
                  <div>
                    <dt className="text-caption text-[var(--text-tertiary)]">{t('measured.processing.records')}</dt>
                    <dd className="type-figure text-[28px] leading-9 text-[var(--text-primary)]" title={f.number(path.records)}>
                      {f.compact(path.records)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-[var(--text-tertiary)]">{t('measured.processing.share')}</dt>
                    <dd className="type-figure text-[28px] leading-9 text-[var(--text-primary)]">{f.percent(path.pct)}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      </section>

      <ChartFrame
        title={t('measured.processing.chartTitle')}
        subtitle={t('measured.processing.chartSubtitle')}
        height={260}
        legend={[
          { label: t('measured.processing.direct'), color: chartColors.s1 },
          { label: t('measured.processing.hybrid'), color: chartColors.s3 },
        ]}
      >
        <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" {...ct.yAxis} width={124} tickFormatter={undefined} />
          <Tooltip {...ct.tooltip({ format: (n) => f.number(n) })} cursor={{ fill: 'var(--bg-hover)' }} />
          <Bar dataKey="records" name={t('measured.processing.records')} {...ct.bar} radius={[0, 4, 4, 0]} minPointSize={2}>
            {chartRows.map((r) => (
              <Cell key={r.name} fill={r.path === 'direct' ? chartColors.s1 : chartColors.s3} />
            ))}
            <LabelList
              dataKey="records"
              position="right"
              formatter={(v: unknown) => f.compact(v as number)}
              style={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ChartFrame>

      <section className="surface-paper overflow-hidden" aria-labelledby="measured-routing">
        <header className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 id="measured-routing" className="type-h3 text-[var(--text-primary)]">
            {t('measured.processing.routingTitle')}
          </h2>
        </header>
        <ul className="divide-y divide-[var(--border-subtle)]">
          {ROUTING.map((row) => (
            <li key={row.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--bg-hover)] transition-colors duration-micro">
              <div className="flex-1 min-w-0">
                <div className="text-small font-medium text-[var(--text-primary)]">{t(`measured.processing.routing.${row.id}.source`)}</div>
                <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t(`measured.processing.routing.${row.id}.reason`)}</p>
              </div>
              <StatusPill tone={row.path === 'direct' ? 'success' : 'neutral'} size="sm">
                {t(`measured.processing.${row.path}`)}
              </StatusPill>
              <span className="text-small font-semibold tabular-nums text-[var(--text-primary)] w-20 text-right whitespace-nowrap">{f.number(row.records)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════
   Reconciliation
   ═══════════════════════════════════ */
function ReconciliationTab() {
  const { t } = useTranslation()
  const f = useFmt()
  const matches = RECON_RULES.reduce((a, r) => a + (r.status === 'active' ? r.matches : 0), 0)
  const conflicts = RECON_RULES.filter((r) => r.status === 'warning').reduce((a, r) => a + r.matches, 0)
  return (
    <div className="space-y-6">
      <StatLedger
        items={[
          { id: 'rules', label: t('measured.reconciliation.activeRules'), value: RECON_RULES.length, tone: 'brand' },
          { id: 'matches', label: t('measured.reconciliation.matchesApplied'), value: matches, tone: 'success' },
          { id: 'conflicts', label: t('measured.reconciliation.conflictsFlagged'), value: conflicts, tone: 'warning', hint: t('measured.reconciliation.conflictsHint') },
        ]}
      />

      <section className="surface-paper overflow-hidden" aria-labelledby="recon-rules">
        <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <h2 id="recon-rules" className="type-h3 text-[var(--text-primary)]">
            {t('measured.reconciliation.rulesTitle')}
          </h2>
          <StatusPill tone="brand" dot size="sm">
            {t('measured.reconciliation.autoApplied')}
          </StatusPill>
        </header>
        <ul className="divide-y divide-[var(--border-subtle)]">
          {RECON_RULES.map((rule) => (
            <li key={rule.id} className="flex items-center gap-3 sm:gap-4 px-5 py-3.5 hover:bg-[var(--bg-hover)] transition-colors duration-micro">
              {rule.status === 'active' ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] flex-shrink-0" aria-hidden />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] flex-shrink-0" aria-hidden />
              )}
              <span className="flex-1 min-w-0 text-small text-[var(--text-primary)]">{t(`measured.rules.${rule.id}`)}</span>
              <StatusPill tone={rule.status === 'active' ? 'success' : 'warning'} dot size="sm">
                {rule.status === 'active' ? t('measured.reconciliation.active') : t('measured.reconciliation.review')}
              </StatusPill>
              <span className="text-small font-semibold tabular-nums text-[var(--text-primary)] w-12 text-right">{f.number(rule.matches)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-paper p-5 sm:p-6" aria-labelledby="recon-how">
        <h2 id="recon-how" className="type-h3 text-[var(--text-primary)] mb-5">
          {t('measured.reconciliation.howTitle')}
        </h2>
        <ProcessFlow
          aria-label={t('measured.reconciliation.howTitle')}
          steps={[
            { id: '1', icon: Database },
            { id: '2', icon: GitMerge },
            { id: '3', icon: CheckCircle2 },
            { id: '4', icon: Eye },
          ].map((s) => ({
            id: s.id,
            icon: s.icon,
            title: t('measured.reconciliation.step', { n: s.id }),
            desc: t(`measured.reconciliation.steps.${s.id}`),
          }))}
        />
      </section>
    </div>
  )
}
