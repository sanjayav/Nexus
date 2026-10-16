import { useState, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import {
  Shield,
  Search,
  Filter,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  CheckCircle2,
  Anchor,
  FileText,
  PenLine,
  ArrowRight,
  Link2,
  Hash,
  Clock,
  User,
  Wifi,
  Boxes,
  ShieldCheck,
  Hourglass,
  ChevronsUp,
} from 'lucide-react'
import { type BlockchainRecord } from '../data/demoData'
import { Badge } from '../design-system'
import { blockchain as blockchainApi, type ApiBlockchainRecord, type ChainVerifyReport, type ChainAnchor } from '../lib/api'
import { useApi } from '../lib/useApi'
import { useEffect } from 'react'
import { ShieldAlert, Download, Bitcoin, RefreshCw } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

type EventType = BlockchainRecord['eventType']
type Status = BlockchainRecord['status']

const eventTypeBadgeVariant: Record<EventType, 'blue' | 'green' | 'purple' | 'amber' | 'red'> = {
  Submitted: 'blue',
  Approved: 'green',
  Anchored: 'purple',
  'Report Generated': 'amber',
  Corrected: 'red',
}

const statusBadgeVariant: Record<Status, 'green' | 'amber' | 'blue'> = {
  verified: 'green',
  pending: 'amber',
  'in-review': 'blue',
}

// Display labels resolve at render time via t(`blockchain.status.${key}`).
const statusLabelKey: Record<Status, string> = {
  verified: 'verified',
  pending: 'pending',
  'in-review': 'inReview',
}

// Event-type values stay English (they are filter values / map keys);
// only the displayed label is translated via t(`blockchain.eventType.${key}`).
const eventTypeLabelKey: Record<EventType, string> = {
  Submitted: 'submitted',
  Approved: 'approved',
  Anchored: 'anchored',
  'Report Generated': 'reportGenerated',
  Corrected: 'corrected',
}

function eventTypeKey(eventType: string): string {
  return eventTypeLabelKey[eventType as EventType] ?? eventTypeLabelKey[normaliseEventType(eventType)]
}

const eventIcon: Record<EventType, typeof Shield> = {
  Submitted: FileCheck,
  Approved: CheckCircle2,
  Anchored: Anchor,
  'Report Generated': FileText,
  Corrected: PenLine,
}

/**
 * Normalise whatever the API returns into one of our 5 canonical event types.
 * Raw blockchain_records.event_type can be lowercase, "verified", "confirmed" etc.
 * — this maps them to the nearest visual bucket so icons never come up undefined.
 */
function normaliseEventType(raw: string | undefined | null): EventType {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('approve')) return 'Approved'
  if (s.includes('anchor')) return 'Anchored'
  if (s.includes('report')) return 'Report Generated'
  if (s.includes('correct') || s.includes('restate')) return 'Corrected'
  return 'Submitted'
}

function getEventIcon(eventType: string | undefined | null): typeof Shield {
  return eventIcon[normaliseEventType(eventType)] ?? Shield
}

function truncate(val: string, len = 16): string {
  if (val.length <= len) return val
  return val.slice(0, len) + '\u2026'
}

