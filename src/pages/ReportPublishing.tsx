import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileOutput,
  FileText,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Shield,
  Loader2,
  Eye,
  Sparkles,
  Bot,
  ArrowUpRight,
  BarChart3,
  Globe,
  Lock,
  Send,
  BookOpen,
  AlertTriangle,
  Calendar,
  Hash,
} from 'lucide-react'
import { publishableReports, PublishableReport } from '../data/moduleData'
import { frameworkStatuses } from '../data/pttgcData'
import { Badge, Tabs, Button } from '../design-system'

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */
const FRAMEWORK_COLORS: Record<string, { color: string; badge: 'green' | 'blue' | 'purple' | 'amber' }> = {
  cdp: { color: '#16A34A', badge: 'green' },
  tcfd: { color: '#2563EB', badge: 'blue' },
  gri: { color: '#7C3AED', badge: 'purple' },
  csrd: { color: '#D97706', badge: 'amber' },
}

const STATUS_CONFIG: Record<string, { label: string; badge: 'amber' | 'blue' | 'teal' | 'green' }> = {
  draft: { label: 'Draft', badge: 'amber' },
  'in-review': { label: 'In Review', badge: 'blue' },
  approved: { label: 'Approved', badge: 'teal' },
  published: { label: 'Published', badge: 'green' },
}

const ASSURANCE_CONFIG: Record<string, { label: string; badge: 'gray' | 'blue' | 'teal' }> = {
  'not-started': { label: 'Not Started', badge: 'gray' },
  'in-progress': { label: 'In Progress', badge: 'blue' },
  assured: { label: 'Assured', badge: 'teal' },
}

const TABS_CONFIG = [
  { id: 'all', label: 'All Reports' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'published', label: 'Published' },
  { id: 'frameworks', label: 'Frameworks' },
]

