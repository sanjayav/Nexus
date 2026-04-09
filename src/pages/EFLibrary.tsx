import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Edit3,
  Download,
  Upload,
  X,
  BookOpen,
  Leaf,
  Flame,
  Zap,
  Truck,
  Factory,
  Droplets,
  Wind,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  Info,
  Sparkles,
  Database,
  Shield,
  ArrowUpRight,
} from 'lucide-react'
import { Badge, Tabs, Button, Input } from '../design-system'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface EmissionFactor {
  id: string
  name: string
  category: string
  subcategory: string
  scope: 'Scope 1' | 'Scope 2' | 'Scope 3'
  value: number
  unit: string
  source: string
  sourceYear: number
  region: string
  uncertainty: string
  lastUpdated: string
  status: 'active' | 'deprecated' | 'draft'
  notes?: string
}

/* ═══════════════════════════════════════════
   Demo Data
   ═══════════════════════════════════════════ */
const EMISSION_FACTORS: EmissionFactor[] = [
  { id: 'ef-001', name: 'Natural Gas', category: 'Stationary Combustion', subcategory: 'Fuel', scope: 'Scope 1', value: 56.1, unit: 'kgCO₂e/GJ', source: 'IPCC 2006 GL', sourceYear: 2006, region: 'Global', uncertainty: '±5%', lastUpdated: '2025-12-01', status: 'active' },
  { id: 'ef-002', name: 'Diesel (Industrial)', category: 'Stationary Combustion', subcategory: 'Fuel', scope: 'Scope 1', value: 74.1, unit: 'kgCO₂e/GJ', source: 'IPCC 2006 GL', sourceYear: 2006, region: 'Global', uncertainty: '±5%', lastUpdated: '2025-12-01', status: 'active' },
  { id: 'ef-003', name: 'Fuel Oil (Heavy)', category: 'Stationary Combustion', subcategory: 'Fuel', scope: 'Scope 1', value: 77.4, unit: 'kgCO₂e/GJ', source: 'IPCC 2006 GL', sourceYear: 2006, region: 'Global', uncertainty: '±5%', lastUpdated: '2025-12-01', status: 'active' },
  { id: 'ef-004', name: 'Coal (Bituminous)', category: 'Stationary Combustion', subcategory: 'Fuel', scope: 'Scope 1', value: 94.6, unit: 'kgCO₂e/GJ', source: 'IPCC 2006 GL', sourceYear: 2006, region: 'Global', uncertainty: '±7%', lastUpdated: '2025-12-01', status: 'active' },
  { id: 'ef-005', name: 'LPG', category: 'Stationary Combustion', subcategory: 'Fuel', scope: 'Scope 1', value: 63.1, unit: 'kgCO₂e/GJ', source: 'IPCC 2006 GL', sourceYear: 2006, region: 'Global', uncertainty: '±5%', lastUpdated: '2025-12-01', status: 'active' },
  { id: 'ef-006', name: 'Diesel (Road Transport)', category: 'Mobile Combustion', subcategory: 'Transport', scope: 'Scope 1', value: 2.68, unit: 'kgCO₂e/litre', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±3%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-007', name: 'Petrol (Road Transport)', category: 'Mobile Combustion', subcategory: 'Transport', scope: 'Scope 1', value: 2.31, unit: 'kgCO₂e/litre', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±3%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-008', name: 'Marine Fuel Oil (HFO)', category: 'Mobile Combustion', subcategory: 'Transport', scope: 'Scope 1', value: 3.114, unit: 'kgCO₂e/litre', source: 'IMO 2023', sourceYear: 2023, region: 'Global', uncertainty: '±5%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-009', name: 'Ethylene Cracking (Naphtha)', category: 'Process Emissions', subcategory: 'Chemical', scope: 'Scope 1', value: 1.58, unit: 'tCO₂e/t product', source: 'ecoinvent 3.10', sourceYear: 2024, region: 'Asia', uncertainty: '±10%', lastUpdated: '2026-01-15', status: 'active' },
  { id: 'ef-010', name: 'Aromatics Production (BTX)', category: 'Process Emissions', subcategory: 'Chemical', scope: 'Scope 1', value: 1.21, unit: 'tCO₂e/t product', source: 'ecoinvent 3.10', sourceYear: 2024, region: 'Asia', uncertainty: '±10%', lastUpdated: '2026-01-15', status: 'active' },
  { id: 'ef-011', name: 'Methane (Fugitive — Petrochemical)', category: 'Fugitive Emissions', subcategory: 'Leakage', scope: 'Scope 1', value: 0.012, unit: 'tCO₂e/t throughput', source: 'API 2009', sourceYear: 2009, region: 'Global', uncertainty: '±50%', lastUpdated: '2025-12-01', status: 'active', notes: 'High uncertainty — site-specific LDAR recommended' },
  { id: 'ef-012', name: 'Thailand Grid Average', category: 'Purchased Electricity', subcategory: 'Grid', scope: 'Scope 2', value: 0.4999, unit: 'tCO₂e/MWh', source: 'TGO 2024', sourceYear: 2024, region: 'Thailand', uncertainty: '±3%', lastUpdated: '2025-09-01', status: 'active' },
  { id: 'ef-013', name: 'Thailand Grid (Location-based)', category: 'Purchased Electricity', subcategory: 'Grid', scope: 'Scope 2', value: 0.4999, unit: 'tCO₂e/MWh', source: 'TGO 2024', sourceYear: 2024, region: 'Thailand', uncertainty: '±3%', lastUpdated: '2025-09-01', status: 'active' },
  { id: 'ef-014', name: 'I-REC (Thailand Solar)', category: 'Purchased Electricity', subcategory: 'Renewable', scope: 'Scope 2', value: 0.0, unit: 'tCO₂e/MWh', source: 'I-REC Standard', sourceYear: 2025, region: 'Thailand', uncertainty: 'N/A', lastUpdated: '2025-09-01', status: 'active' },
  { id: 'ef-015', name: 'Steam (Industrial)', category: 'Purchased Heat', subcategory: 'Heat', scope: 'Scope 2', value: 0.072, unit: 'tCO₂e/GJ', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±8%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-016', name: 'Purchased Chemicals (Avg)', category: 'Purchased Goods', subcategory: 'Category 1', scope: 'Scope 3', value: 2.35, unit: 'tCO₂e/t', source: 'ecoinvent 3.10', sourceYear: 2024, region: 'Global', uncertainty: '±20%', lastUpdated: '2026-01-15', status: 'active' },
  { id: 'ef-017', name: 'Capital Goods (Machinery)', category: 'Capital Goods', subcategory: 'Category 2', scope: 'Scope 3', value: 1850, unit: 'kgCO₂e/unit', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±30%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-018', name: 'Road Freight (Diesel HGV)', category: 'Transportation', subcategory: 'Category 4', scope: 'Scope 3', value: 0.107, unit: 'kgCO₂e/t·km', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±10%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-019', name: 'Sea Freight (Container)', category: 'Transportation', subcategory: 'Category 4', scope: 'Scope 3', value: 0.016, unit: 'kgCO₂e/t·km', source: 'GLEC 2023', sourceYear: 2023, region: 'Global', uncertainty: '±15%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-020', name: 'Air Freight (Long-haul)', category: 'Transportation', subcategory: 'Category 4', scope: 'Scope 3', value: 0.602, unit: 'kgCO₂e/t·km', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±10%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-021', name: 'Business Travel (Short-haul)', category: 'Business Travel', subcategory: 'Category 6', scope: 'Scope 3', value: 0.156, unit: 'kgCO₂e/p·km', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±5%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-022', name: 'Business Travel (Long-haul)', category: 'Business Travel', subcategory: 'Category 6', scope: 'Scope 3', value: 0.195, unit: 'kgCO₂e/p·km', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±5%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-023', name: 'Employee Commuting (Car)', category: 'Employee Commuting', subcategory: 'Category 7', scope: 'Scope 3', value: 0.171, unit: 'kgCO₂e/p·km', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±10%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-024', name: 'Waste to Landfill (Mixed)', category: 'Waste', subcategory: 'Category 5', scope: 'Scope 3', value: 467, unit: 'kgCO₂e/t', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±30%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-025', name: 'Waste Incineration', category: 'Waste', subcategory: 'Category 5', scope: 'Scope 3', value: 21.3, unit: 'kgCO₂e/t', source: 'DEFRA 2025', sourceYear: 2025, region: 'UK', uncertainty: '±20%', lastUpdated: '2025-06-15', status: 'active' },
  { id: 'ef-026', name: 'Thailand Grid (2019 Factor)', category: 'Purchased Electricity', subcategory: 'Grid', scope: 'Scope 2', value: 0.5986, unit: 'tCO₂e/MWh', source: 'TGO 2019', sourceYear: 2019, region: 'Thailand', uncertainty: '±3%', lastUpdated: '2020-01-01', status: 'deprecated', notes: 'Superseded by TGO 2024 factor' },
  { id: 'ef-027', name: 'IPCC 1996 Natural Gas', category: 'Stationary Combustion', subcategory: 'Fuel', scope: 'Scope 1', value: 56.1, unit: 'kgCO₂e/GJ', source: 'IPCC 1996 GL', sourceYear: 1996, region: 'Global', uncertainty: '±10%', lastUpdated: '2006-01-01', status: 'deprecated', notes: 'Superseded by IPCC 2006 GL' },
]

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */
const SOURCES = [...new Set(EMISSION_FACTORS.map(f => f.source))].sort()
const CATEGORIES = [...new Set(EMISSION_FACTORS.map(f => f.category))].sort()
const REGIONS = [...new Set(EMISSION_FACTORS.map(f => f.region))].sort()

const SCOPE_COLORS: Record<string, string> = {
  'Scope 1': '#0F7B6F',
  'Scope 2': '#2563EB',
  'Scope 3': '#7C3AED',
}

const CATEGORY_ICONS: Record<string, typeof Flame> = {
  'Stationary Combustion': Flame,
  'Mobile Combustion': Truck,
  'Process Emissions': Factory,
  'Fugitive Emissions': Wind,
  'Purchased Electricity': Zap,
  'Purchased Heat': Droplets,
  'Purchased Goods': Leaf,
  'Capital Goods': Factory,
  'Transportation': Truck,
  'Business Travel': Truck,
  'Employee Commuting': Truck,
  'Waste': Droplets,
}

const STATUS_BADGE: Record<string, 'green' | 'amber' | 'gray'> = {
  active: 'green',
  deprecated: 'gray',
  draft: 'amber',
}

const TABS_CONFIG = [
  { id: 'all', label: 'All Factors', count: EMISSION_FACTORS.length },
  { id: 'scope1', label: 'Scope 1', count: EMISSION_FACTORS.filter(f => f.scope === 'Scope 1').length },
  { id: 'scope2', label: 'Scope 2', count: EMISSION_FACTORS.filter(f => f.scope === 'Scope 2').length },
  { id: 'scope3', label: 'Scope 3', count: EMISSION_FACTORS.filter(f => f.scope === 'Scope 3').length },
]

/* ═══════════════════════════════════════════
   Stagger index → CSS class (max 10)
   ═══════════════════════════════════════════ */
function stagger(i: number) {
  const s = Math.min(i + 1, 10)
  return `stagger-${s}`
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function EFLibrary() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [showDeprecated, setShowDeprecated] = useState(false)
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)

  const filtered = useMemo(() => {
    return EMISSION_FACTORS.filter(f => {
      if (tab === 'scope1' && f.scope !== 'Scope 1') return false
      if (tab === 'scope2' && f.scope !== 'Scope 2') return false
      if (tab === 'scope3' && f.scope !== 'Scope 3') return false
      if (!showDeprecated && f.status === 'deprecated') return false
      if (sourceFilter !== 'all' && f.source !== sourceFilter) return false
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false
      if (regionFilter !== 'all' && f.region !== regionFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.source.toLowerCase().includes(q) || f.unit.toLowerCase().includes(q)
      }
      return true
    })
  }, [tab, search, sourceFilter, categoryFilter, regionFilter, showDeprecated])

  const activeCount = EMISSION_FACTORS.filter(f => f.status === 'active').length
  const deprecatedCount = EMISSION_FACTORS.filter(f => f.status === 'deprecated').length

  const handleCopy = (id: string, value: number, unit: string) => {
    navigator.clipboard.writeText(`${value} ${unit}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero Header ── */}
      <div className="animate-slide-up relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-6">
        {/* Decorative gradient mesh */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          background: 'radial-gradient(ellipse at 20% 50%, #0F7B6F 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, #7C3AED 0%, transparent 50%)',
        }} />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-float" style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-teal) 15%, transparent), color-mix(in srgb, var(--accent-blue) 10%, transparent))',
              border: '1.5px solid color-mix(in srgb, var(--accent-teal) 25%, transparent)',
            }}>
              <Database className="w-7 h-7 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">Emission Factor Library</h1>
              <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">
                Centralised repository of emission factors from IPCC, DEFRA, TGO, ecoinvent, and custom sources.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Export</Button>
            <Button variant="secondary" size="sm" icon={<Upload className="w-3.5 h-3.5" />}>Import</Button>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddModal(true)}>Add Factor</Button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip — animated entrance ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Factors', value: EMISSION_FACTORS.length, icon: BookOpen, accent: '#0F7B6F', gradient: 'from-teal-50 to-emerald-50' },
          { label: 'Active', value: activeCount, icon: Shield, accent: '#16A34A', gradient: 'from-green-50 to-emerald-50' },
          { label: 'Deprecated', value: deprecatedCount, icon: Info, accent: '#D97706', gradient: 'from-amber-50 to-yellow-50' },
          { label: 'Data Sources', value: SOURCES.length, icon: ExternalLink, accent: '#2563EB', gradient: 'from-blue-50 to-indigo-50' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className={`animate-slide-up ${stagger(idx)} group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[2px] hover:border-[var(--border-strong)] cursor-default`}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${kpi.accent}, transparent)` }} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">{kpi.label}</p>
                  <p className="text-[var(--text-2xl)] font-bold text-[var(--text-primary)] mt-1 tabular-nums animate-count" style={{ animationDelay: `${200 + idx * 100}ms` }}>{kpi.value}</p>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg" style={{
                  backgroundColor: `color-mix(in srgb, ${kpi.accent} 10%, transparent)`,
                  boxShadow: `0 0 0 0 ${kpi.accent}00`,
                }}>
                  <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" style={{ color: kpi.accent }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="animate-slide-up stagger-5">
        <Tabs tabs={TABS_CONFIG} activeTab={tab} onChange={setTab} />
      </div>

      {/* ── Search & Filter Bar — glass effect ── */}
      <div className={`animate-slide-up stagger-6 rounded-xl border bg-[var(--bg-primary)] p-4 transition-all duration-500 ease-[var(--ease-out-expo)] ${
        searchFocused ? 'border-[var(--accent-teal)] shadow-[0_0_0_3px_rgba(15,123,111,0.08)]' : 'border-[var(--border-default)]'
      }`}>
        <div className="space-y-3">
          {/* Search row */}
          <div className="relative">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${searchFocused ? 'text-[var(--accent-teal)]' : 'text-[var(--text-tertiary)]'}`} />
            <input
              type="text"
              placeholder="Search factors by name, category, source, or unit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full h-10 pl-11 pr-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-teal)] focus:bg-[var(--bg-primary)] transition-all duration-300"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--border-default)] transition-colors cursor-pointer animate-scale-in"
              >
                <X className="w-3 h-3 text-[var(--text-tertiary)]" />
              </button>
            )}
          </div>
          {/* Filter row */}
          <div className="flex items-center gap-3">
            <FilterSelect label="Source" value={sourceFilter} onChange={setSourceFilter} options={SOURCES} />
            <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={CATEGORIES} />
            <FilterSelect label="Region" value={regionFilter} onChange={setRegionFilter} options={REGIONS} />
            <label className="flex items-center gap-2 text-[var(--text-xs)] text-[var(--text-tertiary)] cursor-pointer whitespace-nowrap ml-auto select-none group/check">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${showDeprecated ? 'bg-[var(--accent-teal)] border-[var(--accent-teal)]' : 'border-[var(--border-strong)] group-hover/check:border-[var(--accent-teal)]'}`}>
                {showDeprecated && <Check className="w-2.5 h-2.5 text-white animate-check" />}
              </div>
              <input type="checkbox" checked={showDeprecated} onChange={e => setShowDeprecated(e.target.checked)} className="sr-only" />
              Show deprecated
            </label>
            <div className="h-5 w-px bg-[var(--border-default)]" />
            <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] tabular-nums">
              <span className="font-bold text-[var(--text-primary)]">{filtered.length}</span> results
            </span>
          </div>
        </div>
      </div>

      {/* ── Factor List ── */}
      {filtered.length === 0 ? (
        <div className="animate-scale-in rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)] py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4 animate-float">
            <Search className="w-7 h-7 text-[var(--text-tertiary)]" />
          </div>
          <p className="text-[var(--text-base)] font-semibold text-[var(--text-secondary)]">No emission factors found</p>
          <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1.5 max-w-sm mx-auto">Try adjusting your search or filter criteria to find what you're looking for.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ef, idx) => (
            <FactorRow
              key={ef.id}
              ef={ef}
              index={idx}
              isExpanded={expandedFactor === ef.id}
              onToggle={() => setExpandedFactor(expandedFactor === ef.id ? null : ef.id)}
              copiedId={copiedId}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}

      {/* ── Source Reference Cards ── */}
      <div className="grid grid-cols-3 gap-4 animate-slide-up stagger-8">
        {[
          { name: 'IPCC 2006 Guidelines', desc: 'Default factors for stationary & mobile combustion. Tier 1 methodology.', icon: BookOpen, color: '#0F7B6F' },
          { name: 'DEFRA 2025', desc: 'UK Government conversion factors for GHG reporting. Updated annually.', icon: Shield, color: '#2563EB' },
          { name: 'ecoinvent 3.10', desc: 'Life cycle inventory database. Process-specific factors for chemicals & materials.', icon: Sparkles, color: '#7C3AED' },
        ].map(ref => {
          const Icon = ref.icon
          return (
            <div key={ref.name} className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px] hover:border-[var(--border-strong)] cursor-default relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${ref.color}, transparent)` }} />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `color-mix(in srgb, ${ref.color} 10%, transparent)` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: ref.color }} />
                </div>
                <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{ref.name}</h3>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
              </div>
              <p className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed">{ref.desc}</p>
            </div>
          )
        })}
      </div>

      {/* ── Add Factor Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)}>
          <div className="animate-modal bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] shadow-xl w-full max-w-lg mx-4 relative overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, var(--accent-teal), var(--accent-blue), var(--accent-purple))' }} />
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-teal) 10%, transparent)' }}>
                  <Plus className="w-4.5 h-4.5 text-[var(--accent-teal)]" />
                </div>
                <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Add Emission Factor</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-all duration-200 cursor-pointer hover:rotate-90">
                <X className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Input label="Factor Name" placeholder="e.g. Natural Gas (Industrial)" />
              <div className="grid grid-cols-2 gap-4">
                <ModalSelect label="Category" options={CATEGORIES} />
                <ModalSelect label="Scope" options={['Scope 1', 'Scope 2', 'Scope 3']} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Value" type="number" placeholder="0.00" />
                <Input label="Unit" placeholder="e.g. kgCO₂e/GJ" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Source" placeholder="e.g. IPCC 2006 GL" />
                <Input label="Region" placeholder="e.g. Global" />
              </div>
              <Input label="Uncertainty" placeholder="e.g. ±5%" />
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-[var(--border-subtle)]">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={() => setShowAddModal(false)}>Add Factor</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Factor Row — animated card
   ═══════════════════════════════════════════ */
function FactorRow({
  ef, index, isExpanded, onToggle, copiedId, onCopy,
}: {
  ef: EmissionFactor; index: number; isExpanded: boolean
  onToggle: () => void; copiedId: string | null
  onCopy: (id: string, value: number, unit: string) => void
}) {
  const CatIcon = CATEGORY_ICONS[ef.category] || BookOpen
  const scopeColor = SCOPE_COLORS[ef.scope]
  const delay = Math.min(index * 30, 300)

  return (
    <div
      className={`animate-slide-up group/row rounded-xl border overflow-hidden transition-all duration-300 ease-[var(--ease-out-expo)] ${
        isExpanded
          ? 'border-[var(--border-strong)] shadow-[var(--shadow-card-hover)]'
          : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card)]'
      } ${ef.status === 'deprecated' ? 'opacity-60' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Scope accent — left bar */}
      <div className="flex">
        <div className="w-[3px] flex-shrink-0 transition-all duration-300" style={{
          backgroundColor: isExpanded ? scopeColor : `color-mix(in srgb, ${scopeColor} 30%, transparent)`,
        }} />

        <div className="flex-1">
          {/* Main row */}
          <button
            onClick={onToggle}
            className="w-full text-left px-5 py-3.5 flex items-center gap-4 cursor-pointer transition-colors duration-200 hover:bg-[var(--bg-hover)] bg-[var(--bg-primary)]"
          >
            {/* Icon with hover glow */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover/row:shadow-md" style={{
              backgroundColor: `color-mix(in srgb, ${scopeColor} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${scopeColor} 15%, transparent)`,
            }}>
              <CatIcon className="w-4.5 h-4.5 transition-transform duration-300 group-hover/row:scale-110" style={{ color: scopeColor }} />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate group-hover/row:text-[var(--accent-teal)] transition-colors duration-200">{ef.name}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1.5">
                <span>{ef.category}</span>
                <span className="w-1 h-1 rounded-full bg-[var(--border-default)]" />
                <span>{ef.subcategory}</span>
              </p>
            </div>

            {/* Scope pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0 transition-all duration-200" style={{
              backgroundColor: `color-mix(in srgb, ${scopeColor} 8%, transparent)`,
            }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: scopeColor }} />
              <span className="text-[11px] font-semibold" style={{ color: scopeColor }}>{ef.scope}</span>
            </div>

            {/* Value block */}
            <div className="text-right w-32 flex-shrink-0">
              <p className="text-[var(--text-base)] font-bold text-[var(--text-primary)] font-mono tabular-nums">{ef.value}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">{ef.unit}</p>
            </div>

            {/* Source */}
            <div className="w-28 flex-shrink-0 text-right hidden xl:block">
              <p className="text-[var(--text-xs)] text-[var(--text-secondary)] font-medium">{ef.source}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{ef.region}</p>
            </div>

            {/* Status */}
            <div className="w-20 flex-shrink-0 flex justify-center">
              <Badge variant={STATUS_BADGE[ef.status]} dot>{ef.status}</Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
              <button
                onClick={e => { e.stopPropagation(); onCopy(ef.id, ef.value, ef.unit) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-all duration-200 text-[var(--text-tertiary)] hover:text-[var(--accent-teal)] cursor-pointer"
                title="Copy value"
              >
                {copiedId === ef.id ? <Check className="w-4 h-4 text-[var(--accent-teal)] animate-check" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={e => e.stopPropagation()}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-all duration-200 text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] cursor-pointer"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {/* Chevron */}
            <div className={`w-6 flex items-center justify-center text-[var(--text-tertiary)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>

          {/* Expanded Detail — animated */}
          {isExpanded && (
            <div className="animate-expand border-t border-[var(--border-subtle)]">
              <div className="px-5 py-5 bg-[var(--bg-secondary)]">
                {/* Detail grid */}
                <div className="grid grid-cols-5 gap-6">
                  <DetailCell label="Value" value={`${ef.value} ${ef.unit}`} highlight accent={scopeColor} />
                  <DetailCell label="Source" value={`${ef.source} (${ef.sourceYear})`} />
                  <DetailCell label="Region" value={ef.region} />
                  <DetailCell label="Uncertainty" value={ef.uncertainty} />
                  <DetailCell label="Last Updated" value={ef.lastUpdated} />
                </div>

                {/* Notes callout */}
                {ef.notes && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl p-3.5 border animate-fade-in" style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent-amber) 5%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-amber) 15%, transparent)',
                  }}>
                    <Info className="w-4 h-4 text-[var(--accent-amber)] mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed">{ef.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */
function DetailCell({ label, value, highlight, accent }: { label: string; value: string; highlight?: boolean; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={`text-[var(--text-xs)] ${highlight ? 'font-bold font-mono tabular-nums' : 'font-medium'}`} style={highlight && accent ? { color: accent } : { color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 text-[var(--text-xs)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-teal)] focus:ring-2 focus:ring-[var(--accent-teal)]/10 cursor-pointer transition-all duration-200 hover:border-[var(--border-strong)]"
    >
      <option value="all">All {label}s</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function ModalSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <label className="block text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      <select className="w-full h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-[var(--text-xs)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/30 cursor-pointer transition-all duration-200">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
