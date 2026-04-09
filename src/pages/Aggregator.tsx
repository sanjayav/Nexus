import { useState } from 'react'
import {
  Layers,
  Building2,
  Factory,
  CheckCircle2,
  GitMerge,
  Recycle,
  BarChart3,
} from 'lucide-react'
import { frameworkDataMappings } from '../data/moduleData'
import { facilities, scopeBreakdown, circularMetrics, formatNumber, formatEmissions } from '../data/pttgcData'

type AggregatorTab = 'entity' | 'scope' | 'matrix' | 'circular'

const tabs: { id: AggregatorTab; label: string; icon: typeof Building2 }[] = [
  { id: 'entity', label: 'Entity Rollup', icon: Building2 },
  { id: 'scope', label: 'Scope Consolidation', icon: BarChart3 },
  { id: 'matrix', label: 'Framework Matrix', icon: GitMerge },
  { id: 'circular', label: 'Circular Economy', icon: Recycle },
]

// Entity hierarchy built from facilities data
interface EntityNode {
  name: string
  type: string
  facilities: typeof facilities
  totalEmissions: number
}

const entityGroups: EntityNode[] = [
  {
    name: 'GC Petrochemical Division',
    type: 'Intercompany',
    facilities: facilities.filter((f) => ['mtp-olefins', 'mtp-aromatics', 'rayong-refinery'].includes(f.id)),
    totalEmissions: facilities.filter((f) => ['mtp-olefins', 'mtp-aromatics', 'rayong-refinery'].includes(f.id)).reduce((s, f) => s + f.total, 0),
  },
  {
    name: 'GC Polymers & Specialty',
    type: 'Subsidiary',
    facilities: facilities.filter((f) => ['thai-pe', 'gc-glycol', 'hmc-polymers'].includes(f.id)),
    totalEmissions: facilities.filter((f) => ['thai-pe', 'gc-glycol', 'hmc-polymers'].includes(f.id)).reduce((s, f) => s + f.total, 0),
  },
  {
    name: 'GC Green & Circular',
    type: 'Subsidiary',
    facilities: facilities.filter((f) => ['envicco', 'natureworks'].includes(f.id)),
    totalEmissions: facilities.filter((f) => ['envicco', 'natureworks'].includes(f.id)).reduce((s, f) => s + f.total, 0),
  },
]

const groupTotal = facilities.reduce((s, f) => s + f.total, 0)

const SCOPE_COLORS = {
  scope1: '#FF6B1A',
  scope2: '#3B82F6',
  scope3: '#A855F7',
}

const frameworkIds = ['cdp', 'tcfd', 'gri', 'csrd'] as const
const frameworkLabels: Record<string, string> = {
  cdp: 'CDP',
  tcfd: 'TCFD',
  gri: 'GRI',
  csrd: 'CSRD',
}

// Circular metrics grouped by facility
const circularGroups = [
  { name: 'ENVICCO', icon: Recycle, metrics: circularMetrics.filter((m) => m.facility === 'ENVICCO') },
  { name: 'NatureWorks', icon: Factory, metrics: circularMetrics.filter((m) => m.facility === 'NatureWorks') },
  { name: 'GC Group (All)', icon: Building2, metrics: circularMetrics.filter((m) => m.facility === 'GC Group (All)') },
]

export default function Aggregator() {
  const [activeTab, setActiveTab] = useState<AggregatorTab>('entity')

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Layers className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Data Aggregator</h1>
          <p className="text-sm text-dark-300 mt-1">
            Consolidated view across entities, scopes, and frameworks. Roll up facility-level data into group totals and map data points to multiple disclosure standards.
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent-500 text-white'
                  : 'bg-dark-800 text-dark-300 border border-dark-600 hover:bg-dark-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'entity' && <EntityRollupTab />}
      {activeTab === 'scope' && <ScopeConsolidationTab />}
      {activeTab === 'matrix' && <FrameworkMatrixTab />}
      {activeTab === 'circular' && <CircularEconomyTab />}
    </div>
  )
}

// ============================================================
// TAB 1: Entity Rollup
// ============================================================

