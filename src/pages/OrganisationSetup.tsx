import { useState } from 'react'
import {
  Building2,
  Globe2,
  FileCheck,
  Network,
  MapPin,
  Cpu,
  Map,
  ChevronDown,
  ChevronRight,
  Check,
  Circle,
  ArrowRight,
  AlertCircle,
  Plus,
  Trash2,
  Info,
} from 'lucide-react'
import { Card, Badge, Input, Select } from '../design-system'

/* ── Step definitions ── */
const STEPS = [
  {
    id: 'tenant',
    number: 1,
    title: 'Tenant Configuration',
    desc: 'Company identity, fiscal year, base year, reporting currency',
    icon: Building2,
    accent: 'var(--accent-teal)',
  },
  {
    id: 'boundary',
    number: 2,
    title: 'Organisational Boundary Approach',
    desc: 'Choose between operational control, financial control, or equity share',
    icon: Globe2,
    accent: 'var(--accent-blue)',
  },
  {
    id: 'frameworks',
    number: 3,
    title: 'Framework Selection',
    desc: 'Select applicable reporting frameworks — GRI, CSRD, ISSB, TCFD, CDP',
    icon: FileCheck,
    accent: 'var(--accent-purple)',
  },
  {
    id: 'groups',
    number: 4,
    title: 'Business Groups',
    desc: 'Define top-level organisational groups for multi-entity consolidation',
    icon: Network,
    accent: 'var(--accent-teal)',
  },
  {
    id: 'subdivisions',
    number: 5,
    title: 'Subdivision Registration',
    desc: 'Register facilities, offices, and operational sites within each group',
    icon: MapPin,
    accent: 'var(--accent-blue)',
  },
  {
    id: 'sources',
    number: 6,
    title: 'Source Registration & Calculator Auto-Routing',
    desc: 'Register emission sources and auto-assign GHG Protocol calculator modules',
    icon: Cpu,
    accent: 'var(--accent-purple)',
  },
  {
    id: 'grid',
    number: 7,
    title: 'Grid Subregion Mapping',
    desc: 'Map facilities to electricity grid subregions for Scope 2 emission factors',
    icon: Map,
    accent: 'var(--accent-amber)',
  },
]

/* ── Demo data for each step ── */
const FRAMEWORK_LIST = [
  { id: 'gri', label: 'GRI Standards', version: '2021', status: 'active', color: 'teal' as const },
  { id: 'csrd', label: 'CSRD / ESRS', version: '2024', status: 'active', color: 'blue' as const },
  { id: 'issb', label: 'ISSB (IFRS S1/S2)', version: '2023', status: 'pending', color: 'purple' as const },
  { id: 'tcfd', label: 'TCFD', version: '2017', status: 'active', color: 'amber' as const },
  { id: 'cdp', label: 'CDP Climate', version: '2024', status: 'pending', color: 'green' as const },
]

const DEMO_GROUPS = [
  { name: 'PTTGC — Chemicals', subsidiaries: 12, subdivisions: 34 },
  { name: 'PTTGC — Polymers', subsidiaries: 8, subdivisions: 22 },
  { name: 'PTTGC — Green Chemicals', subsidiaries: 4, subdivisions: 11 },
]

const DEMO_SUBDIVISIONS = [
  { name: 'Map Ta Phut Olefins Plant', group: 'Chemicals', country: 'TH', type: 'Manufacturing', sources: 18 },
  { name: 'Rayong Aromatics Complex', group: 'Chemicals', country: 'TH', type: 'Refinery', sources: 24 },
  { name: 'Nanjing PTTGC JV', group: 'Polymers', country: 'CN', type: 'Joint Venture', sources: 9 },
  { name: 'Bangkok HQ Office', group: 'Green Chemicals', country: 'TH', type: 'Office', sources: 3 },
]

const SOURCE_TYPES = [
  { type: 'Stationary Combustion', calculator: 'GHG-STAT-v4.2', scope: 'S1', count: 42, color: 'teal' as const },
  { type: 'Mobile Combustion', calculator: 'GHG-TRANS-v2.7', scope: 'S1', count: 18, color: 'blue' as const },
  { type: 'Process Emissions', calculator: 'GHG-HFC-v1', scope: 'S1', count: 7, color: 'purple' as const },
  { type: 'Purchased Electricity', calculator: 'GHG-ELEC-v3.1', scope: 'S2', count: 34, color: 'amber' as const },
  { type: 'Purchased Heat/Steam', calculator: 'GHG-HEAT-v2.0', scope: 'S2', count: 12, color: 'red' as const },
]

