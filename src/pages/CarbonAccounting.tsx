import clsx from 'clsx'
import { Activity, Zap, CloudLightning, RefreshCw, BarChart } from 'lucide-react'

export default function CarbonAccounting() {
    return (
        <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">

            {/* Top Cards matching "Over all information" / "Month Progress" */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Black summary card */}
                <div className="md:col-span-2 bg-black text-white rounded-[2rem] p-8 shadow-2xl shadow-black/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <span className="text-sm font-semibold opacity-80 uppercase tracking-widest">Total Corporate Carbon</span>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
                                <Activity className="w-3 h-3" /> LIVE SYNC
                            </div>
                        </div>
                        <div className="flex items-baseline gap-3 mb-8">
                            <span className="text-6xl font-bold tracking-tighter">14,285</span>
                            <span className="text-sm text-white/50 uppercase tracking-widest font-bold">tCO₂e</span>
                        </div>
                    </div>

                    {/* Mini Stats (Scope breakdown) */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/5 hover:bg-white/20 transition-colors cursor-pointer">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 mb-2" />
                            <span className="block text-2xl font-bold">1.2k</span>
                            <span className="block text-[10px] opacity-70 mt-1 uppercase tracking-widest">Scope 1</span>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/5 hover:bg-white/20 transition-colors cursor-pointer">
                            <div className="w-2 h-2 rounded-full bg-indigo-400 mb-2" />
                            <span className="block text-2xl font-bold">3.8k</span>
                            <span className="block text-[10px] opacity-70 mt-1 uppercase tracking-widest">Scope 2</span>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/5 hover:bg-white/20 transition-colors cursor-pointer">
                            <div className="w-2 h-2 rounded-full bg-rose-400 mb-2" />
                            <span className="block text-2xl font-bold">9.2k</span>
                            <span className="block text-[10px] opacity-70 mt-1 uppercase tracking-widest">Scope 3</span>
                        </div>
                    </div>
                </div>

                {/* White Progress Cards - Aligned with the 'Month Progress' card in UI */}
                <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <span className="text-sm font-bold text-black uppercase tracking-widest opacity-60">SBTi Target</span>
                        <BarChart className="w-5 h-5 text-black/50" />
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center">
                        {/* Circular Progress Mockup */}
                        <div className="relative w-32 h-32 flex justify-center items-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(0,0,0,0.1)" strokeWidth="8" />
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#000" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="100.48" className="transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-black">60%</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] font-bold text-black/40 text-center uppercase tracking-widest mt-6">
                        - 40% CO₂e reduction by 2030
                    </p>
                </div>

                {/* White Action Card - Aligned with the UI structure */}
                <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                                <CloudLightning className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold opacity-80">Calculations</span>
                        </div>
                        <h3 className="text-2xl font-bold text-black leading-tight mb-2">Engage Supply Engine</h3>
                        <p className="text-xs text-black/50 font-medium">Activity-based calculators for Scope 3 categorisation are ready.</p>
                    </div>

                    <button className="w-full py-3 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] shadow-xl shadow-black/20 transition-all flex items-center justify-center gap-2 mt-4">
                        <RefreshCw className="w-3 h-3" /> Run Engine
                    </button>
                </div>
            </div>

            {/* Bottom Row - Data Table mimicking 'Task In process' list */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg flex flex-col h-full min-h-[400px]">
                <div className="flex justify-between items-center mb-8">
                    <span className="text-lg font-bold text-black tracking-tight">Emissions Register (GHG Protocol)</span>
                    <button className="text-xs font-bold text-black/50 hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors">
                        Add Record <span className="text-lg leading-none mb-0.5 ml-1">+</span>
                    </button>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 pb-4 border-b border-black/10 text-[10px] font-bold text-black/40 uppercase tracking-widest">
                    <div className="col-span-3">Activity Description</div>
                    <div className="col-span-2">Factor Source</div>
                    <div className="col-span-2 text-right">Raw Amount</div>
                    <div className="col-span-2 text-center">Unit</div>
                    <div className="col-span-2 text-right">Calculated tCO₂e</div>
                    <div className="col-span-1 text-center">Status</div>
                </div>

                {/* Table Rows */}
                <div className="flex-1 space-y-2 mt-4">
                    {[
                        { activity: 'Grid Electricity - Frankfurt HQ', source: 'DEFRA 2024', amount: '850,000', unit: 'kWh', result: '198.4', status: 'done', scope: 2 },
                        { activity: 'Fleet Fuel - Diesel (Europe)', source: 'US EPA 2023', amount: '124,500', unit: 'Liters', result: '332.1', status: 'done', scope: 1 },
                        { activity: 'Business Travel - Long Haul Flights', source: 'Climatiq ER', amount: '2.4M', unit: 'Passenger km', result: '480.0', status: 'pending', scope: 3 },
                        { activity: 'Purchased Goods - Steel (Supplier X)', source: 'Ecoinvent 3.9', amount: '12,000', unit: 'Tonnes', result: '22,800.0', status: 'done', scope: 3 },
                    ].map((row, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 py-4 border-b border-black/5 items-center hover:bg-white/40 rounded-xl px-2 transition-colors cursor-pointer group">
                            <div className="col-span-3 font-semibold text-black text-sm flex items-center gap-3">
                                <div className={clsx(
                                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border",
                                    row.scope === 1 ? 'bg-emerald-400/20 border-emerald-400 text-emerald-600' :
                                        row.scope === 2 ? 'bg-indigo-400/20 border-indigo-400 text-indigo-600' :
                                            'bg-rose-400/20 border-rose-400 text-rose-600'
                                )}>
                                    <span className="text-[10px] font-bold">S{row.scope}</span>
                                </div>
                                <span className="truncate">{row.activity}</span>
                            </div>
                            <div className="col-span-2 text-xs text-black/60 font-medium bg-black/5 px-2 py-1 rounded inline-flex self-center w-max">{row.source}</div>
                            <div className="col-span-2 text-right text-xs text-black/80 font-mono tracking-tighter">{row.amount}</div>
                            <div className="col-span-2 text-center text-[10px] text-black/50 uppercase font-bold tracking-widest">{row.unit}</div>
                            <div className="col-span-2 text-right text-sm font-bold text-black border-r border-black/10 pr-4">{row.result}</div>
                            <div className="col-span-1 flex justify-center">
                                {row.status === 'done' ? (
                                    <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center shadow-md shadow-black/20 group-hover:scale-110 transition-transform">
                                        <Zap className="w-3 h-3 text-white" />
                                    </div>
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-dashed border-black/30 animate-spin-slow" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
