import { TrendingDown, Target, FileText, CheckCircle2, ExternalLink } from 'lucide-react'
import { mockData } from '../data/mockData'
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'

export default function GHGTargets() {
  const { ghg, ghgTrends } = mockData

  return (
    <div className="space-y-6">
      {/* Metric Tiles */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-sm text-gray-400">Scope 1 Total</div>
          </div>
          <div className="text-3xl font-bold">{ghg.scope1.value.toLocaleString()}</div>
          <div className="text-sm text-gray-400 mt-1">{ghg.scope1.unit}</div>
          <button className="text-xs text-accent hover:underline mt-3 flex items-center gap-1">
            View root: {ghg.scope1.root}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <TrendingDown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-sm text-gray-400">Scope 2 (Location)</div>
          </div>
          <div className="text-3xl font-bold">{ghg.scope2Location.value.toLocaleString()}</div>
          <div className="text-sm text-gray-400 mt-1">{ghg.scope2Location.unit}</div>
          <button className="text-xs text-accent hover:underline mt-3 flex items-center gap-1">
            View root: {ghg.scope2Location.root}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingDown className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-sm text-gray-400">Scope 2 (Market)</div>
          </div>
          <div className="text-3xl font-bold">{ghg.scope2Market.value.toLocaleString()}</div>
          <div className="text-sm text-gray-400 mt-1">{ghg.scope2Market.unit}</div>
          <button className="text-xs text-accent hover:underline mt-3 flex items-center gap-1">
            View root: {ghg.scope2Market.root}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-sm text-gray-400">Target Progress</div>
          </div>
          <div className="text-3xl font-bold">-18%</div>
          <div className="text-sm text-emerald-400 mt-1">-42% by 2030 target</div>
          <div className="text-xs text-gray-400 mt-2">On track</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Emissions Trend */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold mb-4">Emissions Trend (Anchored Points)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ghgTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#233047" />
              <XAxis dataKey="year" stroke="#E6EAF2" style={{ fontSize: '12px' }} />
              <YAxis stroke="#E6EAF2" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#141C2A',
                  border: '1px solid #233047',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="scope1"
                stroke="#f87171"
                strokeWidth={2}
                name="Scope 1"
                dot={{ fill: '#f87171', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="scope2"
                stroke="#fbbf24"
                strokeWidth={2}
                name="Scope 2"
                dot={{ fill: '#fbbf24', r: 4 }}
              />
              <ReferenceLine y={10500} stroke="#00D48E" strokeDasharray="3 3" label="2030 Target" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Intensity vs Production */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold mb-4">Intensity vs Production</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#233047" />
              <XAxis
                type="number"
                dataKey="year"
                name="Year"
                stroke="#E6EAF2"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                type="number"
                dataKey="intensity"
                name="Intensity"
                stroke="#E6EAF2"
                style={{ fontSize: '12px' }}
                label={{ value: 'tCO₂e/tonne', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#141C2A',
                  border: '1px solid #233047',
                  borderRadius: '8px',
                }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter name="Intensity" data={ghgTrends} fill="#00D48E" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Methodology & ZK Proofs */}
      <div className="grid grid-cols-2 gap-4">
        {/* Methodology */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold">Methodology</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-dark-bg border border-dark-border">
              <div className="text-sm font-medium mb-2">GHG Protocol Corporate Standard</div>
              <div className="text-xs text-gray-400">
                Evidence: EV-2024-045 (methodology_document.pdf)
              </div>
              <button className="text-xs text-accent hover:underline mt-2">View evidence</button>
            </div>
            <div className="p-4 rounded-lg bg-dark-bg border border-dark-border">
              <div className="text-sm font-medium mb-2">Scope 2 Market-based approach</div>
              <div className="text-xs text-gray-400">
                Evidence: EV-2024-046 (renewable_energy_certificates.xlsx)
              </div>
              <button className="text-xs text-accent hover:underline mt-2">View evidence</button>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 text-sm text-amber-400">
                <TrendingDown className="w-4 h-4" />
                <span>Methodology updated on 2024-10-15</span>
              </div>
            </div>
          </div>
        </div>

        {/* ZK Proofs */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold">ZK Threshold Compliance</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Scope 1 &lt; 15,000 tCO₂e</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs text-gray-400">Proof verified on-chain</div>
              <button className="text-xs text-accent hover:underline mt-2">View proof</button>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Scope 2 &lt; 10,000 tCO₂e</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs text-gray-400">Proof verified on-chain</div>
              <button className="text-xs text-accent hover:underline mt-2">View proof</button>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">YoY reduction &gt; 5%</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs text-gray-400">Proof verified on-chain</div>
              <button className="text-xs text-accent hover:underline mt-2">View proof</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