function stagger(i: number) { return `stagger-${Math.min(i + 1, 10)}` }

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function ReportPublishing() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [reports, setReports] = useState<PublishableReport[]>(publishableReports)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filteredReports = useMemo(() => {
    if (tab === 'in-progress') return reports.filter(r => r.status !== 'published')
    if (tab === 'published') return reports.filter(r => r.status === 'published')
    if (tab === 'frameworks') return []
    return reports
  }, [tab, reports])

  const stats = useMemo(() => ({
    total: reports.length,
    published: reports.filter(r => r.status === 'published').length,
    inProgress: reports.filter(r => r.status === 'in-review' || r.status === 'approved').length,
    draft: reports.filter(r => r.status === 'draft').length,
  }), [reports])

  const handleGenerate = (id: string) => {
    setGeneratingId(id)
    setTimeout(() => {
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'in-review' as const, generatedDate: '2026-04-09' } : r))
      setGeneratingId(null)
      showToast('Report generated successfully')
    }, 2000)
  }

  const handlePublish = (id: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'published' as const, publishedDate: '2026-04-09' } : r))
    showToast('Report published successfully')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-up flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg" style={{
          backgroundColor: 'color-mix(in srgb, var(--accent-teal) 8%, var(--bg-primary))',
          borderColor: 'color-mix(in srgb, var(--accent-teal) 20%, transparent)',
        }}>
          <CheckCircle2 className="w-4 h-4 text-[var(--accent-teal)] animate-check" />
          <span className="text-[var(--text-sm)] font-semibold text-[var(--accent-teal)]">{toast}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="animate-slide-up relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-6">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          background: 'radial-gradient(ellipse at 15% 50%, #16A34A 0%, transparent 50%), radial-gradient(ellipse at 85% 50%, #2563EB 0%, transparent 50%)',
        }} />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-float" style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-teal) 15%, transparent), color-mix(in srgb, var(--accent-blue) 10%, transparent))',
              border: '1.5px solid color-mix(in srgb, var(--accent-teal) 25%, transparent)',
            }}>
              <FileOutput className="w-7 h-7 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">Report Publishing</h1>
              <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)]">
                Disclosure-ready reports generated from verified, assured data. Publish to CDP, TCFD, GRI, and CSRD.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="teal">FY 2026</Badge>
            <Button variant="secondary" size="sm" icon={<Bot className="w-3.5 h-3.5" />} onClick={() => navigate('/reports/ai')}>
              AI Report
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: stats.total, icon: FileText, accent: '#0F7B6F' },
          { label: 'Published', value: stats.published, icon: CheckCircle2, accent: '#16A34A' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, accent: '#2563EB' },
          { label: 'Draft', value: stats.draft, icon: AlertTriangle, accent: '#D97706' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className={`animate-slide-up ${stagger(idx)} group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[2px] cursor-default`}>
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${kpi.accent}, transparent)` }} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">{kpi.label}</p>
                  <p className="text-[var(--text-2xl)] font-bold text-[var(--text-primary)] mt-1 tabular-nums animate-count" style={{ animationDelay: `${200 + idx * 100}ms` }}>{kpi.value}</p>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `color-mix(in srgb, ${kpi.accent} 10%, transparent)` }}>
                  <Icon className="w-5 h-5" style={{ color: kpi.accent }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="animate-slide-up stagger-5">
        <Tabs tabs={TABS_CONFIG} activeTab={tab} onChange={setTab} />
      </div>

      {/* ── Report Cards ── */}
      {tab !== 'frameworks' && (
        <div className="space-y-6">
          {/* AI Report Banner */}
          <button
            onClick={() => navigate('/reports/ai')}
            className="animate-slide-up stagger-6 w-full text-left group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px] hover:border-[var(--border-strong)] cursor-pointer"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(90deg, #7C3AED, #2563EB, #0F7B6F)' }} />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #7C3AED 12%, transparent), color-mix(in srgb, #2563EB 8%, transparent))', border: '1px solid color-mix(in srgb, #7C3AED 20%, transparent)' }}>
                <Sparkles className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">AI Report Generation</h3>
                  <Badge variant="purple">New</Badge>
                </div>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">Generate AI-drafted narrative summaries from verified emissions data with blockchain-anchored sources.</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[#7C3AED] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
            </div>
          </button>

          {/* Report grid */}
          {filteredReports.length === 0 ? (
            <div className="animate-scale-in rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)] py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4 animate-float">
                <FileText className="w-7 h-7 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[var(--text-base)] font-semibold text-[var(--text-secondary)]">No reports in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredReports.map((report, idx) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  index={idx}
                  isGenerating={generatingId === report.id}
                  onGenerate={() => handleGenerate(report.id)}
                  onPublish={() => handlePublish(report.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Frameworks Tab ── */}
      {tab === 'frameworks' && (
        <div className="space-y-4 animate-fade-in">
          {frameworkStatuses.map((fw, idx) => {
            const fwColor = FRAMEWORK_COLORS[fw.id] || FRAMEWORK_COLORS.cdp
            const pct = fw.completion
            return (
              <div
                key={fw.id}
                className={`animate-slide-up ${stagger(idx)} group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px]`}
              >
                <div className="flex">
                  <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: fwColor.color }} />
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${fwColor.color} 10%, transparent)` }}>
                          <Globe className="w-5 h-5" style={{ color: fwColor.color }} />
                        </div>
                        <div>
                          <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{fw.fullName}</h3>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{fw.name} · FY 2026</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {fw.score && <Badge variant={fwColor.badge}>{fw.score}</Badge>}
                        <Badge variant={fw.status === 'Published' ? 'green' : fw.status === 'Draft' ? 'amber' : 'blue'} dot>{fw.status}</Badge>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-[var(--ease-out-expo)]" style={{ width: `${pct}%`, backgroundColor: fwColor.color }} />
                      </div>
                      <span className="text-[var(--text-xs)] font-bold tabular-nums" style={{ color: fwColor.color }}>{pct}%</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 mt-3 text-[var(--text-xs)] text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {fw.disclosures}/{fw.totalDisclosures} disclosures</span>
                      <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {fw.totalDisclosures - fw.disclosures} remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Publishing Workflow Footer ── */}
      <div className="grid grid-cols-3 gap-4 animate-slide-up stagger-8">
        {[
          { step: '01', title: 'Draft Generation', desc: 'Reports are auto-generated from assured data packages. Framework-specific formatting and XBRL tagging applied.', icon: FileText, color: '#D97706' },
          { step: '02', title: 'Review & Approval', desc: 'Generated reports pass through internal review. Discrepancies are flagged and resolved before approval.', icon: Eye, color: '#2563EB' },
          { step: '03', title: 'Publish & Archive', desc: 'Approved reports are published with full audit trail. Blockchain-anchored checksums for tamper-evidence.', icon: Lock, color: '#0F7B6F' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.step} className="group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px] cursor-default">
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[var(--text-2xl)] font-bold tabular-nums" style={{ color: `color-mix(in srgb, ${s.color} 30%, transparent)` }}>{s.step}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `color-mix(in srgb, ${s.color} 10%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-1">{s.title}</h3>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] leading-relaxed">{s.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Report Card
   ═══════════════════════════════════════════ */
function ReportCard({
  report, index, isGenerating, onGenerate, onPublish,
}: {
  report: PublishableReport; index: number; isGenerating: boolean
  onGenerate: () => void; onPublish: () => void
}) {
  const fwCfg = FRAMEWORK_COLORS[report.frameworkId] || FRAMEWORK_COLORS.cdp
  const statusCfg = STATUS_CONFIG[report.status]
  const assurCfg = ASSURANCE_CONFIG[report.assuranceStatus]
  const delay = Math.min(index * 60, 400)

  return (
    <div
      className="animate-slide-up group/card relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px] hover:border-[var(--border-strong)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Left accent */}
      <div className="flex">
        <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: fwCfg.color }} />
        <div className="flex-1 p-5">
          {/* Top: framework + status */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant={fwCfg.badge}>{report.frameworkName}</Badge>
            <Badge variant={statusCfg.badge} dot>{statusCfg.label}</Badge>
          </div>

          {/* Title */}
          <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-0.5">{report.title}</h3>
          <p className="text-[10px] text-[var(--text-tertiary)]">{report.period}</p>

          {/* Meta grid */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Format', value: report.format, icon: FileText },
              { label: 'Pages', value: report.pages.toString(), icon: Hash },
              { label: 'Assurance', value: assurCfg.label, icon: Shield },
            ].map(m => {
              const Icon = m.icon
              return (
                <div key={m.label} className="rounded-lg p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{m.label}</p>
                  <p className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                    <Icon className="w-3 h-3 text-[var(--text-tertiary)]" />
                    {m.value}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-[var(--text-tertiary)]">
            {report.generatedDate && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Generated: {report.generatedDate}</span>
            )}
            {report.publishedDate && (
              <span className="flex items-center gap-1"><Send className="w-3 h-3" /> Published: {report.publishedDate}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {report.status === 'draft' && (
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex-1 py-2.5 rounded-xl text-[var(--text-sm)] font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
                style={{ backgroundColor: 'var(--bg-inverse)', color: 'var(--text-inverse)' }}
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><FileText className="w-4 h-4" /> Generate Report</>
                )}
              </button>
            )}
            {report.status === 'in-review' && (
              <div className="flex-1 py-2.5 rounded-xl text-[var(--text-sm)] font-semibold flex items-center justify-center gap-2 border" style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-blue) 6%, transparent)',
                borderColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)',
                color: 'var(--accent-blue)',
              }}>
                <Eye className="w-4 h-4" /> Under Review
              </div>
            )}
            {report.status === 'approved' && (
              <button
                onClick={onPublish}
                className="flex-1 py-2.5 rounded-xl text-[var(--text-sm)] font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent-teal) 8%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--accent-teal) 20%, transparent)',
                  color: 'var(--accent-teal)',
                }}
              >
                <Upload className="w-4 h-4" /> Publish
              </button>
            )}
            {report.status === 'published' && (
              <button className="flex-1 py-2.5 rounded-xl text-[var(--text-sm)] font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] active:scale-[0.98]">
                <Download className="w-4 h-4" /> Download
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
