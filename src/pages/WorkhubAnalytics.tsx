import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Users,
  MessageSquare,
  FileText,
  Activity,
  Clock,
  CheckCircle2,
} from 'lucide-react'

// Mock data for workhub analytics
const collaborationActivity = [
  { week: 'Week 1', comments: 45, reviews: 28, uploads: 32, edits: 56 },
  { week: 'Week 2', comments: 52, reviews: 32, uploads: 38, edits: 62 },
  { week: 'Week 3', comments: 48, reviews: 35, uploads: 42, edits: 58 },
  { week: 'Week 4', comments: 61, reviews: 40, uploads: 48, edits: 71 },
]

const userEngagement = [
  { date: 'Nov 1', activeUsers: 24, sessions: 68 },
  { date: 'Nov 2', activeUsers: 28, sessions: 75 },
  { date: 'Nov 3', activeUsers: 22, sessions: 58 },
  { date: 'Nov 4', activeUsers: 26, sessions: 72 },
  { date: 'Nov 5', activeUsers: 32, sessions: 89 },
  { date: 'Nov 6', activeUsers: 30, sessions: 82 },
  { date: 'Nov 7', activeUsers: 29, sessions: 78 },
  { date: 'Nov 8', activeUsers: 34, sessions: 95 },
  { date: 'Nov 9', activeUsers: 31, sessions: 86 },
  { date: 'Nov 10', activeUsers: 28, sessions: 74 },
  { date: 'Nov 11', activeUsers: 35, sessions: 98 },
  { date: 'Nov 12', activeUsers: 33, sessions: 91 },
]

const documentStats = [
  { type: 'In Draft', count: 24, color: '#f59e0b' },
  { type: 'In Review', count: 42, color: '#3b82f6' },
  { type: 'Approved', count: 108, color: '#00D48E' },
  { type: 'Published', count: 98, color: '#8b5cf6' },
]

const topContributors = [
  {
    name: 'Sarah Chen',
    role: 'Sustainability Lead',
    contributions: 127,
    reviews: 45,
    lastActive: '2 hours ago',
  },
  {
    name: 'Michael Torres',
    role: 'ESG Analyst',
    contributions: 98,
    reviews: 38,
    lastActive: '5 hours ago',
  },
  {
    name: 'Aisha Patel',
    role: 'Data Manager',
    contributions: 86,
    reviews: 31,
    lastActive: '1 hour ago',
  },
  {
    name: 'James Kim',
    role: 'Risk Analyst',
    contributions: 72,
    reviews: 28,
    lastActive: '3 hours ago',
  },
  {
    name: 'Emma Rodriguez',
    role: 'Compliance Officer',
    contributions: 65,
    reviews: 24,
    lastActive: '4 hours ago',
  },
]

const responseTime = [
  { metric: 'Avg Review Time', value: 2.4, target: 3.0, unit: 'days' },
  { metric: 'Avg Approval Time', value: 1.8, target: 2.0, unit: 'days' },
  { metric: 'Avg Comment Response', value: 4.2, target: 6.0, unit: 'hours' },
  { metric: 'Document Turnaround', value: 5.6, target: 7.0, unit: 'days' },
]

const workspaceActivity = [
  {
    module: 'GRI',
    activeDocuments: 18,
    pendingReviews: 6,
    comments: 34,
    lastUpdate: '30 mins ago',
  },
  {
    module: 'MSX',
    activeDocuments: 12,
    pendingReviews: 4,
    comments: 22,
    lastUpdate: '1 hour ago',
  },
  {
    module: 'IFRS S1',
    activeDocuments: 15,
    pendingReviews: 8,
    comments: 28,
    lastUpdate: '2 hours ago',
  },
  {
    module: 'IFRS S2',
    activeDocuments: 10,
    pendingReviews: 5,
    comments: 18,
    lastUpdate: '3 hours ago',
  },
]

