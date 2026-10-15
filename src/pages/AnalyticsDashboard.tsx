import { useMemo, useState } from 'react';
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
import { PageHeader, Card, CardHeader, Button, Badge, StatCard, Progress, EmptyState, tableClass, chartTheme, Tone } from '../components/ui';
import { fmt, useFormat, useStrings } from '../i18n';
import { analyticsDashboardStrings } from '../i18n/pages/analyticsDashboard';
import { moduleIdOf, useFrameworkLabels } from '../i18n/pages/moduleCatalog';
import { useL10n, useMockData, useMoney, useWorkspace } from '../workspace/WorkspaceContext';
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

/* ─── Active frameworks (shared by tabs) ─── */

/** Illustrative disclosure-item counts per framework; unknown ids get a deterministic fallback. */
const KNOWN_TOTALS: Record<string, number> = {
  GRI: 45, MSX: 18, 'IFRS-S1': 28, 'IFRS-S2': 32, 'BRSR-Core': 72, 'CSRD-ESRS': 82, TCFD: 11, 'China-ESG': 24,
  'CN-SSE': 58, 'CN-CSDS': 26, 'HKEX-ESG': 46, 'CN-ETS': 12,
};
const hash = (id: string) => Array.from(id).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

type FrameworkRow = {
  id: string;
  label: string;
  total: number;
  complete: number;
  coverage: number;
  sections?: { done: number; total: number };
  state?: string;
};

/** Tenant modules in the region's display order (plus any extra tenant modules); the region list if the tenant has none. */
function useFrameworkRows(): FrameworkRow[] {
  const { region } = useWorkspace();
  const { modules, frameworks: coverageMap } = useMockData();
  const fw = useFrameworkLabels();
  return useMemo(() => {
    const byId = new Map(modules.map(m => [moduleIdOf(m.id), m]));
    const covById = new Map(Object.entries(coverageMap).map(([k, v]) => [moduleIdOf(k), v.covered]));
    const tenantIds = Array.from(byId.keys());
    const ordered = [...region.frameworks.filter(id => byId.has(id)), ...tenantIds.filter(id => !region.frameworks.includes(id))];
    const ids = ordered.length ? ordered : region.frameworks;
    return ids.map(id => {
      const m = byId.get(id);
      const coverage = m?.coverage ?? covById.get(id) ?? 50 + (hash(id) % 40);
      const total = KNOWN_TOTALS[id] ?? (m ? m.questionnaireSections * 3 : 20 + (hash(id) % 30));
      return {
        id,
        label: fw.short(id, m?.title),
        total,
        complete: Math.round((total * coverage) / 100),
        coverage,
        sections: m ? { done: m.completedSections, total: m.questionnaireSections } : undefined,
        state: m?.state,
      };
    });
  }, [modules, coverageMap, region.frameworks, fw]);
}

type Area = 'climate' | 'energy' | 'community';
type RefOption = { id: string; code?: string };

/** First active framework from `options` → "GRI 305-1" / "SSE/SZSE/BSE · Climate"; otherwise the lead framework + area. */
function useDisclosureRef() {
  const rows = useFrameworkRows();
  const fw = useFrameworkLabels();
  const s = useS();
  return (options: RefOption[], area: Area) => {
    const active = new Set(rows.map(r => r.id));
    const hit = options.find(o => active.has(o.id)) ?? (rows[0] ? { id: rows[0].id } : undefined);
    if (!hit) return { id: undefined as string | undefined, label: s.areas[area] };
    return { id: hit.id, label: hit.code ? `${fw.short(hit.id)} ${hit.code}` : `${fw.short(hit.id)} · ${s.areas[area]}` };
  };
}

const ENERGY_REFS: RefOption[] = [{ id: 'GRI', code: '302-1' }, { id: 'CSRD-ESRS', code: 'E1' }, { id: 'HKEX-ESG', code: 'A2' }, { id: 'CN-SSE' }];

