import { useState } from 'react';
import {
  Target, FileCheck, AlertTriangle, TrendingUp, Award, Shield,
  ArrowRight, Zap, Leaf, BarChart3, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '12px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  color: '#000',
  fontWeight: 'bold' as const,
  fontSize: '12px',
};

type AnalyticsTab = 'compliance' | 'gaps' | 'evidence' | 'kris' | 'performance' | 'benchmark';

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('compliance');

  const tabs = [
    { id: 'compliance' as const, label: 'Compliance', icon: FileCheck },
    { id: 'gaps' as const, label: 'Gap Analysis', icon: AlertTriangle },
    { id: 'evidence' as const, label: 'Evidence Health', icon: Shield },
    { id: 'kris' as const, label: 'Data Quality', icon: Target },
    { id: 'performance' as const, label: 'Performance', icon: TrendingUp },
    { id: 'benchmark' as const, label: 'Benchmark', icon: Award },
  ];

  const validationAlerts = [
    { type: 'warning' as const, message: 'GRI 302-1 Energy consumption is 79% higher than last year — are you sure it\'s correct?', metric: 'Energy' },
    { type: 'on_track' as const, message: 'GHG emissions on track for 2027 target (-29% vs baseline)', metric: 'GHG' },
  ]

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight">Analytics Studio</h1>
          <p className="text-sm text-black/60 mt-2 max-w-2xl font-medium tracking-wide">
            Compliance telemetry, gap resolution, evidence health, data quality, performance trends, and peer benchmarking.
          </p>
        </div>
      </div>

      {/* Validation Alerts (KEY ESG style) */}
      <div className="flex flex-wrap gap-3">
        {validationAlerts.map((a, i) => (
          <div
            key={i}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium',
              a.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-800'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
            )}
          >
            {a.type === 'warning' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <Target className="w-5 h-5 shrink-0" />}
            <span>{a.message}</span>
            <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', a.type === 'warning' ? 'bg-amber-500/20' : 'bg-emerald-500/20')}>
              {a.type === 'warning' ? 'Review' : 'On track'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-black/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-5 py-3 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                isActive ? "bg-black text-white" : "bg-transparent text-black/50 hover:bg-black/5"
              )}
            >
              <Icon className={clsx("w-4 h-4", isActive ? "text-white" : "text-black/40")} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 pb-12">
        {activeTab === 'compliance' && <ComplianceView />}
        {activeTab === 'gaps' && <GapAnalysisView />}
        {activeTab === 'evidence' && <EvidenceHealthView />}
        {activeTab === 'kris' && <KRIsView />}
        {activeTab === 'performance' && <PerformanceView />}
        {activeTab === 'benchmark' && <BenchmarkView />}
      </div>

      {/* Quick Links */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-3">Quick Links</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/dma" className="text-sm font-medium text-black/70 hover:text-black hover:underline">How does Nexus support CSRD / BRSR compliance?</Link>
          <Link to="/carbon" className="text-sm font-medium text-black/70 hover:text-black hover:underline">How does Nexus help with EDCI and GHG data submissions?</Link>
          <Link to="/ghg" className="text-sm font-medium text-black/70 hover:text-black hover:underline">How can I set targets and action plans to improve?</Link>
        </div>
      </div>
    </div>
  );
}

