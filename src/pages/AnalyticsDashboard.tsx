import { useState } from 'react';
import {
  Target, FileCheck, AlertTriangle, TrendingUp, Award, Shield,
  ArrowRight, ArrowUpRight, Zap, Leaf, Droplets, Activity, Layers, ListChecks, FolderOpen, Unlink, CalendarClock,
  Ruler, Sigma, Crosshair,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import { PageHeader, Card, CardHeader, Button, Badge, StatCard, Progress, tableClass, chartTheme, Tone } from '../components/ui';
import { fmt, useFormat, useStrings } from '../i18n';
import { analyticsDashboardStrings } from '../i18n/pages/analyticsDashboard';
import { BenchmarkPanel } from './BenchmarkLab';

type AnalyticsTab = 'compliance' | 'gaps' | 'evidence' | 'kris' | 'performance' | 'benchmark';

const TABS: { id: AnalyticsTab; icon: typeof FileCheck }[] = [
  { id: 'compliance', icon: FileCheck },
  { id: 'gaps', icon: AlertTriangle },
  { id: 'evidence', icon: Shield },
  { id: 'kris', icon: Target },
  { id: 'performance', icon: TrendingUp },
  { id: 'benchmark', icon: Award },
];

const QUICK_LINKS = [
  { key: 'csrd', path: '/dma' },
  { key: 'edci', path: '/carbon' },
  { key: 'targets', path: '/ghg' },
] as const;

const SEVERITY_TONE: Record<string, Tone> = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'neutral' };
const STATUS_TONE: Record<string, Tone> = { 'In Progress': 'info', 'Not Started': 'neutral', Planning: 'warning' };

const axisTick = { fontSize: 12, fill: chartTheme.axis };
const tooltipProps = { contentStyle: chartTheme.tooltip.contentStyle, labelStyle: chartTheme.tooltip.labelStyle, cursor: { fill: 'rgba(0,0,0,0.03)' } };
const legendProps = { iconType: 'circle' as const, iconSize: 8, wrapperStyle: { fontSize: 12, color: '#52525B', paddingTop: 8 } };

const useS = () => useStrings(analyticsDashboardStrings);
const tr = (map: Record<string, string>, v: string) => map[v] ?? v;

