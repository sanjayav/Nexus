import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
    Plug, CheckCircle2, AlertCircle, Clock, RefreshCw,
    Plus, Database, X, Loader2, MapPin,
    AlertTriangle, Activity, Shield, Link2, DownloadCloud,
    Settings2, Fingerprint, ArrowRight,
} from 'lucide-react'
import { fmt, useFormat, useStrings } from '../i18n'
import { dataConnectorsStrings } from '../i18n/pages/dataConnectors'
import { PageHeader, Card, Button, Badge, StatCard, Tabs, EmptyState, Tone } from '../components/ui'
import { useWorkspace, useL10n } from '../workspace/WorkspaceContext'
import type { L10n } from '../workspace/regions'
import { useToast } from '../components/useToast'

type ConnectorStatus = 'connected' | 'pending' | 'error' | 'configuring'
type ConnectorCategory = 'erp' | 'hris' | 'cloud' | 'iot' | 'file' | 'analytics' | 'meter' | 'regulatory'
type ConnectorId = 'sap-s4' | 'oracle-cloud' | 'workday' | 'snowflake' | 'azure-iot'
type LogStatus = 'success' | 'warning' | 'error'

interface Connector {
    id: ConnectorId; name: string; vendor: string
    category: ConnectorCategory; status: ConnectorStatus
    logo: string; logoColor: string
    recordsImported?: number
    fieldMappings: number; certifications: string[]; regions: string[]
    setupMinutes: number; sampleMappings: { source: string; target: string }[]
    syncLog?: { status: LogStatus; records: number }[]
}

