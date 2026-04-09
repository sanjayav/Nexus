import { useState, useMemo } from 'react'
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  FileText,
  Shield,
  Info,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Activity,
  Eye,
  Clock,
  BarChart3,
  Zap,
  Factory,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import {
  anomalies,
  extractedHistoricalData,
  quarterly2026,
  yoyComparison,
  emissionsHistory,
  facilities,
  kpiSummary,
  formatNumber,
  formatEmissions,
} from '../data/pttgcData'
import { Card, Badge, Tabs } from '../design-system'

/* ═══════════════════════════════════════════
   Scope colors — consistent across the app
   ═══════════════════════════════════════════ */
const SCOPE_COLORS = {
  scope1: '#0F7B6F',
  scope2: '#2563EB',
  scope3: '#7C3AED',
}

/* ═══════════════════════════════════════════
   Custom Recharts tooltip
   ═══════════════════════════════════════════ */
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-lg px-4 py-3">
      <p className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[var(--text-xs)]">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--text-secondary)]">{p.name}:</span>
          <span className="font-semibold text-[var(--text-primary)] tabular-nums">
            {typeof p.value === 'number' ? formatEmissions(p.value) + ' tCO₂e' : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Severity config
   ═══════════════════════════════════════════ */
const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'red' as const, icon: AlertOctagon },
  warning: { label: 'Warning', color: 'amber' as const, icon: AlertTriangle },
}

type StatusFilter = 'all' | 'critical' | 'warning' | 'resolved'

/* ═══════════════════════════════════════════
   YoY cell helper
   ═══════════════════════════════════════════ */
function YoYCell({ value }: { value: number }) {
  const isNeg = value < 0
  const isAnom = Math.abs(value) > 10
  const color = isAnom
    ? isNeg ? 'text-[var(--accent-amber)]' : 'text-[var(--accent-red)]'
    : isNeg ? 'text-[var(--accent-teal)]' : 'text-[var(--text-secondary)]'
  return (
    <span className={`font-mono font-medium ${color} ${isAnom ? 'font-bold' : ''}`}>
      {isNeg ? '' : '+'}{value.toFixed(1)}%
      {isAnom && <AlertTriangle className="w-2.5 h-2.5 inline ml-0.5" />}
    </span>
  )
}

