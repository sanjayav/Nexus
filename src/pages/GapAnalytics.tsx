import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { AlertTriangle, CheckCircle2, Target, TrendingUp } from 'lucide-react'

// Mock data for gap analysis
const frameworkGaps = [
  { framework: 'GRI', required: 100, covered: 86, gap: 14, priority: 'High' },
  { framework: 'MSX', required: 100, covered: 72, gap: 28, priority: 'Critical' },
  { framework: 'IFRS S1', required: 100, covered: 64, gap: 36, priority: 'Critical' },
  { framework: 'IFRS S2', required: 100, covered: 58, gap: 42, priority: 'Critical' },
]

const disclosureGaps = [
  { category: 'Governance', covered: 13, missing: 2, total: 15 },
  { category: 'Strategy', covered: 22, missing: 49, total: 71 },
  { category: 'Risk Mgmt', covered: 18, missing: 2, total: 20 },
  { category: 'Metrics', covered: 0, missing: 43, total: 43 },
]

const gapTrends = [
  { month: 'Jun', gaps: 156, resolved: 23 },
  { month: 'Jul', gaps: 142, resolved: 28 },
  { month: 'Aug', gaps: 128, resolved: 35 },
  { month: 'Sep', gaps: 115, resolved: 41 },
  { month: 'Oct', gaps: 98, resolved: 49 },
  { month: 'Nov', gaps: 84, resolved: 56 },
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
  {
    id: 1,
    title: 'Complete IFRS S2 Climate Risk Disclosures',
    framework: 'IFRS S2',
    priority: 'Critical',
    dueDate: '2025-12-15',
    owner: 'Sustainability Team',
    status: 'In Progress',
  },
  {
    id: 2,
    title: 'MSX DMA Material Topic Coverage',
    framework: 'MSX',
    priority: 'Critical',
    dueDate: '2025-11-30',
    owner: 'Risk Management',
    status: 'Not Started',
  },
  {
    id: 3,
    title: 'GRI Metrics & Targets Section',
    framework: 'GRI',
    priority: 'High',
    dueDate: '2025-12-01',
    owner: 'Data Analytics',
    status: 'In Progress',
  },
  {
    id: 4,
    title: 'Strategy Disclosure Enhancement',
    framework: 'Multiple',
    priority: 'High',
    dueDate: '2025-12-10',
    owner: 'Strategy Team',
    status: 'Planning',
  },
]

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'emerald',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  trend?: { value: number; direction: 'up' | 'down' }
  color?: string
}) {
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    red: 'text-red-400 bg-red-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm text-slate-400 mb-1">{title}</div>
          <div className="text-3xl font-bold text-slate-100 mb-1">{value}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
          {trend && (
            <div
              className={`mt-2 inline-flex items-center gap-1 text-xs ${
                trend.direction === 'down' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              <TrendingUp
                className={`h-3 w-3 ${trend.direction === 'down' ? 'rotate-180' : ''}`}
              />
              {Math.abs(trend.value)}% vs last month
            </div>
          )}
        </div>
        <div className={`rounded-xl p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

export default function GapAnalytics() {
  const totalGaps = frameworkGaps.reduce((sum, f) => sum + f.gap, 0)
  const avgCoverage = Math.round(
    frameworkGaps.reduce((sum, f) => sum + f.covered, 0) / frameworkGaps.length
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Gap Analysis</h1>
        <p className="text-sm text-slate-400">
          Identify and track disclosure gaps across all frameworks
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gaps"
          value={totalGaps}
          subtitle="Across all frameworks"
          icon={AlertTriangle}
          color="red"
          trend={{ value: 14, direction: 'down' }}
        />
        <StatCard
          title="Average Coverage"
          value={`${avgCoverage}%`}
          subtitle="All frameworks"
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Critical Gaps"
          value={42}
          subtitle="Requiring immediate action"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Resolved This Month"
          value={56}
          subtitle="+14% from last month"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Framework Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Framework Coverage</h3>
            <p className="text-xs text-slate-400">Coverage vs gaps by framework</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frameworkGaps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="framework" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="covered" fill="#00D48E" name="Covered" />
                <Bar dataKey="gap" fill="#ef4444" name="Gaps" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Gap Priority Distribution</h3>
            <p className="text-xs text-slate-400">Breakdown by severity level</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Disclosure Category Gaps */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Disclosure Category Analysis</h3>
          <p className="text-xs text-slate-400">Coverage status by disclosure category</p>
        </div>
        <div className="space-y-4">
          {disclosureGaps.map((item) => {
            const percentage = Math.round((item.covered / item.total) * 100)
            return (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-slate-300">{item.category}</div>
                  <div className="text-xs text-slate-400">
                    {item.covered}/{item.total} ({percentage}%)
                  </div>
                </div>
                <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {item.missing > 0 && (
                  <div className="mt-1 text-xs text-red-400">
                    {item.missing} disclosure{item.missing > 1 ? 's' : ''} missing
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Gap Trends & Maturity Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Gap Resolution Trends</h3>
            <p className="text-xs text-slate-400">Monthly gap resolution progress</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="gaps" fill="#f97316" name="Open Gaps" />
                <Bar dataKey="resolved" fill="#00D48E" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Maturity Assessment</h3>
            <p className="text-xs text-slate-400">Current vs target maturity levels</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={maturityLevels}>
                <PolarGrid stroke="#1f2937" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <PolarRadiusAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Target"
                  dataKey="target"
                  stroke="#00D48E"
                  fill="#00D48E"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Priority Action Items</h3>
          <p className="text-xs text-slate-400">High-priority gaps requiring attention</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                  Framework
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {actionItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-sm text-slate-300">{item.title}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-300 border border-blue-500/20">
                      {item.framework}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border ${
                        item.priority === 'Critical'
                          ? 'bg-red-500/10 text-red-300 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{item.dueDate}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{item.owner}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border ${
                        item.status === 'In Progress'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : item.status === 'Not Started'
                          ? 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

