import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, CheckCircle2, XCircle, Eye, Shield, Send, ArrowRight, Factory,
  Calendar, Paperclip, Inbox, User, MessageSquare,
} from 'lucide-react'
import { orgStore, type QuestionAssignment, type OrgEntity, type Anomaly } from '../lib/orgStore'
import { AlertOctagon, AlertTriangle } from 'lucide-react'
import { useFramework, getFramework } from '../lib/frameworks'
import JourneyBar from '../components/JourneyBar'
import { FrameworkBadge } from '../components/FrameworkBadge'
import CommentThread from '../components/CommentThread'
import { HistoricalReferencePanel } from '../components/HistoricalReferencePanel'

export type QueueKind = 'review' | 'approval'

const KIND_META = {
  review: {
    title: 'Review queue',
    subtitle: 'Subsidiary leads check every submitted plant figure before it reaches the group officer.',
    inputStatus: 'submitted' as const,
    passStatus: 'reviewed' as const,
    rejectLabel: 'Send back to plant',
    passLabel: 'Pass to approval',
    icon: Eye,
    stageHighlight: 'review' as const,
  },
  approval: {
    title: 'Approval queue',
    subtitle: 'Sustainability officers approve reviewed figures. Approved lines feed the group rollup and the GRI report.',
    inputStatus: 'reviewed' as const,
    passStatus: 'approved' as const,
    rejectLabel: 'Reject',
    passLabel: 'Approve',
    icon: Shield,
    stageHighlight: 'approve' as const,
  },
}

/**
 * Queue of assignments waiting for the reviewer/approver. Reads straight
 * from the local orgStore so it lines up with what contributors submit.
 * Decisions advance the status machine:
 *   submitted → reviewed → approved   (pass)
 *   any → rejected                    (reject, with comment)
 */