/* ═══════════════════════════════════════════
   Tabs config
   ═══════════════════════════════════════════ */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'anomalies', label: 'Anomalies' },
  { id: 'yoy', label: 'Year-over-Year' },
]

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */
export default function AnomalyDetection() {
  const [tab, setTab] = useState('overview')
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null)
  const [resolvedAnomalies, setResolvedAnomalies] = useState<Set<string>>(new Set())
  const [acknowledgedAnomalies, setAcknowledgedAnomalies] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedScope, setSelectedScope] = useState<'all' | 'scope1' | 'scope2' | 'scope3'>('all')

  /* Trend data */
  const trendData = useMemo(() =>
    emissionsHistory.map(h => ({
      year: h.year.toString(),
      scope1: h.scope1,
      scope2: h.scope2,
      scope3: h.scope3,
      total: h.total,
      target: h.target,
      isProjection: h.year === 2026,
    })),
  [])

  /* YoY calculated changes */
  const yoyChanges = useMemo(() => {
    const hist = extractedHistoricalData
    const changes = []
    for (let i = 1; i < hist.length; i++) {
      const prev = hist[i - 1], curr = hist[i]
      changes.push({
        period: `${prev.year} → ${curr.year}`,
        year: curr.year,
        scope1: ((curr.scope1 - prev.scope1) / prev.scope1) * 100,
        scope2: ((curr.scope2 - prev.scope2) / prev.scope2) * 100,
        scope3: ((curr.scope3 - prev.scope3) / prev.scope3) * 100,
        total: ((curr.total - prev.total) / prev.total) * 100,
      })
    }
    return changes
  }, [])

  /* Scope breakdown for pie chart */
  const scopePieData = [
    { name: 'Scope 1', value: kpiSummary.scope1, fill: SCOPE_COLORS.scope1 },
    { name: 'Scope 2', value: kpiSummary.scope2, fill: SCOPE_COLORS.scope2 },
    { name: 'Scope 3', value: kpiSummary.scope3, fill: SCOPE_COLORS.scope3 },
  ]

  /* Filtered anomalies */
  const filteredAnomalies = useMemo(() =>
    anomalies.filter(a => {
      if (statusFilter === 'resolved') return resolvedAnomalies.has(a.id)
      if (statusFilter === 'critical' && a.severity !== 'critical') return false
      if (statusFilter === 'warning' && a.severity !== 'warning') return false
      if (selectedScope !== 'all') {
        const s = selectedScope.replace('scope', 'Scope ')
        if (!a.metric.toLowerCase().includes(s.toLowerCase())) return false
      }
      return true
    }),
  [statusFilter, selectedScope, resolvedAnomalies])

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length
  const warningCount = anomalies.filter(a => a.severity === 'warning').length
  const resolvedCount = resolvedAnomalies.size

  const handleResolve = (id: string) => {
    setResolvedAnomalies(prev => new Set(prev).add(id))
    setExpandedAnomaly(null)
  }
  const handleAcknowledge = (id: string) => {
    setAcknowledgedAnomalies(prev => new Set(prev).add(id))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">Analytics</h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">
            AI-powered anomaly detection comparing FY 2026 data against 7 years of historical baselines (2019-2025).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal">FY 2026</Badge>
          <Badge variant="gray">Baseline: 2019-2025</Badge>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Anomalies', value: anomalies.length.toString(), sub: 'detected this period', icon: Zap, accent: 'var(--accent-amber)' },
          { label: 'Critical', value: criticalCount.toString(), sub: 'require immediate action', icon: AlertOctagon, accent: 'var(--accent-red)' },
          { label: 'Warnings', value: warningCount.toString(), sub: 'need investigation', icon: AlertTriangle, accent: 'var(--accent-amber)' },
          { label: 'Resolved', value: resolvedCount.toString(), sub: 'documented & closed', icon: CheckCircle2, accent: 'var(--accent-teal)' },
          { label: 'Data Coverage', value: 'Q1', sub: 'of FY 2026 submitted', icon: Activity, accent: 'var(--accent-blue)' },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} padding="sm">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">{kpi.label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: kpi.accent }} />
                </div>
              </div>
              <p className="text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tabular-nums">{kpi.value}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{kpi.sub}</p>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      {/* ─── OVERVIEW TAB ─── */}
      {tab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Charts row */}
          <div className="grid grid-cols-3 gap-5">
            {/* Historical Emissions Bar Chart */}
            <div className="col-span-2">
              <Card padding="md">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Historical Emissions Baseline</h2>
                    <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">2019-2026 (2026 = Q1 annualized). SBTi target in dashed gold.</p>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={{ stroke: 'var(--border-subtle)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="scope1" stackId="a" fill={SCOPE_COLORS.scope1} name="Scope 1">
                        {trendData.map((e, i) => <Cell key={i} fill={e.isProjection ? SCOPE_COLORS.scope1 + '80' : SCOPE_COLORS.scope1} />)}
                      </Bar>
                      <Bar dataKey="scope2" stackId="a" fill={SCOPE_COLORS.scope2} name="Scope 2">
                        {trendData.map((e, i) => <Cell key={i} fill={e.isProjection ? SCOPE_COLORS.scope2 + '80' : SCOPE_COLORS.scope2} />)}
                      </Bar>
                      <Bar dataKey="scope3" stackId="a" fill={SCOPE_COLORS.scope3} name="Scope 3" radius={[4, 4, 0, 0]}>
                        {trendData.map((e, i) => <Cell key={i} fill={e.isProjection ? SCOPE_COLORS.scope3 + '80' : SCOPE_COLORS.scope3} />)}
                      </Bar>
                      <Line type="monotone" dataKey="target" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 3" dot={false} name="SBTi Target" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-5 mt-3 text-[var(--text-xs)] text-[var(--text-tertiary)] justify-center">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: SCOPE_COLORS.scope1 }} /> Scope 1</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: SCOPE_COLORS.scope2 }} /> Scope 2</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: SCOPE_COLORS.scope3 }} /> Scope 3</span>
                  <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 rounded" style={{ background: '#F59E0B', borderTop: '1px dashed #F59E0B' }} /> SBTi Target</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[var(--bg-tertiary)] opacity-50" /> Projected</span>
                </div>
              </Card>
            </div>

            {/* Scope Breakdown Pie */}
            <Card padding="md">
              <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mb-1">Q1 2026 Scope Split</h2>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-4">{formatEmissions(kpiSummary.totalEmissions)} tCO₂e total</p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scopePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {scopePieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {scopePieData.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-[var(--text-xs)]">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.fill }} />
                      <span className="text-[var(--text-secondary)]">{s.name}</span>
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">{formatEmissions(s.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Facility Performance Table */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-[var(--accent-teal)]" />
                <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Facility Performance</h2>
              </div>
              <Badge variant="gray">{facilities.length} facilities</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--text-xs)]">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Facility</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Scope 1</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Scope 2</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Scope 3</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Total</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Intensity</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map((f, i) => (
                    <tr key={f.id} className={`${i % 2 === 0 ? 'bg-[var(--bg-secondary)]' : ''} hover:bg-[var(--bg-hover)] transition-colors`}>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-[var(--text-primary)]">{f.name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">{f.location}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--text-secondary)]">{formatNumber(f.scope1)}</td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--text-secondary)]">{formatNumber(f.scope2)}</td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--text-secondary)]">{formatNumber(f.scope3)}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-[var(--text-primary)]">{formatNumber(f.total)}</td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--text-secondary)]">{f.intensity.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold ${f.yoyChange < 0 ? 'text-[var(--accent-teal)]' : 'text-[var(--accent-red)]'}`}>
                          {f.yoyChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          {f.yoyChange > 0 ? '+' : ''}{f.yoyChange}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Quarterly Progress */}
          <Card padding="md">
            <h2 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-4">FY 2026 Quarterly Progress</h2>
            <div className="grid grid-cols-4 gap-4">
              {quarterly2026.map(q => (
                <div
                  key={q.quarter}
                  className={`rounded-xl p-4 border ${q.status === 'submitted'
                    ? 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
                    : 'border-dashed border-[var(--border-subtle)] bg-[var(--bg-primary)]'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)]">{q.quarter}</span>
                    <Badge variant={q.status === 'submitted' ? 'blue' : 'gray'} dot>{q.status === 'submitted' ? 'Submitted' : 'Pending'}</Badge>
                  </div>
                  {q.total > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[var(--text-tertiary)]">S1</span>
                        <span className="text-[var(--text-secondary)] font-mono">{formatEmissions(q.scope1)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[var(--text-tertiary)]">S2</span>
                        <span className="text-[var(--text-secondary)] font-mono">{formatEmissions(q.scope2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[var(--text-tertiary)]">S3</span>
                        <span className="text-[var(--text-secondary)] font-mono">{formatEmissions(q.scope3)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] border-t border-[var(--border-subtle)] pt-1.5 mt-1.5">
                        <span className="text-[var(--text-secondary)] font-semibold">Total</span>
                        <span className="text-[var(--text-primary)] font-mono font-semibold">{formatEmissions(q.total)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[var(--text-tertiary)] text-center py-4">Awaiting data</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ─── ANOMALIES TAB ─── */}
      {tab === 'anomalies' && (
        <div className="space-y-5 animate-fade-in">
          {/* Filter bar */}
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--accent-amber)]" />
                <h2 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">AI-Detected Anomalies</h2>
                <Badge variant="red">{anomalies.length - resolvedCount} open</Badge>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedScope}
                  onChange={e => setSelectedScope(e.target.value as typeof selectedScope)}
                  className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-[var(--text-xs)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/30 cursor-pointer"
                >
                  <option value="all">All Scopes</option>
                  <option value="scope1">Scope 1</option>
                  <option value="scope2">Scope 2</option>
                  <option value="scope3">Scope 3</option>
                </select>
                <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
                  {([
                    { id: 'all', label: 'All' },
                    { id: 'critical', label: 'Critical' },
                    { id: 'warning', label: 'Warning' },
                    { id: 'resolved', label: 'Resolved' },
                  ] as { id: StatusFilter; label: string }[]).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-1.5 text-[var(--text-xs)] font-medium transition-colors cursor-pointer ${
                        statusFilter === f.id
                          ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Anomaly list */}
          {filteredAnomalies.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-[var(--accent-teal)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
                  {statusFilter === 'resolved' ? 'No resolved anomalies yet.' : 'No anomalies match the current filter.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAnomalies.map(anomaly => {
                const isResolved = resolvedAnomalies.has(anomaly.id)
                const isAcknowledged = acknowledgedAnomalies.has(anomaly.id)
                const isExpanded = expandedAnomaly === anomaly.id
                const sev = SEVERITY_CONFIG[anomaly.severity]
                const SevIcon = sev.icon

                return (
                  <div
                    key={anomaly.id}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isResolved
                        ? 'border-[var(--accent-teal)]/20 opacity-70'
                        : `border-[var(--accent-${sev.color})]/30`
                    }`}
                    style={{ borderColor: isResolved ? 'var(--accent-teal)' : `var(--accent-${sev.color})`, borderLeftWidth: 3 }}
                  >
                    {/* Header */}
                    <button
                      onClick={() => setExpandedAnomaly(isExpanded ? null : anomaly.id)}
                      className="w-full text-left p-5 flex items-start gap-4 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer bg-[var(--bg-primary)]"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isResolved
                            ? 'color-mix(in srgb, var(--accent-teal) 12%, transparent)'
                            : `color-mix(in srgb, var(--accent-${sev.color}) 12%, transparent)`,
                        }}
                      >
                        {isResolved
                          ? <CheckCircle2 className="w-5 h-5 text-[var(--accent-teal)]" />
                          : <SevIcon className="w-5 h-5" style={{ color: `var(--accent-${sev.color})` }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{anomaly.title}</h3>
                          {isResolved
                            ? <Badge variant="teal">Resolved</Badge>
                            : <Badge variant={sev.color}>{sev.label}</Badge>}
                          {isAcknowledged && !isResolved && <Badge variant="blue">Acknowledged</Badge>}
                        </div>
                        <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1 line-clamp-1">{anomaly.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-tertiary)]">
                          <span>{anomaly.metric}</span>
                          <span className="text-[var(--border-default)]">|</span>
                          <span>{anomaly.year}</span>
                          <span className="text-[var(--border-default)]">|</span>
                          <span>{anomaly.facility}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 pt-1">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 space-y-4">
                        {/* Key metrics */}
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { label: 'Metric', value: anomaly.metric, icon: BarChart3 },
                            { label: 'Period', value: anomaly.year, icon: Clock },
                            { label: 'Expected', value: anomaly.expectedValue, icon: TrendingDown },
                            { label: 'Actual', value: anomaly.actualValue, icon: TrendingUp },
                          ].map(item => {
                            const ItemIcon = item.icon
                            return (
                              <div key={item.label} className="bg-[var(--bg-primary)] rounded-xl p-3 border border-[var(--border-subtle)]">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <ItemIcon className="w-3 h-3 text-[var(--text-tertiary)]" />
                                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{item.label}</p>
                                </div>
                                <p className="text-[var(--text-xs)] font-semibold text-[var(--text-secondary)]">{item.value}</p>
                              </div>
                            )
                          })}
                        </div>

                        {/* Full description */}
                        <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-4">
                          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">{anomaly.description}</p>
                        </div>

                        {/* AI recommendation */}
                        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-blue) 6%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-blue) 20%, transparent)' }}>
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-[var(--accent-blue)] flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[var(--text-xs)] font-semibold text-[var(--accent-blue)] mb-1">AI Analysis & Recommendation</p>
                              <p className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed">{anomaly.recommendation}</p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {!isResolved && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleResolve(anomaly.id)}
                              className="flex items-center gap-2 px-4 py-2 text-[var(--text-xs)] font-semibold rounded-lg transition-colors cursor-pointer"
                              style={{ backgroundColor: 'color-mix(in srgb, var(--accent-teal) 12%, transparent)', color: 'var(--accent-teal)' }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Resolved
                            </button>
                            {!isAcknowledged && (
                              <button
                                onClick={() => handleAcknowledge(anomaly.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[var(--text-xs)] font-medium rounded-lg border border-[var(--border-default)] transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Acknowledge
                              </button>
                            )}
                            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[var(--text-xs)] font-medium rounded-lg border border-[var(--border-default)] transition-colors cursor-pointer">
                              <ArrowRight className="w-3.5 h-3.5" /> Send to Workflow
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Detection Methodology */}
          <Card padding="md">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[var(--accent-teal)] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-1">How Anomalies Are Detected</h3>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {[
                    { title: 'Statistical Deviation', desc: 'Values exceeding 2σ from the trailing 5-year mean are flagged. 3σ outliers trigger critical severity.' },
                    { title: 'Cross-Metric Correlation', desc: 'Production volume is correlated against scope emissions. Inverse movements are flagged.' },
                    { title: 'Methodology Continuity', desc: 'Changes in reporting methodology, emission factors, or scope boundaries without documentation trigger warnings.' },
                  ].map(m => (
                    <div key={m.title} className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed">
                      <p className="font-semibold text-[var(--text-primary)] mb-1">{m.title}</p>
                      <p>{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── YEAR-OVER-YEAR TAB ─── */}
      {tab === 'yoy' && (
        <div className="space-y-6 animate-fade-in">
          {/* Scope Comparison Cards */}
          <div className="grid grid-cols-3 gap-5">
            {Object.entries(yoyComparison).map(([key, data]) => {
              const scopeLabel = key.replace('scope', 'Scope ')
              const color = SCOPE_COLORS[key as keyof typeof SCOPE_COLORS]
              return (
                <Card key={key} padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                      <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">{scopeLabel}</h3>
                    </div>
                    <Badge variant={data.change > 5 ? 'red' : data.change > 0 ? 'amber' : 'teal'}>
                      {data.trend === 'up' ? '+' : ''}{data.change}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-subtle)]">
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">FY 2025</p>
                      <p className="text-[var(--text-base)] font-bold text-[var(--text-primary)] tabular-nums mt-1">{formatEmissions(data['2025'])}</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-subtle)]">
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">2026 Annualized</p>
                      <p className="text-[var(--text-base)] font-bold tabular-nums mt-1" style={{ color }}>{formatEmissions(data['2026_annualized'])}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">{data.note}</p>
                </Card>
              )
            })}
          </div>

          {/* YoY Heatmap Table */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Year-over-Year Changes</h2>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">% change — red flags auto-surfaced as anomalies</p>
              </div>
              <Badge variant="gray">{yoyChanges.length} periods</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--text-xs)]">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Period</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Scope 1</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Scope 2</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Scope 3</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {yoyChanges.map((row, i) => (
                    <tr key={row.period} className={`${i % 2 === 0 ? 'bg-[var(--bg-secondary)]' : ''} hover:bg-[var(--bg-hover)] transition-colors`}>
                      <td className="py-3 px-3 font-mono text-[var(--text-secondary)] font-medium">{row.period}</td>
                      <td className="py-3 px-3 text-right"><YoYCell value={row.scope1} /></td>
                      <td className="py-3 px-3 text-right"><YoYCell value={row.scope2} /></td>
                      <td className="py-3 px-3 text-right"><YoYCell value={row.scope3} /></td>
                      <td className="py-3 px-3 text-right"><YoYCell value={row.total} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Historical Emissions Database */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--accent-teal)]" />
                <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Historical Emissions Database</h2>
              </div>
              <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Source: Sustainability Reports & CDP Responses 2019-2026</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[var(--text-xs)]">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Year</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Scope 1</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Scope 2</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Scope 3</th>
                    <th className="text-right py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Total</th>
                    <th className="text-left py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Source</th>
                    <th className="text-center py-3 px-3 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedHistoricalData.map((row, i) => {
                    const isCurrent = row.year === 2026
                    return (
                      <tr key={row.year} className={`${i % 2 === 0 ? 'bg-[var(--bg-secondary)]' : ''} hover:bg-[var(--bg-hover)] transition-colors ${isCurrent ? 'ring-1 ring-[var(--accent-teal)]/20 rounded' : ''}`}>
                        <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                          {row.year}
                          {isCurrent && <Badge variant="teal" className="ml-2">Q1 Only</Badge>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[var(--text-secondary)]">{formatNumber(row.scope1)}</td>
                        <td className="py-3 px-3 text-right font-mono text-[var(--text-secondary)]">{formatNumber(row.scope2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-[var(--text-secondary)]">{formatNumber(row.scope3)}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-[var(--text-primary)]">{formatNumber(row.total)}</td>
                        <td className="py-3 px-3 text-[var(--text-tertiary)]">{row.source}</td>
                        <td className="py-3 px-3 text-center">
                          {row.verified ? (
                            <span className="inline-flex items-center gap-1 text-[var(--accent-teal)]">
                              <Shield className="w-3.5 h-3.5" />
                              <span className="font-medium">Assured</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[var(--accent-amber)]">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="font-medium">Pending</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
