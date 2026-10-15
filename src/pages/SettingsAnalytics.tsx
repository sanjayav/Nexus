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
  Plug,
  History,
  Bell,
  ArrowRight,
  Globe2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Card, CardHeader, PageHeader, StatCard, chartTheme, type Tone } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { settingsAnalyticsStrings } from '../i18n/pages/settingsAnalytics'
import { adminSettingsStrings } from '../i18n/pages/adminSettings'
import { useWorkspace, useL10n } from '../workspace/WorkspaceContext'
import type { L10n } from '../workspace/regions'
import { useComplianceSettings } from '../components/useComplianceSettings'

type S = typeof settingsAnalyticsStrings.en
type Ago = { n: number; unit: 'min' | 'hour' | 'day' }

// Mock data for settings analytics
const systemHealth = [
  { component: 'API Server', status: 'healthy', uptime: 99.98, latency: 45 },
  { component: 'Database', status: 'healthy', uptime: 99.95, latency: 12 },
  { component: 'IPFS Gateway', status: 'healthy', uptime: 99.82, latency: 234 },
  { component: 'Blockchain Node', status: 'healthy', uptime: 99.91, latency: 156 },
  { component: 'Auth Service', status: 'healthy', uptime: 99.99, latency: 23 },
]

const apiUsage = [
  { date: '2025-11-01', requests: 12450, errors: 23, avgLatency: 145 },
  { date: '2025-11-02', requests: 13200, errors: 18, avgLatency: 138 },
  { date: '2025-11-03', requests: 11800, errors: 31, avgLatency: 152 },
  { date: '2025-11-04', requests: 14100, errors: 15, avgLatency: 142 },
  { date: '2025-11-05', requests: 15600, errors: 28, avgLatency: 149 },
  { date: '2025-11-06', requests: 14800, errors: 22, avgLatency: 144 },
  { date: '2025-11-07', requests: 13900, errors: 19, avgLatency: 141 },
  { date: '2025-11-08', requests: 16200, errors: 25, avgLatency: 147 },
  { date: '2025-11-09', requests: 15400, errors: 21, avgLatency: 143 },
  { date: '2025-11-10', requests: 14600, errors: 17, avgLatency: 139 },
  { date: '2025-11-11', requests: 17100, errors: 29, avgLatency: 151 },
  { date: '2025-11-12', requests: 16500, errors: 24, avgLatency: 146 },
]

const storageUsage = [
  { type: 'Documents', size: 245 },
  { type: 'Evidence Files', size: 187 },
  { type: 'Reports', size: 98 },
  { type: 'Blockchain Data', size: 45 },
  { type: 'Cache', size: 32 },
]

const securityEvents = [
  { week: 1, logins: 342, failedAuth: 12, suspicious: 2 },
  { week: 2, logins: 368, failedAuth: 8, suspicious: 1 },
  { week: 3, logins: 391, failedAuth: 15, suspicious: 3 },
  { week: 4, logins: 425, failedAuth: 10, suspicious: 1 },
]

const userPermissions: { role: string; users: number; perm: keyof S['perms'] }[] = [
  { role: 'Admin', users: 3, perm: 'full' },
  { role: 'Approver', users: 8, perm: 'approver' },
  { role: 'Reviewer', users: 15, perm: 'reviewer' },
  { role: 'Analyst', users: 12, perm: 'analyst' },
  { role: 'Viewer', users: 7, perm: 'viewer' },
]

type Integration = { name: string | L10n; type: string; status: 'connected'; lastSync: Ago; requests: number }
const integrationStatus: Integration[] = [
  { name: 'Polygon zkEVM', type: 'Blockchain', status: 'connected', lastSync: { n: 2, unit: 'min' }, requests: 1247 },
  { name: 'IPFS Pinata', type: 'Storage', status: 'connected', lastSync: { n: 5, unit: 'min' }, requests: 892 },
  { name: 'Auth0', type: 'Authentication', status: 'connected', lastSync: { n: 1, unit: 'min' }, requests: 3421 },
  { name: 'SendGrid', type: 'Email', status: 'connected', lastSync: { n: 10, unit: 'min' }, requests: 234 },
]

// Mainland tenant: chain and storage names come from the region profile.
const cnIntegrationStatus: Integration[] = [
  { name: { en: 'ChainMaker (BSN)', zh: '长安链 ChainMaker（BSN）' }, type: 'Blockchain', status: 'connected', lastSync: { n: 3, unit: 'min' }, requests: 1186 },
  { name: { en: 'Alibaba Cloud OSS', zh: '阿里云 OSS' }, type: 'Storage', status: 'connected', lastSync: { n: 4, unit: 'min' }, requests: 941 },
  { name: { en: 'WeCom group bot', zh: '企业微信群机器人' }, type: 'Notification', status: 'connected', lastSync: { n: 12, unit: 'min' }, requests: 318 },
  { name: { en: 'Alibaba Cloud SMS', zh: '阿里云短信服务' }, type: 'SMS', status: 'connected', lastSync: { n: 1, unit: 'hour' }, requests: 57 },
]