export default function WorkflowQueue({ kind }: { kind: QueueKind }) {
  const navigate = useNavigate()
  const meta = KIND_META[kind]
  const { active: framework } = useFramework()
  const [allAssignments, setAllAssignments] = useState<QuestionAssignment[]>([])
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [anomalyMap, setAnomalyMap] = useState<Map<string, Anomaly[]>>(new Map())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [justActedOn, setJustActedOn] = useState<string | null>(null)

  const refresh = async () => {
    try {
      const [rows, ents, anomalies] = await Promise.all([
        orgStore.listAssignments(),
        orgStore.listEntities(),
        orgStore.anomalyScan('role', { limit: 500 }).catch(() => ({ anomalies: [] as Anomaly[] })),
      ])
      setAllAssignments(rows)
      setEntities(ents)
      const m = new Map<string, Anomaly[]>()
      for (const a of anomalies.anomalies) {
        const arr = m.get(a.assignment_id) ?? []
        arr.push(a)
        m.set(a.assignment_id, arr)
      }
      setAnomalyMap(m)
    } catch { /* silent */ }
  }

  useEffect(() => {
    refresh()
  }, [framework.id, kind])

  const assignments = useMemo(
    () => allAssignments.filter(a => a.framework_id === framework.id && a.status === meta.inputStatus),
    [allAssignments, framework.id, meta.inputStatus]
  )

  const plantName = (entityId: string): string =>
    entities.find(e => e.id === entityId)?.name ?? entityId

  useEffect(() => {
    if (!assignments.find(a => a.id === selectedId)) {
      setSelectedId(assignments[0]?.id ?? null)
    }
  }, [assignments, selectedId])

  const selected = useMemo(
    () => assignments.find(a => a.id === selectedId) || null,
    [assignments, selectedId]
  )

  const handlePass = async (a: QuestionAssignment) => {
    setBusy(a.id)
    try {
      await orgStore.updateAssignment(a.id, { status: meta.passStatus, comment: comment || a.comment })
      setComment('')
      setJustActedOn(a.id)
      setTimeout(() => setJustActedOn(null), 2500)
      await refresh()
    } catch (e) {
      alert(`Could not update: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(null)
    }
  }

  const handleReject = async (a: QuestionAssignment) => {
    if (!comment.trim()) {
      alert('Please leave a short comment explaining why you\'re sending it back.')
      return
    }
    setBusy(a.id)
    try {
      await orgStore.updateAssignment(a.id, { status: 'rejected', comment })
      setComment('')
      setJustActedOn(a.id)
      setTimeout(() => setJustActedOn(null), 2500)
      await refresh()
    } catch (e) {
      alert(`Could not update: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <JourneyBar variant="compact" highlight={meta.stageHighlight} />
      </div>

      <header className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
            <meta.icon className="w-3 h-3" /> {meta.title}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">{meta.title}</h1>
            <FrameworkBadge size="md" />
          </div>
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1 max-w-2xl">
            {meta.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(kind === 'review' ? '/workflow/approval' : '/workflow/review')}
            className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-xs)] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] inline-flex items-center gap-1.5"
          >
            {kind === 'review' ? 'Switch to approval queue' : 'Switch to review queue'} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <QueueStat
          label={kind === 'review' ? 'Waiting for review' : 'Waiting for approval'}
          value={assignments.length}
          tone={assignments.length > 0 ? 'pending' : 'neutral'}
        />
        <QueueStat
          label="Already reviewed"
          value={allAssignments.filter(a => a.framework_id === framework.id && a.status === 'reviewed').length}
          tone="pending"
        />
        <QueueStat
          label="Approved"
          value={allAssignments.filter(a => a.framework_id === framework.id && a.status === 'approved').length}
          tone="ok"
        />
      </div>

      {assignments.length === 0 ? (
        <EmptyQueue kind={kind} />
      ) : (
        <div className="grid grid-cols-[380px_1fr] gap-4">
          {/* Queue list */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden max-h-[70vh] flex flex-col">
            <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                Queue · {assignments.length}
              </span>
            </div>
            <ul className="overflow-y-auto flex-1 divide-y divide-[var(--border-subtle)]">
              {assignments.map(a => {
                const isSel = a.id === selectedId
                const recentlyActed = a.id === justActedOn
                const flags = anomalyMap.get(a.id) ?? []
                const hasCritical = flags.some(f => f.severity === 'critical')
                const hasWarn = flags.some(f => f.severity === 'warn')
                const headline = flags[0]?.headline
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => { setSelectedId(a.id); setComment(a.comment ?? '') }}
                      className={`w-full text-left p-3 transition-colors relative ${
                        isSel ? 'bg-[var(--color-brand-soft)]'
                        : recentlyActed ? 'bg-[var(--accent-green-light)]/30'
                        : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      {hasCritical && (
                        <span className="absolute top-0 bottom-0 left-0 w-[3px]" style={{ background: 'var(--accent-red)' }} />
                      )}
                      {!hasCritical && hasWarn && (
                        <span className="absolute top-0 bottom-0 left-0 w-[3px]" style={{ background: 'var(--accent-amber)' }} />
                      )}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[9px] font-bold text-[var(--color-brand)]">{a.gri_code}</span>
                        {a.used_mode && (
                          <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">· {a.used_mode}</span>
                        )}
                        {flags.length > 0 && (
                          <span
                            className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold"
                            style={{
                              background: hasCritical ? 'var(--accent-red-light)' : 'var(--accent-amber-light)',
                              color: hasCritical ? 'var(--accent-red)' : 'var(--accent-amber)',
                            }}
                          >
                            {hasCritical ? <AlertOctagon className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                            {flags.length}
                          </span>
                        )}
                      </div>
                      <div className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)] line-clamp-2">
                        {a.line_item}
                      </div>
                      {headline && (
                        <div className="text-[10px] mt-0.5 line-clamp-1" style={{ color: hasCritical ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                          {headline}
                        </div>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                        <Factory className="w-2.5 h-2.5" />
                        <span className="truncate flex-1">{plantName(a.entityId)}</span>
                        <span className="tabular-nums font-semibold text-[var(--text-secondary)]">
                          {a.value != null ? formatValue(a.value) : '—'}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Detail + decision */}
          {selected ? (
            <DetailPane
              assignment={selected}
              comment={comment}
              setComment={setComment}
              kind={kind}
              busy={busy === selected.id}
              onPass={() => handlePass(selected)}
              onReject={() => handleReject(selected)}
              plantName={plantName}
            />
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)] p-12 text-center">
              <Inbox className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-2" />
              <p className="text-[var(--text-sm)] text-[var(--text-tertiary)]">Pick a row on the left</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QueueStat({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'pending' | 'ok' }) {
  const bg = tone === 'pending' ? 'var(--accent-blue-light)'
    : tone === 'ok' ? 'var(--accent-green-light)' : 'var(--bg-primary)'
  const fg = tone === 'pending' ? 'var(--status-pending)'
    : tone === 'ok' ? 'var(--status-ok)' : 'var(--text-primary)'
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] p-4" style={{ background: bg }}>
      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: fg, opacity: 0.8 }}>{label}</div>
      <div className="text-[24px] font-bold tabular-nums mt-0.5" style={{ color: fg }}>{value}</div>
    </div>
  )
}

function EmptyQueue({ kind }: { kind: QueueKind }) {
  const navigate = useNavigate()
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)] py-14 text-center">
      <CheckCircle2 className="w-10 h-10 mx-auto text-[var(--status-ok)] mb-2" />
      <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
        Queue is empty
      </h3>
      <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1 max-w-sm mx-auto">
        {kind === 'review'
          ? 'No plant submissions are waiting for a lead to review.'
          : 'Nothing is awaiting approval from the sustainability officer.'}
      </p>
      <button
        onClick={() => navigate('/aggregator')}
        className="mt-4 text-[var(--text-xs)] font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
      >
        View group rollup <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

function DetailPane({
  assignment, comment, setComment, kind, busy, onPass, onReject, plantName,
}: {
  assignment: QuestionAssignment
  comment: string
  setComment: (v: string) => void
  kind: QueueKind
  busy: boolean
  onPass: () => void
  onReject: () => void
  plantName: (id: string) => string
}) {
  const meta = KIND_META[kind]
  const fw = getFramework(assignment.framework_id)

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {fw && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: `${fw.color}22`, color: fw.color }}>
              {fw.code}
            </span>
          )}
          <span className="text-[10px] font-bold text-[var(--color-brand)]">{assignment.gri_code}</span>
        </div>
        <h2 className="font-display text-[var(--text-xl)] font-bold text-[var(--text-primary)]">
          {assignment.line_item}
        </h2>
      </div>

      {/* Context */}
      <div className="grid grid-cols-2 gap-3">
        <ContextItem icon={Factory} label="Reporting entity" value={plantName(assignment.entityId)} />
        <ContextItem icon={User} label="Submitted by" value={assignment.assigneeName} subvalue={assignment.assigneeEmail} />
        <ContextItem
          icon={Calendar} label="Due"
          value={assignment.due_date ?? '—'}
          tone={assignment.due_date && new Date(assignment.due_date) < new Date() ? 'reject' : 'default'}
        />
        <ContextItem icon={Send} label="Mode used" value={assignment.used_mode ?? '—'} />
      </div>

      {/* Value or narrative preview */}
      {assignment.response_type === 'narrative' ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)]/40 p-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-brand-strong)] mb-1">
            Submitted narrative ({(assignment.narrative_body ?? '').length} chars)
          </div>
          <p className="text-[var(--text-xs)] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
            {assignment.narrative_body || <span className="italic text-[var(--text-tertiary)]">No narrative submitted.</span>}
          </p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)]/40 p-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-brand-strong)] mb-1">
            Submitted value
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold tabular-nums text-[var(--color-brand-strong)]">
              {assignment.value != null ? formatValue(assignment.value) : '—'}
            </span>
            {assignment.unit && <span className="text-[var(--text-xs)] text-[var(--color-brand-strong)]">{assignment.unit}</span>}
          </div>
        </div>
      )}

      {/* YoY variance + unit check (numeric only) */}
      {assignment.response_type !== 'narrative' && (
        <VarianceCheck assignment={assignment} />
      )}

      {/* Full 4-year historical reference — reviewer has cradle-to-grave context */}
      {assignment.response_type !== 'narrative' && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] overflow-hidden">
          <HistoricalReferencePanel
            questionnaire_item_id={assignment.questionId}
            entity_id={assignment.entityId}
            currentValue={assignment.value ?? null}
          />
        </div>
      )}

      {/* Evidence */}
      {assignment.evidence_ids && assignment.evidence_ids.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2 flex items-center gap-1">
            <Paperclip className="w-3 h-3" /> Evidence attached ({assignment.evidence_ids.length})
          </div>
          <ul className="space-y-1">
            {assignment.evidence_ids.map((e, i) => (
              <li key={i} className="text-[var(--text-xs)] text-[var(--text-secondary)] font-mono bg-[var(--bg-secondary)] px-2 py-1.5 rounded-[var(--radius-sm)]">
                {e.startsWith('connector:') ? `🔌 ${e.split(':')[1]}` : `📎 ${e.replace(/^ev_/, '')}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prior comment */}
      {assignment.comment && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Note from contributor
          </div>
          <p className="text-[var(--text-xs)] text-[var(--text-secondary)] italic bg-[var(--bg-secondary)] p-3 rounded-[var(--radius-sm)] border-l-2 border-[var(--color-brand)]">
            {assignment.comment}
          </p>
        </div>
      )}

      {/* Decision panel */}
      <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">
            Comment (required to reject)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder={kind === 'review'
              ? 'Optional note for the officer, or required if sending back.'
              : 'Optional, or required if rejecting.'}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onPass}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {meta.passLabel}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--status-reject)]/30 text-[var(--status-reject)] text-[var(--text-sm)] font-semibold hover:bg-[var(--accent-red-light)] disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            {meta.rejectLabel}
          </button>
        </div>
      </div>

      {/* Threaded discussion */}
      <CommentThread assignmentId={assignment.id} />
    </div>
  )
}

