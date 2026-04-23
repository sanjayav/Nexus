import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Download, Send, Loader2, CheckCircle2, AlertCircle,
  Shield, Hash, Clock, FileText, ShieldCheck, Copy, ExternalLink, RotateCw, X, BadgeCheck,
} from 'lucide-react'
import { useOrgData } from '../lib/useOrgData'
import { useFramework } from '../lib/frameworks'
import { orgStore, type QuestionAssignment, type PublishedReport, type AssuranceRequest, type ReportingPeriod } from '../lib/orgStore'
import PageHeader from '../components/PageHeader'
import SectionHeader from '../design-system/components/SectionHeader'
import Button from '../design-system/components/Button'
import EmptyState from '../design-system/components/EmptyState'
import { SkeletonCard } from '../design-system/components/Skeleton'
import { riseIn, popIn, slideInLeft } from '../components/motion'

type View = 'loading' | 'ready' | 'error'

export default function ReportPublishing() {
  const { data: orgData, loading: orgLoading } = useOrgData()
  const { active: framework } = useFramework()
  const [state, setState] = useState<View>('loading')
  const [error, setError] = useState<string | null>(null)
  const [periods, setPeriods] = useState<ReportingPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [reports, setReports] = useState<PublishedReport[]>([])
  const [assurance, setAssurance] = useState<AssuranceRequest[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishBanner, setPublishBanner] = useState<{ verify_url: string; sha256: string; version: number; is_draft: boolean } | null>(null)
  const [assuranceModalOpen, setAssuranceModalOpen] = useState(false)

  const load = async () => {
    setState('loading')
    try {
      const [ps, reps, asrs] = await Promise.all([
        orgStore.listPeriods(),
        orgStore.listPublishedReports(),
        orgStore.listAssuranceRequests(),
      ])
      setPeriods(ps.filter(p => p.framework_id === framework.id))
      setReports(reps.filter((r: PublishedReport) => r.framework_id === framework.id))
      setAssurance(asrs.filter((a: AssuranceRequest) => ps.find(p => p.id === a.period_id)?.framework_id === framework.id))
      if (!selectedPeriodId && ps.length > 0) {
        const active = ps.find(p => p.status === 'active' && p.framework_id === framework.id) ?? ps.find(p => p.framework_id === framework.id)
        if (active) setSelectedPeriodId(active.id)
      }
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setState('error')
    }
  }

  useEffect(() => { load() }, [framework.id])

  const period = periods.find(p => p.id === selectedPeriodId) ?? null

  const periodAssignments = useMemo<QuestionAssignment[]>(() => {
    if (!orgData || !period) return []
    return orgData.assignments.filter(a =>
      a.framework_id === framework.id &&
      (a.period_id === period.id || !a.period_id)
    )
  }, [orgData, period, framework.id])

  const readiness = useMemo(() => {
    const total = periodAssignments.length
    const approved = periodAssignments.filter(a => a.status === 'approved').length
    const inFlight = periodAssignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length
    const open = periodAssignments.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected').length
    const pct = total === 0 ? 0 : Math.round((approved / total) * 100)
    const canPublish = approved > 0
    return { total, approved, inFlight, open, pct, canPublish }
  }, [periodAssignments])

  const latestForPeriod = reports.find(r => r.period_id === selectedPeriodId)
  const signedAssurance = assurance.filter(a => a.period_id === selectedPeriodId && a.status === 'signed')
  const pendingAssurance = assurance.filter(a => a.period_id === selectedPeriodId && a.status === 'pending')

  const handlePublish = async (assurance_request_id?: string) => {
    if (!period) return
    setPublishing(true); setPublishBanner(null)
    try {
      const res = await orgStore.publishReport(period.id, assurance_request_id)
      setPublishBanner({ verify_url: res.verify_url, sha256: res.pdf_sha256, version: res.version, is_draft: res.is_draft })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  if (state === 'loading' || orgLoading) {
    return (
      <div className="space-y-6">
        <div className="h-[120px] rounded-[18px] skeleton" />
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard /><SkeletonCard />
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <EmptyState
        icon={<AlertCircle className="w-7 h-7" />}
        title="Unable to load publish centre"
        description={error ?? ''}
        actions={<Button variant="secondary" onClick={load}>Retry</Button>}
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reports"
        title="Publish Centre"
        subtitle="Generate an auditor-grade PDF, anchor its hash to a public timestamp, and track the assurance workflow."
        actions={
          <>
            {period && (
              <Button
                variant="secondary"
                size="md"
                icon={<ShieldCheck className="w-4 h-4" />}
                onClick={() => setAssuranceModalOpen(true)}
              >
                Request assurance
              </Button>
            )}
            <Button
              variant="brand"
              size="md"
              icon={publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              onClick={() => handlePublish(signedAssurance[0]?.id)}
              disabled={!period || !readiness.canPublish || publishing}
            >
              {publishing ? 'Publishing…' : latestForPeriod ? 'Re-publish' : 'Publish report'}
            </Button>
          </>
        }
      />

      {publishBanner && <PublishBanner banner={publishBanner} onClose={() => setPublishBanner(null)} />}

      {/* Period picker */}
      <section>
        <SectionHeader kicker="Scope" title="Reporting period" subtitle={`${framework.name} — pick a period to publish.`} />
        <div className="flex flex-wrap gap-2">
          {periods.length === 0 ? (
            <div className="text-[13px] text-[var(--text-tertiary)]">No periods set up. Create one in Admin → Reporting cycles.</div>
          ) : (
            periods.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriodId(p.id)}
                className={`chip ${selectedPeriodId === p.id ? 'chip-active' : ''}`}
              >
                {p.label}
                <span className="text-[10px] text-[var(--text-quaternary)] uppercase tracking-[0.08em]">{p.status}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Readiness card */}
      {period && (
        <section>
          <motion.div {...popIn(0)} className="surface-hero p-8">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="kicker mb-2">Readiness · {period.label}</div>
                <h2 className="text-display text-[28px] text-[var(--text-primary)]">
                  {readiness.total === 0 ? 'No disclosures assigned yet' : readiness.approved === readiness.total ? 'Ready to publish' : `${readiness.approved} of ${readiness.total} disclosures approved`}
                </h2>
                <p className="text-[13.5px] text-[var(--text-secondary)] mt-2 max-w-xl leading-relaxed">
                  The PDF is generated server-side and each page includes verification on the footer. The cover carries a QR code and a SHA-256 hash anchored to a public timestamp calendar — any recipient can confirm the file hasn't been modified.
                </p>
                <div className="mt-5 max-w-md">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)]">Coverage</span>
                    <span className="text-[14px] font-bold tabular-nums text-[var(--text-primary)]">{readiness.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${readiness.pct}%`,
                        background: readiness.pct === 100
                          ? 'linear-gradient(90deg, #10B981, #2E7D32)'
                          : 'linear-gradient(90deg, #1B6B7B, #3B8A9B)',
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5 flex-wrap">
                  <Tally label="Approved" value={readiness.approved} accent="green" />
                  <Tally label="In review" value={readiness.inFlight} accent="blue" />
                  <Tally label="Open" value={readiness.open} accent="amber" />
                </div>
              </div>

              {/* Current assurance badge */}
              <AssurancePill signed={signedAssurance[0]} pending={pendingAssurance[0]} />
            </div>
          </motion.div>
        </section>
      )}

      {/* Latest artifact for this period */}
      {latestForPeriod && (
        <section>
          <SectionHeader kicker="Latest artifact" title={`Version ${latestForPeriod.version}`} subtitle={`Published ${new Date(latestForPeriod.published_at).toLocaleString()}. Hash anchored to OpenTimestamps.`} />
          <ArtifactCard report={latestForPeriod} />
        </section>
      )}

      {/* Publish history */}
      <section>
        <SectionHeader kicker="Archive" title="Publish history" subtitle="Every prior version is retained, hashed, and externally timestamped." />
        {reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-7 h-7" />}
            title="No reports published yet"
            description="Approve at least one disclosure in this framework, then hit Publish."
          />
        ) : (
          <div className="surface-paper overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="text-left px-5 py-3 font-semibold">Version</th>
                  <th className="text-left px-5 py-3 font-semibold">Period</th>
                  <th className="text-left px-5 py-3 font-semibold">Assurance</th>
                  <th className="text-left px-5 py-3 font-semibold">Hash</th>
                  <th className="text-left px-5 py-3 font-semibold">Published</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {reports.map((r, i) => <ReportRow key={r.id} report={r} i={i} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Assurance requests for this period */}
      {period && (
        <section>
          <SectionHeader
            kicker="Assurance"
            title="Independent assurance workflow"
            subtitle="Send a signed upload link to your audit partner. Once they submit an ISAE 3000 opinion, the draft watermark lifts on the next publish."
          />
          {assurance.filter(a => a.period_id === period.id).length === 0 ? (
            <EmptyState
              size="sm"
              icon={<Shield className="w-6 h-6" />}
              title="No assurance requests yet"
              description="Request assurance from a third-party firm. The platform sends them a private upload link — they don't need a login."
              actions={<Button variant="brand" size="md" icon={<ShieldCheck className="w-4 h-4" />} onClick={() => setAssuranceModalOpen(true)}>Request assurance</Button>}
            />
          ) : (
            <div className="space-y-3">
              {assurance.filter(a => a.period_id === period.id).map((a, i) => (
                <AssuranceRow key={a.id} req={a} i={i} onChange={load} />
              ))}
            </div>
          )}
        </section>
      )}

      {assuranceModalOpen && period && (
        <RequestAssuranceModal
          period={period}
          onClose={() => setAssuranceModalOpen(false)}
          onCreated={() => { setAssuranceModalOpen(false); load() }}
        />
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────

function Tally({ label, value, accent }: { label: string; value: number; accent: 'green' | 'blue' | 'amber' }) {
  const bg = accent === 'green' ? 'var(--accent-green-light)' : accent === 'blue' ? 'var(--accent-blue-light)' : 'var(--accent-amber-light)'
  const fg = accent === 'green' ? 'var(--status-ok)' : accent === 'blue' ? 'var(--status-pending)' : 'var(--status-draft)'
  return (
    <div className="px-3 py-2 rounded-[10px]" style={{ background: bg }}>
      <div className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: fg }}>{label}</div>
      <div className="text-[18px] font-bold tabular-nums tracking-[-0.01em]" style={{ color: fg }}>{value}</div>
    </div>
  )
}

function AssurancePill({ signed, pending }: { signed?: AssuranceRequest; pending?: AssuranceRequest }) {
  if (signed) {
    return (
      <div className="px-4 py-3 rounded-[12px] border border-[var(--status-ok)]/30 bg-[var(--accent-green-light)]/60 min-w-[200px]">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-[var(--status-ok)]" />
          <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-[var(--status-ok)]">Assured</span>
        </div>
        <div className="text-[13.5px] font-semibold text-[var(--text-primary)] mt-1.5 truncate">{signed.auditor_firm ?? signed.auditor_email}</div>
        <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
          {signed.opinion_type === 'reasonable' ? 'Reasonable assurance' : 'Limited assurance'} · {signed.signed_at ? new Date(signed.signed_at).toLocaleDateString() : ''}
        </div>
      </div>
    )
  }
  if (pending) {
    return (
      <div className="px-4 py-3 rounded-[12px] border border-[var(--status-draft)]/30 bg-[var(--accent-amber-light)]/60 min-w-[200px]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--status-draft)]" />
          <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-[var(--status-draft)]">Assurance pending</span>
        </div>
        <div className="text-[13.5px] font-semibold text-[var(--text-primary)] mt-1.5 truncate">{pending.auditor_firm ?? pending.auditor_email}</div>
        <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Upload link active</div>
      </div>
    )
  }
  return (
    <div className="px-4 py-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-secondary)] min-w-[200px]">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-[var(--text-tertiary)]" />
        <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-[var(--text-tertiary)]">Unaudited</span>
      </div>
      <div className="text-[13.5px] font-semibold text-[var(--text-primary)] mt-1.5">No assurance</div>
      <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Will publish as "DRAFT"</div>
    </div>
  )
}

function PublishBanner({ banner, onClose }: { banner: { verify_url: string; sha256: string; version: number; is_draft: boolean }; onClose: () => void }) {
  return (
    <motion.div
      {...popIn(0)}
      className="surface-paper p-5 relative overflow-hidden"
      style={{
        background: banner.is_draft
          ? 'linear-gradient(135deg, rgba(230,168,23,0.06) 0%, transparent 60%)'
          : 'linear-gradient(135deg, rgba(46,125,50,0.06) 0%, transparent 60%)',
        borderColor: banner.is_draft ? 'rgba(230,168,23,0.3)' : 'rgba(46,125,50,0.3)',
      }}
    >
      <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: banner.is_draft ? 'var(--accent-amber-light)' : 'var(--accent-green-light)', color: banner.is_draft ? 'var(--status-draft)' : 'var(--status-ok)' }}>
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
            Version {banner.version} published {banner.is_draft ? 'as unaudited draft' : 'with assurance'}
          </div>
          <div className="text-[12px] text-[var(--text-secondary)] mt-1 leading-snug">
            SHA-256: <span className="font-mono">{banner.sha256.slice(0, 24)}…</span> — anchored to OpenTimestamps. Verify URL:
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="font-mono text-[11px] text-[var(--color-brand-strong)] bg-[var(--bg-secondary)] px-2 py-1 rounded-[6px] border border-[var(--border-subtle)] truncate">{banner.verify_url}</code>
            <button onClick={() => navigator.clipboard.writeText(banner.verify_url)} className="px-2 py-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a href={banner.verify_url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-[6px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ArtifactCard({ report }: { report: PublishedReport }) {
  return (
    <motion.div {...popIn(0)} className="surface-paper p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-brand-soft)', color: 'var(--color-brand)' }}>
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">Version {report.version} · {report.framework_id.toUpperCase()}</span>
              {report.is_draft ? (
                <span className="chip" style={{ background: 'var(--accent-amber-light)', color: 'var(--status-draft)', borderColor: 'rgba(230,168,23,0.3)' }}>DRAFT</span>
              ) : (
                <span className="chip" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)', borderColor: 'rgba(46,125,50,0.3)' }}>ASSURED</span>
              )}
            </div>
            <div className="text-[11.5px] text-[var(--text-tertiary)]">{(report.pdf_size / 1024).toFixed(1)} KB · published by {report.published_by_name}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] mt-2 flex items-center gap-1.5 font-mono tabular-nums">
              <Hash className="w-3 h-3" />
              {report.pdf_sha256.slice(0, 24)}…{report.pdf_sha256.slice(-8)}
            </div>
            {report.anchor_tip_hash && (
              <div className="text-[11px] text-[var(--status-ok)] mt-1.5 flex items-center gap-1.5">
                <BadgeCheck className="w-3 h-3" />
                Anchored to OpenTimestamps on {report.anchored_at ? new Date(report.anchored_at).toLocaleDateString() : '—'}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="md" icon={<ExternalLink className="w-4 h-4" />} onClick={() => window.open(`/verify/${report.verification_token}`, '_blank')}>
            Verify
          </Button>
          <Button variant="brand" size="md" icon={<Download className="w-4 h-4" />} onClick={() => orgStore.downloadReportPdf(report.id, `${report.framework_id}-${report.period_label.replace(/\s+/g, '')}-v${report.version}.pdf`)}>
            Download
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function ReportRow({ report, i }: { report: PublishedReport; i: number }) {
  return (
    <motion.tr {...slideInLeft(i)} className="hover:bg-[var(--bg-secondary)]">
      <td className="px-5 py-3">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">v{report.version}</span>
      </td>
      <td className="px-5 py-3">
        <div className="text-[12.5px] text-[var(--text-primary)] font-medium">{report.period_label}</div>
        <div className="text-[10.5px] text-[var(--text-tertiary)]">FY {report.period_year}</div>
      </td>
      <td className="px-5 py-3">
        {report.is_draft ? (
          <span className="chip" style={{ background: 'var(--accent-amber-light)', color: 'var(--status-draft)' }}>DRAFT</span>
        ) : (
          <span className="chip" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)' }}>{report.auditor_firm ?? 'Signed'}</span>
        )}
      </td>
      <td className="px-5 py-3 font-mono text-[11px] text-[var(--text-tertiary)] tabular-nums">
        {report.pdf_sha256.slice(0, 14)}…
        {report.anchor_tip_hash && <span className="ml-2 inline-flex items-center gap-0.5 text-[var(--status-ok)]"><BadgeCheck className="w-3 h-3" />anchored</span>}
      </td>
      <td className="px-5 py-3 text-[11.5px] text-[var(--text-secondary)]">
        {new Date(report.published_at).toLocaleDateString()}
        <div className="text-[10.5px] text-[var(--text-tertiary)]">{report.published_by_name}</div>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="inline-flex gap-1.5">
          <a href={`/verify/${report.verification_token}`} target="_blank" rel="noreferrer" className="px-2 h-7 inline-flex items-center rounded-[6px] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title="Public verification page">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={() => orgStore.downloadReportPdf(report.id, `${report.framework_id}-v${report.version}.pdf`)} className="px-2 h-7 inline-flex items-center rounded-[6px] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title="Download PDF">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </motion.tr>
  )
}

function AssuranceRow({ req, i, onChange }: { req: AssuranceRequest; i: number; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  const [showLink, setShowLink] = useState<string | null>(null)

  const copyUploadLink = async () => {
    setBusy(true)
    try {
      const { upload_token } = await orgStore.getAssuranceUploadLink(req.id)
      const url = `${window.location.origin}/assure/${upload_token}`
      await navigator.clipboard.writeText(url)
      setShowLink(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Unable to get link')
    } finally {
      setBusy(false)
    }
  }

  const rotateLink = async () => {
    if (!confirm('Rotate the upload link? The previous one will stop working immediately.')) return
    setBusy(true)
    try {
      const { upload_token } = await orgStore.rotateAssuranceToken(req.id)
      const url = `${window.location.origin}/assure/${upload_token}`
      await navigator.clipboard.writeText(url)
      setShowLink(url)
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async () => {
    if (!confirm('Withdraw this assurance request?')) return
    setBusy(true)
    try {
      await orgStore.withdrawAssurance(req.id)
      onChange()
    } finally {
      setBusy(false)
    }
  }

  const statusColor =
    req.status === 'signed' ? { bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' }
    : req.status === 'pending' ? { bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)' }
    : { bg: 'var(--bg-tertiary)', fg: 'var(--text-tertiary)' }

  return (
    <motion.div {...riseIn(i)} className="surface-paper p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: statusColor.bg, color: statusColor.fg }}>
            {req.status === 'signed' ? <BadgeCheck className="w-5 h-5" /> : req.status === 'pending' ? <Clock className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{req.auditor_firm ?? req.auditor_name ?? req.auditor_email}</span>
              <span className="chip" style={{ background: statusColor.bg, color: statusColor.fg, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>{req.status}</span>
              {req.opinion_type && <span className="chip">{req.opinion_type === 'reasonable' ? 'Reasonable' : 'Limited'}</span>}
            </div>
            <div className="text-[12px] text-[var(--text-tertiary)] mt-1">
              {req.auditor_email} · requested {new Date(req.requested_at).toLocaleDateString()}
              {req.signed_at && <> · signed {new Date(req.signed_at).toLocaleDateString()} by {req.signed_by}</>}
            </div>
            {req.notes && <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 leading-relaxed">{req.notes}</p>}
            {req.statement_sha256 && (
              <div className="text-[11px] text-[var(--text-tertiary)] mt-2 font-mono">
                statement sha-256: {req.statement_sha256.slice(0, 20)}…
              </div>
            )}
            {showLink && (
              <div className="mt-3 p-3 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)] mb-1">Upload link (copied)</div>
                <code className="font-mono text-[11px] text-[var(--color-brand-strong)] break-all">{showLink}</code>
                <div className="text-[10.5px] text-[var(--text-tertiary)] mt-1.5">Send this to the auditor. They can upload the signed statement without a platform login.</div>
              </div>
            )}
          </div>
        </div>

        {req.status === 'pending' && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" variant="secondary" icon={<Copy className="w-3.5 h-3.5" />} onClick={copyUploadLink} disabled={busy}>Copy upload link</Button>
            <Button size="sm" variant="ghost" icon={<RotateCw className="w-3.5 h-3.5" />} onClick={rotateLink} disabled={busy}>Rotate</Button>
            <Button size="sm" variant="ghost" icon={<X className="w-3.5 h-3.5" />} onClick={withdraw} disabled={busy}>Withdraw</Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RequestAssuranceModal({ period, onClose, onCreated }: { period: ReportingPeriod; onClose: () => void; onCreated: () => void }) {
  const [firm, setFirm] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [opinion, setOpinion] = useState<'limited' | 'reasonable'>('limited')
  const [isae, setIsae] = useState('ISAE 3000 (Revised)')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!email) { setError('Auditor email is required'); return }
    setSubmitting(true); setError(null)
    try {
      await orgStore.requestAssurance({
        period_id: period.id,
        auditor_email: email,
        auditor_firm: firm || undefined,
        auditor_name: name || undefined,
        opinion_type: opinion,
        isae_reference: isae,
        notes: notes || undefined,
      })
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        className="surface-paper max-w-lg w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="kicker">New request</span>
            <h2 className="text-display text-[22px] text-[var(--text-primary)] mt-0.5">Request independent assurance</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed mb-4">
          A one-shot upload link will be generated. Copy it and send it to your auditor. They can submit their signed statement without a platform login; the statement is hashed and embedded in the next published version of the report for {period.label}.
        </p>

        <div className="space-y-3">
          <Field label="Auditor firm" placeholder="e.g. LRQA Group, Deloitte" value={firm} onChange={setFirm} />
          <Field label="Contact name" placeholder="Partner / signing auditor" value={name} onChange={setName} />
          <Field label="Contact email*" placeholder="partner@firm.com" value={email} onChange={setEmail} type="email" />
          <div>
            <label className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">Level of assurance</label>
            <div className="flex gap-1.5">
              {(['limited', 'reasonable'] as const).map(o => (
                <button key={o} onClick={() => setOpinion(o)} className={`chip flex-1 justify-center ${opinion === o ? 'chip-active' : ''}`}>
                  {o === 'limited' ? 'Limited' : 'Reasonable'}
                </button>
              ))}
            </div>
          </div>
          <Field label="Standard" placeholder="ISAE 3000 (Revised)" value={isae} onChange={setIsae} />
          <Field label="Notes (optional)" placeholder="Scope, deadline, special instructions…" value={notes} onChange={setNotes} as="textarea" />
        </div>

        {error && <div className="mt-4 p-3 rounded-[8px] bg-[var(--accent-red-light)] text-[var(--status-reject)] text-[12.5px] font-medium">{error}</div>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="brand" size="md" icon={<ShieldCheck className="w-4 h-4" />} onClick={submit} loading={submitting}>Create request</Button>
        </div>
      </motion.div>
    </div>
  )
}

function Field({ label, placeholder, value, onChange, type = 'text', as = 'input' }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void; type?: string; as?: 'input' | 'textarea' }) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">{label}</span>
      {as === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none resize-none transition-all"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none transition-all"
        />
      )}
    </label>
  )
}
