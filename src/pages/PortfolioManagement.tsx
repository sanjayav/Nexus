import { useState } from 'react'
import {
    Activity, ArrowUpRight, ArrowDownRight, Globe2,
    Building2, Factory, Search, Plus, Filter,
    BarChart3, AlertCircle
} from 'lucide-react'
import clsx from 'clsx'

interface Entity {
    id: string
    name: string
    region: string
    industry: string
    emissions: number
    emissionsChange: number
    dataCoverage: number
    status: 'on_track' | 'at_risk' | 'lagging'
}

const mockEntities: Entity[] = [
    { id: '1', name: 'Asyad Ports', region: 'GCC', industry: 'Logistics', emissions: 145000, emissionsChange: -4.2, dataCoverage: 98, status: 'on_track' },
    { id: '2', name: 'Asyad Shipping', region: 'Global', industry: 'Maritime', emissions: 890000, emissionsChange: 1.5, dataCoverage: 92, status: 'at_risk' },
    { id: '3', name: 'Oman Rail', region: 'GCC', industry: 'Rail', emissions: 45000, emissionsChange: -12.4, dataCoverage: 100, status: 'on_track' },
    { id: '4', name: 'Asyad Logistics', region: 'GCC', industry: 'Logistics', emissions: 112000, emissionsChange: 5.8, dataCoverage: 76, status: 'lagging' },
    { id: '5', name: 'OICT', region: 'GCC', industry: 'Ports', emissions: 67000, emissionsChange: -2.1, dataCoverage: 95, status: 'on_track' },
    { id: '6', name: 'Asyad Drydock', region: 'GCC', industry: 'Shipbuilding', emissions: 230000, emissionsChange: 0.8, dataCoverage: 88, status: 'at_risk' },
]

export default function PortfolioManagement() {
    const [search, setSearch] = useState('')

    const filteredEntities = mockEntities.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.industry.toLowerCase().includes(search.toLowerCase())
    )

    const totalEmissions = mockEntities.reduce((acc, curr) => acc + curr.emissions, 0)
    const avgCoverage = Math.round(mockEntities.reduce((acc, curr) => acc + curr.dataCoverage, 0) / mockEntities.length)

    const getStatusStyle = (status: Entity['status']) => {
        switch (status) {
            case 'on_track': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
            case 'at_risk': return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
            case 'lagging': return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
        }
    }

    const getStatusLabel = (status: Entity['status']) => {
        switch (status) {
            case 'on_track': return 'On Track'
            case 'at_risk': return 'At Risk'
            case 'lagging': return 'Lagging'
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl border border-black/5 p-8 rounded-[2rem] shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                        </div>
                        Enterprise Portfolio
                    </h1>
                    <p className="text-sm font-medium text-black/60 mt-2 max-w-2xl leading-relaxed">
                        Aggregate, monitor, and compare ESG performance across all subsidiaries and holdings in real-time.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-4 bg-white border border-black/5 hover:bg-black/5 text-black rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm">
                        <BarChart3 className="w-4 h-4 text-indigo-500" /> Detailed Analytics
                    </button>
                    <button className="flex items-center gap-2 px-6 py-4 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] transition-transform">
                        <Plus className="w-4 h-4" /> Add Entity
                    </button>
                </div>
            </div>

            {/* ── SCORECARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/60 backdrop-blur-xl border border-black/5 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center shadow-sm">
                                <Factory className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                <ArrowDownRight className="w-3 h-3" /> 2.4% YoY
                            </span>
                        </div>
                        <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1">Total Portfolio Emissions</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-black">{(totalEmissions / 1000).toFixed(1)}k</span>
                            <span className="text-sm font-bold text-black/50">tCO₂e</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-xl border border-black/5 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center shadow-sm">
                                <Activity className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                <ArrowUpRight className="w-3 h-3" /> +5% vs Q1
                            </span>
                        </div>
                        <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1">Average Data Coverage</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-black">{avgCoverage}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-xl border border-black/5 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center shadow-sm">
                                <AlertCircle className="w-5 h-5 text-rose-600" />
                            </div>
                        </div>
                        <h3 className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1">Entities Needing Attention</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-black">{mockEntities.filter(e => e.status !== 'on_track').length}</span>
                            <span className="text-sm font-bold text-black/50">of {mockEntities.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── LIST VIEW ── */}
            <div className="bg-white/60 backdrop-blur-xl border border-black/5 rounded-[2rem] p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                        <input
                            type="text"
                            placeholder="Search entities by name or industry..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-black/5 rounded-xl text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-3 bg-white border border-black/5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black/60 hover:text-black hover:bg-black/5 transition-colors">
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-black/5 text-left text-[10px] font-bold uppercase tracking-widest text-black/40">
                                <th className="pb-4 pl-4 font-bold">Entity Name</th>
                                <th className="pb-4 font-bold">Industry / Region</th>
                                <th className="pb-4 font-bold">Emissions (tCO₂e)</th>
                                <th className="pb-4 font-bold">Δ vs Last Year</th>
                                <th className="pb-4 font-bold">Data Coverage</th>
                                <th className="pb-4 pr-4 font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {filteredEntities.map((entity) => (
                                <tr key={entity.id} className="hover:bg-black/[0.02] transition-colors group cursor-pointer">
                                    <td className="py-5 pl-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center shrink-0">
                                                <Building2 className="w-4 h-4 text-indigo-600 opacity-70" />
                                            </div>
                                            <div className="font-bold text-black text-sm">{entity.name}</div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="text-sm font-bold text-black">{entity.industry}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-black/40 flex items-center gap-1 mt-0.5">
                                            <Globe2 className="w-3 h-3" /> {entity.region}
                                        </div>
                                    </td>
                                    <td className="py-4 font-mono text-sm font-bold text-black">
                                        {entity.emissions.toLocaleString()}
                                    </td>
                                    <td className="py-4">
                                        <div className={clsx("flex items-center gap-1 text-xs font-bold", entity.emissionsChange > 0 ? "text-rose-600" : "text-emerald-600")}>
                                            {entity.emissionsChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {Math.abs(entity.emissionsChange)}%
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3 max-w-[150px]">
                                            <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                                                <div
                                                    className={clsx("h-full rounded-full transition-all duration-1000", entity.dataCoverage > 90 ? "bg-emerald-500" : entity.dataCoverage > 80 ? "bg-indigo-500" : "bg-amber-500")}
                                                    style={{ width: `${entity.dataCoverage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-black/60">{entity.dataCoverage}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 pr-4">
                                        <span className={clsx("px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border", getStatusStyle(entity.status))}>
                                            {getStatusLabel(entity.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