/* ─── COMPLIANCE TAB ─── */
function ComplianceView() {
  const frameworkData = [
    { framework: 'GRI', total: 45, complete: 38, coverage: 84 },
    { framework: 'IFRS S1', total: 28, complete: 22, coverage: 79 },
    { framework: 'IFRS S2', total: 32, complete: 28, coverage: 88 },
    { framework: 'MSX', total: 18, complete: 15, coverage: 83 },
    { framework: 'BRSR Core', total: 72, complete: 63, coverage: 88 },
    { framework: 'China ESG', total: 24, complete: 20, coverage: 83 },
  ];

  const topicData = [
    { topic: 'GHG Emissions', coverage: 95, color: '#000000' },
    { topic: 'RE Generation', coverage: 92, color: '#12C87A' },
    { topic: 'Energy', coverage: 88, color: '#3b82f6' },
    { topic: 'Health & Safety', coverage: 90, color: '#f59e0b' },
    { topic: 'Water', coverage: 82, color: '#06b6d4' },
    { topic: 'Governance', coverage: 85, color: '#6366f1' },
    { topic: 'Diversity', coverage: 75, color: '#a855f7' },
  ];

  const brsrPrinciples = [
    { p: 'P1 Ethics', pct: 100 }, { p: 'P2 Products', pct: 100 },
    { p: 'P3 Employees', pct: 92 }, { p: 'P5 Environ.', pct: 88 },
    { p: 'P6 Human Rights', pct: 100 }, { p: 'P8 CSR', pct: 85 },
    { p: 'P9 Customer', pct: 78 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Overall Coverage</p>
          <p className="text-4xl font-bold tracking-tighter text-black">86%</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">+4% vs last period</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Complete Disclosures</p>
          <p className="text-4xl font-bold tracking-tighter text-black">186 <span className="text-xl text-black/30">/ 219</span></p>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">33 Remaining</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Material Topics</p>
          <p className="text-4xl font-bold tracking-tighter text-black">14 <span className="text-xl text-black/30">/ 18</span></p>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">4 pending DMA</p>
        </div>
        <div className="bg-black text-white rounded-[2rem] p-6 shadow-xl shadow-black/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[40px]" />
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 relative z-10">Frameworks Active</p>
          <p className="text-4xl font-bold tracking-tighter text-white relative z-10">6</p>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1 relative z-10">GRI, IFRS, MSX, BRSR, China</p>
        </div>
        <div className="bg-[#12C87A]/10 border border-[#12C87A]/20 rounded-[2rem] p-6 shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="w-4 h-4 text-[#12C87A]" />
            <p className="text-[10px] font-bold text-[#013328] uppercase tracking-widest">BRSR Core</p>
          </div>
          <p className="text-4xl font-bold tracking-tighter text-[#013328]">88%</p>
          <p className="text-[10px] font-bold text-[#12C87A] uppercase tracking-widest mt-1">SEBI aligned — In Review</p>
        </div>
      </div>

      {/* BRSR Principle Scorecard */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-4">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest opacity-80">BRSR Core — Principle-wise Completion</h3>
          <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">SEBI NGRBC 9 Principles</span>
        </div>
        <div className="grid grid-cols-7 gap-4">
          {brsrPrinciples.map((p) => (
            <div key={p.p} className="text-center">
              <div className={clsx(
                "w-full aspect-square rounded-2xl flex items-center justify-center text-lg font-bold border mb-2",
                p.pct === 100 ? "bg-[#12C87A]/10 border-[#12C87A]/30 text-[#013328]"
                  : p.pct >= 85 ? "bg-amber-500/10 border-amber-500/20 text-amber-700"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-700"
              )}>
                {p.pct}%
              </div>
              <p className="text-[9px] font-bold text-black/50 uppercase tracking-widest leading-tight">{p.p}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Framework Coverage Table */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
        <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Coverage by Framework</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-black/10 text-[10px] font-bold text-black/40 uppercase tracking-widest">
              <th className="pb-4">Framework</th><th className="pb-4">Total</th><th className="pb-4">Complete</th><th className="pb-4">Coverage</th><th className="pb-4 w-1/4">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {frameworkData.map((row) => (
              <tr key={row.framework} className="hover:bg-white/40 transition-colors">
                <td className="py-4 font-bold text-black text-sm">{row.framework}</td>
                <td className="py-4 font-medium text-black/60 text-sm">{row.total}</td>
                <td className="py-4 font-medium text-black/60 text-sm">{row.complete}</td>
                <td className="py-4 font-bold text-black text-sm">{row.coverage}%</td>
                <td className="py-4"><div className="w-full bg-black/5 rounded-full h-2 overflow-hidden"><div className="h-full bg-black rounded-full" style={{ width: `${row.coverage}%` }} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Coverage by Topic */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
        <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 opacity-80 border-b border-black/5 pb-4">Coverage by Material Topic</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
              <YAxis type="category" dataKey="topic" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.8)', fontWeight: 'bold' }} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={tooltipStyle} />
              <Bar dataKey="coverage" radius={[0, 8, 8, 0]} barSize={16}>
                {topicData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─── GAP ANALYSIS TAB (inline) ─── */
function GapAnalysisView() {
  const frameworkGaps = [
    { framework: 'GRI', required: 100, covered: 86, gap: 14, priority: 'High' },
    { framework: 'MSX', required: 100, covered: 72, gap: 28, priority: 'Critical' },
    { framework: 'IFRS S1', required: 100, covered: 64, gap: 36, priority: 'Critical' },
    { framework: 'IFRS S2', required: 100, covered: 58, gap: 42, priority: 'Critical' },
    { framework: 'BRSR Core', required: 100, covered: 88, gap: 12, priority: 'Medium' },
  ];

  const gapTrends = [
    { month: 'Jun', gaps: 156, resolved: 23 }, { month: 'Jul', gaps: 142, resolved: 28 },
    { month: 'Aug', gaps: 128, resolved: 35 }, { month: 'Sep', gaps: 115, resolved: 41 },
    { month: 'Oct', gaps: 98, resolved: 49 }, { month: 'Nov', gaps: 84, resolved: 56 },
  ];

  const maturityLevels = [
    { subject: 'Data Collection', current: 85, target: 95 },
    { subject: 'Verification', current: 72, target: 90 },
    { subject: 'Documentation', current: 68, target: 85 },
    { subject: 'Automation', current: 45, target: 80 },
    { subject: 'Compliance', current: 78, target: 95 },
    { subject: 'Reporting', current: 82, target: 90 },
  ];

  const totalGaps = frameworkGaps.reduce((sum, f) => sum + f.gap, 0);
  const avgCoverage = Math.round(frameworkGaps.reduce((sum, f) => sum + f.covered, 0) / frameworkGaps.length);

  const actionItems = [
    { title: 'Complete IFRS S2 Climate Risk Disclosures', framework: 'IFRS S2', priority: 'Critical', dueDate: '2025-12-15', owner: 'Sustainability Team', status: 'In Progress' },
    { title: 'BRSR P5 Scope 3 — Complete remaining 6 categories', framework: 'BRSR Core', priority: 'High', dueDate: '2025-12-20', owner: 'CSO / EHS', status: 'In Progress' },
    { title: 'MSX DMA Material Topic Coverage', framework: 'MSX', priority: 'Critical', dueDate: '2025-11-30', owner: 'Risk Management', status: 'Not Started' },
    { title: 'BRSR Leadership Indicators (P4, P7, P9)', framework: 'BRSR Core', priority: 'Medium', dueDate: '2025-12-25', owner: 'CSO', status: 'Planning' },
    { title: 'GRI Metrics & Targets Section', framework: 'GRI', priority: 'High', dueDate: '2025-12-01', owner: 'Data Analytics', status: 'In Progress' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Total Gaps</p>
          <p className="text-4xl font-bold tracking-tighter text-black">{totalGaps}</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">-14% vs last month</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Avg Coverage</p>
          <p className="text-4xl font-bold tracking-tighter text-black">{avgCoverage}%</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Critical Gaps</p>
          <p className="text-4xl font-bold tracking-tighter text-black">42</p>
          <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Immediate action needed</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Resolved This Month</p>
          <p className="text-4xl font-bold tracking-tighter text-black">56</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">+14% from last month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Coverage vs Gaps by Framework</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frameworkGaps}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="framework" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.6)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)', fontWeight: 'bold' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="covered" fill="#12C87A" name="Covered" radius={[6, 6, 0, 0]} />
                <Bar dataKey="gap" fill="#ef4444" name="Gaps" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Gap Resolution Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)', fontWeight: 'bold' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="gaps" fill="#f97316" name="Open Gaps" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolved" fill="#12C87A" name="Resolved" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Maturity Radar */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
        <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Reporting Maturity Assessment</h3>
        <div className="h-72 max-w-xl mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={maturityLevels}>
              <PolarGrid stroke="rgba(0,0,0,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.6)', fontWeight: 'bold' }} />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.3)' }} />
              <Radar name="Current" dataKey="current" stroke="#000" fill="#000" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Target" dataKey="target" stroke="#12C87A" fill="#12C87A" fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 4" />
              <Legend />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
        <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Priority Action Items</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-black/10 text-[10px] font-bold text-black/40 uppercase tracking-widest">
              <th className="pb-4">Action</th><th className="pb-4">Framework</th><th className="pb-4">Priority</th><th className="pb-4">Due</th><th className="pb-4">Owner</th><th className="pb-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {actionItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-white/40 transition-colors">
                <td className="py-4 text-sm font-medium text-black/80">{item.title}</td>
                <td className="py-4"><span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">{item.framework}</span></td>
                <td className="py-4"><span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold border", item.priority === 'Critical' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : item.priority === 'High' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20')}>{item.priority}</span></td>
                <td className="py-4 text-xs font-medium text-black/50">{item.dueDate}</td>
                <td className="py-4 text-xs font-medium text-black/50">{item.owner}</td>
                <td className="py-4"><span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold border", item.status === 'In Progress' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : item.status === 'Not Started' ? 'bg-black/5 text-black/50 border-black/10' : 'bg-amber-500/10 text-amber-600 border-amber-500/20')}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 text-center">
          <Link to="/analytics/gaps" className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-black/20">
            Open Full Gap Engine <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── EVIDENCE HEALTH TAB ─── */
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Total Artifacts</p>
          <p className="text-4xl font-bold tracking-tighter text-black">487</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">+24 this month</p>
        </div>
        <div className="bg-black text-white rounded-[2rem] p-6 shadow-xl shadow-black/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px]" />
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 relative z-10">Vault Re-use Rate</p>
          <p className="text-4xl font-bold tracking-tighter text-white relative z-10">67%</p>
          <p className="text-[10px] font-bold text-indigo-300 uppercase mt-1 relative z-10">+12% vs last period</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Orphaned Files</p>
          <p className="text-4xl font-bold tracking-tighter text-black">8</p>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Not mapped to disclosures</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Expiring Evidence</p>
          <p className="text-4xl font-bold tracking-tighter text-black">2</p>
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-1">Within 30 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg lg:col-span-2">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 opacity-80 border-b border-black/5 pb-4">Vault Trajectory</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evidenceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="reuse" stroke="#000" strokeWidth={3} name="Reuse Rate %" dot={{ r: 4, fill: '#000' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="orphaned" stroke="#f59e0b" strokeWidth={2} name="Orphaned" dot={false} />
                <Line type="monotone" dataKey="expiring" stroke="#ef4444" strokeWidth={2} name="Expiring" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 opacity-80 border-b border-black/5 pb-4">Mapping Density</h3>
          <div className="space-y-5">
            {[
              { type: 'GHG Emissions', coverage: 98 }, { type: 'RE Generation', coverage: 96 },
              { type: 'Energy', coverage: 95 }, { type: 'Governance', coverage: 90 },
              { type: 'Health & Safety', coverage: 88 }, { type: 'Diversity', coverage: 82 },
              { type: 'Water', coverage: 72 }, { type: 'CSR / BRSR', coverage: 85 },
            ].map((row) => (
              <div key={row.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-black uppercase tracking-widest">{row.type}</span>
                  <span className="text-[10px] font-bold text-black/40">{row.coverage}%</span>
                </div>
                <div className="w-full bg-black/5 rounded-full h-1.5 overflow-hidden"><div className="h-full bg-black rounded-full" style={{ width: `${row.coverage}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DATA QUALITY TAB ─── */
function KRIsView() {
  const kris = [
    { type: 'Unit Inconsistency', disclosure: 'GRI 305-1', severity: 'Medium', desc: 'Mixed kg and tonne units in breakdown' },
    { type: 'Missing Factor', disclosure: 'GRI 305-2', severity: 'High', desc: 'No emission factor for electricity (Region 3)' },
    { type: 'Outlier', disclosure: 'GRI 302-1', severity: 'High', desc: 'Energy consumption +120% vs last year baseline' },
    { type: 'Boundary Mismatch', disclosure: 'GRI 305-1', severity: 'Critical', desc: 'Report scope is Group but data filtered to BU' },
    { type: 'Missing Factor', disclosure: 'BRSR P5', severity: 'Medium', desc: 'CEA grid factor FY25 not yet published — using FY24' },
    { type: 'Validation', disclosure: 'BRSR P8', severity: 'Low', desc: 'CSR % shows 105% of obligation — confirm intentional surplus' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Unit Inconsistencies</p>
          <p className="text-4xl font-bold tracking-tighter text-black">3</p>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Requires normalization</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Missing Factors</p>
          <p className="text-4xl font-bold tracking-tighter text-black">7</p>
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-1">Emission factors needed</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-indigo-500">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Outliers Detected</p>
          <p className="text-4xl font-bold tracking-tighter text-black">5</p>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">vs last baseline avg</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-rose-600">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Boundary Mismatches</p>
          <p className="text-4xl font-bold tracking-tighter text-black">2</p>
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-1">Scope discrepancies</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
        <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Data Quality Risk Indicators</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-black/10 text-[10px] font-bold text-black/40 uppercase tracking-widest">
              <th className="pb-4">Risk Vector</th><th className="pb-4">Disclosure</th><th className="pb-4">Severity</th><th className="pb-4">Anomaly</th><th className="pb-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {kris.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/40 transition-colors">
                <td className="py-4 font-bold text-black/80 text-xs">{row.type}</td>
                <td className="py-4 font-mono text-black/60 text-[10px] uppercase tracking-widest">{row.disclosure}</td>
                <td className="py-4"><span className={clsx('px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border', row.severity === 'Critical' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : row.severity === 'High' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : row.severity === 'Low' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20')}>{row.severity}</span></td>
                <td className="py-4 font-medium text-black/60 text-[11px]">{row.desc}</td>
                <td className="py-4 text-right"><button className="px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:scale-105 transition-transform shadow-md">Correct</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── PERFORMANCE TAB ─── */
function PerformanceView() {
  const performanceData = [
    { year: '2021', ghg: 8200, generation: 520000, avoidance: 415000, water: 620 },
    { year: '2022', ghg: 7100, generation: 640000, avoidance: 510000, water: 560 },
    { year: '2023', ghg: 6400, generation: 740000, avoidance: 590000, water: 510 },
    { year: '2024', ghg: 6140, generation: 820000, avoidance: 654000, water: 485 },
    { year: '2025', ghg: 5800, generation: 892000, avoidance: 712000, water: 450 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-black/40" /><p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">GHG (tCO2e)</p></div>
          <p className="text-4xl font-bold tracking-tighter text-black">5,800</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">-29% vs 2021 Baseline</p>
        </div>
        <div className="bg-[#12C87A]/10 border border-[#12C87A]/20 rounded-[2rem] p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-[#12C87A]" /><p className="text-[10px] font-bold text-[#013328] uppercase tracking-widest">Generation (MWh)</p></div>
          <p className="text-4xl font-bold tracking-tighter text-[#013328]">892K</p>
          <p className="text-[10px] font-bold text-[#12C87A] uppercase mt-1">+72% vs 2021</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3"><Leaf className="w-4 h-4 text-emerald-600" /><p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Carbon Avoidance</p></div>
          <p className="text-4xl font-bold tracking-tighter text-black">712K</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">tCO2e displaced (+72%)</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-cyan-600" /><p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Water (ML)</p></div>
          <p className="text-4xl font-bold tracking-tighter text-black">450</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">-27% vs 2021</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
        <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 opacity-80 border-b border-black/5 pb-4">5-Year Performance Trajectory</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="ghg" stroke="#000" strokeWidth={3} name="GHG (tCO2e)" dot={{ r: 4, fill: '#000' }} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="generation" stroke="#12C87A" strokeWidth={2} name="Generation (MWh)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="avoidance" stroke="#6366f1" strokeWidth={2} name="Carbon Avoidance (tCO2e)" dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intensity Model */}
      <div className="bg-black text-white rounded-[2rem] p-8 shadow-xl shadow-black/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#12C87A]/20 rounded-full blur-[80px] pointer-events-none" />
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 opacity-80 border-b border-white/10 pb-4 relative z-10">Economic & Operational Intensity (FY2025)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
          {[
            { label: 'GHG Intensity', value: '0.36', unit: 'tCO2e / Cr Revenue', trend: '-18% vs peer median' },
            { label: 'Generation Efficiency', value: '55', unit: 'MWh / MW Installed', trend: 'Capacity factor 22.6%' },
            { label: 'Carbon Multiplier', value: '123x', unit: 'Avoidance vs Footprint', trend: '712K avoided / 5.8K emitted' },
            { label: 'Water Intensity', value: '0.028', unit: 'ML / Cr Revenue', trend: '-15% vs peer median' },
          ].map((m) => (
            <div key={m.label} className="p-6 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">{m.label}</p>
              <p className="text-3xl font-bold text-white tracking-tighter">{m.value}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase mt-1 mb-3">{m.unit}</p>
              <div className="text-[10px] font-bold text-[#12C87A] uppercase bg-[#12C87A]/10 px-2 py-1 rounded inline-flex">{m.trend}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── BENCHMARK TAB (inline) ─── */
function BenchmarkView() {
  const [peerGroup, setPeerGroup] = useState<'india' | 'gcc' | 'global'>('india');
  const [metric, setMetric] = useState<'emissions' | 'safety' | 'water' | 'diversity' | 'capacity'>('emissions');

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
    <div className="space-y-6">
      {/* Peer Group */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
        <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Peer Group</p>
        <div className="flex gap-3">
          {(['india', 'gcc', 'global'] as const).map((g) => (
            <button key={g} onClick={() => setPeerGroup(g)} className={clsx("flex-1 px-4 py-3 rounded-xl text-sm font-bold border transition-all text-left", peerGroup === g ? "bg-black text-white border-black scale-[1.02]" : "bg-white border-black/10 text-black/70 hover:border-black/30")}>
              <div>{peerGroupLabels[g]}</div>
              <div className="text-[10px] opacity-50 mt-1">{g === 'india' ? '~80 companies' : g === 'gcc' ? '~40 companies' : '~200 companies'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Metric */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
        <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">Metric</p>
        <div className="grid grid-cols-5 gap-3">
          {(['emissions', 'safety', 'water', 'diversity', 'capacity'] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)} className={clsx("px-4 py-3 rounded-xl text-xs font-bold border transition-all text-left", metric === m ? "bg-black text-white border-black" : "bg-white border-black/10 text-black/70 hover:border-black/30")}>{metricLabels[m]}</button>
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
            <span className={clsx("font-bold text-sm", youBetter ? "text-emerald-600" : "text-amber-600")}>
              {Math.abs(currentData.trend)}% {youBetter ? 'better' : 'behind'}
            </span>
          </div>
        </div>

        {/* Stats + Provenance */}
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
                Grade {currentData.provenance} — {currentData.provenance === 'A' ? 'High Confidence' : currentData.provenance === 'B' ? 'Medium Confidence' : 'Limited Data'}
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
          <h3 className="text-sm font-bold text-[#013328]">Insight</h3>
        </div>
        <p className="text-sm text-black/70">
          Your {metricLabels[metric].split('(')[0].trim()} is <strong>{Math.abs(currentData.trend)}% {youBetter ? 'better' : 'behind'}</strong> vs {peerGroupLabels[peerGroup]} median.
          {youBetter
            ? ` You are outperforming peers. Target the "Best in Class" benchmark (${currentData.best}) to reach top-quartile.`
            : ` Review leading peers' methodologies. Target the Q1 benchmark (${currentData.q1}) within the next cycle.`}
        </p>
      </div>
    </div>
  );
}
