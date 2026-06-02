import { useState, useMemo, useEffect } from 'react'
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
  Shield,
  ArrowUpRight,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Badge, Tabs, Button, Input } from '../design-system'
import JargonTooltip from '../components/JargonTooltip'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import { Stagger, StaggerItem } from '../components/MotionPrimitives'
import { ai, type AiEfMatchResponse } from '../lib/api'
import { orgStore } from '../lib/orgStore'

/* ═══════════════════════════════════════════
   Types — DB-backed shape from /api/emission-factors
   ═══════════════════════════════════════════ */
interface EmissionFactorRow {
  id: string
  scope: 1 | 2 | 3
  category: string
  subcategory: string | null
  fuel_or_activity: string
  region: string
  unit: string
  co2e_per_unit: number | string
  co2_per_unit: number | string | null
  ch4_per_unit: number | string | null
  n2o_per_unit: number | string | null
  source: string
  source_version: string | null
  valid_from: string
  valid_to: string | null
  notes: string | null
  created_at: string
}

interface ViewFactor {
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
  lastUpdated: string
  status: 'active' | 'deprecated'
  notes?: string
}

function toView(row: EmissionFactorRow): ViewFactor {
  // Deprecated = valid_to in the past
  const valid_to = row.valid_to ? new Date(row.valid_to) : null
  const deprecated = valid_to ? valid_to.getTime() < Date.now() : false
  const scopeLabel = (`Scope ${row.scope}`) as ViewFactor['scope']
  return {
    id: row.id,
    name: row.fuel_or_activity,
    category: humanize(row.category),
    subcategory: row.subcategory ? humanize(row.subcategory) : '—',
    scope: scopeLabel,
    value: Number(row.co2e_per_unit),
    unit: row.unit,
    source: row.source + (row.source_version ? ` (${row.source_version})` : ''),
    sourceYear: row.valid_from ? new Date(row.valid_from).getFullYear() : new Date().getFullYear(),
    region: row.region,
    lastUpdated: row.valid_from?.slice(0, 10) ?? '',
    status: deprecated ? 'deprecated' : 'active',
    notes: row.notes ?? undefined,
  }
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const SCOPE_COLORS: Record<string, string> = {
  'Scope 1': '#0F7B6F',
  'Scope 2': '#2563EB',
  'Scope 3': '#7C3AED',
}

const CATEGORY_ICONS: Record<string, typeof Flame> = {
  'Stationary Combustion': Flame,
  'Mobile Combustion': Truck,
  'Process Emissions': Factory,
  'Fugitive': Wind,
  'Purchased Electricity': Zap,
  'Purchased Heat': Droplets,
  'Cat4 Upstream Transport': Truck,
  'Cat6 Business Travel': Truck,
  'Cat7 Employee Commute': Truck,
  'Cat10 Eol Treatment': Droplets,
  'Purchased Goods': Leaf,
}

const STATUS_BADGE: Record<string, 'green' | 'amber' | 'gray'> = {
  active: 'green',
  deprecated: 'gray',
}

function stagger(i: number) {
  const s = Math.min(i + 1, 10)
  return `stagger-${s}`
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function EFLibrary() {
  const [rows, setRows] = useState<ViewFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setLoadError(null)
      try {
        const r = await fetch('/api/emission-factors', {
          headers: { Authorization: `Bearer ${localStorage.getItem('aeiforo_token') ?? ''}` },
        })
        if (!r.ok) throw new Error(`Failed to load: ${r.status}`)
        const data: EmissionFactorRow[] = await r.json()
        if (!cancelled) setRows(data.map(toView))
      } catch (err: unknown) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [reloadNonce])

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete emission factor "${name}"? Historical activity data referencing it is preserved; the factor will no longer appear in the library.`)) return
    setDeletingId(id)
    try {
      await orgStore.deleteEmissionFactor(id)
      showToast('ok', 'Emission factor removed')
      setReloadNonce(n => n + 1)
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Could not delete')
    } finally {
      setDeletingId(null)
    }
  }

  const SOURCES = useMemo(() => [...new Set(rows.map(f => f.source))].sort(), [rows])
  const CATEGORIES = useMemo(() => [...new Set(rows.map(f => f.category))].sort(), [rows])
  const REGIONS = useMemo(() => [...new Set(rows.map(f => f.region))].sort(), [rows])

  const TABS_CONFIG = useMemo(() => [
    { id: 'all', label: 'All Factors', count: rows.length },
    { id: 'scope1', label: 'Scope 1', count: rows.filter(f => f.scope === 'Scope 1').length },
    { id: 'scope2', label: 'Scope 2', count: rows.filter(f => f.scope === 'Scope 2').length },
    { id: 'scope3', label: 'Scope 3', count: rows.filter(f => f.scope === 'Scope 3').length },
  ], [rows])

  const filtered = useMemo(() => {
    return rows.filter(f => {
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
  }, [rows, tab, search, sourceFilter, categoryFilter, regionFilter, showDeprecated])

  const activeCount = rows.filter(f => f.status === 'active').length
  const deprecatedCount = rows.filter(f => f.status === 'deprecated').length

  const handleCopy = (id: string, value: number, unit: string) => {
    navigator.clipboard.writeText(`${value} ${unit}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="page-container space-y-6 animate-fade-in">
      {toast && (
        <div
          role="status"
          className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-[10px] border text-[13px] font-medium shadow-lg animate-fade-in"
          style={{
            background: toast.kind === 'ok' ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
            color: toast.kind === 'ok' ? 'var(--status-ok)' : 'var(--status-reject)',
            borderColor: toast.kind === 'ok' ? 'rgba(46,125,50,0.3)' : 'rgba(220,38,38,0.3)',
          }}
        >
          {toast.msg}
        </div>
      )}
      <PageHeader
        breadcrumbs={[
          { label: 'Data', to: '/data' },
          { label: 'Emission factors' },
        ]}
        title="Emission factors"
        description={
          <>
            Live factors from DEFRA 2024, EPA 2024, <JargonTooltip term="IPCC AR5" iconOnly /> IPCC 2006 / AR5, IEA 2024 — versioned, region-tagged.
          </>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Export</Button>
            <Button variant="secondary" size="sm" icon={<Upload className="w-3.5 h-3.5" />}>Import</Button>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddModal(true)}>Add Factor</Button>
          </>
        }
      />

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Factors', value: rows.length, icon: BookOpen, accent: '#0F7B6F' },
          { label: 'Active', value: activeCount, icon: Shield, accent: '#16A34A' },
          { label: 'Deprecated', value: deprecatedCount, icon: Info, accent: '#D97706' },
          { label: 'Data Sources', value: SOURCES.length, icon: ExternalLink, accent: '#2563EB' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className={`animate-slide-up ${stagger(idx)} group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[2px] hover:border-[var(--border-strong)] cursor-default`}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${kpi.accent}, transparent)` }} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">{kpi.label}</p>
                  <p className="text-[var(--text-2xl)] font-bold text-[var(--text-primary)] mt-1 tabular-nums">{kpi.value}</p>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg" style={{
                  backgroundColor: `color-mix(in srgb, ${kpi.accent} 10%, transparent)`,
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

      {/* ── Vendor → AI search ── */}
      <VendorAiSearch />


      {/* ── Search & Filter Bar ── */}
      <div className={`animate-slide-up stagger-6 rounded-xl border bg-[var(--bg-primary)] p-4 transition-all duration-500 ease-[var(--ease-out-expo)] ${
        searchFocused ? 'border-[var(--accent-teal)] shadow-[0_0_0_3px_rgba(15,123,111,0.08)]' : 'border-[var(--border-default)]'
      }`}>
        <div className="space-y-3">
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

      {/* ── Loading / error / empty / list ── */}
      {loading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-[var(--text-sm)] text-red-300">
          Couldn't load emission factors: {loadError}. Try running <code>/api/setup</code> first to seed the table.
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-scale-in rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)] py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4 animate-float">
            <Search className="w-7 h-7 text-[var(--text-tertiary)]" />
          </div>
          <p className="text-[var(--text-base)] font-semibold text-[var(--text-secondary)]">No emission factors found</p>
          <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1.5 max-w-sm mx-auto">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <Stagger>
          <div className="space-y-2">
            {filtered.map((ef, idx) => (
              <StaggerItem key={ef.id}>
                <FactorRow
                  ef={ef}
                  index={idx}
                  isExpanded={expandedFactor === ef.id}
                  onToggle={() => setExpandedFactor(expandedFactor === ef.id ? null : ef.id)}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
                  deleting={deletingId === ef.id}
                />
              </StaggerItem>
            ))}
          </div>
        </Stagger>
      )}

      {/* ── Source Reference Cards ── */}
      <div className="grid grid-cols-3 gap-4 animate-slide-up stagger-8">
        {[
          { name: 'IPCC 2006 Guidelines', desc: 'Default factors for stationary & mobile combustion. Tier 1 methodology.', icon: BookOpen, color: '#0F7B6F' },
          { name: 'DEFRA 2024', desc: 'UK Government conversion factors for GHG reporting. Updated annually.', icon: Shield, color: '#2563EB' },
          { name: 'IEA 2024', desc: 'International Energy Agency country grid emission factors.', icon: Sparkles, color: '#7C3AED' },
        ].map(ref => {
          const Icon = ref.icon
          return (
            <div key={ref.name} className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px] hover:border-[var(--border-strong)] cursor-default relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${ref.color}, transparent)` }} />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `color-mix(in srgb, ${ref.color} 10%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: ref.color }} />
                </div>
                <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{ref.name}</h3>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
              </div>
              <p className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed">{ref.desc}</p>
            </div>
          )
        })}
      </div>

      {/* ── Add Factor Modal — POSTs to /api/emission-factors ── */}
      {showAddModal && (
        <AddFactorModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false)
            showToast('ok', 'Emission factor added')
            setReloadNonce(n => n + 1)
          }}
          onError={(msg) => showToast('err', msg)}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Add Factor Modal — controlled form, POSTs to /api/emission-factors
   ═══════════════════════════════════════════ */
function AddFactorModal({
  onClose, onCreated, onError,
}: {
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    fuel_or_activity: '',
    category: '',
    scope: 1 as 1 | 2 | 3,
    co2e_per_unit: '',
    unit: '',
    source: 'DEFRA',
    source_version: '2024',
    region: 'GLOBAL',
    valid_from: today,
  })
  const [saving, setSaving] = useState(false)

  const valid =
    form.fuel_or_activity.trim().length > 0 &&
    form.category.trim().length > 0 &&
    form.unit.trim().length > 0 &&
    form.source.trim().length > 0 &&
    Number(form.co2e_per_unit) > 0 &&
    !!form.valid_from

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      await orgStore.createEmissionFactor({
        scope: form.scope,
        category: form.category.trim().toLowerCase().replace(/\s+/g, '_'),
        fuel_or_activity: form.fuel_or_activity.trim(),
        unit: form.unit.trim(),
        co2e_per_unit: Number(form.co2e_per_unit),
        source: form.source.trim(),
        source_version: form.source_version.trim() || null,
        region: form.region.trim() || 'GLOBAL',
        valid_from: form.valid_from,
      })
      onCreated()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="animate-modal bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] shadow-xl w-full max-w-lg mx-4 relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, var(--accent-teal), var(--accent-blue), var(--accent-purple))' }} />
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-teal) 10%, transparent)' }}>
              <Plus className="w-4 h-4 text-[var(--accent-teal)]" />
            </div>
            <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Add Emission Factor</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-all duration-200 cursor-pointer hover:rotate-90">
            <X className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Input
            label="Factor Name"
            placeholder="e.g. Natural gas (industrial)"
            value={form.fuel_or_activity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, fuel_or_activity: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category"
              placeholder="e.g. stationary_combustion"
              value={form.category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, category: e.target.value })}
            />
            <div>
              <label className="block text-[var(--text-sm)] font-medium text-[var(--text-primary)] mb-1.5">Scope</label>
              <select
                value={form.scope}
                onChange={e => setForm({ ...form, scope: Number(e.target.value) as 1 | 2 | 3 })}
                className="w-full h-10 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-[var(--text-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] cursor-pointer"
              >
                <option value={1}>Scope 1</option>
                <option value={2}>Scope 2</option>
                <option value={3}>Scope 3</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Value (kg CO2e / unit)"
              type="number"
              placeholder="0.00"
              value={form.co2e_per_unit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, co2e_per_unit: e.target.value })}
            />
            <Input
              label="Unit"
              placeholder="e.g. kgCO2e/kWh"
              value={form.unit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Source"
              placeholder="DEFRA"
              value={form.source}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, source: e.target.value })}
            />
            <Input
              label="Version"
              placeholder="2024"
              value={form.source_version}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, source_version: e.target.value })}
            />
            <Input
              label="Region"
              placeholder="GLOBAL"
              value={form.region}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, region: e.target.value })}
            />
          </div>
          <Input
            label="Valid from"
            type="date"
            value={form.valid_from}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, valid_from: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving ? 'Saving…' : 'Add Factor'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Factor Row
   ═══════════════════════════════════════════ */
function FactorRow({
  ef, index, isExpanded, onToggle, copiedId, onCopy, onDelete, deleting,
}: {
  ef: ViewFactor; index: number; isExpanded: boolean
  onToggle: () => void; copiedId: string | null
  onCopy: (id: string, value: number, unit: string) => void
  onDelete: (id: string, name: string) => void
  deleting: boolean
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
      <div className="flex">
        <div className="w-[3px] flex-shrink-0 transition-all duration-300" style={{
          backgroundColor: isExpanded ? scopeColor : `color-mix(in srgb, ${scopeColor} 30%, transparent)`,
        }} />

        <div className="flex-1">
          <button
            onClick={onToggle}
            className="w-full text-left px-5 py-3.5 flex items-center gap-4 cursor-pointer transition-colors duration-200 hover:bg-[var(--bg-hover)] bg-[var(--bg-primary)]"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover/row:shadow-md" style={{
              backgroundColor: `color-mix(in srgb, ${scopeColor} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${scopeColor} 15%, transparent)`,
            }}>
              <CatIcon className="w-4 h-4 transition-transform duration-300 group-hover/row:scale-110" style={{ color: scopeColor }} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate group-hover/row:text-[var(--accent-teal)] transition-colors duration-200">{ef.name}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1.5">
                <span>{ef.category}</span>
                <span className="w-1 h-1 rounded-full bg-[var(--border-default)]" />
                <span>{ef.subcategory}</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0 transition-all duration-200" style={{
              backgroundColor: `color-mix(in srgb, ${scopeColor} 8%, transparent)`,
            }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: scopeColor }} />
              <span className="text-[11px] font-semibold" style={{ color: scopeColor }}>{ef.scope}</span>
            </div>

            <div className="text-right w-32 flex-shrink-0">
              <p className="text-[var(--text-base)] font-bold text-[var(--text-primary)] font-mono tabular-nums">{ef.value}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">{ef.unit}</p>
            </div>

            <div className="w-28 flex-shrink-0 text-right hidden xl:block">
              <p className="text-[var(--text-xs)] text-[var(--text-secondary)] font-medium">{ef.source}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{ef.region}</p>
            </div>

            <div className="w-20 flex-shrink-0 flex justify-center">
              <Badge variant={STATUS_BADGE[ef.status]} dot>{ef.status}</Badge>
            </div>

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
              <button
                onClick={e => { e.stopPropagation(); onDelete(ef.id, ef.name) }}
                disabled={deleting}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-all duration-200 text-[var(--text-tertiary)] hover:text-red-500 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                title="Delete (soft — historical data preserved)"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>

            <div className={`w-6 flex items-center justify-center text-[var(--text-tertiary)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>

          {isExpanded && (
            <div className="animate-expand border-t border-[var(--border-subtle)]">
              <div className="px-5 py-5 bg-[var(--bg-secondary)]">
                <div className="grid grid-cols-5 gap-6">
                  <DetailCell label="Value" value={`${ef.value} ${ef.unit}`} highlight accent={scopeColor} />
                  <DetailCell label="Source" value={`${ef.source}`} />
                  <DetailCell label="Region" value={ef.region} />
                  <DetailCell label="Valid From" value={ef.lastUpdated} />
                  <DetailCell label="Status" value={ef.status} />
                </div>

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

/* ═══════════════════════════════════════════
   Vendor → AI search panel
   Lets the user type any vendor name + region; backend calls Claude with the
   candidate set from emission_factors. Useful for browsing — the result
   surfaces a "best EF" with reasoning, and we render the alternates inline.
   ═══════════════════════════════════════════ */
function VendorAiSearch() {
  const [vendor, setVendor] = useState('')
  const [region, setRegion] = useState('GLOBAL')
  const [loading, setLoading] = useState(false)
  const [match, setMatch] = useState<AiEfMatchResponse['match'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unconfigured, setUnconfigured] = useState(false)

  const run = async () => {
    if (!vendor.trim()) return
    setLoading(true); setError(null); setMatch(null); setUnconfigured(false)
    try {
      const res = await ai.matchEf({
        vendorName: vendor.trim(),
        region: region as 'GLOBAL' | 'UK' | 'US' | 'EU',
        scope: 3,
      })
      setMatch(res.match)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/ANTHROPIC_API_KEY/i.test(msg) || /503/.test(msg)) setUnconfigured(true)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[var(--accent-purple)]" />
        <span className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)]">Find by vendor (AI)</span>
        <span className="text-[10px] text-[var(--text-tertiary)] ml-2">Type a supplier name — Claude picks the best factor.</span>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') run() }}
            placeholder="e.g. United Airlines, Office Depot, AWS"
            className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-sm)] focus:outline-none focus:border-[var(--accent-purple)]"
          />
        </div>
        <select
          value={region}
          onChange={e => setRegion(e.target.value)}
          className="h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-xs)]"
        >
          {['GLOBAL','UK','US','EU','IN','CN','JP','AU','CA','DE','FR'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button onClick={run} size="sm" disabled={loading || !vendor.trim() || unconfigured} icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}>
          {unconfigured ? 'AI unavailable' : 'Suggest EF'}
        </Button>
      </div>

      {unconfigured && (
        <div className="mt-3 text-[var(--text-xs)] text-[var(--text-tertiary)]">
          Sign in to AI to get suggestions. Set <code className="font-mono">ANTHROPIC_API_KEY</code> on the server to enable.
        </div>
      )}
      {error && !unconfigured && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[var(--text-xs)]">{error}</div>
      )}

      {match && (
        <div className="mt-4 space-y-2">
          <VendorMatchRow ef={match.ef} confidence={match.confidence} reasoning={match.reasoning} badge="Top match" />
          {match.alternates.map((a, i) => (
            <VendorMatchRow key={a.ef.id} ef={a.ef} confidence={a.confidence} reasoning={a.reasoning} badge={`Alt ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function VendorMatchRow({
  ef, confidence, reasoning, badge,
}: { ef: AiEfMatchResponse['match']['ef']; confidence: number; reasoning: string; badge: string }) {
  const pct = Math.round(confidence * 100)
  const tone = pct >= 80 ? 'bg-emerald-500/15 text-emerald-300' : pct >= 50 ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">{badge}</span>
          <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{ef.fuel_or_activity}</span>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${tone}`}>{pct}%</span>
      </div>
      <div className="mt-1 text-[10px] text-[var(--text-tertiary)] tabular-nums">
        {Number(ef.co2e_per_unit)} {ef.unit} · {ef.source}{ef.region ? ` · ${ef.region}` : ''}
        {ef.category ? ` · ${ef.category}` : ''}
      </div>
      <div className="mt-1.5 text-[11px] text-[var(--text-secondary)]">{reasoning}</div>
    </div>
  )
}