type ConfigValue = (s: S) => string
const configChanges: { id: number; setting: keyof S['settings']; oldValue: ConfigValue; newValue: ConfigValue; changedBy: string; timestamp: string }[] = [
  { id: 1, setting: 'rateLimit', oldValue: s => fmt(s.values.perHour, { n: '1,000' }), newValue: s => fmt(s.values.perHour, { n: '1,500' }), changedBy: 'Admin', timestamp: '2025-11-10T14:32' },
  { id: 2, setting: 'sessionTimeout', oldValue: s => fmt(s.values.minutes, { n: 30 }), newValue: s => fmt(s.values.minutes, { n: 60 }), changedBy: 'Admin', timestamp: '2025-11-08T09:15' },
  { id: 3, setting: 'maxFile', oldValue: () => '10 MB', newValue: () => '25 MB', changedBy: 'System', timestamp: '2025-11-05T16:48' },
  { id: 4, setting: 'backup', oldValue: s => s.values.daily, newValue: s => s.values.every6h, changedBy: 'Admin', timestamp: '2025-11-02T11:22' },
]

const systemAlerts: { id: number; severity: 'warning' | 'info' | 'success'; message: keyof S['alerts']; timestamp: Ago }[] = [
  { id: 1, severity: 'warning', message: 'latency', timestamp: { n: 2, unit: 'hour' } },
  { id: 2, severity: 'info', message: 'maintenance', timestamp: { n: 5, unit: 'hour' } },
  { id: 3, severity: 'warning', message: 'storage', timestamp: { n: 1, unit: 'day' } },
  { id: 4, severity: 'success', message: 'scans', timestamp: { n: 2, unit: 'day' } },
]

const alertIcon = { warning: AlertCircle, info: Settings, success: CheckCircle2 }
const alertTone: Record<'warning' | 'info' | 'success', Tone> = { warning: 'warning', info: 'info', success: 'success' }
const alertIconClass = {
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-sky-50 text-sky-600',
  success: 'bg-emerald-50 text-emerald-700',
}

const axisTick = { fontSize: 12, fill: chartTheme.axis }
const storageColors = chartTheme.series

