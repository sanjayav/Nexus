import { useState } from 'react'
import { Calculator, ChevronRight, Zap, Truck, Plane, Users, Package } from 'lucide-react'
import { mockData } from '../data/mockData'
import clsx from 'clsx'

const categoryIcons: Record<number, typeof Package> = {
  1: Package, 3: Zap, 4: Truck, 6: Plane, 7: Users, 11: Zap,
}

export default function Scope3Calculator() {
  const { scope3, emissionFactors } = mockData
  const [activeCategory, setActiveCategory] = useState<number | null>(null)

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">Scope 3 Calculator</h1>
        <p className="text-sm text-black/60 mt-2 font-medium tracking-wide">
          GHG Protocol 15 categories. Activity-based and spend-based methodologies. Indian (CPCB/CEA) and global emission factors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 border-b border-black/5 pb-4">Scope 3 by Category</h3>
          <div className="space-y-3">
            {scope3.categories.map((cat) => {
              const Icon = categoryIcons[cat.id] || Package
              const pct = Math.round((cat.value / scope3.total) * 100)
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className={clsx(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                    activeCategory === cat.id ? "bg-black/5 border-black/20" : "bg-white/40 border-white hover:border-black/10"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-black/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-black text-sm">Category {cat.id}: {cat.name}</p>
                    <p className="text-xs text-black/50 mt-0.5">{cat.methodology} · {cat.coverage}% coverage</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-black">{cat.value.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-black/40 uppercase">{cat.unit}</p>
                  </div>
                  <div className="w-24 h-2 bg-black/5 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <ChevronRight className={clsx("w-5 h-5 text-black/30 transition-transform", activeCategory === cat.id && "rotate-90")} />
                </button>
              )
            })}
          </div>
          <div className="mt-6 pt-6 border-t border-black/5 flex justify-between items-center">
            <span className="text-sm font-bold text-black/60 uppercase tracking-widest">Total Scope 3</span>
            <span className="text-2xl font-bold text-black">{scope3.total.toLocaleString()} tCO₂e</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-black text-white rounded-[2rem] p-6 shadow-xl shadow-black/20">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Total Scope 3</p>
            <p className="text-4xl font-bold tracking-tighter">{scope3.total.toLocaleString()}</p>
            <p className="text-sm text-white/60 mt-1">tCO₂e (6 categories measured)</p>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-4 border-b border-black/5 pb-3">Emission Factors (India)</h3>
            <div className="space-y-3">
              {Object.entries(emissionFactors.india).map(([key, v]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-black/70">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="font-mono font-bold text-black">{v.value} {v.unit}</span>
                </div>
              ))}
              <p className="text-[10px] text-black/40 mt-2">Source: CEA, CPCB, IPCC. FY24.</p>
            </div>
          </div>

          <div className="bg-[#12C87A]/10 border border-[#12C87A]/20 rounded-[2rem] p-6 shadow-lg">
            <h3 className="text-sm font-bold text-[#013328] uppercase tracking-widest mb-3">Run Calculation</h3>
            <p className="text-xs text-black/60 mb-4">Supply chain emissions engine using activity data and emission factors.</p>
            <button className="w-full py-3 bg-white text-[#12C87A] font-bold text-xs uppercase tracking-widest rounded-xl border border-[#12C87A]/30 hover:scale-[1.02] transition-transform">
              <Calculator className="w-4 h-4 inline mr-2" /> Run Engine
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
