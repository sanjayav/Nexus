import { ExternalLink, Shield, Globe2, Flag, ArrowRight, Database, CheckSquare2, BarChart3, Target, Sparkles } from 'lucide-react'
import { mockData } from '../data/mockData'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import clsx from 'clsx'

const CORE_WAYS = [
  {
    id: 1,
    title: 'Collect',
    desc: 'Select the relevant metrics, invite users to collect ESG data and track progress of data requests.',
    icon: Database,
    path: '/frameworks',
    badge: 'AI',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 2,
    title: 'Comply',
    desc: 'Comply with the latest ESG regulations and frameworks as they evolve.',
    icon: CheckSquare2,
    path: '/dma',
    badge: null,
    color: 'from-indigo-500 to-violet-600',
  },
  {
    id: 3,
    title: 'Report',
    desc: 'Measure, analyse and report your ESG performance from a centralised platform.',
    icon: BarChart3,
    path: '/analytics',
    badge: 'AI',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 4,
    title: 'Improve',
    desc: 'Set targets and action plans to improve your ESG performance.',
    icon: Target,
    path: '/ghg',
    badge: null,
    color: 'from-rose-500 to-pink-600',
  },
]

// Pioneer features (all-in-one)
const PIONEER_LINKS = [
  { label: 'Scope 3 Calculator', path: '/scope3' },
  { label: 'AI Studio', path: '/ai' },
  { label: 'Workflow Config', path: '/workflow' },
  { label: 'XBRL Export', path: '/publish' },
]

