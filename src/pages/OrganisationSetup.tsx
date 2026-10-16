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
import { useTranslation } from 'react-i18next'
import { Card, Badge, Input, Select } from '../design-system'
import { useFmt, unit as unitFmt } from '../lib/fmt'

/* ── Step definitions ── */
const STEPS = [
  {
    id: 'tenant',
    number: 1,
    titleKey: 'orgSetup.steps.tenant.title',
    descKey: 'orgSetup.steps.tenant.desc',
    icon: Building2,
    accent: 'var(--color-brand)',
  },
  {
    id: 'boundary',
    number: 2,
    titleKey: 'orgSetup.steps.boundary.title',
    descKey: 'orgSetup.steps.boundary.desc',
    icon: Globe2,
    accent: 'var(--color-brand)',
  },
  {
    id: 'frameworks',
    number: 3,
    titleKey: 'orgSetup.steps.frameworks.title',
    descKey: 'orgSetup.steps.frameworks.desc',
    icon: FileCheck,
    accent: 'var(--color-brand)',
  },
  {
    id: 'groups',
    number: 4,
    titleKey: 'orgSetup.steps.groups.title',
    descKey: 'orgSetup.steps.groups.desc',
    icon: Network,
    accent: 'var(--color-brand)',
  },
  {
    id: 'subdivisions',
    number: 5,
    titleKey: 'orgSetup.steps.subdivisions.title',
    descKey: 'orgSetup.steps.subdivisions.desc',
    icon: MapPin,
    accent: 'var(--color-brand)',
  },
  {
    id: 'sources',
    number: 6,
    titleKey: 'orgSetup.steps.sources.title',
    descKey: 'orgSetup.steps.sources.desc',
    icon: Cpu,
    accent: 'var(--color-brand)',
  },
  {
    id: 'grid',
    number: 7,
    titleKey: 'orgSetup.steps.grid.title',
    descKey: 'orgSetup.steps.grid.desc',
    icon: Map,
    accent: 'var(--color-brand)',
  },
]

/* ── Demo data for each step ── */
const FRAMEWORK_LIST = [
  { id: 'gri', labelKey: 'orgSetup.frameworks.labels.gri', version: '2021', status: 'active', color: 'teal' as const },
  { id: 'csrd', labelKey: 'orgSetup.frameworks.labels.csrd', version: '2024', status: 'active', color: 'blue' as const },
  { id: 'issb', labelKey: 'orgSetup.frameworks.labels.issb', version: '2023', status: 'pending', color: 'purple' as const },
  { id: 'tcfd', labelKey: 'orgSetup.frameworks.labels.tcfd', version: '2017', status: 'active', color: 'amber' as const },
  { id: 'cdp', labelKey: 'orgSetup.frameworks.labels.cdp', version: '2024', status: 'pending', color: 'green' as const },
]

const DEMO_GROUPS = [
  { name: 'Demo Co — Chemicals', nameKey: 'orgSetup.groups.names.chemicals', subsidiaries: 12, subdivisions: 34 },
  { name: 'Demo Co — Polymers', nameKey: 'orgSetup.groups.names.polymers', subsidiaries: 8, subdivisions: 22 },
  { name: 'Demo Co — Green Chemicals', nameKey: 'orgSetup.groups.names.greenChemicals', subsidiaries: 4, subdivisions: 11 },
]

const DEMO_SUBDIVISIONS = [
  { name: 'Olefins Plant Beta', group: 'Chemicals', groupKey: 'orgSetup.subdivisions.groupNames.chemicals', country: 'GB', type: 'Manufacturing', typeKey: 'orgSetup.subdivisions.types.manufacturing', sources: 18 },
  { name: 'Aromatics Complex Gamma', group: 'Chemicals', groupKey: 'orgSetup.subdivisions.groupNames.chemicals', country: 'GB', type: 'Refinery', typeKey: 'orgSetup.subdivisions.types.refinery', sources: 24 },
  { name: 'Polymers JV', group: 'Polymers', groupKey: 'orgSetup.subdivisions.groupNames.polymers', country: 'GB', type: 'Joint Venture', typeKey: 'orgSetup.subdivisions.types.jointVenture', sources: 9 },
  { name: 'HQ Office', group: 'Green Chemicals', groupKey: 'orgSetup.subdivisions.groupNames.greenChemicals', country: 'GB', type: 'Office', typeKey: 'orgSetup.subdivisions.types.office', sources: 3 },
]

