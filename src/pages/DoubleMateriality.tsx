import { useState } from 'react'
import clsx from 'clsx'
import {
  Circle, ArrowRight, Focus, Shield, FileCheck,
  AlertTriangle, CheckCircle2, Link2, BarChart3, ChevronRight
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { mockData } from '../data/mockData'

// Material topics with full DMA data (CSRD / BRSR aligned)
const materialTopics = [
  { id: '1', name: 'GHG Emissions (Scope 1 & 2)', envImpact: 92, finImpact: 95, category: 'Environment', disclosures: ['GRI 305-1', 'IFRS S2', 'BRSR P5'], status: 'approved', stakeholders: 95 },
  { id: '2', name: 'Renewable Energy Generation', envImpact: 95, finImpact: 88, category: 'Environment', disclosures: ['GRI 302-1', 'BRSR P5-E1'], status: 'approved', stakeholders: 92 },
  { id: '3', name: 'Data Security & Privacy', envImpact: 25, finImpact: 90, category: 'Governance', disclosures: ['GRI 418-1', 'BRSR P1'], status: 'approved', stakeholders: 88 },
  { id: '4', name: 'Supply Chain Human Rights', envImpact: 72, finImpact: 65, category: 'Social', disclosures: ['GRI 414', 'BRSR P6'], status: 'in_review', stakeholders: 75 },
  { id: '5', name: 'Water Management', envImpact: 68, finImpact: 45, category: 'Environment', disclosures: ['GRI 303', 'BRSR P5'], status: 'approved', stakeholders: 82 },
  { id: '6', name: 'Employee Health & Safety', envImpact: 55, finImpact: 72, category: 'Social', disclosures: ['GRI 403', 'BRSR P3'], status: 'approved', stakeholders: 90 },
  { id: '7', name: 'Waste & Circular Economy', envImpact: 78, finImpact: 38, category: 'Environment', disclosures: ['GRI 306', 'BRSR P5'], status: 'approved', stakeholders: 70 },
  { id: '8', name: 'Board Diversity & Inclusion', envImpact: 42, finImpact: 58, category: 'Governance', disclosures: ['GRI 405', 'BRSR P4'], status: 'approved', stakeholders: 85 },
  { id: '9', name: 'Community & CSR', envImpact: 65, finImpact: 52, category: 'Social', disclosures: ['GRI 413', 'BRSR P8'], status: 'in_review', stakeholders: 78 },
]

const DMA_PROCESS_STEPS = [
  { step: 1, label: 'Stakeholder engagement', done: true, desc: '47 interviews, 1,200+ survey respondents' },
  { step: 2, label: 'Impact assessment', done: true, desc: 'Environmental & social impacts across value chain' },
  { step: 3, label: 'Financial materiality', done: true, desc: 'Risks & opportunities affecting enterprise value' },
  { step: 4, label: 'Validation & approval', done: true, desc: 'Sustainability Committee & Board sign-off' },
  { step: 5, label: 'Integration', done: true, desc: 'Topics embedded into strategy & KPI framework' },
]

export default function DoubleMateriality() {
  const [selectedTopic, setSelectedTopic] = useState(materialTopics[0])
  const [activeTab, setActiveTab] = useState<'matrix' | 'process' | 'disclosures'>('matrix')
  const navigate = useNavigate()
  const { dma } = mockData

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight">Double Materiality Assessment</h1>
          <p className="text-sm text-black/60 mt-2 max-w-2xl font-medium tracking-wide">
            CSRD & BRSR aligned. Identify material topics through impact and financial materiality, map to disclosures, and drive compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/analytics/benchmark" className="flex items-center gap-2 px-5 py-3 bg-white/60 border border-white hover:bg-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm">
            <BarChart3 className="w-4 h-4" /> Benchmark
          </Link>
          <button onClick={() => navigate('/frameworks')} className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-black/20 hover:scale-[1.02] transition-transform">
            Map to Disclosures <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-black/5">
        {[
          { id: 'matrix' as const, label: 'Impact Matrix', icon: Focus },
          { id: 'process' as const, label: 'DMA Process', icon: FileCheck },
          { id: 'disclosures' as const, label: 'Disclosure Mapping', icon: Link2 },
        ].map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                'flex items-center gap-2 px-5 py-3 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap',
                isActive ? 'bg-black text-white' : 'bg-transparent text-black/50 hover:bg-black/5'
              )}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-black text-white rounded-[2rem] p-6 shadow-xl shadow-black/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px]" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">DMA Completion</p>
            <p className="text-4xl font-bold tracking-tighter">{dma.percentage}%</p>
            <p className="text-[10px] font-bold text-emerald-400 uppercase mt-1">+{dma.change}% vs last period</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-2">Total Topics</p>
          <p className="text-4xl font-bold tracking-tighter text-black">{dma.totalMaterialTopics}</p>
          <p className="text-[10px] font-bold text-black/40 uppercase mt-1">Assessed</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-2">Material Topics</p>
          <p className="text-4xl font-bold tracking-tighter text-black">{dma.topicsWithCompleteDMA}</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">With complete DMA</p>
        </div>
        <div className="bg-[#12C87A]/10 border border-[#12C87A]/20 rounded-[2rem] p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#12C87A]" />
            <p className="text-[10px] font-bold text-[#013328] uppercase tracking-widest">CSRD / BRSR</p>
          </div>
          <p className="text-4xl font-bold tracking-tighter text-[#013328]">Aligned</p>
          <p className="text-[10px] font-bold text-[#12C87A] uppercase mt-1">Framework ready</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-2">In Review</p>
          <p className="text-4xl font-bold tracking-tighter text-black">{materialTopics.filter(t => t.status === 'in_review').length}</p>
          <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Pending validation</p>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
            <div className="flex justify-between items-start mb-6">
              <span className="text-sm font-bold text-black opacity-80">Impact vs Financial Materiality Matrix</span>
              <div className="flex items-center gap-4 text-[10px] font-bold text-black/40 uppercase tracking-wider">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Env</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Soc</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Gov</div>
              </div>
            </div>
            <div className="relative border-l-2 border-b-2 border-black/10 ml-8 mb-8 h-80">
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-black/50 tracking-widest uppercase">Financial Impact</div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-black/50 tracking-widest uppercase">Environmental / Social Impact</div>
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-black/10" />
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-black/10" />
              <div className="absolute top-4 right-4 text-[10px] font-bold text-black/20">HIGH MAT (REPORT)</div>
              {materialTopics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className={clsx(
                    'absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full cursor-pointer transition-transform hover:scale-125 shadow-md',
                    topic.category === 'Environment' ? 'bg-emerald-400' : topic.category === 'Social' ? 'bg-indigo-400' : 'bg-amber-400',
                    selectedTopic.id === topic.id ? 'ring-4 ring-black/20 scale-110' : ''
                  )}
                  style={{ left: `${topic.envImpact}%`, bottom: `${topic.finImpact}%` }}
                  title={topic.name}
                />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
              <span className="text-xs font-bold text-black/50 uppercase tracking-wider">{selectedTopic.category} Materiality</span>
              <h3 className="text-xl font-bold text-black mt-2 mb-2">{selectedTopic.name}</h3>
              <p className="text-sm text-black/60 font-medium mb-4">Topic in High/High zone. Mandatory reporting under CSRD & BRSR.</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">
                    <span>Financial Impact</span><span>{selectedTopic.finImpact}/100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
                    <div className="h-full bg-black rounded-full" style={{ width: `${selectedTopic.finImpact}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">
                    <span>Env/Soc Impact</span><span>{selectedTopic.envImpact}/100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
                    <div className="h-full bg-black rounded-full" style={{ width: `${selectedTopic.envImpact}%` }} />
                  </div>
                </div>
              </div>
              <button onClick={() => navigate(`/frameworks`)} className="w-full mt-4 py-3 bg-black/5 border border-black/10 rounded-xl text-sm font-bold text-black hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2">
                View Policies <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black text-white rounded-[2rem] p-6 shadow-xl shadow-black/20">
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 block">Stakeholder Alignment</span>
              <div className="space-y-3">
                {[
                  { name: 'Executive Board', p: '100%' },
                  { name: 'Investors', p: '92%' },
                  { name: 'Employees', p: '88%' },
                  { name: 'Communities', p: '78%' },
                ].map((st) => (
                  <div key={st.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Circle className="w-2 h-2 fill-current text-white/50" />
                      <span className="text-sm font-semibold">{st.name}</span>
                    </div>
                    <span className="text-sm font-bold font-mono bg-white/10 px-2 py-0.5 rounded-lg">{st.p}</span>
                  </div>
                ))}
              </div>
              <button className="w-full py-3 bg-white text-black font-bold text-sm rounded-xl mt-6 hover:scale-[1.02] transition-transform">
                Send Alignment Survey
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'process' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4">DMA Process (CSRD Art. 19)</h3>
            <div className="space-y-4">
              {DMA_PROCESS_STEPS.map((s) => (
                <div key={s.step} className="flex items-start gap-4 p-4 rounded-2xl bg-white/40 border border-white">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.done ? 'bg-emerald-500/10 text-emerald-600' : 'bg-black/5 text-black/40')}>
                    {s.done ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-lg font-bold">{s.step}</span>}
                  </div>
                  <div>
                    <p className="font-bold text-black">{s.label}</p>
                    <p className="text-sm text-black/50 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-[#12C87A]/5 border border-[#12C87A]/20 rounded-[2rem] p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="w-5 h-5 text-[#12C87A]" />
                <h3 className="text-sm font-bold text-[#013328]">Process Documentation</h3>
              </div>
              <p className="text-sm text-black/70 leading-relaxed">
                Comprehensive double materiality assessment conducted in Q2 FY2025: (1) Stakeholder engagement — 47 interviews, 1,200+ survey respondents; (2) Impact assessment — environmental & social impacts across value chain; (3) Financial materiality — risks & opportunities affecting enterprise value; (4) Validation — Sustainability Committee & Board approval; (5) Integration — topics embedded into strategy & KPI framework.
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
              <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/analytics" className="flex items-center justify-between p-3 rounded-xl bg-black/5 hover:bg-black/10 transition-colors text-sm font-medium text-black">
                  How does Nexus support CSRD compliance? <ChevronRight className="w-4 h-4 text-black/40" />
                </Link>
                <Link to="/carbon" className="flex items-center justify-between p-3 rounded-xl bg-black/5 hover:bg-black/10 transition-colors text-sm font-medium text-black">
                  How does Nexus help with GHG / EDCI submissions? <ChevronRight className="w-4 h-4 text-black/40" />
                </Link>
                <Link to="/ghg" className="flex items-center justify-between p-3 rounded-xl bg-black/5 hover:bg-black/10 transition-colors text-sm font-medium text-black">
                  How can I set targets and action plans? <ChevronRight className="w-4 h-4 text-black/40" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'disclosures' && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4">Material Topics → Disclosure Mapping</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/10 text-[10px] font-bold text-black/40 uppercase tracking-widest">
                <th className="pb-4">Topic</th>
                <th className="pb-4">Category</th>
                <th className="pb-4">Disclosures</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">Stakeholder %</th>
                <th className="pb-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {materialTopics.map((t) => (
                <tr key={t.id} className="hover:bg-white/40 transition-colors">
                  <td className="py-4 font-bold text-black text-sm">{t.name}</td>
                  <td className="py-4"><span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold border', t.category === 'Environment' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : t.category === 'Social' ? 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20' : 'bg-amber-500/10 text-amber-700 border-amber-500/20')}>{t.category}</span></td>
                  <td className="py-4"><span className="text-xs font-mono text-black/60">{t.disclosures.join(', ')}</span></td>
                  <td className="py-4"><span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold border', t.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20')}>{t.status === 'approved' ? 'Approved' : 'In Review'}</span></td>
                  <td className="py-4 font-bold text-black">{t.stakeholders}%</td>
                  <td className="py-4 text-right">
                    <button onClick={() => navigate('/frameworks')} className="px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:scale-105 transition-transform shadow-md">Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Validation Alert (KEY ESG style) */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 shadow-lg flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-800">Data validation</h4>
          <p className="text-sm text-black/70 mt-1">2 topics in review. Complete stakeholder alignment for &quot;Supply Chain Human Rights&quot; and &quot;Community & CSR&quot; to finalise DMA.</p>
          <button className="mt-3 px-4 py-2 bg-amber-500/20 text-amber-800 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-amber-500/30 transition-colors">Review Now</button>
        </div>
      </div>
    </div>
  )
}
