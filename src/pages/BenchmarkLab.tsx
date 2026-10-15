import { useState } from 'react';
import { Shield, Lightbulb, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';
import { PageHeader, Card, CardHeader, Badge, Tabs, chartTheme, tableClass, Tone } from '../components/ui';
import { fmt, useFormat, useStrings } from '../i18n';
import { benchmarkLabStrings } from '../i18n/pages/benchmarkLab';
import { useWorkspace } from '../workspace/WorkspaceContext';

type PeerGroup = 'india' | 'gcc' | 'global' | 'cnA' | 'hkex' | 'cnGlobal';
type Segment = keyof typeof benchmarkLabStrings.en.segments;
type Metric = 'emissions' | 'safety' | 'water' | 'diversity' | 'capacity';
type Normalization = 'revenue' | 'mw' | 'employee';
type Grade = 'A' | 'B' | 'C';
type Point = { you: number; median: number; best: number; q1: number; q3: number; provenance: Grade; trend: number };

const PEER_GROUPS: PeerGroup[] = ['india', 'gcc', 'global'];
const CN_PEER_GROUPS: PeerGroup[] = ['cnA', 'hkex', 'cnGlobal'];
const METRICS: Metric[] = ['emissions', 'safety', 'water', 'diversity', 'capacity'];
const NORMALIZATIONS: Normalization[] = ['revenue', 'mw', 'employee'];

const BENCHMARK_DATA: Record<PeerGroup, Record<Metric, Point>> = {
  // Mainland tenant (绿源控股集团): intensities per CNY million revenue, LTIFR per million hours.
  cnA: {
    emissions: { you: 14.2, median: 18.6, best: 6.8, q1: 11.3, q3: 24.9, provenance: 'A', trend: -24 },
    safety: { you: 0.42, median: 0.61, best: 0.15, q1: 0.38, q3: 0.95, provenance: 'B', trend: -31 },
    water: { you: 128, median: 176, best: 64, q1: 102, q3: 241, provenance: 'A', trend: -27 },
    diversity: { you: 18.2, median: 12.5, best: 30.0, q1: 16.7, q3: 9.1, provenance: 'A', trend: 46 },
    capacity: { you: 24.8, median: 22.1, best: 31.5, q1: 26.3, q3: 19.0, provenance: 'B', trend: 12 },
  },
  hkex: {
    emissions: { you: 14.2, median: 16.9, best: 5.9, q1: 10.4, q3: 22.8, provenance: 'A', trend: -16 },
    safety: { you: 0.42, median: 0.55, best: 0.12, q1: 0.33, q3: 0.88, provenance: 'B', trend: -24 },
    water: { you: 128, median: 158, best: 58, q1: 96, q3: 214, provenance: 'B', trend: -19 },
    diversity: { you: 18.2, median: 16.0, best: 33.3, q1: 20.0, q3: 11.1, provenance: 'A', trend: 14 },
    capacity: { you: 24.8, median: 23.4, best: 33.0, q1: 27.1, q3: 20.2, provenance: 'B', trend: 6 },
  },
  cnGlobal: {
    emissions: { you: 14.2, median: 13.1, best: 4.2, q1: 8.6, q3: 19.7, provenance: 'B', trend: 8 },
    safety: { you: 0.42, median: 0.48, best: 0.09, q1: 0.27, q3: 0.79, provenance: 'C', trend: -13 },
    water: { you: 128, median: 139, best: 41, q1: 85, q3: 198, provenance: 'B', trend: -8 },
    diversity: { you: 18.2, median: 31.0, best: 45.5, q1: 36.4, q3: 25.0, provenance: 'A', trend: -41 },
    capacity: { you: 24.8, median: 26.0, best: 36.2, q1: 29.4, q3: 21.7, provenance: 'B', trend: -5 },
  },
  india: {
    emissions: { you: 0.36, median: 0.52, best: 0.18, q1: 0.38, q3: 0.72, provenance: 'A', trend: -31 },
    safety: { you: 0.28, median: 0.45, best: 0.12, q1: 0.30, q3: 0.68, provenance: 'B', trend: -38 },
    water: { you: 0.028, median: 0.045, best: 0.015, q1: 0.030, q3: 0.062, provenance: 'A', trend: -38 },
    diversity: { you: 30, median: 22, best: 42, q1: 18, q3: 28, provenance: 'A', trend: 36 },
    capacity: { you: 22.6, median: 20.1, best: 28.4, q1: 21.2, q3: 18.5, provenance: 'A', trend: 12 },
  },
  gcc: {
    emissions: { you: 0.36, median: 0.68, best: 0.22, q1: 0.45, q3: 0.92, provenance: 'B', trend: -47 },
    safety: { you: 0.28, median: 0.52, best: 0.15, q1: 0.35, q3: 0.78, provenance: 'B', trend: -46 },
    water: { you: 0.028, median: 0.058, best: 0.020, q1: 0.038, q3: 0.075, provenance: 'B', trend: -52 },
    diversity: { you: 30, median: 18, best: 35, q1: 14, q3: 22, provenance: 'B', trend: 67 },
    capacity: { you: 22.6, median: 24.5, best: 32.0, q1: 26.0, q3: 20.8, provenance: 'A', trend: -8 },
  },
  global: {
    emissions: { you: 0.36, median: 0.42, best: 0.12, q1: 0.28, q3: 0.58, provenance: 'A', trend: -14 },
    safety: { you: 0.28, median: 0.38, best: 0.08, q1: 0.22, q3: 0.55, provenance: 'C', trend: -26 },
    water: { you: 0.028, median: 0.035, best: 0.010, q1: 0.022, q3: 0.048, provenance: 'B', trend: -20 },
    diversity: { you: 30, median: 36, best: 52, q1: 30, q3: 24, provenance: 'A', trend: -17 },
    capacity: { you: 22.6, median: 23.8, best: 34.2, q1: 26.5, q3: 19.4, provenance: 'A', trend: -5 },
  },
};

const GRADE_TONE: Record<Grade, Tone> = { A: 'success', B: 'info', C: 'warning' };
const QUARTILE_TONE: Tone[] = ['success', 'info', 'warning', 'danger'];

/** Anonymised peer sample per group (letter + business segment). */
const PEER_SET: Record<PeerGroup, [string, Segment][]> = {
  india: [['A', 'solarIpp'], ['B', 'windIpp'], ['C', 'hybrid'], ['D', 'solarIpp'], ['E', 'transmission'], ['F', 'windIpp']],
  gcc: [['A', 'utility'], ['B', 'solarIpp'], ['C', 'utility'], ['D', 'ipp'], ['E', 'transmission']],
  global: [['A', 'ipp'], ['B', 'windIpp'], ['C', 'solarIpp'], ['D', 'utility'], ['E', 'hybrid'], ['F', 'ipp']],
  cnA: [['A', 'pv'], ['B', 'windOem'], ['C', 'storage'], ['D', 'battery'], ['E', 'pv'], ['F', 'windOps']],
  hkex: [['G', 'pvGlass'], ['H', 'windOps'], ['I', 'storage'], ['J', 'ipp'], ['K', 'pv']],
  cnGlobal: [['L', 'pv'], ['M', 'windOem'], ['N', 'battery'], ['O', 'storage'], ['P', 'pv'], ['Q', 'windOem']],
};
// Where each anonymised peer sits between best-in-class (0) and the bottom of Q3 (1).
const PEER_POSITIONS = [0, 0.22, 0.47, 0.61, 0.79, 1.08];
const roundPeer = (v: number) => (Math.abs(v) >= 10 ? Math.round(v * 10) / 10 : Math.abs(v) >= 1 ? Math.round(v * 100) / 100 : Math.round(v * 1000) / 1000);

/**
 * Peer benchmarking panel. Used standalone on /analytics/benchmark (variant "full")
 * and inside the Analytics studio benchmark tab (variant "compact": no normalisation, short insight).
 */
export function BenchmarkPanel({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { workspace } = useWorkspace();
  // Remount per workspace: peer groups differ by region.
  return <BenchmarkPanelView key={workspace.id} variant={variant} />;
}

function BenchmarkPanelView({ variant }: { variant: 'full' | 'compact' }) {
  const s = useStrings(benchmarkLabStrings);
  const f = useFormat();
  const { region } = useWorkspace();
  const isCn = region.id === 'cn';
  const groups = isCn ? CN_PEER_GROUPS : PEER_GROUPS;
  const metricsCopy = isCn ? s.metricsCn : s.metrics;
  const normsCopy = isCn ? s.normsCn : s.norms;
  const [peerGroup, setPeerGroup] = useState<PeerGroup>(groups[0]);
  const [metric, setMetric] = useState<Metric>('emissions');
  const [normalization, setNormalization] = useState<Normalization>('revenue');

  const d = BENCHMARK_DATA[peerGroup][metric];
  const isLowerBetter = metric !== 'diversity' && metric !== 'capacity';
  const youBetter = isLowerBetter ? d.you < d.median : d.you > d.median;
  const pct = f.percent(Math.abs(d.trend));
  const num = (n: number) => f.number(n, { maximumFractionDigits: 3 });
  const metricCopy = metricsCopy[metric];
  const grade = s.provenance[d.provenance];

  const chartData = [
    { key: 'best', name: s.chart.bars.best, value: d.best, color: chartTheme.series[1] },
    { key: 'q1', name: s.chart.bars.q1, value: d.q1, color: '#D4D4D8' },
    { key: 'you', name: s.chart.bars.you, value: d.you, color: chartTheme.series[0] },
    { key: 'median', name: s.chart.bars.median, value: d.median, color: '#A1A1AA' },
    { key: 'q3', name: s.chart.bars.q3, value: d.q3, color: '#D4D4D8' },
  ];

  // Anonymised peer rows plus "you", ranked best → worst, with quartile position.
  const span = d.q3 - d.best;
  const peerRows = [
    ...PEER_SET[peerGroup].map(([letter, segment], i) => ({
      key: letter,
      label: fmt(s.peerSet.label, { letter, segment: s.segments[segment] }),
      value: roundPeer(d.best + span * PEER_POSITIONS[i % PEER_POSITIONS.length]),
      you: false,
    })),
    { key: 'you', label: s.peerSet.you, value: d.you, you: true },
  ].sort((a, b) => (isLowerBetter ? a.value - b.value : b.value - a.value));
  const quartileOf = (v: number) => {
    const better = (x: number, y: number) => (isLowerBetter ? x <= y : x >= y);
    if (better(v, d.q1)) return 0;
    if (better(v, d.median)) return 1;
    if (better(v, d.q3)) return 2;
    return 3;
  };

  const summary = fmt(youBetter ? s.insight.summaryBetter : s.insight.summaryBehind, {
    metric: metricCopy.label,
    pct,
    peers: s.peers[peerGroup].label,
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <div className="space-y-5">
          <div>
            <div className="text-[13px] font-medium text-zinc-500 mb-2">{s.peerGroup}</div>
            <div role="radiogroup" aria-label={s.peerGroup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {groups.map(g => {
                const active = peerGroup === g;
                return (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPeerGroup(g)}
                    className={clsx(
                      'relative text-left rounded-xl border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                      active ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900' : 'border-line bg-white hover:border-zinc-300',
                    )}
                  >
                    <div className="text-sm font-medium text-zinc-900 pr-6">{s.peers[g].label}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{s.peers[g].sub}</div>
                    {active && (
                      <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-5">
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-zinc-500 mb-2">{s.metric}</div>
              <Tabs value={metric} onChange={setMetric} items={METRICS.map(m => ({ value: m, label: metricsCopy[m].label }))} />
            </div>
            {variant === 'full' && (
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-zinc-500 mb-2">{s.normalization}</div>
                <Tabs value={normalization} onChange={setNormalization} items={NORMALIZATIONS.map(n => ({ value: n, label: normsCopy[n] }))} />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr),minmax(0,2fr)] gap-4">
        <Card>
          <CardHeader
            title={s.chart.title}
            description={`${metricCopy.label} · ${metricCopy.unit}`}
            action={
              <Badge tone={youBetter ? 'success' : 'warning'} icon={youBetter === isLowerBetter ? TrendingDown : TrendingUp}>
                {fmt(youBetter ? s.better : s.behind, { pct })}
              </Badge>
            }
          />
          <div className="h-72 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartTheme.axis }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: chartTheme.axis }} width={44} tickFormatter={v => num(v)} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={chartTheme.tooltip.contentStyle}
                  labelStyle={chartTheme.tooltip.labelStyle}
                  formatter={(v: number) => [num(v), metricCopy.unit]}
                />
                <Bar dataKey="value" name={s.chart.series} radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {chartData.map(entry => <Cell key={entry.key} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={s.stats.title} />
            <dl className="divide-y divide-line -my-1">
              {[
                { label: s.stats.you, val: d.you, cls: 'text-zinc-900 font-semibold' },
                { label: s.stats.median, val: d.median, cls: 'text-zinc-700' },
                { label: s.stats.best, val: d.best, cls: 'text-emerald-700 font-semibold' },
                { label: s.stats.q1, val: d.q1, cls: 'text-zinc-700' },
                { label: s.stats.q3, val: d.q3, cls: 'text-zinc-700' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5">
                  <dt className="text-sm text-zinc-600">{row.label}</dt>
                  <dd className={clsx('text-base tabular', row.cls)}>{num(row.val)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-sm">
              <span className="text-zinc-600">{s.vsMedian}</span>
              <span className={clsx('font-medium tabular', youBetter ? 'text-emerald-700' : 'text-amber-600')}>
                {fmt(youBetter ? s.better : s.behind, { pct })}
              </span>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-zinc-900">{fmt(s.provenance.title, { grade: d.provenance })}</span>
                  <Badge tone={GRADE_TONE[d.provenance]}>{grade.label}</Badge>
                </div>
                <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">{grade.body}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {variant === 'full' && (
        <Card>
          <CardHeader title={s.peerSet.title} description={s.peerSet.description} />
          <div className={tableClass.wrap}>
            <table className={clsx(tableClass.table, 'min-w-[520px]')}>
              <thead>
                <tr>
                  <th className={tableClass.th}>{s.peerSet.cols.peer}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{s.peerSet.cols.value}</th>
                  <th className={tableClass.th}>{s.peerSet.cols.position}</th>
                </tr>
              </thead>
              <tbody>
                {peerRows.map(row => {
                  const q = quartileOf(row.value);
                  return (
                    <tr key={row.key} className={clsx(tableClass.tr, row.you && 'bg-zinc-50')}>
                      <td className={clsx(tableClass.td, 'whitespace-nowrap', row.you ? 'font-semibold text-zinc-900' : 'text-zinc-700')}>{row.label}</td>
                      <td className={clsx(tableClass.td, 'text-right tabular whitespace-nowrap', row.you ? 'font-semibold text-zinc-900' : 'text-zinc-700')}>
                        {num(row.value)} <span className="text-xs text-zinc-400 font-normal">{metricCopy.unit}</span>
                      </td>
                      <td className={tableClass.td}><Badge tone={QUARTILE_TONE[q]}>{s.peerSet.quartile[q]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader icon={Lightbulb} title={variant === 'full' ? s.insight.title : s.insight.titleShort} className="mb-3" />
        <div className="space-y-2 text-sm text-zinc-700 leading-relaxed sm:pl-11">
          <p className="font-medium text-zinc-900">{summary}</p>
          <p>{fmt(youBetter ? s.insight.better : s.insight.behind, { value: num(youBetter ? d.best : d.q1) })}</p>
          {variant === 'full' && (
            <p>{fmt(s.insight.confidence, { grade: d.provenance, use: grade.use })}</p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function BenchmarkLab() {
  const s = useStrings(benchmarkLabStrings);
  const { region } = useWorkspace();
  return (
    <div>
      <PageHeader title={s.title} description={region.id === 'cn' ? s.descriptionCn : s.description} />
      <BenchmarkPanel variant="full" />
    </div>
  );
}
