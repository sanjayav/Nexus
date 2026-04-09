import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  X,
  Beaker,
  Info,
  ChevronDown,
  ChevronRight,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Thermometer,
  Atom,
  Wind,
  Flame,
  Droplets,
  Leaf,
} from 'lucide-react'
import { Card, Badge, Tabs, Button, Input } from '../design-system'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface GWPRecord {
  id: string
  name: string
  formula: string
  casNumber: string
  category: string
  gwp100_ar5: number
  gwp100_ar6: number
  gwp20_ar6: number
  lifetime: string
  source: string
  notes?: string
  isCommon: boolean
}

/* ═══════════════════════════════════════════
   Demo Data — IPCC AR5 & AR6 GWP values
   ═══════════════════════════════════════════ */
const GWP_DATA: GWPRecord[] = [
  // Common GHGs
  { id: 'gwp-001', name: 'Carbon Dioxide', formula: 'CO₂', casNumber: '124-38-9', category: 'Common GHG', gwp100_ar5: 1, gwp100_ar6: 1, gwp20_ar6: 1, lifetime: 'Variable', source: 'IPCC AR6 (2021)', isCommon: true },
  { id: 'gwp-002', name: 'Methane (Fossil)', formula: 'CH₄', casNumber: '74-82-8', category: 'Common GHG', gwp100_ar5: 30, gwp100_ar6: 29.8, gwp20_ar6: 82.5, lifetime: '11.8 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'AR6 includes climate-carbon feedback. Fossil vs biogenic distinction introduced.' },
  { id: 'gwp-003', name: 'Methane (Biogenic)', formula: 'CH₄', casNumber: '74-82-8', category: 'Common GHG', gwp100_ar5: 28, gwp100_ar6: 27.0, gwp20_ar6: 80.8, lifetime: '11.8 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Biogenic methane has slightly lower GWP due to carbon cycle accounting.' },
  { id: 'gwp-004', name: 'Nitrous Oxide', formula: 'N₂O', casNumber: '10024-97-2', category: 'Common GHG', gwp100_ar5: 265, gwp100_ar6: 273, gwp20_ar6: 273, lifetime: '109 years', source: 'IPCC AR6 (2021)', isCommon: true },

  // HFCs
  { id: 'gwp-005', name: 'HFC-23', formula: 'CHF₃', casNumber: '75-46-7', category: 'HFC', gwp100_ar5: 12400, gwp100_ar6: 14600, gwp20_ar6: 12400, lifetime: '228 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-006', name: 'HFC-32', formula: 'CH₂F₂', casNumber: '75-10-5', category: 'HFC', gwp100_ar5: 677, gwp100_ar6: 771, gwp20_ar6: 2693, lifetime: '5.4 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Used in R-410A blend. Low-GWP alternative to R-22.' },
  { id: 'gwp-007', name: 'HFC-125', formula: 'CHF₂CF₃', casNumber: '354-33-6', category: 'HFC', gwp100_ar5: 3170, gwp100_ar6: 3740, gwp20_ar6: 6740, lifetime: '30 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-008', name: 'HFC-134a', formula: 'CH₂FCF₃', casNumber: '811-97-2', category: 'HFC', gwp100_ar5: 1300, gwp100_ar6: 1530, gwp20_ar6: 4144, lifetime: '14 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Most widely used automotive refrigerant. Being phased down under Kigali Amendment.' },
  { id: 'gwp-009', name: 'HFC-143a', formula: 'CH₃CF₃', casNumber: '420-46-2', category: 'HFC', gwp100_ar5: 4800, gwp100_ar6: 5810, gwp20_ar6: 7840, lifetime: '51 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-010', name: 'HFC-152a', formula: 'CH₃CHF₂', casNumber: '75-37-6', category: 'HFC', gwp100_ar5: 138, gwp100_ar6: 164, gwp20_ar6: 591, lifetime: '1.6 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-011', name: 'HFC-227ea', formula: 'CF₃CHFCF₃', casNumber: '431-89-0', category: 'HFC', gwp100_ar5: 3350, gwp100_ar6: 3600, gwp20_ar6: 5850, lifetime: '36 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-012', name: 'HFC-245fa', formula: 'CHF₂CH₂CF₃', casNumber: '460-73-1', category: 'HFC', gwp100_ar5: 858, gwp100_ar6: 962, gwp20_ar6: 2920, lifetime: '7.9 years', source: 'IPCC AR6 (2021)', isCommon: false },

  // PFCs
  { id: 'gwp-013', name: 'PFC-14 (CF₄)', formula: 'CF₄', casNumber: '75-73-0', category: 'PFC', gwp100_ar5: 6630, gwp100_ar6: 7380, gwp20_ar6: 5300, lifetime: '50,000 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Extremely long atmospheric lifetime. Primary PFC from aluminium smelting.' },
  { id: 'gwp-014', name: 'PFC-116 (C₂F₆)', formula: 'C₂F₆', casNumber: '76-16-4', category: 'PFC', gwp100_ar5: 11100, gwp100_ar6: 12400, gwp20_ar6: 8940, lifetime: '10,000 years', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-015', name: 'PFC-218 (C₃F₈)', formula: 'C₃F₈', casNumber: '76-19-7', category: 'PFC', gwp100_ar5: 8900, gwp100_ar6: 9290, gwp20_ar6: 6680, lifetime: '2,600 years', source: 'IPCC AR6 (2021)', isCommon: false },

  // SF₆ & NF₃
  { id: 'gwp-016', name: 'Sulphur Hexafluoride', formula: 'SF₆', casNumber: '2551-62-4', category: 'Fluorinated', gwp100_ar5: 23500, gwp100_ar6: 25200, gwp20_ar6: 18300, lifetime: '3,200 years', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Highest GWP of any gas measured. Used in electrical switchgear. F-gas regulations apply.' },
  { id: 'gwp-017', name: 'Nitrogen Trifluoride', formula: 'NF₃', casNumber: '7783-54-2', category: 'Fluorinated', gwp100_ar5: 16100, gwp100_ar6: 17400, gwp20_ar6: 13400, lifetime: '569 years', source: 'IPCC AR6 (2021)', isCommon: false },

  // Refrigerant blends
  { id: 'gwp-018', name: 'R-404A (Blend)', formula: 'R-404A', casNumber: 'Blend', category: 'Refrigerant Blend', gwp100_ar5: 3922, gwp100_ar6: 4728, gwp20_ar6: 7476, lifetime: 'N/A', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'HFC-125/143a/134a (44/52/4%). Common in commercial refrigeration. Being phased down.' },
  { id: 'gwp-019', name: 'R-410A (Blend)', formula: 'R-410A', casNumber: 'Blend', category: 'Refrigerant Blend', gwp100_ar5: 1924, gwp100_ar6: 2256, gwp20_ar6: 4710, lifetime: 'N/A', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'HFC-32/125 (50/50%). Standard in air conditioning. R-32 is lower-GWP single-component alternative.' },
  { id: 'gwp-020', name: 'R-407C (Blend)', formula: 'R-407C', casNumber: 'Blend', category: 'Refrigerant Blend', gwp100_ar5: 1624, gwp100_ar6: 1908, gwp20_ar6: 4540, lifetime: 'N/A', source: 'IPCC AR6 (2021)', isCommon: false },
  { id: 'gwp-021', name: 'R-507A (Blend)', formula: 'R-507A', casNumber: 'Blend', category: 'Refrigerant Blend', gwp100_ar5: 3985, gwp100_ar6: 4775, gwp20_ar6: 7290, lifetime: 'N/A', source: 'IPCC AR6 (2021)', isCommon: false },

  // Natural refrigerants (low GWP)
  { id: 'gwp-022', name: 'R-290 (Propane)', formula: 'C₃H₈', casNumber: '74-98-6', category: 'Natural Refrigerant', gwp100_ar5: 3, gwp100_ar6: 0.02, gwp20_ar6: 0.072, lifetime: '12 days', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Natural refrigerant with near-zero GWP. Flammable (A3 safety class).' },
  { id: 'gwp-023', name: 'R-744 (CO₂)', formula: 'CO₂', casNumber: '124-38-9', category: 'Natural Refrigerant', gwp100_ar5: 1, gwp100_ar6: 1, gwp20_ar6: 1, lifetime: 'Variable', source: 'IPCC AR6 (2021)', isCommon: true },
  { id: 'gwp-024', name: 'R-717 (Ammonia)', formula: 'NH₃', casNumber: '7664-41-7', category: 'Natural Refrigerant', gwp100_ar5: 0, gwp100_ar6: 0, gwp20_ar6: 0, lifetime: 'Days', source: 'IPCC AR6 (2021)', isCommon: true, notes: 'Zero GWP. Toxic and flammable but widely used in industrial refrigeration.' },
]

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */
const CATEGORIES = [...new Set(GWP_DATA.map(g => g.category))].sort()

const CATEGORY_COLORS: Record<string, string> = {
  'Common GHG': 'var(--accent-teal)',
  'HFC': 'var(--accent-red)',
  'PFC': 'var(--accent-purple)',
  'Fluorinated': 'var(--accent-amber)',
  'Refrigerant Blend': 'var(--accent-blue)',
  'Natural Refrigerant': 'var(--accent-green)',
}

const CATEGORY_ICONS: Record<string, typeof Flame> = {
  'Common GHG': Wind,
  'HFC': Thermometer,
  'PFC': Atom,
  'Fluorinated': AlertTriangle,
  'Refrigerant Blend': Droplets,
  'Natural Refrigerant': Leaf,
}

const TABS_CONFIG = [
  { id: 'all', label: 'All Gases', count: GWP_DATA.length },
  { id: 'common', label: 'Common GHGs' },
  { id: 'hfc', label: 'HFCs' },
  { id: 'pfc', label: 'PFCs' },
  { id: 'blends', label: 'Blends' },
  { id: 'natural', label: 'Natural' },
]

/* ═══════════════════════════════════════════
   GWP bar helper — visual comparison
   ═══════════════════════════════════════════ */
function GWPBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = value > 10000 ? 'var(--accent-red)' : value > 1000 ? 'var(--accent-amber)' : value > 100 ? 'var(--accent-blue)' : 'var(--accent-teal)'
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums w-16 text-right">{value.toLocaleString()}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function GWPValues() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [timeHorizon, setTimeHorizon] = useState<'gwp100' | 'gwp20'>('gwp100')
  const [arVersion, setArVersion] = useState<'ar6' | 'ar5'>('ar6')
  const [expandedGas, setExpandedGas] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  /* Max GWP for bar scaling */
  const maxGWP = useMemo(() => Math.max(...GWP_DATA.map(g => g.gwp100_ar6)), [])

  /* Filtered data */
  const filtered = useMemo(() => {
    return GWP_DATA.filter(g => {
      // Tab filters
      if (tab === 'common' && g.category !== 'Common GHG') return false
      if (tab === 'hfc' && g.category !== 'HFC') return false
      if (tab === 'pfc' && g.category !== 'PFC') return false
      if (tab === 'blends' && g.category !== 'Refrigerant Blend') return false
      if (tab === 'natural' && g.category !== 'Natural Refrigerant') return false
      // Category dropdown
      if (categoryFilter !== 'all' && g.category !== categoryFilter) return false
      // Search
      if (search) {
        const q = search.toLowerCase()
        return (
          g.name.toLowerCase().includes(q) ||
          g.formula.toLowerCase().includes(q) ||
          g.casNumber.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [tab, search, categoryFilter])

  const handleCopy = (id: string, value: number) => {
    navigator.clipboard.writeText(value.toString())
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const getGWPValue = (g: GWPRecord) => {
    if (timeHorizon === 'gwp20') return g.gwp20_ar6
    return arVersion === 'ar6' ? g.gwp100_ar6 : g.gwp100_ar5
  }

  /* Summary stats */
  const highGWP = GWP_DATA.filter(g => g.gwp100_ar6 > 1000).length
  const kigaliCount = GWP_DATA.filter(g => g.category === 'HFC' || g.category === 'Refrigerant Blend').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">GWP Values</h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">
            Global Warming Potential reference table. IPCC AR5 & AR6 values for GHG inventory calculations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Export CSV</Button>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddModal(true)}>Add Gas</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Gases', value: GWP_DATA.length.toString(), icon: Atom, accent: 'var(--accent-teal)' },
          { label: 'High GWP (>1000)', value: highGWP.toString(), icon: AlertTriangle, accent: 'var(--accent-red)' },
          { label: 'Kigali Regulated', value: kigaliCount.toString(), icon: Thermometer, accent: 'var(--accent-amber)' },
          { label: 'Categories', value: CATEGORIES.length.toString(), icon: Beaker, accent: 'var(--accent-blue)' },
          { label: 'Highest GWP', value: maxGWP.toLocaleString(), icon: Flame, accent: 'var(--accent-purple)' },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">{kpi.label}</p>
                  <p className="text-[var(--text-2xl)] font-bold text-[var(--text-primary)] mt-1 tabular-nums">{kpi.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}>
                  <Icon className="w-5 h-5" style={{ color: kpi.accent }} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS_CONFIG} activeTab={tab} onChange={setTab} />

      {/* Filter & Toggle Bar */}
      <Card padding="sm">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by name, formula, or CAS number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/30 focus:border-[var(--accent-teal)]"
            />
          </div>
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-[var(--text-xs)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/30 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Time horizon toggle */}
          <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
            <button
              onClick={() => setTimeHorizon('gwp100')}
              className={`px-3 py-1.5 text-[var(--text-xs)] font-medium transition-colors cursor-pointer ${
                timeHorizon === 'gwp100'
                  ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              GWP-100
            </button>
            <button
              onClick={() => setTimeHorizon('gwp20')}
              className={`px-3 py-1.5 text-[var(--text-xs)] font-medium transition-colors cursor-pointer ${
                timeHorizon === 'gwp20'
                  ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              GWP-20
            </button>
          </div>
          {/* AR version toggle */}
          {timeHorizon === 'gwp100' && (
            <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
              <button
                onClick={() => setArVersion('ar6')}
                className={`px-3 py-1.5 text-[var(--text-xs)] font-medium transition-colors cursor-pointer ${
                  arVersion === 'ar6'
                    ? 'bg-[var(--accent-blue-light,var(--accent-teal-light))] text-[var(--accent-blue)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                AR6
              </button>
              <button
                onClick={() => setArVersion('ar5')}
                className={`px-3 py-1.5 text-[var(--text-xs)] font-medium transition-colors cursor-pointer ${
                  arVersion === 'ar5'
                    ? 'bg-[var(--accent-blue-light,var(--accent-teal-light))] text-[var(--accent-blue)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                AR5
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
          Showing <span className="font-semibold text-[var(--text-secondary)]">{filtered.length}</span> of {GWP_DATA.length} gases
          {timeHorizon === 'gwp100' ? ` (GWP-100, ${arVersion.toUpperCase()})` : ' (GWP-20, AR6)'}
        </p>
      </div>

      {/* GWP Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-[var(--text-xs)]">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <th className="text-left py-3 px-4 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Substance</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Formula</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">CAS No.</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider min-w-[260px]">
                  {timeHorizon === 'gwp100'
                    ? `GWP-100 (${arVersion.toUpperCase()})`
                    : 'GWP-20 (AR6)'}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Lifetime</th>
                <th className="text-center py-3 px-4 font-semibold text-[var(--text-tertiary)] uppercase tracking-wider w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => {
                const isExpanded = expandedGas === g.id
                const catColor = CATEGORY_COLORS[g.category] || 'var(--accent-teal)'
                const CatIcon = CATEGORY_ICONS[g.category] || Atom
                const gwpVal = getGWPValue(g)
                return (
                  <>
                    <tr
                      key={g.id}
                      className={`${i % 2 === 0 ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)]'} hover:bg-[var(--bg-hover)] transition-colors cursor-pointer`}
                      onClick={() => setExpandedGas(isExpanded ? null : g.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${catColor} 10%, transparent)` }}>
                            <CatIcon className="w-3.5 h-3.5" style={{ color: catColor }} />
                          </div>
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">{g.name}</span>
                            {g.isCommon && (
                              <span className="ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">Common</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[var(--text-secondary)]">{g.formula}</td>
                      <td className="py-3 px-4 font-mono text-[var(--text-tertiary)]">{g.casNumber}</td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          g.category === 'Common GHG' ? 'teal' :
                          g.category === 'HFC' ? 'red' :
                          g.category === 'PFC' ? 'purple' :
                          g.category === 'Fluorinated' ? 'amber' :
                          g.category === 'Natural Refrigerant' ? 'green' : 'blue'
                        }>{g.category}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <GWPBar value={gwpVal} max={maxGWP} />
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--text-tertiary)]">{g.lifetime}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); handleCopy(g.id, gwpVal) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer"
                            title="Copy GWP"
                          >
                            {copiedId === g.id ? <Check className="w-3.5 h-3.5 text-[var(--accent-teal)]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setExpandedGas(isExpanded ? null : g.id) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded */}
                    {isExpanded && (
                      <tr key={`${g.id}-detail`}>
                        <td colSpan={7} className="bg-[var(--bg-secondary)] border-y border-[var(--border-subtle)]">
                          <div className="px-6 py-4">
                            <div className="grid grid-cols-5 gap-4 mb-3">
                              <CompareCell label="GWP-100 (AR6)" value={g.gwp100_ar6} />
                              <CompareCell label="GWP-100 (AR5)" value={g.gwp100_ar5} />
                              <CompareCell label="GWP-20 (AR6)" value={g.gwp20_ar6} />
                              <div>
                                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">AR5 → AR6 Change</p>
                                {g.gwp100_ar5 > 0 ? (
                                  <p className={`text-[var(--text-sm)] font-bold mt-0.5 tabular-nums ${
                                    g.gwp100_ar6 > g.gwp100_ar5 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-teal)]'
                                  }`}>
                                    {g.gwp100_ar6 > g.gwp100_ar5 ? '+' : ''}
                                    {(((g.gwp100_ar6 - g.gwp100_ar5) / g.gwp100_ar5) * 100).toFixed(1)}%
                                  </p>
                                ) : (
                                  <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-0.5">N/A</p>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">Source</p>
                                <p className="text-[var(--text-xs)] text-[var(--text-primary)] font-medium mt-0.5">{g.source}</p>
                              </div>
                            </div>
                            {g.notes && (
                              <div className="flex items-start gap-2 rounded-lg p-3 border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-blue) 6%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' }}>
                                <Info className="w-3.5 h-3.5 text-[var(--accent-blue)] mt-0.5 flex-shrink-0" />
                                <p className="text-[var(--text-xs)] text-[var(--text-secondary)]">{g.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Atom className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3 opacity-40" />
            <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">No gases match your search.</p>
          </div>
        )}
      </Card>

      {/* Reference notes */}
      <Card padding="md">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--accent-teal)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-1">GWP Reference Notes</h3>
            <div className="grid grid-cols-3 gap-4 mt-3">
              {[
                { title: 'GWP-100 vs GWP-20', desc: 'GWP-100 is the standard for GHG inventories (GHG Protocol, CDP). GWP-20 shows short-term warming impact — methane is 82.5x CO₂ over 20 years vs 29.8x over 100 years.' },
                { title: 'AR5 vs AR6', desc: 'IPCC AR6 (2021) updated GWP values. Most frameworks still accept AR5, but CDP 2025+ and CSRD/ESRS require AR6. Check framework guidance.' },
                { title: 'Kigali Amendment', desc: 'HFCs are being phased down under the Kigali Amendment to the Montreal Protocol. Report HFC usage for compliance tracking and transition planning.' },
              ].map(note => (
                <div key={note.title} className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed">
                  <p className="font-semibold text-[var(--text-primary)] mb-1">{note.title}</p>
                  <p>{note.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Add Gas Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
              <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Add Greenhouse Gas</h2>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer">
                <X className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Gas Name" placeholder="e.g. HFC-32" />
                <Input label="Chemical Formula" placeholder="e.g. CH₂F₂" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="CAS Number" placeholder="e.g. 75-10-5" />
                <div>
                  <label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">Category</label>
                  <select className="w-full h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-[var(--text-xs)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/30 cursor-pointer">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="GWP-100 (AR6)" type="number" placeholder="0" />
                <Input label="GWP-100 (AR5)" type="number" placeholder="0" />
                <Input label="GWP-20 (AR6)" type="number" placeholder="0" />
              </div>
              <Input label="Atmospheric Lifetime" placeholder="e.g. 11.8 years" />
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-[var(--border-subtle)]">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={() => setShowAddModal(false)}>Add Gas</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Compare cell helper
   ═══════════════════════════════════════════ */
function CompareCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-[var(--text-sm)] font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}
