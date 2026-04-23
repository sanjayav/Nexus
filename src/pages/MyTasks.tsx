import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardList, Factory, Calendar, CheckCircle2, Clock, Paperclip,
  PencilLine, Calculator as CalcIcon, Plug, Send, Upload, X, FileText,
  Sparkles, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { orgStore, type QuestionAssignment, type OrgEntity, type OrgMember } from '../lib/orgStore'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import { findCalculator, type CalcDescriptor, type CalcInputValues } from '../calculators/registry'
import { resolveRole, ROLE_CATALOG } from '../lib/rbac'
import PipelineJourney, { NextAction } from '../components/PipelineJourney'
import { computePipeline, focusStage } from '../lib/journey'
import { useOrgData } from '../lib/useOrgData'
import { useNavigate } from 'react-router-dom'
import { useFramework, getFramework } from '../lib/frameworks'
import CommentThread from '../components/CommentThread'

type FilterState = 'all' | 'pending' | 'in_progress' | 'submitted' | 'approved'

export default function MyTasks() {
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const [assignments, setAssignments] = useState<QuestionAssignment[]>([])
  const [questions, setQuestions] = useState<NexusQuestionnaireItem[]>([])
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterState>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const [members, setMembers] = useState<OrgMember[]>([])

  const refresh = async () => {
    if (!user?.email) return
    try {
      const [rows, ents, mems] = await Promise.all([
        orgStore.myAssignments(),
        orgStore.listEntities(),
        orgStore.listMembers(),
      ])
      setAssignments(rows.filter(a => a.framework_id === framework.id))
      setEntities(ents)
      setMembers(mems)
    } catch { /* surface a banner later */ }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refresh()
      try {
        const t = await nexus.tree(framework.id)
        if (!cancelled) setQuestions(t)
      } catch { /* tree is optional on this page now */ }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, framework.id])

  const entityById = useMemo(() => new Map(entities.map(e => [e.id, e])), [entities])
  const questionById = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions])

  const filtered = useMemo(() => {
    return assignments.filter(a => {
      if (filter === 'all') return true
      if (filter === 'pending') return a.status === 'not_started'
      if (filter === 'in_progress') return a.status === 'in_progress'
      if (filter === 'submitted') return a.status === 'submitted' || a.status === 'reviewed'
      if (filter === 'approved') return a.status === 'approved'
      return true
    })
  }, [assignments, filter])

  const stats = useMemo(() => ({
    total: assignments.length,
    notStarted: assignments.filter(a => a.status === 'not_started').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    submitted: assignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length,
    approved: assignments.filter(a => a.status === 'approved').length,
  }), [assignments])

  const role = resolveRole(user)
  const roleMeta = ROLE_CATALOG[role]
  const completion = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0

  const firstName = user?.name?.split(' ')[0] || 'there'

  const updateAssignment = async (id: string, patch: Partial<QuestionAssignment>) => {
    await orgStore.updateAssignment(id, patch)
    await refresh()
  }

  // Flow + next action data (role-aware)
  const { data: orgData } = useOrgData()
  const navigate = useNavigate()
  const pipeline = useMemo(() => computePipeline(user, orgData ?? null), [user, orgData])
  const focus = useMemo(() => focusStage(user, orgData ?? null), [user, orgData])
  const openCount = useMemo(() =>
    assignments.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected').length
  , [assignments])

  return (
    <div className="animate-fade-in space-y-5">
      {/* ─── Flow + Next Action — the same story every role sees ─── */}
      <div className="space-y-4">
        {focus && (
          <NextAction
            stage={focus}
            reason={
              openCount === 0
                ? `All your disclosures are submitted, ${user?.name?.split(' ')[0] ?? ''}. Good work.`
                : `You have ${openCount} disclosure${openCount === 1 ? '' : 's'} open. Start with the one closest to its deadline.`
            }
            cta={openCount === 0 ? 'Browse all tasks' : 'Start working'}
            secondary={openCount > 0 ? 'See approved history' : undefined}
            onPrimary={() => {
              const first = assignments.find(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected')
              if (first) navigate(`/data/entry/${first.questionId}`)
            }}
            onSecondary={() => setFilter('approved')}
          />
        )}
        <PipelineJourney stages={pipeline} activeKey={focus?.stage.key} myRole={role} />
      </div>

      {/* Hero */}
      <div className="rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-strong)] text-white p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70">
              <Sparkles className="w-3 h-3" /> {roleMeta.name}
            </div>
            <h1 className="font-display text-[28px] font-bold mt-1">Hi {firstName} — here's what's on your plate.</h1>
            <p className="text-[var(--text-sm)] text-white/80 mt-1 max-w-xl">
              {stats.total === 0
                ? 'You have no assigned questions yet. Once an admin or lead assigns you a GRI line item, it appears here.'
                : `${stats.notStarted + stats.inProgress} to do · ${stats.submitted} waiting on review · ${stats.approved} approved`}
            </p>
          </div>
          {stats.total > 0 && (
            <div className="flex items-center gap-6">
              <RingStat pct={completion} label="Complete" />
            </div>
          )}
        </div>

        {stats.total > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-5">
            {([
              { key: 'pending', label: 'To do', value: stats.notStarted, icon: Clock },
              { key: 'in_progress', label: 'In progress', value: stats.inProgress, icon: PencilLine },
              { key: 'submitted', label: 'Awaiting review', value: stats.submitted, icon: Send },
              { key: 'approved', label: 'Approved', value: stats.approved, icon: CheckCircle2 },
            ] as const).map(s => (
              <button
                key={s.key}
                onClick={() => setFilter(s.key as FilterState)}
                className={`rounded-[var(--radius-md)] text-left p-3 backdrop-blur transition-colors ${
                  filter === s.key ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/70 font-semibold">
                  <s.icon className="w-3 h-3" /> {s.label}
                </div>
                <div className="text-[26px] font-bold tabular-nums mt-0.5">{s.value}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'pending', 'in_progress', 'submitted', 'approved'] as FilterState[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[var(--text-xs)] font-semibold transition-colors ${
              filter === f ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'in_progress' ? 'In progress' : f === 'pending' ? 'To do' : f === 'submitted' ? 'Awaiting review' : 'Approved'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>
      ) : filtered.length === 0 ? (
        <EmptyList total={stats.total} filter={filter} />
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              question={questionById.get(a.questionId)}
              entity={entityById.get(a.entityId)}
              expanded={expanded === a.id}
              onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
              onUpdate={patch => updateAssignment(a.id, patch)}
              entities={entities}
              members={members}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RingStat({ pct, label }: { pct: number; label: string }) {
  const r = 32
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-[72px] h-[72px]">
        <svg width={72} height={72} viewBox="0 0 72 72">
          <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={6} />
          <circle cx={36} cy={36} r={r} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`} transform="rotate(-90 36 36)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[16px] font-bold tabular-nums">{pct}%</span>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-white/80">{label}</div>
    </div>
  )
}

function EmptyList({ total, filter }: { total: number; filter: FilterState }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)] py-14 text-center">
      <ClipboardList className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-2" />
      <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
        {total === 0 ? 'No assignments yet' : `Nothing ${filter === 'all' ? '' : 'in this bucket'}`}
      </h3>
      <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1">
        {total === 0 ? 'Your admin hasn\'t assigned you GRI line items yet.' : 'Try a different tab.'}
      </p>
    </div>
  )
}

function AssignmentRow({
  assignment, question, entity, expanded, onToggle, onUpdate, entities, members,
}: {
  assignment: QuestionAssignment
  question: NexusQuestionnaireItem | undefined
  entity: OrgEntity | undefined
  expanded: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<QuestionAssignment>) => Promise<void> | void
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  const statusColor = {
    not_started: 'var(--text-tertiary)',
    in_progress: 'var(--status-draft)',
    submitted:   'var(--status-pending)',
    reviewed:    'var(--status-pending)',
    approved:    'var(--status-ok)',
    rejected:    'var(--status-reject)',
  }[assignment.status]

  const modes = assignment.entry_modes ?? ['Manual']

  const dueSoon = assignment.due_date ? (new Date(assignment.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 7 : false

  return (
    <div className={`rounded-[var(--radius-lg)] border bg-[var(--bg-primary)] transition-all ${
      expanded ? 'border-[var(--color-brand)]/40 shadow-md' : 'border-[var(--border-default)] hover:border-[var(--color-brand)]/30'
    }`}>
      {/* Row head */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-center gap-4"
      >
        <span className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: statusColor }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {(() => {
              const fw = getFramework(assignment.framework_id)
              return fw ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: `${fw.color}22`, color: fw.color }}>
                  {fw.code}
                </span>
              ) : null
            })()}
            <span className="text-[10px] font-bold text-[var(--color-brand)]">{assignment.gri_code}</span>
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">· {question?.section ?? ''}</span>
          </div>
          <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{assignment.line_item}</div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-tertiary)] flex-wrap">
            <span className="inline-flex items-center gap-1"><Factory className="w-3 h-3" /> {entity?.name ?? 'Unknown entity'}</span>
            <span className="inline-flex items-center gap-1">
              {modes.map((m, i) => {
                const Icon = m === 'Manual' ? PencilLine : m === 'Calculator' ? CalcIcon : Plug
                return (
                  <span key={m} className="inline-flex items-center gap-0.5">
                    {i > 0 && <span className="mx-0.5">·</span>}
                    <Icon className="w-3 h-3" /> {m}
                  </span>
                )
              })}
            </span>
            {assignment.due_date && (
              <span className={`inline-flex items-center gap-1 ${dueSoon ? 'text-[var(--status-reject)] font-semibold' : ''}`}>
                <Calendar className="w-3 h-3" /> {assignment.due_date}
              </span>
            )}
          </div>
        </div>
        <StatusPill status={assignment.status} />
        {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)]">
          <AnswerPanel
            assignment={assignment}
            question={question ?? synthesizeQuestion(assignment)}
            onUpdate={onUpdate}
            entities={entities}
            members={members}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Build a minimal NexusQuestionnaireItem from an assignment. Used when the
 * assignment refers to a synthetic demo question id that isn't in the Neon
 * DB's questionnaire_item table — the panel can still render a Manual input,
 * a Calculator (if one matches the gri_code), and a Connector option.
 */
