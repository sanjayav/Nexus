import { useState } from 'react'
import { Shield, ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { facilities, scopeBreakdown, formatEmissions, formatNumber, Facility } from '../data/pttgcData'
import BlockchainProof from '../components/BlockchainProof'

type SortKey = 'name' | 'scope1' | 'scope2' | 'scope3' | 'total' | 'intensity' | 'yoyChange'
type SortDir = 'asc' | 'desc'

const SCOPE1_COLORS = ['#FF6B1A', '#2DD4BF', '#3B82F6', '#A855F7']
const SCOPE2_COLORS = ['#3B82F6', '#A855F7', '#F59E0B']
const SCOPE3_COLORS = ['#FF6B1A', '#2DD4BF', '#3B82F6', '#A855F7', '#F59E0B', '#EC4899', '#06B6D4', '#84CC16', '#F97316']

const TOOLTIP_STYLE = {
  fontSize: 11,
  borderRadius: 12,
  background: '#1A1D25',
  border: '1px solid #2A2F3A',
  color: '#E2E8F0',
}

export default function CarbonAccounting() {
  const [proofOpen, setProofOpen] = useState(false)
  const [proofDataPoint, setProofDataPoint] = useState<string | undefined>()
  const [proofFacility, setProofFacility] = useState<string | undefined>()
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null)

  function openProof(dataPoint: string, facility?: string) {
    setProofDataPoint(dataPoint)
    setProofFacility(facility)
    setProofOpen(true)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedFacilities = [...facilities].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-dark-400 ml-1 inline" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-dark-300 ml-1 inline" />
      : <ChevronDown className="w-3 h-3 text-dark-300 ml-1 inline" />
  }

  function ShieldBtn({ dataPoint, facility }: { dataPoint: string; facility?: string }) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); openProof(dataPoint, facility) }}
        className="inline-flex items-center ml-1.5 hover:scale-110 transition-transform"
        title="View blockchain verification"
      >
        <Shield className="w-3.5 h-3.5 text-accent-400" />
      </button>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Carbon Accounting</h1>
        <p className="text-sm text-dark-300 mt-1">
          Comprehensive emissions breakdown across all GC Group facilities. Click any data point to view its blockchain verification.
        </p>
      </div>

      {/* Scope Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scope 1 Card */}
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Scope 1 - Direct</p>
              <div className="flex items-center mt-1">
                <span className="text-2xl font-heading font-bold text-white">8.4M</span>
                <span className="text-sm text-dark-300 ml-1.5">tCO2e</span>
                <ShieldBtn dataPoint="Scope 1 Total Emissions" facility="GC Group (All Facilities)" />
              </div>
            </div>
            <div className="w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scopeBreakdown.scope1.categories}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={35}
                    strokeWidth={1}
                    stroke="#1A1D25"
                  >
                    {scopeBreakdown.scope1.categories.map((_, i) => (
                      <Cell key={i} fill={SCOPE1_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatEmissions(value)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-2">
            {scopeBreakdown.scope1.categories.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SCOPE1_COLORS[i] }} />
                  <span className="text-dark-300 text-xs">{cat.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs font-semibold text-white">{cat.percentage}%</span>
                  <ShieldBtn dataPoint={`Scope 1 - ${cat.name}`} facility="GC Group" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scope 2 Card */}
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Scope 2 - Indirect</p>
              <div className="flex items-center mt-1">
                <span className="text-2xl font-heading font-bold text-white">3.8M</span>
                <span className="text-sm text-dark-300 ml-1.5">tCO2e</span>
                <ShieldBtn dataPoint="Scope 2 Total Emissions (Location-Based)" facility="GC Group (All Facilities)" />
              </div>
              <p className="text-[11px] text-dark-400 mt-0.5">
                Market-based: <span className="font-semibold text-dark-300">3.42M</span> tCO2e
                <ShieldBtn dataPoint="Scope 2 Total Emissions (Market-Based)" facility="GC Group" />
              </p>
            </div>
            <div className="w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scopeBreakdown.scope2.categories}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={35}
                    strokeWidth={1}
                    stroke="#1A1D25"
                  >
                    {scopeBreakdown.scope2.categories.map((_, i) => (
                      <Cell key={i} fill={SCOPE2_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatEmissions(value)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-2">
            {scopeBreakdown.scope2.categories.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SCOPE2_COLORS[i] }} />
                  <span className="text-dark-300 text-xs">{cat.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs font-semibold text-white">{cat.percentage}%</span>
                  <ShieldBtn dataPoint={`Scope 2 - ${cat.name}`} facility="GC Group" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scope 3 Card */}
        <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Scope 3 - Value Chain</p>
              <div className="flex items-center mt-1">
                <span className="text-2xl font-heading font-bold text-white">9.3M</span>
                <span className="text-sm text-dark-300 ml-1.5">tCO2e</span>
                <ShieldBtn dataPoint="Scope 3 Total Emissions" facility="GC Group (All Facilities)" />
              </div>
            </div>
            <div className="w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scopeBreakdown.scope3.categories}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={35}
                    strokeWidth={1}
                    stroke="#1A1D25"
                  >
                    {scopeBreakdown.scope3.categories.map((_, i) => (
                      <Cell key={i} fill={SCOPE3_COLORS[i % SCOPE3_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatEmissions(value)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-2">
            {scopeBreakdown.scope3.categories.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SCOPE3_COLORS[i % SCOPE3_COLORS.length] }} />
                  <span className="text-dark-300 text-xs truncate max-w-[160px]">
                    Cat {(cat as typeof cat & { category: number }).category}: {cat.name}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs font-semibold text-white">{cat.percentage}%</span>
                  <ShieldBtn dataPoint={`Scope 3 Cat ${(cat as typeof cat & { category: number }).category} - ${cat.name}`} facility="GC Group" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Facility Drill-Down Table */}
      <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
        <h2 className="text-lg font-heading font-bold text-white mb-1">Facility Emissions Breakdown</h2>
        <p className="text-xs text-dark-300 mb-4">Click a row to expand scope details. Click column headers to sort.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-600">
                {([
                  ['name', 'Facility Name'],
                  ['scope1', 'Scope 1'],
                  ['scope2', 'Scope 2'],
                  ['scope3', 'Scope 3'],
                  ['total', 'Total'],
                  ['intensity', 'Intensity'],
                  ['yoyChange', 'YoY Change'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    className={`py-3 px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider cursor-pointer hover:text-white hover:bg-dark-700 transition-colors select-none ${key === 'name' ? 'text-left' : 'text-right'}`}
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    <SortIcon col={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedFacilities.map((f, idx) => (
                <FacilityRow
                  key={f.id}
                  facility={f}
                  index={idx}
                  isExpanded={expandedFacility === f.id}
                  onToggle={() => setExpandedFacility(expandedFacility === f.id ? null : f.id)}
                  onShieldClick={openProof}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blockchain Proof Drawer */}
      <BlockchainProof
        isOpen={proofOpen}
        onClose={() => setProofOpen(false)}
        dataPoint={proofDataPoint}
        facility={proofFacility}
      />
    </div>
  )
}

function FacilityRow({
  facility,
  index,
  isExpanded,
  onToggle,
  onShieldClick,
}: {
  facility: Facility
  index: number
  isExpanded: boolean
  onToggle: () => void
  onShieldClick: (dataPoint: string, facility?: string) => void
}) {
  const bgClass = index % 2 === 0 ? 'bg-dark-800' : 'bg-dark-750'

  function ShieldBtn({ dataPoint }: { dataPoint: string }) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onShieldClick(dataPoint, facility.name) }}
        className="inline-flex items-center ml-1.5 hover:scale-110 transition-transform"
        title="View blockchain verification"
      >
        <Shield className="w-3 h-3 text-accent-400" />
      </button>
    )
  }

  // Simulate facility-level scope breakdowns proportionally
  const facilityScope1Breakdown = [
    { name: 'Process', value: facility.scope1 * 0.55, pct: 55 },
    { name: 'Combustion', value: facility.scope1 * 0.30, pct: 30 },
    { name: 'Mobile', value: facility.scope1 * 0.10, pct: 10 },
    { name: 'Fugitive', value: facility.scope1 * 0.05, pct: 5 },
  ]
  const facilityScope2Breakdown = [
    { name: 'Electricity', value: facility.scope2 * 0.85, pct: 85 },
    { name: 'Steam', value: facility.scope2 * 0.10, pct: 10 },
    { name: 'Cooling', value: facility.scope2 * 0.05, pct: 5 },
  ]
  const facilityScope3Breakdown = [
    { name: 'Purchased Goods (Cat 1)', value: facility.scope3 * 0.35, pct: 35 },
    { name: 'Transport (Cat 4)', value: facility.scope3 * 0.15, pct: 15 },
    { name: 'Use of Sold Products (Cat 11)', value: facility.scope3 * 0.22, pct: 22 },
    { name: 'Other Categories', value: facility.scope3 * 0.28, pct: 28 },
  ]

  return (
    <>
      <tr
        className={`${bgClass} cursor-pointer hover:bg-dark-700 transition-colors border-b border-dark-600`}
        onClick={onToggle}
      >
        <td className="py-3 px-3 text-left font-medium text-white">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-dark-400" /> : <ChevronDown className="w-3.5 h-3.5 text-dark-400" />}
            <span>{facility.name}</span>
          </div>
        </td>
        <td className="py-3 px-3 text-right text-dark-300">
          {formatEmissions(facility.scope1)}
          <ShieldBtn dataPoint={`Scope 1 Emissions - ${facility.name}`} />
        </td>
        <td className="py-3 px-3 text-right text-dark-300">
          {formatEmissions(facility.scope2)}
          <ShieldBtn dataPoint={`Scope 2 Emissions - ${facility.name}`} />
        </td>
        <td className="py-3 px-3 text-right text-dark-300">
          {formatEmissions(facility.scope3)}
          <ShieldBtn dataPoint={`Scope 3 Emissions - ${facility.name}`} />
        </td>
        <td className="py-3 px-3 text-right font-semibold text-white">
          {formatEmissions(facility.total)}
          <ShieldBtn dataPoint={`Total Emissions - ${facility.name}`} />
        </td>
        <td className="py-3 px-3 text-right text-dark-300">
          {facility.intensity.toFixed(2)}
          <ShieldBtn dataPoint={`Emissions Intensity - ${facility.name}`} />
        </td>
        <td className="py-3 px-3 text-right">
          <span className={`inline-flex items-center gap-0.5 font-semibold ${facility.yoyChange < 0 ? 'text-teal-400' : 'text-red-500'}`}>
            {facility.yoyChange < 0
              ? <ArrowDownRight className="w-3.5 h-3.5" />
              : <ArrowUpRight className="w-3.5 h-3.5" />
            }
            {Math.abs(facility.yoyChange).toFixed(1)}%
          </span>
          <ShieldBtn dataPoint={`YoY Change - ${facility.name}`} />
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-dark-750">
          <td colSpan={7} className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Scope 1 Detail */}
              <div>
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Scope 1 Breakdown</p>
                <div className="space-y-2">
                  {facilityScope1Breakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-xs text-dark-300">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-500 rounded-full" style={{ width: `${item.pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-dark-300 w-14 text-right">{formatEmissions(item.value)}</span>
                        <ShieldBtn dataPoint={`Scope 1 ${item.name} - ${facility.name}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope 2 Detail */}
              <div>
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Scope 2 Breakdown</p>
                <div className="space-y-2">
                  {facilityScope2Breakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-xs text-dark-300">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-dark-300 w-14 text-right">{formatEmissions(item.value)}</span>
                        <ShieldBtn dataPoint={`Scope 2 ${item.name} - ${facility.name}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope 3 Detail */}
              <div>
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Scope 3 Breakdown</p>
                <div className="space-y-2">
                  {facilityScope3Breakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-xs text-dark-300">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${item.pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-dark-300 w-14 text-right">{formatEmissions(item.value)}</span>
                        <ShieldBtn dataPoint={`Scope 3 ${item.name} - ${facility.name}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Facility metadata */}
            <div className="mt-4 pt-4 border-t border-dark-600 flex flex-wrap gap-6 text-xs text-dark-400">
              <span>Location: <span className="font-medium text-dark-300">{facility.location}</span></span>
              <span>Type: <span className="font-medium text-dark-300">{facility.type}</span></span>
              <span>Production Volume: <span className="font-medium text-dark-300">{formatNumber(facility.productionVolume)} tons</span></span>
              <span>Intensity: <span className="font-medium text-dark-300">{facility.intensity.toFixed(2)} tCO2e/ton</span></span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
