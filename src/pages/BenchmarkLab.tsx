import { useState } from 'react';
import { TrendingUp, TrendingDown, Shield, Award, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';

export default function BenchmarkLab() {
  const [peerGroup, setPeerGroup] = useState<'china-listed' | 'china-industry' | 'global-industry'>('china-listed');
  const [metric, setMetric] = useState<'emissions' | 'injury' | 'water' | 'diversity'>('emissions');
  const [normalization, setNormalization] = useState<'revenue' | 'tonne' | 'employee'>('revenue');

  const peerGroupLabels = {
    'china-listed': 'China Listed Peers',
    'china-industry': 'China Industry (Manufacturing)',
    'global-industry': 'Global Industry (Manufacturing)',
  };

  const metricLabels = {
    emissions: 'Emissions Intensity (tCO2e / RMB M)',
    injury: 'Injury Rate (per 100 employees)',
    water: 'Water Intensity (m³ / RMB M)',
    diversity: 'Board Diversity (% women)',
  };

  const benchmarkData = {
    'china-listed': {
      emissions: { you: 42, median: 58, best: 28, q1: 45, q3: 72, provenance: 'A', trend: -8 },
      injury: { you: 0.8, median: 1.2, best: 0.4, q1: 0.9, q3: 1.5, provenance: 'B', trend: -12 },
      water: { you: 125, median: 180, best: 90, q1: 140, q3: 220, provenance: 'A', trend: -15 },
      diversity: { you: 32, median: 28, best: 45, q1: 22, q3: 35, provenance: 'B', trend: +5 },
    },
    'china-industry': {
      emissions: { you: 42, median: 62, best: 30, q1: 48, q3: 78, provenance: 'A', trend: -6 },
      injury: { you: 0.8, median: 1.4, best: 0.5, q1: 1.0, q3: 1.8, provenance: 'B', trend: -10 },
      water: { you: 125, median: 195, best: 95, q1: 150, q3: 240, provenance: 'A', trend: -12 },
      diversity: { you: 32, median: 25, best: 40, q1: 20, q3: 32, provenance: 'B', trend: +8 },
    },
    'global-industry': {
      emissions: { you: 42, median: 52, best: 22, q1: 38, q3: 65, provenance: 'A', trend: -10 },
      injury: { you: 0.8, median: 1.0, best: 0.3, q1: 0.7, q3: 1.3, provenance: 'C', trend: -15 },
      water: { you: 125, median: 165, best: 75, q1: 120, q3: 210, provenance: 'B', trend: -18 },
      diversity: { you: 32, median: 35, best: 50, q1: 28, q3: 42, provenance: 'C', trend: +3 },
    },
  };

  const currentData = benchmarkData[peerGroup][metric];

  const chartData = [
    { name: 'Best', value: currentData.best, color: '#10b981' },
    { name: 'Q1', value: currentData.q1, color: '#3b82f6' },
    { name: 'You', value: currentData.you, color: '#00D48E' },
    { name: 'Median', value: currentData.median, color: '#6b7280' },
    { name: 'Q3', value: currentData.q3, color: '#f59e0b' },
  ];

  const getProvenanceBadge = (grade: string) => {
    if (grade === 'A') return { color: 'emerald', label: 'Grade A — High Confidence' };
    if (grade === 'B') return { color: 'blue', label: 'Grade B — Medium Confidence' };
    return { color: 'amber', label: 'Grade C — Limited Data' };
  };

  const provenanceBadge = getProvenanceBadge(currentData.provenance);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Benchmark Lab</h1>
        <p className="text-sm text-gray-400">
          Compare vs China + Global peers with provenance, confidence grades, and normalization options
        </p>
      </div>

      {/* Peer Group Selector */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Peer Group</h3>
        <div className="flex gap-3">
          {(['china-listed', 'china-industry', 'global-industry'] as const).map((group) => (
            <button
              key={group}
              onClick={() => setPeerGroup(group)}
              className={clsx(
                'px-4 py-3 rounded-xl font-medium border transition-all text-left flex-1',
                peerGroup === group
                  ? 'bg-accent/10 text-accent border-accent'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
              )}
            >
              <div className="text-sm">{peerGroupLabels[group]}</div>
              <div className="text-xs text-gray-500 mt-1">
                {group === 'china-listed' && '~45 companies'}
                {group === 'china-industry' && '~120 companies'}
                {group === 'global-industry' && '~350 companies'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Metric Selector */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Select Metric</h3>
        <div className="grid grid-cols-4 gap-3">
          {(['emissions', 'injury', 'water', 'diversity'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={clsx(
                'px-4 py-3 rounded-xl font-medium border transition-all text-left',
                metric === m
                  ? 'bg-accent/10 text-accent border-accent'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
              )}
            >
              <div className="text-sm">{metricLabels[m]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Normalization Options */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Normalization</h3>
        <div className="flex gap-3">
          {(['revenue', 'tonne', 'employee'] as const).map((norm) => (
            <button
              key={norm}
              onClick={() => setNormalization(norm)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                normalization === norm
                  ? 'bg-accent/10 text-accent border-accent'
                  : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
              )}
            >
              {norm === 'revenue' && 'Per RMB Revenue'}
              {norm === 'tonne' && 'Per Tonne Output'}
              {norm === 'employee' && 'Per Employee'}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Performance vs Peers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-dark-bg border border-dark-border rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Your Performance vs Median:</span>
              <span
                className={clsx(
                  'flex items-center gap-1 font-bold',
                  currentData.trend < 0 ? 'text-emerald-400' : 'text-amber-400'
                )}
              >
                {currentData.trend < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    {Math.abs(currentData.trend)}% better
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    {currentData.trend}% higher
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Key Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Your Value:</span>
                <span className="text-2xl font-bold text-white">{currentData.you}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Peer Median:</span>
                <span className="text-xl font-medium text-gray-300">{currentData.median}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Best in Class:</span>
                <span className="text-xl font-medium text-emerald-400">{currentData.best}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Quartile 1 (Top 25%):</span>
                <span className="text-lg text-gray-400">{currentData.q1}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Quartile 3 (Bottom 25%):</span>
                <span className="text-lg text-gray-400">{currentData.q3}</span>
              </div>
            </div>
          </div>

          <div className={clsx(
            'border rounded-2xl p-6',
            provenanceBadge.color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20' :
            provenanceBadge.color === 'blue' ? 'bg-blue-500/5 border-blue-500/20' :
            'bg-amber-500/5 border-amber-500/20'
          )}>
            <div className="flex items-center gap-3 mb-2">
              <Shield className={clsx(
                'w-5 h-5',
                provenanceBadge.color === 'emerald' ? 'text-emerald-400' :
                provenanceBadge.color === 'blue' ? 'text-blue-400' :
                'text-amber-400'
              )} />
              <h3 className={clsx(
                'text-sm font-bold',
                provenanceBadge.color === 'emerald' ? 'text-emerald-300' :
                provenanceBadge.color === 'blue' ? 'text-blue-300' :
                'text-amber-300'
              )}>
                Provenance & Confidence
              </h3>
            </div>
            <p className={clsx(
              'text-sm mb-3',
              provenanceBadge.color === 'emerald' ? 'text-emerald-300' :
              provenanceBadge.color === 'blue' ? 'text-blue-300' :
              'text-amber-300'
            )}>
              {provenanceBadge.label}
            </p>
            <p className="text-xs text-gray-400">
              {currentData.provenance === 'A' && 'Data sourced from verified ESG reports with full audit trails. High confidence in comparability.'}
              {currentData.provenance === 'B' && 'Data sourced from public disclosures with moderate verification. Good comparability with some normalization assumptions.'}
              {currentData.provenance === 'C' && 'Data sourced from limited public sources. Lower confidence; use for directional insights only.'}
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <Award className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold text-white">Insights & Recommendations</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            ✓ <strong>Your performance is {Math.abs(currentData.trend)}% {currentData.trend < 0 ? 'better' : 'worse'} than the peer median</strong> for {metricLabels[metric]}.
          </p>
          {currentData.trend < 0 ? (
            <p>
              ✓ You are performing well compared to {peerGroupLabels[peerGroup]}. Consider sharing best practices internally and targeting the "Best in Class" benchmark of {currentData.best}.
            </p>
          ) : (
            <p>
              ⚠ There is room for improvement. Review leading peers' methodologies and consider setting a target to reach the Q1 benchmark ({currentData.q1}) within the next reporting cycle.
            </p>
          )}
          <p>
            ✓ Data confidence grade: <strong>{currentData.provenance}</strong>. {currentData.provenance === 'A' ? 'High reliability for leadership reporting and external communication.' : currentData.provenance === 'B' ? 'Suitable for internal analysis and trend tracking.' : 'Use with caution; consider expanding data sources.'}
          </p>
        </div>
      </div>
    </div>
  );
}

