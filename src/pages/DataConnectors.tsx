import { useState } from 'react'
import clsx from 'clsx'
import {
    Plug, CheckCircle2, AlertCircle, Clock, RefreshCw,
    Plus, Database, X,
    AlertTriangle, Activity, Shield, Link2, DownloadCloud,
    Settings2, Fingerprint, ArrowRight
} from 'lucide-react'

type ConnectorStatus = 'connected' | 'pending' | 'error' | 'configuring'
type ConnectorCategory = 'erp' | 'hris' | 'cloud' | 'iot' | 'file' | 'analytics'

interface FieldMapping { source: string; target: string; transformation?: string }
interface Connector {
    id: string; name: string; vendor: string; description: string
    category: ConnectorCategory; status: ConnectorStatus
    logo: string; logoColor: string; logoBg: string; logoGlow: string
    recordsImported?: number; lastSync?: string; nextSync?: string
    fieldMappings: number; certifications: string[]; regions: string[]
    dataTypes: string[]; setupMinutes: number; sampleMappings: FieldMapping[]
    syncLog?: { time: string; status: string; records: number; message: string }[]
}

const connectors: Connector[] = [
    {
        id: 'sap-s4', name: 'SAP S/4HANA', vendor: 'SAP SE',
        description: 'Pull energy consumption, emissions, waste data, and production output from EHS modules',
        category: 'erp', status: 'connected', logo: 'SAP',
        logoColor: 'text-indigo-600', logoBg: 'bg-indigo-500/10 border-indigo-500/20', logoGlow: '',
        recordsImported: 4847, lastSync: '14 min ago', nextSync: 'in 46 min', fieldMappings: 38,
        certifications: ['GRI 302', 'IFRS S2'], regions: ['GCC', 'Europe'],
        dataTypes: ['Energy', 'Emissions', 'Waste'], setupMinutes: 45,
        sampleMappings: [
            { source: 'EHS_ENERGY.QTY', target: 'GRI-302-1.energy', transformation: '× 3.6 → GJ' },
        ],
        syncLog: [{ time: '14 min ago', status: 'success', records: 312, message: 'Energy Q1 2026 synced' }],
    },
    {
        id: 'oracle-cloud', name: 'Oracle Cloud ERP', vendor: 'Oracle',
        description: 'Procurement spend, supply chain tracking, and supplier sustainability metrics',
        category: 'erp', status: 'connected', logo: 'ORC',
        logoColor: 'text-rose-600', logoBg: 'bg-rose-500/10 border-rose-500/20', logoGlow: '',
        recordsImported: 1203, lastSync: '2 hrs ago', nextSync: 'in 22 hrs', fieldMappings: 24,
        certifications: ['GRI 204'], regions: ['Global'],
        dataTypes: ['Procurement Spend', 'Supply Chain'], setupMinutes: 40,
        sampleMappings: [
            { source: 'SCM.SUPPLIER_SPEND', target: 'GRI-204-1.localSpend', transformation: '% conversion' },
        ],
        syncLog: [{ time: '2 hrs ago', status: 'success', records: 1203, message: 'Supplier spend updated' }],
    },
    {
        id: 'workday', name: 'Workday HCM', vendor: 'Workday',
        description: 'HR data: headcount, gender diversity, training hours, parental leave metrics',
        category: 'hris', status: 'connected', logo: 'WD',
        logoColor: 'text-amber-600', logoBg: 'bg-amber-500/10 border-amber-500/20', logoGlow: '',
        recordsImported: 8921, lastSync: '6 hrs ago', nextSync: 'in 18 hrs', fieldMappings: 31,
        certifications: ['GRI 401', 'GRI 405'], regions: ['Global'],
        dataTypes: ['Headcount', 'Diversity', 'Training'], setupMinutes: 30,
        sampleMappings: [
            { source: 'Worker.Gender', target: 'GRI-405-1.diversity', transformation: 'Direct map' },
        ],
        syncLog: [{ time: '6 hrs ago', status: 'success', records: 8921, message: 'Q1 headcount sync' }],
    },
    {
        id: 'snowflake', name: 'Snowflake Pipeline', vendor: 'Snowflake Inc.',
        description: 'Custom SQL queries mapping directly into framework data models',
        category: 'analytics', status: 'error', logo: 'SNF',
        logoColor: 'text-cyan-600', logoBg: 'bg-cyan-500/10 border-cyan-500/20', logoGlow: '',
        recordsImported: 0, lastSync: 'Failed', fieldMappings: 19,
        certifications: ['Custom'], regions: ['Global'],
        dataTypes: ['Pre-calculated GHG'], setupMinutes: 60,
        sampleMappings: [],
        syncLog: [{ time: '5 mins ago', status: 'error', records: 0, message: 'Authentication token expired' }],
    },
    {
        id: 'azure-iot', name: 'Azure IoT Hub', vendor: 'Microsoft',
        description: 'Direct smart meter streaming for real-time facility energy monitoring',
        category: 'iot', status: 'pending', logo: 'IoT',
        logoColor: 'text-emerald-600', logoBg: 'bg-emerald-500/10 border-emerald-500/20', logoGlow: '',
        fieldMappings: 0, certifications: ['GRI 302'], regions: ['Europe Facilities'],
        dataTypes: ['Smart Meter (kWh)', 'HVAC runtime'], setupMinutes: 120, sampleMappings: [],
    }
]

