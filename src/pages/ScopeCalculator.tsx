import { useState, useMemo, useCallback } from 'react'
import {
  Calculator,
  Shield,
  CheckCircle2,
  Clock,
  FileEdit,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Save,
  Download,
  Upload,
  Info,
  X,
  Flame,
  Zap,
  Truck,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  monthlyEmissions2026,
  scope1Sources,
  scope2Sources,
  scope3Categories,
  formatNumber,
  formatEmissions,
  MonthlyEmission,
} from '../data/pttgcData'
import BlockchainProof from '../components/BlockchainProof'

type ScopeTab = 'scope1' | 'scope2' | 'scope3'

const STATUS_CONFIG = {
  verified: { label: 'Verified', icon: CheckCircle2, cls: 'bg-teal-500/15 text-teal-400 border-teal-500/20' },
  submitted: { label: 'Submitted', icon: Clock, cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  draft: { label: 'Draft', icon: FileEdit, cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  pending: { label: 'Pending', icon: AlertCircle, cls: 'bg-dark-500/15 text-dark-300 border-dark-500/20' },
}

const TOOLTIP_STYLE = {
  background: '#1A1D25',
  border: '1px solid #2A2F3A',
  borderRadius: 12,
  color: '#E2E8F0',
  fontSize: 12,
}

const SCOPE_COLORS = {
  scope1: '#FF6B1A',
  scope2: '#3B82F6',
  scope3: '#A855F7',
}

const SCOPE_ICONS = {
  scope1: Flame,
  scope2: Zap,
  scope3: Truck,
}

const FACILITIES = [
  { id: 'all', name: 'All Facilities', factor: 1.0 },
  { id: 'mtp-olefins', name: 'Map Ta Phut Olefins', factor: 0.35 },
  { id: 'mtp-aromatics', name: 'Map Ta Phut Aromatics', factor: 0.22 },
  { id: 'rayong', name: 'Rayong Refinery', factor: 0.18 },
  { id: 'nonthaburi', name: 'Nonthaburi Office', factor: 0.03 },
  { id: 'tp-ethylene', name: 'Thai Polyethylene', factor: 0.12 },
  { id: 'phenol', name: 'Phenol Plant', factor: 0.10 },
]

// Emission factors for methodology panel
const EMISSION_FACTORS = {
  scope1: [
    { source: 'Natural Gas', factor: '56.1 kgCO₂e/GJ', method: 'IPCC 2006 GL' },
    { source: 'Fuel Oil', factor: '77.4 kgCO₂e/GJ', method: 'IPCC 2006 GL' },
    { source: 'Diesel', factor: '74.1 kgCO₂e/GJ', method: 'IPCC 2006 GL' },
    { source: 'Gasoline', factor: '69.3 kgCO₂e/GJ', method: 'IPCC 2006 GL' },
    { source: 'Ethylene Cracking', factor: '1.04 tCO₂e/t product', method: 'API Compendium' },
    { source: 'Fugitive CH₄', factor: 'GWP = 28 (AR5)', method: 'IPCC AR5' },
  ],
  scope2: [
    { source: 'Thailand Grid Electricity', factor: '0.4999 tCO₂e/MWh', method: 'TGO 2023 EF (Location)' },
    { source: 'Market-Based (RE)', factor: '0.0 tCO₂e/MWh', method: 'RE100 / I-REC' },
    { source: 'Purchased Steam', factor: '0.0822 tCO₂e/GJ', method: 'Supplier specific' },
    { source: 'District Cooling', factor: '0.67 kgCO₂e/kWh(th)', method: 'IEA EF (2023)' },
  ],
  scope3: [
    { source: 'Cat 1 — Purchased Goods', factor: 'Spend-based + hybrid', method: 'GHG Protocol Cat 1' },
    { source: 'Cat 4 — Transport', factor: 'Distance-based', method: 'GLEC Framework' },
    { source: 'Cat 11 — Use of Sold Products', factor: 'Product-specific LCA', method: 'ISO 14040 / ecoinvent' },
    { source: 'Cat 12 — End-of-Life', factor: 'Waste-type method', method: 'EPA WARM v16' },
  ],
}

export default function ScopeCalculator() {
  const [activeScope, setActiveScope] = useState<ScopeTab>('scope1')
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [proofOpen, setProofOpen] = useState(false)
  const [proofData, setProofData] = useState({ dataPoint: '', facility: '' })
  const [selectedFacility, setSelectedFacility] = useState('all')
  const [showMethodology, setShowMethodology] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [submittingMonths, setSubmittingMonths] = useState<Set<number>>(new Set())
  const [monthStatuses, setMonthStatuses] = useState<Record<number, MonthlyEmission['status']>>({})
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const facilityFactor = FACILITIES.find(f => f.id === selectedFacility)?.factor ?? 1.0

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }, [])

  // Get effective value (edited or original)
  const getVal = (month: number, key: string, original: number) => {
    const k = `${month}-${key}`
    return editValues[k] !== undefined ? editValues[k] : Math.round(original * facilityFactor)
  }

  const handleEdit = (month: number, key: string, value: number) => {
    setEditValues(prev => ({ ...prev, [`${month}-${key}`]: value }))
    setHasUnsavedChanges(true)
  }

  const openProof = (dataPoint: string) => {
    setProofData({
      dataPoint,
      facility: selectedFacility === 'all' ? 'GC Group (All)' : FACILITIES.find(f => f.id === selectedFacility)?.name || '',
    })
    setProofOpen(true)
  }

  const getMonthStatus = (m: MonthlyEmission): MonthlyEmission['status'] => {
    return monthStatuses[m.monthIndex] ?? m.status
  }

  // Apply facility factor to monthly data
  const adjustedMonthly = useMemo(() => {
    return monthlyEmissions2026.map(m => ({
      ...m,
      scope1: {
        process: getVal(m.monthIndex, 'process', m.scope1.process),
        combustion: getVal(m.monthIndex, 'combustion', m.scope1.combustion),
        mobile: getVal(m.monthIndex, 'mobile', m.scope1.mobile),
        fugitive: getVal(m.monthIndex, 'fugitive', m.scope1.fugitive),
        total: getVal(m.monthIndex, 'process', m.scope1.process) +
               getVal(m.monthIndex, 'combustion', m.scope1.combustion) +
               getVal(m.monthIndex, 'mobile', m.scope1.mobile) +
               getVal(m.monthIndex, 'fugitive', m.scope1.fugitive),
      },
      scope2: {
        electricity: getVal(m.monthIndex, 'electricity', m.scope2.electricity),
        steam: getVal(m.monthIndex, 'steam', m.scope2.steam),
        cooling: getVal(m.monthIndex, 'cooling', m.scope2.cooling),
        total: getVal(m.monthIndex, 'electricity', m.scope2.electricity) +
               getVal(m.monthIndex, 'steam', m.scope2.steam) +
               getVal(m.monthIndex, 'cooling', m.scope2.cooling),
        marketBased: Math.round(m.scope2.marketBased * facilityFactor),
      },
      scope3: {
        cat1: getVal(m.monthIndex, 'cat1', m.scope3.cat1),
        cat2: getVal(m.monthIndex, 'cat2', m.scope3.cat2),
        cat3: getVal(m.monthIndex, 'cat3', m.scope3.cat3),
        cat4: getVal(m.monthIndex, 'cat4', m.scope3.cat4),
        cat5: getVal(m.monthIndex, 'cat5', m.scope3.cat5),
        cat6: getVal(m.monthIndex, 'cat6', m.scope3.cat6),
        cat7: getVal(m.monthIndex, 'cat7', m.scope3.cat7),
        cat11: getVal(m.monthIndex, 'cat11', m.scope3.cat11),
        cat12: getVal(m.monthIndex, 'cat12', m.scope3.cat12),
        total: getVal(m.monthIndex, 'cat1', m.scope3.cat1) +
               getVal(m.monthIndex, 'cat2', m.scope3.cat2) +
               getVal(m.monthIndex, 'cat3', m.scope3.cat3) +
               getVal(m.monthIndex, 'cat4', m.scope3.cat4) +
               getVal(m.monthIndex, 'cat5', m.scope3.cat5) +
               getVal(m.monthIndex, 'cat6', m.scope3.cat6) +
               getVal(m.monthIndex, 'cat7', m.scope3.cat7) +
               getVal(m.monthIndex, 'cat11', m.scope3.cat11) +
               getVal(m.monthIndex, 'cat12', m.scope3.cat12),
      },
      total: 0, // recalculated below
      productionVolume: Math.round(m.productionVolume * facilityFactor),
      status: getMonthStatus(m),
    })).map(m => ({
      ...m,
      total: m.scope1.total + m.scope2.total + m.scope3.total,
    }))
  }, [facilityFactor, editValues, monthStatuses])

  // Cumulative data
  const cumulativeData = useMemo(() => {
    let cumScope1 = 0, cumScope2 = 0, cumScope3 = 0, cumTotal = 0
    return adjustedMonthly.map(m => {
      cumScope1 += m.scope1.total
      cumScope2 += m.scope2.total
      cumScope3 += m.scope3.total
      cumTotal += m.total
      return { month: m.month, scope1: cumScope1, scope2: cumScope2, scope3: cumScope3, total: cumTotal }
    })
  }, [adjustedMonthly])

  // Chart data
  const monthlyChartData = adjustedMonthly.map(m => ({
    month: m.month,
    scope1: m.scope1.total,
    scope2: m.scope2.total,
    scope3: m.scope3.total,
  }))

  // Annual totals
  const annualScope1 = adjustedMonthly.reduce((s, m) => s + m.scope1.total, 0)
  const annualScope2 = adjustedMonthly.reduce((s, m) => s + m.scope2.total, 0)
  const annualScope3 = adjustedMonthly.reduce((s, m) => s + m.scope3.total, 0)
  const annualTotal = annualScope1 + annualScope2 + annualScope3

  // Pie chart for active scope breakdown
  const pieData = useMemo(() => {
    if (activeScope === 'scope1') {
      return [
        { name: 'Process', value: adjustedMonthly.reduce((s, m) => s + m.scope1.process, 0), color: '#FF6B1A' },
        { name: 'Combustion', value: adjustedMonthly.reduce((s, m) => s + m.scope1.combustion, 0), color: '#F59E0B' },
        { name: 'Mobile', value: adjustedMonthly.reduce((s, m) => s + m.scope1.mobile, 0), color: '#EF4444' },
        { name: 'Fugitive', value: adjustedMonthly.reduce((s, m) => s + m.scope1.fugitive, 0), color: '#FB923C' },
      ]
    }
    if (activeScope === 'scope2') {
      return [
        { name: 'Electricity', value: adjustedMonthly.reduce((s, m) => s + m.scope2.electricity, 0), color: '#3B82F6' },
        { name: 'Steam', value: adjustedMonthly.reduce((s, m) => s + m.scope2.steam, 0), color: '#60A5FA' },
        { name: 'Cooling', value: adjustedMonthly.reduce((s, m) => s + m.scope2.cooling, 0), color: '#93C5FD' },
      ]
    }
    return [
      { name: 'Cat 1', value: adjustedMonthly.reduce((s, m) => s + m.scope3.cat1, 0), color: '#A855F7' },
      { name: 'Cat 4', value: adjustedMonthly.reduce((s, m) => s + m.scope3.cat4, 0), color: '#C084FC' },
      { name: 'Cat 11', value: adjustedMonthly.reduce((s, m) => s + m.scope3.cat11, 0), color: '#D8B4FE' },
      { name: 'Others', value: adjustedMonthly.reduce((s, m) => s + m.scope3.cat2 + m.scope3.cat3 + m.scope3.cat5 + m.scope3.cat6 + m.scope3.cat7 + m.scope3.cat12, 0), color: '#7C3AED' },
    ]
  }, [adjustedMonthly, activeScope])

  // Completeness stats
  const verifiedCount = adjustedMonthly.filter(m => getMonthStatus(monthlyEmissions2026[m.monthIndex]) === 'verified' || monthStatuses[m.monthIndex] === 'verified').length
  const submittedCount = adjustedMonthly.filter(m => (monthStatuses[m.monthIndex] ?? monthlyEmissions2026[m.monthIndex].status) === 'submitted').length
  const draftCount = adjustedMonthly.filter(m => (monthStatuses[m.monthIndex] ?? monthlyEmissions2026[m.monthIndex].status) === 'draft').length

  const handleSubmitMonth = (monthIndex: number) => {
    setSubmittingMonths(prev => new Set(prev).add(monthIndex))
    setTimeout(() => {
      setMonthStatuses(prev => ({ ...prev, [monthIndex]: 'submitted' }))
      setSubmittingMonths(prev => {
        const next = new Set(prev)
        next.delete(monthIndex)
        return next
      })
      showToast(`${monthlyEmissions2026[monthIndex].month} 2026 data submitted for review`)
    }, 1200)
  }

  const handleSubmitAll = () => {
    const drafts = adjustedMonthly.filter(m => (monthStatuses[m.monthIndex] ?? monthlyEmissions2026[m.monthIndex].status) === 'draft')
    if (drafts.length === 0) {
      showToast('All months already submitted or verified')
      return
    }
    drafts.forEach(m => {
      setSubmittingMonths(prev => new Set(prev).add(m.monthIndex))
    })
    setTimeout(() => {
      const updates: Record<number, MonthlyEmission['status']> = {}
      drafts.forEach(m => { updates[m.monthIndex] = 'submitted' })
      setMonthStatuses(prev => ({ ...prev, ...updates }))
      setSubmittingMonths(new Set())
      setHasUnsavedChanges(false)
      showToast(`${drafts.length} month(s) submitted for review`)
    }, 1500)
  }

  const handleSaveDraft = () => {
    setHasUnsavedChanges(false)
    showToast('Draft saved successfully')
  }

  const handleExport = (format: string) => {
    setShowExportMenu(false)
    showToast(`Exporting ${activeScope === 'scope1' ? 'Scope 1' : activeScope === 'scope2' ? 'Scope 2' : 'Scope 3'} data as ${format}...`)
    setTimeout(() => showToast(`${format.toUpperCase()} file downloaded`), 1500)
  }

  const scopeTabs = [
    { id: 'scope1' as const, label: 'Scope 1', sub: 'Direct Emissions', total: annualScope1, color: SCOPE_COLORS.scope1, icon: Flame },
    { id: 'scope2' as const, label: 'Scope 2', sub: 'Energy Indirect', total: annualScope2, color: SCOPE_COLORS.scope2, icon: Zap },
    { id: 'scope3' as const, label: 'Scope 3', sub: 'Value Chain', total: annualScope3, color: SCOPE_COLORS.scope3, icon: Truck },
  ]

  const ScopeIcon = SCOPE_ICONS[activeScope]

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <BlockchainProof isOpen={proofOpen} onClose={() => setProofOpen(false)} dataPoint={proofData.dataPoint} facility={proofData.facility} />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-dark-800 border border-teal-500/30 text-teal-400 px-4 py-3 rounded-xl shadow-card animate-in fade-in slide-in-from-right">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/20 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-accent-400" />
            </div>
            Emissions Calculator
          </h1>
          <p className="text-sm text-dark-300 mt-2">
            Monthly data collection for Scope 1, 2, and 3 emissions. Enter activity data by source, review cumulative totals, and submit for blockchain verification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMethodology(true)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-dark-300 bg-dark-800 border border-dark-600 rounded-xl hover:bg-dark-700 hover:text-white transition-colors"
          >
            <Info className="w-4 h-4" />
            Methodology
          </button>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-2.5 text-sm text-dark-300 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          >
            {FACILITIES.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <span className="text-xs text-dark-400 bg-dark-800 border border-dark-600 px-3 py-2.5 rounded-xl font-mono">FY 2026</span>
        </div>
      </div>

      {/* Scope Tabs + Annual Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {scopeTabs.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setActiveScope(s.id)}
              className={`bg-dark-800 rounded-2xl border p-5 text-left transition-all ${
                activeScope === s.id ? 'border-accent-500/40 shadow-glow-sm ring-1 ring-accent-500/10' : 'border-dark-600 hover:border-dark-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + '20' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                  <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">{s.label}</p>
                </div>
                {activeScope === s.id && <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />}
              </div>
              <p className="text-2xl font-heading font-bold text-white mt-3">{formatEmissions(s.total)}</p>
              <p className="text-xs text-dark-400 mt-0.5">tCO&#x2082;e &middot; {s.sub}</p>
              <div className="mt-2 h-1 bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(s.total / annualTotal) * 100}%`, backgroundColor: s.color }} />
              </div>
              <p className="text-[10px] text-dark-400 mt-1">{((s.total / annualTotal) * 100).toFixed(1)}% of total</p>
            </button>
          )
        })}
        <div className="bg-dark-800 rounded-2xl border border-dark-600 p-5">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-accent-400" />
            <p className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Total</p>
          </div>
          <p className="text-2xl font-heading font-bold text-white mt-3">{formatEmissions(annualTotal)}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendingDown className="w-3 h-3 text-teal-400" />
            <span className="text-xs text-teal-400 font-medium">-4.2% YoY</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1">
            <div className="text-center">
              <p className="text-[10px] text-teal-400 font-bold">{verifiedCount}</p>
              <p className="text-[9px] text-dark-400">Verified</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-blue-400 font-bold">{submittedCount}</p>
              <p className="text-[9px] text-dark-400">Submitted</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-amber-400 font-bold">{draftCount}</p>
              <p className="text-[9px] text-dark-400">Draft</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Stacked Bar Chart */}
        <div className="lg:col-span-2 bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-white">Monthly Emissions Breakdown</h2>
              <p className="text-xs text-dark-400 mt-0.5">Scope 1 + 2 + 3 by month, FY 2026</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-dark-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#FF6B1A]" /> Scope 1</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#3B82F6]" /> Scope 2</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#A855F7]" /> Scope 3</span>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3A" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={{ stroke: '#2A2F3A' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatNumber(v) + ' tCO₂e', name]} />
                <Bar dataKey="scope1" stackId="a" fill="#FF6B1A" radius={[0, 0, 0, 0]} name="Scope 1" />
                <Bar dataKey="scope2" stackId="a" fill="#3B82F6" name="Scope 2" />
                <Bar dataKey="scope3" stackId="a" fill="#A855F7" radius={[4, 4, 0, 0]} name="Scope 3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Breakdown Donut */}
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
          <h2 className="font-heading text-lg font-semibold text-white mb-1">
            {activeScope === 'scope1' ? 'Scope 1' : activeScope === 'scope2' ? 'Scope 2' : 'Scope 3'} Sources
          </h2>
          <p className="text-xs text-dark-400 mb-4">Annual breakdown by source</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatNumber(v) + ' tCO₂e']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map(p => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-xs text-dark-300">{p.name}</span>
                </div>
                <span className="text-xs text-dark-400 font-mono">{formatEmissions(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cumulative Line Chart */}
      <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-white">Cumulative Emissions</h2>
            <p className="text-xs text-dark-400 mt-0.5">Running total through each month of FY 2026</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-dark-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-[#FF6B1A]" /> Scope 1</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-[#3B82F6]" /> Scope 2</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-[#A855F7]" /> Scope 3</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-[#F59E0B]" style={{ borderTop: '1px dashed #F59E0B' }} /> Total</span>
          </div>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3A" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={{ stroke: '#2A2F3A' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatNumber(v) + ' tCO₂e', name]} />
              <Line type="monotone" dataKey="scope1" stroke="#FF6B1A" strokeWidth={2} dot={false} name="Scope 1" />
              <Line type="monotone" dataKey="scope2" stroke="#3B82F6" strokeWidth={2} dot={false} name="Scope 2" />
              <Line type="monotone" dataKey="scope3" stroke="#A855F7" strokeWidth={2} dot={false} name="Scope 3" />
              <Line type="monotone" dataKey="total" stroke="#F59E0B" strokeWidth={2.5} dot={false} name="Total" strokeDasharray="6 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Data Collection Table */}
      <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: SCOPE_COLORS[activeScope] + '15', border: `1px solid ${SCOPE_COLORS[activeScope]}33` }}>
              <ScopeIcon className="w-5 h-5" style={{ color: SCOPE_COLORS[activeScope] }} />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-white">
                {activeScope === 'scope1' ? 'Scope 1 — Direct Emissions' :
                 activeScope === 'scope2' ? 'Scope 2 — Energy Indirect Emissions' :
                 'Scope 3 — Value Chain Emissions'}
              </h2>
              <p className="text-xs text-dark-400">Monthly data collection with source-level breakdown. Click any row to expand and edit.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-4 py-2 text-sm text-dark-300 bg-dark-700 border border-dark-500 rounded-xl hover:bg-dark-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-dark-300 bg-dark-700 border border-dark-500 rounded-xl hover:bg-dark-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-dark-800 rounded-xl border border-dark-600 shadow-card py-1 z-50">
                  {['CSV', 'Excel', 'PDF'].map(fmt => (
                    <button key={fmt} onClick={() => handleExport(fmt)} className="w-full text-left px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-white transition-colors">
                      Export as {fmt}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleSubmitAll}
              className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-glow-sm"
            >
              <Upload className="w-4 h-4" />
              Submit All for Review
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-600">
                <th className="text-left py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider w-8" />
                <th className="text-left py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Month</th>
                {activeScope === 'scope1' && scope1Sources.map(s => (
                  <th key={s.id} className="text-right py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider whitespace-nowrap">{s.label.split(' ')[0]}</th>
                ))}
                {activeScope === 'scope2' && scope2Sources.map(s => (
                  <th key={s.id} className="text-right py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider whitespace-nowrap">{s.label.replace('Purchased ', '')}</th>
                ))}
                {activeScope === 'scope3' && (
                  <>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Cat 1</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Cat 4</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Cat 11</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Others</th>
                  </>
                )}
                <th className="text-right py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Total</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Cumulative</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Status</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustedMonthly.map((m, i) => {
                const isExpanded = expandedMonth === i
                const cumRow = cumulativeData[i]
                const scopeTotal = activeScope === 'scope1' ? m.scope1.total :
                                   activeScope === 'scope2' ? m.scope2.total : m.scope3.total
                const cumVal = activeScope === 'scope1' ? cumRow.scope1 :
                               activeScope === 'scope2' ? cumRow.scope2 : cumRow.scope3
                const effectiveStatus = monthStatuses[i] ?? monthlyEmissions2026[i].status
                const statusCfg = STATUS_CONFIG[effectiveStatus]
                const StatusIcon = statusCfg.icon
                const isSubmitting = submittingMonths.has(i)

                return (
                  <MonthRow
                    key={m.month}
                    month={m}
                    index={i}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedMonth(isExpanded ? null : i)}
                    activeScope={activeScope}
                    scopeTotal={scopeTotal}
                    cumVal={cumVal}
                    statusCfg={statusCfg}
                    StatusIcon={StatusIcon}
                    effectiveStatus={effectiveStatus}
                    isSubmitting={isSubmitting}
                    onSubmit={() => handleSubmitMonth(i)}
                    onProof={() => openProof(`${activeScope === 'scope1' ? 'Scope 1' : activeScope === 'scope2' ? 'Scope 2' : 'Scope 3'} Emissions - ${m.month} 2026`)}
                    getVal={getVal}
                    handleEdit={handleEdit}
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                  />
                )
              })}
            </tbody>
            {/* Annual Total Footer */}
            <tfoot>
              <tr className="border-t-2 border-dark-500 bg-dark-750">
                <td className="py-3 px-3" />
                <td className="py-3 px-3 font-bold text-white">Annual Total</td>
                {activeScope === 'scope1' && (
                  <>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope1.process, 0))}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope1.combustion, 0))}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope1.mobile, 0))}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope1.fugitive, 0))}</td>
                  </>
                )}
                {activeScope === 'scope2' && (
                  <>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope2.electricity, 0))}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope2.steam, 0))}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope2.cooling, 0))}</td>
                  </>
                )}
                {activeScope === 'scope3' && (
                  <>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope3.cat1, 0))}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope3.cat4, 0))}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope3.cat11, 0))}</td>
                    <td className="py-3 px-3 text-right font-semibold text-white">{formatEmissions(adjustedMonthly.reduce((s, m) => s + m.scope3.cat2 + m.scope3.cat3 + m.scope3.cat5 + m.scope3.cat6 + m.scope3.cat7 + m.scope3.cat12, 0))}</td>
                  </>
                )}
                <td className="py-3 px-3 text-right font-bold text-white text-base">
                  {formatEmissions(activeScope === 'scope1' ? annualScope1 : activeScope === 'scope2' ? annualScope2 : annualScope3)}
                </td>
                <td className="py-3 px-3" />
                <td className="py-3 px-3 text-center">
                  <span className="text-xs text-dark-400">{verifiedCount}/12 verified</span>
                </td>
                <td className="py-3 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Emission Intensity Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-5">
          <p className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Emissions Intensity</p>
          <p className="text-2xl font-heading font-bold text-white mt-2">
            {(annualTotal / adjustedMonthly.reduce((s, m) => s + m.productionVolume, 0)).toFixed(2)}
          </p>
          <p className="text-xs text-dark-400">tCO₂e per tonne of product</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown className="w-3 h-3 text-teal-400" />
            <span className="text-xs text-teal-400">-3.8% vs FY 2023</span>
          </div>
        </div>
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-5">
          <p className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Production Volume</p>
          <p className="text-2xl font-heading font-bold text-white mt-2">
            {formatEmissions(adjustedMonthly.reduce((s, m) => s + m.productionVolume, 0))}
          </p>
          <p className="text-xs text-dark-400">tonnes produced in FY 2026</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400">+1.2% vs FY 2023</span>
          </div>
        </div>
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-5">
          <p className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Data Completeness</p>
          <p className="text-2xl font-heading font-bold text-white mt-2">
            {Math.round(((verifiedCount + submittedCount) / 12) * 100)}%
          </p>
          <p className="text-xs text-dark-400">{verifiedCount + submittedCount} of 12 months submitted or verified</p>
          <div className="h-1.5 bg-dark-700 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${((verifiedCount + submittedCount) / 12) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Methodology Modal */}
      {showMethodology && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card w-full max-w-3xl max-h-[80vh] overflow-y-auto m-6">
            <div className="flex items-center justify-between p-6 border-b border-dark-600 sticky top-0 bg-dark-800 rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-heading font-bold text-white">Calculation Methodology</h2>
                <p className="text-xs text-dark-400 mt-0.5">GHG Protocol Corporate Standard (2004 Revised), ISO 14064-1:2018</p>
              </div>
              <button onClick={() => setShowMethodology(false)} className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-dark-750 border border-dark-600 rounded-xl p-4">
                <p className="text-sm text-dark-300 leading-relaxed">
                  <strong className="text-white">Core Formula:</strong> Emissions (tCO₂e) = Activity Data × Emission Factor × GWP
                </p>
                <p className="text-xs text-dark-400 mt-2">
                  All emissions are reported in tonnes of CO₂ equivalent (tCO₂e) using AR5 Global Warming Potentials.
                  Base year recalculation is triggered by structural changes exceeding 5% of total emissions.
                </p>
              </div>

              {(['scope1', 'scope2', 'scope3'] as const).map(scope => (
                <div key={scope}>
                  <h3 className="text-sm font-heading font-bold text-white mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: SCOPE_COLORS[scope] + '20' }}>
                      {scope === 'scope1' ? <Flame className="w-3 h-3" style={{ color: SCOPE_COLORS[scope] }} /> :
                       scope === 'scope2' ? <Zap className="w-3 h-3" style={{ color: SCOPE_COLORS[scope] }} /> :
                       <Truck className="w-3 h-3" style={{ color: SCOPE_COLORS[scope] }} />}
                    </div>
                    {scope === 'scope1' ? 'Scope 1 — Direct Emissions' : scope === 'scope2' ? 'Scope 2 — Energy Indirect' : 'Scope 3 — Value Chain'}
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-dark-600">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-dark-750">
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-dark-400">Source</th>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-dark-400">Emission Factor</th>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-dark-400">Methodology</th>
                        </tr>
                      </thead>
                      <tbody>
                        {EMISSION_FACTORS[scope].map((ef, idx) => (
                          <tr key={ef.source} className={idx % 2 === 0 ? '' : 'bg-dark-750/50'}>
                            <td className="py-2.5 px-4 text-dark-300">{ef.source}</td>
                            <td className="py-2.5 px-4 text-white font-mono text-xs">{ef.factor}</td>
                            <td className="py-2.5 px-4 text-dark-400 text-xs">{ef.method}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="bg-dark-750 border border-dark-600 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-white mb-2">Assurance & Verification</h4>
                <ul className="text-xs text-dark-300 space-y-1.5">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" /> Third-party limited assurance by LRQA (Scope 1 & 2)</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" /> Blockchain-anchored data provenance via Aeiforo Nexus</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" /> SBTi-aligned target tracking (1.5°C pathway)</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" /> Aligns with CDP, GRI 305, TCFD / IFRS S2 disclosure requirements</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Separate component for each month row to avoid React key issues
function MonthRow({
  month,
  index,
  isExpanded,
  onToggle,
  activeScope,
  scopeTotal,
  cumVal,
  statusCfg,
  StatusIcon,
  effectiveStatus,
  isSubmitting,
  onSubmit,
  onProof,
  getVal,
  handleEdit,
  editingCell,
  setEditingCell,
}: {
  month: (typeof monthlyEmissions2026)[number]
  index: number
  isExpanded: boolean
  onToggle: () => void
  activeScope: ScopeTab
  scopeTotal: number
  cumVal: number
  statusCfg: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG]
  StatusIcon: React.ComponentType<{ className?: string }>
  effectiveStatus: string
  isSubmitting: boolean
  onSubmit: () => void
  onProof: () => void
  getVal: (m: number, key: string, orig: number) => number
  handleEdit: (m: number, key: string, val: number) => void
  editingCell: string | null
  setEditingCell: (v: string | null) => void
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-dark-750' : ''} hover:bg-dark-700`}
      >
        <td className="py-3 px-3">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-dark-400" /> : <ChevronRight className="w-3.5 h-3.5 text-dark-400" />}
        </td>
        <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">{month.month} 2026</td>

        {activeScope === 'scope1' && (
          <>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope1.process)}</td>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope1.combustion)}</td>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope1.mobile)}</td>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope1.fugitive)}</td>
          </>
        )}
        {activeScope === 'scope2' && (
          <>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope2.electricity)}</td>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope2.steam)}</td>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope2.cooling)}</td>
          </>
        )}
        {activeScope === 'scope3' && (
          <>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope3.cat1)}</td>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope3.cat4)}</td>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope3.cat11)}</td>
            <td className="py-3 px-3 text-right text-dark-300 font-mono text-xs">{formatNumber(month.scope3.cat2 + month.scope3.cat3 + month.scope3.cat5 + month.scope3.cat6 + month.scope3.cat7 + month.scope3.cat12)}</td>
          </>
        )}

        <td className="py-3 px-3 text-right font-semibold text-white">{formatNumber(scopeTotal)}</td>
        <td className="py-3 px-3 text-right text-accent-400 font-medium">{formatEmissions(cumVal)}</td>
        <td className="py-3 px-3 text-center">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusCfg.cls}`}>
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </>
            )}
          </span>
        </td>
        <td className="py-3 px-3">
          <div className="flex items-center justify-center gap-1">
            {effectiveStatus === 'verified' && (
              <button
                onClick={(e) => { e.stopPropagation(); onProof() }}
                className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
                title="View blockchain proof"
              >
                <Shield className="w-3.5 h-3.5 text-teal-400" />
              </button>
            )}
            {effectiveStatus === 'draft' && (
              <button
                onClick={(e) => { e.stopPropagation(); onSubmit() }}
                className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors text-accent-400"
                title="Submit for review"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr>
          <td colSpan={20} className="p-0">
            <ExpandedMonthDetail
              month={month}
              scope={activeScope}
              getVal={getVal}
              handleEdit={handleEdit}
              editingCell={editingCell}
              setEditingCell={setEditingCell}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// Expanded detail for a single month
function ExpandedMonthDetail({
  month,
  scope,
  getVal,
  handleEdit,
  editingCell,
  setEditingCell,
}: {
  month: MonthlyEmission
  scope: ScopeTab
  getVal: (m: number, key: string, orig: number) => number
  handleEdit: (m: number, key: string, val: number) => void
  editingCell: string | null
  setEditingCell: (v: string | null) => void
}) {
  const sources = scope === 'scope1' ? scope1Sources :
                  scope === 'scope2' ? scope2Sources : scope3Categories

  const getSourceValue = (srcId: string): number => {
    if (scope === 'scope1') {
      const vals: Record<string, number> = {
        process: month.scope1.process,
        combustion: month.scope1.combustion,
        mobile: month.scope1.mobile,
        fugitive: month.scope1.fugitive,
      }
      return getVal(month.monthIndex, srcId, vals[srcId] || 0)
    }
    if (scope === 'scope2') {
      const vals: Record<string, number> = {
        electricity: month.scope2.electricity,
        steam: month.scope2.steam,
        cooling: month.scope2.cooling,
      }
      return getVal(month.monthIndex, srcId, vals[srcId] || 0)
    }
    const vals: Record<string, number> = {
      cat1: month.scope3.cat1, cat2: month.scope3.cat2, cat3: month.scope3.cat3,
      cat4: month.scope3.cat4, cat5: month.scope3.cat5, cat6: month.scope3.cat6,
      cat7: month.scope3.cat7, cat11: month.scope3.cat11, cat12: month.scope3.cat12,
    }
    return getVal(month.monthIndex, srcId, vals[srcId] || 0)
  }

  const scopeColor = scope === 'scope1' ? SCOPE_COLORS.scope1 :
                     scope === 'scope2' ? SCOPE_COLORS.scope2 : SCOPE_COLORS.scope3

  return (
    <div className="bg-dark-850 border-t border-b border-dark-600 px-8 py-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-heading font-semibold text-white">
          {month.month} 2026 — Source-Level Breakdown
        </h4>
        <div className="flex items-center gap-4 text-xs text-dark-400">
          <span>Production: <strong className="text-white">{formatNumber(month.productionVolume)}</strong> tonnes</span>
          <span>Intensity: <strong className="text-white">{((scope === 'scope1' ? month.scope1.total : scope === 'scope2' ? month.scope2.total : month.scope3.total) / month.productionVolume).toFixed(3)}</strong> tCO₂e/t</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sources.map((src) => {
          const cellKey = `${month.monthIndex}-${src.id}`
          const val = getSourceValue(src.id)
          const isEditing = editingCell === cellKey

          return (
            <div key={src.id} className="bg-dark-800 border border-dark-600 rounded-xl p-4 hover:border-dark-500 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-dark-300">{src.label}</p>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scopeColor, opacity: 0.6 }} />
              </div>
              <p className="text-[10px] text-dark-400 mb-3 leading-relaxed">{src.description}</p>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    autoFocus
                    defaultValue={val}
                    onBlur={(e) => {
                      handleEdit(month.monthIndex, src.id, Number(e.target.value))
                      setEditingCell(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEdit(month.monthIndex, src.id, Number((e.target as HTMLInputElement).value))
                        setEditingCell(null)
                      }
                      if (e.key === 'Escape') setEditingCell(null)
                    }}
                    className="flex-1 bg-dark-700 border border-accent-500/50 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setEditingCell(cellKey)}
                  className="w-full text-left bg-dark-750 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white font-mono hover:border-dark-500 hover:bg-dark-700 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span>{formatNumber(val)} <span className="text-dark-400 text-xs">{src.unit}</span></span>
                    <FileEdit className="w-3 h-3 text-dark-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