function EntityRollupTab() {
  return (
    <div className="space-y-4">
      {/* Group Total */}
      <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-5 h-5 text-accent-400" />
          <h2 className="text-lg font-heading font-bold text-white">GC Group (Consolidated)</h2>
          <span className="ml-auto text-xl font-heading font-bold text-white">{formatEmissions(groupTotal)} tCO2e</span>
        </div>
        <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
          <div className="h-full bg-accent-500 rounded-full" style={{ width: '100%' }} />
        </div>
        <p className="text-xs text-dark-400 mt-2">{facilities.length} facilities across 3 entities</p>
      </div>

      {/* Entity Nodes */}
      {entityGroups.map((entity) => {
        const pct = Math.round((entity.totalEmissions / groupTotal) * 100)
        return (
          <div key={entity.name} className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <Factory className="w-4 h-4 text-blue-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-heading font-semibold text-white">{entity.name}</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    {entity.type}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-heading font-bold text-white">{formatEmissions(entity.totalEmissions)}</span>
                <span className="text-xs text-dark-400 ml-1">tCO2e</span>
                <span className="text-xs text-dark-400 ml-2">({pct}%)</span>
              </div>
            </div>

            {/* Progress bar relative to group */}
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Facility rows */}
            <div className="space-y-1">
              {entity.facilities.map((f, idx) => {
                const facilityPct = Math.round((f.total / groupTotal) * 100)
                return (
                  <div key={f.id} className={`flex items-center gap-4 py-2.5 px-4 rounded-xl ${idx % 2 === 0 ? 'bg-dark-750' : ''}`}>
                    <span className="text-xs text-dark-400 w-4">{idx + 1}</span>
                    <span className="text-sm text-dark-200 flex-1">{f.name}</span>
                    <span className="text-xs text-dark-400">{f.type}</span>
                    <div className="w-20 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-500 rounded-full" style={{ width: `${facilityPct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-white w-16 text-right">{formatEmissions(f.total)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// TAB 2: Scope Consolidation
// ============================================================

function ScopeConsolidationTab() {
  const scopeTotal = scopeBreakdown.scope1.total + scopeBreakdown.scope2.total + scopeBreakdown.scope3.total

  const scopes = [
    { label: 'Scope 1 - Direct', data: scopeBreakdown.scope1, color: SCOPE_COLORS.scope1, key: 'scope1' as const },
    { label: 'Scope 2 - Indirect', data: scopeBreakdown.scope2, color: SCOPE_COLORS.scope2, key: 'scope2' as const },
    { label: 'Scope 3 - Value Chain', data: scopeBreakdown.scope3, color: SCOPE_COLORS.scope3, key: 'scope3' as const },
  ]

  return (
    <div className="space-y-6">
      {/* Stacked bar showing relative proportions */}
      <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
        <h2 className="text-lg font-heading font-bold text-white mb-1">Scope Proportions</h2>
        <p className="text-xs text-dark-400 mb-4">Total: {formatEmissions(scopeTotal)} tCO2e (Q1 2026)</p>

        <div className="h-6 bg-dark-700 rounded-full overflow-hidden flex">
          {scopes.map((scope) => {
            const pct = (scope.data.total / scopeTotal) * 100
            return (
              <div
                key={scope.key}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: scope.color }}
                title={`${scope.label}: ${formatEmissions(scope.data.total)} (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>

        <div className="flex items-center gap-6 mt-3">
          {scopes.map((scope) => (
            <div key={scope.key} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: scope.color }} />
              <span className="text-xs text-dark-300">
                {scope.label}: {formatEmissions(scope.data.total)} ({((scope.data.total / scopeTotal) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scope cards with breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {scopes.map((scope) => (
          <div key={scope.key} className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">{scope.label}</p>
              <div className="flex items-center mt-1">
                <span className="text-2xl font-heading font-bold text-white">{formatEmissions(scope.data.total)}</span>
                <span className="text-sm text-dark-300 ml-1.5">tCO2e</span>
              </div>
            </div>

            <div className="space-y-3">
              {scope.data.categories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-dark-300">{cat.name}</span>
                    <span className="text-xs font-semibold text-white">{cat.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${cat.percentage}%`, backgroundColor: scope.color }}
                    />
                  </div>
                  <p className="text-[10px] text-dark-400 mt-0.5">{formatEmissions(cat.value)} tCO2e</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// TAB 3: Framework Matrix
// ============================================================

function FrameworkMatrixTab() {
  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-heading font-bold text-white">Framework Data Mapping</h2>
        <p className="text-xs text-dark-300 mt-1">
          Single data points mapped across multiple disclosure frameworks. One source, zero re-entry.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-600">
              <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Data Point</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Value</th>
              {frameworkIds.map((fId) => (
                <th key={fId} className="text-center py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  {frameworkLabels[fId]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {frameworkDataMappings.map((dp, idx) => {
              const fwMap = new Map(dp.frameworks.map((fw) => [fw.frameworkId, fw.disclosureRef]))
              return (
                <tr key={dp.dataPointId} className={idx % 2 === 0 ? 'bg-dark-750' : ''}>
                  <td className="py-3 px-4 text-dark-200 font-medium">{dp.dataPointName}</td>
                  <td className="py-3 px-4 text-white font-semibold text-xs">{dp.value}</td>
                  {frameworkIds.map((fId) => (
                    <td key={fId} className="py-3 px-4 text-center">
                      {fwMap.has(fId) ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          <span className="text-[10px] text-dark-400">{fwMap.get(fId)}</span>
                        </div>
                      ) : (
                        <span className="text-dark-600">--</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// TAB 4: Circular Economy
// ============================================================

function CircularEconomyTab() {
  return (
    <div className="space-y-6">
      {circularGroups.map((group) => {
        const Icon = group.icon
        return (
          <div key={group.name} className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-teal-400" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-white">{group.name}</h3>
            </div>

            <div className="space-y-4">
              {group.metrics.map((m) => {
                const pct = Math.min(Math.round((m.value / m.target) * 100), 100)
                const isPercentMetric = m.unit === '%'
                return (
                  <div key={m.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-dark-200">{m.metric}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-white">
                          {isPercentMetric ? `${m.value}%` : `${formatNumber(m.value)} ${m.unit}`}
                        </span>
                        <span className="text-xs text-dark-400">
                          / {isPercentMetric ? `${m.target}%` : `${formatNumber(m.target)} ${m.unit}`}
                        </span>
                        {m.yoyChange !== 0 && (
                          <span className={`text-xs font-semibold ${m.yoyChange > 0 ? 'text-teal-400' : 'text-red-500'}`}>
                            {m.yoyChange > 0 ? '+' : ''}{m.yoyChange}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-teal-500' : pct >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-dark-400 mt-0.5">{pct}% of target</p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