export default function ExecutiveOverview() {
  const navigate = useNavigate()
  const {
    frameworks,
    dma,
    ghg,
    integrity,
    rollup,
    coverageByModule,
    approvalsFunnel,
    alerts,
  } = mockData

  const periodLabel = 'FY2025'
  const regionMode = 'Global + China'

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">

      {/* Header aligned with Light Glassmorphism Growth UI */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight flex items-center gap-3">
            Command Center
          </h1>
          <p className="text-sm text-black/60 mt-2 max-w-2xl font-medium tracking-wide">
            You're on track. Close the remaining gaps to publish the {periodLabel} pack.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-white rounded-xl text-[10px] font-bold uppercase tracking-widest text-black/70 shadow-sm">
            <Globe2 className="w-3.5 h-3.5" />
            {regionMode}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md">
            <Shield className="w-3.5 h-3.5" />
            Integrity Verified
          </div>
        </div>
      </div>

      {/* 4 Core Ways — Collect, Comply, Report, Improve */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-[2rem] p-8 shadow-xl">
        <h3 className="text-sm font-bold text-black/60 uppercase tracking-widest mb-6">Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CORE_WAYS.map((way) => {
            const Icon = way.icon
            return (
              <button
                key={way.id}
                onClick={() => navigate(way.path)}
                className="group relative flex flex-col items-start p-6 rounded-2xl bg-black text-white text-left hover:scale-[1.02] transition-all shadow-lg shadow-black/10 overflow-hidden"
              >
                <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-90', way.color)} />
                <div className="relative z-10 w-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl font-bold text-white/90">{way.id}</span>
                    {way.badge && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-widest">
                        <Sparkles className="w-3 h-3" /> {way.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{way.title}</h4>
                  <p className="text-sm text-white/80 font-medium leading-relaxed">{way.desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                    <Icon className="w-4 h-4" /> Open
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <div className="mt-8 pt-8 border-t border-black/5 grid grid-cols-1 md:grid-cols-4 gap-4">
          <h4 className="text-[10px] font-bold text-black/40 uppercase tracking-widest col-span-full">Quick Links</h4>
          <Link to="/dma" className="text-sm font-medium text-black/70 hover:text-black hover:underline">How does Nexus support CSRD / BRSR compliance?</Link>
          <Link to="/carbon" className="text-sm font-medium text-black/70 hover:text-black hover:underline">How can I submit EDCI and GHG data?</Link>
          <Link to="/ghg" className="text-sm font-medium text-black/70 hover:text-black hover:underline">How can I set targets and action plans to improve?</Link>
          <Link to="/scope3" className="text-sm font-medium text-black/70 hover:text-black hover:underline">Scope 3 calculator & supply chain</Link>
        </div>
        <div className="mt-4 pt-4 border-t border-black/5">
          <h4 className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-3">Pioneer Features</h4>
          <div className="flex flex-wrap gap-2">
            {PIONEER_LINKS.map((l) => (
              <Link key={l.path} to={l.path} className="px-3 py-1.5 bg-black/5 hover:bg-black/10 rounded-lg text-xs font-bold text-black/70 hover:text-black transition-colors border border-black/5">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        {/* Pipeline / DMA Progress (Black Card) */}
        <div className="bg-black text-white rounded-[2rem] p-8 shadow-2xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-sm font-semibold opacity-80 uppercase tracking-widest">Reporting Pipeline</span>
              <div className="flex flex-col text-right">
                <span className="text-3xl font-bold">{dma.percentage}%</span>
                <span className="text-[10px] text-white/50 uppercase tracking-widest">DMA Completion</span>
              </div>
            </div>

            <div className="mt-8 relative z-10 text-[10px] font-bold uppercase tracking-widest text-white/50 flex justify-between mb-2">
              <span>Setup</span>
              <span className="text-white">DMA</span>
              <span>Collection</span>
              <span>Review</span>
              <span>Publish</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative z-10">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                style={{ width: `${dma.percentage}%` }}
              />
            </div>
            <p className="mt-4 text-[10px] font-medium text-white/50 uppercase tracking-widest">
              {alerts.filter(a => a.level === 'error').length} blocking issues.
            </p>
          </div>
        </div>

        {/* Risk / Alerts summary (White Card) */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-black uppercase tracking-widest opacity-60">Risk Strip</span>
            <Flag className="w-5 h-5 text-rose-500" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-black">Critical gaps</span>
              <span className="text-xl font-bold text-rose-500">{alerts.filter(a => a.level === 'error').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-black">Missing evidence</span>
              <span className="text-xl font-bold text-amber-500">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-black/60 font-medium">Expiring targets</span>
              <span className="text-lg font-bold text-black/60">2</span>
            </div>
          </div>

          <Link
            to="/workbench?filter=Critical"
            className="mt-6 w-full py-3 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-xl shadow-black/10"
          >
            Resolve Gaps <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Grid for KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* Framework Coverage */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <h3 className="text-xs font-bold text-black/50 uppercase tracking-widest mb-6 border-b border-black/5 pb-3">Framework Coverage</h3>
          <div className="space-y-4">
            {Object.entries(frameworks).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between items-center text-xs font-bold text-black uppercase tracking-widest mb-1">
                  <span>{key}</span>
                  <span>{value.covered}%</span>
                </div>
                <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-1000", value.covered > 80 ? 'bg-indigo-500' : 'bg-black')}
                    style={{ width: `${value.covered}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GHG Snapshot */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <h3 className="text-xs font-bold text-black/50 uppercase tracking-widest mb-6 border-b border-black/5 pb-3">GHG Snapshot</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-black/60 uppercase tracking-widest">Scope 1</span>
              <div className="text-right">
                <span className="text-lg font-bold text-black">{ghg.scope1.value.toLocaleString()}</span>
                <span className="text-[10px] text-black/40 font-bold ml-1">{ghg.scope1.unit}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-black/60 uppercase tracking-widest">Scope 2 (loc)</span>
              <div className="text-right">
                <span className="text-lg font-bold text-black">{ghg.scope2Location.value.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-black/60 uppercase tracking-widest">Scope 2 (mkt)</span>
              <div className="text-right">
                <span className="text-lg font-bold text-black">{ghg.scope2Market.value.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button className="w-full mt-4 py-2 border border-black/10 rounded-xl text-[10px] font-bold text-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors flex justify-center items-center gap-1.5">
            Calculate Roots <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Integrity Index */}
        <div className="bg-black text-white rounded-[2rem] p-6 shadow-xl shadow-black/20 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none" />
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-6 border-b border-white/10 pb-3">Trust Layer</h3>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-bold tracking-tighter text-white">{integrity.score}</span>
            <span className="text-xs text-white/40 uppercase font-bold tracking-widest">/ 100</span>
          </div>

          <div className="space-y-2 mt-4 text-[10px] font-bold text-white/50 uppercase tracking-widest">
            <div className="flex justify-between items-center">
              <span>Anchored</span>
              <span className="text-white">{integrity.weights.anchoredCompleteness.score}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Approvals</span>
              <span className="text-white">{integrity.weights.approvalsPass.score}%</span>
            </div>
          </div>

          <div className="w-full text-center mt-4 bg-white/10 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3 text-indigo-400" /> Web3 Integrity Active
          </div>
        </div>

        {/* Period Roll-up */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg flex flex-col justify-between">
          <h3 className="text-xs font-bold text-black/50 uppercase tracking-widest mb-6 border-b border-black/5 pb-3">Roll-up Data</h3>

          <div>
            <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest mb-2">Blockchain Root</p>
            <div className="font-mono text-xs bg-black/5 border border-black/10 px-3 py-2 rounded-xl text-black truncate">
              {rollup.shortRoot}
            </div>
          </div>

          <button className="w-full py-3 bg-white text-black font-bold text-[10px] uppercase tracking-widest rounded-xl mt-4 hover:shadow-md transition-all border border-black/10 flex justify-center items-center gap-2">
            View on zkEVM Explorer <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 opacity-80 border-b border-black/10 pb-4">Activity Approvals</h3>
          <div className="space-y-4">
            {approvalsFunnel.map((stage) => (
              <div key={stage.stage}>
                <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-black/60 uppercase tracking-widest">
                  <span>{stage.stage}</span>
                  <span>{stage.count} Files</span>
                </div>
                <div className="h-6 w-full bg-black/5 rounded-full overflow-hidden flex items-center">
                  <div
                    className="h-full bg-black rounded-full"
                    style={{
                      width: `${(stage.count / approvalsFunnel[0].count) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6 border-b border-black/10 pb-4">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest opacity-80">Coverage By Module</h3>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverageByModule}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="module" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="covered" fill="#000" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  )
}