export default function SettingsAnalytics() {
  const s = useStrings(settingsAnalyticsStrings)
  const a = useStrings(adminSettingsStrings)
  const f = useFormat()
  const l10n = useL10n()
  const { region } = useWorkspace()
  const isCn = region.id === 'cn'
  const [compliance] = useComplianceSettings()
  const integrations = isCn ? cnIntegrationStatus : integrationStatus
  const storageName = l10n(region.storage.provider)
  const componentLabel = (c: string) =>
    c === 'IPFS Gateway' ? storageName : c === 'Blockchain Node' ? l10n(region.chain.network) : s.components[c] ?? c
  const complianceRows = [
    { k: a.hosting, v: l10n(region.hosting.provider) },
    { k: a.hostingRegion, v: l10n(region.hosting.residency) },
    { k: a.privacyRegime, v: l10n(region.privacy) },
    { k: a.crossBorder, v: (isCn ? a.crossBorderCn : a.crossBorderGlobal)[compliance.crossBorder] ?? '—' },
    ...(isCn
      ? [
          { k: a.mlps, v: a.mlpsOptions[compliance.mlps] ?? '—' },
          { k: a.icp, v: compliance.icp || s.notSet, muted: !compliance.icp },
        ]
      : []),
  ]

  const totalStorage = storageUsage.reduce((sum, item) => sum + item.size, 0)
  const avgUptime = systemHealth.reduce((sum, c) => sum + c.uptime, 0) / systemHealth.length

  const ago = (a: Ago) => {
    const key = (a.n === 1 ? a.unit : `${a.unit}s`) as keyof S['ago']
    return fmt(s.ago[key], { n: a.n })
  }

  const apiData = apiUsage.map(d => ({ ...d, label: f.date(d.date, { month: 'short', day: 'numeric' }) }))
  const securityData = securityEvents.map(d => ({ ...d, label: fmt(s.week, { n: d.week }) }))
  const storageData = storageUsage.map(d => ({ ...d, name: s.storageTypes[d.type] ?? d.type }))

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} description={s.description} />

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={s.kpi.uptime}
          value={f.number(avgUptime, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          unit="%"
          icon={Activity}
          deltaLabel={s.kpi.uptimeSub}
          footer={<Badge tone="success" dot>{s.kpi.operational}</Badge>}
        />
        <StatCard label={s.kpi.storage} value={f.number(totalStorage)} unit="GB" icon={Database} deltaLabel={s.kpi.storageSub} />
        <StatCard label={s.kpi.users} value={45} icon={Shield} deltaLabel={s.kpi.usersSub} />
        <StatCard label={s.kpi.api} value={f.compact(185000)} icon={Server} delta={12} deltaLabel={s.kpi.vsLastMonth} footer={<span className="text-xs text-zinc-500">{s.kpi.apiSub}</span>} />
      </div>

      {/* System health */}
      <Card>
        <CardHeader title={s.healthTitle} description={s.healthDesc} icon={Activity} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {systemHealth.map(c => {
            const ok = c.status === 'healthy'
            return (
              <div key={c.component} className="rounded-xl border border-line p-4 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-900 truncate" title={componentLabel(c.component)}>{componentLabel(c.component)}</span>
                  <Badge tone={ok ? 'success' : 'danger'} dot>{ok ? s.healthy : s.degraded}</Badge>
                </div>
                <div className="mt-2 text-xs text-zinc-500 tabular">
                  {fmt(s.uptimeLatency, { uptime: `${f.number(c.uptime, { minimumFractionDigits: 2 })}%`, latency: c.latency })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Data residency & compliance */}
      <Card>
        <CardHeader
          title={s.complianceTitle}
          description={s.complianceDesc}
          icon={Globe2}
          action={
            <Link to="/admin" className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
              {s.manage} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px rounded-xl border border-line bg-line overflow-hidden">
          {complianceRows.map(r => (
            <div key={r.k} className="bg-white p-3.5 min-w-0">
              <dt className="text-xs text-zinc-500">{r.k}</dt>
              <dd className={`text-sm font-medium mt-0.5 break-words ${'muted' in r && r.muted ? 'text-zinc-400' : 'text-zinc-900'}`}>{r.v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* API usage & security events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader title={s.apiTitle} description={s.apiDesc} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={apiData} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} minTickGap={16} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={axisTick} tickFormatter={v => f.compact(Number(v))} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip {...chartTheme.tooltip} formatter={(v: number) => f.number(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="requests" stroke={chartTheme.series[0]} strokeWidth={2} name={s.requests} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="avgLatency" stroke={chartTheme.series[3]} strokeWidth={2} name={s.avgLatency} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title={s.securityTitle} description={s.securityDesc} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={securityData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chartTheme.grid} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip {...chartTheme.tooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="logins" fill={chartTheme.series[0]} name={s.logins} radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="failedAuth" fill={chartTheme.series[3]} name={s.failedAuth} radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="suspicious" fill={chartTheme.series[5]} name={s.suspicious} radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Storage & permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader title={s.storageTitle} description={fmt(s.storageDesc, { total: totalStorage })} icon={Database} />
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={storageData} dataKey="size" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none">
                    {storageData.map((_, i) => (
                      <Cell key={i} fill={storageColors[i % storageColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTheme.tooltip} formatter={(v: number) => `${f.number(v)} GB`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 w-full space-y-2.5">
              {storageData.map((d, i) => (
                <li key={d.type} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-zinc-700 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: storageColors[i % storageColors.length] }} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="tabular text-zinc-900 font-medium shrink-0">
                    {f.number(d.size)} GB <span className="text-zinc-500 font-normal">· {f.percent((d.size / totalStorage) * 100)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title={s.permissionsTitle} description={s.permissionsDesc} icon={Lock} />
          <div className="divide-y divide-line -mx-2">
            {userPermissions.map(p => (
              <div key={p.role} className="flex items-center justify-between gap-3 px-2 py-3 rounded-lg hover:bg-zinc-50 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900">{s.roles[p.role] ?? p.role}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{s.perms[p.perm]}</div>
                </div>
                <span className="text-sm text-zinc-600 tabular shrink-0">{fmt(s.usersCount, { count: p.users })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Integrations */}
      <Card>
        <CardHeader title={s.integrationsTitle} description={s.integrationsDesc} icon={Plug} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {integrations.map(it => {
            const name = typeof it.name === 'string' ? it.name : l10n(it.name)
            return (
            <div key={name} className="rounded-xl border border-line p-4 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-900 truncate" title={name}>{name}</span>
                <Badge tone="success" dot>{s.connected}</Badge>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {s.integrationTypes[it.type] ?? it.type} · <span className="tabular">{fmt(s.requestsCount, { count: f.number(it.requests) })}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400">{fmt(s.lastSync, { time: ago(it.lastSync) })}</div>
            </div>
            )
          })}
        </div>
      </Card>

      {/* Config changes & alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader title={s.configTitle} description={s.configDesc} icon={History} />
          <div className="divide-y divide-line">
            {configChanges.map(c => (
              <div key={c.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium text-zinc-900">{s.settings[c.setting]}</div>
                  <div className="text-xs text-zinc-500 tabular shrink-0">{f.date(c.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="text-zinc-500 line-through decoration-zinc-300">{c.oldValue(s)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-medium text-emerald-700">{c.newValue(s)}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">{fmt(s.changedBy, { who: s.actors[c.changedBy] ?? c.changedBy })}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={s.alertsTitle} description={s.alertsDesc} icon={Bell} />
          <div className="divide-y divide-line">
            {systemAlerts.map(al => {
              const Icon = alertIcon[al.severity]
              return (
                <div key={al.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alertIconClass[al.severity]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-800">{fmt(s.alerts[al.message], { storage: storageName })}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={alertTone[al.severity]}>{s.severity[al.severity]}</Badge>
                      <span className="text-xs text-zinc-500">{ago(al.timestamp)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