const recentNotifications = [
  {
    id: 1,
    type: 'review',
    user: 'Sarah Chen',
    action: 'completed review of',
    target: 'GRI 305-1 Emissions Data',
    time: '15 mins ago',
  },
  {
    id: 2,
    type: 'comment',
    user: 'Michael Torres',
    action: 'commented on',
    target: 'MSX DMA Analysis',
    time: '32 mins ago',
  },
  {
    id: 3,
    type: 'upload',
    user: 'Aisha Patel',
    action: 'uploaded new version of',
    target: 'Scope 2 Calculations',
    time: '1 hour ago',
  },
  {
    id: 4,
    type: 'approval',
    user: 'James Kim',
    action: 'approved',
    target: 'Risk Assessment Report',
    time: '2 hours ago',
  },
  {
    id: 5,
    type: 'mention',
    user: 'Emma Rodriguez',
    action: 'mentioned you in',
    target: 'Compliance Discussion',
    time: '3 hours ago',
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

export default function WorkhubAnalytics() {
  const totalDocuments = documentStats.reduce((sum, stat) => sum + stat.count, 0)
  const avgResponseTime = responseTime.reduce((sum, r) => sum + r.value, 0) / responseTime.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Workhub Analytics</h1>
        <p className="text-sm text-slate-400">
          Collaboration metrics and team productivity insights
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Users Today"
          value={33}
          subtitle="85% of team"
          icon={Users}
          trend="+8% vs yesterday"
          color="emerald"
        />
        <StatCard
          title="Total Documents"
          value={totalDocuments}
          subtitle="Across all stages"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Pending Reviews"
          value={23}
          subtitle="Awaiting action"
          icon={MessageSquare}
          color="amber"
        />
        <StatCard
          title="Avg Response Time"
          value={`${avgResponseTime.toFixed(1)}d`}
          subtitle="All metrics"
          icon={Clock}
          trend="15% faster than target"
          color="purple"
        />
      </div>

      {/* User Engagement & Collaboration Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Daily User Engagement</h3>
            <p className="text-xs text-slate-400">Active users and sessions over time</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userEngagement}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#00D48E"
                  strokeWidth={2}
                  name="Active Users"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Sessions"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Weekly Collaboration Activity</h3>
            <p className="text-xs text-slate-400">Comments, reviews, uploads, and edits</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collaborationActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="comments" fill="#3b82f6" name="Comments" />
                <Bar dataKey="reviews" fill="#8b5cf6" name="Reviews" />
                <Bar dataKey="uploads" fill="#f59e0b" name="Uploads" />
                <Bar dataKey="edits" fill="#00D48E" name="Edits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Document Status & Response Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Document Status Distribution</h3>
            <p className="text-xs text-slate-400">Current state of all workspace documents</p>
          </div>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={documentStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, count, percent }) =>
                    `${type}: ${count} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {documentStats.map((entry, index) => (
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

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Response Time Performance</h3>
            <p className="text-xs text-slate-400">Actual vs target response times</p>
          </div>
          <div className="space-y-5 mt-6">
            {responseTime.map((item) => {
              const percentage = Math.round((item.value / item.target) * 100)
              const isUnderTarget = item.value <= item.target
              return (
                <div key={item.metric}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-slate-300">{item.metric}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-100">
                        {item.value} {item.unit}
                      </span>
                      <span className="text-xs text-slate-500">/ {item.target} target</span>
                      {isUnderTarget && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </div>
                  </div>
                  <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full transition-all ${
                        isUnderTarget
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 to-amber-400'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Workspace Activity by Module */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Workspace Activity by Module</h3>
          <p className="text-xs text-slate-400">Document activity across different frameworks</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaceActivity.map((workspace) => (
            <div
              key={workspace.module}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/60"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-slate-100">{workspace.module}</h4>
                <span className="text-xs text-slate-500">{workspace.lastUpdate}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {workspace.activeDocuments}
                  </div>
                  <div className="text-xs text-slate-400">Active Docs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-400">
                    {workspace.pendingReviews}
                  </div>
                  <div className="text-xs text-slate-400">Pending</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{workspace.comments}</div>
                  <div className="text-xs text-slate-400">Comments</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Contributors & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Top Contributors</h3>
            <p className="text-xs text-slate-400">Most active team members this month</p>
          </div>
          <div className="space-y-3">
            {topContributors.map((contributor, index) => (
              <div
                key={contributor.name}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-300">{contributor.name}</div>
                  <div className="text-xs text-slate-500">{contributor.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">
                    {contributor.contributions}
                  </div>
                  <div className="text-xs text-slate-500">{contributor.reviews} reviews</div>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {contributor.lastActive}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Recent Activity</h3>
            <p className="text-xs text-slate-400">Latest workspace notifications</p>
          </div>
          <div className="space-y-3">
            {recentNotifications.map((notification) => {
              const iconMap = {
                review: CheckCircle2,
                comment: MessageSquare,
                upload: FileText,
                approval: CheckCircle2,
                mention: MessageSquare,
              }
              const colorMap = {
                review: 'text-emerald-400 bg-emerald-500/10',
                comment: 'text-blue-400 bg-blue-500/10',
                upload: 'text-amber-400 bg-amber-500/10',
                approval: 'text-purple-400 bg-purple-500/10',
                mention: 'text-blue-400 bg-blue-500/10',
              }
              const Icon = iconMap[notification.type as keyof typeof iconMap]
              const colorClass = colorMap[notification.type as keyof typeof colorMap]

              return (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors"
                >
                  <div className={`rounded-lg p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-300">
                      <span className="font-medium">{notification.user}</span>{' '}
                      <span className="text-slate-400">{notification.action}</span>{' '}
                      <span className="font-medium">{notification.target}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{notification.time}</div>
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