const GRID_REGIONS = [
  { facility: 'Map Ta Phut Olefins', grid: 'TH-MEA-Central', ef: '0.4999', unit: 'kgCO2e/kWh' },
  { facility: 'Rayong Aromatics', grid: 'TH-PEA-Eastern', ef: '0.5123', unit: 'kgCO2e/kWh' },
  { facility: 'Nanjing JV', grid: 'CN-ECGD-Jiangsu', ef: '0.7921', unit: 'kgCO2e/kWh' },
  { facility: 'Bangkok HQ', grid: 'TH-MEA-Central', ef: '0.4999', unit: 'kgCO2e/kWh' },
]

export default function OrganisationSetup() {
  const [expandedStep, setExpandedStep] = useState<string | null>('tenant')
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [selectedFrameworks, setSelectedFrameworks] = useState<Set<string>>(new Set(['gri', 'csrd', 'tcfd']))
  const [boundaryApproach, setBoundaryApproach] = useState('operational')

  const toggleStep = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId)
  }

  const markComplete = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.add(stepId)
      return next
    })
    // Auto-advance to next step
    const idx = STEPS.findIndex((s) => s.id === stepId)
    if (idx < STEPS.length - 1) {
      setExpandedStep(STEPS[idx + 1].id)
    } else {
      setExpandedStep(null)
    }
  }

  const toggleFramework = (id: string) => {
    setSelectedFrameworks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const completionPct = Math.round((completedSteps.size / STEPS.length) * 100)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">
            Organisation Setup
          </h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">
            Configure your tenant, boundary, frameworks, and organisational hierarchy in 7 steps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[var(--text-xs)] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Progress</p>
            <p className="font-display text-[var(--text-xl)] font-bold text-[var(--text-primary)] tabular-nums">{completionPct}%</p>
          </div>
          <div className="w-12 h-12 relative">
            <svg width={48} height={48} className="-rotate-90">
              <circle cx={24} cy={24} r={20} fill="none" stroke="var(--bg-tertiary)" strokeWidth={4} />
              <circle
                cx={24} cy={24} r={20} fill="none"
                stroke="var(--accent-teal)" strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - completionPct / 100)}
                style={{ transition: 'stroke-dashoffset 0.6s var(--ease-out-expo)' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] tabular-nums">
              {completedSteps.size}/{STEPS.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Progress track ── */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = completedSteps.has(step.id)
          const active = expandedStep === step.id
          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => toggleStep(step.id)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold
                  transition-all duration-300 cursor-pointer flex-shrink-0
                  ${done
                    ? 'bg-[var(--accent-teal)] text-white shadow-[var(--shadow-glow-teal)]'
                    : active
                      ? 'bg-[var(--bg-inverse)] text-white shadow-[var(--shadow-md)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:bg-[var(--border-strong)]'
                  }
                `}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : step.number}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-[2px] mx-1 rounded-full transition-colors duration-300 ${
                  done ? 'bg-[var(--accent-teal)]' : 'bg-[var(--border-default)]'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Steps ── */}
      <div className="space-y-3">
        {STEPS.map((step) => {
          const Icon = step.icon
          const isExpanded = expandedStep === step.id
          const isDone = completedSteps.has(step.id)

          return (
            <Card key={step.id} padding="none" className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-[var(--shadow-lg)]' : ''}`}>
              {/* Step header */}
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center gap-4 p-5 text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300`}
                  style={{
                    backgroundColor: isDone ? 'var(--accent-teal-light)' : isExpanded ? `${step.accent}10` : 'var(--bg-secondary)',
                    border: `1px solid ${isDone ? 'var(--accent-teal)' : isExpanded ? `${step.accent}30` : 'var(--border-default)'}`,
                  }}
                >
                  {isDone ? (
                    <Check className="w-5 h-5 text-[var(--accent-teal)]" />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: isExpanded ? step.accent : 'var(--text-tertiary)' }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Step {step.number}
                    </span>
                    {isDone && <Badge variant="teal" dot>Complete</Badge>}
                  </div>
                  <h3 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mt-0.5">{step.title}</h3>
                  <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">{step.desc}</p>
                </div>

                <div className="flex-shrink-0 text-[var(--text-tertiary)]">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </button>

              {/* Step content */}
              {isExpanded && (
                <div className="border-t border-[var(--border-default)] animate-fade-in">
                  <div className="p-6">
                    {step.id === 'tenant' && <TenantConfig />}
                    {step.id === 'boundary' && (
                      <BoundaryConfig value={boundaryApproach} onChange={setBoundaryApproach} />
                    )}
                    {step.id === 'frameworks' && (
                      <FrameworkConfig selected={selectedFrameworks} onToggle={toggleFramework} />
                    )}
                    {step.id === 'groups' && <GroupsConfig />}
                    {step.id === 'subdivisions' && <SubdivisionsConfig />}
                    {step.id === 'sources' && <SourcesConfig />}
                    {step.id === 'grid' && <GridConfig />}
                  </div>

                  {/* Step footer */}
                  <div className="border-t border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between bg-[var(--bg-secondary)]">
                    <div className="flex items-center gap-2 text-[var(--text-xs)] text-[var(--text-tertiary)]">
                      <Info className="w-3.5 h-3.5" />
                      <span>Changes are saved automatically</span>
                    </div>
                    <button
                      onClick={() => markComplete(step.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-inverse)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                    >
                      <span>Mark Complete & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* ── Example state (when all complete) ── */}
      {completedSteps.size === STEPS.length && (
        <Card className="animate-fade-in border-[var(--accent-teal)] bg-[var(--accent-teal-subtle)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-teal)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-glow-teal)]">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display text-[var(--text-lg)] font-bold text-[var(--text-primary)]">
                Organisation setup complete
              </h3>
              <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1">
                Your tenant, hierarchy, and frameworks are configured. You can now proceed to data collection.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Badge variant="teal" dot>7 / 7 steps</Badge>
                <Badge variant="blue" dot>{selectedFrameworks.size} frameworks</Badge>
                <Badge variant="purple" dot>{DEMO_GROUPS.length} groups</Badge>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════
   Step sub-components
   ═══════════════════════════════════════════ */

function TenantConfig() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Company Name" defaultValue="PTT Global Chemical PCL" />
        <Input label="Trading Name" defaultValue="PTTGC" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Select
          label="Fiscal Year Start"
          options={[
            { value: 'jan', label: 'January' },
            { value: 'apr', label: 'April' },
            { value: 'jul', label: 'July' },
            { value: 'oct', label: 'October' },
          ]}
          defaultValue="jan"
        />
        <Input label="Base Year" type="number" defaultValue="2019" />
        <Select
          label="Reporting Currency"
          options={[
            { value: 'THB', label: 'THB — Thai Baht' },
            { value: 'USD', label: 'USD — US Dollar' },
            { value: 'EUR', label: 'EUR — Euro' },
          ]}
          defaultValue="THB"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Registered Country" defaultValue="Thailand" />
        <Input label="Industry Sector" defaultValue="Petrochemicals & Refining" />
      </div>

      {/* Info panel */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--accent-blue-light)] border border-blue-100">
        <AlertCircle className="w-4 h-4 text-[var(--accent-blue)] flex-shrink-0 mt-0.5" />
        <div className="text-[var(--text-xs)] text-[var(--accent-blue)] leading-relaxed">
          <strong>Base year</strong> is used for SBTi target calculations and trend comparisons. Choose the earliest year with reliable GHG inventory data.
        </div>
      </div>
    </div>
  )
}

function BoundaryConfig({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const approaches = [
    {
      id: 'operational',
      title: 'Operational Control',
      desc: 'Account for 100% of emissions from operations over which you have operational control. Most common approach.',
      recommended: true,
    },
    {
      id: 'financial',
      title: 'Financial Control',
      desc: 'Account for 100% of emissions from operations over which you have financial control.',
      recommended: false,
    },
    {
      id: 'equity',
      title: 'Equity Share',
      desc: 'Account for emissions proportional to your equity share in each operation.',
      recommended: false,
    },
  ]

  return (
    <div className="space-y-4">
      {approaches.map((approach) => (
        <button
          key={approach.id}
          onClick={() => onChange(approach.id)}
          className={`
            w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer
            ${value === approach.id
              ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-subtle)] shadow-[var(--shadow-glow-teal)]'
              : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
            }
          `}
        >
          <div className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
            ${value === approach.id
              ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]'
              : 'border-[var(--border-strong)]'
            }
          `}>
            {value === approach.id && <Circle className="w-2 h-2 text-white fill-white" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{approach.title}</span>
              {approach.recommended && <Badge variant="teal">Recommended</Badge>}
            </div>
            <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1 leading-relaxed">{approach.desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function FrameworkConfig({ selected, onToggle }: { selected: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {FRAMEWORK_LIST.map((fw) => {
          const isSelected = selected.has(fw.id)
          return (
            <button
              key={fw.id}
              onClick={() => onToggle(fw.id)}
              className={`
                flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer
                ${isSelected
                  ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-subtle)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                ${isSelected
                  ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]'
                  : 'border-[var(--border-strong)]'
                }
              `}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{fw.label}</span>
                  <Badge variant={fw.color}>v{fw.version}</Badge>
                </div>
              </div>
              <Badge variant={fw.status === 'active' ? 'green' : 'amber'} dot>
                {fw.status === 'active' ? 'Active' : 'Setup pending'}
              </Badge>
            </button>
          )
        })}
      </div>
      <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
        {selected.size} framework{selected.size !== 1 ? 's' : ''} selected. Questionnaire modules will be generated based on your selection.
      </p>
    </div>
  )
}

