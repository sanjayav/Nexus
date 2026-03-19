import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, TrendingUp, FileQuestion, Filter } from 'lucide-react';
import clsx from 'clsx';

export default function GapAnalyticsDashboard() {
  const [view, setView] = useState<'table' | 'heatmap'>('table');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const gapData = [
    { disclosure: 'BRSR P5-E1', bu: 'Solar Division', site: 'Rajasthan 400MW', gapType: 'Missing Evidence', severity: 'Critical', owner: 'EHS Team', dueDate: '2025-12-05', status: 'Open' },
    { disclosure: 'GRI 305-2', bu: 'Wind Division', site: 'Gujarat 250MW', gapType: 'Validation Error', severity: 'High', owner: 'Sustainability', dueDate: '2025-12-08', status: 'In Progress' },
    { disclosure: 'GRI 403-9', bu: 'O&M', site: 'Tamil Nadu Hub', gapType: 'Missing Required Field', severity: 'Critical', owner: 'HR / Safety', dueDate: '2025-12-03', status: 'Open' },
    { disclosure: 'BRSR P3-E3', bu: 'Corporate', site: 'Mumbai HQ', gapType: 'Incomplete Data', severity: 'Medium', owner: 'HR', dueDate: '2025-12-10', status: 'Open' },
    { disclosure: 'IFRS S2-1', bu: 'Solar Division', site: 'Karnataka 200MW', gapType: 'Incomplete Data', severity: 'Critical', owner: 'Finance', dueDate: '2025-12-04', status: 'Open' },
    { disclosure: 'GRI 302-1', bu: 'Wind Division', site: 'Andhra Pradesh 180MW', gapType: 'Missing Evidence', severity: 'High', owner: 'Facilities', dueDate: '2025-12-06', status: 'Open' },
    { disclosure: 'BRSR P8-L1', bu: 'CSR', site: 'Multi-site', gapType: 'Missing Required Field', severity: 'High', owner: 'CSR / Legal', dueDate: '2025-12-07', status: 'Open' },
    { disclosure: 'BRSR P9-E1', bu: 'Corporate', site: 'Mumbai HQ', gapType: 'Missing Evidence', severity: 'Medium', owner: 'Compliance', dueDate: '2025-12-15', status: 'Open' },
    { disclosure: 'IFRS S2-2', bu: 'Strategy', site: 'Corporate', gapType: 'Validation Error', severity: 'High', owner: 'Finance / Risk', dueDate: '2025-12-09', status: 'Open' },
    { disclosure: 'MSX-DMA', bu: 'Corporate', site: 'Mumbai HQ', gapType: 'Not Started', severity: 'Critical', owner: 'Risk Mgmt', dueDate: '2025-11-30', status: 'Open' },
  ];

  const filteredGaps = severityFilter ? gapData.filter(g => g.severity === severityFilter) : gapData;

  const topGaps = gapData
    .filter(g => g.status === 'Open' && g.severity === 'Critical')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const heatmapBUs = ['Solar Division', 'Wind Division', 'O&M', 'Corporate'];
  const heatmapTopics = ['GHG Emissions', 'Energy', 'Health & Safety', 'BRSR Principles', 'Governance', 'RE Metrics'];
  const heatmapData: Record<string, Record<string, number>> = {
    'Solar Division': { 'GHG Emissions': 2, 'Energy': 1, 'Health & Safety': 0, 'BRSR Principles': 1, 'Governance': 0, 'RE Metrics': 1 },
    'Wind Division': { 'GHG Emissions': 1, 'Energy': 2, 'Health & Safety': 0, 'BRSR Principles': 0, 'Governance': 1, 'RE Metrics': 0 },
    'O&M': { 'GHG Emissions': 0, 'Energy': 0, 'Health & Safety': 3, 'BRSR Principles': 0, 'Governance': 0, 'RE Metrics': 1 },
    'Corporate': { 'GHG Emissions': 0, 'Energy': 0, 'Health & Safety': 0, 'BRSR Principles': 2, 'Governance': 1, 'RE Metrics': 0 },
  };

  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700';
    if (count === 1) return 'bg-amber-500/10 border-amber-500/20 text-amber-700';
    if (count === 2) return 'bg-orange-500/10 border-orange-500/20 text-orange-700';
    return 'bg-rose-500/10 border-rose-500/20 text-rose-700';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight">Gap Engine</h1>
          <p className="text-sm text-black/60 mt-2 font-medium tracking-wide">Actionable gap table with severity rules, heatmaps by BU/Site, and remediation workflow</p>
        </div>
        <div className="flex items-center gap-2">
          {(['table', 'heatmap'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={clsx("px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all", view === v ? "bg-black text-white border-black" : "bg-white border-black/10 text-black/60 hover:border-black/30")}>{v === 'table' ? 'Gap Table' : 'Heatmap'}</button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-rose-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-xl"><AlertTriangle className="w-5 h-5 text-rose-600" /></div>
            <div><p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Critical</p><p className="text-3xl font-bold tracking-tighter text-black">{gapData.filter(g => g.severity === 'Critical').length}</p></div>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl"><FileQuestion className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">High Priority</p><p className="text-3xl font-bold tracking-tighter text-black">{gapData.filter(g => g.severity === 'High').length}</p></div>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl"><TrendingUp className="w-5 h-5 text-indigo-600" /></div>
            <div><p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">In Progress</p><p className="text-3xl font-bold tracking-tighter text-black">{gapData.filter(g => g.status === 'In Progress').length}</p></div>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Resolved This Week</p><p className="text-3xl font-bold tracking-tighter text-black">14</p></div>
          </div>
        </div>
      </div>

      {/* Top Gaps */}
      <div className="bg-[#12C87A]/5 border border-[#12C87A]/20 rounded-[2rem] p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-[#013328] uppercase tracking-widest">Critical Gaps — Immediate Action</h3>
            <p className="text-xs text-black/50 mt-1">Sorted by due date</p>
          </div>
          <button className="px-5 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-black/20">Assign All</button>
        </div>
        <div className="space-y-3">
          {topGaps.map((gap, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl hover:shadow-md transition-all">
              <div className="flex items-center gap-4 flex-1">
                <div className="text-xs font-mono text-black/30 font-bold w-6">#{idx + 1}</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-black">{gap.disclosure} — {gap.gapType}</p>
                  <p className="text-xs text-black/50 mt-0.5">{gap.bu} / {gap.site}</p>
                </div>
                <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Due: {gap.dueDate}</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">{gap.severity}</span>
              </div>
              <button className="ml-4 p-2 rounded-xl border border-black/10 text-black/40 hover:border-black/30 hover:text-black transition-colors"><ArrowRight className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Table View */}
      {view === 'table' && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-4">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest opacity-80">All Gaps</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-black/30" />
              {['Critical', 'High', 'Medium'].map((s) => (
                <button key={s} onClick={() => setSeverityFilter(severityFilter === s ? null : s)} className={clsx("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all", severityFilter === s ? "bg-black text-white border-black" : "bg-white border-black/10 text-black/50 hover:border-black/30")}>{s}</button>
              ))}
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/10 text-[10px] font-bold text-black/40 uppercase tracking-widest">
                <th className="pb-4">Disclosure</th><th className="pb-4">BU / Site</th><th className="pb-4">Gap Type</th><th className="pb-4">Severity</th><th className="pb-4">Owner</th><th className="pb-4">Due</th><th className="pb-4">Status</th><th className="pb-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredGaps.map((gap, idx) => (
                <tr key={idx} className="hover:bg-white/40 transition-colors">
                  <td className="py-4 font-mono text-sm font-bold text-black">{gap.disclosure}</td>
                  <td className="py-4"><div className="text-xs font-bold text-black/80">{gap.bu}</div><div className="text-[10px] text-black/40">{gap.site}</div></td>
                  <td className="py-4 text-xs text-black/60 font-medium">{gap.gapType}</td>
                  <td className="py-4"><span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border", gap.severity === 'Critical' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : gap.severity === 'High' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20')}>{gap.severity}</span></td>
                  <td className="py-4 text-xs text-black/50 font-medium">{gap.owner}</td>
                  <td className="py-4 text-xs text-black/50 font-medium">{gap.dueDate}</td>
                  <td className="py-4"><span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border", gap.status === 'Open' ? 'bg-black/5 text-black/50 border-black/10' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20')}>{gap.status}</span></td>
                  <td className="py-4 text-right"><button className="px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:scale-105 transition-transform shadow-md">Resolve</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Heatmap View */}
      {view === 'heatmap' && (
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Gap Heatmap: Business Unit x Topic</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-black/40 uppercase tracking-widest">BU</th>
                    {heatmapTopics.map((topic) => (<th key={topic} className="px-4 py-3 text-center text-[10px] font-bold text-black/40 uppercase tracking-widest">{topic}</th>))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {heatmapBUs.map((bu) => (
                    <tr key={bu}>
                      <td className="px-4 py-3 font-bold text-sm text-black">{bu}</td>
                      {heatmapTopics.map((topic) => {
                        const count = heatmapData[bu]?.[topic] || 0;
                        return (
                          <td key={topic} className="px-4 py-3">
                            <div className={clsx("w-full h-14 flex items-center justify-center rounded-xl border text-lg font-bold", getHeatColor(count))}>{count}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-6 text-[10px] font-bold text-black/40 uppercase tracking-widest">
              <span>Legend:</span>
              {[{ label: '0 gaps', color: 'bg-emerald-500/10 border-emerald-500/20' }, { label: '1 gap', color: 'bg-amber-500/10 border-amber-500/20' }, { label: '2 gaps', color: 'bg-orange-500/10 border-orange-500/20' }, { label: '3+ gaps', color: 'bg-rose-500/10 border-rose-500/20' }].map((l) => (
                <div key={l.label} className="flex items-center gap-2"><div className={clsx("w-4 h-4 rounded border", l.color)} /><span>{l.label}</span></div>
              ))}
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Site Evidence Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { site: 'Rajasthan 400MW Solar', items: [{ type: 'Emissions Data', status: 'Missing' }, { type: 'REC Certificates', status: 'OK' }, { type: 'CPCB Consent', status: 'OK' }] },
                { site: 'Gujarat 250MW Wind', items: [{ type: 'Emissions Data', status: 'OK' }, { type: 'Generation Logs', status: 'Pending' }, { type: 'Safety Audit', status: 'OK' }] },
                { site: 'Tamil Nadu O&M Hub', items: [{ type: 'Emissions Data', status: 'OK' }, { type: 'Incident Reports', status: 'Missing' }, { type: 'Training Records', status: 'OK' }] },
                { site: 'Karnataka 200MW Solar', items: [{ type: 'IFRS S2 Climate', status: 'Missing' }, { type: 'Grid Factor FY25', status: 'Pending' }, { type: 'Generation Logs', status: 'OK' }] },
                { site: 'AP 180MW Wind', items: [{ type: 'Energy Data', status: 'Missing' }, { type: 'Land Consent', status: 'OK' }, { type: 'Biodiversity', status: 'OK' }] },
                { site: 'Mumbai HQ', items: [{ type: 'CSR Report', status: 'Pending' }, { type: 'Board Minutes', status: 'OK' }, { type: 'BRSR Filing', status: 'Pending' }] },
              ].map((s) => (
                <div key={s.site} className="p-5 bg-white/40 border border-white/60 rounded-2xl">
                  <p className="text-xs font-bold text-black uppercase tracking-widest mb-3">{s.site}</p>
                  <div className="space-y-2">
                    {s.items.map((item) => (
                      <div key={item.type} className="flex items-center justify-between text-xs">
                        <span className="text-black/50 font-medium">{item.type}</span>
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold border", item.status === 'OK' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : item.status === 'Missing' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20')}>{item.status}</span>
                      </div>
                    ))}
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
