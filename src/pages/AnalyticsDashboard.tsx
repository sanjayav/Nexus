import { useState } from 'react';
import { BarChart3, Target, FileCheck, AlertTriangle, TrendingUp, Award, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type AnalyticsTab = 'compliance' | 'gaps' | 'evidence' | 'kris' | 'performance' | 'benchmark';

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('compliance');

  const tabs = [
    { id: 'compliance' as const, label: 'Compliance', icon: FileCheck },
    { id: 'gaps' as const, label: 'Gap Analysis', icon: AlertTriangle },
    { id: 'evidence' as const, label: 'Evidence Health', icon: Shield },
    { id: 'kris' as const, label: 'KRIs (Data Quality)', icon: Target },
    { id: 'performance' as const, label: 'Performance', icon: TrendingUp },
    { id: 'benchmark' as const, label: 'Benchmark Lab', icon: Award },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-sm text-gray-400">
          Comprehensive analytics across compliance, gaps, evidence, data quality, and performance
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'compliance' && <ComplianceView />}
      {activeTab === 'gaps' && <GapsRedirect />}
      {activeTab === 'evidence' && <EvidenceHealthView />}
      {activeTab === 'kris' && <KRIsView />}
      {activeTab === 'performance' && <PerformanceView />}
      {activeTab === 'benchmark' && <BenchmarkRedirect />}
    </div>
  );
}

