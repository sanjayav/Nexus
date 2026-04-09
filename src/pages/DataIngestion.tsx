import { useState } from 'react'
import {
  Building2,
  FileSpreadsheet,
  Activity,
  Users,
  Truck,
  ChevronRight,
  ArrowLeft,
  Database,
  Upload,
  ShieldCheck,
  Plug,
  Brain,
} from 'lucide-react'
import { Card, Badge } from '../design-system'
import OrganisationSetup from './OrganisationSetup'
import RawSupplierIngestion from './RawSupplierIngestion'
import MeasuredData from './MeasuredData'
import EntitySubmissions from './EntitySubmissions'
import SupplierData from './SupplierData'

/* ═══════════════════════════════════════════
   Module definitions
   ═══════════════════════════════════════════ */
interface DataModule {
  id: string
  title: string
  subtitle: string
  desc: string
  icon: typeof Building2
  accent: string
  color: 'teal' | 'blue' | 'purple' | 'amber' | 'green'
  status: 'live' | 'ready' | 'beta'
  stats: { label: string; value: string }[]
}

const MODULES: DataModule[] = [
  {
    id: 'org-setup',
    title: 'Organisation Setup',
    subtitle: 'Tenant, boundaries & frameworks',
    desc: 'Configure your organisational boundary, reporting frameworks (GRI, CSRD, ISSB), business groups, facilities, and emission source registration.',
    icon: Building2,
    accent: 'var(--accent-teal)',
    color: 'teal',
    status: 'live',
    stats: [{ label: 'Steps', value: '7' }, { label: 'Frameworks', value: '5' }],
  },
  {
    id: 'raw-supplier',
    title: 'Raw Data Upload',
    subtitle: 'Excel/CSV ingestion & column mapping',
    desc: 'Upload raw GHG activity data from any format. Smart column detection maps your spreadsheet columns to the standard emission data model.',
    icon: FileSpreadsheet,
    accent: 'var(--accent-blue)',
    color: 'blue',
    status: 'live',
    stats: [{ label: 'Formats', value: '.xlsx .csv' }, { label: 'Fields', value: '21' }],
  },
  {
    id: 'measured',
    title: 'Measured Data',
    subtitle: 'CEMS, meters, labs & verified data',
    desc: 'Ingest continuous emission monitoring (CEMS), utility meter readings, lab test results, and third-party verified data with QA classification.',
    icon: Activity,
    accent: 'var(--accent-purple)',
    color: 'purple',
    status: 'live',
    stats: [{ label: 'Sources', value: '91' }, { label: 'Quality', value: '98.4%' }],
  },
  {
    id: 'entities',
    title: 'Entity Submissions',
    subtitle: 'Intercompany, subsidiary & supplier data',
    desc: 'Collect emission data from divisions, subsidiaries, and suppliers using standardised templates. Track submission status and validate on upload.',
    icon: Users,
    accent: 'var(--accent-amber)',
    color: 'amber',
    status: 'live',
    stats: [{ label: 'Entities', value: '48+' }, { label: 'Templates', value: '4' }],
  },
  {
    id: 'suppliers',
    title: 'Supplier Data',
    subtitle: 'Scope 3 supply chain emissions',
    desc: 'Manage Scope 3 supplier-level emissions — upload actual data, track completeness, and replace spend-based estimates with measured values.',
    icon: Truck,
    accent: 'var(--accent-green)',
    color: 'green',
    status: 'live',
    stats: [{ label: 'Suppliers', value: '10+' }, { label: 'Completeness', value: '67%' }],
  },
]

const statusConfig = {
  live: { label: 'Live', badge: 'green' as const },
  ready: { label: 'Ready', badge: 'teal' as const },
  beta: { label: 'Beta', badge: 'amber' as const },
}

/* ═══════════════════════════════════════════
   Pipeline steps (shown in the landing)
   ═══════════════════════════════════════════ */
const PIPELINE_STEPS = [
  { icon: Upload, label: 'Ingest', desc: 'Raw files, APIs, manual entry' },
  { icon: ShieldCheck, label: 'Validate', desc: 'Schema checks, completeness' },
  { icon: Brain, label: 'Classify', desc: 'Auto-scope, factor matching' },
  { icon: Plug, label: 'Route', desc: 'Direct or hybrid path' },
  { icon: Database, label: 'Store', desc: 'Unified emission repository' },
]

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
type View = 'landing' | string

export default function DataIngestion() {
  const [view, setView] = useState<View>('landing')

  const activeModule = MODULES.find(m => m.id === view)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Landing header — only on module picker */}
      {view === 'landing' && (
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">Data Collection</h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">Upload, validate, and classify emission data from all sources.</p>
        </div>
      )}

      {/* Breadcrumb bar when inside a module */}
      {view !== 'landing' && (
        <div className="flex items-center gap-1.5 text-[var(--text-sm)]">
          <button onClick={() => setView('landing')} className="inline-flex items-center gap-1 text-[var(--accent-teal)] font-medium hover:underline underline-offset-2 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Data Collection
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-primary)] font-semibold">{activeModule?.title ?? view}</span>
        </div>
      )}

      {/* Landing view */}
      {view === 'landing' && (
        <div className="space-y-8 animate-fade-in">
          {/* Pipeline overview */}
          <Card padding="sm">
            <div className="flex items-center justify-between">
              {PIPELINE_STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={step.label} className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-teal-light)] border border-teal-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[var(--accent-teal)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)]">{step.label}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] truncate">{step.desc}</p>
                      </div>
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 mx-1" />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Module cards */}
          <div className="grid grid-cols-3 gap-5">
            {MODULES.map((mod) => {
              const Icon = mod.icon
              const cfg = statusConfig[mod.status]
              return (
                <button
                  key={mod.id}
                  onClick={() => setView(mod.id)}
                  className="text-left cursor-pointer group"
                >
                  <Card hover className="h-full relative overflow-hidden">
                    {/* Accent bar */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ background: `linear-gradient(90deg, ${mod.accent}, transparent)` }}
                    />

                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: `${mod.accent}10`, border: `1.5px solid ${mod.accent}30` }}
                      >
                        <Icon className="w-7 h-7" style={{ color: mod.accent }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={cfg.badge} dot>{cfg.label}</Badge>
                        <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-teal)] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    <h3 className="font-display text-[var(--text-lg)] font-bold text-[var(--text-primary)]">{mod.title}</h3>
                    <p className="text-[var(--text-xs)] font-medium text-[var(--text-secondary)] mt-0.5">{mod.subtitle}</p>
                    <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-2 leading-relaxed">{mod.desc}</p>

                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[var(--border-subtle)]">
                      {mod.stats.map((stat, i) => (
                        <div key={stat.label} className="flex items-center gap-3">
                          {i > 0 && <div className="w-px h-8 bg-[var(--border-subtle)]" />}
                          <div>
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{stat.label}</p>
                            <p className="text-[var(--text-base)] font-bold tabular-nums" style={{ color: mod.accent }}>{stat.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Module views */}
      {view === 'org-setup' && <OrganisationSetup />}
      {view === 'raw-supplier' && <RawSupplierIngestion />}
      {view === 'measured' && <MeasuredData />}
      {view === 'entities' && <EntitySubmissions />}
      {view === 'suppliers' && <SupplierData />}
    </div>
  )
}
