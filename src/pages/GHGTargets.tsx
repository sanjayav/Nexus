import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingDown, Target, FileText, CheckCircle2, ExternalLink, Zap, History, Gauge } from 'lucide-react'
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, StatCard, chartTheme } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { ghgTargetsStrings } from '../i18n/pages/ghgTargets'
import { useL10n, useMockData, useWorkspace } from '../workspace/WorkspaceContext'

const tick = { fontSize: 12, fill: chartTheme.axis }

/** Science-based reduction ambition against the first trend year (base year). */
const TARGET_REDUCTION_PCT = 42

function RootLink({ label, aria, onClick }: { label: string; aria: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 rounded"
    >
      {label}
      <ExternalLink className="w-3 h-3" />
    </button>
  )
}

export default function GHGTargets() {
  const s = useStrings(ghgTargetsStrings)
  const f = useFormat()
  const l10n = useL10n()
  const navigate = useNavigate()
  const { region } = useWorkspace()
  const mockData = useMockData()
  const { ghg, ghgTrends, renewableEnergy } = mockData
  const regional = s.regional[region.id] ?? s.regional.global
  const grid = region.gridFactor
  const gridSource = l10n(grid.source)

  // Base year = first trend point; progress = reduction of Scope 1 + 2 since then.
  const progress = useMemo(() => {
    if (ghgTrends.length === 0) return null
    const first = ghgTrends[0]
    const last = ghgTrends[ghgTrends.length - 1]
    const base = first.scope1 + first.scope2
    const latest = last.scope1 + last.scope2
    const reduction = base > 0 ? ((base - latest) / base) * 100 : 0
    return {
      baseYear: first.year,
      reduction,
      onTrack: reduction > 0 && reduction >= TARGET_REDUCTION_PCT * 0.4,
      scope1Target: Math.round(first.scope1 * (1 - TARGET_REDUCTION_PCT / 100)),
    }
  }, [ghgTrends])

  // Activity implied by the location-based Scope 2 figure and the regional grid factor.
  const impliedMWh = grid.value > 0 ? ghg.scope2Location.value / grid.value : 0

  const scopeTiles = [
    { label: s.scope1Total, d: ghg.scope1, note: undefined as string | undefined },
    { label: s.scope2Location, d: ghg.scope2Location, note: fmt(s.gridBasis, { value: f.number(grid.value, { maximumFractionDigits: 4 }), unit: grid.unit }) },
    { label: s.scope2Market, d: ghg.scope2Market, note: undefined },
  ]

  const evidenceItems = [
    { title: s.method1, id: 'EV-2024-045', file: 'methodology_document.pdf' },
    { title: s.method2, id: 'EV-2024-046', file: 'renewable_energy_certificates.xlsx' },
  ]

  const proofs = [s.zk1, s.zk2, s.zk3]

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={<Button variant="secondary" icon={FileText} onClick={() => navigate('/carbon')}>{s.openInventory}</Button>}
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {scopeTiles.map(t => (
          <StatCard
            key={t.label}
            label={t.label}
            value={f.number(t.d.value)}
            unit={t.d.unit}
            icon={TrendingDown}
            deltaLabel={t.note}
            footer={<RootLink label={fmt(s.viewRoot, { root: t.d.root })} aria={fmt(s.viewRootAria, { root: t.d.root })} onClick={() => navigate('/events')} />}
          />
        ))}
        <StatCard
          label={s.targetProgress}
          value={progress ? `${progress.reduction >= 0 ? '−' : '+'}${f.percent(Math.abs(progress.reduction))}` : '—'}
          icon={Target}
          deltaLabel={progress ? fmt(s.targetCaption, { pct: f.percent(TARGET_REDUCTION_PCT), year: progress.baseYear }) : undefined}
          footer={progress && <Badge tone={progress.onTrack ? 'success' : 'warning'} dot>{progress.onTrack ? s.onTrack : s.offTrack}</Badge>}
        />
      </div>

      {/* Regional Scope 2 basis */}
      <Card>
        <CardHeader title={s.gridTitle} description={regional.gridDesc} icon={Gauge} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
          <Metric label={s.gridFactor} value={f.number(grid.value, { maximumFractionDigits: 4 })} unit={grid.unit} />
          <Metric label={s.impliedConsumption} value={f.number(Math.round(impliedMWh))} unit="MWh" />
          <Metric label={s.scope2Location} value={f.number(ghg.scope2Location.value)} unit={ghg.scope2Location.unit} />
        </div>
        <p className="mt-5 pt-4 border-t border-line text-xs text-zinc-500 leading-relaxed">{fmt(s.gridSource, { source: gridSource })}</p>
      </Card>

      {/* Renewable energy */}
      {renewableEnergy && (
        <Card>
          <CardHeader title={s.reTitle} description={s.reDesc} icon={Zap} />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-5">
            <Metric label={s.installed} value={f.number(renewableEnergy.installedCapacityMW)} unit="MW" />
            <Metric label={s.generation} value={f.number(renewableEnergy.generationMWh)} unit="MWh" />
            <Metric label={s.rePercent} value={f.percent(renewableEnergy.renewablePercentOfTotal)} />
            <Metric label={regional.recs} value={f.number(renewableEnergy.recsIssued)} />
            <Metric label={s.avoidance} value={f.number(renewableEnergy.carbonAvoidanceTCO2e)} unit="tCO₂e" accent />
          </div>
          <div className="mt-6 pt-4 border-t border-line flex flex-wrap gap-2">
            <Badge>{s.solar} · <span className="tabular">{f.number(renewableEnergy.breakdown.solar)} MW</span></Badge>
            <Badge>{s.wind} · <span className="tabular">{f.number(renewableEnergy.breakdown.wind)} MW</span></Badge>
            <Badge>{s.hydro} · <span className="tabular">{f.number(renewableEnergy.breakdown.hydro)} MW</span></Badge>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader title={s.trendTitle} description={s.trendDesc} />
          {ghgTrends.length === 0 ? (
            <EmptyState icon={TrendingDown} title={s.noTrend} description={s.noTrendDesc} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ghgTrends} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={tick} />
                <YAxis axisLine={false} tickLine={false} tick={tick} tickFormatter={v => f.compact(Number(v))} />
                <Tooltip {...chartTheme.tooltip} formatter={(v: number) => f.number(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="scope1" stroke={chartTheme.series[0]} strokeWidth={2} name={s.scope1} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="scope2" stroke={chartTheme.series[2]} strokeWidth={2} name={s.scope2} dot={{ r: 3 }} />
                {progress && (
                  <ReferenceLine y={progress.scope1Target} stroke={chartTheme.series[1]} strokeDasharray="4 4" label={{ value: s.target2030, fill: chartTheme.axis, fontSize: 12, position: 'insideTopRight' }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader title={s.intensityTitle} description={regional.intensityDesc} />
          {ghgTrends.length === 0 ? (
            <EmptyState icon={TrendingDown} title={s.noTrend} description={s.noTrendDesc} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis type="number" dataKey="year" name={s.year} domain={['dataMin', 'dataMax']} allowDecimals={false} axisLine={false} tickLine={false} tick={tick} />
                <YAxis type="number" dataKey="intensity" name={s.intensity} axisLine={false} tickLine={false} tick={tick} tickFormatter={v => Number(v).toFixed(2)} domain={['auto', 'auto']} label={{ value: regional.intensityUnit, angle: -90, position: 'insideLeft', fill: chartTheme.axis, fontSize: 12 }} />
                <Tooltip {...chartTheme.tooltip} cursor={{ strokeDasharray: '3 3', stroke: chartTheme.grid }} />
                <Scatter name={s.intensity} data={ghgTrends.map(d => ({ ...d, year: Number(d.year) }))} fill={chartTheme.series[1]} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Methodology & ZK proofs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader title={s.methodologyTitle} description={s.methodologyDesc} icon={FileText} />
          <div className="space-y-3">
            {evidenceItems.map(e => (
              <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-line p-4 hover:bg-zinc-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{e.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 break-all">{fmt(s.evidence, { id: e.id, file: e.file })}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate('/evidence')}>{s.viewEvidence}</Button>
              </div>
            ))}
            <div className="rounded-xl border border-line p-4">
              <p className="text-sm font-medium text-zinc-900">{s.method3}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{fmt(s.method3Desc, { value: f.number(grid.value, { maximumFractionDigits: 4 }), unit: grid.unit, source: gridSource })}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200/70 px-4 py-3 text-[13px] font-medium text-amber-800">
              <History className="w-4 h-4 shrink-0" />
              {fmt(s.methodUpdated, { date: f.date('2024-10-15') })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={s.zkTitle} description={s.zkDesc} icon={CheckCircle2} />
          <div className="space-y-3">
            {proofs.map(p => (
              <div key={p} className="flex items-center gap-3 rounded-xl border border-line p-4 hover:bg-zinc-50 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 tabular">{p}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.verified}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate('/verify')}>{s.viewProof}</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-zinc-500 mb-1">{label}</p>
      <p className={accent ? 'text-xl font-semibold text-emerald-600 tabular' : 'text-xl font-semibold text-zinc-900 tabular'}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span>}
      </p>
    </div>
  )
}
