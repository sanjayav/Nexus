import { TrendingUp, ExternalLink, AlertCircle, FileText, Eye, Shield, Globe2, Flag, ArrowRight } from 'lucide-react'
import { mockData } from '../data/mockData'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function ExecutiveOverview() {
  const {
    frameworks,
    dma,
    ghg,
    integrity,
    rollup,
    coverageByModule,
    dmaVelocity,
    approvalsFunnel,
    evidenceHeatmap,
    alerts,
  } = mockData

  const periodLabel = 'FY2025'
  const regionMode = 'Global + China'

  return (
    <div className="space-y-6">
      {/* Command Center header */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1.2fr)]">
        {/* Period / pipeline */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-1">
                Reporting Command Center
              </p>
              <h1 className="text-xl font-semibold text-white">{periodLabel}</h1>
              <p className="mt-1 text-xs text-gray-400">
                You&apos;re on track. Close the remaining gaps to publish the FY2025 pack.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-dark-bg px-3 py-1 text-xs text-gray-300 border border-dark-border">
                <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                {regionMode}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 border border-emerald-500/30">
                <Shield className="w-3.5 h-3.5" />
                Integrity: Verified
              </span>
            </div>
          </div>

          {/* Pipeline */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Setup</span>
              <span>DMA</span>
              <span>Collection</span>
              <span>Review</span>
              <span>Publish</span>
            </div>
            <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 rounded-full"
                style={{ width: `${dma.percentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              DMA {dma.percentage}% complete · {alerts.filter(a => a.level === 'error').length} blocking issues.
            </p>
          </div>
        </div>

        {/* Risk strip / next actions */}
        <div className="space-y-3">
          <div className="bg-dark-surface rounded-2xl p-4 border border-dark-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-gray-400">Risk strip</p>
              <Flag className="w-4 h-4 text-amber-300" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-amber-300">
                <span>Critical gaps</span>
                <span className="font-semibold">
                  {alerts.filter(a => a.level === 'error').length}
                </span>
              </div>
              <div className="flex items-center justify-between text-amber-200">
                <span>Missing evidence</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex items-center justify-between text-rose-300">
                <span>Expiring certificates (&lt; 30 days)</span>
                <span className="font-semibold">2</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-surface rounded-2xl p-4 border border-dark-border">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
              Next actions
            </p>
            <div className="space-y-2 text-sm">
              <Link
                to="/workbench?filter=DMA"
                className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-accent/10 text-accent border border-accent/40 hover:bg-accent/20 transition-colors group"
              >
                <span>Continue DMA for climate topics</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                to="/workbench?filter=Critical"
                className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-dark-bg text-gray-200 border border-dark-border hover:border-amber-400 transition-colors group"
              >
                <span>Resolve 12 gaps across BU/Sites</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                to="/workbench?filter=My+tasks"
                className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-dark-bg text-gray-200 border border-dark-border hover:border-blue-400 transition-colors group"
              >
                <span>Review 3 submissions ready for approval</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1 - KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {/* Framework Coverage */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-base font-semibold mb-4">Framework Coverage</h3>
          <div className="space-y-3">
            {Object.entries(frameworks).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{key}</span>
                  <span className="font-medium">{value.covered}%</span>
                </div>
                <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${value.covered}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DMA Completion */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-base font-semibold mb-2">DMA Completion</h3>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold">{dma.percentage}%</span>
            <span className="text-sm text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              +{dma.change}%
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">vs last month</p>
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dma.sparkline.map((v) => ({ value: v }))}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#00D48E"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GHG Snapshot */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-base font-semibold mb-4">GHG Snapshot</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-400 mb-1">Scope 1</div>
              <div className="text-2xl font-bold">{ghg.scope1.value.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{ghg.scope1.unit}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Scope 2 (loc/mark)</div>
              <div className="text-xl font-bold">
                {ghg.scope2Location.value.toLocaleString()} /{' '}
                {ghg.scope2Market.value.toLocaleString()}
              </div>
            </div>
            <button className="text-xs text-accent hover:underline flex items-center gap-1">
              View roots
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Integrity Index */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-base font-semibold mb-2">Integrity Index</h3>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold">{integrity.score}</span>
            <span className="text-2xl text-gray-400">/100</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 mb-3">
            <span className="text-xs font-medium text-emerald-400">Verified</span>
          </div>
          <div className="space-y-1 text-xs text-gray-400">
            <div>Anchored: {integrity.weights.anchoredCompleteness.score}% (40%)</div>
            <div>Approvals: {integrity.weights.approvalsPass.score}% (40%)</div>
            <div>Valid: {integrity.weights.zeroFailedValidations.score}% (20%)</div>
          </div>
        </div>

        {/* Period Roll-up */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-base font-semibold mb-4">Period Roll-up</h3>
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">rollupRoot:</div>
            <div className="font-mono text-sm bg-dark-bg px-2 py-1 rounded border border-dark-border">
              {rollup.shortRoot}
            </div>
          </div>
          <button className="w-full px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" />
            View on chain
          </button>
        </div>
      </div>

      {/* Row 2 - Primary Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Coverage by Module */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Coverage by Module</h3>
            <button className="text-xs text-accent hover:underline">see missing anchors</button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={coverageByModule}>
              <CartesianGrid strokeDasharray="3 3" stroke="#233047" />
              <XAxis dataKey="module" stroke="#E6EAF2" style={{ fontSize: '12px' }} />
              <YAxis stroke="#E6EAF2" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#141C2A',
                  border: '1px solid #233047',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="covered" fill="#00D48E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* DMA Velocity */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold mb-4">DMA Velocity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dmaVelocity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#233047" />
              <XAxis dataKey="month" stroke="#E6EAF2" style={{ fontSize: '12px' }} />
              <YAxis stroke="#E6EAF2" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#141C2A',
                  border: '1px solid #233047',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00D48E"
                strokeWidth={2}
                dot={(props: any) => {
                  const data = dmaVelocity[props.index]
                  if (data.anchored) {
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={5}
                        fill="#00D48E"
                        stroke="#0B1220"
                        strokeWidth={2}
                        style={{ cursor: 'pointer' }}
                      />
                    )
                  }
                  return <></>
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 - Integrity & Evidence */}
      <div className="grid grid-cols-2 gap-4">
        {/* Approvals Funnel */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold mb-4">Approvals Funnel</h3>
          <div className="space-y-4">
            {approvalsFunnel.map((stage) => (
              <div key={stage.stage}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <span className="text-sm text-gray-400">{stage.count} items</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-8 bg-dark-bg rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-accent rounded-lg flex items-center justify-end px-3"
                      style={{
                        width: `${(stage.count / approvalsFunnel[0].count) * 100}%`,
                      }}
                    >
                      <span className="text-xs font-medium">{stage.count}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-12">{stage.avgTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Heatmap */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold mb-4">Evidence Heatmap</h3>
          <div className="space-y-2">
            {evidenceHeatmap.map((row) => (
              <div key={row.month} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-12">{row.month}</span>
                <div className="flex gap-1 flex-1">
                  {['GRI', 'MSX', 'S1', 'S2'].map((module) => {
                    const value = row[module as keyof typeof row] as number
                    const intensity = Math.min((value / 25) * 100, 100)
                    return (
                      <div
                        key={module}
                        className="flex-1 h-10 rounded-md flex items-center justify-center text-xs font-medium cursor-pointer hover:ring-2 hover:ring-accent transition-all"
                        style={{
                          backgroundColor: `rgba(0, 212, 142, ${intensity / 100})`,
                        }}
                        title={`${module}: ${value} items`}
                      >
                        {value}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 mt-2">
              <span className="text-xs text-gray-400">GRI</span>
              <span className="text-xs text-gray-400">MSX</span>
              <span className="text-xs text-gray-400">S1</span>
              <span className="text-xs text-gray-400">S2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 - Alerts & Quick Actions */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <div className="grid grid-cols-2 gap-6">
          {/* Alerts */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Alerts</h3>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    alert.level === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <AlertCircle
                    className={`w-5 h-5 flex-shrink-0 ${
                      alert.level === 'error' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        alert.level === 'error' ? 'text-rose-300' : 'text-amber-300'
                      }`}
                    >
                      {alert.message}
                    </p>
                    {alert.module && (
                      <p className="text-xs text-gray-400 mt-1">Module: {alert.module}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center gap-3 p-4 rounded-xl border border-dark-border hover:border-accent hover:bg-accent/5 transition-all">
                <FileText className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">Generate Audit Pack</span>
              </button>
              <button className="flex items-center gap-3 p-4 rounded-xl border border-dark-border hover:border-accent hover:bg-accent/5 transition-all">
                <Eye className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">Preview Publish</span>
              </button>
              <button className="flex items-center gap-3 p-4 rounded-xl border border-dark-border hover:border-accent hover:bg-accent/5 transition-all col-span-2">
                <Shield className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">Open Verification Center</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

