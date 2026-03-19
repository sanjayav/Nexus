import { TrendingDown, Target, FileText, CheckCircle2, ExternalLink, Zap } from 'lucide-react'
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

const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '12px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  color: '#000',
  fontWeight: 'bold' as const,
  fontSize: '12px',
}

export default function GHGTargets() {
  const { ghg, ghgTrends, renewableEnergy } = mockData

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">GHG Targets</h1>
        <p className="text-sm text-black/60 mt-2 font-medium tracking-wide">
          Scope 1 & 2 emissions, target progress, renewable energy metrics, and methodology.
        </p>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-rose-500/10">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Scope 1 Total</p>
          </div>
          <p className="text-4xl font-bold tracking-tighter text-black">{ghg.scope1.value.toLocaleString()}</p>
          <p className="text-sm text-black/50 mt-1">{ghg.scope1.unit}</p>
          <button className="text-xs text-black/60 hover:text-black hover:underline mt-3 flex items-center gap-1 font-medium">
            View root: {ghg.scope1.root}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <TrendingDown className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Scope 2 (Location)</p>
          </div>
          <p className="text-4xl font-bold tracking-tighter text-black">{ghg.scope2Location.value.toLocaleString()}</p>
          <p className="text-sm text-black/50 mt-1">{ghg.scope2Location.unit}</p>
          <button className="text-xs text-black/60 hover:text-black hover:underline mt-3 flex items-center gap-1 font-medium">
            View root: {ghg.scope2Location.root}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <TrendingDown className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Scope 2 (Market)</p>
          </div>
          <p className="text-4xl font-bold tracking-tighter text-black">{ghg.scope2Market.value.toLocaleString()}</p>
          <p className="text-sm text-black/50 mt-1">{ghg.scope2Market.unit}</p>
          <button className="text-xs text-black/60 hover:text-black hover:underline mt-3 flex items-center gap-1 font-medium">
            View root: {ghg.scope2Market.root}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-[#12C87A]/10 border border-[#12C87A]/20 rounded-[2rem] p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-[#12C87A]/20">
              <Target className="w-5 h-5 text-[#12C87A]" />
            </div>
            <p className="text-[10px] font-bold text-[#013328] uppercase tracking-widest">Target Progress</p>
          </div>
          <p className="text-4xl font-bold tracking-tighter text-[#013328]">-18%</p>
          <p className="text-sm text-[#12C87A] font-bold mt-1">-42% by 2030 target</p>
          <p className="text-[10px] font-bold text-[#12C87A] uppercase tracking-widest mt-2">On track</p>
        </div>
      </div>

      {/* Renewable Energy Metrics */}
      {renewableEnergy && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-black/5 pb-4">
            <div className="p-2 rounded-xl bg-[#12C87A]/10">
              <Zap className="w-5 h-5 text-[#12C87A]" />
            </div>
            <h3 className="text-sm font-bold text-black uppercase tracking-widest">Renewable Energy Metrics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">Installed Capacity</p>
              <p className="text-2xl font-bold text-black">{renewableEnergy.installedCapacityMW.toLocaleString()} MW</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">Generation</p>
              <p className="text-2xl font-bold text-black">{renewableEnergy.generationMWh.toLocaleString()} MWh</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">Renewable %</p>
              <p className="text-2xl font-bold text-black">{renewableEnergy.renewablePercentOfTotal}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">RECs Issued</p>
              <p className="text-2xl font-bold text-black">{renewableEnergy.recsIssued.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">Carbon Avoidance</p>
              <p className="text-2xl font-bold text-[#12C87A]">{renewableEnergy.carbonAvoidanceTCO2e.toLocaleString()} tCO₂e</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-black/5 flex gap-6 text-[10px] font-bold text-black/50 uppercase tracking-widest">
            <span>Solar: {renewableEnergy.breakdown.solar} MW</span>
            <span>Wind: {renewableEnergy.breakdown.wind} MW</span>
            <span>Hydro: {renewableEnergy.breakdown.hydro} MW</span>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Emissions Trend (Anchored Points)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ghgTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="scope1" stroke="#ef4444" strokeWidth={2} name="Scope 1" dot={{ fill: '#ef4444', r: 4 }} />
              <Line type="monotone" dataKey="scope2" stroke="#f59e0b" strokeWidth={2} name="Scope 2" dot={{ fill: '#f59e0b', r: 4 }} />
              <ReferenceLine y={10500} stroke="#12C87A" strokeDasharray="3 3" label={{ value: '2030 Target', fill: 'rgba(0,0,0,0.5)', fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4 opacity-80">Intensity vs Production</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" dataKey="year" name="Year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
              <YAxis type="number" dataKey="intensity" name="Intensity" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} label={{ value: 'tCO₂e/tonne', angle: -90, position: 'insideLeft', fill: 'rgba(0,0,0,0.5)', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(0,0,0,0.1)' }} />
              <Scatter name="Intensity" data={ghgTrends} fill="#12C87A" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Methodology & ZK Proofs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-black/5 pb-4">
            <FileText className="w-5 h-5 text-black/60" />
            <h3 className="text-sm font-bold text-black uppercase tracking-widest">Methodology</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/40 border border-white">
              <p className="text-sm font-bold text-black mb-2">GHG Protocol Corporate Standard</p>
              <p className="text-xs text-black/50">Evidence: EV-2024-045 (methodology_document.pdf)</p>
              <button className="text-xs text-black/60 hover:text-black hover:underline mt-2 font-medium">View evidence</button>
            </div>
            <div className="p-4 rounded-2xl bg-white/40 border border-white">
              <p className="text-sm font-bold text-black mb-2">Scope 2 Market-based approach</p>
              <p className="text-xs text-black/50">Evidence: EV-2024-046 (renewable_energy_certificates.xlsx)</p>
              <button className="text-xs text-black/60 hover:text-black hover:underline mt-2 font-medium">View evidence</button>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
                <TrendingDown className="w-4 h-4" />
                Methodology updated on 2024-10-15
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6 border-b border-black/5 pb-4">
            <CheckCircle2 className="w-5 h-5 text-[#12C87A]" />
            <h3 className="text-sm font-bold text-black uppercase tracking-widest">ZK Threshold Compliance</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#12C87A]/5 border border-[#12C87A]/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-black">Scope 1 &lt; 15,000 tCO₂e</span>
                <CheckCircle2 className="w-5 h-5 text-[#12C87A]" />
              </div>
              <p className="text-xs text-black/50">Proof verified on-chain</p>
              <button className="text-xs text-black/60 hover:text-black hover:underline mt-2 font-medium">View proof</button>
            </div>
            <div className="p-4 rounded-2xl bg-[#12C87A]/5 border border-[#12C87A]/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-black">Scope 2 &lt; 10,000 tCO₂e</span>
                <CheckCircle2 className="w-5 h-5 text-[#12C87A]" />
              </div>
              <p className="text-xs text-black/50">Proof verified on-chain</p>
              <button className="text-xs text-black/60 hover:text-black hover:underline mt-2 font-medium">View proof</button>
            </div>
            <div className="p-4 rounded-2xl bg-[#12C87A]/5 border border-[#12C87A]/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-black">YoY reduction &gt; 5%</span>
                <CheckCircle2 className="w-5 h-5 text-[#12C87A]" />
              </div>
              <p className="text-xs text-black/50">Proof verified on-chain</p>
              <button className="text-xs text-black/60 hover:text-black hover:underline mt-2 font-medium">View proof</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