export default function AnalyticsDashboard() {
  const s = useS();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('compliance');

  const validationAlerts = [
    { type: 'warning' as const, message: s.alerts.energy },
    { type: 'on_track' as const, message: s.alerts.ghg },
  ];

  return (
    <div>
      <PageHeader title={s.title} description={s.description} />

      <div className="space-y-6">

      {/* Validation alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {validationAlerts.map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 rounded-card border border-line bg-surface shadow-card text-sm text-zinc-700"
          >
            {a.type === 'warning'
              ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
              : <Target className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />}
            <span className="flex-1 min-w-0 leading-relaxed">{a.message}</span>
            <Badge tone={a.type === 'warning' ? 'warning' : 'success'}>{a.type === 'warning' ? s.alerts.review : s.alerts.onTrack}</Badge>
          </div>
        ))}
      </div>

      {/* Tabs (underline style — section navigation) */}
      <div role="tablist" className="flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-line -mx-1 px-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'relative flex items-center gap-2 h-10 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-t-md',
                isActive ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800',
              )}
            >
              <Icon className={clsx('w-4 h-4', isActive ? 'text-zinc-900' : 'text-zinc-400')} />
              {s.tabs[tab.id]}
              {isActive && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-zinc-900" />}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === 'compliance' && <ComplianceView />}
        {activeTab === 'gaps' && <GapAnalysisView />}
        {activeTab === 'evidence' && <EvidenceHealthView />}
        {activeTab === 'kris' && <KRIsView />}
        {activeTab === 'performance' && <PerformanceView />}
        {activeTab === 'benchmark' && <BenchmarkPanel variant="compact" />}
      </div>

      {/* Quick links */}
      <Card>
        <div className="text-[13px] font-medium text-zinc-500 mb-2">{s.quickLinks.title}</div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
          {QUICK_LINKS.map(l => (
            <li key={l.key}>
              <Link to={l.path} className="group flex items-center justify-between gap-3 py-2 border-b border-line md:border-b-0 text-sm text-zinc-700 hover:text-zinc-900">
                <span>{s.quickLinks[l.key]}</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      </div>
    </div>
  );
}

/* ─── COMPLIANCE TAB ─── */
const FRAMEWORK_DATA = [
  { framework: 'GRI', total: 45, complete: 38, coverage: 84 },
  { framework: 'IFRS S1', total: 28, complete: 22, coverage: 79 },
  { framework: 'IFRS S2', total: 32, complete: 28, coverage: 88 },
  { framework: 'MSX', total: 18, complete: 15, coverage: 83 },
  { framework: 'BRSR Core', total: 72, complete: 63, coverage: 88 },
  { framework: 'China ESG', total: 24, complete: 20, coverage: 83 },
];
const TOPIC_COVERAGE = [95, 92, 88, 90, 82, 85, 75];
const BRSR_PCT = [100, 100, 92, 88, 100, 85, 78];

function ComplianceView() {
  const s = useS();
  const f = useFormat();
  const c = s.compliance;
  const topicData = c.topics.map((topic, i) => ({ topic, coverage: TOPIC_COVERAGE[i] }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label={c.overall} value={f.percent(86)} delta={4} deltaLabel={s.common.vsLastPeriod} icon={Layers} />
        <StatCard label={c.complete} value={186} unit="/ 219" deltaLabel={fmt(c.remaining, { count: 33 })} icon={ListChecks} />
        <StatCard label={c.material} value={14} unit="/ 18" deltaLabel={<span className="text-amber-700">{fmt(c.pendingDma, { count: 4 })}</span>} icon={Target} />
        <StatCard label={c.frameworksActive} value={6} deltaLabel={c.frameworksList} icon={FileCheck} />
        <StatCard label={c.brsrCore} value={f.percent(88)} deltaLabel={<Badge tone="success" dot>{c.brsrStatus}</Badge>} icon={Leaf} />
      </div>

      <Card>
        <CardHeader title={c.brsrTitle} description={c.brsrDesc} />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {c.principles.map((label, i) => {
            const pct = BRSR_PCT[i];
            const tone: Tone = pct === 100 ? 'success' : pct >= 85 ? 'warning' : 'danger';
            return (
              <div key={label} className="rounded-xl border border-line p-3">
                <div className="text-[13px] font-medium text-zinc-700 truncate" title={label}>{label}</div>
                <div className="mt-2 text-xl font-semibold text-zinc-900 tabular">{f.percent(pct)}</div>
                <Progress value={pct} tone={tone} className="mt-2" />
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={c.byFramework} />
          <div className={tableClass.wrap}>
            <table className={tableClass.table}>
              <thead>
                <tr>
                  <th className={tableClass.th}>{c.cols.framework}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{c.cols.total}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{c.cols.complete}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{c.cols.coverage}</th>
                  <th className={clsx(tableClass.th, 'w-1/3 min-w-[120px]')}>{c.cols.progress}</th>
                </tr>
              </thead>
              <tbody>
                {FRAMEWORK_DATA.map(row => (
                  <tr key={row.framework} className={tableClass.tr}>
                    <td className={clsx(tableClass.td, 'font-medium text-zinc-900 whitespace-nowrap')}>{row.framework}</td>
                    <td className={clsx(tableClass.td, 'text-right tabular')}>{row.total}</td>
                    <td className={clsx(tableClass.td, 'text-right tabular')}>{row.complete}</td>
                    <td className={clsx(tableClass.td, 'text-right tabular font-medium text-zinc-900')}>{f.percent(row.coverage)}</td>
                    <td className={tableClass.td}><Progress value={row.coverage} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title={c.byTopic} description={c.byTopicDesc} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={chartTheme.grid} />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis type="category" dataKey="topic" axisLine={false} tickLine={false} width={110} tick={{ ...axisTick, fill: '#52525B' }} />
                <Tooltip {...tooltipProps} formatter={(v: number) => [f.percent(v), c.coverageSeries]} />
                <Bar dataKey="coverage" name={c.coverageSeries} radius={[0, 4, 4, 0]} barSize={14}>
                  {topicData.map((entry, i) => <Cell key={i} fill={entry.coverage >= 90 ? chartTheme.series[1] : chartTheme.series[0]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── GAP ANALYSIS TAB ─── */
const FRAMEWORK_GAPS = [
  { framework: 'GRI', required: 100, covered: 86, gap: 14, priority: 'High' },
  { framework: 'MSX', required: 100, covered: 72, gap: 28, priority: 'Critical' },
  { framework: 'IFRS S1', required: 100, covered: 64, gap: 36, priority: 'Critical' },
  { framework: 'IFRS S2', required: 100, covered: 58, gap: 42, priority: 'Critical' },
  { framework: 'BRSR Core', required: 100, covered: 88, gap: 12, priority: 'Medium' },
];
const GAP_TRENDS = [
  { m: 5, gaps: 156, resolved: 23 }, { m: 6, gaps: 142, resolved: 28 },
  { m: 7, gaps: 128, resolved: 35 }, { m: 8, gaps: 115, resolved: 41 },
  { m: 9, gaps: 98, resolved: 49 }, { m: 10, gaps: 84, resolved: 56 },
];
const MATURITY = [
  { current: 85, target: 95 }, { current: 72, target: 90 }, { current: 68, target: 85 },
  { current: 45, target: 80 }, { current: 78, target: 95 }, { current: 82, target: 90 },
];
const ACTION_ITEMS = [
  { framework: 'IFRS S2', priority: 'Critical', dueDate: '2025-12-15', status: 'In Progress' },
  { framework: 'BRSR Core', priority: 'High', dueDate: '2025-12-20', status: 'In Progress' },
  { framework: 'MSX', priority: 'Critical', dueDate: '2025-11-30', status: 'Not Started' },
  { framework: 'BRSR Core', priority: 'Medium', dueDate: '2025-12-25', status: 'Planning' },
  { framework: 'GRI', priority: 'High', dueDate: '2025-12-01', status: 'In Progress' },
];

function GapAnalysisView() {
  const s = useS();
  const f = useFormat();
  const navigate = useNavigate();
  const g = s.gaps;

  const totalGaps = FRAMEWORK_GAPS.reduce((sum, x) => sum + x.gap, 0);
  const avgCoverage = Math.round(FRAMEWORK_GAPS.reduce((sum, x) => sum + x.covered, 0) / FRAMEWORK_GAPS.length);
  const month = (m: number) => f.date(new Date(2025, m, 1), { month: 'short' });
  const trendData = GAP_TRENDS.map(t => ({ ...t, month: month(t.m) }));
  const maturityData = g.maturityAxes.map((subject, i) => ({ subject, ...MATURITY[i] }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={g.total} value={totalGaps} delta={-14} goodWhen="down" deltaLabel={s.common.vsLastMonth} icon={AlertTriangle} />
        <StatCard label={g.avgCoverage} value={f.percent(avgCoverage)} icon={Layers} />
        <StatCard label={g.critical} value={42} deltaLabel={<span className="text-amber-700">{g.criticalNote}</span>} icon={Crosshair} />
        <StatCard label={g.resolved} value={56} delta={14} deltaLabel={s.common.vsLastMonth} icon={ListChecks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={g.vsFramework} />
          <div className="h-72 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FRAMEWORK_GAPS} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="framework" axisLine={false} tickLine={false} tick={axisTick} minTickGap={8} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} width={36} />
                <Tooltip {...tooltipProps} />
                <Legend {...legendProps} />
                <Bar dataKey="covered" fill={chartTheme.series[0]} name={g.covered} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="gap" fill={chartTheme.series[5]} name={g.gaps} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title={g.trend} />
          <div className="h-72 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} width={36} />
                <Tooltip {...tooltipProps} />
                <Legend {...legendProps} />
                <Bar dataKey="gaps" fill="#D4D4D8" name={g.openGaps} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="resolved" fill={chartTheme.series[1]} name={g.resolvedSeries} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={g.maturity} description={g.maturityDesc} />
        <div className="h-80 max-w-xl mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={maturityData} outerRadius="72%">
              <PolarGrid stroke={chartTheme.grid} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#52525B' }} />
              <PolarRadiusAxis tick={{ fontSize: 11, fill: chartTheme.axis }} axisLine={false} angle={90} />
              <Radar name={g.current} dataKey="current" stroke={chartTheme.series[0]} fill={chartTheme.series[0]} fillOpacity={0.12} strokeWidth={1.5} />
              <Radar name={g.target} dataKey="target" stroke={chartTheme.series[1]} fill={chartTheme.series[1]} fillOpacity={0.06} strokeWidth={1.5} strokeDasharray="4 4" />
              <Legend {...legendProps} />
              <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={g.actions}
          action={<Button variant="primary" size="sm" iconRight={ArrowRight} onClick={() => navigate('/analytics/gaps')}>{g.openEngine}</Button>}
          className="flex-col sm:flex-row"
        />
        <div className={tableClass.wrap}>
          <table className={tableClass.table}>
            <thead>
              <tr>
                <th className={tableClass.th}>{g.cols.action}</th>
                <th className={tableClass.th}>{g.cols.framework}</th>
                <th className={tableClass.th}>{g.cols.priority}</th>
                <th className={tableClass.th}>{g.cols.due}</th>
                <th className={tableClass.th}>{g.cols.owner}</th>
                <th className={tableClass.th}>{g.cols.status}</th>
              </tr>
            </thead>
            <tbody>
              {ACTION_ITEMS.map((item, idx) => (
                <tr key={idx} className={tableClass.tr}>
                  <td className={clsx(tableClass.td, 'font-medium text-zinc-900 min-w-[240px]')}>{g.actionTitles[idx]}</td>
                  <td className={tableClass.td}><Badge>{item.framework}</Badge></td>
                  <td className={tableClass.td}><Badge tone={SEVERITY_TONE[item.priority]}>{tr(s.common.severity, item.priority)}</Badge></td>
                  <td className={clsx(tableClass.td, 'text-[13px] text-zinc-600 tabular whitespace-nowrap')}>{f.date(item.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className={clsx(tableClass.td, 'text-[13px] text-zinc-600 whitespace-nowrap')}>{g.owners[idx]}</td>
                  <td className={tableClass.td}><Badge tone={STATUS_TONE[item.status]} dot>{tr(s.common.status, item.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ─── EVIDENCE HEALTH TAB ─── */
const EVIDENCE_DATA = [
  { reuse: 45, orphaned: 12, expiring: 3 },
  { reuse: 52, orphaned: 10, expiring: 2 },
  { reuse: 58, orphaned: 8, expiring: 4 },
  { reuse: 63, orphaned: 6, expiring: 2 },
  { reuse: 67, orphaned: 8, expiring: 2 },
  { reuse: 70, orphaned: 5, expiring: 1 },
];
const DENSITY = [98, 96, 95, 90, 88, 82, 72, 85];

function EvidenceHealthView() {
  const s = useS();
  const f = useFormat();
  const e = s.evidence;
  const data = EVIDENCE_DATA.map((d, i) => ({ ...d, name: e.months[i] }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={e.total} value={487} deltaLabel={<span className="text-emerald-700">{fmt(e.thisMonth, { count: 24 })}</span>} icon={FolderOpen} />
        <StatCard label={e.reuse} value={f.percent(67)} delta={12} deltaLabel={s.common.vsLastPeriod} icon={Activity} />
        <StatCard label={e.orphaned} value={8} deltaLabel={<span className="text-amber-700">{e.orphanedNote}</span>} icon={Unlink} />
        <StatCard label={e.expiring} value={2} deltaLabel={<span className="text-rose-700">{e.expiringNote}</span>} icon={CalendarClock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title={e.trajectory} description={e.trajectoryDesc} />
          <div className="h-72 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} width={36} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} />
                <Legend {...legendProps} />
                <Line type="monotone" dataKey="reuse" stroke={chartTheme.series[0]} strokeWidth={2} name={e.reuseSeries} dot={{ r: 3, fill: chartTheme.series[0] }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="orphaned" stroke={chartTheme.series[3]} strokeWidth={1.5} name={e.orphanedSeries} dot={false} />
                <Line type="monotone" dataKey="expiring" stroke={chartTheme.series[5]} strokeWidth={1.5} name={e.expiringSeries} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title={e.density} description={e.densityDesc} />
          <div className="space-y-3.5">
            {e.densityTopics.map((topic, i) => (
              <div key={topic}>
                <div className="flex items-center justify-between mb-1.5 text-[13px]">
                  <span className="text-zinc-700">{topic}</span>
                  <span className="font-medium text-zinc-900 tabular">{f.percent(DENSITY[i])}</span>
                </div>
                <Progress value={DENSITY[i]} tone={DENSITY[i] >= 90 ? 'success' : DENSITY[i] < 80 ? 'warning' : 'neutral'} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── DATA QUALITY TAB ─── */
const KRIS = [
  { type: 'Unit Inconsistency', disclosure: 'GRI 305-1', severity: 'Medium' },
  { type: 'Missing Factor', disclosure: 'GRI 305-2', severity: 'High' },
  { type: 'Outlier', disclosure: 'GRI 302-1', severity: 'High' },
  { type: 'Boundary Mismatch', disclosure: 'GRI 305-1', severity: 'Critical' },
  { type: 'Missing Factor', disclosure: 'BRSR P5', severity: 'Medium' },
  { type: 'Validation', disclosure: 'BRSR P8', severity: 'Low' },
];

function KRIsView() {
  const s = useS();
  const k = s.kris;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={k.units} value={3} deltaLabel={<span className="text-amber-700">{k.unitsNote}</span>} icon={Ruler} />
        <StatCard label={k.factors} value={7} deltaLabel={<span className="text-rose-700">{k.factorsNote}</span>} icon={Sigma} />
        <StatCard label={k.outliers} value={5} deltaLabel={k.outliersNote} icon={Activity} />
        <StatCard label={k.boundary} value={2} deltaLabel={<span className="text-rose-700">{k.boundaryNote}</span>} icon={Crosshair} />
      </div>

      <Card>
        <CardHeader title={k.title} description={k.description} />
        <div className={tableClass.wrap}>
          <table className={tableClass.table}>
            <thead>
              <tr>
                <th className={tableClass.th}>{k.cols.type}</th>
                <th className={tableClass.th}>{k.cols.disclosure}</th>
                <th className={tableClass.th}>{k.cols.severity}</th>
                <th className={tableClass.th}>{k.cols.anomaly}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{k.cols.action}</th>
              </tr>
            </thead>
            <tbody>
              {KRIS.map((row, idx) => (
                <tr key={idx} className={tableClass.tr}>
                  <td className={clsx(tableClass.td, 'font-medium text-zinc-900 whitespace-nowrap')}>{tr(k.types, row.type)}</td>
                  <td className={clsx(tableClass.td, 'font-mono text-[13px] text-zinc-600 whitespace-nowrap')}>{row.disclosure}</td>
                  <td className={tableClass.td}><Badge tone={SEVERITY_TONE[row.severity]}>{tr(s.common.severity, row.severity)}</Badge></td>
                  <td className={clsx(tableClass.td, 'text-[13px] text-zinc-600 min-w-[260px]')}>{k.descs[idx]}</td>
                  <td className={clsx(tableClass.td, 'text-right')}><Button size="sm" variant="secondary">{k.correct}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ─── PERFORMANCE TAB ─── */
const PERFORMANCE_DATA = [
  { year: '2021', ghg: 8200, generation: 520000, avoidance: 415000, water: 620 },
  { year: '2022', ghg: 7100, generation: 640000, avoidance: 510000, water: 560 },
  { year: '2023', ghg: 6400, generation: 740000, avoidance: 590000, water: 510 },
  { year: '2024', ghg: 6140, generation: 820000, avoidance: 654000, water: 485 },
  { year: '2025', ghg: 5800, generation: 892000, avoidance: 712000, water: 450 },
];
const INTENSITY_VALUES = ['0.36', '55', '123×', '0.028'];

function PerformanceView() {
  const s = useS();
  const f = useFormat();
  const p = s.performance;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={p.ghg} value={f.number(5800)} unit="tCO₂e" delta={-29} goodWhen="down" deltaLabel={p.ghgNote} icon={Activity} />
        <StatCard label={p.generation} value={f.compact(892000)} unit="MWh" delta={72} deltaLabel={p.vs2021} icon={Zap} />
        <StatCard label={p.avoidance} value={f.compact(712000)} unit={p.avoidanceNote} delta={72} deltaLabel={p.vs2021} icon={Leaf} />
        <StatCard label={p.water} value={450} unit="ML" delta={-27} goodWhen="down" deltaLabel={p.vs2021} icon={Droplets} />
      </div>

      <Card>
        <CardHeader title={p.trajectory} description={p.trajectoryDesc} />
        <div className="h-80 sm:h-96 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={PERFORMANCE_DATA} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chartTheme.grid} />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={axisTick} width={44} tickFormatter={v => f.compact(v)} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={axisTick} width={44} tickFormatter={v => f.compact(v)} />
              <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} formatter={(v: number) => f.number(v)} />
              <Legend {...legendProps} />
              <Line yAxisId="left" type="monotone" dataKey="ghg" stroke={chartTheme.series[0]} strokeWidth={2} name={p.ghgSeries} dot={{ r: 3, fill: chartTheme.series[0] }} activeDot={{ r: 5 }} />
              <Line yAxisId="right" type="monotone" dataKey="generation" stroke={chartTheme.series[1]} strokeWidth={1.5} name={p.genSeries} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="avoidance" stroke={chartTheme.series[2]} strokeWidth={1.5} name={p.avoidSeries} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title={p.intensity} description={p.intensityDesc} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {p.cards.map((m, i) => (
            <div key={m.label} className="rounded-xl border border-line p-4">
              <div className="text-[13px] font-medium text-zinc-500">{m.label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 tabular">{INTENSITY_VALUES[i]}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{m.unit}</div>
              <div className="mt-3"><Badge tone="success">{m.trend}</Badge></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