const SOURCE_TYPES = [
  { type: 'Stationary Combustion', typeKey: 'orgSetup.sources.types.stationary', calculator: 'GHG-STAT-v4.2', scope: 'S1', count: 42, color: 'teal' as const },
  { type: 'Mobile Combustion', typeKey: 'orgSetup.sources.types.mobile', calculator: 'GHG-TRANS-v2.7', scope: 'S1', count: 18, color: 'blue' as const },
  { type: 'Process Emissions', typeKey: 'orgSetup.sources.types.process', calculator: 'GHG-HFC-v1', scope: 'S1', count: 7, color: 'purple' as const },
  { type: 'Purchased Electricity', typeKey: 'orgSetup.sources.types.electricity', calculator: 'GHG-ELEC-v3.1', scope: 'S2', count: 34, color: 'amber' as const },
  { type: 'Purchased Heat/Steam', typeKey: 'orgSetup.sources.types.heat', calculator: 'GHG-HEAT-v2.0', scope: 'S2', count: 12, color: 'red' as const },
]

const GRID_REGIONS = [
  { facility: 'Map Ta Phut Olefins', grid: 'TH-MEA-Central', ef: '0.4999', unit: 'kgCO2e/kWh' },
  { facility: 'Rayong Aromatics', grid: 'TH-PEA-Eastern', ef: '0.5123', unit: 'kgCO2e/kWh' },
  { facility: 'Nanjing JV', grid: 'CN-ECGD-Jiangsu', ef: '0.7921', unit: 'kgCO2e/kWh' },
  { facility: 'Bangkok HQ', grid: 'TH-MEA-Central', ef: '0.4999', unit: 'kgCO2e/kWh' },
]