function formatTimestamp(iso: string, locale = 'en-GB'): string {
  const d = new Date(iso)
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const stagger = (i: number) => `stagger-${Math.min(i + 1, 10)}`

/* ------------------------------------------------------------------ */
/*  Chain Visualization                                               */
/* ------------------------------------------------------------------ */

function ChainVisualization({ records }: { records: BlockchainRecord[] }) {
  const { t, i18n } = useTranslation()
  const tsLocale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-GB'
  const chainSteps = useMemo(() => {
    const submitted = records.find((r) => r.eventType === 'Submitted')
    if (!submitted) return []

    const approved = records.find(
      (r) => r.eventType === 'Approved' && r.dataPoint === submitted.dataPoint && r.facility === submitted.facility,
    )
    const anchored = records.find(
      (r) => r.eventType === 'Anchored' && r.dataPoint === submitted.dataPoint && r.facility === submitted.facility,
    )

    if (!approved || !anchored) {
      const altApproved = records.find((r) => r.id === 'bc-002')
      const altAnchored = records.find((r) => r.id === 'bc-003')
      if (!altApproved || !altAnchored) return []
      const altSubmitted: BlockchainRecord = {
        ...altApproved,
        id: 'bc-chain-sub',
        eventType: 'Submitted',
        timestamp: '2026-04-02T10:00:00Z',
        approver: '',
        approverDID: '',
        status: 'verified',
      }
      return [altSubmitted, altApproved, altAnchored]
    }

    return [submitted, approved, anchored]
  }, [records])

  const stepAccent: Record<string, { bg: string; border: string; icon: string }> = {
    Submitted: { bg: 'color-mix(in srgb, var(--accent-blue) 8%, transparent)', border: 'color-mix(in srgb, var(--accent-blue) 25%, transparent)', icon: 'var(--accent-blue)' },
    Approved: { bg: 'color-mix(in srgb, var(--accent-green) 8%, transparent)', border: 'color-mix(in srgb, var(--accent-green) 25%, transparent)', icon: 'var(--accent-green)' },
    Anchored: { bg: 'color-mix(in srgb, var(--accent-purple) 8%, transparent)', border: 'color-mix(in srgb, var(--accent-purple) 25%, transparent)', icon: 'var(--accent-purple)' },
  }

  if (chainSteps.length === 0) return null

  return (
    <div
      className="animate-slide-up stagger-8 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mb-1">{t('blockchain.chain.title')}</h2>
      <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mb-6">
        <Trans
          i18nKey="blockchain.chain.tracing"
          values={{
            dataPoint: chainSteps[0]?.dataPoint ?? '',
            facility: chainSteps[0]?.facility === 'Unknown' ? t('blockchain.unknownFacility') : (chainSteps[0]?.facility ?? ''),
          }}
          components={{ hl: <span className="font-medium text-[var(--text-secondary)]" /> }}
        />
      </p>

      <div className="flex items-center justify-center gap-0 overflow-x-auto py-4">
        {chainSteps.map((step, idx) => {
          const Icon = getEventIcon(step.eventType)
          const accent = stepAccent[step.eventType] ?? { bg: 'var(--bg-secondary)', border: 'var(--border-default)', icon: 'var(--text-tertiary)' }
          return (
            <div key={step.id} className="flex items-center">
              {/* Step box */}
              <div
                className="flex flex-col items-center gap-2 rounded-xl px-6 py-5 min-w-[200px] border-2 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[2px]"
                style={{
                  backgroundColor: accent.bg,
                  borderColor: accent.border,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: accent.icon }} />
                </div>
                <span className="font-display font-semibold text-[var(--text-sm)] text-[var(--text-primary)]">{t(`blockchain.eventType.${eventTypeKey(step.eventType)}`)}</span>
                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{formatTimestamp(step.timestamp, tsLocale)}</span>
                <div className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--text-secondary)]">
                  <User className="w-3 h-3" />
                  <span>{step.submitter === 'System' ? t('blockchain.system') : step.submitter}</span>
                </div>
                {step.approver && step.approver !== '' && (
                  <div className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--text-tertiary)]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{step.approver}</span>
                  </div>
                )}
                <code className="text-[10px] font-mono text-[var(--accent-teal)] opacity-80">{truncate(step.txHash, 20)}</code>
              </div>

              {/* Connector arrow */}
              {idx < chainSteps.length - 1 && (
                <div className="flex items-center px-3">
                  <div className="w-12 h-0.5" style={{ backgroundColor: 'var(--border-strong)' }} />
                  <ArrowRight className="w-5 h-5 -ml-1" style={{ color: 'var(--text-tertiary)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FAQ / Tooltip Cards                                               */
/* ------------------------------------------------------------------ */

// Copy lives in blockchain.faq.<id>.question / .answer.
const faqItems = ['merkleRoot', 'txHash', 'whyBlockchain'] as const

function FaqCard({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`animate-slide-up ${stagger(index + 8)} rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--border-strong)]`}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-start gap-3 w-full text-left cursor-pointer"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent-teal) 10%, transparent)',
          }}
        >
          <HelpCircle className="w-4 h-4 text-[var(--accent-teal)]" />
        </div>
        <div className="flex-1">
          <span className="font-display font-semibold text-[var(--text-sm)] text-[var(--text-primary)]">{question}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 mt-1 transition-transform duration-300" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 mt-1 transition-transform duration-300" />
        )}
      </button>
      {open && (
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed mt-3 ml-11 animate-expand">
          {answer}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function BlockchainAudit() {
  const { t, i18n } = useTranslation()
  const zh = i18n.language?.startsWith('zh')
  const tsLocale = zh ? 'zh-CN' : 'en-GB'
  // Keep the browser default for English; force zh-CN when Chinese.
  const dateLocale = zh ? 'zh-CN' : undefined
  const facilityLabel = (f: string) => (f === 'Unknown' ? t('blockchain.unknownFacility') : f)
  const [facilityFilter, setFacilityFilter] = useState<string>('all')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [verifyReport, setVerifyReport] = useState<ChainVerifyReport | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [anchors, setAnchors] = useState<ChainAnchor[]>([])
  const [anchoring, setAnchoring] = useState(false)
  const [anchorFlash, setAnchorFlash] = useState<string | null>(null)

  const runVerify = async () => {
    setVerifying(true)
    try {
      const r = await blockchainApi.verify()
      setVerifyReport(r)
    } catch (e) {
      alert(t('blockchain.alerts.verifyFailed', { error: e instanceof Error ? e.message : String(e) }))
    }
    setVerifying(false)
  }

  const loadAnchors = async () => {
    try { setAnchors(await blockchainApi.listAnchors()) } catch { /* silent */ }
  }

  useEffect(() => { loadAnchors() }, [])

  const runAnchor = async () => {
    setAnchoring(true)
    setAnchorFlash(null)
    try {
      const r = await blockchainApi.anchorTip()
      setAnchorFlash(r.alreadyAnchored
        ? t('blockchain.flash.alreadyAnchored')
        : `✓ ${t('blockchain.flash.submitted', { hash: r.tip_hash.slice(0, 20), size: r.receipt_size })}`)
      await loadAnchors()
    } catch (e) {
      setAnchorFlash(t('blockchain.flash.failed', { error: e instanceof Error ? e.message : String(e) }))
    }
    setAnchoring(false)
  }

  // API integration with mock fallback
  const { data: records, isLive } = useApi<ApiBlockchainRecord[]>(
    () => blockchainApi.list(),
    [],
  )

  // Live records only. Empty feed shows as-is — no demo fallback.
  const displayRecords: BlockchainRecord[] = useMemo(() => {
    return records.map((r) => ({
      id: r.id,
      timestamp: r.created_at,
      eventType: normaliseEventType(r.event_type),
      facility: r.facility_name || 'Unknown',
      dataPoint: (r.metadata as Record<string, unknown>)?.dataPoint as string || r.record_type || '',
      submitter: (r.metadata as Record<string, unknown>)?.submitter as string || 'System',
      submitterDID: r.verifier_did || '',
      approver: (r.metadata as Record<string, unknown>)?.approver as string || '',
      approverDID: (r.metadata as Record<string, unknown>)?.approverDID as string || '',
      merkleRoot: r.data_hash,
      txHash: r.transaction_hash,
      blockNumber: r.block_number,
      status: (r.status === 'anchored' ? 'verified' : r.status === 'confirmed' ? 'verified' : 'pending') as BlockchainRecord['status'],
    }))
  }, [records])

  const facilities = useMemo(
    () => Array.from(new Set(displayRecords.map((r) => r.facility))).sort(),
    [displayRecords],
  )

  const eventTypes = useMemo(
    () => Array.from(new Set(displayRecords.map((r) => r.eventType))).sort(),
    [displayRecords],
  )

  const filteredRecords = useMemo(() => {
    return displayRecords.filter((r) => {
      if (facilityFilter !== 'all' && r.facility !== facilityFilter) return false
      if (eventTypeFilter !== 'all' && r.eventType !== eventTypeFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesHash =
          r.txHash.toLowerCase().includes(q) ||
          r.merkleRoot.toLowerCase().includes(q)
        const matchesDataPoint = r.dataPoint.toLowerCase().includes(q)
        if (!matchesHash && !matchesDataPoint) return false
      }
      return true
    })
  }, [displayRecords, facilityFilter, eventTypeFilter, searchQuery])

  // KPI calculations
  const totalRecords = displayRecords.length
  const verifiedCount = displayRecords.filter((r) => r.status === 'verified').length
  const pendingCount = displayRecords.filter((r) => r.status === 'pending' || r.status === 'in-review').length
  const blockHeight = displayRecords.reduce((max, r) => Math.max(max, r.blockNumber), 0)

  const kpis = [
    { labelKey: 'totalRecords', value: totalRecords, icon: Boxes, accent: '#0F7B6F' },
    { labelKey: 'verified', value: verifiedCount, icon: ShieldCheck, accent: '#16A34A' },
    { labelKey: 'pending', value: pendingCount, icon: Hourglass, accent: '#D97706' },
    { labelKey: 'blockHeight', value: blockHeight.toLocaleString(), icon: ChevronsUp, accent: '#2563EB' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero Header ── */}
      <div className="animate-slide-up relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-8">
        {/* Decorative gradient mesh */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          background: 'radial-gradient(ellipse at 20% 50%, #0F7B6F 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, #7C3AED 0%, transparent 50%)',
        }} />
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{
          background: 'linear-gradient(180deg, var(--accent-teal), var(--accent-purple))',
        }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-float" style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-teal) 15%, transparent), color-mix(in srgb, var(--accent-purple) 10%, transparent))',
              border: '1.5px solid color-mix(in srgb, var(--accent-teal) 25%, transparent)',
            }}>
              <Shield className="w-7 h-7 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)] tracking-tight">
                {t('blockchain.hero.title')}
              </h1>
              <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)] max-w-2xl leading-relaxed flex items-center gap-2 flex-wrap">
                {t('blockchain.hero.subtitle')}
                {isLive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-green)] bg-[var(--accent-green-light)] px-2 py-0.5 rounded-full">
                    <Wifi className="w-3 h-3" /> {t('blockchain.hero.live')}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Verify + Anchor actions */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={runVerify}
                disabled={verifying}
                className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent-teal)] text-white text-[var(--text-sm)] font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                {verifying ? t('blockchain.actions.verifying') : t('blockchain.actions.verify')}
              </button>
              <button
                onClick={runAnchor}
                disabled={anchoring}
                title={t('blockchain.actions.anchorTitle')}
                className="px-4 py-2 rounded-[var(--radius-md)] bg-[#F7931A] text-white text-[var(--text-sm)] font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2 shadow-sm"
              >
                <Bitcoin className="w-4 h-4" />
                {anchoring ? t('blockchain.actions.anchoring') : t('blockchain.actions.anchor')}
              </button>
            </div>
            {verifyReport && (
              <div className={`text-[11px] px-3 py-2 rounded-[var(--radius-md)] max-w-[340px] ${
                verifyReport.verified ? 'bg-[var(--accent-green-light)] text-[var(--status-ok)]' : 'bg-[var(--accent-red-light)] text-[var(--status-reject)]'
              }`}>
                {verifyReport.verified ? (
                  <>
                    <div className="font-semibold inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {t('blockchain.verifyResult.intact')}</div>
                    <div className="opacity-80">
                      <Trans
                        i18nKey="blockchain.verifyResult.recordsVerified"
                        count={verifyReport.totalRecords}
                        values={{ tip: verifyReport.tipHash?.slice(0, 18) ?? '—' }}
                        components={{ mono: <span className="font-mono" /> }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> {t('blockchain.verifyResult.broken')}</div>
                    <div className="opacity-80">{t('blockchain.verifyResult.brokenAt', { block: verifyReport.brokenAt })} {verifyReport.brokenReason}</div>
                  </>
                )}
              </div>
            )}
            {anchorFlash && (
              <div className={`text-[11px] px-3 py-2 rounded-[var(--radius-md)] max-w-[340px] ${
                anchorFlash.startsWith('✓') ? 'bg-[#F7931A]/10 text-[#8B5A00]' : 'bg-[var(--accent-red-light)] text-[var(--status-reject)]'
              }`}>
                {anchorFlash}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.labelKey}
              className={`animate-slide-up ${stagger(idx)} group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[2px] hover:border-[var(--border-strong)] cursor-default`}
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${kpi.accent}, transparent)` }} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">{t(`blockchain.kpi.${kpi.labelKey}`)}</p>
                  <p className="text-[var(--text-2xl)] font-bold text-[var(--text-primary)] mt-1 tabular-nums animate-count" style={{ animationDelay: `${200 + idx * 100}ms` }}>
                    {kpi.value}
                  </p>
                </div>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${kpi.accent} 10%, transparent)`,
                  }}
                >
                  <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" style={{ color: kpi.accent }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Bitcoin anchors panel ── */}
      {anchors.length > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <header className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bitcoin className="w-4 h-4 text-[#F7931A]" />
              <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{t('blockchain.anchors.title')}</h3>
            </div>
            <button onClick={loadAnchors} className="text-[10px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> {t('blockchain.anchors.refresh')}
            </button>
          </header>
          <table className="w-full text-[var(--text-sm)]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
                <th className="text-left px-5 py-2 font-semibold">{t('blockchain.anchors.cols.anchored')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('blockchain.anchors.cols.tipHash')}</th>
                <th className="text-center px-3 py-2 font-semibold">{t('blockchain.anchors.cols.block')}</th>
                <th className="text-center px-3 py-2 font-semibold">{t('blockchain.anchors.cols.status')}</th>
                <th className="text-right px-5 py-2 font-semibold">{t('blockchain.anchors.cols.receipt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {anchors.map(a => (
                <tr key={a.id} className="hover:bg-[var(--bg-secondary)]">
                  <td className="px-5 py-2.5 text-[var(--text-xs)] text-[var(--text-secondary)]">{new Date(a.anchored_at).toLocaleString(dateLocale)}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--accent-teal)]">{a.tip_hash.slice(0, 24)}…</td>
                  <td className="px-3 py-2.5 text-center text-[var(--text-xs)] tabular-nums text-[var(--text-secondary)]">#{a.tip_block_number}</td>
                  <td className="px-3 py-2.5 text-center">
                    {a.status === 'confirmed' ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--status-ok)] bg-[var(--accent-green-light)] px-1.5 py-0.5 rounded">
                        {t('blockchain.anchors.btcBlock', { height: a.bitcoin_block_height })}
                      </span>
                    ) : a.status === 'pending' ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#F7931A] bg-[#F7931A]/10 px-1.5 py-0.5 rounded">
                        {t('blockchain.anchors.pendingSubmitted')}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--status-reject)] bg-[var(--accent-red-light)] px-1.5 py-0.5 rounded" title={a.error_message ?? ''}>
                        {t('blockchain.anchors.failed')}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {a.receipt_size != null && a.receipt_size > 0 ? (
                      <a href={blockchainApi.anchorReceiptUrl(a.id) + `&_auth=${localStorage.getItem('aeiforo_token') ?? ''}`}
                         className="text-[var(--text-xs)] font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
                         onClick={async (e) => {
                           e.preventDefault()
                           try {
                             const token = localStorage.getItem('aeiforo_token') ?? ''
                             const res = await fetch(`/api/blockchain?view=anchor-receipt&anchor_id=${a.id}`, { headers: { Authorization: `Bearer ${token}` } })
                             if (!res.ok) { alert(t('blockchain.alerts.downloadFailed')); return }
                             const blob = await res.blob()
                             const url = URL.createObjectURL(blob)
                             const link = document.createElement('a')
                             link.href = url
                             link.download = `${a.tip_hash.slice(2, 18)}.ots`
                             link.click()
                             URL.revokeObjectURL(url)
                           } catch { alert(t('blockchain.alerts.downloadFailed')) }
                         }}>
                        <Download className="w-3 h-3" /> .ots ({a.receipt_size}B)
                      </a>
                    ) : (
                      <span className="text-[10px] text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-2 bg-[var(--bg-secondary)] text-[10px] text-[var(--text-tertiary)] border-t border-[var(--border-subtle)]">
            <Trans
              i18nKey="blockchain.anchors.footnote"
              components={{
                code: <code className="font-mono" />,
                link: <a href="https://opentimestamps.org" target="_blank" rel="noreferrer" className="text-[var(--color-brand)] underline" />,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div
        className="animate-slide-up stagger-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[var(--text-sm)] text-[var(--text-tertiary)]">
            <Filter className="w-4 h-4" />
            <span className="font-medium">{t('blockchain.filters.label')}</span>
          </div>

          {/* Facility Dropdown */}
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="text-[var(--text-sm)] border border-[var(--border-default)] rounded-lg px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-teal)_20%,transparent)] focus:border-[var(--accent-teal)] transition-all duration-300 cursor-pointer"
          >
            <option value="all">{t('blockchain.filters.allFacilities')}</option>
            {facilities.map((f) => (
              <option key={f} value={f}>
                {facilityLabel(f)}
              </option>
            ))}
          </select>

          {/* Event Type Dropdown */}
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-[var(--text-sm)] border border-[var(--border-default)] rounded-lg px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-teal)_20%,transparent)] focus:border-[var(--accent-teal)] transition-all duration-300 cursor-pointer"
          >
            <option value="all">{t('blockchain.filters.allEventTypes')}</option>
            {eventTypes.map((et) => (
              <option key={et} value={et}>
                {t(`blockchain.eventType.${eventTypeKey(et)}`)}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={t('blockchain.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[var(--text-sm)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-teal)_20%,transparent)] focus:border-[var(--accent-teal)] focus:bg-[var(--bg-primary)] transition-all duration-300"
            />
          </div>

          {/* Result count */}
          <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] ml-auto tabular-nums">
            {t('blockchain.filters.resultCount', { shown: filteredRecords.length, count: displayRecords.length })}
          </span>
        </div>
      </div>

      {/* ── Transaction Log Table ── */}
      <div
        className="animate-slide-up stagger-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[var(--text-sm)]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--bg-primary)] border-b border-[var(--border-default)]">
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {t('blockchain.table.timestamp')}
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  {t('blockchain.table.eventType')}
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  {t('blockchain.table.facility')}
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  {t('blockchain.table.dataPoint')}
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {t('blockchain.table.submitter')}
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {t('blockchain.table.approver')}
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    {t('blockchain.table.merkleRoot')}
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    {t('blockchain.table.txHash')}
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  {t('blockchain.table.block')}
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  {t('blockchain.table.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, idx) => {
                const Icon = getEventIcon(record.eventType)
                return (
                  <tr
                    key={record.id}
                    className={`border-b border-[var(--border-subtle)] transition-colors duration-200 hover:bg-[var(--bg-hover)] ${idx % 2 === 1 ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-primary)]'}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] font-mono text-[var(--text-xs)]">
                      {formatTimestamp(record.timestamp, tsLocale)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={eventTypeBadgeVariant[normaliseEventType(record.eventType)]}>
                        <Icon className="w-3 h-3" />
                        {t(`blockchain.eventType.${eventTypeKey(record.eventType)}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] text-[var(--text-xs)]">
                      {facilityLabel(record.facility)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] text-[var(--text-xs)] font-medium">
                      {record.dataPoint}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-[var(--text-xs)] text-[var(--text-secondary)]">{record.submitter === 'System' ? t('blockchain.system') : record.submitter}</div>
                      <code className="text-[10px] font-mono text-[var(--accent-teal)] opacity-80">
                        {truncate(record.submitterDID, 22)}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {record.approver ? (
                        <>
                          <div className="text-[var(--text-xs)] text-[var(--text-secondary)]">{record.approver}</div>
                          <code className="text-[10px] font-mono text-[var(--accent-teal)] opacity-80">
                            {truncate(record.approverDID, 22)}
                          </code>
                        </>
                      ) : (
                        <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-[var(--text-xs)] font-mono text-[var(--accent-teal)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                        {truncate(record.merkleRoot, 14)}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-[var(--text-xs)] font-mono text-[var(--accent-teal)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                        {truncate(record.txHash, 14)}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-xs)] text-[var(--text-secondary)] font-mono tabular-nums">
                      {record.blockNumber.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={statusBadgeVariant[record.status]} dot>
                        {t(`blockchain.status.${statusLabelKey[record.status]}`)}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">
                    {t('blockchain.table.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Chain Visualization ── */}
      <ChainVisualization records={displayRecords} />

      {/* ── FAQ Section ── */}
      <div className="animate-slide-up stagger-9">
        <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mb-3">
          {t('blockchain.faqTitle')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {faqItems.map((id, idx) => (
            <FaqCard key={id} question={t(`blockchain.faq.${id}.question`)} answer={t(`blockchain.faq.${id}.answer`)} index={idx} />
          ))}
        </div>
      </div>
    </div>
  )
}
