import { useState } from 'react'
import {
  Building2,
  MapPin,
  ChevronDown,
  ChevronRight,
  Globe2,
  Factory,
  Flame,
  Zap,
  Truck,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Check,
  Network,
  BarChart3,
  Calendar,
  Info,
  GitBranch,
  Layers,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, Badge, Tabs, Input, Select } from '../design-system'
import PageHeader from '../components/PageHeader'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface EmissionSource {
  id: string
  name: string
  type: 'stationary' | 'mobile' | 'process' | 'fugitive' | 'electricity' | 'heat'
  scope: 'S1' | 'S2' | 'S3'
  calculator: string
}

interface Facility {
  id: string
  name: string
  country: string
  countryCode: string
  type: 'Manufacturing' | 'Refinery' | 'Office' | 'Warehouse' | 'Joint Venture' | 'Laboratory' | 'Data Centre'
  grid: string
  ef: string
  sources: EmissionSource[]
  headcount: number
  status: 'operational' | 'planned' | 'decommissioned'
}

interface Subsidiary {
  id: string
  name: string
  equity: number
  country: string
  countryCode: string
  facilities: Facility[]
}

interface BusinessGroup {
  id: string
  name: string
  color: string
  subsidiaries: Subsidiary[]
}

/* ═══════════════════════════════════════════
   Demo Data
   ═══════════════════════════════════════════ */
const COMPANY = {
  name: 'Demo Co PLC',
  tradingName: 'Demo Co',
  sector: 'Petrochemicals & Refining',
  country: 'GB',
  boundary: 'Operational Control',
  baseYear: 2019,
  reportingPeriod: 'FY 2025',
}

const mk = (types: { n: string; t: EmissionSource['type']; s: EmissionSource['scope']; c: string }[]): EmissionSource[] =>
  types.map((t, i) => ({ id: `src-${i}`, name: t.n, type: t.t, scope: t.s, calculator: t.c }))