/** Display-ready connector, independent of where its text came from (dictionary vs tenant data). */
interface ConnectorView {
    id: string; name: string; vendor: string
    category: ConnectorCategory; status: ConnectorStatus
    logo: string; logoColor: string
    recordsImported?: number
    fieldMappings: number; certifications: string[]; regions: string
    setupMinutes: number; sampleMappings: { source: string; target: string }[]
    description: string; dataTypes: string[]; lastSync: string; nextSync: string; transforms: string[]
    log: { status: LogStatus; records: number; time: string; message: string }[]
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


// ─── Mainland China catalogue (tenant: 绿源控股集团) ────────────────────────────
// Connector text is authored bilingually inline because it describes this tenant's systems.

interface CnConnector {
    id: string; name: L10n; vendor: L10n
    category: ConnectorCategory; status: ConnectorStatus
    logo: string; logoColor: string
    recordsImported?: number
    fieldMappings: number; certifications: string[]; regions: L10n
    setupMinutes: number; sampleMappings: { source: string; target: string }[]
    description: L10n; dataTypes: L10n[]; lastSync: L10n; nextSync: L10n; transforms: L10n[]
    log: { status: LogStatus; records: number; time: L10n; message: L10n }[]
}

const L = (en: string, zh: string): L10n => ({ en, zh })
const DASH = L('—', '—')

const cnConnectors: CnConnector[] = [
    {
        id: 'kingdee', name: L('Kingdee Cloud Galaxy', '金蝶云·星空'), vendor: L('Kingdee', '金蝶'), category: 'erp', status: 'connected',
        logo: '金蝶', logoColor: 'text-sky-700', recordsImported: 6218, fieldMappings: 42,
        certifications: ['HKEX A2.1', 'CN-SSE'], regions: L('Jiangsu, Anhui', '江苏、安徽'), setupMinutes: 45,
        sampleMappings: [
            { source: 'STK_InStock.FRealQty[外购电力]', target: 'HKEX-A2.1.purchasedElectricity' },
            { source: 'STK_InStock.FRealQty[天然气]', target: 'GHG.scope1.naturalGas' },
        ],
        description: L('Purchased electricity, fuel and material receipts from inventory and cost accounting at 绿源光伏 and 绿源智造.', '从库存与成本核算模块提取绿源光伏、绿源智造的外购电力、燃料及物料入库数据。'),
        dataTypes: [L('Purchased energy', '外购能源'), L('Fuel', '燃料'), L('Materials', '物料')],
        lastSync: L('12 min ago', '12 分钟前'), nextSync: L('in 48 min', '48 分钟后'),
        transforms: [L('kWh → MWh', 'kWh → MWh'), L('m³ → GJ (NCV)', 'm³ → GJ（低位发热量）')],
        log: [
            { status: 'success', records: 418, time: L('12 min ago', '12 分钟前'), message: L('September energy receipts synced', '9 月能源入库数据已同步') },
            { status: 'warning', records: 12, time: L('Yesterday', '昨天'), message: L('12 rows in “tce” mapped manually', '12 行“吨标准煤”单位已人工映射') },
        ],
    },
    {
        id: 'yonyou', name: L('Yonyou BIP', '用友 BIP'), vendor: L('Yonyou', '用友网络'), category: 'erp', status: 'connected',
        logo: '用友', logoColor: 'text-rose-600', recordsImported: 3904, fieldMappings: 29,
        certifications: ['HKEX B5.2', 'CN-SSE'], regions: L('Guangdong, Sichuan', '广东、四川'), setupMinutes: 40,
        sampleMappings: [{ source: 'pu_order.norigtaxmny', target: 'GHG.scope3.cat1.spend' }],
        description: L('Purchase orders, supplier master data and travel expenses at 绿源储能 and 绿源新材料 (Scope 3 categories 1 and 6).', '提取绿源储能、绿源新材料的采购订单、供应商主数据及差旅费用（范围三类别 1、6）。'),
        dataTypes: [L('Procurement spend', '采购支出'), L('Suppliers', '供应商'), L('Business travel', '差旅')],
        lastSync: L('1 hr ago', '1 小时前'), nextSync: L('in 23 hrs', '23 小时后'),
        transforms: [L('Spend-based · CNY → tCO₂e', '支出法 · 元 → tCO₂e')],
        log: [{ status: 'success', records: 3904, time: L('1 hr ago', '1 小时前'), message: L('Supplier spend for September synced', '9 月供应商采购明细已同步') }],
    },
    {
        id: 'sap-cn', name: L('SAP S/4HANA (China cloud)', 'SAP S/4HANA（中国云）'), vendor: L('SAP China', 'SAP 中国'), category: 'erp', status: 'connected',
        logo: 'SAP', logoColor: 'text-sky-700', recordsImported: 2486, fieldMappings: 34,
        certifications: ['HKEX A1.2', 'CN-CSDS'], regions: L('Shanghai (group consolidation)', '上海（集团合并层）'), setupMinutes: 60,
        sampleMappings: [{ source: 'ACDOCA.HSL[营业收入]', target: 'Intensity.denominator.revenue' }],
        description: L('Group-level revenue and capex used as intensity denominators and for climate-related financial effects.', '集团合并层营业收入与资本开支，用作强度指标分母及气候相关财务影响测算。'),
        dataTypes: [L('Revenue', '营业收入'), L('Capex', '资本开支')],
        lastSync: L('3 hrs ago', '3 小时前'), nextSync: L('in 21 hrs', '21 小时后'),
        transforms: [L('CNY → CNY million', '元 → 百万元')],
        log: [{ status: 'success', records: 2486, time: L('3 hrs ago', '3 小时前'), message: L('H1 consolidation ledger synced', '上半年合并账套已同步') }],
    },
    {
        id: 'sgcc-meter', name: L('State Grid smart meters', '国网 智能电表'), vendor: L('State Grid (metering data, authorised)', '国家电网（企业授权用电数据）'), category: 'meter', status: 'connected',
        logo: '国网', logoColor: 'text-emerald-700', recordsImported: 52416, fieldMappings: 8,
        certifications: ['HKEX A2.1', 'GB/T 32150'], regions: L('Jiangsu, Anhui, Sichuan', '江苏、安徽、四川'), setupMinutes: 30,
        sampleMappings: [{ source: 'meter.active_energy_import (15 min)', target: 'Energy.electricity.grid' }],
        description: L('15-minute interval reads from billing meters at each plant. The Zhaoqing site is in the China Southern Grid area and uploads CSV instead.', '获取各厂区关口表 15 分钟粒度电量数据。肇庆储能工厂位于南方电网供区，改为 CSV 导入。'),
        dataTypes: [L('Grid electricity (kWh)', '网购电量（kWh）'), L('Peak / valley split', '峰谷分时')],
        lastSync: L('20 min ago', '20 分钟前'), nextSync: L('in 10 min', '10 分钟后'),
        transforms: [L('15 min → monthly', '15 分钟 → 月度汇总')],
        log: [
            { status: 'success', records: 2880, time: L('20 min ago', '20 分钟前'), message: L('Interval reads ingested for 6 metering points', '6 个计量点的分时读数已入库') },
            { status: 'warning', records: 0, time: L('6 hrs ago', '6 小时前'), message: L('2 meters at 宜宾基地 delayed — collection terminal offline', '宜宾基地 2 块表计数据延迟（采集终端离线）') },
        ],
    },
    {
        id: 'key-energy', name: L('Key energy-consuming units online monitoring', '重点用能单位能耗在线监测'), vendor: L('Provincial monitoring platform', '省级能耗在线监测平台'), category: 'regulatory', status: 'configuring',
        logo: '能耗', logoColor: 'text-amber-700', fieldMappings: 14,
        certifications: ['GB 17167', 'HKEX A2.1'], regions: L('Sichuan, Jiangsu', '四川、江苏'), setupMinutes: 90,
        sampleMappings: [{ source: 'energy_report.total_tce', target: 'Energy.total.tce' }],
        description: L('Cross-checks internally metered energy against figures reported to the provincial online monitoring system.', '对接省级重点用能单位能耗在线监测系统的上报数据，与内部计量数据交叉核对。'),
        dataTypes: [L('Comprehensive energy (tce)', '综合能耗（吨标准煤）')],
        lastSync: DASH, nextSync: DASH,
        transforms: [L('Direct map', '直接映射')],
        log: [{ status: 'warning', records: 0, time: L('2 days ago', '2 天前'), message: L('Waiting for platform query account', '等待平台查询账号授权') }],
    },
    {
        id: 'aliyun-iot', name: L('Alibaba Cloud IoT Platform', '阿里云 物联网平台'), vendor: L('Alibaba Cloud', '阿里云'), category: 'iot', status: 'connected',
        logo: 'IoT', logoColor: 'text-orange-600', recordsImported: 128940, fieldMappings: 16,
        certifications: ['HKEX A2.1', 'HKEX A2.2'], regions: L('Guangdong, Anhui', '广东、安徽'), setupMinutes: 120,
        sampleMappings: [{ source: 'thing.water_meter.flow_total', target: 'HKEX-A2.2.waterWithdrawal' }],
        description: L('Live MQTT telemetry from water meters, compressors and cooling on the storage and equipment lines, rolled up hourly.', '储能产线与智造园区水表、空压机、冷却系统的实时遥测（MQTT），按小时汇总入库。'),
        dataTypes: [L('Water (m³)', '用水（m³）'), L('Compressed air', '压缩空气'), L('Cooling load', '冷却负荷')],
        lastSync: L('2 min ago', '2 分钟前'), nextSync: L('Streaming', '实时'),
        transforms: [L('m³ → ML', 'm³ → 千立方米')],
        log: [{ status: 'success', records: 4310, time: L('2 min ago', '2 分钟前'), message: L('Hourly roll-up written', '小时汇总已写入') }],
    },
    {
        id: 'dingtalk-hr', name: L('DingTalk HR', '钉钉 人事'), vendor: L('DingTalk', '钉钉'), category: 'hris', status: 'connected',
        logo: '钉', logoColor: 'text-blue-600', recordsImported: 14872, fieldMappings: 22,
        certifications: ['HKEX B1.1', 'HKEX B3.1'], regions: L('Group + 4 subsidiaries', '集团及 4 家子公司'), setupMinutes: 30,
        sampleMappings: [{ source: 'hrm.employee.gender', target: 'HKEX-B1.1.byGender' }],
        description: L('Roster, attendance and training: headcount, gender and age mix, turnover and training hours. Only fields needed for aggregates are synced; national ID numbers are never stored.', '花名册、考勤与培训记录：员工人数、性别与年龄结构、流失率及人均培训时长。仅同步汇总所需字段，身份证号等敏感个人信息不入库。'),
        dataTypes: [L('Headcount', '员工人数'), L('Turnover', '流失率'), L('Training', '培训')],
        lastSync: L('5 hrs ago', '5 小时前'), nextSync: L('in 19 hrs', '19 小时后'),
        transforms: [L('Aggregate by entity', '按法人主体汇总')],
        log: [{ status: 'success', records: 14872, time: L('5 hrs ago', '5 小时前'), message: L('September roster synced', '9 月花名册已同步') }],
    },
    {
        id: 'feishu-hr', name: L('Feishu People', '飞书 人事'), vendor: L('Feishu', '飞书'), category: 'hris', status: 'configuring',
        logo: '飞', logoColor: 'text-teal-600', fieldMappings: 18,
        certifications: ['HKEX B1.1'], regions: L('Anhui (绿源智造)', '安徽（绿源智造）'), setupMinutes: 30,
        sampleMappings: [],
        description: L('绿源智造 keeps employee records in Feishu. Once live, it is merged with DingTalk data into the group headcount.', '绿源智造使用飞书人事管理员工档案，接入后与钉钉数据合并为集团口径。'),
        dataTypes: [L('Headcount', '员工人数'), L('Safety training', '安全培训')],
        lastSync: DASH, nextSync: DASH, transforms: [], log: [],
    },
    {
        id: 'wecom-directory', name: L('WeCom directory', '企业微信 通讯录'), vendor: L('WeCom', '企业微信'), category: 'hris', status: 'pending',
        logo: '企', logoColor: 'text-sky-600', fieldMappings: 0,
        certifications: ['组织架构'], regions: L('Group', '集团'), setupMinutes: 20,
        sampleMappings: [],
        description: L('Org chart and department heads for task routing and approvals. Chat content is never synced.', '同步组织架构与部门负责人，用于任务分派与审批流；不同步任何聊天内容。'),
        dataTypes: [L('Org structure', '组织架构'), L('Approvers', '审批人')],
        lastSync: DASH, nextSync: DASH, transforms: [], log: [],
    },
    {
        id: 'maxcompute', name: L('Alibaba Cloud MaxCompute / DataWorks', '阿里云 MaxCompute / DataWorks'), vendor: L('Alibaba Cloud', '阿里云'), category: 'analytics', status: 'error',
        logo: 'MC', logoColor: 'text-orange-600', recordsImported: 0, fieldMappings: 19,
        certifications: ['自定义'], regions: L('cn-shanghai', '华东 2（上海）'), setupMinutes: 60,
        sampleMappings: [],
        description: L('Pre-computed indicator tables (ADS layer) from the group data platform, pushed back daily by a DataWorks schedule.', '集团数据中台的预计算指标表（ADS 层），由 DataWorks 调度每日回传。'),
        dataTypes: [L('Pre-calculated GHG', '预计算温室气体排放'), L('Energy KPIs', '能源指标')],
        lastSync: L('Failed', '失败'), nextSync: DASH, transforms: [],
        log: [{ status: 'error', records: 0, time: L('40 min ago', '40 分钟前'), message: L('AccessKey rotated — connection credential invalid', 'AccessKey 已轮换，连接凭证失效') }],
    },
    {
        id: 'carbon-report', name: L('Carbon emissions reporting export', '碳排放数据报送导出'), vendor: L('National carbon market platform format', '全国碳市场管理平台（报送格式）'), category: 'regulatory', status: 'pending',
        logo: 'CO₂', logoColor: 'text-zinc-700', fieldMappings: 0,
        certifications: ['核算与报告指南'], regions: L('National', '全国'), setupMinutes: 45,
        sampleMappings: [],
        description: L('Generates monthly and annual reporting workbooks in the national carbon market format for manual upload. Nexus does not submit on your behalf.', '按生态环境部核算与报告指南生成月度及年度报送底稿，供人工上传至全国碳市场管理平台；Nexus 不代为提交。'),
        dataTypes: [L('Monthly report', '月度存证'), L('Annual report', '年度报告')],
        lastSync: DASH, nextSync: DASH, transforms: [], log: [],
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

function Logo({ c, size = 'md' }: { c: ConnectorView; size?: 'md' | 'lg' }) {
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
    const { workspace } = useWorkspace()
    // Remount per workspace so local sync/setup state never leaks across tenants.
    return <DataConnectorsView key={workspace.id} />
}

function DataConnectorsView() {
    const s = useStrings(dataConnectorsStrings)
    const f = useFormat()
    const l10n = useL10n()
    const navigate = useNavigate()
    const { region } = useWorkspace()
    const { toast, show } = useToast()
    const [activeTab, setActiveTab] = useState<'all' | 'connected' | 'errors' | 'available'>('all')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [statusOverride, setStatusOverride] = useState<Record<string, ConnectorStatus>>({})
    const [syncing, setSyncing] = useState<Set<string>>(new Set())
    const [syncedNow, setSyncedNow] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!selectedId) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [selectedId])

    const regionLabel = (r: string) => s.regionNames[r as keyof typeof s.regionNames] ?? r

    const base: ConnectorView[] = useMemo(() => {
        if (region.id === 'cn') {
            return cnConnectors.map(c => ({
                ...c,
                name: l10n(c.name),
                vendor: l10n(c.vendor),
                regions: l10n(c.regions),
                description: l10n(c.description),
                dataTypes: c.dataTypes.map(l10n),
                lastSync: l10n(c.lastSync),
                nextSync: l10n(c.nextSync),
                transforms: c.transforms.map(l10n),
                log: c.log.map(e => ({ status: e.status, records: e.records, time: l10n(e.time), message: l10n(e.message) })),
            }))
        }
        return connectors.map(c => {
            const t = s.connectors[c.id]
            return {
                ...c,
                regions: c.regions.map(regionLabel).join(s.listSep),
                description: t.description,
                dataTypes: t.dataTypes,
                lastSync: t.lastSync,
                nextSync: t.nextSync,
                transforms: t.transforms,
                log: (c.syncLog ?? []).map((e, i) => ({ ...e, time: t.log[i]?.time ?? '', message: t.log[i]?.message ?? '' })),
            }
        })
    }, [region.id, l10n, s])

    // Apply local session state (manual syncs, setups started) on top of the catalogue.
    const all: ConnectorView[] = base.map(c => {
        const status = statusOverride[c.id] ?? c.status
        if (!syncedNow.has(c.id)) return { ...c, status }
        const records = c.log[0]?.records ?? 0
        return {
            ...c,
            status,
            lastSync: s.justNow,
            log: [{ status: 'success' as const, records, time: s.justNow, message: s.manualSync }, ...c.log],
        }
    })

    const filtered = all.filter(c => {
        if (activeTab === 'connected') return c.status === 'connected'
        if (activeTab === 'errors') return c.status === 'error'
        if (activeTab === 'available') return c.status === 'pending' || c.status === 'configuring'
        return true
    })

    const totalVolume = all.reduce((acc, c) => acc + (c.recordsImported || 0), 0)
    const totalMappings = all.reduce((acc, c) => acc + c.fieldMappings, 0)
    const connectedCount = all.filter(c => c.status === 'connected').length
    const errorCount = all.filter(c => c.status === 'error').length
    const availableCount = all.filter(c => c.status === 'pending' || c.status === 'configuring').length

    const sel = all.find(c => c.id === selectedId) ?? null

    const runSync = (ids: string[]) => {
        setSyncing(prev => new Set([...prev, ...ids]))
        window.setTimeout(() => {
            setSyncing(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
            setSyncedNow(prev => new Set([...prev, ...ids]))
            if (ids.length === 1) show(fmt(s.syncDone, { name: all.find(c => c.id === ids[0])?.name ?? '' }))
        }, 1400)
    }

    const syncAll = () => {
        const ids = all.filter(c => c.status === 'connected').map(c => c.id)
        if (ids.length === 0) return
        show(fmt(s.syncQueued, { count: ids.length }), 'info')
        runSync(ids)
    }

    const beginSetup = (c: ConnectorView) => {
        setStatusOverride(prev => ({ ...prev, [c.id]: 'configuring' }))
        show(fmt(s.setupStarted, { name: c.name }), 'info')
    }

    return (
        <div>
            <PageHeader
                title={s.title}
                description={fmt(s.description, { chain: l10n(region.chain.network) })}
                actions={
                    <>
                        <Button icon={syncing.size > 0 ? Loader2 : RefreshCw} onClick={syncAll} disabled={syncing.size > 0} className={syncing.size > 0 ? '[&_svg]:animate-spin' : ''}>
                            {syncing.size > 0 ? s.syncing : s.syncAll}
                        </Button>
                        <Button variant="primary" icon={Plus} onClick={() => setActiveTab('available')}>{s.addIntegration}</Button>
                    </>
                }
            />

            <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard label={s.activePipelines} icon={Plug} value={f.number(connectedCount)} deltaLabel={fmt(s.ofTotal, { total: all.length })} />
                    <StatCard label={s.totalVolume} icon={Database} value={f.compact(totalVolume)} unit={s.records} />
                    <StatCard label={s.activeMappings} icon={Link2} value={f.number(totalMappings)} deltaLabel={s.fieldMappings} />
                    <StatCard label={s.anchoredHashes} icon={Shield} value={f.percent(98.4, 1)} deltaLabel={s.anchoredSub} />
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-line bg-white/70 px-4 py-3 text-[13px] text-zinc-600">
                    <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <span>{fmt(s.residency, { provider: l10n(region.hosting.provider), residency: l10n(region.hosting.residency) })}</span>
                </div>

                {/* Connector list */}
                <div className="space-y-4">
                    <Tabs
                        value={activeTab}
                        onChange={setActiveTab}
                        items={[
                            { value: 'all', label: s.tabs.all, count: all.length },
                            { value: 'connected', label: s.tabs.connected, count: connectedCount },
                            { value: 'errors', label: s.tabs.errors, count: errorCount },
                            { value: 'available', label: s.tabs.available, count: availableCount },
                        ]}
                    />
                    {activeTab === 'available' && filtered.length > 0 && <p className="text-[13px] text-zinc-500">{s.availableHint}</p>}

                    {filtered.length === 0 ? (
                        <Card><EmptyState icon={Plug} title={s.emptyTitle} description={s.emptyBody} action={<Button size="sm" onClick={() => setActiveTab('all')}>{s.tabs.all}</Button>} /></Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filtered.map(connector => {
                                const isSyncing = syncing.has(connector.id)
                                return (
                                    <Card
                                        key={connector.id}
                                        interactive
                                        role="button"
                                        tabIndex={0}
                                        aria-label={fmt(s.openDetails, { name: connector.name })}
                                        onClick={() => setSelectedId(connector.id)}
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(connector.id) } }}
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

                                        <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">{connector.description}</p>

                                        <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
                                            {connector.dataTypes.map(type => (
                                                <span key={type} className="px-2 h-6 inline-flex items-center rounded-md bg-zinc-100 text-zinc-600 text-xs">{type}</span>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2 text-[13px] text-zinc-500">
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                {isSyncing ? (
                                                    <span className="inline-flex items-center gap-1.5 text-zinc-700">
                                                        <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" /> {s.syncing}
                                                    </span>
                                                ) : connector.status === 'connected' ? (
                                                    <>
                                                        <span className="inline-flex items-center gap-1.5 text-zinc-700 tabular">
                                                            <DownloadCloud className="w-3.5 h-3.5 text-zinc-400" />
                                                            {fmt(s.synced, { count: f.number(connector.recordsImported ?? 0) })}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-zinc-400" /> {connector.lastSync}
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
            {sel && createPortal(
                <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label={sel.name}>
                    <div className="absolute inset-0 bg-zinc-900/20" onClick={() => setSelectedId(null)} />

                    <div className="relative w-full max-w-xl bg-surface border-l border-line shadow-pop flex flex-col h-full animate-fade-up">
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
                            <Button variant="ghost" size="sm" aria-label={s.close} onClick={() => setSelectedId(null)} className="w-8 px-0">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-6 space-y-8">
                            <section>
                                <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-zinc-400" /> {s.pipelineConfig}
                                </h3>
                                <p className="text-sm text-zinc-600 leading-relaxed mb-4">{sel.description}</p>
                                <dl className="grid grid-cols-2 gap-px rounded-xl border border-line bg-line overflow-hidden">
                                    {[
                                        { k: s.regions, v: sel.regions },
                                        { k: s.frameworks, v: sel.certifications.join(s.listSep) },
                                        { k: s.lastSync, v: sel.lastSync },
                                        { k: s.nextSync, v: sel.nextSync },
                                        { k: s.mappingsCount, v: f.number(sel.fieldMappings) },
                                        { k: s.totalVolume, v: f.number(sel.recordsImported ?? 0) },
                                    ].map(row => (
                                        <div key={row.k} className="bg-white p-3.5 min-w-0">
                                            <dt className="text-xs text-zinc-500">{row.k}</dt>
                                            <dd className="text-sm font-medium text-zinc-900 mt-0.5 tabular break-words">{row.v}</dd>
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
                                                <div className="col-span-3 text-right text-xs text-zinc-500">{sel.transforms[i] ?? '—'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {sel.log.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-zinc-400" /> {s.recentSync}
                                    </h3>
                                    <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                                        {sel.log.map((log, i) => (
                                            <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                                                {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                                {log.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                                                {log.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-zinc-800">{log.message}</div>
                                                    <div className="text-xs text-zinc-500">{log.time}</div>
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
                                    <Button
                                        variant="primary"
                                        icon={syncing.has(sel.id) ? Loader2 : RefreshCw}
                                        disabled={syncing.has(sel.id)}
                                        onClick={() => runSync([sel.id])}
                                        className={clsx('flex-1', syncing.has(sel.id) && '[&_svg]:animate-spin')}
                                    >
                                        {syncing.has(sel.id) ? s.syncing : s.forceSync}
                                    </Button>
                                    <Button onClick={() => navigate('/admin')}>{s.settings}</Button>
                                </>
                            ) : sel.status === 'error' ? (
                                <Button variant="primary" className="flex-1" onClick={() => show(s.reauthNote, 'info')}>{s.reauth}</Button>
                            ) : sel.status === 'configuring' ? (
                                <Button className="flex-1" onClick={() => navigate('/admin')}>{s.settings}</Button>
                            ) : (
                                <Button variant="primary" iconRight={ArrowRight} className="flex-1" onClick={() => beginSetup(sel)}>{s.beginSetup}</Button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body,
            )}
            {toast}
        </div>
    )
}
