import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, AlertCircle, Eye, Shield, CheckCircle2, ArrowRight, FileOutput,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  nexus,
  type NexusQuestionnaireItem,
  type NexusDataValue,
} from '../lib/api'
import { computeReadiness, truncateHash, formatValue, CAPITAL_ORDER } from '../reports/spdTemplate'
import SetupGuard from '../components/SetupGuard'
import { Button } from '../design-system'
import JourneyBar from '../components/JourneyBar'

const ACTIVE_YEAR = 2026

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; error: string }
  | { kind: 'ready'; items: NexusQuestionnaireItem[]; reviewQueue: NexusDataValue[]; approvalQueue: NexusDataValue[] }

/**
 * SO Workflow Dashboard — SRD §14.5.
 * Live KPIs across the reporting year. Status donut, bottleneck list,
 * coverage heat-map by capital, publish-readiness indicator.
 */
export default function Workflow() {
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const [items, reviewQueue, approvalQueue] = await Promise.all([
        nexus.tree(),
        nexus.reviewQueue(),
        nexus.approvalQueue(),
      ])
      if (items.length === 0) return setState({ kind: 'empty' })
      setState({ kind: 'ready', items, reviewQueue, approvalQueue })
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : 'Failed to load' })
    }
  }

  useEffect(() => { load() }, [])

  const readiness = useMemo(() => {
    if (state.kind !== 'ready') return null
    const currentByItem = new Map<string, NexusDataValue>()
    for (const dv of state.reviewQueue) currentByItem.set(dv.questionnaire_item_id, dv)
    for (const dv of state.approvalQueue) currentByItem.set(dv.questionnaire_item_id, dv)
    return computeReadiness(state.items, currentByItem)
  }, [state])

  const coverageByCapital = useMemo(() => {
    if (state.kind !== 'ready') return []
    const groupItems = state.items.filter(i => i.reporting_scope === 'group')
    const currentByItem = new Map<string, NexusDataValue>()
    for (const dv of state.reviewQueue) currentByItem.set(dv.questionnaire_item_id, dv)
    for (const dv of state.approvalQueue) currentByItem.set(dv.questionnaire_item_id, dv)

    return CAPITAL_ORDER.map(capital => {
      const inCap = groupItems.filter(i => i.section === capital)
      if (inCap.length === 0) return null
      let approved = 0, pending = 0, notStarted = 0
      for (const it of inCap) {
        const dv = currentByItem.get(it.id)
        if (dv?.status === 'approved' || dv?.status === 'published') approved++
        else if (dv && (dv.status === 'submitted' || dv.status === 'reviewed')) pending++
        else notStarted++
      }
      return { capital, total: inCap.length, approved, pending, notStarted, pct: (approved / inCap.length) * 100 }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  }, [state])

  const donutData = useMemo(() => {
    if (!readiness) return []
    return [
      { name: 'Approved', value: readiness.approved + readiness.published, color: 'var(--status-ok)' },
      { name: 'Reviewed', value: readiness.reviewed, color: 'var(--status-pending)' },
      { name: 'Submitted', value: readiness.submitted, color: 'var(--accent-blue-light)' },
      { name: 'Draft', value: readiness.draft, color: 'var(--status-draft)' },
      { name: 'Not started', value: readiness.notStarted, color: 'var(--border-strong)' },
    ].filter(d => d.value > 0)
  }, [readiness])

  if (state.kind === 'loading') return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>
  if (state.kind === 'empty') return <SetupGuard onReady={load} />
  if (state.kind === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Unable to load workflow</h3>
            <p className="text-[var(--text-sm)] text-[var(--text-secondary)] font-mono mt-1">{state.error}</p>
            <button onClick={load} className="mt-3 text-[var(--text-sm)] font-medium text-[var(--color-brand)] hover:underline">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  const r = readiness!

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pipeline context */}
      <JourneyBar variant="compact" highlight="approve" />

      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)]">Workflow — FY{ACTIVE_YEAR}</h1>
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1">
            Sustainability Officer dashboard. Track GRI line items from entry through approval to published report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => navigate('/workflow/review')}>
            Review queue
          </Button>
          <Button variant="secondary" size="sm" icon={<Shield className="w-3.5 h-3.5" />} onClick={() => navigate('/workflow/approval')}>
            Approval queue
          </Button>
          <Button variant="primary" size="sm" icon={<FileOutput className="w-3.5 h-3.5" />} onClick={() => navigate('/reports')}>
            Publish Centre
          </Button>
        </div>
      </header>

      {/* KPI + Donut row */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Readiness meter */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Publish readiness</h2>
            {r.ready
              ? <span className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-semibold bg-[var(--accent-green-light)] text-[var(--status-ok)]">Ready — 100% approved</span>
              : <span className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-semibold bg-[var(--accent-amber-light)] text-[var(--status-draft)]">{Math.round(r.pctApproved)}% approved</span>
            }
          </div>
          <div className="relative h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mb-4">
            <div className="absolute inset-y-0 left-0 bg-[var(--color-brand)] transition-all duration-500" style={{ width: `${r.pctApproved}%` }} />
          </div>
          <div className="grid grid-cols-6 gap-2 text-[var(--text-xs)]">
            <KpiMini label="Not started" value={r.notStarted} tone="neutral" />
            <KpiMini label="Draft" value={r.draft} tone="draft" />
            <KpiMini label="Submitted" value={r.submitted} tone="pending" />
            <KpiMini label="Reviewed" value={r.reviewed} tone="pending" />
            <KpiMini label="Approved" value={r.approved} tone="ok" />
            <KpiMini label="Published" value={r.published} tone="ok" />
          </div>
          <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-3">
            {r.total} required group-scope line items · JV parallel scope tracked separately
          </p>
        </div>

        {/* Donut */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 flex flex-col">
          <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mb-2">Status distribution</h3>
          <div className="flex-1 min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 4, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Queues + coverage */}
      <div className="grid grid-cols-2 gap-4">
        <QueuePreview
          title="Review queue"
          subtitle="Team Lead action"
          icon={<Eye className="w-4 h-4" />}
          items={state.reviewQueue}
          onOpen={() => navigate('/workflow/review')}
        />
        <QueuePreview
          title="Approval queue"
          subtitle="Sustainability Officer action"
          icon={<Shield className="w-4 h-4" />}
          items={state.approvalQueue}
          onOpen={() => navigate('/workflow/approval')}
        />
      </div>

      {/* Coverage by Capital */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Coverage by capital</h2>
          <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Approved ÷ total · GC Group scope</span>
        </div>
        <div className="space-y-2.5">
          {coverageByCapital.map(c => (
            <div key={c.capital} className="flex items-center gap-3">
              <div className="w-[180px] text-[var(--text-sm)] font-medium text-[var(--text-primary)] truncate">{c.capital}</div>
              <div className="flex-1 h-5 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] overflow-hidden flex">
                <div className="bg-[var(--status-ok)]" style={{ width: `${(c.approved / c.total) * 100}%` }} title={`${c.approved} approved`} />
                <div className="bg-[var(--status-pending)]" style={{ width: `${(c.pending / c.total) * 100}%` }} title={`${c.pending} in flight`} />
              </div>
              <div className="w-[160px] text-[var(--text-xs)] text-[var(--text-tertiary)] tabular-nums text-right">
                <span className="font-semibold text-[var(--status-ok)]">{c.approved}</span>
                <span className="mx-1">/</span>
                <span>{c.total}</span>
                <span className="ml-2 px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-secondary)] font-semibold">{Math.round(c.pct)}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottlenecks / stale items */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Bottlenecks</h2>
          <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Items in flight, oldest first</span>
        </div>
        {state.reviewQueue.length === 0 && state.approvalQueue.length === 0 ? (
          <div className="py-8 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">
            <CheckCircle2 className="w-8 h-8 text-[var(--status-ok)] mx-auto mb-2" />
            No items waiting on review or approval. Inbox zero.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {[...state.reviewQueue.map(dv => ({ dv, stage: 'review' as const })),
              ...state.approvalQueue.map(dv => ({ dv, stage: 'approval' as const }))]
              .sort((a, b) => {
                const da = a.stage === 'review' ? a.dv.submitted_at : a.dv.reviewed_at
                const db = b.stage === 'review' ? b.dv.submitted_at : b.dv.reviewed_at
                return (da ?? '') < (db ?? '') ? -1 : 1
              })
              .slice(0, 10)
              .map(({ dv, stage }) => (
                <li key={dv.id} className="py-2.5 flex items-center justify-between gap-3 text-[var(--text-xs)]">
                  <div className="min-w-0 flex-1">
                    <div className="text-[var(--text-primary)] font-medium truncate">{dv.line_item ?? '(unknown)'}</div>
                    <div className="text-[var(--text-tertiary)]">{dv.gri_code} · {dv.section}</div>
                  </div>
                  <span className="tabular-nums font-semibold text-[var(--text-primary)]">{formatValue(dv.value, dv.unit)}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--accent-blue-light)] text-[var(--status-pending)] text-[10px] font-semibold uppercase tracking-wider">
                    {stage === 'review' ? <Eye className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                    {stage === 'review' ? 'Review' : 'Approve'}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{truncateHash(dv.value_hash)}</span>
                  <button
                    type="button"
                    onClick={() => navigate(stage === 'review' ? '/workflow/review' : '/workflow/approval')}
                    className="text-[var(--color-brand)] hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    Open <ArrowRight className="w-3 h-3" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function KpiMini({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'draft' | 'pending' | 'ok' }) {
  const bg = tone === 'ok' ? 'var(--accent-green-light)'
    : tone === 'pending' ? 'var(--accent-blue-light)'
    : tone === 'draft' ? 'var(--accent-amber-light)'
    : 'var(--bg-secondary)'
  const fg = tone === 'ok' ? 'var(--status-ok)'
    : tone === 'pending' ? 'var(--status-pending)'
    : tone === 'draft' ? 'var(--status-draft)'
    : 'var(--text-secondary)'
  return (
    <div className="rounded-[var(--radius-sm)] p-2 border border-[var(--border-subtle)]" style={{ backgroundColor: bg }}>
      <p className="text-[9px] uppercase tracking-wider font-medium" style={{ color: fg }}>{label}</p>
      <p className="text-[var(--text-lg)] font-bold tabular-nums" style={{ color: fg }}>{value}</p>
    </div>
  )
}

function QueuePreview({
  title, subtitle, icon, items, onOpen,
}: {
  title: string; subtitle: string; icon: React.ReactNode
  items: NexusDataValue[]; onOpen: () => void
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">{subtitle}</p>
          </div>
        </div>
        <span className="text-[var(--text-2xl)] font-bold tabular-nums text-[var(--color-brand)]">{items.length}</span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)] max-h-[200px] overflow-y-auto">
        {items.slice(0, 5).map(dv => (
          <div key={dv.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-[var(--text-xs)]">
            <div className="min-w-0 flex-1">
              <p className="text-[var(--text-primary)] font-medium truncate">{dv.line_item ?? '(unknown)'}</p>
              <p className="text-[var(--text-tertiary)]">{dv.gri_code}</p>
            </div>
            <span className="font-mono text-[var(--text-tertiary)] text-[10px]">{truncateHash(dv.value_hash)}</span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-[var(--text-xs)] text-[var(--text-tertiary)]">Queue empty</div>
        )}
      </div>
      {items.length > 0 && (
        <button
          onClick={onOpen}
          className="w-full px-4 py-2.5 border-t border-[var(--border-subtle)] text-[var(--text-xs)] font-medium text-[var(--color-brand)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          Open full queue →
        </button>
      )}
    </div>
  )
}
