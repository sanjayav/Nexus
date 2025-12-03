import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts'
import { Calendar, Clock, FileCheck, Activity, CheckCircle } from 'lucide-react'

// Mock data for reporting year analytics
const monthlyProgress = [
  { month: 'Jan', completion: 5, target: 8, submissions: 3, approvals: 2 },
  { month: 'Feb', completion: 12, target: 17, submissions: 8, approvals: 6 },
  { month: 'Mar', completion: 23, target: 25, submissions: 12, approvals: 11 },
  { month: 'Apr', completion: 35, target: 33, submissions: 15, approvals: 13 },
  { month: 'May', completion: 48, target: 42, submissions: 18, approvals: 16 },
  { month: 'Jun', completion: 58, target: 50, submissions: 21, approvals: 19 },
  { month: 'Jul', completion: 67, target: 58, submissions: 25, approvals: 23 },
  { month: 'Aug', completion: 76, target: 67, submissions: 28, approvals: 26 },
  { month: 'Sep', completion: 84, target: 75, submissions: 31, approvals: 29 },
  { month: 'Oct', completion: 90, target: 83, submissions: 34, approvals: 32 },
  { month: 'Nov', completion: 95, target: 92, submissions: 37, approvals: 35 },
  { month: 'Dec', completion: 100, target: 100, submissions: 40, approvals: 38 },
]

const quarterlyBreakdown = [
  {
    quarter: 'Q1 2025',
    dataCollection: 85,
    validation: 78,
    approval: 72,
    publication: 65,
  },
  {
    quarter: 'Q2 2025',
    dataCollection: 92,
    validation: 88,
    approval: 82,
    publication: 75,
  },
  {
    quarter: 'Q3 2025',
    dataCollection: 95,
    validation: 90,
    approval: 86,
    publication: 80,
  },
  {
    quarter: 'Q4 2025',
    dataCollection: 45,
    validation: 38,
    approval: 28,
    publication: 15,
  },
]

const moduleProgress = [
  { module: 'GRI', completion: 86, onTrack: true, lastUpdate: '2025-11-10', submissions: 24 },
  { module: 'MSX', completion: 72, onTrack: true, lastUpdate: '2025-11-08', submissions: 18 },
  { module: 'IFRS S1', completion: 64, onTrack: false, lastUpdate: '2025-11-05', submissions: 15 },
  { module: 'IFRS S2', completion: 58, onTrack: false, lastUpdate: '2025-11-03', submissions: 12 },
]

const teamActivity = [
  { team: 'Sustainability', tasks: 45, completed: 38, inProgress: 5, pending: 2 },
  { team: 'Finance', tasks: 32, completed: 28, inProgress: 3, pending: 1 },
  { team: 'Operations', tasks: 28, completed: 22, inProgress: 4, pending: 2 },
  { team: 'Risk Mgmt', tasks: 24, completed: 20, inProgress: 3, pending: 1 },
  { team: 'HR', tasks: 18, completed: 15, inProgress: 2, pending: 1 },
]

const milestones = [
  {
    id: 1,
    name: 'Data Collection Complete',
    date: '2025-03-31',
    status: 'completed',
    completion: 100,
  },
  {
    id: 2,
    name: 'Mid-Year Review',
    date: '2025-06-30',
    status: 'completed',
    completion: 100,
  },
  {
    id: 3,
    name: 'Draft Report Ready',
    date: '2025-09-30',
    status: 'completed',
    completion: 100,
  },
  {
    id: 4,
    name: 'Final Approvals',
    date: '2025-11-30',
    status: 'in-progress',
    completion: 75,
  },
  {
    id: 5,
    name: 'Publication',
    date: '2025-12-31',
    status: 'pending',
    completion: 0,
  },
]

