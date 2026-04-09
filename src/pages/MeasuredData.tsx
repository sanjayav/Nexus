import { useState } from 'react'
import {
  Gauge,
  Zap,
  ShieldCheck,
  FlaskConical,
  ArrowRight,
  ArrowRightLeft,
  Database,
  GitMerge,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Activity,
  Eye,
  Layers,
  ChevronRight,
  Radio,
} from 'lucide-react'
import { Card, Badge, Tabs } from '../design-system'

/* ── Source type definitions ── */
const SOURCE_TYPES = [
  {
    id: 'cems',
    title: 'CEMS',
    fullTitle: 'Continuous Emission Monitoring Systems',
    desc: 'Real-time stack monitoring with 15-min data intervals. Direct GHG measurement.',
    icon: Gauge,
    accent: 'var(--accent-teal)',
    color: 'teal' as const,
    readings: '4.2M',
    sources: 14,
    quality: 'A+',
    frequency: 'Continuous',
  },
  {
    id: 'utility',
    title: 'Utility Meters',
    fullTitle: 'Utility Metering & Sub-metering',
    desc: 'Electricity, gas, water, and steam meters with automated reading capture.',
    icon: Zap,
    accent: 'var(--accent-blue)',
    color: 'blue' as const,
    readings: '892K',
    sources: 47,
    quality: 'A',
    frequency: 'Hourly',
  },
  {
    id: 'verified',
    title: '3rd-Party Verified',
    fullTitle: 'Third-Party Verified Data',
    desc: 'Externally audited data from certified verification bodies (SGS, Bureau Veritas, etc.).',
    icon: ShieldCheck,
    accent: 'var(--accent-purple)',
    color: 'purple' as const,
    readings: '156K',
    sources: 8,
    quality: 'A+',
    frequency: 'Monthly',
  },
  {
    id: 'lab',
    title: 'Stack Tests / Lab',
    fullTitle: 'Stack Tests & Laboratory Analysis',
    desc: 'Periodic emission sampling, fuel analysis, and material composition testing.',
    icon: FlaskConical,
    accent: 'var(--accent-amber)',
    color: 'amber' as const,
    readings: '2,847',
    sources: 22,
    quality: 'B+',
    frequency: 'Quarterly',
  },
]

/* ── Pipeline stages (measured data path) ── */
const MEASURED_PIPELINE = [
  { id: 'normalise', title: 'Format Normalisation', desc: 'Convert units, standardise timestamps, align intervals', icon: Filter },
  { id: 'qa', title: 'Quality Assurance', desc: 'Outlier detection, gap filling, completeness scoring', icon: Activity },
  { id: 'classify', title: 'Classification & Scope Tagging', desc: 'Map to GHG scope, assign source categories', icon: Layers },
]

/* ── Path routing ── */
const DATA_PATHS = [
  {
    id: 'direct',
    title: 'Direct Path',
    subtitle: 'Bypass Calculator',
    desc: 'Pre-calculated or directly measured emissions — no calculator module needed. CEMS data and verified totals go here.',
    icon: ArrowRight,
    color: 'teal' as const,
    accent: 'var(--accent-teal)',
    records: '3.8M',
    pct: 72,
  },
  {
    id: 'hybrid',
    title: 'Hybrid Path',
    subtitle: 'Partial Calculation Required',
    desc: 'Measured activity data that still needs emission factor application or unit conversion through a calculator module.',
    icon: ArrowRightLeft,
    color: 'amber' as const,
    accent: 'var(--accent-amber)',
    records: '1.5M',
    pct: 28,
  },
]

/* ── Reconciliation rules ── */
const RECON_RULES = [
  { rule: 'CEMS vs calculated: prefer CEMS when delta < 5%', status: 'active' as const, matches: 342 },
  { rule: 'Utility meter vs invoice: flag if delta > 2%', status: 'active' as const, matches: 89 },
  { rule: 'Verified totals override calculated when certified', status: 'active' as const, matches: 156 },
  { rule: 'Lab results override EFs for tested fuel batches', status: 'active' as const, matches: 47 },
  { rule: 'Gap-fill rule: interpolate up to 72hr CEMS gaps', status: 'warning' as const, matches: 18 },
]

/* ── Quality metrics ── */
const QUALITY_METRICS = [
  { label: 'Data Completeness', value: 98.4, target: 95, unit: '%' },
  { label: 'Temporal Coverage', value: 99.1, target: 98, unit: '%' },
  { label: 'Source Coverage', value: 91, target: 90, unit: 'sources' },
  { label: 'Anomaly Rate', value: 0.3, target: 1.0, unit: '%', inverted: true },
]