export default function AnalyticsDashboard() {
  const s = useS();
  const fw = useFrameworkLabels();
  const { region } = useWorkspace();
  const rows = useFrameworkRows();
  const resolveRef = useDisclosureRef();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('compliance');
  const regional = s.regional[region.id] ?? s.regional.global;

  const validationAlerts = [
    { type: 'warning' as const, message: fmt(s.alerts.energy, { ref: resolveRef(ENERGY_REFS, 'energy').label }) },
    { type: 'on_track' as const, message: s.alerts.ghg },
  ];
  const leadPair = rows.slice(0, 2).map(r => fw.short(r.id)).join(s.listSep);
  const quickLinkLabel = (key: (typeof QUICK_LINKS)[number]['key']) =>
    key === 'csrd' ? fmt(s.quickLinks.csrd, { frameworks: leadPair }) : key === 'edci' ? regional.edciLink : s.quickLinks.targets;

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
              : <Target className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" />}
            <span className="flex-1 min-w-0 leading-relaxed">{a.message}</span>
            {a.type === 'warning' ? (
              <button type="button" onClick={() => setActiveTab('kris')} className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30">
                <Badge tone="warning">{s.alerts.review}</Badge>
              </button>
            ) : (
              <Badge tone="success">{s.alerts.onTrack}</Badge>
            )}
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
        {activeTab === 'compliance' && <ComplianceView rows={rows} />}
        {activeTab === 'gaps' && <GapAnalysisView rows={rows} />}
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
                <span>{quickLinkLabel(l.key)}</span>
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
const TOPIC_COVERAGE = [95, 92, 88, 90, 82, 85, 75];
/** NGRBC principle completion; only rendered when BRSR Core is an active framework. */
const BRSR_PCT = [100, 100, 92, 88, 100, 85, 78];

function ComplianceView({ rows }: { rows: FrameworkRow[] }) {
  const s = useS();
  const f = useFormat();
  const fw = useFrameworkLabels();
  const navigate = useNavigate();
  const c = s.compliance;
  const topicData = c.topics.map((topic, i) => ({ topic, coverage: TOPIC_COVERAGE[i] }));

  const totals = rows.reduce((acc, r) => ({ total: acc.total + r.total, complete: acc.complete + r.complete }), { total: 0, complete: 0 });
  const overall = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.coverage, 0) / rows.length) : 0;
  const lead = rows[0];
  const hasBrsr = rows.some(r => r.id === 'BRSR-Core');
  const sectionRows = rows.filter(r => r.sections && r.sections.total > 0);
  const frameworkList = rows.map(r => r.label).join(s.listSep);

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon={FileCheck} title={c.emptyTitle} description={c.emptyDesc} action={<Button variant="primary" onClick={() => navigate('/modules')}>{c.emptyAction}</Button>} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label={c.overall} value={f.percent(overall)} delta={4} deltaLabel={s.common.vsLastPeriod} icon={Layers} />
        <StatCard label={c.complete} value={f.number(totals.complete)} unit={`/ ${f.number(totals.total)}`} deltaLabel={fmt(c.remaining, { count: totals.total - totals.complete })} icon={ListChecks} />
        <StatCard label={c.material} value={14} unit="/ 18" deltaLabel={<span className="text-amber-700">{fmt(c.pendingDma, { count: 4 })}</span>} icon={Target} />
        <StatCard label={c.frameworksActive} value={rows.length} deltaLabel={<span className="block truncate max-w-[200px]" title={frameworkList}>{frameworkList}</span>} icon={FileCheck} />
        {lead && (
          <StatCard
            label={lead.label}
            value={f.percent(lead.coverage)}
            deltaLabel={<Badge tone="success" dot>{lead.state ? fw.state(lead.state) : c.leadStatus}</Badge>}
            icon={Leaf}
          />
        )}
      </div>

      {hasBrsr ? (
        <Card>
          <CardHeader title={c.brsrTitle} description={c.brsrDesc} action={<Button size="sm" variant="ghost" iconRight={ArrowRight} onClick={() => navigate('/modules/BRSR-Core')}>{c.openModule}</Button>} />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {c.principles.map((label, i) => {
              const pct = BRSR_PCT[i];
              const tone: Tone = pct === 100 ? 'success' : pct >= 85 ? 'warning' : 'danger';
              return (
                <div key={label} className="rounded-xl border border-line p-3 min-w-0">
                  <div className="text-[13px] font-medium text-zinc-700 truncate" title={label}>{label}</div>
                  <div className="mt-2 text-xl font-semibold text-zinc-900 tabular">{f.percent(pct)}</div>
                  <Progress value={pct} tone={tone} className="mt-2" />
                </div>
              );
            })}
          </div>
        </Card>
      ) : sectionRows.length > 0 ? (
        <Card>
          <CardHeader title={c.sectionsTitle} description={c.sectionsDesc} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {sectionRows.map(r => {
              const sec = r.sections!;
              const pct = Math.round((sec.done / sec.total) * 100);
              const tone: Tone = pct === 100 ? 'success' : pct >= 60 ? 'warning' : 'danger';
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => navigate(`/modules/${r.id}`)}
                  className="text-left rounded-xl border border-line p-3 min-w-0 hover:bg-zinc-50 hover:border-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
                >
                  <div className="text-[13px] font-medium text-zinc-700 truncate" title={r.label}>{r.label}</div>
                  <div className="mt-2 text-xl font-semibold text-zinc-900 tabular">{f.percent(pct)}</div>
                  <div className="text-xs text-zinc-500 tabular">{fmt(c.sectionsOf, { done: sec.done, total: sec.total })}</div>
                  <Progress value={pct} tone={tone} className="mt-2" />
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={c.byFramework} />
          <div className={tableClass.wrap}>
            <table className={clsx(tableClass.table, 'min-w-[520px]')}>
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
                {rows.map(row => (
                  <tr key={row.id} className={clsx(tableClass.tr, 'cursor-pointer')} onClick={() => navigate(`/modules/${row.id}`)}>
                    <td className={clsx(tableClass.td, 'font-medium text-zinc-900 whitespace-nowrap')}>{row.label}</td>
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
const GAP_TRENDS = [
  { m: 5, gaps: 156, resolved: 23 }, { m: 6, gaps: 142, resolved: 28 },
  { m: 7, gaps: 128, resolved: 35 }, { m: 8, gaps: 115, resolved: 41 },
  { m: 9, gaps: 98, resolved: 49 }, { m: 10, gaps: 84, resolved: 56 },
];
const MATURITY = [
  { current: 85, target: 95 }, { current: 72, target: 90 }, { current: 68, target: 85 },
  { current: 45, target: 80 }, { current: 78, target: 95 }, { current: 82, target: 90 },
];
/** Status / due-date slots for the top-5 action items (ordered by gap size). */
const ACTION_SLOTS = [
  { due: '11-30', status: 'In Progress' },
  { due: '12-01', status: 'In Progress' },
  { due: '12-15', status: 'Not Started' },
  { due: '12-20', status: 'Planning' },
  { due: '12-25', status: 'In Progress' },
];
const priorityOf = (gap: number) => (gap >= 35 ? 'Critical' : gap >= 20 ? 'High' : gap >= 10 ? 'Medium' : 'Low');

function GapAnalysisView({ rows }: { rows: FrameworkRow[] }) {
  const s = useS();
  const f = useFormat();
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const g = s.gaps;

  const gapRows = rows.map(r => ({ id: r.id, framework: r.label, covered: r.coverage, gap: 100 - r.coverage, priority: priorityOf(100 - r.coverage) }));
  const totalGaps = gapRows.reduce((sum, x) => sum + x.gap, 0);
  const avgCoverage = gapRows.length ? Math.round(gapRows.reduce((sum, x) => sum + x.covered, 0) / gapRows.length) : 0;
  const month = (m: number) => f.date(new Date(2025, m, 1), { month: 'short' });
  const trendData = GAP_TRENDS.map(t => ({ ...t, month: month(t.m) }));
  const maturityData = g.maturityAxes.map((subject, i) => ({ subject, ...MATURITY[i] }));
  const year = parseInt(workspace.reportingYear.replace(/\D/g, ''), 10) || new Date().getFullYear();
  const actionItems = [...gapRows]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, ACTION_SLOTS.length)
    .map((r, i) => ({ ...r, title: fmt(g.actionTemplates[i], { framework: r.framework }), owner: g.owners[i], dueDate: `${year}-${ACTION_SLOTS[i].due}`, status: ACTION_SLOTS[i].status }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={g.total} value={totalGaps} delta={-14} goodWhen="down" deltaLabel={s.common.vsLastMonth} icon={AlertTriangle} />
        <StatCard label={g.avgCoverage} value={f.percent(avgCoverage)} icon={Layers} />
        <StatCard label={g.critical} value={gapRows.filter(r => r.priority === 'Critical').length} unit={g.frameworksUnit} deltaLabel={<span className="text-amber-700">{g.criticalNote}</span>} icon={Crosshair} />
        <StatCard label={g.resolved} value={56} delta={14} deltaLabel={s.common.vsLastMonth} icon={ListChecks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={g.vsFramework} />
          <div className="h-72 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapRows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="framework" axisLine={false} tickLine={false} tick={axisTick} minTickGap={8} interval={0} />
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
        {actionItems.length === 0 ? (
          <EmptyState icon={ListChecks} title={g.emptyTitle} description={g.emptyDesc} />
        ) : (
          <div className={tableClass.wrap}>
            <table className={clsx(tableClass.table, 'min-w-[860px]')}>
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
                {actionItems.map(item => (
                  <tr key={item.id} className={tableClass.tr}>
                    <td className={clsx(tableClass.td, 'font-medium text-zinc-900 min-w-[240px]')}>
                      <button type="button" onClick={() => navigate(`/modules/${item.id}/questionnaire`)} className="text-left hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 rounded">
                        {item.title}
                      </button>
                    </td>
                    <td className={tableClass.td}><Badge>{item.framework}</Badge></td>
                    <td className={tableClass.td}><Badge tone={SEVERITY_TONE[item.priority]}>{tr(s.common.severity, item.priority)}</Badge></td>
                    <td className={clsx(tableClass.td, 'text-[13px] text-zinc-600 tabular whitespace-nowrap')}>{f.date(item.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className={clsx(tableClass.td, 'text-[13px] text-zinc-600 whitespace-nowrap')}>{item.owner}</td>
                    <td className={tableClass.td}><Badge tone={STATUS_TONE[item.status]} dot>{tr(s.common.status, item.status)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
const KRIS: { type: string; severity: string; refs: RefOption[]; area: Area }[] = [
  { type: 'Unit Inconsistency', severity: 'Medium', refs: [{ id: 'GRI', code: '305-1' }, { id: 'CSRD-ESRS', code: 'E1' }, { id: 'HKEX-ESG', code: 'A1' }], area: 'climate' },
  { type: 'Missing Factor', severity: 'High', refs: [{ id: 'GRI', code: '305-2' }, { id: 'CSRD-ESRS', code: 'E1' }, { id: 'HKEX-ESG', code: 'A1' }], area: 'climate' },
  { type: 'Outlier', severity: 'High', refs: ENERGY_REFS, area: 'energy' },
  { type: 'Boundary Mismatch', severity: 'Critical', refs: [{ id: 'GRI', code: '305-1' }, { id: 'CSRD-ESRS', code: 'E1' }, { id: 'HKEX-ESG', code: 'A1' }], area: 'climate' },
  { type: 'Missing Factor', severity: 'Medium', refs: [{ id: 'BRSR-Core', code: 'P6' }, { id: 'CN-SSE' }, { id: 'HKEX-ESG', code: 'A1' }, { id: 'GRI', code: '305-2' }], area: 'climate' },
  { type: 'Validation', severity: 'Low', refs: [{ id: 'BRSR-Core', code: 'P8' }, { id: 'CN-SSE' }, { id: 'HKEX-ESG', code: 'B8' }, { id: 'GRI', code: '413-1' }], area: 'community' },
];

function KRIsView() {
  const s = useS();
  const k = s.kris;
  const l10n = useL10n();
  const navigate = useNavigate();
  const { region } = useWorkspace();
  const { modules } = useMockData();
  const resolveRef = useDisclosureRef();
  const tenantModules = new Set(modules.map(m => moduleIdOf(m.id)));
  const gridSource = l10n(region.gridFactor.source);
  const rows = KRIS.map((row, idx) => ({
    ...row,
    ref: resolveRef(row.refs, row.area),
    desc: fmt(k.descs[idx] ?? '', { source: gridSource }),
  }));

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
          <table className={clsx(tableClass.table, 'min-w-[820px]')}>
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
              {rows.map((row, idx) => (
                <tr key={idx} className={tableClass.tr}>
                  <td className={clsx(tableClass.td, 'font-medium text-zinc-900 whitespace-nowrap')}>{tr(k.types, row.type)}</td>
                  <td className={clsx(tableClass.td, 'font-mono text-[13px] text-zinc-600 whitespace-nowrap')}>{row.ref.label}</td>
                  <td className={tableClass.td}><Badge tone={SEVERITY_TONE[row.severity]}>{tr(s.common.severity, row.severity)}</Badge></td>
                  <td className={clsx(tableClass.td, 'text-[13px] text-zinc-600 min-w-[260px]')}>{row.desc}</td>
                  <td className={clsx(tableClass.td, 'text-right')}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(row.ref.id && tenantModules.has(row.ref.id) ? `/modules/${row.ref.id}/questionnaire` : '/workbench')}
                    >
                      {k.correct}
                    </Button>
                  </td>
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
/** Illustrative intensities per USD 1m revenue; converted for other workspace currencies. */
const INTENSITY_PER_USD_M = { ghg: 3.0, water: 0.23 };
const PER_USD: Record<string, number> = { USD: 1, CNY: 7.1 };
/** Generation / avoidance ramp from the first trend year to the reporting year (relative to the latest value). */
const RAMP_START = 0.58;
const WATER = { latest: 450, delta: -27 };

function PerformanceView() {
  const s = useS();
  const f = useFormat();
  const money = useMoney();
  const { region, workspace } = useWorkspace();
  const { ghgTrends, renewableEnergy } = useMockData();
  const p = s.performance;

  const data = useMemo(
    () =>
      ghgTrends.map((t, i) => {
        const k = ghgTrends.length > 1 ? RAMP_START + (1 - RAMP_START) * (i / (ghgTrends.length - 1)) : 1;
        return {
          year: t.year,
          ghg: t.scope1 + t.scope2,
          generation: Math.round(renewableEnergy.generationMWh * k),
          avoidance: Math.round(renewableEnergy.carbonAvoidanceTCO2e * k),
        };
      }),
    [ghgTrends, renewableEnergy],
  );

  if (data.length === 0) {
    return (
      <Card>
        <EmptyState icon={TrendingUp} title={p.emptyTitle} description={p.emptyDesc} />
      </Card>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const pctChange = (a: number, b: number) => (a > 0 ? Math.round(((b - a) / a) * 100) : 0);
  const ghgDelta = pctChange(first.ghg, last.ghg);
  const growthDelta = pctChange(first.generation, last.generation);
  const perMillion = 1 / (PER_USD[region.currency] ?? 1);
  const perRevenueUnit = fmt(p.perRevenue, { amount: money.compact(1_000_000) });
  const capacityFactor = renewableEnergy.installedCapacityMW > 0 ? (renewableEnergy.generationMWh / (renewableEnergy.installedCapacityMW * 8760)) * 100 : 0;
  const multiplier = last.ghg > 0 ? renewableEnergy.carbonAvoidanceTCO2e / last.ghg : 0;

  const cards = [
    { label: p.cards.ghgIntensity, value: f.number(INTENSITY_PER_USD_M.ghg * perMillion, { maximumFractionDigits: 3 }), unit: `tCO₂e / ${perRevenueUnit}`, trend: fmt(p.cards.vsPeer, { pct: '−18%' }) },
    {
      label: p.cards.efficiency,
      value: f.number(renewableEnergy.installedCapacityMW > 0 ? renewableEnergy.generationMWh / renewableEnergy.installedCapacityMW : 0, { maximumFractionDigits: 0 }),
      unit: p.cards.efficiencyUnit,
      trend: fmt(p.cards.capacityFactor, { pct: f.percent(capacityFactor, 1) }),
    },
    {
      label: p.cards.multiplier,
      value: `${f.number(multiplier, { maximumFractionDigits: 1 })}×`,
      unit: p.cards.multiplierUnit,
      trend: fmt(p.cards.multiplierTrend, { avoided: f.compact(renewableEnergy.carbonAvoidanceTCO2e), emitted: f.compact(last.ghg) }),
    },
    { label: p.cards.waterIntensity, value: f.number(INTENSITY_PER_USD_M.water * perMillion, { maximumFractionDigits: 3 }), unit: `ML / ${perRevenueUnit}`, trend: fmt(p.cards.vsPeer, { pct: '−15%' }) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={p.ghg} value={f.number(last.ghg)} unit="tCO₂e" delta={ghgDelta} goodWhen="down" deltaLabel={fmt(p.ghgNote, { year: first.year })} icon={Activity} />
        <StatCard label={p.generation} value={f.compact(renewableEnergy.generationMWh)} unit="MWh" delta={growthDelta} deltaLabel={fmt(p.vsYear, { year: first.year })} icon={Zap} />
        <StatCard label={p.avoidance} value={f.compact(renewableEnergy.carbonAvoidanceTCO2e)} unit={p.avoidanceNote} delta={growthDelta} deltaLabel={fmt(p.vsYear, { year: first.year })} icon={Leaf} />
        <StatCard label={p.water} value={f.number(WATER.latest)} unit="ML" delta={WATER.delta} goodWhen="down" deltaLabel={fmt(p.vsYear, { year: first.year })} icon={Droplets} />
      </div>

      <Card>
        <CardHeader title={fmt(p.trajectory, { count: data.length })} description={p.trajectoryDesc} />
        <div className="h-80 sm:h-96 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
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
        <CardHeader title={fmt(p.intensity, { year: workspace.reportingYear })} description={p.intensityDesc} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map(m => (
            <div key={m.label} className="rounded-xl border border-line p-4 min-w-0">
              <div className="text-[13px] font-medium text-zinc-500">{m.label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 tabular">{m.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{m.unit}</div>
              <div className="mt-3"><Badge tone="success">{m.trend}</Badge></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
