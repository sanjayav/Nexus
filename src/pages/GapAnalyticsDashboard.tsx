import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle, XCircle, FileQuestion, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

export default function GapAnalyticsDashboard() {
  const [view, setView] = useState<'table' | 'heatmap'>('table');

  const gapData = [
    { disclosure: 'GRI 305-1', bu: 'Asia Pacific', site: 'Shanghai Plant', gapType: 'Missing Evidence', severity: 'Critical', owner: 'Operations Team', dueDate: '2025-12-05', status: 'Open' },
    { disclosure: 'GRI 305-2', bu: 'Europe', site: 'Berlin Office', gapType: 'Validation Error', severity: 'High', owner: 'Sustainability', dueDate: '2025-12-08', status: 'In Progress' },
    { disclosure: 'GRI 403-9', bu: 'North America', site: 'NYC HQ', gapType: 'Missing Required Field', severity: 'Critical', owner: 'HR / Safety', dueDate: '2025-12-03', status: 'Open' },
    { disclosure: 'GRI 405-1', bu: 'Asia Pacific', site: 'Tokyo Office', gapType: 'Incomplete Data', severity: 'Medium', owner: 'HR', dueDate: '2025-12-10', status: 'Open' },
    { disclosure: 'GRI 302-1', bu: 'Europe', site: 'Paris Office', gapType: 'Missing Evidence', severity: 'High', owner: 'Facilities', dueDate: '2025-12-06', status: 'Open' },
    { disclosure: 'GRI 305-3', bu: 'North America', site: 'SF Office', gapType: 'Validation Error', severity: 'Medium', owner: 'Sustainability', dueDate: '2025-12-12', status: 'In Progress' },
    { disclosure: 'GRI 2-7', bu: 'Asia Pacific', site: 'Mumbai Office', gapType: 'Missing Required Field', severity: 'High', owner: 'HR', dueDate: '2025-12-07', status: 'Open' },
    { disclosure: 'GRI 2-27', bu: 'Europe', site: 'London Office', gapType: 'Missing Evidence', severity: 'Medium', owner: 'Legal / Compliance', dueDate: '2025-12-15', status: 'Open' },
    { disclosure: 'IFRS S2-1', bu: 'North America', site: 'LA Office', gapType: 'Incomplete Data', severity: 'Critical', owner: 'Finance', dueDate: '2025-12-04', status: 'Open' },
    { disclosure: 'IFRS S2-2', bu: 'Asia Pacific', site: 'Singapore Office', gapType: 'Validation Error', severity: 'High', owner: 'Finance', dueDate: '2025-12-09', status: 'Open' },
  ];

  const topGaps = gapData
    .filter(g => g.status === 'Open' && g.severity === 'Critical')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  const heatmapBUs = ['Asia Pacific', 'Europe', 'North America'];
  const heatmapTopics = ['GHG Emissions', 'Energy', 'Health & Safety', 'Diversity', 'Governance'];

  const heatmapData: Record<string, Record<string, number>> = {
    'Asia Pacific': { 'GHG Emissions': 3, 'Energy': 1, 'Health & Safety': 0, 'Diversity': 2, 'Governance': 1 },
    'Europe': { 'GHG Emissions': 2, 'Energy': 2, 'Health & Safety': 0, 'Diversity': 0, 'Governance': 1 },
    'North America': { 'GHG Emissions': 1, 'Energy': 0, 'Health & Safety': 1, 'Diversity': 0, 'Governance': 1 },
  };

  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
    if (count === 1) return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
    if (count === 2) return 'bg-orange-500/30 border-orange-500/40 text-orange-300';
    return 'bg-red-500/40 border-red-500/50 text-red-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Gap Analysis</h1>
          <p className="text-sm text-gray-400">
            Actionable gap table with severity rules, heatmaps by BU/Site/Topic, and auto remediation plan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('table')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
              view === 'table'
                ? 'bg-accent/10 text-accent border-accent'
                : 'bg-dark-surface border-dark-border text-gray-400 hover:border-gray-500'
            )}
          >
            Gap Table
          </button>
          <button
            onClick={() => setView('heatmap')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
              view === 'heatmap'
                ? 'bg-accent/10 text-accent border-accent'
                : 'bg-dark-surface border-dark-border text-gray-400 hover:border-gray-500'
            )}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Critical Gaps</p>
              <p className="text-2xl font-bold text-white">{gapData.filter(g => g.severity === 'Critical').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <FileQuestion className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-white">{gapData.filter(g => g.severity === 'High').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-white">{gapData.filter(g => g.status === 'In Progress').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Resolved This Week</p>
              <p className="text-2xl font-bold text-white">14</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auto Remediation Plan */}
      <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Top 10 Gaps to Close This Week</h3>
            <p className="text-xs text-gray-400 mt-1">Critical gaps sorted by due date</p>
          </div>
          <button className="px-4 py-2 bg-accent text-dark-bg rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
            Assign All
          </button>
        </div>
        <div className="space-y-2">
          {topGaps.map((gap, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-dark-surface border border-dark-border rounded-xl hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-sm font-mono text-gray-500">#{idx + 1}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{gap.disclosure} — {gap.gapType}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{gap.bu} / {gap.site}</div>
                </div>
                <div className="text-xs text-gray-400">Due: {gap.dueDate}</div>
                <span
                  className={clsx(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    'bg-red-500/10 text-red-300 border border-red-500/40'
                  )}
                >
                  {gap.severity}
                </span>
              </div>
              <button className="ml-4 p-2 rounded-full border border-dark-border text-gray-400 hover:border-accent hover:text-accent transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Gap Table View */}
      {view === 'table' && (
        <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-dark-bg border-b border-dark-border text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Disclosure</th>
                <th className="px-4 py-3 text-left">BU / Site</th>
                <th className="px-4 py-3 text-left">Gap Type</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {gapData.map((gap, idx) => (
                <tr
                  key={idx}
                  className="border-b border-dark-border/60 hover:bg-dark-bg/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-white">{gap.disclosure}</td>
                  <td className="px-4 py-3">
                    <div className="text-white text-xs">{gap.bu}</div>
                    <div className="text-gray-400 text-xs">{gap.site}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{gap.gapType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        gap.severity === 'Critical'
                          ? 'bg-red-500/10 text-red-300 border border-red-500/40'
                          : gap.severity === 'High'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-500/10 text-blue-300 border border-blue-500/40'
                      )}
                    >
                      {gap.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{gap.owner}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{gap.dueDate}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        gap.status === 'Open'
                          ? 'bg-gray-500/10 text-gray-300 border border-gray-500/40'
                          : 'bg-blue-500/10 text-blue-300 border border-blue-500/40'
                      )}
                    >
                      {gap.status}
                    </span>
                  </td>
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
      )}

      {/* Heatmap View */}
      {view === 'heatmap' && (
        <div className="space-y-6">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Gap Heatmap: BU × Topic</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">BU</th>
                    {heatmapTopics.map((topic) => (
                      <th key={topic} className="px-4 py-3 text-center text-sm font-semibold text-gray-400">
                        {topic}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapBUs.map((bu) => (
                    <tr key={bu} className="border-b border-dark-border/60">
                      <td className="px-4 py-3 font-medium text-white">{bu}</td>
                      {heatmapTopics.map((topic) => {
                        const count = heatmapData[bu][topic] || 0;
                        return (
                          <td key={topic} className="px-4 py-3">
                            <div
                              className={clsx(
                                'w-full h-12 flex items-center justify-center rounded-lg border text-lg font-bold',
                                getHeatColor(count)
                              )}
                            >
                              {count}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs text-gray-400">
              <span>Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-500/20"></div>
                <span>0 gaps</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/30"></div>
                <span>1 gap</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-500/30 border border-orange-500/40"></div>
                <span>2 gaps</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/40 border border-red-500/50"></div>
                <span>3+ gaps</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Evidence Status Heatmap: Site × Evidence Type</h3>
            <p className="text-sm text-gray-400 mb-4">Shows count of missing/incomplete evidence per site</p>
            <div className="grid grid-cols-3 gap-4">
              {['Shanghai Plant', 'Berlin Office', 'NYC HQ', 'Tokyo Office', 'Paris Office', 'SF Office'].map((site) => (
                <div key={site} className="p-4 bg-dark-bg border border-dark-border rounded-xl">
                  <div className="text-sm font-medium text-white mb-2">{site}</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Emissions Data</span>
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full',
                        site === 'Shanghai Plant' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                      )}>
                        {site === 'Shanghai Plant' ? 'Missing' : 'OK'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Certificates</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">OK</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Audit Reports</span>
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full',
                        site === 'Berlin Office' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      )}>
                        {site === 'Berlin Office' ? 'Pending' : 'OK'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

