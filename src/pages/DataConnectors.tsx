import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { createPortal } from 'react-dom'
import {
    Plug, CheckCircle2, AlertCircle, Clock, RefreshCw,
    Plus, Database, X,
    AlertTriangle, Activity, Shield, Link2, DownloadCloud,
    Settings2, Fingerprint, ArrowRight,
} from 'lucide-react'
import { fmt, useFormat, useStrings } from '../i18n'
import { dataConnectorsStrings } from '../i18n/pages/dataConnectors'
import { PageHeader, Card, Button, Badge, StatCard, Tabs, EmptyState, Tone } from '../components/ui'

type ConnectorStatus = 'connected' | 'pending' | 'error' | 'configuring'
type ConnectorCategory = 'erp' | 'hris' | 'cloud' | 'iot' | 'file' | 'analytics'
type ConnectorId = 'sap-s4' | 'oracle-cloud' | 'workday' | 'snowflake' | 'azure-iot'

interface Connector {
    id: ConnectorId; name: string; vendor: string
    category: ConnectorCategory; status: ConnectorStatus
    logo: string; logoColor: string
    recordsImported?: number
    fieldMappings: number; certifications: string[]; regions: string[]
    setupMinutes: number; sampleMappings: { source: string; target: string }[]
    syncLog?: { status: 'success' | 'warning' | 'error'; records: number }[]
}

// Display text (descriptions, data types, relative times, log messages) lives in the dictionary, keyed by id.
const connectors: Connector[] = [
    {
        id: 'sap-s4', name: 'SAP S/4HANA', vendor: 'SAP SE', category: 'erp', status: 'connected', logo: 'SAP',
        logoColor: 'text-sky-700', recordsImported: 4847, fieldMappings: 38,
        certifications: ['GRI 302', 'IFRS S2'], regions: ['GCC', 'Europe'], setupMinutes: 45,
        sampleMappings: [{ source: 'EHS_ENERGY.QTY', target: 'GRI-302-1.energy' }],
        syncLog: [{ status: 'success', records: 312 }],
    },
    {
        id: 'oracle-cloud', name: 'Oracle Cloud ERP', vendor: 'Oracle', category: 'erp', status: 'connected', logo: 'ORC',
        logoColor: 'text-rose-600', recordsImported: 1203, fieldMappings: 24,
        certifications: ['GRI 204'], regions: ['Global'], setupMinutes: 40,
        sampleMappings: [{ source: 'SCM.SUPPLIER_SPEND', target: 'GRI-204-1.localSpend' }],
        syncLog: [{ status: 'success', records: 1203 }],
    },
    {
        id: 'workday', name: 'Workday HCM', vendor: 'Workday', category: 'hris', status: 'connected', logo: 'WD',
        logoColor: 'text-amber-600', recordsImported: 8921, fieldMappings: 31,
        certifications: ['GRI 401', 'GRI 405'], regions: ['Global'], setupMinutes: 30,
        sampleMappings: [{ source: 'Worker.Gender', target: 'GRI-405-1.diversity' }],
        syncLog: [{ status: 'success', records: 8921 }],
    },
    {
        id: 'snowflake', name: 'Snowflake Pipeline', vendor: 'Snowflake Inc.', category: 'analytics', status: 'error', logo: 'SNF',
        logoColor: 'text-cyan-600', recordsImported: 0, fieldMappings: 19,
        certifications: ['Custom'], regions: ['Global'], setupMinutes: 60,
        sampleMappings: [],
        syncLog: [{ status: 'error', records: 0 }],
    },
    {
        id: 'azure-iot', name: 'Azure IoT Hub', vendor: 'Microsoft', category: 'iot', status: 'pending', logo: 'IoT',
        logoColor: 'text-emerald-600', fieldMappings: 0,
        certifications: ['GRI 302'], regions: ['Europe Facilities'], setupMinutes: 120, sampleMappings: [],
    },
]

const STATUS_TONE: Record<ConnectorStatus, Tone> = { connected: 'success', pending: 'neutral', error: 'danger', configuring: 'info' }

type Strings = typeof dataConnectorsStrings.en

function StatusBadge({ status, s }: { status: ConnectorStatus; s: Strings }) {
    return (
        <Badge tone={STATUS_TONE[status]} dot={status !== 'error'} icon={status === 'error' ? AlertCircle : undefined}>
            {s.status[status]}
        </Badge>
    )
}