export default function PremiumDataConnectors() {
    const [activeTab, setActiveTab] = useState<'all' | 'connected' | 'errors'>('all')
    const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null)

    const filtered = connectors.filter(c => {
        if (activeTab === 'connected') return c.status === 'connected'
        if (activeTab === 'errors') return c.status === 'error'
        return true
    })

    // Global Pipeline Stats
    const totalVolume = connectors.reduce((acc, c) => acc + (c.recordsImported || 0), 0)
    const connectedCount = connectors.filter(c => c.status === 'connected').length

    return (
        <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight flex items-center gap-3">
                        Data Pipelines
                    </h1>
                    <p className="text-sm text-black/60 mt-2 max-w-2xl font-medium tracking-wide">
                        Automate data ingestion from ERP, HRIS, and IoT sources. Nexus normalizes unit conversions, applies mapped logic, and anchors data providence hashes to the zkEVM.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-3 bg-white/60 border border-white hover:bg-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm">
                        <RefreshCw className="w-4 h-4" /> Sync All Active
                    </button>
                    <button className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-black/20 hover:scale-[1.02] transition-transform">
                        <Plus className="w-4 h-4" /> Add Integration
                    </button>
                </div>
            </div>

            {/* ── LIVE TELEMETRY STRIP ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
                <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg relative overflow-hidden">
                    <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Plug className="w-3.5 h-3.5" /> Active Pipelines</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold tracking-tighter text-black">{connectedCount} <span className="text-xl text-black/30">/ {connectors.length}</span></p>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg">
                    <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Total Volume</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold tracking-tighter text-black">{(totalVolume / 1000).toFixed(1)}k <span className="text-sm text-black/50 font-bold uppercase tracking-widest">Rec</span></p>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-lg border-l-4 border-l-indigo-500">
                    <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Active Mappings</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold tracking-tighter text-black">112</p>
                    </div>
                </div>

                <div className="bg-black text-white rounded-[2rem] p-6 shadow-xl shadow-black/20 relative overflow-hidden border-l-4 border-l-emerald-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[40px] pointer-events-none" />
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-1.5 relative z-10"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Anchored Hashes</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <p className="text-4xl font-bold tracking-tighter text-white">98.4%</p>
                    </div>
                </div>
            </div>

            {/* ── CONNECTOR LIST (Flex-1 to scroll) ── */}
            <div className="flex flex-col flex-1 min-h-[500px] bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-lg">
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none border-b border-black/5">
                    <button onClick={() => setActiveTab('all')} className={clsx("flex items-center gap-2 px-5 py-3 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'all' ? 'bg-black text-white' : 'bg-transparent text-black/50 hover:bg-black/5')}>All Applications</button>
                    <button onClick={() => setActiveTab('connected')} className={clsx("flex items-center gap-2 px-5 py-3 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'connected' ? 'bg-emerald-500 text-white' : 'bg-transparent text-black/50 hover:bg-black/5')}>
                        Connected <span className="bg-black/10 text-current text-[10px] px-1.5 rounded">{connectedCount}</span>
                    </button>
                    <button onClick={() => setActiveTab('errors')} className={clsx("flex items-center gap-2 px-5 py-3 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'errors' ? 'bg-rose-500 text-white' : 'bg-transparent text-black/50 hover:bg-black/5')}>
                        Needs Attention <span className="bg-black/10 text-current text-[10px] px-1.5 rounded">{connectors.filter(c => c.status === 'error').length}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 lg:auto-rows-max gap-6 overflow-y-auto pb-8 scrollbar-none">
                    {filtered.map(connector => (
                        <div
                            key={connector.id}
                            onClick={() => setSelectedConnector(connector)}
                            className="group bg-white/50 border border-white hover:border-black/10 rounded-[2rem] p-8 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl min-h-[260px]"
                        >
                            {/* Abstract Glow Hover */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            <div>
                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm bg-white border border-black/5 ${connector.logoColor} ${connector.logoGlow}`)}>
                                            {connector.logo}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-black">{connector.name}</h3>
                                            <p className="text-[10px] text-black/40 uppercase tracking-widest font-bold mt-1">{connector.vendor} · {connector.category}</p>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    {connector.status === 'connected' && (
                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
                                        </span>
                                    )}
                                    {connector.status === 'pending' && (
                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-black/5 border border-black/10 text-black/60 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                            Setup
                                        </span>
                                    )}
                                    {connector.status === 'error' && (
                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-700 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                            <AlertCircle className="w-3 h-3" /> Failed
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs text-black/60 font-medium leading-relaxed max-w-[90%] mb-6 relative z-10">
                                    {connector.description}
                                </p>
                            </div>

                            {/* Data Type Pills */}
                            <div className="flex flex-wrap gap-1.5 mb-6 mt-auto relative z-10">
                                {connector.dataTypes.map(type => (
                                    <span key={type} className="px-2.5 py-1 bg-white border border-black/5 text-black/60 font-bold uppercase tracking-widest text-[9px] rounded-md shadow-sm">
                                        {type}
                                    </span>
                                ))}
                            </div>

                            {/* Footer Metrics */}
                            <div className="pt-4 border-t border-black/5 flex items-center justify-between text-[10px] font-bold text-black/40 uppercase tracking-widest relative z-10">
                                <div className="flex items-center gap-4">
                                    {connector.status === 'connected' ? (
                                        <>
                                            <div className="flex items-center gap-1.5 text-black/60">
                                                <DownloadCloud className="w-3.5 h-3.5 text-indigo-500" /> {connector.recordsImported?.toLocaleString()} synced
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" /> {connector.lastSync}
                                            </div>
                                        </>
                                    ) : connector.status === 'error' ? (
                                        <div className="flex items-center gap-1.5 text-rose-600">
                                            <Activity className="w-3.5 h-3.5" /> Auth expired
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <Settings2 className="w-3.5 h-3.5" /> Est. {connector.setupMinutes}m
                                        </div>
                                    )}
                                </div>

                                {connector.status === 'connected' && (
                                    <div className="flex items-center gap-1 border border-black/10 px-2 py-1 rounded bg-white shadow-sm text-black/60">
                                        <Fingerprint className="w-3 h-3 opacity-50" /> 0xHash
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Slide-over Modal for Connector Details (Glassmorphic Light) ── */}
            {selectedConnector && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedConnector(null)} />

                    <div className="relative w-full max-w-xl bg-[#f8fafc] border-l border-white shadow-[0_0_50px_rgba(0,0,0,0.1)] flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-black/5 shrink-0 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-10 flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className={clsx(`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md bg-white border border-black/5 ${selectedConnector.logoColor}`)}>
                                    {selectedConnector.logo}
                                </div>
                                <div className="pt-1">
                                    <h2 className="text-2xl font-bold text-black mb-2">{selectedConnector.name}</h2>
                                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-black/40">
                                        <span>{selectedConnector.vendor}</span>
                                        <span className={clsx("px-2 py-0.5 rounded border",
                                            selectedConnector.status === 'connected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' :
                                                selectedConnector.status === 'pending' ? 'bg-black/5 border-black/10 text-black/60' :
                                                    'bg-rose-500/10 border-rose-500/20 text-rose-700'
                                        )}>
                                            {selectedConnector.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedConnector(null)} className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-full transition-colors mt-2">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content area */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin scrollbar-thumb-black/10">

                            {/* Setup Info Area */}
                            <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-3 flex items-center gap-2"><Settings2 className="w-4 h-4 text-black" /> Pipeline Configuration</h3>
                                <p className="text-sm font-medium text-black/70 mb-6 leading-relaxed bg-white p-4 rounded-xl shadow-sm border border-black/5">{selectedConnector.description}</p>

                                <div className="flex gap-6 p-6 rounded-2xl bg-white shadow-sm border border-black/5">
                                    <div className="flex-1">
                                        <p className="text-[10px] text-black/40 uppercase font-bold tracking-widest mb-2">Regions</p>
                                        <p className="text-sm font-bold text-black">{selectedConnector.regions.join(', ')}</p>
                                    </div>
                                    <div className="w-px bg-black/5" />
                                    <div className="flex-1">
                                        <p className="text-[10px] text-black/40 uppercase font-bold tracking-widest mb-2">Frameworks</p>
                                        <p className="text-sm font-bold text-black">{selectedConnector.certifications.join(', ')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Data Mapping Rules */}
                            {selectedConnector.sampleMappings.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-3 flex items-center gap-2"><Link2 className="w-4 h-4 text-indigo-500" /> Transformation Rules</h3>
                                    <div className="border border-black/5 rounded-2xl overflow-hidden bg-white shadow-sm">
                                        <div className="grid grid-cols-12 gap-2 p-4 border-b border-black/5 bg-black/5 text-[10px] font-bold tracking-widest uppercase text-black/50">
                                            <div className="col-span-5">Source Field</div>
                                            <div className="col-span-4">Target (Nexus)</div>
                                            <div className="col-span-3 text-right">Transform</div>
                                        </div>
                                        {selectedConnector.sampleMappings.map((map, i) => (
                                            <div key={i} className="grid grid-cols-12 gap-2 p-4 border-b border-black/5 last:border-0 text-xs items-center hover:bg-black/[0.02]">
                                                <div className="col-span-5 font-mono font-bold text-[10px] text-black/60 truncate" title={map.source}>{map.source}</div>
                                                <div className="col-span-4 text-indigo-600 font-bold font-mono text-[10px] truncate" title={map.target}>{map.target}</div>
                                                <div className="col-span-3 text-right text-[10px] font-bold uppercase tracking-wider text-black/40">{map.transformation}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sync Log */}
                            {selectedConnector.syncLog && (
                                <div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Recent Synchronization</h3>
                                    <div className="space-y-3">
                                        {selectedConnector.syncLog.map((log, i) => (
                                            <div key={i} className="flex gap-4 p-4 rounded-2xl border border-black/5 bg-white shadow-sm relative overflow-hidden text-sm items-center">
                                                <div className={clsx("w-2 h-full absolute left-0 top-0", log.status === 'success' ? 'bg-emerald-500' : log.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500')} />
                                                <div className="pl-2 w-20 shrink-0 text-[10px] font-bold uppercase tracking-widest text-black/40">{log.time}</div>
                                                <div className="flex-1 min-w-0 font-medium text-black/70">{log.message}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-black/50">{log.records} rec</div>
                                                {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                {log.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                                                {log.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer Actions */}
                        <div className="p-8 border-t border-black/5 bg-white flex gap-4 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                            {selectedConnector.status === 'connected' ? (
                                <>
                                    <button className="flex-1 py-3 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-black/20 hover:scale-[1.02] transition-transform flex justify-center items-center gap-2">
                                        <RefreshCw className="w-4 h-4" /> Force Sync
                                    </button>
                                    <button className="px-6 py-3 bg-white border border-black/10 text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black/5 transition-colors shadow-sm">
                                        Settings
                                    </button>
                                </>
                            ) : selectedConnector.status === 'error' ? (
                                <button className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-[1.02] transition-transform flex justify-center items-center gap-2">
                                    Re-Authenticate
                                </button>
                            ) : (
                                <button className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-transform flex justify-center items-center gap-2">
                                    Begin Setup <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