const cycleTime = [
  { phase: 'Collection', avgDays: 12, target: 14 },
  { phase: 'Validation', avgDays: 8, target: 7 },
  { phase: 'Review', avgDays: 5, target: 5 },
  { phase: 'Approval', avgDays: 4, target: 3 },
  { phase: 'Publishing', avgDays: 2, target: 2 },
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
  trend?: string
  color?: string
}) {
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm text-slate-400 mb-1">{title}</div>
          <div className="text-3xl font-bold text-slate-100 mb-1">{value}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
          {trend && <div className="mt-2 text-xs text-emerald-400">{trend}</div>}
        </div>
        <div className={`rounded-xl p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

export default function ReportingYearAnalytics() {
  const currentMonth = 11 // November
  const completionRate = monthlyProgress[currentMonth - 1].completion

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Reporting Year Analytics</h1>
        <p className="text-sm text-slate-400">
          Track progress and performance throughout the reporting cycle (FY2025)
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Completion"
          value={`${completionRate}%`}
          subtitle="FY2025 Progress"
          icon={Activity}
          trend="On track for Dec 31st deadline"
          color="emerald"
        />
        <StatCard
          title="Days Remaining"
          value={50}
          subtitle="Until year-end deadline"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Total Submissions"
          value={156}
          subtitle="Across all frameworks"
          icon={FileCheck}
          trend="+12 this week"
          color="purple"
        />
        <StatCard
          title="Avg Cycle Time"
          value="31 days"
          subtitle="Collection to publication"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Progress Tracking */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Year-to-Date Progress</h3>
          <p className="text-xs text-slate-400">
            Actual completion vs target across the reporting year
          </p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyProgress}>
              <defs>
                <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D48E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D48E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #1f2937',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="completion"
                stroke="#00D48E"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompletion)"
                name="Actual Completion %"
              />
              <Area
                type="monotone"
                dataKey="target"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorTarget)"
                name="Target %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quarterly Breakdown & Module Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Quarterly Workflow Status</h3>
            <p className="text-xs text-slate-400">Progress through reporting stages by quarter</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="quarter" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="dataCollection" fill="#3b82f6" name="Data Collection" />
                <Bar dataKey="validation" fill="#8b5cf6" name="Validation" />
                <Bar dataKey="approval" fill="#f59e0b" name="Approval" />
                <Bar dataKey="publication" fill="#00D48E" name="Publication" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Module Progress</h3>
            <p className="text-xs text-slate-400">Completion status by framework</p>
          </div>
          <div className="space-y-4">
            {moduleProgress.map((module) => (
              <div key={module.module} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-300">{module.module}</div>
                    <div className="text-xs text-slate-500">
                      {module.submissions} submissions • Updated {module.lastUpdate}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{module.completion}%</span>
                    {module.onTrack ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-400" />
                    )}
                  </div>
                </div>
                <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all duration-300 ${
                      module.onTrack
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-amber-500 to-amber-400'
                    }`}
                    style={{ width: `${module.completion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submission Activity & Cycle Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Monthly Submission Activity</h3>
            <p className="text-xs text-slate-400">Submissions and approvals over time</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyProgress}>
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
                <Bar dataKey="submissions" fill="#3b82f6" name="Submissions" />
                <Line
                  type="monotone"
                  dataKey="approvals"
                  stroke="#00D48E"
                  strokeWidth={2}
                  name="Approvals"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Average Cycle Time by Phase</h3>
            <p className="text-xs text-slate-400">Actual vs target duration (days)</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleTime} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis type="category" dataKey="phase" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="avgDays" fill="#8b5cf6" name="Actual Days" />
                <Bar dataKey="target" fill="#1f2937" name="Target Days" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Milestones & Team Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Key Milestones</h3>
            <p className="text-xs text-slate-400">Major reporting year deliverables</p>
          </div>
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60"
              >
                <div
                  className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    milestone.status === 'completed'
                      ? 'bg-emerald-400'
                      : milestone.status === 'in-progress'
                      ? 'bg-amber-400'
                      : 'bg-slate-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-slate-300">{milestone.name}</div>
                    <div className="text-xs text-slate-500">{milestone.date}</div>
                  </div>
                  <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full transition-all ${
                        milestone.status === 'completed'
                          ? 'bg-emerald-400'
                          : milestone.status === 'in-progress'
                          ? 'bg-amber-400'
                          : 'bg-slate-600'
                      }`}
                      style={{ width: `${milestone.completion}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Team Activity</h3>
            <p className="text-xs text-slate-400">Task completion by team</p>
          </div>
          <div className="space-y-4">
            {teamActivity.map((team) => {
              const completionPct = Math.round((team.completed / team.tasks) * 100)
              return (
                <div key={team.team} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-300">{team.team}</div>
                    <div className="text-xs text-slate-400">
                      {team.completed}/{team.tasks} ({completionPct}%)
                    </div>
                  </div>
                  <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-amber-400">{team.inProgress} in progress</span>
                    <span className="text-slate-500">{team.pending} pending</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

