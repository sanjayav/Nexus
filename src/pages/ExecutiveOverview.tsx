import {
  ExternalLink, Shield, Globe2, ArrowRight, ArrowUpRight, Database, CheckSquare2, BarChart3, Target, Sparkles,
  Gauge, Layers, Leaf, AlertTriangle, AlertCircle, FileWarning, CalendarClock, Check, Link2, Filter,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'
import { PageHeader, Card, CardHeader, Button, Badge, Stat, StatStrip, Progress, EmptyState, chartTheme } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { executiveOverviewStrings } from '../i18n/pages/executiveOverview'
import { useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useMockData, useWorkspace, useL10n } from '../workspace/WorkspaceContext'
import { regulatoryCalendar, daysUntil } from '../data/regulatory'
import type { Tone } from '../components/ui'

const CORE_WAYS = [
  { key: 'collect', icon: Database, path: '/frameworks', ai: true },
  { key: 'comply', icon: CheckSquare2, path: '/dma', ai: false },
  { key: 'report', icon: BarChart3, path: '/analytics', ai: true },
  { key: 'improve', icon: Target, path: '/ghg', ai: false },
] as const

const QUICK_LINKS = [
  { key: 'csrd', path: '/dma' },
  { key: 'edci', path: '/carbon' },
  { key: 'targets', path: '/ghg' },
  { key: 'scope3', path: '/scope3' },
] as const

const PIONEER_LINKS = [
  { key: 'scope3', path: '/scope3' },
  { key: 'ai', path: '/ai' },
  { key: 'workflow', path: '/workflow' },
  { key: 'xbrl', path: '/publish' },
] as const

const STAGES = ['setup', 'dma', 'collection', 'review', 'publish'] as const
const CURRENT_STAGE = 1 // DMA

export default function ExecutiveOverview() {
  const s = useStrings(executiveOverviewStrings)
  const f = useFormat()
  const navigate = useNavigate()
  const l10n = useL10n()
  const fw = useFrameworkLabels()
  const { workspace, region } = useWorkspace()
  const mockData = useMockData()
  const { frameworks, dma, ghg, integrity, coverageByModule, approvalsFunnel, alerts } = mockData
  const network = l10n(region.chain.network)
  const coverageData = useMemo(
    () => coverageByModule.map(row => ({ ...row, label: fw.short(row.module) })),
    [coverageByModule, fw],
  )
  // '0.5d' → localised "0.5 days"; anything else is shown as-is.
  const avgTime = (t: string) => {
    const m = /^([\d.]+)d$/.exec(t)
    return m ? fmt(s.approvals.days, { n: f.number(Number(m[1])) }) : t
  }
  const helpCopy = s.help.links[region.id] ?? s.help.links.global

  const blocking = alerts.filter(a => a.level === 'error').length
  const fwEntries = Object.entries(frameworks)
  const avgCoverage = Math.round(fwEntries.reduce((sum, [, v]) => sum + v.covered, 0) / fwEntries.length)
  const scope12 = ghg.scope1.value + ghg.scope2Market.value
  const funnelMax = Math.max(...approvalsFunnel.map(a => a.count))
  // Last N months of DMA completion, ending this month.
  const trend = dma.sparkline.map((value, i, arr) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (arr.length - 1 - i))
    return { value, label: f.date(d, { month: 'short' }) }
  })

  return (
    <div>
      <PageHeader
        title={s.title}
        description={fmt(s.description, { period: workspace.reportingYear })}
        actions={
          <>
            <Badge icon={Globe2}>{l10n(region.label)}</Badge>
            <Badge tone="success" icon={Shield}>{s.integrityVerified}</Badge>
            <Button variant="primary" size="sm" iconRight={ArrowRight} onClick={() => navigate('/workbench?filter=Critical')}>
              {s.resolveGaps}
            </Button>
          </>
        }
      />

      <div className="space-y-6">
      {/* KPI row */}
      <StatStrip>
        <Stat label={s.kpi.dma} value={f.percent(dma.percentage)} icon={Gauge} delta={dma.change} deltaLabel={s.kpi.dmaDelta} />
        <Stat label={s.kpi.coverage} value={f.percent(avgCoverage)} icon={Layers} deltaLabel={fmt(s.kpi.coverageFoot, { count: fwEntries.length })} />
        <Stat label={s.kpi.integrity} value={integrity.score} unit={s.trust.outOf} icon={Shield} deltaLabel={s.kpi.integrityFoot} />
        <Stat label={s.kpi.emissions} value={f.number(scope12)} unit={ghg.scope1.unit} icon={Leaf} deltaLabel={s.kpi.emissionsFoot} />
      </StatStrip>

      {/* Pipeline + risks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader
            title={s.pipeline.title}
            description={fmt(s.pipeline.description, { done: dma.topicsWithCompleteDMA, total: dma.totalMaterialTopics })}
            action={<span className="text-2xl font-semibold tracking-tight text-zinc-900 tabular">{f.percent(dma.percentage)}</span>}
          />
          <ol className="grid grid-cols-5 gap-2 sm:gap-3">
            {STAGES.map((stage, i) => {
              const state = i < CURRENT_STAGE ? 'done' : i === CURRENT_STAGE ? 'current' : 'upcoming'
              return (
                <li key={stage} className="min-w-0">
                  <div
                    className={clsx(
                      'h-1.5 rounded-full',
                      state === 'done' && 'bg-emerald-500',
                      state === 'current' && 'bg-zinc-200 overflow-hidden',
                      state === 'upcoming' && 'bg-zinc-100',
                    )}
                  >
                    {state === 'current' && <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${dma.percentage}%` }} />}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 min-w-0">
                    {state === 'done' ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className={clsx('w-4 h-4 rounded-full border-2 shrink-0', state === 'current' ? 'border-zinc-900' : 'border-zinc-300')} />
                    )}
                    <span className={clsx('text-[13px] font-medium truncate', state === 'upcoming' ? 'text-zinc-400' : 'text-zinc-900')}>
                      {s.pipeline.stages[stage]}
                    </span>
                  </div>
                  <div className="hidden sm:block mt-0.5 pl-[22px] text-xs text-zinc-500">{s.pipeline[state]}</div>
                </li>
              )
            })}
          </ol>
          <div className="mt-6 pt-5 border-t border-line flex-1 flex flex-col min-h-[180px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-zinc-500">{s.pipeline.trend}</span>
              <Badge tone="success">{fmt(s.pipeline.trendDelta, { pct: f.percent(dma.change) })}</Badge>
            </div>
            <div className="flex-1 min-h-[140px] -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dmaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartTheme.series[1]} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={chartTheme.series[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartTheme.axis }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartTheme.axis }} width={44} domain={[50, 100]} ticks={[50, 75, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={chartTheme.tooltip.contentStyle}
                    labelStyle={chartTheme.tooltip.labelStyle}
                    formatter={(v: number) => [f.percent(v), s.kpi.dma]}
                  />
                  <Area type="monotone" dataKey="value" stroke={chartTheme.series[1]} strokeWidth={2} fill="url(#dmaFill)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="pt-5 flex flex-wrap items-center justify-between gap-3">
            {blocking > 0 ? (
              <Badge tone="danger" dot>{blocking === 1 ? s.pipeline.blockingOne : fmt(s.pipeline.blocking, { count: blocking })}</Badge>
            ) : (
              <Badge tone="success" dot>{s.pipeline.noBlocking}</Badge>
            )}
            <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate('/workbench')}>
              {s.pipeline.openWorkbench}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title={s.risk.title} description={s.risk.description} />
          <dl className="divide-y divide-line -my-1">
            {[
              { label: s.risk.critical, value: blocking, icon: AlertCircle, tone: 'text-rose-600' },
              { label: s.risk.missingEvidence, value: 12, icon: FileWarning, tone: 'text-amber-600' },
              { label: s.risk.expiringTargets, value: 2, icon: CalendarClock, tone: 'text-zinc-900' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2.5">
                <dt className="flex items-center gap-2 text-sm text-zinc-700">
                  <row.icon className="w-4 h-4 text-zinc-400" />
                  {row.label}
                </dt>
                <dd className={clsx('text-lg font-semibold tabular', row.tone)}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 pt-4 border-t border-line">
            <div className="text-[13px] font-medium text-zinc-500 mb-2">{s.risk.alertsTitle}</div>
            <ul className="space-y-2">
              {alerts.map(a => (
                <li key={a.id} className="flex items-start gap-2 text-[13px] text-zinc-700">
                  <AlertTriangle className={clsx('w-3.5 h-3.5 mt-0.5 shrink-0', a.level === 'error' ? 'text-rose-500' : 'text-amber-500')} />
                  <span className="min-w-0">{s.risk.alerts[a.message] ?? a.message}</span>
                </li>
              ))}
            </ul>
          </div>
          <Button variant="primary" className="mt-5 w-full" iconRight={ArrowRight} onClick={() => navigate('/workbench?filter=Critical')}>
            {s.resolveGaps}
          </Button>
        </Card>
      </div>

      {/* Feature entry cards */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">{s.features.title}</h2>
            <p className="text-[13px] text-zinc-500 mt-0.5">{s.features.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {CORE_WAYS.map(way => {
            const Icon = way.icon
            const copy = s.features.items[way.key]
            return (
              <Link
                key={way.key}
                to={way.path}
                className="group bg-surface border border-line rounded-card shadow-card p-5 flex flex-col transition-[box-shadow,border-color] hover:border-zinc-300 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  {way.ai && <Badge icon={Sparkles}>{s.features.ai}</Badge>}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-zinc-900">{copy.title}</h3>
                <p className="mt-1 text-[13px] text-zinc-500 leading-relaxed flex-1">{copy.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-zinc-700 group-hover:text-zinc-900">
                  {s.features.open}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader title={s.frameworks.title} description={s.frameworks.description} />
          <div className="space-y-3">
            {fwEntries.map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between items-center text-[13px] mb-1.5">
                  <span className="text-zinc-700 truncate pr-2">{fw.short(key)}</span>
                  <span className="font-medium text-zinc-900 tabular">{f.percent(value.covered)}</span>
                </div>
                <Progress value={value.covered} tone={value.covered >= 80 ? 'success' : 'neutral'} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title={s.ghg.title} description={s.ghg.description} />
          <dl className="divide-y divide-line -my-1">
            {[
              { label: s.ghg.scope1, v: ghg.scope1 },
              { label: s.ghg.scope2Loc, v: ghg.scope2Location },
              { label: s.ghg.scope2Mkt, v: ghg.scope2Market },
            ].map(row => (
              <div key={row.label} className="flex items-baseline justify-between py-2.5 gap-3">
                <dt className="text-sm text-zinc-600">{row.label}</dt>
                <dd className="text-right">
                  <span className="text-base font-semibold text-zinc-900 tabular">{f.number(row.v.value)}</span>
                  <span className="text-xs text-zinc-500 ml-1">{row.v.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto pt-4">
            <Button variant="secondary" size="sm" className="w-full" iconRight={ExternalLink} onClick={() => navigate('/ghg')}>
              {s.ghg.calculateRoots}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title={s.trust.title} description={s.trust.description} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[40px] font-semibold tracking-[-0.03em] text-zinc-900 tabular leading-none">{integrity.score}</span>
            <span className="text-sm text-zinc-500">{s.trust.outOf}</span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              { label: s.trust.anchored, value: integrity.weights.anchoredCompleteness.score },
              { label: s.trust.approvals, value: integrity.weights.approvalsPass.score },
              { label: s.trust.validations, value: integrity.weights.zeroFailedValidations.score },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span className="text-zinc-600">{row.label}</span>
                  <span className="font-medium text-zinc-900 tabular">{f.percent(row.value)}</span>
                </div>
                <Progress value={row.value} tone="success" />
              </div>
            ))}
          </div>
          <div className="mt-auto pt-5">
            <Badge tone="success" dot>{s.trust.active}</Badge>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title={s.rollup.title} description={s.rollup.description} />
          <div className="space-y-4">
            <div>
              <div className="text-[13px] font-medium text-zinc-500 mb-1.5">{s.rollup.root}</div>
              <div className="flex items-center gap-2 font-mono text-[13px] bg-zinc-50 border border-line px-3 py-2 rounded-[10px] text-zinc-900">
                <Link2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{mockData.rollup.shortRoot}</span>
              </div>
            </div>
            <div>
              <div className="text-[13px] font-medium text-zinc-500 mb-1.5">{s.rollup.chain}</div>
              <div className="text-sm text-zinc-900 leading-snug">{network}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{l10n(region.chain.kind)}</div>
            </div>
          </div>
          <div className="mt-auto pt-4">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              iconRight={ExternalLink}
              title={region.chain.explorer}
              onClick={() => window.open(region.chain.explorer, '_blank', 'noopener,noreferrer')}
            >
              {s.rollup.viewExplorer}
            </Button>
          </div>
        </Card>
      </div>

      {/* Charts + regulatory calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader title={s.approvals.title} description={s.approvals.description} icon={Filter} />
          <div className="space-y-4">
            {approvalsFunnel.map(stage => (
              <div key={stage.stage}>
                <div className="flex justify-between items-center mb-1.5 text-[13px]">
                  <span className="font-medium text-zinc-700">{s.approvals.stages[stage.stage] ?? stage.stage}</span>
                  <span className="text-zinc-500 tabular">
                    {fmt(s.approvals.files, { count: f.number(stage.count) })}
                    <span className="text-zinc-300 mx-1.5">·</span>
                    {fmt(s.approvals.avg, { time: avgTime(stage.avgTime) })}
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${(stage.count / funnelMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={s.coverage.title} description={s.coverage.description} icon={BarChart3} />
          <div className="h-[220px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverageData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartTheme.axis }} minTickGap={8} height={28} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartTheme.axis }} width={44} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={chartTheme.tooltip.contentStyle}
                  labelStyle={chartTheme.tooltip.labelStyle}
                  formatter={(v: number) => [f.percent(v), s.coverage.series]}
                />
                <Bar dataKey="covered" name={s.coverage.series} fill={chartTheme.series[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <RegulatoryCalendarCard className="lg:col-span-2 xl:col-span-1" />
      </div>

      {/* Help & shortcuts */}
      <Card>
        <CardHeader title={s.help.title} />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)] gap-6">
          <div>
            <div className="text-[13px] font-medium text-zinc-500 mb-2">{s.help.quickLinks}</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {QUICK_LINKS.map(l => (
                <li key={l.key}>
                  <Link to={l.path} className="group flex items-center justify-between gap-3 py-2 border-b border-line text-sm text-zinc-700 hover:text-zinc-900">
                    <span>{helpCopy[l.key]}</span>
                    <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[13px] font-medium text-zinc-500 mb-2">{s.help.pioneer}</div>
            <div className="flex flex-wrap gap-2">
              {PIONEER_LINKS.map(l => (
                <Link
                  key={l.key}
                  to={l.path}
                  className="inline-flex items-center h-8 px-3 rounded-lg border border-line bg-white text-[13px] font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 transition-colors"
                >
                  {s.help.pioneerLinks[l.key]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Card>
      </div>
    </div>
  )
}

/** Upcoming regulatory obligations for the active workspace region. */
function RegulatoryCalendarCard({ className }: { className?: string }) {
  const s = useStrings(executiveOverviewStrings)
  const f = useFormat()
  const l10n = useL10n()
  const fw = useFrameworkLabels()
  const { region } = useWorkspace()
  const items = useMemo(() => regulatoryCalendar(region.id), [region.id])

  const countdown = (date: string | null): { tone: Tone; label: string } | null => {
    if (!date) return null
    const d = daysUntil(date)
    if (d < 0) return { tone: 'danger', label: fmt(s.calendar.overdue, { count: f.number(-d) }) }
    if (d === 0) return { tone: 'danger', label: s.calendar.today }
    return { tone: d <= 30 ? 'danger' : d <= 120 ? 'warning' : 'neutral', label: fmt(s.calendar.daysLeft, { count: f.number(d) }) }
  }

  return (
    <Card className={clsx('flex flex-col', className)}>
      <CardHeader
        title={s.calendar.title}
        description={fmt(s.calendar.description, { region: l10n(region.label) })}
        icon={CalendarClock}
      />
      {items.length === 0 ? (
        <EmptyState icon={CalendarClock} title={s.calendar.emptyTitle} description={s.calendar.emptyBody} />
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {items.map(item => {
            const cd = countdown(item.date)
            return (
              <li key={item.id}>
                <Link
                  to={item.href ?? `/modules/${item.framework}`}
                  title={l10n(item.detail)}
                  className="group flex items-start gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className="h-5 px-1.5 text-[11px]">{fw.short(item.framework)}</Badge>
                      {item.kind === 'voluntary' && <Badge tone="info" className="h-5 px-1.5 text-[11px]">{s.calendar.voluntary}</Badge>}
                    </div>
                    <div className="mt-1.5 text-[13px] font-medium text-zinc-900 leading-snug group-hover:underline decoration-zinc-300 underline-offset-2">
                      {l10n(item.title)}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500 tabular">
                      {item.date ? f.date(item.date, { dateStyle: 'long' }) : item.dateNote ? l10n(item.dateNote) : s.calendar.tbc}
                    </div>
                  </div>
                  {cd ? (
                    <Badge tone={cd.tone} className="shrink-0 tabular">{cd.label}</Badge>
                  ) : (
                    <Badge className="shrink-0">{s.calendar.byNotice}</Badge>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-auto pt-4 text-xs text-zinc-400 leading-relaxed">{s.calendar.disclaimer}</p>
    </Card>
  )
}