export default function OrganisationSetup() {
  const { t } = useTranslation()
  const f = useFmt()
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="type-h1 text-[var(--text-primary)]">
            {t('orgSetup.title')}
          </h1>
          <p className="mt-1 text-small text-[var(--text-secondary)]">
            {t('orgSetup.subtitle', { count: STEPS.length })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-caption font-medium text-[var(--text-tertiary)]">{t('orgSetup.progress')}</p>
            <p className="type-figure text-h2 text-[var(--text-primary)]">{f.percent(completionPct)}</p>
          </div>
          <div className="w-12 h-12 relative">
            <svg width={48} height={48} className="-rotate-90">
              <circle cx={24} cy={24} r={20} fill="none" stroke="var(--bg-tertiary)" strokeWidth={4} />
              <circle
                cx={24} cy={24} r={20} fill="none"
                stroke="var(--color-brand)" strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - completionPct / 100)}
                style={{ transition: 'stroke-dashoffset 0.6s var(--ease-out-expo)' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-caption font-semibold text-[var(--text-secondary)] tabular-nums">
              {completedSteps.size}/{STEPS.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Progress track ── */}
      <nav className="flex items-center gap-0" aria-label={t('orgSetup.progress')}>
        {STEPS.map((step, i) => {
          const done = completedSteps.has(step.id)
          const active = expandedStep === step.id
          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                aria-label={`${t('orgSetup.stepLabel', { number: step.number })} · ${t(step.titleKey)}`}
                aria-current={active ? 'step' : undefined}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-caption font-semibold tabular-nums
                  transition-colors duration-fast ease-out cursor-pointer flex-shrink-0
                  ${done
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                    : active
                      ? 'bg-[var(--bg-primary)] text-[var(--color-brand-strong)] ring-2 ring-[var(--color-brand)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:bg-[var(--border-strong)]'
                  }
                `}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : step.number}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-[2px] mx-1 rounded-full transition-colors duration-base ${
                  done ? 'bg-[var(--color-brand)]' : 'bg-[var(--border-default)]'
                }`} />
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Steps ── */}
      <div className="space-y-3">
        {STEPS.map((step) => {
          const Icon = step.icon
          const isExpanded = expandedStep === step.id
          const isDone = completedSteps.has(step.id)

          return (
            <Card key={step.id} padding="none" className={`overflow-hidden transition-shadow duration-base ${isExpanded ? 'shadow-[var(--shadow-raised)]' : ''}`}>
              {/* Step header */}
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                aria-expanded={isExpanded}
                className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center flex-shrink-0 transition-colors duration-base"
                  style={{
                    backgroundColor: isDone || isExpanded ? 'var(--color-brand-soft)' : 'var(--bg-secondary)',
                    border: `1px solid ${isDone ? 'var(--color-brand)' : isExpanded ? 'var(--status-success-line)' : 'var(--border-default)'}`,
                  }}
                >
                  {isDone ? (
                    <Check className="w-5 h-5 text-[var(--color-brand-strong)]" />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: isExpanded ? step.accent : 'var(--text-tertiary)' }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-medium text-[var(--text-tertiary)]">
                      {t('orgSetup.stepLabel', { number: step.number })}
                    </span>
                    {isDone && <Badge variant="teal" dot>{t('orgSetup.complete')}</Badge>}
                  </div>
                  <h3 className="text-h3 text-[var(--text-primary)] mt-0.5">{t(step.titleKey)}</h3>
                  <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t(step.descKey)}</p>
                </div>

                <div className="flex-shrink-0 text-[var(--text-tertiary)]">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </button>

              {/* Step content */}
              {isExpanded && (
                <div className="border-t border-[var(--border-default)] animate-fade-in">
                  <div className="p-4 sm:p-6">
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
                  <div className="border-t border-[var(--border-subtle)] px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)]">
                    <div className="flex items-center gap-2 text-caption text-[var(--text-tertiary)]">
                      <Info className="w-3.5 h-3.5" />
                      <span>{t('orgSetup.autoSaved')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => markComplete(step.id)}
                      className="btn-primary"
                    >
                      <span>{t('orgSetup.markComplete')}</span>
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
        <Card className="animate-fade-in border-[var(--status-success-line)] bg-[var(--color-brand-soft)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--btn-primary-bg)] flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-[var(--btn-primary-fg)]" />
            </div>
            <div className="min-w-0">
              <h3 className="type-h2 text-[var(--text-primary)]">
                {t('orgSetup.done.title')}
              </h3>
              <p className="text-small text-[var(--text-secondary)] mt-1">
                {t('orgSetup.done.body')}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Badge variant="teal" dot>{t('orgSetup.done.steps', { done: STEPS.length, total: STEPS.length })}</Badge>
                <Badge variant="blue" dot>{t('orgSetup.done.frameworks', { n: selectedFrameworks.size })}</Badge>
                <Badge variant="purple" dot>{t('orgSetup.done.groups', { n: DEMO_GROUPS.length })}</Badge>
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
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('orgSetup.tenant.companyName')} defaultValue="Demo Co PLC" />
        <Input label={t('orgSetup.tenant.tradingName')} defaultValue="Demo Co" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label={t('orgSetup.tenant.fiscalYearStart')}
          options={['jan', 'apr', 'jul', 'oct'].map(value => ({ value, label: t(`orgSetup.tenant.months.${value}`) }))}
          defaultValue="jan"
        />
        <Input label={t('orgSetup.tenant.baseYear')} type="number" defaultValue="2019" />
        <Select
          label={t('orgSetup.tenant.reportingCurrency')}
          options={['THB', 'USD', 'EUR'].map(value => ({ value, label: t(`orgSetup.tenant.currencies.${value}`) }))}
          defaultValue="THB"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('orgSetup.tenant.registeredCountry')} defaultValue={t('orgSetup.tenant.registeredCountryDefault')} />
        <Input label={t('orgSetup.tenant.industrySector')} defaultValue={t('orgSetup.tenant.industrySectorDefault')} />
      </div>

      {/* Info panel */}
      <div className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--status-info-soft)] border border-[var(--status-info-line)]">
        <AlertCircle className="w-4 h-4 text-[var(--status-info)] flex-shrink-0 mt-0.5" />
        <div className="text-small text-[var(--text-secondary)]">
          <strong>{t('orgSetup.tenant.infoStrong')}</strong>{t('orgSetup.tenant.infoBody')}
        </div>
      </div>
    </div>
  )
}

function BoundaryConfig({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const approaches = [
    {
      id: 'operational',
      title: t('orgSetup.boundary.operational.title'),
      desc: t('orgSetup.boundary.operational.desc'),
      recommended: true,
    },
    {
      id: 'financial',
      title: t('orgSetup.boundary.financial.title'),
      desc: t('orgSetup.boundary.financial.desc'),
      recommended: false,
    },
    {
      id: 'equity',
      title: t('orgSetup.boundary.equity.title'),
      desc: t('orgSetup.boundary.equity.desc'),
      recommended: false,
    },
  ]

  return (
    <div className="space-y-4">
      {approaches.map((approach) => (
        <button
          type="button"
          key={approach.id}
          onClick={() => onChange(approach.id)}
          aria-pressed={value === approach.id}
          className={`
            w-full flex items-start gap-4 p-4 rounded-[var(--radius-lg)] border text-left transition-all duration-200 cursor-pointer
            ${value === approach.id
              ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
              : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
            }
          `}
        >
          <div className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
            ${value === approach.id
              ? 'border-[var(--color-brand)] bg-[var(--btn-primary-bg)]'
              : 'border-[var(--border-strong)]'
            }
          `}>
            {value === approach.id && <Circle className="w-2 h-2 text-[var(--btn-primary-fg)] fill-current" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-small font-semibold text-[var(--text-primary)]">{approach.title}</span>
              {approach.recommended && <Badge variant="teal">{t('orgSetup.boundary.recommended')}</Badge>}
            </div>
            <p className="text-small text-[var(--text-secondary)] mt-1">{approach.desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function FrameworkConfig({ selected, onToggle }: { selected: Set<string>; onToggle: (id: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {FRAMEWORK_LIST.map((fw) => {
          const isSelected = selected.has(fw.id)
          return (
            <button
              type="button"
              key={fw.id}
              onClick={() => onToggle(fw.id)}
              aria-pressed={isSelected}
              className={`
                flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border text-left transition-all duration-200 cursor-pointer
                ${isSelected
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                ${isSelected
                  ? 'border-[var(--color-brand)] bg-[var(--btn-primary-bg)]'
                  : 'border-[var(--border-strong)]'
                }
              `}>
                {isSelected && <Check className="w-3 h-3 text-[var(--btn-primary-fg)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-small font-semibold text-[var(--text-primary)]">{t(fw.labelKey)}</span>
                  <Badge variant={fw.color}>v{fw.version}</Badge>
                </div>
              </div>
              <Badge variant={fw.status === 'active' ? 'green' : 'amber'} dot>
                {fw.status === 'active' ? t('orgSetup.frameworks.active') : t('orgSetup.frameworks.setupPending')}
              </Badge>
            </button>
          )
        })}
      </div>
      <p className="text-caption text-[var(--text-tertiary)]">
        {t('orgSetup.frameworks.selected', { count: selected.size })}
      </p>
    </div>
  )
}

function GroupsConfig() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-[var(--text-secondary)]">
          {t('orgSetup.groups.defined', { n: DEMO_GROUPS.length })}
        </p>
        <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-[var(--border-strong)] text-small font-medium text-[var(--text-secondary)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)] transition-colors cursor-pointer whitespace-nowrap">
          <Plus className="w-3.5 h-3.5" />
          {t('orgSetup.groups.add')}
        </button>
      </div>

      <div className="space-y-2">
        {DEMO_GROUPS.map((group) => (
          <div
            key={group.name}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)] transition-colors"
          >
            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center">
              <Network className="w-4 h-4 text-[var(--text-tertiary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-small font-semibold text-[var(--text-primary)] block">{t(group.nameKey)}</span>
              <span className="text-caption text-[var(--text-tertiary)]">
                {t('orgSetup.groups.summary', { subsidiaries: group.subsidiaries, subdivisions: group.subdivisions })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex"><Badge variant="gray">{t('orgSetup.groups.sites', { n: group.subdivisions })}</Badge></span>
              <button type="button" aria-label={t('orgSetup.groups.remove', { name: t(group.nameKey) })} className="p-2 rounded-md text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] transition-colors cursor-pointer">
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
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-[var(--text-secondary)]">
          {t('orgSetup.subdivisions.registered', { n: DEMO_SUBDIVISIONS.length })}
        </p>
        <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-[var(--border-strong)] text-small font-medium text-[var(--text-secondary)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)] transition-colors cursor-pointer whitespace-nowrap">
          <Plus className="w-3.5 h-3.5" />
          {t('orgSetup.subdivisions.add')}
        </button>
      </div>

      {/* Table-like list */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-x-auto">
        <div className="min-w-[560px]">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
          <span className="text-caption font-semibold text-[var(--text-tertiary)]">{t('orgSetup.subdivisions.cols.facility')}</span>
          <span className="text-caption font-semibold text-[var(--text-tertiary)]">{t('orgSetup.subdivisions.cols.group')}</span>
          <span className="text-caption font-semibold text-[var(--text-tertiary)]">{t('orgSetup.subdivisions.cols.country')}</span>
          <span className="text-caption font-semibold text-[var(--text-tertiary)]">{t('orgSetup.subdivisions.cols.type')}</span>
          <span className="text-caption font-semibold text-[var(--text-tertiary)] text-right">{t('orgSetup.subdivisions.cols.sources')}</span>
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
              <span className="text-small font-medium text-[var(--text-primary)] truncate">{sub.name}</span>
            </div>
            <Badge variant="gray">{t(sub.groupKey)}</Badge>
            <span className="text-small text-[var(--text-secondary)] font-mono">{sub.country}</span>
            <Badge variant="blue">{t(sub.typeKey)}</Badge>
            <span className="text-small font-semibold text-[var(--text-primary)] tabular-nums text-right">{sub.sources}</span>
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}

function SourcesConfig() {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <p className="text-small text-[var(--text-secondary)]">
        {t('orgSetup.sources.intro')}
      </p>

      {/* Auto-routing table */}
      <div className="space-y-2">
        {SOURCE_TYPES.map((src) => (
          <div
            key={src.type}
            className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)] transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <span className="text-small font-semibold text-[var(--text-primary)]">{t(src.typeKey)}</span>
              <span className="text-caption text-[var(--text-tertiary)] ml-2">{t('orgSetup.sources.count', { n: src.count })}</span>
            </div>

            {/* Routing arrow */}
            <div className="hidden sm:flex items-center gap-2 text-[var(--text-tertiary)]">
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--chart-s1)]" />{t('orgSetup.sources.scope1')}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--chart-s2)]" />{t('orgSetup.sources.scope2')}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--chart-s3)]" />{t('orgSetup.sources.scope3')}</span>
      </div>
    </div>
  )
}

function GridConfig() {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <p className="text-small text-[var(--text-secondary)]">
        {t('orgSetup.grid.intro')}
      </p>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-x-auto">
        <div className="min-w-[520px]">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
          <span className="text-caption font-semibold text-[var(--text-tertiary)]">{t('orgSetup.grid.cols.facility')}</span>
          <span className="text-caption font-semibold text-[var(--text-tertiary)]">{t('orgSetup.grid.cols.gridSubregion')}</span>
          <span className="text-caption font-semibold text-[var(--text-tertiary)]">{t('orgSetup.grid.cols.ef')}</span>
          <span className="text-caption font-semibold text-[var(--text-tertiary)]">{t('orgSetup.grid.cols.unit')}</span>
        </div>
        {GRID_REGIONS.map((row, i) => (
          <div
            key={row.facility}
            className={`grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-[var(--bg-hover)] transition-colors ${
              i < GRID_REGIONS.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
            }`}
          >
            <span className="text-small font-medium text-[var(--text-primary)]">{row.facility}</span>
            <Badge variant="blue">{row.grid}</Badge>
            <span className="text-small font-mono font-semibold text-[var(--text-primary)] tabular-nums">{row.ef}</span>
            <span className="text-caption text-[var(--text-tertiary)] font-mono">{unitFmt(row.unit)}</span>
          </div>
        ))}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--status-warning-soft)] border border-[var(--status-warning-line)]">
        <AlertCircle className="w-4 h-4 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
        <div className="text-small text-[var(--text-secondary)]">
          <strong>{t('orgSetup.grid.noteStrong')}</strong>{t('orgSetup.grid.noteBody')}
        </div>
      </div>
    </div>
  )
}