export default function MeasuredData() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">
            Measured & Reported Data
          </h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">
            4 measured data source types with direct and hybrid processing paths. Reconciled at the aggregator.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent-green-light)] border border-green-200">
            <Radio className="w-3 h-3 text-[var(--accent-green)] animate-pulse-soft" />
            <span className="text-[var(--text-xs)] font-semibold text-[var(--accent-green)]">Live</span>
          </div>
          <Badge variant="gray">Last sync: 2 min ago</Badge>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'paths', label: 'Processing Paths' },
          { id: 'reconciliation', label: 'Reconciliation', count: RECON_RULES.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'paths' && <ProcessingPathsTab />}
      {activeTab === 'reconciliation' && <ReconciliationTab />}
    </div>
  )
}


/* ═══════════════════════════════════
   Overview tab
   ═══════════════════════════════════ */
function OverviewTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Quality metric cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {QUALITY_METRICS.map((metric) => {
          const isGood = metric.inverted
            ? metric.value <= metric.target
            : metric.value >= metric.target
          return (
            <Card key={metric.label} hover className="group relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity`}
                style={{ background: `linear-gradient(90deg, ${isGood ? 'var(--accent-green)' : 'var(--accent-amber)'}, transparent)` }} />
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em]">{metric.label}</p>
              <div className="flex items-end gap-1 mt-1">
                <span className="font-display text-[var(--text-3xl)] font-bold text-[var(--text-primary)] tabular-nums">{metric.value}</span>
                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-1">{metric.unit}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((metric.inverted ? (metric.target / Math.max(metric.value, 0.01)) : (metric.value / metric.target)) * 100, 100)}%`,
                      backgroundColor: isGood ? 'var(--accent-green)' : 'var(--accent-amber)',
                    }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
                  target: {metric.target}{metric.unit === '%' ? '%' : ''}
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ── Source type cards ── */}
      <div>
        <h2 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-3">Source Types</h2>
        <div className="grid grid-cols-2 gap-4">
          {SOURCE_TYPES.map((src) => {
            const Icon = src.icon
            return (
              <Card key={src.id} hover className="group">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-105"
                    style={{
                      backgroundColor: `${src.accent}10`,
                      border: `1.5px solid ${src.accent}30`,
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: src.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{src.title}</h3>
                      <Badge variant={src.color}>{src.fullTitle.split(' ')[0]}</Badge>
                    </div>
                    <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1 leading-relaxed">{src.desc}</p>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Readings</p>
                        <p className="text-[var(--text-sm)] font-bold text-[var(--text-primary)] tabular-nums">{src.readings}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Sources</p>
                        <p className="text-[var(--text-sm)] font-bold text-[var(--text-primary)] tabular-nums">{src.sources}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Quality</p>
                        <p className="text-[var(--text-sm)] font-bold text-[var(--accent-green)]">{src.quality}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Frequency</p>
                        <p className="text-[var(--text-sm)] font-bold text-[var(--text-primary)]">{src.frequency}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ── Processing pipeline ── */}
      <div>
        <h2 className="text-[var(--text-base)] font-semibold text-[var(--text-primary)] mb-3">Processing Pipeline</h2>
        <Card padding="lg">
          <div className="flex items-center gap-0">
            {/* Source input */}
            <div className="text-center flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center justify-center mx-auto">
                <Database className="w-5 h-5 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mt-2">4 Sources</p>
            </div>

            <div className="flex items-center px-2 flex-shrink-0">
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
            </div>

            {/* Pipeline stages */}
            {MEASURED_PIPELINE.map((stage, i) => {
              const Icon = stage.icon
              return (
                <div key={stage.id} className="flex items-center flex-1">
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 rounded-xl bg-[var(--accent-blue-light)] border border-blue-100 flex items-center justify-center mx-auto">
                      <Icon className="w-5 h-5 text-[var(--accent-blue)]" />
                    </div>
                    <h4 className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] mt-2">{stage.title}</h4>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 max-w-[140px] mx-auto">{stage.desc}</p>
                  </div>
                  {i < MEASURED_PIPELINE.length - 1 && (
                    <div className="flex items-center px-1 flex-shrink-0">
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </div>
                  )}
                </div>
              )
            })}

            <div className="flex items-center px-2 flex-shrink-0">
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
            </div>

            {/* Path split */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {DATA_PATHS.map((path) => {
                const PathIcon = path.icon
                return (
                  <div
                    key={path.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: `${path.accent}08`,
                      borderColor: `${path.accent}25`,
                    }}
                  >
                    <PathIcon className="w-4 h-4" style={{ color: path.accent }} />
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-primary)]">{path.title}</p>
                      <p className="text-[9px] text-[var(--text-tertiary)]">{path.pct}%</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center px-2 flex-shrink-0">
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
            </div>

            {/* Repository */}
            <div className="text-center flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-green-light)] border border-green-100 flex items-center justify-center mx-auto">
                <Database className="w-5 h-5 text-[var(--accent-green)]" />
              </div>
              <p className="text-[10px] font-semibold text-[var(--accent-green)] mt-2">Repository</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════
   Processing Paths tab
   ═══════════════════════════════════ */
function ProcessingPathsTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Path cards */}
      <div className="grid grid-cols-2 gap-4">
        {DATA_PATHS.map((path) => {
          const PathIcon = path.icon
          return (
            <Card key={path.id} hover className="group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, ${path.accent}, transparent)` }} />

              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${path.accent}10`,
                    border: `1.5px solid ${path.accent}30`,
                  }}
                >
                  <PathIcon className="w-7 h-7" style={{ color: path.accent }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[var(--text-base)] font-bold text-[var(--text-primary)]">{path.title}</h3>
                    <Badge variant={path.color}>{path.subtitle}</Badge>
                  </div>
                  <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1 leading-relaxed">{path.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex-1">
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Records</p>
                  <p className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tabular-nums">{path.records}</p>
                </div>
                <div className="w-24">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--text-tertiary)]">Share</span>
                    <span className="text-[var(--text-xs)] font-bold tabular-nums" style={{ color: path.accent }}>{path.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${path.pct}%`,
                        backgroundColor: path.accent,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Detailed routing table */}
      <Card>
        <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-4">Source-to-Path Routing</h3>
        <div className="space-y-2">
          {[
            { source: 'CEMS — Stack Monitors', path: 'Direct', reason: 'Direct GHG measurement, no calculation needed', records: '4.2M', color: 'teal' as const },
            { source: 'Utility Meters — Electricity', path: 'Hybrid', reason: 'kWh measured, needs grid EF application', records: '620K', color: 'amber' as const },
            { source: 'Utility Meters — Natural Gas', path: 'Direct', reason: 'Volume + composition known, direct CO2e', records: '272K', color: 'teal' as const },
            { source: '3rd-Party Verified Totals', path: 'Direct', reason: 'Certified tCO2e values bypass calculation', records: '156K', color: 'teal' as const },
            { source: 'Lab — Fuel Analysis', path: 'Hybrid', reason: 'Composition data routes to combustion calc', records: '1,847', color: 'amber' as const },
            { source: 'Lab — Process Samples', path: 'Hybrid', reason: 'Material balance → process emission calc', records: '1,000', color: 'amber' as const },
          ].map((row) => (
            <div
              key={row.source}
              className="flex items-center gap-4 p-3 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)]">{row.source}</span>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{row.reason}</p>
              </div>
              <Badge variant={row.color}>{row.path}</Badge>
              <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] tabular-nums w-16 text-right">{row.records}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}


/* ═══════════════════════════════════
   Reconciliation tab
   ═══════════════════════════════════ */
function ReconciliationTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Reconciliation overview */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Rules', value: '5', icon: GitMerge, accent: 'var(--accent-teal)' },
          { label: 'Matches Applied', value: '652', icon: CheckCircle2, accent: 'var(--accent-green)' },
          { label: 'Conflicts Flagged', value: '18', icon: AlertTriangle, accent: 'var(--accent-amber)' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} hover className="group">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${stat.accent}10`,
                    border: `1px solid ${stat.accent}25`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.accent }} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{stat.label}</p>
                  <p className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tabular-nums">{stat.value}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Reconciliation rules */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Aggregator Reconciliation Rules</h3>
          <Badge variant="teal" dot>Auto-applied</Badge>
        </div>
        <div className="space-y-2">
          {RECON_RULES.map((rule) => (
            <div
              key={rule.rule}
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] transition-all"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                rule.status === 'active'
                  ? 'bg-[var(--accent-green-light)] text-[var(--accent-green)]'
                  : 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)]'
              }`}>
                {rule.status === 'active' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)]">{rule.rule}</span>
              </div>
              <Badge variant={rule.status === 'active' ? 'green' : 'amber'} dot>
                {rule.status === 'active' ? 'Active' : 'Review'}
              </Badge>
              <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] tabular-nums w-12 text-right">{rule.matches}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* How it works */}
      <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
        <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-3">How Reconciliation Works</h3>
        <div className="flex items-center gap-4">
          {[
            { step: 1, label: 'Measured + calculated data enters aggregator', icon: Database },
            { step: 2, label: 'Rules compare overlapping sources', icon: GitMerge },
            { step: 3, label: 'Best-quality source wins, delta logged', icon: CheckCircle2 },
            { step: 4, label: 'Conflicts flagged for manual review', icon: Eye },
          ].map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.step} className="flex items-center flex-1">
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] flex items-center justify-center mx-auto shadow-[var(--shadow-xs)]">
                    <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>
                  <p className="text-[10px] font-semibold text-[var(--text-primary)] mt-2">Step {step.step}</p>
                  <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5 max-w-[120px] mx-auto leading-relaxed">{step.label}</p>
                </div>
                {i < 3 && (
                  <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
