import { useState, useMemo } from 'react'
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
import { type BlockchainRecord } from '../data/pttgcData'
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

const statusLabel: Record<Status, string> = {
  verified: 'Verified',
  pending: 'Pending',
  'in-review': 'In Review',
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

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
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
      <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mb-1">Chain of Custody Visualization</h2>
      <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mb-6">
        Tracing <span className="font-medium text-[var(--text-secondary)]">{chainSteps[0]?.dataPoint}</span> at{' '}
        <span className="font-medium text-[var(--text-secondary)]">{chainSteps[0]?.facility}</span>
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
                <span className="font-display font-semibold text-[var(--text-sm)] text-[var(--text-primary)]">{step.eventType}</span>
                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{formatTimestamp(step.timestamp)}</span>
                <div className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--text-secondary)]">
                  <User className="w-3 h-3" />
                  <span>{step.submitter}</span>
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

const faqItems = [
  {
    question: 'What is a Merkle root?',
    answer:
      'A Merkle root is a single cryptographic hash that summarizes all the data in a Merkle tree. When sustainability data points are collected, each one is hashed individually. These hashes are then paired and hashed again, layer by layer, until a single root hash remains. This root is stored on-chain, allowing anyone to verify that any individual data point was included in the batch without needing access to all the data. If even one data point changes, the Merkle root changes entirely, making tampering immediately detectable.',
  },
  {
    question: 'What does the transaction hash mean?',
    answer:
      'A transaction hash (Tx Hash) is a unique identifier for a specific blockchain transaction. When sustainability data is anchored on-chain, the anchoring action produces a transaction that is permanently recorded. The Tx Hash acts as a receipt: anyone can look it up on a block explorer to verify when the data was anchored, which smart contract processed it, and that the Merkle root stored matches the original data batch. It provides an immutable, publicly verifiable proof of the action.',
  },
  {
    question: 'Why blockchain for sustainability data?',
    answer:
      'Sustainability reporting is under increasing scrutiny from regulators, investors, and civil society. Traditional databases can be silently altered, creating trust gaps. By anchoring data hashes on a blockchain, every submission, approval, and correction is permanently timestamped and tamper-evident. This creates an auditable chain of custody from data entry to published report. Auditors can independently verify data integrity without relying on the reporting company\'s internal systems, dramatically reducing assurance costs and greenwashing risk.',
  },
]

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
      alert(`Verify failed: ${e instanceof Error ? e.message : e}`)
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
        ? `This tip was already anchored within the last minute.`
        : `✓ Submitted ${r.tip_hash.slice(0, 20)}… to OpenTimestamps · ${r.receipt_size} bytes · Bitcoin confirmation 1-6h`)
      await loadAnchors()
    } catch (e) {
      setAnchorFlash(`Anchor failed: ${e instanceof Error ? e.message : e}`)
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
    { label: 'Total Records', value: totalRecords, icon: Boxes, accent: '#0F7B6F' },
    { label: 'Verified', value: verifiedCount, icon: ShieldCheck, accent: '#16A34A' },
    { label: 'Pending', value: pendingCount, icon: Hourglass, accent: '#D97706' },
    { label: 'Block Height', value: blockHeight.toLocaleString(), icon: ChevronsUp, accent: '#2563EB' },
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
                Tamper-evident audit trail
              </h1>
              <p className="mt-1 text-[var(--text-sm)] text-[var(--text-tertiary)] max-w-2xl leading-relaxed flex items-center gap-2 flex-wrap">
                Every assignment submission, approval, comment and publish is hash-chained. Any modification to a past record breaks the chain.
                {isLive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-green)] bg-[var(--accent-green-light)] px-2 py-0.5 rounded-full">
                    <Wifi className="w-3 h-3" /> Live
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
                {verifying ? 'Verifying…' : 'Verify chain'}
              </button>
              <button
                onClick={runAnchor}
                disabled={anchoring}
                title="Submit the current chain tip to OpenTimestamps for Bitcoin notarization"
                className="px-4 py-2 rounded-[var(--radius-md)] bg-[#F7931A] text-white text-[var(--text-sm)] font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2 shadow-sm"
              >
                <Bitcoin className="w-4 h-4" />
                {anchoring ? 'Anchoring…' : 'Anchor to Bitcoin'}
              </button>
            </div>
            {verifyReport && (
              <div className={`text-[11px] px-3 py-2 rounded-[var(--radius-md)] max-w-[340px] ${
                verifyReport.verified ? 'bg-[var(--accent-green-light)] text-[var(--status-ok)]' : 'bg-[var(--accent-red-light)] text-[var(--status-reject)]'
              }`}>
                {verifyReport.verified ? (
                  <>
                    <div className="font-semibold inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Chain intact</div>
                    <div className="opacity-80">{verifyReport.totalRecords} records verified. Tip: <span className="font-mono">{verifyReport.tipHash?.slice(0, 18) ?? '—'}…</span></div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Chain broken</div>
                    <div className="opacity-80">At block #{verifyReport.brokenAt}. {verifyReport.brokenReason}</div>
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
              key={kpi.label}
              className={`animate-slide-up ${stagger(idx)} group relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 transition-all duration-300 ease-[var(--ease-out-expo)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[2px] hover:border-[var(--border-strong)] cursor-default`}
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${kpi.accent}, transparent)` }} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">{kpi.label}</p>
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
              <h3 className="font-display text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Bitcoin anchors · OpenTimestamps</h3>
            </div>
            <button onClick={loadAnchors} className="text-[10px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </header>
          <table className="w-full text-[var(--text-sm)]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
                <th className="text-left px-5 py-2 font-semibold">Anchored</th>
                <th className="text-left px-3 py-2 font-semibold">Tip hash</th>
                <th className="text-center px-3 py-2 font-semibold">Block</th>
                <th className="text-center px-3 py-2 font-semibold">Status</th>
                <th className="text-right px-5 py-2 font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {anchors.map(a => (
                <tr key={a.id} className="hover:bg-[var(--bg-secondary)]">
                  <td className="px-5 py-2.5 text-[var(--text-xs)] text-[var(--text-secondary)]">{new Date(a.anchored_at).toLocaleString()}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--accent-teal)]">{a.tip_hash.slice(0, 24)}…</td>
                  <td className="px-3 py-2.5 text-center text-[var(--text-xs)] tabular-nums text-[var(--text-secondary)]">#{a.tip_block_number}</td>
                  <td className="px-3 py-2.5 text-center">
                    {a.status === 'confirmed' ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--status-ok)] bg-[var(--accent-green-light)] px-1.5 py-0.5 rounded">
                        BTC block #{a.bitcoin_block_height}
                      </span>
                    ) : a.status === 'pending' ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#F7931A] bg-[#F7931A]/10 px-1.5 py-0.5 rounded">
                        Pending · submitted
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--status-reject)] bg-[var(--accent-red-light)] px-1.5 py-0.5 rounded" title={a.error_message ?? ''}>
                        Failed
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
                             if (!res.ok) { alert('Download failed'); return }
                             const blob = await res.blob()
                             const url = URL.createObjectURL(blob)
                             const link = document.createElement('a')
                             link.href = url
                             link.download = `${a.tip_hash.slice(2, 18)}.ots`
                             link.click()
                             URL.revokeObjectURL(url)
                           } catch { alert('Download failed') }
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
            Every anchor submits the chain tip's SHA-256 to the public OpenTimestamps calendar network.
            Partial receipts confirm within minutes; Bitcoin block confirmation follows in 1–6 hours.
            Download the <code className="font-mono">.ots</code> file to verify independently via <a href="https://opentimestamps.org" target="_blank" rel="noreferrer" className="text-[var(--color-brand)] underline">opentimestamps.org</a>.
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
            <span className="font-medium">Filters</span>
          </div>

          {/* Facility Dropdown */}
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="text-[var(--text-sm)] border border-[var(--border-default)] rounded-lg px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-teal)_20%,transparent)] focus:border-[var(--accent-teal)] transition-all duration-300 cursor-pointer"
          >
            <option value="all">All Facilities</option>
            {facilities.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Event Type Dropdown */}
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-[var(--text-sm)] border border-[var(--border-default)] rounded-lg px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-teal)_20%,transparent)] focus:border-[var(--accent-teal)] transition-all duration-300 cursor-pointer"
          >
            <option value="all">All Event Types</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by hash, Merkle root, or data point..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[var(--text-sm)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-teal)_20%,transparent)] focus:border-[var(--accent-teal)] focus:bg-[var(--bg-primary)] transition-all duration-300"
            />
          </div>

          {/* Result count */}
          <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] ml-auto tabular-nums">
            {filteredRecords.length} of {displayRecords.length} records
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
                    Timestamp
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  Event Type
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  Facility
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  Data Point
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Submitter (DID)
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Approver (DID)
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Merkle Root
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Tx Hash
                  </div>
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  Block #
                </th>
                <th className="text-left font-display font-semibold text-[var(--text-tertiary)] px-4 py-3 whitespace-nowrap text-[var(--text-xs)] uppercase tracking-wider">
                  Status
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
                      {formatTimestamp(record.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={eventTypeBadgeVariant[normaliseEventType(record.eventType)]}>
                        <Icon className="w-3 h-3" />
                        {record.eventType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] text-[var(--text-xs)]">
                      {record.facility}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] text-[var(--text-xs)] font-medium">
                      {record.dataPoint}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-[var(--text-xs)] text-[var(--text-secondary)]">{record.submitter}</div>
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
                        {statusLabel[record.status]}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">
                    No records match the current filters.
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
          Understanding Blockchain Verification
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {faqItems.map((item, idx) => (
            <FaqCard key={item.question} question={item.question} answer={item.answer} index={idx} />
          ))}
        </div>
      </div>
    </div>
  )
}
