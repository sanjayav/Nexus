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
  Settings,
  Shield,
  Database,
  Activity,
  AlertCircle,
  CheckCircle2,
  Server,
  Lock,
} from 'lucide-react'

// Mock data for settings analytics
const systemHealth = [
  { component: 'API Server', status: 'healthy', uptime: 99.98, latency: 45 },
  { component: 'Database', status: 'healthy', uptime: 99.95, latency: 12 },
  { component: 'IPFS Gateway', status: 'healthy', uptime: 99.82, latency: 234 },
  { component: 'Blockchain Node', status: 'healthy', uptime: 99.91, latency: 156 },
  { component: 'Auth Service', status: 'healthy', uptime: 99.99, latency: 23 },
]

const apiUsage = [
  { date: 'Nov 1', requests: 12450, errors: 23, avgLatency: 145 },
  { date: 'Nov 2', requests: 13200, errors: 18, avgLatency: 138 },
  { date: 'Nov 3', requests: 11800, errors: 31, avgLatency: 152 },
  { date: 'Nov 4', requests: 14100, errors: 15, avgLatency: 142 },
  { date: 'Nov 5', requests: 15600, errors: 28, avgLatency: 149 },
  { date: 'Nov 6', requests: 14800, errors: 22, avgLatency: 144 },
  { date: 'Nov 7', requests: 13900, errors: 19, avgLatency: 141 },
  { date: 'Nov 8', requests: 16200, errors: 25, avgLatency: 147 },
  { date: 'Nov 9', requests: 15400, errors: 21, avgLatency: 143 },
  { date: 'Nov 10', requests: 14600, errors: 17, avgLatency: 139 },
  { date: 'Nov 11', requests: 17100, errors: 29, avgLatency: 151 },
  { date: 'Nov 12', requests: 16500, errors: 24, avgLatency: 146 },
]

const storageUsage = [
  { type: 'Documents', size: 245, color: '#3b82f6' },
  { type: 'Evidence Files', size: 187, color: '#8b5cf6' },
  { type: 'Reports', size: 98, color: '#00D48E' },
  { type: 'Blockchain Data', size: 45, color: '#f59e0b' },
  { type: 'Cache', size: 32, color: '#ef4444' },
]

const securityEvents = [
  { week: 'Week 1', logins: 342, failedAuth: 12, suspicious: 2 },
  { week: 'Week 2', logins: 368, failedAuth: 8, suspicious: 1 },
  { week: 'Week 3', logins: 391, failedAuth: 15, suspicious: 3 },
  { week: 'Week 4', logins: 425, failedAuth: 10, suspicious: 1 },
]

const userPermissions = [
  { role: 'Admin', users: 3, permissions: 'Full Access' },
  { role: 'Approver', users: 8, permissions: 'Approve, Review, Read' },
  { role: 'Reviewer', users: 15, permissions: 'Review, Read, Comment' },
  { role: 'Analyst', users: 12, permissions: 'Read, Upload, Comment' },
  { role: 'Viewer', users: 7, permissions: 'Read Only' },
]

const integrationStatus = [
  {
    name: 'Polygon zkEVM',
    type: 'Blockchain',
    status: 'connected',
    lastSync: '2 mins ago',
    requests: 1247,
  },
  {
    name: 'IPFS Pinata',
    type: 'Storage',
    status: 'connected',
    lastSync: '5 mins ago',
    requests: 892,
  },
  {
    name: 'Auth0',
    type: 'Authentication',
    status: 'connected',
    lastSync: '1 min ago',
    requests: 3421,
  },
  {
    name: 'SendGrid',
    type: 'Email',
    status: 'connected',
    lastSync: '10 mins ago',
    requests: 234,
  },
]

const configChanges = [
  {
    id: 1,
    setting: 'API Rate Limit',
    oldValue: '1000/hour',
    newValue: '1500/hour',
    changedBy: 'Admin',
    timestamp: '2025-11-10 14:32',
  },
  {
    id: 2,
    setting: 'Session Timeout',
    oldValue: '30 minutes',
    newValue: '60 minutes',
    changedBy: 'Admin',
    timestamp: '2025-11-08 09:15',
  },
  {
    id: 3,
    setting: 'Max File Size',
    oldValue: '10 MB',
    newValue: '25 MB',
    changedBy: 'System',
    timestamp: '2025-11-05 16:48',
  },
  {
    id: 4,
    setting: 'Backup Frequency',
    oldValue: 'Daily',
    newValue: 'Every 6 hours',
    changedBy: 'Admin',
    timestamp: '2025-11-02 11:22',
  },
]

