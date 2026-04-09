import { useState, useMemo } from 'react'
import {
  Flame,
  Zap,
  TrendingDown,
  Factory,
  TrendingUp,
  Clock,
  CheckCircle2,
  Upload,
  ChevronDown,
  ArrowUpRight,
  Activity,
  Target,
  Globe,
  BarChart3,
  Wifi,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import {
  kpiSummary as mockKpi,
  facilities as mockFacilities,
  emissionsHistory as mockHistory,
  formatEmissions,
} from '../data/pttgcData'
import { Card, MetricCard, ProgressRing } from '../design-system'
import { dashboard, type DashboardData } from '../lib/api'
import { useApi } from '../lib/useApi'

/* ── Mock fallback data ── */
const MOCK_DASHBOARD: DashboardData = {
  kpi: {
    totalEmissions: mockKpi.totalEmissions,
    scope1: mockKpi.scope1,
    scope2: mockKpi.scope2,
    scope3: mockKpi.scope3,
    facilityCount: mockKpi.facilitiesCount,
    yoyChange: mockKpi.yoyChange,
    intensity: mockKpi.intensity,
    dataPointsVerified: mockKpi.dataPointsVerified,
  },
  scopeBreakdown: [
    { name: 'Scope 1', value: mockKpi.scope1 },
    { name: 'Scope 2', value: mockKpi.scope2 },
    { name: 'Scope 3', value: mockKpi.scope3 },
  ],
  monthlyTrend: mockHistory.map(h => ({ month: String(h.year), scope1: h.scope1, scope2: h.scope2, scope3: h.scope3 })),
  recentActivity: [],
  facilityPerformance: mockFacilities.map(f => ({
    name: f.name, scope1: f.scope1, scope2: f.scope2, scope3: f.scope3,
    total: f.total, intensity: f.intensity, yoyChange: f.yoyChange,
  })),
}

const questionnaireStatus = [
  { name: 'Map Ta Phut Olefins', completion: 85, total: 24, done: 20 },
  { name: 'Map Ta Phut Aromatics', completion: 72, total: 18, done: 13 },
  { name: 'Rayong Refinery', completion: 60, total: 20, done: 12 },
  { name: 'Thai Polyethylene', completion: 100, total: 16, done: 16 },
  { name: 'GC Glycol', completion: 45, total: 22, done: 10 },
  { name: 'ENVICCO', completion: 92, total: 12, done: 11 },
]

const frameworkCoverage = [
  { name: 'GHG Protocol', completion: 78, color: '#0F7B6F' },
  { name: 'GRI 305', completion: 65, color: '#2563EB' },
  { name: 'CSRD / ESRS E1', completion: 52, color: '#7C3AED' },
  { name: 'ISSB / IFRS S2', completion: 48, color: '#D97706' },
  { name: 'TCFD', completion: 71, color: '#0F7B6F' },
]

const periods = ['Q1 2026', 'Q4 2025', 'Q3 2025', 'Q2 2025']

/* ── Custom tooltip ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-inverse)] text-white rounded-lg px-4 py-3 text-[12px] shadow-xl border border-white/10">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.stroke || p.color }} />
          <span className="text-white/60">{p.dataKey === 'scope1' ? 'Scope 1' : p.dataKey === 'scope2' ? 'Scope 2' : p.dataKey === 'scope3' ? 'Scope 3' : 'Target'}:</span>
          <span className="font-semibold tabular-nums ml-auto">{formatEmissions(p.value)}t</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [period, setPeriod] = useState('Q1 2026')
  const { data: db, isLive } = useApi(() => dashboard.get(), MOCK_DASHBOARD)
  const kpiSummary = db.kpi

  // Derive display data from API response
  const scopePieData = useMemo(() => {
    const total = kpiSummary.totalEmissions || 1
    return [
      { name: 'Scope 1', short: 'S1', value: kpiSummary.scope1, color: '#0F7B6F', pct: Math.round((kpiSummary.scope1 / total) * 100) },
      { name: 'Scope 2', short: 'S2', value: kpiSummary.scope2, color: '#2563EB', pct: Math.round((kpiSummary.scope2 / total) * 100) },
      { name: 'Scope 3', short: 'S3', value: kpiSummary.scope3, color: '#7C3AED', pct: Math.round((kpiSummary.scope3 / total) * 100) },
    ]
  }, [kpiSummary])

  const monthlyTrend = useMemo(() => db.monthlyTrend.length > 0 ? db.monthlyTrend : mockHistory.map(h => ({
    month: String(h.year), scope1: h.scope1, scope2: h.scope2, scope3: h.scope3,
  })), [db.monthlyTrend])

  const facilities = useMemo(() => {
    if (db.facilityPerformance.length > 0) return db.facilityPerformance.map((f, i) => ({
      id: String(i), name: f.name, location: 'Rayong, TH', type: 'facility',
      scope1: f.scope1, scope2: f.scope2, scope3: f.scope3,
      total: f.total, intensity: f.intensity, yoyChange: f.yoyChange,
    }))
    return mockFacilities
  }, [db.facilityPerformance])

  const topSources = useMemo(() =>
    facilities
      .map(f => ({ name: f.name, total: f.total, scope1: f.scope1, type: f.type, yoy: f.yoyChange }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    [facilities])

  const recentActivity = useMemo(() => {
    if (db.recentActivity.length > 0) return db.recentActivity.map(a => ({
      action: a.action, user: a.user_name || 'System', detail: `${a.resource_type} record`,
      time: new Date(a.created_at).toLocaleDateString(), icon: a.action === 'approved' ? CheckCircle2 : Upload,
      color: a.action === 'approved' ? 'var(--accent-green)' : 'var(--accent-blue)',
    }))
    return [
      { action: 'submitted', user: 'Sarah Chen', detail: 'Stationary combustion — Q1 2026', time: '2h', icon: Upload, color: 'var(--accent-blue)' },
      { action: 'approved', user: 'Tom Harris', detail: '12 Scope 2 electricity entries', time: '4h', icon: CheckCircle2, color: 'var(--accent-green)' },
      { action: 'submitted', user: 'Alex Rivera', detail: 'Fleet diesel — 287.4 tCO₂e', time: '6h', icon: Upload, color: 'var(--accent-blue)' },
      { action: 'approved', user: 'Jane Mitchell', detail: 'ENVICCO recycling verified', time: '1d', icon: CheckCircle2, color: 'var(--accent-green)' },
      { action: 'submitted', user: 'Sarah Chen', detail: 'Grid electricity — 312 tCO₂e', time: '1d', icon: Upload, color: 'var(--accent-blue)' },
    ]
  }, [db.recentActivity])

  const baseEmissions = mockHistory[0]?.total ?? 23500000
  const currentEmissions = kpiSummary.totalEmissions * 4 // annualized from Q1
  const targetEmissions = 10575000
  const reductionNeeded = baseEmissions - targetEmissions
  const reductionAchieved = baseEmissions - currentEmissions
  const targetProgress = Math.round(Math.max(0, Math.min(100, (reductionAchieved / reductionNeeded) * 100)))

  return (
    <div className="space-y-7">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">
            Executive Overview
          </h2>
          <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1 flex items-center gap-2">
            Real-time emissions performance across {kpiSummary.facilityCount} facilities
            {isLive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-green)] bg-[var(--accent-green-light)] px-2 py-0.5 rounded-full">
                <Wifi className="w-3 h-3" /> Live
              </span>
            )}
          </p>
        </div>
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] font-medium text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1 shadow-xs transition-all hover:border-[var(--border-strong)]"
          >
            {periods.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total CO₂e"
          value={formatEmissions(kpiSummary.totalEmissions)}
          trend={{ value: kpiSummary.yoyChange, label: 'vs Q1 2025' }}
          icon={<Flame className="w-[18px] h-[18px]" />}
          accentColor="var(--accent-teal)"
          className="animate-fade-in stagger-1"
        />
        <MetricCard
          label="Scope 1 — Direct"
          value={formatEmissions(kpiSummary.scope1)}
          trend={{ value: -1.8, label: 'YoY' }}
          icon={<Activity className="w-[18px] h-[18px]" />}
          accentColor="#0F7B6F"
          className="animate-fade-in stagger-2"
        />
        <MetricCard
          label="Scope 2 — Indirect"
          value={formatEmissions(kpiSummary.scope2)}
          trend={{ value: -3.1, label: 'YoY' }}
          icon={<Zap className="w-[18px] h-[18px]" />}
          accentColor="#2563EB"
          className="animate-fade-in stagger-3"
        />
        <MetricCard
          label="Emissions Intensity"
          value={kpiSummary.intensity.toFixed(2)}
          trend={{ value: -2.3, label: 'tCO₂e / t product' }}
          icon={<TrendingDown className="w-[18px] h-[18px]" />}
          accentColor="#7C3AED"
          className="animate-fade-in stagger-4"
        />
      </div>

      {/* ── Chart + Scope Pie ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Emissions trend — 2 cols */}
        <Card className="xl:col-span-2 animate-fade-in stagger-2" padding="lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
                Emissions Trend
              </h3>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Scope 1 + 2 + 3 with SBTi target pathway</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              {[
                { label: 'Scope 1', color: '#0F7B6F' },
                { label: 'Scope 2', color: '#2563EB' },
                { label: 'Scope 3', color: '#7C3AED' },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                  <span className="w-[10px] h-[3px] rounded-full" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                <span className="w-[10px] border-t border-dashed border-[var(--text-tertiary)]" />
                Target
              </span>
            </div>
          </div>
          <div className="h-[300px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gS1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F7B6F" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0F7B6F" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gS2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gS3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9A9990' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9A9990' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} width={40} />
                <RechartsTooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="scope3" fill="url(#gS3)" stroke="#7C3AED" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="scope2" fill="url(#gS2)" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="scope1" fill="url(#gS1)" stroke="#0F7B6F" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Scope breakdown */}
        <Card className="animate-fade-in stagger-3" padding="lg">
          <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-6">
            Scope Breakdown
          </h3>
          <div className="flex justify-center mb-6">
            <div className="relative w-[160px] h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scopePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    dataKey="value"
                    strokeWidth={0}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {scopePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[22px] font-bold text-[var(--text-primary)] tabular-nums leading-none">
                  {formatEmissions(kpiSummary.totalEmissions)}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">tCO₂e total</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {scopePieData.map((s) => (
              <div key={s.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{s.name}</span>
                    <span className="text-[13px] font-bold text-[var(--text-primary)] tabular-nums">{formatEmissions(s.value)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex-1 mr-3 h-[3px] bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums w-8 text-right">{s.pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Target + Frameworks + Questionnaires ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Target progress */}
        <Card className="lg:col-span-3 animate-fade-in stagger-1" padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-4 h-4 text-[var(--accent-teal)]" />
            <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
              SBTi 2030 Target
            </h3>
          </div>
          <div className="flex justify-center">
            <ProgressRing value={targetProgress} size={150} strokeWidth={10} />
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-tertiary)]">Reduced</span>
              <span className="font-semibold text-[var(--accent-green)] tabular-nums">{formatEmissions(reductionAchieved)}t</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-tertiary)]">Remaining</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">{formatEmissions(reductionNeeded - reductionAchieved)}t</span>
            </div>
            <div className="flex items-center justify-between text-[12px] pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)]">Base year</span>
              <span className="font-medium text-[var(--text-secondary)]">2019</span>
            </div>
          </div>
        </Card>

        {/* Framework coverage */}
        <Card className="lg:col-span-4 animate-fade-in stagger-2" padding="lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--accent-blue)]" />
              <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
                Framework Coverage
              </h3>
            </div>
            <button className="text-[11px] text-[var(--text-link)] font-medium hover:underline cursor-pointer flex items-center gap-0.5">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-4">
            {frameworkCoverage.map((fw) => (
              <div key={fw.name} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{fw.name}</span>
                  <span className="text-[13px] font-bold text-[var(--text-primary)] tabular-nums">{fw.completion}%</span>
                </div>
                <div className="w-full h-[6px] bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-[var(--ease-out-expo)]"
                    style={{ width: `${fw.completion}%`, backgroundColor: fw.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Questionnaire status */}
        <Card className="lg:col-span-5 animate-fade-in stagger-3" padding="lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--accent-purple)]" />
              <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
                Questionnaire Status
              </h3>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full tabular-nums">
              {questionnaireStatus.reduce((s, q) => s + q.done, 0)} / {questionnaireStatus.reduce((s, q) => s + q.total, 0)} complete
            </span>
          </div>
          <div className="space-y-3">
            {questionnaireStatus.map((q) => {
              const barColor = q.completion === 100 ? '#16A34A' : q.completion >= 70 ? '#0F7B6F' : q.completion >= 50 ? '#D97706' : '#DC2626'
              return (
                <div key={q.name} className="group flex items-center gap-3">
                  <span className="text-[12px] text-[var(--text-secondary)] w-[140px] truncate flex-shrink-0 group-hover:text-[var(--text-primary)] transition-colors">{q.name}</span>
                  <div className="flex-1 h-[6px] bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${q.completion}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums w-8 text-right" style={{ color: barColor }}>
                    {q.completion}%
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* ── Top Sources + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top sources */}
        <Card className="animate-fade-in stagger-1" padding="lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
              Top Emission Sources
            </h3>
            <button className="text-[11px] text-[var(--text-link)] font-medium hover:underline cursor-pointer flex items-center gap-0.5">
              All facilities <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {topSources.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-hover)] transition-all group cursor-pointer"
              >
                <span className="w-6 h-6 rounded-md bg-[var(--bg-tertiary)] flex items-center justify-center text-[11px] font-bold text-[var(--text-tertiary)] group-hover:bg-[var(--accent-teal)] group-hover:text-white transition-all flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{s.name}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded flex-shrink-0 uppercase tracking-wide">{s.type}</span>
                  </div>
                  {/* Proportion bar */}
                  <div className="mt-1.5 h-[3px] bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--accent-teal)]" style={{ width: `${(s.total / topSources[0].total) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0 pl-3">
                  <span className="text-[13px] font-bold text-[var(--text-primary)] tabular-nums block">{formatEmissions(s.total)}</span>
                  <span className={`text-[10px] font-semibold tabular-nums ${s.yoy < 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                    {s.yoy > 0 ? '+' : ''}{s.yoy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="animate-fade-in stagger-2" padding="lg">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
              Recent Activity
            </h3>
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide font-semibold animate-pulse-soft">
              Live
            </span>
          </div>
          <div className="space-y-1">
            {recentActivity.map((a, i) => {
              const Icon = a.icon
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--bg-hover)] transition-all group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: a.color === 'var(--accent-green)' ? 'var(--accent-green-light)' : 'var(--accent-blue-light)',
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: a.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--text-primary)] leading-snug">
                      <span className="font-semibold">{a.user}</span>{' '}
                      <span className="text-[var(--text-secondary)]">{a.action}</span>
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">{a.detail}</p>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 flex items-center gap-1 pt-0.5 tabular-nums">
                    <Clock className="w-3 h-3" />
                    {a.time}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* ── Facility Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
            Facility Performance
          </h3>
          <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{kpiSummary.facilityCount} facilities</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {facilities.map((f, i) => (
            <Card key={f.id} hover padding="md" className={`animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center">
                  <Factory className="w-4 h-4 text-[var(--text-tertiary)]" />
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                  f.yoyChange < 0
                    ? 'bg-[var(--accent-green-light)] text-[var(--accent-green)]'
                    : 'bg-[var(--accent-red-light)] text-[var(--accent-red)]'
                }`}>
                  {f.yoyChange < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
                  {f.yoyChange > 0 ? '+' : ''}{f.yoyChange}%
                </span>
              </div>
              <h4 className="font-display text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
                {f.name}
              </h4>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{f.location}</p>
              <span className="inline-block mt-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                {f.type}
              </span>
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Total</p>
                  <p className="text-[14px] font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                    {formatEmissions(f.total)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Intensity</p>
                  <p className="text-[14px] font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                    {f.intensity.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