/**
 * YoY variance + unit-check for numeric assignments. Fetches historical_value
 * for this question, compares to the submitted value, surfaces any red flags.
 */
function VarianceCheck({ assignment }: { assignment: QuestionAssignment }) {
  const [history, setHistory] = useState<Array<{ year: number; value: number; source_report: string }>>([])
  useEffect(() => {
    orgStore.historical(assignment.questionId).then(setHistory).catch(() => setHistory([]))
  }, [assignment.questionId])

  if (assignment.value == null) return null

  const latest = history.length > 0 ? [...history].sort((a, b) => b.year - a.year)[0] : null
  const current = Number(assignment.value)
  const priorVal = latest ? Number(latest.value) : null
  const delta = priorVal != null && priorVal !== 0 ? ((current - priorVal) / Math.abs(priorVal)) * 100 : null
  const flags: Array<{ tone: 'warn' | 'info'; text: string }> = []

  if (delta != null && Math.abs(delta) > 20) {
    flags.push({
      tone: 'warn',
      text: `YoY change of ${delta > 0 ? '+' : ''}${delta.toFixed(1)}% vs FY${latest!.year} (${latest!.value.toLocaleString()}). Verify before approving.`,
    })
  } else if (delta != null) {
    flags.push({
      tone: 'info',
      text: `YoY change ${delta > 0 ? '+' : ''}${delta.toFixed(1)}% vs FY${latest!.year} — within expected range.`,
    })
  } else {
    flags.push({ tone: 'info', text: 'No prior-year value on file. Cannot run variance check.' })
  }

  // Unit sanity check — if entered without a unit on a numeric question, flag it
  if (!assignment.unit || assignment.unit.trim() === '') {
    flags.push({ tone: 'warn', text: 'No unit stamped on this value. Confirm with the submitter before approving.' })
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Data-quality checks</div>
      {flags.map((f, i) => (
        <div key={i} className={`text-[11px] flex items-start gap-1.5 ${f.tone === 'warn' ? 'text-[var(--status-draft)]' : 'text-[var(--text-secondary)]'}`}>
          <span className="mt-0.5">{f.tone === 'warn' ? '⚠' : 'ℹ'}</span>
          <span>{f.text}</span>
        </div>
      ))}
    </div>
  )
}

function ContextItem({
  icon: Icon, label, value, subvalue, tone = 'default',
}: {
  icon: typeof Factory
  label: string
  value: string
  subvalue?: string
  tone?: 'default' | 'reject'
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`text-[var(--text-sm)] font-semibold mt-1 ${tone === 'reject' ? 'text-[var(--status-reject)]' : 'text-[var(--text-primary)]'}`}>
        {value}
      </div>
      {subvalue && <div className="text-[10px] text-[var(--text-tertiary)] truncate">{subvalue}</div>}
    </div>
  )
}

// plantName is now a closure using the already-loaded entities array

function formatValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return v.toFixed(2)
}