const systemAlerts = [
  {
    id: 1,
    severity: 'warning',
    message: 'IPFS gateway latency increased by 15%',
    timestamp: '2 hours ago',
  },
  {
    id: 2,
    severity: 'info',
    message: 'Scheduled maintenance completed successfully',
    timestamp: '5 hours ago',
  },
  {
    id: 3,
    severity: 'warning',
    message: 'Storage usage exceeded 80% threshold',
    timestamp: '1 day ago',
  },
  {
    id: 4,
    severity: 'success',
    message: 'All security scans passed',
    timestamp: '2 days ago',
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

export default function SettingsAnalytics() {
  const totalStorage = storageUsage.reduce((sum, item) => sum + item.size, 0)
  const avgUptime =
    systemHealth.reduce((sum, component) => sum + component.uptime, 0) / systemHealth.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Settings Analytics</h1>
        <p className="text-sm text-slate-400">
          System health, security, and configuration monitoring
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="System Uptime"
          value={`${avgUptime.toFixed(2)}%`}
          subtitle="30-day average"
          icon={Activity}
          trend="All systems operational"
          color="emerald"
        />
        <StatCard
          title="Storage Used"
          value={`${totalStorage} GB`}
          subtitle="Of 1 TB capacity"
          icon={Database}
          color="blue"
        />
        <StatCard
          title="Active Users"
          value={45}
          subtitle="Across all roles"
          icon={Shield}
          color="purple"
        />
        <StatCard
          title="API Requests"
          value="185K"
          subtitle="Last 30 days"
          icon={Server}
          trend="+12% from last month"
          color="amber"
        />
      </div>

      {/* System Health Status */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-100">System Health Status</h3>
          <p className="text-xs text-slate-400">Real-time monitoring of key components</p>
        </div>
        <div className="space-y-4">
          {systemHealth.map((component) => (
            <div
              key={component.component}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60"
            >
              <div className="flex-shrink-0">
                {component.status === 'healthy' ? (
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-300">{component.component}</div>
                <div className="text-xs text-slate-500">
                  Uptime: {component.uptime}% • Latency: {component.latency}ms
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs border ${
                    component.status === 'healthy'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-300 border-red-500/20'
                  }`}
                >
                  {component.status === 'healthy' ? 'Healthy' : 'Degraded'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Usage & Security Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">API Usage Trends</h3>
            <p className="text-xs text-slate-400">Daily request volume and latency</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={apiUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                <YAxis yAxisId="left" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="requests"
                  stroke="#00D48E"
                  strokeWidth={2}
                  name="Requests"
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgLatency"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Avg Latency (ms)"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Security Events</h3>
            <p className="text-xs text-slate-400">Authentication and security monitoring</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={securityEvents}>
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
                <Bar dataKey="logins" fill="#00D48E" name="Successful Logins" />
                <Bar dataKey="failedAuth" fill="#f59e0b" name="Failed Auth" />
                <Bar dataKey="suspicious" fill="#ef4444" name="Suspicious Activity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Storage Usage & User Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Storage Distribution</h3>
            <p className="text-xs text-slate-400">Breakdown by data type ({totalStorage} GB total)</p>
          </div>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={storageUsage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, size, percent }) =>
                    `${type}: ${size}GB (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="size"
                >
                  {storageUsage.map((entry, index) => (
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
            <h3 className="text-lg font-semibold text-slate-100">User Permissions</h3>
            <p className="text-xs text-slate-400">Role distribution and access levels</p>
          </div>
          <div className="space-y-3">
            {userPermissions.map((permission) => (
              <div
                key={permission.role}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-300">{permission.role}</div>
                    <div className="text-xs text-slate-500">{permission.permissions}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-100">{permission.users}</div>
                  <div className="text-xs text-slate-500">users</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Status */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Integration Status</h3>
          <p className="text-xs text-slate-400">External service connections and health</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrationStatus.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60"
            >
              <div className="flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-300">{integration.name}</div>
                <div className="text-xs text-slate-500">
                  {integration.type} • {integration.requests.toLocaleString()} requests
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{integration.lastSync}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Changes & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Recent Configuration Changes</h3>
            <p className="text-xs text-slate-400">System settings modification history</p>
          </div>
          <div className="space-y-3">
            {configChanges.map((change) => (
              <div
                key={change.id}
                className="p-3 rounded-xl border border-slate-800 bg-slate-900/60"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-slate-300">{change.setting}</div>
                  <div className="text-xs text-slate-500">{change.timestamp}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">{change.oldValue}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-emerald-400">{change.newValue}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">by {change.changedBy}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">System Alerts</h3>
            <p className="text-xs text-slate-400">Recent notifications and warnings</p>
          </div>
          <div className="space-y-3">
            {systemAlerts.map((alert) => {
              const iconMap = {
                warning: AlertCircle,
                info: Settings,
                success: CheckCircle2,
              }
              const colorMap = {
                warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              }
              const Icon = iconMap[alert.severity as keyof typeof iconMap]
              const colorClass = colorMap[alert.severity as keyof typeof colorMap]

              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60"
                >
                  <div className={`rounded-lg p-2 border ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-300">{alert.message}</div>
                    <div className="text-xs text-slate-500 mt-1">{alert.timestamp}</div>
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