const DEMO_GROUPS: BusinessGroup[] = [
  {
    id: 'g1', name: 'Chemicals', color: 'var(--accent-teal)',
    subsidiaries: [
      {
        id: 's1', name: 'Demo Co Chemicals', equity: 100, country: 'GB', countryCode: 'GB',
        facilities: [
          { id: 'f1', name: 'Map Ta Phut Olefins Plant', country: 'Thailand', countryCode: 'TH', type: 'Manufacturing', grid: 'TH-PEA-Eastern', ef: '0.4999', headcount: 1240, status: 'operational',
            sources: mk([{ n: 'Boilers & Furnaces', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Flare Systems', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Process Venting', t: 'process', s: 'S1', c: 'GHG-HFC-v1' }, { n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }, { n: 'Company Vehicles', t: 'mobile', s: 'S1', c: 'GHG-TRANS-v2.7' }]) },
          { id: 'f2', name: 'Rayong Aromatics Complex', country: 'Thailand', countryCode: 'TH', type: 'Refinery', grid: 'TH-PEA-Eastern', ef: '0.5123', headcount: 890, status: 'operational',
            sources: mk([{ n: 'Cracking Furnaces', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Cooling Towers', t: 'fugitive', s: 'S1', c: 'GHG-HFC-v1' }, { n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }, { n: 'Purchased Steam', t: 'heat', s: 'S2', c: 'GHG-HEAT-v2.0' }]) },
        ],
      },
      {
        id: 's2', name: 'Demo Co International (Singapore)', equity: 80, country: 'Singapore', countryCode: 'SG',
        facilities: [
          { id: 'f3', name: 'Jurong Island Terminal', country: 'Singapore', countryCode: 'SG', type: 'Warehouse', grid: 'SG-National', ef: '0.4085', headcount: 120, status: 'operational',
            sources: mk([{ n: 'Refrigeration Units', t: 'fugitive', s: 'S1', c: 'GHG-HFC-v1' }, { n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }]) },
        ],
      },
    ],
  },
  {
    id: 'g2', name: 'Polymers', color: 'var(--accent-blue)',
    subsidiaries: [
      {
        id: 's3', name: 'Demo Co Polymers Ltd.', equity: 100, country: 'GB', countryCode: 'GB',
        facilities: [
          { id: 'f4', name: 'Rayong PE/PP Plant', country: 'Thailand', countryCode: 'TH', type: 'Manufacturing', grid: 'TH-PEA-Eastern', ef: '0.5123', headcount: 650, status: 'operational',
            sources: mk([{ n: 'Extruder Heaters', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Pellet Dryers', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }]) },
        ],
      },
      {
        id: 's4', name: 'Nanjing JV', equity: 51, country: 'China', countryCode: 'CN',
        facilities: [
          { id: 'f5', name: 'Nanjing Chemical Park', country: 'China', countryCode: 'CN', type: 'Joint Venture', grid: 'CN-ECGD-Jiangsu', ef: '0.7921', headcount: 410, status: 'operational',
            sources: mk([{ n: 'Reactor Furnaces', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Process Emissions', t: 'process', s: 'S1', c: 'GHG-HFC-v1' }, { n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }, { n: 'Fleet Vehicles', t: 'mobile', s: 'S1', c: 'GHG-TRANS-v2.7' }]) },
        ],
      },
    ],
  },
  {
    id: 'g3', name: 'Green Chemicals', color: 'var(--accent-green)',
    subsidiaries: [
      {
        id: 's5', name: 'Demo Co Green Solutions', equity: 100, country: 'GB', countryCode: 'GB',
        facilities: [
          { id: 'f6', name: 'Bangkok HQ Office', country: 'Thailand', countryCode: 'TH', type: 'Office', grid: 'TH-MEA-Central', ef: '0.4999', headcount: 280, status: 'operational',
            sources: mk([{ n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }, { n: 'Company Vehicles', t: 'mobile', s: 'S1', c: 'GHG-TRANS-v2.7' }]) },
          { id: 'f7', name: 'Bio-Based R&D Lab', country: 'Thailand', countryCode: 'TH', type: 'Laboratory', grid: 'TH-MEA-Central', ef: '0.4999', headcount: 85, status: 'operational',
            sources: mk([{ n: 'Lab Equipment (Gas)', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }]) },
          { id: 'f8', name: 'Chonburi Bioplastics Plant', country: 'Thailand', countryCode: 'TH', type: 'Manufacturing', grid: 'TH-PEA-Eastern', ef: '0.5123', headcount: 190, status: 'planned',
            sources: mk([{ n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }]) },
        ],
      },
    ],
  },
]

/* ── Helpers ── */
const flat = (g: BusinessGroup[]) => g.flatMap(x => x.subsidiaries.flatMap(s => s.facilities))
const flatSrc = (g: BusinessGroup[]) => flat(g).flatMap(f => f.sources)
const countries = (g: BusinessGroup[]) => [...new Set(flat(g).map(f => f.countryCode))]

const SCOPE_CLR: Record<string, string> = { S1: 'var(--accent-teal)', S2: 'var(--accent-amber)', S3: 'var(--accent-purple)' }
const SCOPE_BG: Record<string, string> = { S1: 'var(--accent-teal-light)', S2: 'var(--accent-amber-light)', S3: 'var(--accent-purple-light)' }
const SCOPE_BADGE: Record<string, 'teal' | 'amber' | 'purple'> = { S1: 'teal', S2: 'amber', S3: 'purple' }

const FAC_ICON: Record<string, typeof Factory> = { Manufacturing: Factory, Refinery: Flame, Office: Building2, Warehouse: Truck, 'Joint Venture': Network, Laboratory: Zap, 'Data Centre': Layers }
const FAC_CLR: Record<string, 'teal' | 'blue' | 'purple' | 'amber' | 'green' | 'gray'> = { Manufacturing: 'teal', Refinery: 'amber', Office: 'blue', Warehouse: 'gray', 'Joint Venture': 'purple', Laboratory: 'green', 'Data Centre': 'blue' }
const STATUS: Record<string, { v: 'green' | 'amber' | 'gray'; labelKey: string }> = { operational: { v: 'green', labelKey: 'orgStructure.status.operational' }, planned: { v: 'amber', labelKey: 'orgStructure.status.planned' }, decommissioned: { v: 'gray', labelKey: 'orgStructure.status.decommissioned' } }

/* ── i18n label lookups (underlying data values stay unchanged) ── */
const FAC_TYPE_KEY: Record<Facility['type'], string> = { Manufacturing: 'manufacturing', Refinery: 'refinery', Office: 'office', Warehouse: 'warehouse', 'Joint Venture': 'jointVenture', Laboratory: 'laboratory', 'Data Centre': 'dataCentre' }
const GROUP_NAME_KEY: Record<string, string> = { Chemicals: 'chemicals', Polymers: 'polymers', 'Green Chemicals': 'greenChemicals' }
const SOURCE_NAME_KEY: Record<string, string> = {
  'Boilers & Furnaces': 'boilersFurnaces', 'Flare Systems': 'flareSystems', 'Process Venting': 'processVenting', 'Grid Electricity': 'gridElectricity',
  'Company Vehicles': 'companyVehicles', 'Cracking Furnaces': 'crackingFurnaces', 'Cooling Towers': 'coolingTowers', 'Purchased Steam': 'purchasedSteam',
  'Refrigeration Units': 'refrigerationUnits', 'Extruder Heaters': 'extruderHeaters', 'Pellet Dryers': 'pelletDryers', 'Reactor Furnaces': 'reactorFurnaces',
  'Process Emissions': 'processEmissions', 'Fleet Vehicles': 'fleetVehicles', 'Lab Equipment (Gas)': 'labEquipmentGas',
}

function useOrgLabels() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh') ?? false
  const facType = (type: Facility['type']) => FAC_TYPE_KEY[type] ? t(`orgStructure.facilityType.${FAC_TYPE_KEY[type]}`) : type
  const groupName = (name: string) => GROUP_NAME_KEY[name] ? t(`orgStructure.groupNames.${GROUP_NAME_KEY[name]}`) : name
  const sourceName = (name: string) => SOURCE_NAME_KEY[name] ? t(`orgStructure.sourceNames.${SOURCE_NAME_KEY[name]}`) : name
  // English keeps the stored country name; zh resolves the ISO code to a localised region name.
  const countryName = (code: string, fallback: string) => {
    if (!isZh) return fallback
    try {
      return new Intl.DisplayNames(['zh-CN'], { type: 'region' }).of(code) ?? fallback
    } catch {
      return fallback
    }
  }
  return { t, facType, groupName, sourceName, countryName }
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function OrgStructure() {
  const { t, facType, groupName, sourceName, countryName } = useOrgLabels()
  const [tab, setTab] = useState('hierarchy')
  const [groups] = useState(DEMO_GROUPS)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['g1']))
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Facility | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'group' | 'facility' | null>(null)

  const facs = flat(groups)
  const srcs = flatSrc(groups)
  const ctrs = countries(groups)

  const toggle = (set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    set(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const filtered = search
    ? facs.filter(f => `${f.name} ${f.country} ${f.type} ${countryName(f.countryCode, f.country)} ${facType(f.type)}`.toLowerCase().includes(search.toLowerCase()))
    : facs

  const s1 = srcs.filter(s => s.scope === 'S1').length
  const s2 = srcs.filter(s => s.scope === 'S2').length
  const s3 = srcs.filter(s => s.scope === 'S3').length

  return (
    <div className="page-container space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: t('nav.admin') },
          { label: t('orgStructure.breadcrumb') },
        ]}
        title={t('orgStructure.title')}
        description={t('orgStructure.description')}
        actions={
          <>
            <button onClick={() => setModal('group')} className="btn-secondary">
              <Plus className="w-3.5 h-3.5" /> {t('orgStructure.actions.addGroup')}
            </button>
            <button onClick={() => setModal('facility')} className="btn-primary">
              <Plus className="w-3.5 h-3.5" /> {t('orgStructure.actions.addFacility')}
            </button>
          </>
        }
      />

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { id: 'groups', label: t('orgStructure.kpi.businessGroups'), value: groups.length, icon: Network, color: 'var(--accent-teal)', bg: 'var(--accent-teal-light)' },
          { id: 'subsidiaries', label: t('orgStructure.kpi.subsidiaries'), value: groups.reduce((n, g) => n + g.subsidiaries.length, 0), icon: GitBranch, color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
          { id: 'facilities', label: t('orgStructure.kpi.facilities'), value: facs.length, icon: Factory, color: 'var(--accent-purple)', bg: 'var(--accent-purple-light)' },
          { id: 'countries', label: t('orgStructure.kpi.countries'), value: ctrs.length, icon: Globe2, color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
          { id: 'sources', label: t('orgStructure.kpi.emissionSources'), value: srcs.length, icon: Flame, color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
        ].map(m => {
          const Icon = m.icon
          return (
            <Card key={m.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.bg }}>
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium leading-none">{m.label}</p>
                  <p className="font-display text-[var(--text-xl)] font-bold tabular-nums leading-tight mt-1" style={{ color: m.color }}>{m.value}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ── Company card ── */}
      <Card padding="sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-teal)] to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[var(--text-base)] font-bold text-[var(--text-primary)]">{COMPANY.name}</h2>
              <Badge variant="teal">{COMPANY.tradingName}</Badge>
            </div>
            <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">{t('orgStructure.company.sector')}</p>
          </div>
          <div className="flex items-center gap-6 text-[var(--text-xs)] text-[var(--text-secondary)] flex-shrink-0">
            <span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />{t('orgStructure.company.boundary')}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />{t('orgStructure.company.baseYear', { year: COMPANY.baseYear })}</span>
            <Badge variant="blue">{t('orgStructure.company.reportingPeriod')}</Badge>
          </div>
        </div>
      </Card>

      {/* ── Tabs ── */}
      <Tabs
        tabs={[
          { id: 'hierarchy', label: t('orgStructure.tabs.hierarchy'), count: groups.length },
          { id: 'facilities', label: t('orgStructure.tabs.facilities'), count: facs.length },
          { id: 'sources', label: t('orgStructure.tabs.sources'), count: srcs.length },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {/* ═══════════════════════════════════════
         HIERARCHY
         ═══════════════════════════════════════ */}
      {tab === 'hierarchy' && (
        <div className="space-y-3 animate-fade-in">
          {groups.map(group => {
            const open = expanded.has(group.id)
            const gFacs = group.subsidiaries.flatMap(s => s.facilities)
            return (
              <Card key={group.id} padding="none">
                {/* Group row */}
                <button onClick={() => toggle(setExpanded, group.id)} className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${group.color} 10%, transparent)`, border: `1.5px solid color-mix(in srgb, ${group.color} 25%, transparent)` }}>
                    <Network className="w-5 h-5" style={{ color: group.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] leading-tight">{groupName(group.name)}</h3>
                    <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">
                      {t('orgStructure.counts.subsidiary', { count: group.subsidiaries.length })} · {t('orgStructure.counts.facility', { count: gFacs.length })} · {t('orgStructure.counts.sources', { n: gFacs.flatMap(f => f.sources).length })}
                    </p>
                  </div>
                  <Badge variant="gray">{t('orgStructure.counts.staff', { value: gFacs.reduce((n, f) => n + f.headcount, 0).toLocaleString() })}</Badge>
                  {open ? <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />}
                </button>

                {/* Expanded: subsidiaries + facilities */}
                {open && (
                  <div className="border-t border-[var(--border-default)]">
                    {group.subsidiaries.map(sub => {
                      const subOpen = expandedSubs.has(sub.id)
                      return (
                        <div key={sub.id}>
                          {/* Subsidiary row */}
                          <button onClick={() => toggle(setExpandedSubs, sub.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-subtle)]" style={{ paddingLeft: 52 }}>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color, opacity: 0.5 }} />
                            <GitBranch className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                            <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] flex-1 truncate">{sub.name}</span>
                            <Badge variant="gray">{t('orgStructure.counts.equity', { value: sub.equity })}</Badge>
                            <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] w-16 text-right">{t('orgStructure.counts.site', { count: sub.facilities.length })}</span>
                            {subOpen ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                          </button>

                          {/* Facility rows */}
                          {subOpen && sub.facilities.map(fac => {
                            const Icon = FAC_ICON[fac.type] || MapPin
                            const st = STATUS[fac.status]
                            return (
                              <button key={fac.id} onClick={() => setSelected(fac)} className="w-full flex items-center gap-3 px-5 py-2.5 text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0" style={{ paddingLeft: 76 }}>
                                <Icon className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                                <span className="text-[var(--text-sm)] text-[var(--text-primary)] flex-1 truncate">{fac.name}</span>
                                <Badge variant={FAC_CLR[fac.type] || 'gray'}>{facType(fac.type)}</Badge>
                                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] font-mono w-6 text-center">{fac.countryCode}</span>
                                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] w-20 text-right">{t('orgStructure.counts.sources', { n: fac.sources.length })}</span>
                                <Badge variant={st.v} dot>{t(st.labelKey)}</Badge>
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}

          <div className="flex items-center gap-5 px-1 text-[var(--text-xs)] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1.5"><Network className="w-3.5 h-3.5" /> {t('orgStructure.legend.businessGroup')}</span>
            <span className="flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> {t('orgStructure.legend.subsidiary')}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {t('orgStructure.legend.facility')}</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
         FACILITIES
         ═══════════════════════════════════════ */}
      {tab === 'facilities' && (
        <div className="space-y-4 animate-fade-in">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('orgStructure.search.placeholder')}
              className="w-full h-9 pl-9 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:border-transparent transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Facility cards grid */}
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(fac => {
              const Icon = FAC_ICON[fac.type] || MapPin
              const st = STATUS[fac.status]
              const s1f = fac.sources.filter(s => s.scope === 'S1').length
              const s2f = fac.sources.filter(s => s.scope === 'S2').length
              return (
                <button key={fac.id} onClick={() => setSelected(fac)} className="text-left cursor-pointer group">
                  <Card hover className="h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${SCOPE_CLR.S1} 8%, transparent)` }}>
                        <Icon className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-teal)] transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] leading-tight truncate">{fac.name}</h3>
                        <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">{countryName(fac.countryCode, fac.country)} · {t('orgStructure.counts.staff', { value: fac.headcount.toLocaleString() })}</p>
                      </div>
                      <Badge variant={st.v} dot>{t(st.labelKey)}</Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                      <Badge variant={FAC_CLR[fac.type] || 'gray'}>{facType(fac.type)}</Badge>
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{fac.grid}</span>
                      <div className="flex-1" />
                      <div className="flex items-center gap-2">
                        {s1f > 0 && <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)]" />S1:{s1f}</span>}
                        {s2f > 0 && <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-amber)]" />S2:{s2f}</span>}
                      </div>
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">{t('orgStructure.search.noMatch')}</div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
         EMISSION SOURCES
         ═══════════════════════════════════════ */}
      {tab === 'sources' && (
        <div className="space-y-5 animate-fade-in">
          {/* Scope breakdown */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { scope: t('orgStructure.scopes.s1'), count: s1, key: 'S1', types: t('orgStructure.scopes.s1Types') },
              { scope: t('orgStructure.scopes.s2'), count: s2, key: 'S2', types: t('orgStructure.scopes.s2Types') },
              { scope: t('orgStructure.scopes.s3'), count: s3, key: 'S3', types: t('orgStructure.scopes.s3Types') },
            ].map(s => (
              <Card key={s.key} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: SCOPE_BG[s.key] }}>
                    <Flame className="w-5 h-5" style={{ color: SCOPE_CLR[s.key] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium leading-none">{s.scope}</p>
                    <p className="font-display text-[var(--text-xl)] font-bold tabular-nums leading-tight mt-1" style={{ color: SCOPE_CLR[s.key] }}>{s.count}</p>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-2">{s.types}</p>
              </Card>
            ))}
          </div>

          {/* Calculator routing */}
          <Card padding="none">
            <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] rounded-t-xl">
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{t('orgStructure.routing.title')}</h3>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{t('orgStructure.routing.desc')}</p>
            </div>
            {(() => {
              const byCalc: Record<string, { scope: string; names: string[]; count: number }> = {}
              srcs.forEach(s => {
                if (!byCalc[s.calculator]) byCalc[s.calculator] = { scope: s.scope, names: [], count: 0 }
                byCalc[s.calculator].count++
                if (!byCalc[s.calculator].names.includes(s.name)) byCalc[s.calculator].names.push(s.name)
              })
              return Object.entries(byCalc).map(([calc, d], i, arr) => (
                <div key={calc} className={`flex items-center gap-4 px-5 py-3 hover:bg-[var(--bg-hover)] transition-colors ${i < arr.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: SCOPE_BG[d.scope] }}>
                    <BarChart3 className="w-4 h-4" style={{ color: SCOPE_CLR[d.scope] }} />
                  </div>
                  <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] font-mono w-36">{calc}</span>
                  <Badge variant={SCOPE_BADGE[d.scope]}>{d.scope}</Badge>
                  <p className="flex-1 text-[var(--text-xs)] text-[var(--text-tertiary)] truncate">{d.names.map(sourceName).join(t('orgStructure.listSeparator'))}</p>
                  <span className="text-[var(--text-sm)] font-bold tabular-nums text-[var(--text-primary)] w-10 text-right">{d.count}</span>
                </div>
              ))
            })()}
          </Card>

          {/* Sources per facility */}
          <Card padding="none">
            <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] rounded-t-xl">
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{t('orgStructure.sourcesByFacility')}</h3>
            </div>
            {facs.map((fac, i) => {
              const Icon = FAC_ICON[fac.type] || MapPin
              const fs1 = fac.sources.filter(s => s.scope === 'S1').length
              const fs2 = fac.sources.filter(s => s.scope === 'S2').length
              return (
                <button key={fac.id} onClick={() => setSelected(fac)} className={`w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors cursor-pointer ${i < facs.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}>
                  <Icon className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                  <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] flex-1 truncate">{fac.name}</span>
                  <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] font-mono w-6">{fac.countryCode}</span>
                  <div className="flex items-center gap-3 w-32 justify-end">
                    {fs1 > 0 && <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)]" />S1:{fs1}</span>}
                    {fs2 > 0 && <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-amber)]" />S2:{fs2}</span>}
                  </div>
                  <span className="text-[var(--text-sm)] font-bold tabular-nums text-[var(--text-primary)] w-8 text-right">{fac.sources.length}</span>
                </button>
              )
            })}
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════
         FACILITY DETAIL MODAL
         ═══════════════════════════════════════ */}
      {selected && <FacilityModal fac={selected} onClose={() => setSelected(null)} />}

      {/* ═══════════════════════════════════════
         ADD GROUP MODAL
         ═══════════════════════════════════════ */}
      {modal === 'group' && (
        <Modal title={t('orgStructure.addGroupModal.title')} onClose={() => setModal(null)} width="max-w-md">
          <div className="space-y-4">
            <Input label={t('orgStructure.addGroupModal.groupName')} placeholder={t('orgStructure.addGroupModal.groupNamePlaceholder')} />
            <Input label={t('orgStructure.addGroupModal.description')} placeholder={t('orgStructure.addGroupModal.descriptionPlaceholder')} />
            <Select label={t('orgStructure.addGroupModal.accentColour')} options={['teal', 'blue', 'purple', 'amber', 'green'].map(value => ({ value, label: t(`orgStructure.colours.${value}`) }))} defaultValue="teal" />
          </div>
          <ModalFooter onClose={() => setModal(null)} label={t('orgStructure.addGroupModal.submit')} />
        </Modal>
      )}

      {/* ═══════════════════════════════════════
         ADD FACILITY MODAL
         ═══════════════════════════════════════ */}
      {modal === 'facility' && (
        <Modal title={t('orgStructure.addFacilityModal.title')} onClose={() => setModal(null)} width="max-w-lg">
          <div className="space-y-4">
            <Input label={t('orgStructure.addFacilityModal.facilityName')} placeholder={t('orgStructure.addFacilityModal.facilityNamePlaceholder')} />
            <div className="grid grid-cols-2 gap-4">
              <Select label={t('orgStructure.addFacilityModal.businessGroup')} options={groups.map(g => ({ value: g.id, label: groupName(g.name) }))} />
              <Select label={t('orgStructure.addFacilityModal.facilityType')} options={(['Manufacturing', 'Refinery', 'Office', 'Warehouse', 'Joint Venture', 'Laboratory', 'Data Centre'] as const).map(value => ({ value, label: facType(value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('orgStructure.addFacilityModal.country')} placeholder={t('orgStructure.addFacilityModal.countryPlaceholder')} />
              <Input label={t('orgStructure.addFacilityModal.countryCode')} placeholder={t('orgStructure.addFacilityModal.countryCodePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label={t('orgStructure.addFacilityModal.gridSubregion')} placeholder={t('orgStructure.addFacilityModal.gridSubregionPlaceholder')} />
              <Input label={t('orgStructure.addFacilityModal.headcount')} type="number" placeholder="0" />
            </div>
          </div>
          <ModalFooter onClose={() => setModal(null)} label={t('orgStructure.addFacilityModal.submit')} />
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Reusable Modal shell
   ═══════════════════════════════════════════ */
function Modal({ title, onClose, width = 'max-w-md', children }: { title: string; onClose: () => void; width?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full ${width} border border-[var(--border-default)] animate-fade-in`}>
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <h2 className="font-display text-[var(--text-lg)] font-bold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onClose, label }: { onClose: () => void; label: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-[var(--border-subtle)]">
      <button onClick={onClose} className="px-4 py-2 rounded-lg text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">{t('common.cancel')}</button>
      <button onClick={onClose} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.97] transition-all cursor-pointer shadow-sm">
        <Check className="w-3.5 h-3.5" /> {label}
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Facility Detail Modal
   ═══════════════════════════════════════════ */
function FacilityModal({ fac, onClose }: { fac: Facility; onClose: () => void }) {
  const { t, facType, sourceName, countryName } = useOrgLabels()
  const Icon = FAC_ICON[fac.type] || MapPin
  const st = STATUS[fac.status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-[var(--border-default)] animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-teal-light)] flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h2 className="text-[var(--text-base)] font-bold text-[var(--text-primary)] leading-tight">{fac.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={FAC_CLR[fac.type] || 'gray'}>{facType(fac.type)}</Badge>
                <Badge variant={st.v} dot>{t(st.labelKey)}</Badge>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: t('orgStructure.facilityModal.country'), v: countryName(fac.countryCode, fac.country) },
              { l: t('orgStructure.facilityModal.gridRegion'), v: fac.grid },
              { l: t('orgStructure.facilityModal.gridEf'), v: `${fac.ef} kgCO₂e/kWh` },
              { l: t('orgStructure.facilityModal.headcount'), v: fac.headcount.toLocaleString() },
              { l: t('orgStructure.facilityModal.emissionSources'), v: String(fac.sources.length) },
              { l: t('orgStructure.facilityModal.facilityType'), v: facType(fac.type) },
            ].map(m => (
              <div key={m.l} className="px-3 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">{m.l}</p>
                <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mt-0.5">{m.v}</p>
              </div>
            ))}
          </div>

          {/* Sources list */}
          <div>
            <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-2">{t('orgStructure.facilityModal.registeredSources')}</h3>
            <div className="space-y-1.5">
              {fac.sources.map(src => (
                <div key={src.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: SCOPE_BG[src.scope] }}>
                    <Flame className="w-3.5 h-3.5" style={{ color: SCOPE_CLR[src.scope] }} />
                  </div>
                  <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] flex-1">{sourceName(src.name)}</span>
                  <Badge variant={SCOPE_BADGE[src.scope]}>{src.scope}</Badge>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{src.calculator}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info callout */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--accent-blue-light)] border border-blue-100">
            <Info className="w-4 h-4 text-[var(--accent-blue)] flex-shrink-0 mt-0.5" />
            <p className="text-[var(--text-xs)] text-[var(--accent-blue)] leading-relaxed">
              <strong>{fac.grid}</strong>{t('orgStructure.facilityModal.callout', { ef: fac.ef, period: t('orgStructure.company.reportingPeriod') })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] hover:bg-[var(--accent-teal-light)] transition-all cursor-pointer">
              <Pencil className="w-3.5 h-3.5" /> {t('common.edit')}
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] hover:bg-[var(--accent-teal-light)] transition-all cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> {t('orgStructure.facilityModal.addSource')}
            </button>
            <div className="flex-1" />
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-sm)] font-medium text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-all cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" /> {t('orgStructure.facilityModal.decommission')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