function GroupsConfig() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
          {DEMO_GROUPS.length} business groups defined
        </p>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border-strong)] text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] hover:bg-[var(--accent-teal-subtle)] transition-all cursor-pointer">
          <Plus className="w-3.5 h-3.5" />
          Add group
        </button>
      </div>

      <div className="space-y-2">
        {DEMO_GROUPS.map((group) => (
          <div
            key={group.name}
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center">
              <Network className="w-4 h-4 text-[var(--text-tertiary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] block">{group.name}</span>
              <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
                {group.subsidiaries} subsidiaries &middot; {group.subdivisions} subdivisions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="gray">{group.subdivisions} sites</Badge>
              <button className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-light)] transition-colors cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubdivisionsConfig() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
          {DEMO_SUBDIVISIONS.length} subdivisions registered across all groups
        </p>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border-strong)] text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] hover:bg-[var(--accent-teal-subtle)] transition-all cursor-pointer">
          <Plus className="w-3.5 h-3.5" />
          Add subdivision
        </button>
      </div>

      {/* Table-like list */}
      <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Facility</span>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Group</span>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Country</span>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Type</span>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider text-right">Sources</span>
        </div>
        {DEMO_SUBDIVISIONS.map((sub, i) => (
          <div
            key={sub.name}
            className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-[var(--bg-hover)] transition-colors ${
              i < DEMO_SUBDIVISIONS.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <MapPin className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
              <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)] truncate">{sub.name}</span>
            </div>
            <Badge variant="gray">{sub.group}</Badge>
            <span className="text-[var(--text-sm)] text-[var(--text-secondary)] font-mono">{sub.country}</span>
            <Badge variant="blue">{sub.type}</Badge>
            <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] tabular-nums text-right">{sub.sources}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SourcesConfig() {
  return (
    <div className="space-y-5">
      <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
        Emission sources are auto-routed to the correct GHG Protocol calculator module based on type.
      </p>

      {/* Auto-routing table */}
      <div className="space-y-2">
        {SOURCE_TYPES.map((src) => (
          <div
            key={src.type}
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)] transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{src.type}</span>
              <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] ml-2">{src.count} sources</span>
            </div>

            {/* Routing arrow */}
            <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
              <div className="w-16 h-[2px] bg-[var(--border-default)] relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[5px] border-l-[var(--border-strong)] border-y-[3px] border-y-transparent" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={src.color}>
                <Cpu className="w-3 h-3 mr-1" />
                {src.calculator}
              </Badge>
              <Badge variant="gray">{src.scope}</Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[var(--text-xs)] text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent-teal)]" />Scope 1</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent-amber)]" />Scope 2</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent-purple)]" />Scope 3</span>
      </div>
    </div>
  )
}

function GridConfig() {
  return (
    <div className="space-y-5">
      <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
        Map each facility to its electricity grid subregion for location-based Scope 2 emission factors.
      </p>

      <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Facility</span>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Grid Subregion</span>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">EF</span>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Unit</span>
        </div>
        {GRID_REGIONS.map((row, i) => (
          <div
            key={row.facility}
            className={`grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-[var(--bg-hover)] transition-colors ${
              i < GRID_REGIONS.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
            }`}
          >
            <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)]">{row.facility}</span>
            <Badge variant="blue">{row.grid}</Badge>
            <span className="text-[var(--text-sm)] font-mono font-semibold text-[var(--text-primary)] tabular-nums">{row.ef}</span>
            <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] font-mono">{row.unit}</span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--accent-amber-light)] border border-amber-100">
        <AlertCircle className="w-4 h-4 text-[var(--accent-amber)] flex-shrink-0 mt-0.5" />
        <div className="text-[var(--text-xs)] text-[var(--accent-amber)] leading-relaxed">
          <strong>Grid subregion EFs</strong> are sourced from IEA/IPCC databases and updated annually. Market-based EFs from supplier contracts are managed separately.
        </div>
      </div>
    </div>
  )
}
