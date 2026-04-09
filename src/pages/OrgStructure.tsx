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
import { Card, Badge, Tabs, Input, Select } from '../design-system'

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
  name: 'PTT Global Chemical PCL',
  tradingName: 'PTTGC',
  sector: 'Petrochemicals & Refining',
  country: 'Thailand',
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
        id: 's1', name: 'PTTGC Chemicals Thailand', equity: 100, country: 'Thailand', countryCode: 'TH',
        facilities: [
          { id: 'f1', name: 'Map Ta Phut Olefins Plant', country: 'Thailand', countryCode: 'TH', type: 'Manufacturing', grid: 'TH-PEA-Eastern', ef: '0.4999', headcount: 1240, status: 'operational',
            sources: mk([{ n: 'Boilers & Furnaces', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Flare Systems', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Process Venting', t: 'process', s: 'S1', c: 'GHG-HFC-v1' }, { n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }, { n: 'Company Vehicles', t: 'mobile', s: 'S1', c: 'GHG-TRANS-v2.7' }]) },
          { id: 'f2', name: 'Rayong Aromatics Complex', country: 'Thailand', countryCode: 'TH', type: 'Refinery', grid: 'TH-PEA-Eastern', ef: '0.5123', headcount: 890, status: 'operational',
            sources: mk([{ n: 'Cracking Furnaces', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Cooling Towers', t: 'fugitive', s: 'S1', c: 'GHG-HFC-v1' }, { n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }, { n: 'Purchased Steam', t: 'heat', s: 'S2', c: 'GHG-HEAT-v2.0' }]) },
        ],
      },
      {
        id: 's2', name: 'PTTGC International (Singapore)', equity: 80, country: 'Singapore', countryCode: 'SG',
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
        id: 's3', name: 'PTTGC Polymers Co., Ltd.', equity: 100, country: 'Thailand', countryCode: 'TH',
        facilities: [
          { id: 'f4', name: 'Rayong PE/PP Plant', country: 'Thailand', countryCode: 'TH', type: 'Manufacturing', grid: 'TH-PEA-Eastern', ef: '0.5123', headcount: 650, status: 'operational',
            sources: mk([{ n: 'Extruder Heaters', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Pellet Dryers', t: 'stationary', s: 'S1', c: 'GHG-STAT-v4.2' }, { n: 'Grid Electricity', t: 'electricity', s: 'S2', c: 'GHG-ELEC-v3.1' }]) },
        ],
      },
      {
        id: 's4', name: 'Nanjing PTTGC JV', equity: 51, country: 'China', countryCode: 'CN',
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
        id: 's5', name: 'PTTGC Green Solutions', equity: 100, country: 'Thailand', countryCode: 'TH',
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
const STATUS: Record<string, { v: 'green' | 'amber' | 'gray'; l: string }> = { operational: { v: 'green', l: 'Operational' }, planned: { v: 'amber', l: 'Planned' }, decommissioned: { v: 'gray', l: 'Decommissioned' } }

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function OrgStructure() {
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
    ? facs.filter(f => `${f.name} ${f.country} ${f.type}`.toLowerCase().includes(search.toLowerCase()))
    : facs

  const s1 = srcs.filter(s => s.scope === 'S1').length
  const s2 = srcs.filter(s => s.scope === 'S2').length
  const s3 = srcs.filter(s => s.scope === 'S3').length

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">Organisation Structure</h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">Corporate hierarchy, facilities, and emission source registrations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal('group')} className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-[var(--border-default)] text-[12px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] hover:bg-[var(--accent-teal-light)] transition-all cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Group
          </button>
          <button onClick={() => setModal('facility')} className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[var(--bg-inverse)] text-white text-[12px] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.97] transition-all cursor-pointer shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Add Facility
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Business Groups', value: groups.length, icon: Network, color: 'var(--accent-teal)', bg: 'var(--accent-teal-light)' },
          { label: 'Subsidiaries', value: groups.reduce((n, g) => n + g.subsidiaries.length, 0), icon: GitBranch, color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' },
          { label: 'Facilities', value: facs.length, icon: Factory, color: 'var(--accent-purple)', bg: 'var(--accent-purple-light)' },
          { label: 'Countries', value: ctrs.length, icon: Globe2, color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)' },
          { label: 'Emission Sources', value: srcs.length, icon: Flame, color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
        ].map(m => {
          const Icon = m.icon
          return (
            <Card key={m.label} padding="sm">
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
            <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">{COMPANY.sector}</p>
          </div>
          <div className="flex items-center gap-6 text-[var(--text-xs)] text-[var(--text-secondary)] flex-shrink-0">
            <span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />{COMPANY.boundary}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />Base year {COMPANY.baseYear}</span>
            <Badge variant="blue">{COMPANY.reportingPeriod}</Badge>
          </div>
        </div>
      </Card>

      {/* ── Tabs ── */}
      <Tabs
        tabs={[
          { id: 'hierarchy', label: 'Hierarchy', count: groups.length },
          { id: 'facilities', label: 'Facilities', count: facs.length },
          { id: 'sources', label: 'Emission Sources', count: srcs.length },
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
                    <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] leading-tight">{group.name}</h3>
                    <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">
                      {group.subsidiaries.length} subsidiar{group.subsidiaries.length === 1 ? 'y' : 'ies'} · {gFacs.length} facilit{gFacs.length === 1 ? 'y' : 'ies'} · {gFacs.flatMap(f => f.sources).length} sources
                    </p>
                  </div>
                  <Badge variant="gray">{gFacs.reduce((n, f) => n + f.headcount, 0).toLocaleString()} staff</Badge>
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
                            <Badge variant="gray">{sub.equity}% equity</Badge>
                            <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] w-16 text-right">{sub.facilities.length} site{sub.facilities.length !== 1 ? 's' : ''}</span>
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
                                <Badge variant={FAC_CLR[fac.type] || 'gray'}>{fac.type}</Badge>
                                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] font-mono w-6 text-center">{fac.countryCode}</span>
                                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] w-20 text-right">{fac.sources.length} sources</span>
                                <Badge variant={st.v} dot>{st.l}</Badge>
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
            <span className="flex items-center gap-1.5"><Network className="w-3.5 h-3.5" /> Business Group</span>
            <span className="flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Subsidiary</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Facility</span>
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
              placeholder="Search facilities..."
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
                        <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">{fac.country} · {fac.headcount.toLocaleString()} staff</p>
                      </div>
                      <Badge variant={st.v} dot>{st.l}</Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                      <Badge variant={FAC_CLR[fac.type] || 'gray'}>{fac.type}</Badge>
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
            <div className="py-12 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">No facilities match your search.</div>
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
              { scope: 'Scope 1 — Direct', count: s1, key: 'S1', types: 'Stationary, mobile, process, fugitive' },
              { scope: 'Scope 2 — Indirect', count: s2, key: 'S2', types: 'Purchased electricity, heat, steam' },
              { scope: 'Scope 3 — Value Chain', count: s3, key: 'S3', types: 'Upstream & downstream activities' },
            ].map(s => (
              <Card key={s.scope} padding="sm">
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
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Calculator Routing</h3>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Each source is auto-routed to the correct GHG Protocol calculator</p>
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
                  <p className="flex-1 text-[var(--text-xs)] text-[var(--text-tertiary)] truncate">{d.names.join(', ')}</p>
                  <span className="text-[var(--text-sm)] font-bold tabular-nums text-[var(--text-primary)] w-10 text-right">{d.count}</span>
                </div>
              ))
            })()}
          </Card>

          {/* Sources per facility */}
          <Card padding="none">
            <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] rounded-t-xl">
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Sources by Facility</h3>
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
        <Modal title="Add Business Group" onClose={() => setModal(null)} width="max-w-md">
          <div className="space-y-4">
            <Input label="Group Name" placeholder="e.g. Performance Materials" />
            <Input label="Description" placeholder="Business segment description" />
            <Select label="Accent Colour" options={[{ value: 'teal', label: 'Teal' }, { value: 'blue', label: 'Blue' }, { value: 'purple', label: 'Purple' }, { value: 'amber', label: 'Amber' }, { value: 'green', label: 'Green' }]} defaultValue="teal" />
          </div>
          <ModalFooter onClose={() => setModal(null)} label="Create Group" />
        </Modal>
      )}

      {/* ═══════════════════════════════════════
         ADD FACILITY MODAL
         ═══════════════════════════════════════ */}
      {modal === 'facility' && (
        <Modal title="Add Facility" onClose={() => setModal(null)} width="max-w-lg">
          <div className="space-y-4">
            <Input label="Facility Name" placeholder="e.g. Osaka Distribution Centre" />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Business Group" options={groups.map(g => ({ value: g.id, label: g.name }))} />
              <Select label="Facility Type" options={[{ value: 'Manufacturing', label: 'Manufacturing' }, { value: 'Refinery', label: 'Refinery' }, { value: 'Office', label: 'Office' }, { value: 'Warehouse', label: 'Warehouse' }, { value: 'Joint Venture', label: 'Joint Venture' }, { value: 'Laboratory', label: 'Laboratory' }, { value: 'Data Centre', label: 'Data Centre' }]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Country" placeholder="e.g. Japan" />
              <Input label="Country Code" placeholder="e.g. JP" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Grid Subregion" placeholder="e.g. JP-Kansai" />
              <Input label="Headcount" type="number" placeholder="0" />
            </div>
          </div>
          <ModalFooter onClose={() => setModal(null)} label="Create Facility" />
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
  return (
    <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-[var(--border-subtle)]">
      <button onClick={onClose} className="px-4 py-2 rounded-lg text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">Cancel</button>
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
                <Badge variant={FAC_CLR[fac.type] || 'gray'}>{fac.type}</Badge>
                <Badge variant={st.v} dot>{st.l}</Badge>
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
              { l: 'Country', v: fac.country },
              { l: 'Grid Region', v: fac.grid },
              { l: 'Grid EF', v: `${fac.ef} kgCO₂e/kWh` },
              { l: 'Headcount', v: fac.headcount.toLocaleString() },
              { l: 'Emission Sources', v: String(fac.sources.length) },
              { l: 'Facility Type', v: fac.type },
            ].map(m => (
              <div key={m.l} className="px-3 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">{m.l}</p>
                <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mt-0.5">{m.v}</p>
              </div>
            ))}
          </div>

          {/* Sources list */}
          <div>
            <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-2">Registered Emission Sources</h3>
            <div className="space-y-1.5">
              {fac.sources.map(src => (
                <div key={src.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: SCOPE_BG[src.scope] }}>
                    <Flame className="w-3.5 h-3.5" style={{ color: SCOPE_CLR[src.scope] }} />
                  </div>
                  <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] flex-1">{src.name}</span>
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
              <strong>{fac.grid}</strong> — location-based EF: {fac.ef} kgCO₂e/kWh (IEA {COMPANY.reportingPeriod}). Market-based factors from supplier contracts are managed separately.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] hover:bg-[var(--accent-teal-light)] transition-all cursor-pointer">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] hover:bg-[var(--accent-teal-light)] transition-all cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add Source
            </button>
            <div className="flex-1" />
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-sm)] font-medium text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-all cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" /> Decommission
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
