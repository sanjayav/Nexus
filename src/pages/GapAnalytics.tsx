import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { AlertTriangle, CheckCircle2, Target } from 'lucide-react'
import clsx from 'clsx'

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '12px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  color: '#000',
  fontWeight: 'bold' as const,
  fontSize: '12px',
};

const frameworkGaps = [
  { framework: 'GRI', required: 100, covered: 86, gap: 14, priority: 'High' },
  { framework: 'MSX', required: 100, covered: 72, gap: 28, priority: 'Critical' },
  { framework: 'IFRS S1', required: 100, covered: 64, gap: 36, priority: 'Critical' },
  { framework: 'IFRS S2', required: 100, covered: 58, gap: 42, priority: 'Critical' },
  { framework: 'BRSR Core', required: 100, covered: 88, gap: 12, priority: 'Medium' },
]

const disclosureGaps = [
  { category: 'Governance', covered: 13, missing: 2, total: 15 },
  { category: 'Strategy', covered: 22, missing: 49, total: 71 },
  { category: 'Risk Mgmt', covered: 18, missing: 2, total: 20 },
  { category: 'Metrics', covered: 0, missing: 43, total: 43 },
]

const gapTrends = [
  { month: 'Jun', gaps: 156, resolved: 23 }, { month: 'Jul', gaps: 142, resolved: 28 },
  { month: 'Aug', gaps: 128, resolved: 35 }, { month: 'Sep', gaps: 115, resolved: 41 },
  { month: 'Oct', gaps: 98, resolved: 49 }, { month: 'Nov', gaps: 84, resolved: 56 },
]

const priorityDistribution = [
  { name: 'Critical', value: 42, color: '#ef4444' },
  { name: 'High', value: 28, color: '#f97316' },
  { name: 'Medium', value: 14, color: '#fbbf24' },
]

const maturityLevels = [
  { subject: 'Data Collection', current: 85, target: 95 },
  { subject: 'Verification', current: 72, target: 90 },
  { subject: 'Documentation', current: 68, target: 85 },
  { subject: 'Automation', current: 45, target: 80 },
  { subject: 'Compliance', current: 78, target: 95 },
  { subject: 'Reporting', current: 82, target: 90 },
]

const actionItems = [
  { id: 1, title: 'Complete IFRS S2 Climate Risk Disclosures', framework: 'IFRS S2', priority: 'Critical', dueDate: '2025-12-15', owner: 'Sustainability Team', status: 'In Progress' },
  { id: 2, title: 'BRSR P5 Scope 3 — Complete remaining categories', framework: 'BRSR Core', priority: 'High', dueDate: '2025-12-20', owner: 'CSO / EHS', status: 'In Progress' },
  { id: 3, title: 'MSX DMA Material Topic Coverage', framework: 'MSX', priority: 'Critical', dueDate: '2025-11-30', owner: 'Risk Management', status: 'Not Started' },
  { id: 4, title: 'BRSR Leadership Indicators (P4, P7, P9)', framework: 'BRSR Core', priority: 'Medium', dueDate: '2025-12-25', owner: 'CSO', status: 'Planning' },
  { id: 5, title: 'GRI Metrics & Targets Section', framework: 'GRI', priority: 'High', dueDate: '2025-12-01', owner: 'Data Analytics', status: 'In Progress' },
  { id: 6, title: 'Strategy Disclosure Enhancement', framework: 'Multiple', priority: 'High', dueDate: '2025-12-10', owner: 'Strategy Team', status: 'Planning' },
]

export default function GapAnalytics() {
  const totalGaps = frameworkGaps.reduce((sum, f) => sum + f.gap, 0)
  const avgCoverage = Math.round(frameworkGaps.reduce((sum, f) => sum + f.covered, 0) / frameworkGaps.length)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">Gap Analysis</h1>
        <p className="text-sm text-black/60 mt-2 font-medium tracking-wide">Identify and track disclosure gaps across all frameworks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Gaps" value={totalGaps} subtitle="Across all frameworks" icon={AlertTriangle} color="rose" trend={{ value: 14, direction: 'down' }} />
        <StatCard title="Average Coverage" value={`${avgCoverage}%`} subtitle="All frameworks" icon={Target} color="indigo" />
        <StatCard title="Critical Gaps" value={42} subtitle="Requiring immediate action" icon={AlertTriangle} color="amber" />
        <StatCard title="Resolved This Month" value={56} subtitle="+14% from last month" icon={CheckCircle2} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Framework Coverage</h3>
          <div className="h-80">
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
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Priority Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value">
                  {priorityDistribution.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
        <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Disclosure Category Analysis</h3>
        <div className="space-y-5">
          {disclosureGaps.map((item) => {
            const pct = Math.round((item.covered / item.total) * 100)
            return (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-black">{item.category}</span>
                  <span className="text-xs font-bold text-black/40">{item.covered}/{item.total} ({pct}%)</span>
                </div>
                <div className="h-2.5 bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                {item.missing > 0 && <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase tracking-widest">{item.missing} disclosure{item.missing > 1 ? 's' : ''} missing</p>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Gap Resolution Trends</h3>
          <div className="h-64">
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

        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Maturity Assessment</h3>
          <div className="h-64">
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
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
        <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Priority Action Items</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-black/10 text-[10px] font-bold text-black/40 uppercase tracking-widest">
              <th className="pb-4">Action</th><th className="pb-4">Framework</th><th className="pb-4">Priority</th><th className="pb-4">Due</th><th className="pb-4">Owner</th><th className="pb-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {actionItems.map((item) => (
              <tr key={item.id} className="hover:bg-white/40 transition-colors">
                <td className="py-4 text-sm font-medium text-black/80">{item.title}</td>
                <td className="py-4"><span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-500/20">{item.framework}</span></td>
                <td className="py-4"><span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border", item.priority === 'Critical' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : item.priority === 'High' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20')}>{item.priority}</span></td>
                <td className="py-4 text-xs font-medium text-black/50">{item.dueDate}</td>
                <td className="py-4 text-xs font-medium text-black/50">{item.owner}</td>
                <td className="py-4"><span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border", item.status === 'In Progress' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : item.status === 'Not Started' ? 'bg-black/5 text-black/50 border-black/10' : 'bg-amber-500/10 text-amber-600 border-amber-500/20')}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'emerald' }: { title: string; value: string | number; subtitle?: string; icon: any; trend?: { value: number; direction: 'up' | 'down' }; color?: string }) {
  const colorMap: Record<string, string> = { emerald: 'text-emerald-600 bg-emerald-500/10', rose: 'text-rose-600 bg-rose-500/10', amber: 'text-amber-600 bg-amber-500/10', indigo: 'text-indigo-600 bg-indigo-500/10' }
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3">{title}</p>
          <p className="text-4xl font-bold tracking-tighter text-black">{value}</p>
          {subtitle && <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">{subtitle}</p>}
          {trend && <p className={clsx("mt-2 text-[10px] font-bold uppercase tracking-widest", trend.direction === 'down' ? 'text-emerald-600' : 'text-rose-600')}>{trend.direction === 'down' ? '↓' : '↑'} {Math.abs(trend.value)}% vs last month</p>}
        </div>
        <div className={clsx("rounded-xl p-3", colorMap[color] || colorMap.emerald)}><Icon className="h-6 w-6" /></div>
      </div>
    </div>
  )
}
