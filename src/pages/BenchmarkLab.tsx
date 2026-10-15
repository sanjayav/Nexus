import { useState } from 'react';
import { Shield, Lightbulb, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';
import { PageHeader, Card, CardHeader, Badge, Tabs, chartTheme, Tone } from '../components/ui';
import { fmt, useFormat, useStrings } from '../i18n';
import { benchmarkLabStrings } from '../i18n/pages/benchmarkLab';

type PeerGroup = 'india' | 'gcc' | 'global';
type Metric = 'emissions' | 'safety' | 'water' | 'diversity' | 'capacity';
type Normalization = 'revenue' | 'mw' | 'employee';
type Grade = 'A' | 'B' | 'C';
type Point = { you: number; median: number; best: number; q1: number; q3: number; provenance: Grade; trend: number };

const PEER_GROUPS: PeerGroup[] = ['india', 'gcc', 'global'];
const METRICS: Metric[] = ['emissions', 'safety', 'water', 'diversity', 'capacity'];
const NORMALIZATIONS: Normalization[] = ['revenue', 'mw', 'employee'];

const BENCHMARK_DATA: Record<PeerGroup, Record<Metric, Point>> = {
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

/**
 * Peer benchmarking panel. Used standalone on /analytics/benchmark (variant "full")
 * and inside the Analytics studio benchmark tab (variant "compact": no normalisation, short insight).
 */
export function BenchmarkPanel({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const s = useStrings(benchmarkLabStrings);
  const f = useFormat();
  const [peerGroup, setPeerGroup] = useState<PeerGroup>('india');
  const [metric, setMetric] = useState<Metric>('emissions');
  const [normalization, setNormalization] = useState<Normalization>('revenue');

  const d = BENCHMARK_DATA[peerGroup][metric];
  const isLowerBetter = metric !== 'diversity' && metric !== 'capacity';
  const youBetter = isLowerBetter ? d.you < d.median : d.you > d.median;
  const pct = f.percent(Math.abs(d.trend));
  const num = (n: number) => f.number(n, { maximumFractionDigits: 3 });
  const metricCopy = s.metrics[metric];
  const grade = s.provenance[d.provenance];

  const chartData = [
    { key: 'best', name: s.chart.bars.best, value: d.best, color: chartTheme.series[1] },
    { key: 'q1', name: s.chart.bars.q1, value: d.q1, color: '#D4D4D8' },
    { key: 'you', name: s.chart.bars.you, value: d.you, color: chartTheme.series[0] },
    { key: 'median', name: s.chart.bars.median, value: d.median, color: '#A1A1AA' },
    { key: 'q3', name: s.chart.bars.q3, value: d.q3, color: '#D4D4D8' },
  ];

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
              {PEER_GROUPS.map(g => {
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
              <Tabs value={metric} onChange={setMetric} items={METRICS.map(m => ({ value: m, label: s.metrics[m].label }))} />
            </div>
            {variant === 'full' && (
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-zinc-500 mb-2">{s.normalization}</div>
                <Tabs value={normalization} onChange={setNormalization} items={NORMALIZATIONS.map(n => ({ value: n, label: s.norms[n] }))} />
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
                { label: s.stats.best, val: d.best, cls: 'text-emerald-600 font-semibold' },
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
              <span className={clsx('font-medium tabular', youBetter ? 'text-emerald-600' : 'text-amber-600')}>
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
  return (
    <div>
      <PageHeader title={s.title} description={s.description} />
      <BenchmarkPanel variant="full" />
    </div>
  );
}