function Logo({ c, size = 'md' }: { c: Connector; size?: 'md' | 'lg' }) {
    return (
        <div className={clsx(
            'rounded-xl flex items-center justify-center font-semibold bg-zinc-50 border border-line shrink-0',
            c.logoColor,
            size === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs',
        )}>
            {c.logo}
        </div>
    )
}

export default function PremiumDataConnectors() {
    const s = useStrings(dataConnectorsStrings)
    const f = useFormat()
    const [activeTab, setActiveTab] = useState<'all' | 'connected' | 'errors'>('all')
    const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null)

    useEffect(() => {
        if (!selectedConnector) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedConnector(null) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [selectedConnector])

    const filtered = connectors.filter(c => {
        if (activeTab === 'connected') return c.status === 'connected'
        if (activeTab === 'errors') return c.status === 'error'
        return true
    })

    const totalVolume = connectors.reduce((acc, c) => acc + (c.recordsImported || 0), 0)
    const connectedCount = connectors.filter(c => c.status === 'connected').length
    const errorCount = connectors.filter(c => c.status === 'error').length
    const listSep = s.listSep
    const regionLabel = (r: string) => s.regionNames[r as keyof typeof s.regionNames] ?? r

    const sel = selectedConnector
    const selText = sel ? s.connectors[sel.id] : null

    return (
        <div>
            <PageHeader
                title={s.title}
                description={s.description}
                actions={
                    <>
                        <Button icon={RefreshCw}>{s.syncAll}</Button>
                        <Button variant="primary" icon={Plus}>{s.addIntegration}</Button>
                    </>
                }
            />

            <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard label={s.activePipelines} icon={Plug} value={f.number(connectedCount)} deltaLabel={fmt(s.ofTotal, { total: connectors.length })} />
                    <StatCard label={s.totalVolume} icon={Database} value={f.compact(totalVolume)} unit={s.records} />
                    <StatCard label={s.activeMappings} icon={Link2} value={f.number(112)} deltaLabel={s.fieldMappings} />
                    <StatCard label={s.anchoredHashes} icon={Shield} value={f.percent(98.4, 1)} deltaLabel={s.anchoredSub} />
                </div>

                {/* Connector list */}
                <div className="space-y-4">
                    <Tabs
                        value={activeTab}
                        onChange={setActiveTab}
                        items={[
                            { value: 'all', label: s.tabs.all, count: connectors.length },
                            { value: 'connected', label: s.tabs.connected, count: connectedCount },
                            { value: 'errors', label: s.tabs.errors, count: errorCount },
                        ]}
                    />

                    {filtered.length === 0 ? (
                        <Card><EmptyState icon={Plug} title={s.emptyTitle} description={s.emptyBody} /></Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filtered.map(connector => {
                                const t = s.connectors[connector.id]
                                return (
                                    <Card
                                        key={connector.id}
                                        interactive
                                        role="button"
                                        tabIndex={0}
                                        aria-label={fmt(s.openDetails, { name: connector.name })}
                                        onClick={() => setSelectedConnector(connector)}
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedConnector(connector) } }}
                                        className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Logo c={connector} />
                                                <div className="min-w-0">
                                                    <h3 className="text-[15px] font-semibold text-zinc-900 truncate">{connector.name}</h3>
                                                    <p className="text-[13px] text-zinc-500 truncate">{connector.vendor} · {s.categories[connector.category]}</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={connector.status} s={s} />
                                        </div>

                                        <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">{t.description}</p>

                                        <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
                                            {t.dataTypes.map(type => (
                                                <span key={type} className="px-2 h-6 inline-flex items-center rounded-md bg-zinc-100 text-zinc-600 text-xs">{type}</span>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2 text-[13px] text-zinc-500">
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                {connector.status === 'connected' ? (
                                                    <>
                                                        <span className="inline-flex items-center gap-1.5 text-zinc-700 tabular">
                                                            <DownloadCloud className="w-3.5 h-3.5 text-zinc-400" />
                                                            {fmt(s.synced, { count: f.number(connector.recordsImported ?? 0) })}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-zinc-400" /> {t.lastSync}
                                                        </span>
                                                    </>
                                                ) : connector.status === 'error' ? (
                                                    <span className="inline-flex items-center gap-1.5 text-rose-600">
                                                        <Activity className="w-3.5 h-3.5" /> {s.authExpired}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Settings2 className="w-3.5 h-3.5 text-zinc-400" /> {fmt(s.estSetup, { minutes: connector.setupMinutes })}
                                                    </span>
                                                )}
                                            </div>
                                            {connector.status === 'connected' && (
                                                <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                                                    <Fingerprint className="w-3.5 h-3.5 text-emerald-500" /> {s.hash}
                                                </span>
                                            )}
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-over */}
            {sel && selText && createPortal(
                <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label={sel.name}>
                    <div className="absolute inset-0 bg-zinc-900/20" onClick={() => setSelectedConnector(null)} />

                    <div className="relative w-full max-w-xl bg-surface border-l border-line shadow-pop flex flex-col h-full animate-in slide-in-from-right duration-300">
                        <div className="px-5 sm:px-6 py-5 border-b border-line shrink-0 flex justify-between items-start gap-4">
                            <div className="flex gap-3 min-w-0">
                                <Logo c={sel} size="lg" />
                                <div className="min-w-0">
                                    <h2 className="text-lg font-semibold text-zinc-900 truncate">{sel.name}</h2>
                                    <div className="flex items-center gap-2 mt-1 text-[13px] text-zinc-500">
                                        <span className="truncate">{sel.vendor}</span>
                                        <StatusBadge status={sel.status} s={s} />
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" aria-label={s.close} onClick={() => setSelectedConnector(null)} className="w-8 px-0">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-6 space-y-8">
                            <section>
                                <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-zinc-400" /> {s.pipelineConfig}
                                </h3>
                                <p className="text-sm text-zinc-600 leading-relaxed mb-4">{selText.description}</p>
                                <dl className="grid grid-cols-2 gap-px rounded-xl border border-line bg-line overflow-hidden">
                                    {[
                                        { k: s.regions, v: sel.regions.map(regionLabel).join(listSep) },
                                        { k: s.frameworks, v: sel.certifications.join(listSep) },
                                        { k: s.lastSync, v: selText.lastSync },
                                        { k: s.nextSync, v: selText.nextSync },
                                        { k: s.mappingsCount, v: f.number(sel.fieldMappings) },
                                        { k: s.totalVolume, v: f.number(sel.recordsImported ?? 0) },
                                    ].map(row => (
                                        <div key={row.k} className="bg-white p-3.5">
                                            <dt className="text-xs text-zinc-500">{row.k}</dt>
                                            <dd className="text-sm font-medium text-zinc-900 mt-0.5 tabular">{row.v}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            {sel.sampleMappings.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                        <Link2 className="w-4 h-4 text-zinc-400" /> {s.transformRules}
                                    </h3>
                                    <div className="rounded-xl border border-line overflow-hidden">
                                        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-line bg-zinc-50/60 text-xs font-medium text-zinc-500">
                                            <div className="col-span-5">{s.sourceField}</div>
                                            <div className="col-span-4">{s.target}</div>
                                            <div className="col-span-3 text-right">{s.transform}</div>
                                        </div>
                                        {sel.sampleMappings.map((map, i) => (
                                            <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-line last:border-0 items-center hover:bg-zinc-50/70">
                                                <div className="col-span-5 font-mono text-xs text-zinc-600 truncate" title={map.source}>{map.source}</div>
                                                <div className="col-span-4 font-mono text-xs text-zinc-900 truncate" title={map.target}>{map.target}</div>
                                                <div className="col-span-3 text-right text-xs text-zinc-500">{selText.transforms[i]}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {sel.syncLog && (
                                <section>
                                    <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-zinc-400" /> {s.recentSync}
                                    </h3>
                                    <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                                        {sel.syncLog.map((log, i) => (
                                            <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                                                {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                {log.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                                                {log.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-zinc-800 truncate">{selText.log[i]?.message}</div>
                                                    <div className="text-xs text-zinc-500">{selText.log[i]?.time}</div>
                                                </div>
                                                <div className="text-xs text-zinc-500 tabular shrink-0">{fmt(s.recordsShort, { count: f.number(log.records) })}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="px-5 sm:px-6 py-4 border-t border-line bg-white flex gap-3 shrink-0">
                            {sel.status === 'connected' ? (
                                <>
                                    <Button variant="primary" icon={RefreshCw} className="flex-1">{s.forceSync}</Button>
                                    <Button>{s.settings}</Button>
                                </>
                            ) : sel.status === 'error' ? (
                                <Button variant="primary" className="flex-1">{s.reauth}</Button>
                            ) : (
                                <Button variant="primary" iconRight={ArrowRight} className="flex-1">{s.beginSetup}</Button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    )
}
