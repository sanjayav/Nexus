import { useState } from 'react';
import { Shield, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '12px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  color: '#000',
  fontWeight: 'bold' as const,
  fontSize: '12px',
};

export default function BenchmarkLab() {
  const [peerGroup, setPeerGroup] = useState<'india' | 'gcc' | 'global'>('india');
  const [metric, setMetric] = useState<'emissions' | 'safety' | 'water' | 'diversity' | 'capacity'>('emissions');
  const [normalization, setNormalization] = useState<'revenue' | 'mw' | 'employee'>('revenue');

  const peerGroupLabels = {
    india: 'India NSE/BSE Peers (BRSR Listed)',
    gcc: 'GCC Listed Peers (MSX/ADX/Tadawul)',
    global: 'Global Renewables',
  };

  const metricLabels = {
    emissions: 'Emissions Intensity (tCO2e / Cr Revenue)',
    safety: 'LTIFR (per 200K hours)',
    water: 'Water Intensity (ML / Cr Revenue)',
    diversity: 'Board Diversity (% women)',
    capacity: 'Capacity Factor (%)',
  };

  const benchmarkData: Record<string, Record<string, { you: number; median: number; best: number; q1: number; q3: number; provenance: string; trend: number }>> = {
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

  const currentData = benchmarkData[peerGroup][metric];
  const isLowerBetter = metric !== 'diversity' && metric !== 'capacity';
  const youBetter = isLowerBetter ? currentData.you < currentData.median : currentData.you > currentData.median;

  const chartData = [
    { name: 'Best', value: currentData.best, color: '#12C87A' },
    { name: 'Q1', value: currentData.q1, color: '#3b82f6' },
    { name: 'You', value: currentData.you, color: '#000000' },
    { name: 'Median', value: currentData.median, color: '#6b7280' },
    { name: 'Q3', value: currentData.q3, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">Benchmark Lab</h1>
        <p className="text-sm text-black/60 mt-2 font-medium tracking-wide">
          Compare vs India, GCC, and Global renewable energy peers with provenance grades and normalization
        </p>
      </div>

      {/* Peer Group */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
        <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Peer Group</p>
        <div className="flex gap-3">
          {(['india', 'gcc', 'global'] as const).map((g) => (
            <button key={g} onClick={() => setPeerGroup(g)} className={clsx("flex-1 px-4 py-3 rounded-xl text-sm font-bold border transition-all text-left", peerGroup === g ? "bg-black text-white border-black scale-[1.02]" : "bg-white border-black/10 text-black/70 hover:border-black/30")}>
              <div>{peerGroupLabels[g]}</div>
              <div className={clsx("text-[10px] mt-1", peerGroup === g ? "opacity-50" : "text-black/40")}>{g === 'india' ? '~80 companies' : g === 'gcc' ? '~40 companies' : '~200 companies'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Metric */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
        <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Select Metric</p>
        <div className="grid grid-cols-5 gap-3">
          {(['emissions', 'safety', 'water', 'diversity', 'capacity'] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)} className={clsx("px-4 py-3 rounded-xl text-xs font-bold border transition-all text-left", metric === m ? "bg-black text-white border-black" : "bg-white border-black/10 text-black/70 hover:border-black/30")}>{metricLabels[m]}</button>
          ))}
        </div>
      </div>

      {/* Normalization */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
        <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Normalization</p>
        <div className="flex gap-3">
          {(['revenue', 'mw', 'employee'] as const).map((n) => (
            <button key={n} onClick={() => setNormalization(n)} className={clsx("px-5 py-2.5 rounded-xl text-xs font-bold border transition-all", normalization === n ? "bg-black text-white border-black" : "bg-white border-black/10 text-black/60 hover:border-black/30")}>
              {n === 'revenue' ? 'Per ₹ Cr Revenue' : n === 'mw' ? 'Per MW Installed' : 'Per Employee'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Performance vs Peers</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.6)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)', fontWeight: 'bold' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={36}>
                  {chartData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-black/5 border border-black/5 rounded-xl flex items-center justify-between text-sm">
            <span className="text-black/50 font-bold text-xs uppercase tracking-widest">Your vs Median</span>
            <span className={clsx("font-bold text-sm flex items-center gap-1", youBetter ? "text-emerald-600" : "text-amber-600")}>
              {youBetter ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {Math.abs(currentData.trend)}% {youBetter ? 'better' : 'behind'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-4 opacity-80">Key Statistics</h3>
            <div className="space-y-4">
              {[
                { label: 'Your Value', val: currentData.you, bold: true },
                { label: 'Peer Median', val: currentData.median },
                { label: 'Best in Class', val: currentData.best, green: true },
                { label: 'Top 25% (Q1)', val: currentData.q1 },
                { label: 'Bottom 25% (Q3)', val: currentData.q3 },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-black/50 uppercase tracking-widest">{s.label}</span>
                  <span className={clsx("text-lg font-bold", s.bold ? "text-black" : s.green ? "text-emerald-600" : "text-black/60")}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={clsx("border rounded-[2rem] p-6 shadow-lg", currentData.provenance === 'A' ? "bg-emerald-500/5 border-emerald-500/20" : currentData.provenance === 'B' ? "bg-blue-500/5 border-blue-500/20" : "bg-amber-500/5 border-amber-500/20")}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className={clsx("w-5 h-5", currentData.provenance === 'A' ? "text-emerald-600" : currentData.provenance === 'B' ? "text-blue-600" : "text-amber-600")} />
              <span className={clsx("text-sm font-bold", currentData.provenance === 'A' ? "text-emerald-700" : currentData.provenance === 'B' ? "text-blue-700" : "text-amber-700")}>
                Provenance Grade {currentData.provenance} — {currentData.provenance === 'A' ? 'High Confidence' : currentData.provenance === 'B' ? 'Medium Confidence' : 'Limited Data'}
              </span>
            </div>
            <p className="text-xs text-black/50">
              {currentData.provenance === 'A' ? 'Data from verified ESG reports with full audit trails. High comparability.' : currentData.provenance === 'B' ? 'Public disclosures with moderate verification. Good comparability.' : 'Limited public sources. Use for directional insights only.'}
            </p>
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="bg-[#12C87A]/5 border border-[#12C87A]/20 rounded-[2rem] p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-[#12C87A]" />
          <h3 className="text-sm font-bold text-[#013328]">Insights & Recommendations</h3>
        </div>
        <div className="space-y-2 text-sm text-black/70">
          <p>Your <strong>{metricLabels[metric].split('(')[0].trim()}</strong> is <strong>{Math.abs(currentData.trend)}% {youBetter ? 'better' : 'behind'}</strong> vs {peerGroupLabels[peerGroup]} median.</p>
          {youBetter
            ? <p>You are outperforming peers. Target the "Best in Class" benchmark ({currentData.best}) to reach top-quartile performance.</p>
            : <p>Review leading peers' methodologies. Target the Q1 benchmark ({currentData.q1}) within the next reporting cycle.</p>
          }
          <p>Data confidence grade: <strong>{currentData.provenance}</strong>. {currentData.provenance === 'A' ? 'High reliability for leadership reporting and external communication.' : currentData.provenance === 'B' ? 'Suitable for internal analysis and trend tracking.' : 'Use with caution; consider expanding data sources.'}</p>
        </div>
      </div>
    </div>
  );
}