function ComplianceView() {
  const frameworkData = [
    { framework: 'GRI', total: 45, complete: 38, coverage: 84 },
    { framework: 'IFRS S1', total: 28, complete: 22, coverage: 79 },
    { framework: 'IFRS S2', total: 32, complete: 28, coverage: 88 },
    { framework: 'MSX', total: 18, complete: 15, coverage: 83 },
    { framework: 'China ESG', total: 24, complete: 20, coverage: 83 },
  ];

  const topicData = [
    { topic: 'GHG Emissions', coverage: 95, color: '#10b981' },
    { topic: 'Energy', coverage: 88, color: '#3b82f6' },
    { topic: 'Water', coverage: 82, color: '#06b6d4' },
    { topic: 'Health & Safety', coverage: 90, color: '#f59e0b' },
    { topic: 'Diversity', coverage: 75, color: '#a855f7' },
    { topic: 'Governance', coverage: 85, color: '#6366f1' },
  ];

  const buData = [
    { name: 'Asia Pacific', coverage: 88 },
    { name: 'Europe', coverage: 92 },
    { name: 'North America', coverage: 85 },
    { name: 'Latin America', coverage: 78 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Overall Coverage</p>
          <p className="text-3xl font-bold text-white">86%</p>
          <p className="text-xs text-emerald-400 mt-2">↗ +4% from last period</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Complete Disclosures</p>
          <p className="text-3xl font-bold text-white">123 / 147</p>
          <p className="text-xs text-gray-400 mt-2">24 remaining</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Material Topics</p>
          <p className="text-3xl font-bold text-white">14 / 18</p>
          <p className="text-xs text-amber-400 mt-2">4 pending DMA</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Frameworks Active</p>
          <p className="text-3xl font-bold text-white">5</p>
          <p className="text-xs text-gray-400 mt-2">GRI, IFRS, MSX, China</p>
        </div>
      </div>

      {/* Coverage by Framework */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <h3 className="text-lg font-bold text-white mb-4">Coverage by Framework</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-dark-border text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Framework</th>
                <th className="px-4 py-3 text-left">Total Disclosures</th>
                <th className="px-4 py-3 text-left">Complete</th>
                <th className="px-4 py-3 text-left">Coverage %</th>
                <th className="px-4 py-3 text-left">Progress</th>
              </tr>
            </thead>
            <tbody>
              {frameworkData.map((row) => (
                <tr key={row.framework} className="border-b border-dark-border/60">
                  <td className="px-4 py-3 font-medium text-white">{row.framework}</td>
                  <td className="px-4 py-3 text-gray-300">{row.total}</td>
                  <td className="px-4 py-3 text-gray-300">{row.complete}</td>
                  <td className="px-4 py-3 text-white font-medium">{row.coverage}%</td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${row.coverage}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Coverage by Topic */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-bold text-white mb-4">Coverage by Topic</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" domain={[0, 100]} stroke="#888" />
                <YAxis type="category" dataKey="topic" stroke="#888" width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="coverage" radius={[0, 8, 8, 0]}>
                  {topicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coverage by BU */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-bold text-white mb-4">Coverage by Business Unit</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis domain={[0, 100]} stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="coverage" fill="#00D48E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function GapsRedirect() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Gap Analysis Dashboard</h2>
        <p className="text-gray-400 mb-6">View detailed gap analysis with heatmaps and remediation plans</p>
        <Link
          to="/analytics/gaps"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors"
        >
          Go to Gap Analysis
        </Link>
      </div>
    </div>
  );
}

function EvidenceHealthView() {
  const evidenceData = [
    { name: 'Jan', reuse: 45, orphaned: 12, expiring: 3 },
    { name: 'Feb', reuse: 52, orphaned: 10, expiring: 2 },
    { name: 'Mar', reuse: 58, orphaned: 8, expiring: 4 },
    { name: 'Apr', reuse: 63, orphaned: 6, expiring: 2 },
    { name: 'May', reuse: 67, orphaned: 8, expiring: 2 },
    { name: 'Jun', reuse: 70, orphaned: 5, expiring: 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Total Evidence Files</p>
          <p className="text-3xl font-bold text-white">487</p>
          <p className="text-xs text-emerald-400 mt-2">↗ +24 this month</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Reuse Rate</p>
          <p className="text-3xl font-bold text-white">67%</p>
          <p className="text-xs text-emerald-400 mt-2">↗ +12% from last period</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Orphaned Files</p>
          <p className="text-3xl font-bold text-white">8</p>
          <p className="text-xs text-amber-400 mt-2">Not linked to any disclosure</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Expiring Soon</p>
          <p className="text-3xl font-bold text-white">2</p>
          <p className="text-xs text-rose-400 mt-2">Within 30 days</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <h3 className="text-lg font-bold text-white mb-4">Evidence Health Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evidenceData}>
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
              <Line type="monotone" dataKey="reuse" stroke="#10b981" strokeWidth={2} name="Reuse Rate %" />
              <Line type="monotone" dataKey="orphaned" stroke="#f59e0b" strokeWidth={2} name="Orphaned Files" />
              <Line type="monotone" dataKey="expiring" stroke="#ef4444" strokeWidth={2} name="Expiring Files" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evidence Coverage by Disclosure */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <h3 className="text-lg font-bold text-white mb-4">Evidence Coverage by Disclosure Type</h3>
        <div className="space-y-3">
          {[
            { type: 'GHG Emissions', coverage: 98, files: 45 },
            { type: 'Energy', coverage: 95, files: 38 },
            { type: 'Water', coverage: 92, files: 32 },
            { type: 'Health & Safety', coverage: 88, files: 28 },
            { type: 'Diversity', coverage: 82, files: 24 },
            { type: 'Governance', coverage: 90, files: 35 },
          ].map((row) => (
            <div key={row.type} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white">{row.type}</span>
                  <span className="text-sm font-medium text-gray-300">{row.coverage}% ({row.files} files)</span>
                </div>
                <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${row.coverage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KRIsView() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Unit Inconsistencies</p>
          <p className="text-3xl font-bold text-white">3</p>
          <p className="text-xs text-amber-400 mt-2">Requires normalization</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Missing Factors</p>
          <p className="text-3xl font-bold text-white">7</p>
          <p className="text-xs text-amber-400 mt-2">Emission factors needed</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Outliers Detected</p>
          <p className="text-3xl font-bold text-white">5</p>
          <p className="text-xs text-rose-400 mt-2">vs last year baseline</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Boundary Mismatches</p>
          <p className="text-3xl font-bold text-white">2</p>
          <p className="text-xs text-rose-400 mt-2">BU filtered but report is Group</p>
        </div>
      </div>

      {/* KRIs Table */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <h3 className="text-lg font-bold text-white mb-4">Data Quality Risk Indicators</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-dark-border text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Risk Type</th>
                <th className="px-4 py-3 text-left">Disclosure</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: 'Unit Inconsistency', disclosure: 'GRI 305-1', severity: 'Medium', desc: 'Mixed kg and tonne units in breakdown' },
                { type: 'Missing Factor', disclosure: 'GRI 305-2', severity: 'High', desc: 'No emission factor for electricity (Region 3)' },
                { type: 'Outlier', disclosure: 'GRI 302-1', severity: 'High', desc: 'Energy consumption +120% vs last year' },
                { type: 'Boundary Mismatch', disclosure: 'GRI 305-1', severity: 'Critical', desc: 'Report scope is Group but data filtered to BU' },
                { type: 'Missing Factor', disclosure: 'GRI 305-3', severity: 'Medium', desc: 'Transportation factor missing for air freight' },
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-dark-border/60 hover:bg-dark-bg/40 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{row.type}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{row.disclosure}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        row.severity === 'Critical'
                          ? 'bg-red-500/10 text-red-300 border border-red-500/40'
                          : row.severity === 'High'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/10 text-blue-300 border border-blue-500/40'
                      )}
                    >
                      {row.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{row.desc}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="px-3 py-1.5 rounded-full border border-dark-border text-xs text-gray-300 hover:border-accent hover:text-accent transition-colors">
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PerformanceView() {
  const performanceData = [
    { year: '2021', ghg: 12500, energy: 45000, water: 8200, injury: 2.1 },
    { year: '2022', ghg: 11800, energy: 43200, water: 7800, injury: 1.8 },
    { year: '2023', ghg: 10900, energy: 41000, water: 7400, injury: 1.5 },
    { year: '2024', ghg: 10200, energy: 39500, water: 7100, injury: 1.2 },
    { year: '2025', ghg: 9500, energy: 38000, water: 6800, injury: 0.8 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">GHG Emissions (tCO2e)</p>
          <p className="text-3xl font-bold text-white">9,500</p>
          <p className="text-xs text-emerald-400 mt-2">↓ 24% vs 2021 baseline</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Energy (MWh)</p>
          <p className="text-3xl font-bold text-white">38,000</p>
          <p className="text-xs text-emerald-400 mt-2">↓ 16% vs 2021 baseline</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Water (m³)</p>
          <p className="text-3xl font-bold text-white">6,800</p>
          <p className="text-xs text-emerald-400 mt-2">↓ 17% vs 2021 baseline</p>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <p className="text-sm text-gray-400 mb-2">Injury Rate (/100 emp)</p>
          <p className="text-3xl font-bold text-white">0.8</p>
          <p className="text-xs text-emerald-400 mt-2">↓ 62% vs 2021 baseline</p>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <h3 className="text-lg font-bold text-white mb-4">5-Year Performance Trends</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="year" stroke="#888" />
              <YAxis yAxisId="left" stroke="#888" />
              <YAxis yAxisId="right" orientation="right" stroke="#888" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="ghg" stroke="#10b981" strokeWidth={2} name="GHG (tCO2e)" />
              <Line yAxisId="left" type="monotone" dataKey="energy" stroke="#3b82f6" strokeWidth={2} name="Energy (MWh)" />
              <Line yAxisId="left" type="monotone" dataKey="water" stroke="#06b6d4" strokeWidth={2} name="Water (m³)" />
              <Line yAxisId="right" type="monotone" dataKey="injury" stroke="#f59e0b" strokeWidth={2} name="Injury Rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intensity Metrics */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <h3 className="text-lg font-bold text-white mb-4">Intensity Metrics (FY2025)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-dark-bg border border-dark-border rounded-xl">
            <p className="text-xs text-gray-400 mb-2">GHG Intensity</p>
            <p className="text-2xl font-bold text-white">42</p>
            <p className="text-xs text-gray-400 mt-1">tCO2e / RMB M revenue</p>
            <p className="text-xs text-emerald-400 mt-2">↓ 18% vs peer median</p>
          </div>
          <div className="p-4 bg-dark-bg border border-dark-border rounded-xl">
            <p className="text-xs text-gray-400 mb-2">Energy Intensity</p>
            <p className="text-2xl font-bold text-white">168</p>
            <p className="text-xs text-gray-400 mt-1">MWh / RMB M revenue</p>
            <p className="text-xs text-emerald-400 mt-2">↓ 12% vs peer median</p>
          </div>
          <div className="p-4 bg-dark-bg border border-dark-border rounded-xl">
            <p className="text-xs text-gray-400 mb-2">Water Intensity</p>
            <p className="text-2xl font-bold text-white">30</p>
            <p className="text-xs text-gray-400 mt-1">m³ / RMB M revenue</p>
            <p className="text-xs text-emerald-400 mt-2">↓ 15% vs peer median</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenchmarkRedirect() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <Award className="w-16 h-16 text-accent mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Benchmark Lab</h2>
        <p className="text-gray-400 mb-6">Compare vs China + Global peers with provenance and confidence grades</p>
        <Link
          to="/analytics/benchmark"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors"
        >
          Go to Benchmark Lab
        </Link>
      </div>
    </div>
  );
}