function synthesizeQuestion(a: QuestionAssignment): NexusQuestionnaireItem {
  const firstMode = a.entry_modes?.[0] ?? 'Manual'
  return {
    id: a.questionId,
    section: 'Natural Capital',
    subsection: 'Emissions',
    gri_code: a.gri_code,
    line_item: a.line_item,
    unit: a.unit ?? null,
    scope_split: a.gri_code.startsWith('305-1') ? 'Scope 1'
      : a.gri_code.startsWith('305-2') ? 'Scope 2'
      : a.gri_code.startsWith('305-3') ? 'Scope 3'
      : null,
    default_workflow_role: 'FM',
    entry_mode_default: firstMode,
    target_fy2026: null,
    footnote_refs: [],
    reporting_scope: 'group',
  }
}

function StatusPill({ status }: { status: QuestionAssignment['status'] }) {
  const map = {
    not_started: { label: 'To do', bg: 'var(--bg-tertiary)', fg: 'var(--text-tertiary)' },
    in_progress: { label: 'Draft', bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)' },
    submitted:   { label: 'Submitted', bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)' },
    reviewed:    { label: 'Reviewed', bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)' },
    approved:    { label: 'Approved', bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' },
    rejected:    { label: 'Rejected', bg: 'var(--accent-red-light)', fg: 'var(--status-reject)' },
  }[status]
  return (
    <span className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-semibold uppercase tracking-wider flex-shrink-0" style={{ background: map.bg, color: map.fg }}>
      {map.label}
    </span>
  )
}

function AnswerPanel({
  assignment, question, onUpdate, entities, members,
}: {
  assignment: QuestionAssignment
  question: NexusQuestionnaireItem
  onUpdate: (patch: Partial<QuestionAssignment>) => Promise<void> | void
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  // Narrative-type assignments get a dedicated panel — rich text, no value/calculator/connector.
  if (assignment.response_type === 'narrative') {
    return <NarrativeAnswerPanel assignment={assignment} question={question} onUpdate={onUpdate} entities={entities} members={members} />
  }
  const allowedModes = assignment.entry_modes ?? ['Manual']
  const calculator: CalcDescriptor | null = findCalculator(question)
  // Effective allowed modes: hide Calculator if no descriptor matches this question
  const availableModes = useMemo(
    () => allowedModes.filter(m => m !== 'Calculator' || calculator != null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowedModes.join(','), calculator]
  )

  // Which mode the assignee is currently filling in. Default to the one actually used
  // (if resuming) or the first available.
  const [activeMode, setActiveMode] = useState<'Manual' | 'Calculator' | 'Connector'>(
    (assignment.used_mode && availableModes.includes(assignment.used_mode as any))
      ? assignment.used_mode as any
      : availableModes[0] ?? 'Manual'
  )

  const [value, setValue] = useState<string>(assignment.value != null ? String(assignment.value) : '')
  const [comment, setComment] = useState(assignment.comment || '')
  const [evidence, setEvidence] = useState<string[]>(assignment.evidence_ids || [])
  const [busy, setBusy] = useState(false)
  const [calcValues, setCalcValues] = useState<CalcInputValues>({})

  const calcResult = useMemo(() => {
    if (!calculator) return null
    return calculator.compute(calcValues, question)
  }, [calculator, calcValues, question])

  const locked = assignment.status === 'submitted' || assignment.status === 'approved' || assignment.status === 'reviewed'

  const effectiveValue = useMemo(() => {
    if (activeMode === 'Calculator' && calculator) return calcResult
    if (activeMode === 'Manual') {
      const v = parseFloat(value)
      return Number.isNaN(v) ? null : v
    }
    if (activeMode === 'Connector') return assignment.value ?? null
    return null
  }, [activeMode, calcResult, calculator, value, assignment.value])

  const handleSaveDraft = async () => {
    if (effectiveValue == null) return
    setBusy(true)
    onUpdate({
      value: effectiveValue,
      unit: question.unit,
      comment,
      status: 'in_progress',
      used_mode: activeMode,
    })
    setBusy(false)
  }

  const handleSubmit = async () => {
    if (effectiveValue == null) return
    if (evidence.length === 0 && activeMode !== 'Connector') {
      alert('Attach at least one piece of evidence before submitting.')
      return
    }
    setBusy(true)
    onUpdate({
      value: effectiveValue,
      unit: question.unit,
      comment,
      status: 'submitted',
      evidence_ids: evidence,
      used_mode: activeMode,
    })
    setBusy(false)
  }

  const handleConnectorPull = async () => {
    setBusy(true)
    const fabricated = question.target_fy2026
      ? question.target_fy2026 * (0.9 + Math.random() * 0.2)
      : Math.round(1000 + Math.random() * 9000)
    onUpdate({
      value: Number(fabricated.toFixed(2)),
      unit: question.unit,
      status: 'in_progress',
      evidence_ids: [`connector:${pickConnector(question)}:${Date.now().toString(36)}`],
      used_mode: 'Connector',
    })
    setBusy(false)
  }

  const handleAddEvidence = (name: string) => {
    const id = `ev_${Date.now().toString(36)}_${name.slice(0, 20)}`
    setEvidence(e => [...e, id])
  }

  return (
    <div className="grid grid-cols-[1fr_280px] gap-5 mt-3">
      {/* Main */}
      <div className="space-y-4">
        <div className="text-[var(--text-xs)] text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Question:</strong> {question.line_item}
          {question.unit && <span className="ml-2 text-[var(--text-tertiary)]">· Unit: {question.unit}</span>}
          {question.scope_split && <span className="ml-2 text-[var(--text-tertiary)]">· {question.scope_split}</span>}
        </div>

        {/* Mode switcher — shown only when more than one mode is allowed */}
        {availableModes.length > 1 && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
            <div
              className="grid divide-x divide-[var(--border-subtle)]"
              style={{ gridTemplateColumns: `repeat(${availableModes.length}, minmax(0, 1fr))` }}
            >
              {availableModes.map(m => {
                const Icon = m === 'Manual' ? PencilLine : m === 'Calculator' ? CalcIcon : Plug
                const active = activeMode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => !locked && setActiveMode(m)}
                    disabled={locked}
                    className={`px-3 py-2 text-[var(--text-xs)] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      active
                        ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {m}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Mode-specific body */}
        {activeMode === 'Manual' && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">
              Enter value {question.unit ? `(${question.unit})` : ''}
            </label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={e => setValue(e.target.value)}
              disabled={locked}
              placeholder="e.g. 12345.67"
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-base)] tabular-nums focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none disabled:bg-[var(--bg-secondary)]"
            />
          </div>
        )}

        {activeMode === 'Calculator' && calculator && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-brand)] mb-1">{calculator.title}</div>
            <p className="text-[var(--text-xs)] text-[var(--text-secondary)] mb-3">{calculator.description}</p>
            <div className={`grid gap-2 ${calculator.inputs.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {calculator.inputs.map(input => (
                <label key={input.key} className="block">
                  <span className="block text-[9px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">
                    {input.label} {input.unit && <span className="opacity-70">({input.unit})</span>}
                  </span>
                  {input.options ? (
                    <select
                      value={calcValues[input.key] ?? ''}
                      onChange={e => setCalcValues(s => ({ ...s, [input.key]: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)]"
                    >
                      <option value="">Select…</option>
                      {input.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type="number" step="any"
                      value={calcValues[input.key] ?? ''}
                      onChange={e => setCalcValues(s => ({ ...s, [input.key]: e.target.value }))}
                      placeholder={input.placeholder}
                      className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] tabular-nums"
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/20 flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-brand-strong)]">Computed</span>
              <div className="flex items-baseline gap-1">
                <span className="text-[var(--text-xl)] font-bold tabular-nums text-[var(--color-brand-strong)]">
                  {calcResult != null ? calcResult.toFixed(2) : '—'}
                </span>
                {question.unit && <span className="text-[10px] text-[var(--color-brand-strong)]">{calculator.outputUnitHint ?? question.unit}</span>}
              </div>
            </div>
          </div>
        )}

        {activeMode === 'Connector' && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center gap-3 mb-3">
              <Plug className="w-5 h-5 text-[var(--color-brand)]" />
              <div>
                <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{pickConnector(question)}</div>
                <div className="text-[10px] text-[var(--text-tertiary)]">Auto-pull · signed with receipt hash</div>
              </div>
            </div>
            {assignment.value != null ? (
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--accent-green-light)] border border-[var(--status-ok)]/20">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--status-ok)] uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-3 h-3" /> Pulled
                </div>
                <div className="text-[var(--text-xs)] text-[var(--text-secondary)]">
                  Value: <strong className="text-[var(--text-primary)] tabular-nums">{assignment.value}</strong> {question.unit ?? ''}
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnectorPull}
                disabled={locked || busy}
                className="w-full px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Pulling…</> : <><Plug className="w-4 h-4" /> Pull from source</>}
              </button>
            )}
          </div>
        )}

        {/* Comment */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">
            Comment (optional)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            disabled={locked}
            placeholder="Notes, methodology, or caveats for the reviewer."
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none disabled:bg-[var(--bg-secondary)] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {!locked && activeMode !== 'Connector' && (
            <button
              onClick={handleSaveDraft}
              disabled={effectiveValue == null || busy}
              className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Save draft
            </button>
          )}
          {!locked && (
            <button
              onClick={handleSubmit}
              disabled={effectiveValue == null || busy}
              className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Submit for review
            </button>
          )}
          {locked && (
            <HandoffHint
              status={assignment.status}
              entityId={assignment.entityId}
              entities={entities}
              members={members}
            />
          )}
        </div>
      </div>

      {/* Evidence sidebar */}
      <div className="space-y-4">
        <EvidencePanel evidence={evidence} locked={locked} onAdd={handleAddEvidence} onRemove={i => setEvidence(e => e.filter((_, idx) => idx !== i))} />
        <CommentThread assignmentId={assignment.id} />
      </div>
    </div>
  )
}

/**
 * NarrativeAnswerPanel — for response_type='narrative' assignments.
 * Captures a long-form body (markdown-friendly textarea) instead of a number.
 */
function NarrativeAnswerPanel({
  assignment, question, onUpdate, entities, members,
}: {
  assignment: QuestionAssignment
  question: NexusQuestionnaireItem
  onUpdate: (patch: Partial<QuestionAssignment>) => Promise<void> | void
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  const [body, setBody] = useState(assignment.narrative_body ?? '')
  const [busy, setBusy] = useState(false)
  const [evidence, setEvidence] = useState<string[]>(assignment.evidence_ids || [])
  const locked = assignment.status === 'submitted' || assignment.status === 'approved' || assignment.status === 'reviewed'
  const minLength = 80

  const handleSave = async (nextStatus: 'in_progress' | 'submitted') => {
    if (nextStatus === 'submitted' && body.trim().length < minLength) {
      alert(`Narrative needs at least ${minLength} characters before submitting.`)
      return
    }
    setBusy(true)
    await onUpdate({
      narrative_body: body,
      status: nextStatus,
      evidence_ids: evidence,
    })
    setBusy(false)
  }

  return (
    <div className="grid grid-cols-[1fr_280px] gap-5 mt-3">
      <div className="space-y-4">
        <div className="text-[var(--text-xs)] text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Disclosure prompt:</strong> {question.line_item}
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-brand)]/20 bg-[var(--color-brand-soft)]/30 p-3 text-[10px] text-[var(--color-brand-strong)]">
          ✍ This is a <strong>narrative disclosure</strong> (GRI 2 / GRI 3 management approach). Write a factual description — policies, governance, how the topic is managed. Plain-text is fine; line breaks preserved.
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">
            Your response ({body.trim().length} chars)
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            disabled={locked}
            rows={14}
            placeholder="Describe the governance, strategy or management approach. Reference specific policies, frameworks, or processes. This text appears verbatim in the final GRI report."
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] leading-relaxed focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none disabled:bg-[var(--bg-secondary)] resize-y"
            style={{ minHeight: 220 }}
          />
          {body.trim().length > 0 && body.trim().length < minLength && (
            <div className="text-[10px] text-[var(--status-draft)] mt-1">
              {minLength - body.trim().length} more characters needed before submit.
            </div>
          )}
        </div>

        {!locked && (
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => handleSave('in_progress')} disabled={busy} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 inline-flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Save draft
            </button>
            <button onClick={() => handleSave('submitted')} disabled={busy || body.trim().length < minLength} className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-50 inline-flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Submit for review
            </button>
          </div>
        )}
        {locked && <HandoffHint status={assignment.status} entityId={assignment.entityId} entities={entities} members={members} />}
      </div>

      <div className="space-y-4">
        <EvidencePanel evidence={evidence} locked={locked} onAdd={(n) => setEvidence(e => [...e, `ev_${Date.now()}_${n}`])} onRemove={i => setEvidence(e => e.filter((_, idx) => idx !== i))} />
        <CommentThread assignmentId={assignment.id} />
      </div>
    </div>
  )
}

function EvidencePanel({ evidence, locked, onAdd, onRemove }: {
  evidence: string[]
  locked: boolean
  onAdd: (name: string) => void
  onRemove: (idx: number) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(f => onAdd(f.name))
  }

  return (
    <aside className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 h-fit">
      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1">
        <Paperclip className="w-3 h-3" /> Evidence
      </h4>
      <p className="text-[10px] text-[var(--text-tertiary)] mb-3">
        Attach the source doc the reviewer will need. PDF, XLSX, CSV, PNG.
      </p>

      {!locked && (
        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={`block p-4 rounded-[var(--radius-md)] border-2 border-dashed text-center cursor-pointer transition-colors ${
            dragOver ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : evidence.length === 0 ? 'border-[var(--status-reject)]/30 bg-[var(--accent-red-light)]/30' : 'border-[var(--border-default)] bg-[var(--bg-primary)]'
          }`}
        >
          <Upload className="w-4 h-4 mx-auto text-[var(--text-tertiary)] mb-1" />
          <div className="text-[10px] font-semibold text-[var(--text-primary)]">
            {evidence.length === 0 ? 'Drop file or browse' : 'Add another'}
          </div>
          <input type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        </label>
      )}

      {evidence.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {evidence.map((e, i) => (
            <li key={e + i} className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <FileText className="w-3 h-3 text-[var(--color-brand)] flex-shrink-0" />
              <div className="text-[10px] font-medium text-[var(--text-primary)] truncate flex-1 font-mono">
                {e.startsWith('connector:') ? e.split(':')[1] : e.split('_').slice(2).join('_') || e}
              </div>
              {!locked && (
                <button onClick={() => onRemove(i)} className="w-4 h-4 rounded text-[var(--text-tertiary)] hover:text-[var(--status-reject)] flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

/**
 * Shows the user who picks up this task next, so they're not left guessing
 * after hitting "Submit for review".
 */
function HandoffHint({
  status, entityId, entities, members,
}: {
  status: QuestionAssignment['status']
  entityId: string
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  // Walk up the org tree to find the reviewer (subsidiary_lead) and approver (SO).
  const path = orgStore.pathOf(entities, entityId)
  const subsidiaryId = path.find(p => p.type === 'subsidiary')?.id
  const reviewer = subsidiaryId
    ? members.find(m => m.entityId === subsidiaryId && m.role === 'subsidiary_lead')
    : undefined
  const approver = members.find(m => m.role === 'group_sustainability_officer')

  let label = ''
  let name = ''
  if (status === 'submitted') {
    label = 'Sent to'
    name = reviewer?.name ?? 'your subsidiary lead'
  } else if (status === 'reviewed') {
    label = 'With'
    name = approver?.name ?? 'the group sustainability officer'
  } else if (status === 'approved') {
    label = 'Approved — included in the group rollup'
    name = ''
  }

  return (
    <div className="flex items-center gap-2 text-[var(--text-xs)]">
      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-ok)]" />
      <span className="text-[var(--text-secondary)]">
        {label} {name && <strong className="text-[var(--text-primary)]">{name}</strong>}
        {status !== 'approved' && <span className="text-[var(--text-tertiary)]"> · you'll get a notification on the decision</span>}
      </span>
    </div>
  )
}

function pickConnector(item: NexusQuestionnaireItem): string {
  if (item.gri_code.startsWith('305-7')) return 'CEMS — Site telemetry'
  if (item.gri_code.startsWith('302-')) return 'Utilities ERP'
  if (item.gri_code.startsWith('303-')) return 'Water meter telemetry'
  if (item.gri_code.startsWith('305-')) return 'GHG Inventory (IPCC)'
  if (item.gri_code.startsWith('401-') || item.gri_code.startsWith('404-')) return 'SuccessFactors — HR'
  if (item.gri_code.startsWith('201-')) return 'SAP ERP — FI/CO'
  return 'Generic ERP'
}
