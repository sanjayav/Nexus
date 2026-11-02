import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronDown,
  Circle,
  Clock,
  CornerUpLeft,
  ExternalLink,
  FileText,
  Info,
  KeyRound,
  ListChecks,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { moduleCatalogStrings, useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { STATUS_TONE, useWorkflowText } from '@/lib/i18n/shared/workflow'
import { toast } from '@/lib/hooks/useToast'
import { useL10n, useMockData, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useQuestionnaireText } from '@/features/frameworks/content/questionnaireContent'
import CommentThread from '@/features/collaboration/CommentThread'
import { useAccess } from '@/features/access/AccessContext'
import { accessStrings } from '@/features/access/access.strings'
import { summarize, useReportingActions, useSectionViews, useWorkspaceSlice, type SectionView } from '@/store/hooks'
import type { ReviewDecision, SectionStatus } from '@/store/reporting'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  PageHeader,
  Stagger,
  StaggerItem,
  Tabs,
  ease,
  textareaClass,
  type Tone,
} from '@/components/ui'
import { moduleReviewStrings } from './moduleReview.strings'

type TabId = 'queue' | 'findings' | 'proofs' | 'activity'
type QueueFilter = Extract<SectionStatus, 'submitted' | 'changes_requested' | 'approved'>

const SLA_DAYS = 5

const FINDING_RULES = [
  { severity: 'error', rule: 'EVIDENCE-REQUIRED' },
  { severity: 'warning', rule: 'MATERIAL-TOPIC-DMA' },
  { severity: 'info', rule: 'BEST-PRACTICE' },
] as const

const SEVERITY: Record<string, { tone: Tone; icon: LucideIcon; iconClass: string }> = {
  error: { tone: 'danger', icon: XCircle, iconClass: 'bg-rose-50 text-rose-600' },
  warning: { tone: 'warning', icon: AlertTriangle, iconClass: 'bg-amber-50 text-amber-600' },
  info: { tone: 'info', icon: Info, iconClass: 'bg-sky-50 text-sky-600' },
}

export default function ModuleReviewPage() {
  const { moduleId = '' } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const s = useStrings(moduleReviewStrings)
  const c = useStrings(moduleCatalogStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const qt = useQuestionnaireText()
  const wt = useWorkflowText()
  const l10n = useL10n()
  const { region } = useWorkspace()
  const seed = useMockData()
  const views = useSectionViews(moduleId)
  const { activity } = useWorkspaceSlice()
  const { decide, ownSubmission } = useReportingActions()
  const { can, role } = useAccess()
  const a = useStrings(accessStrings)
  const canApprove = can('approval.approve')
  const canReview = can('approval.review')
  /** Why this member can't approve a section, if they can't. */
  const approveBlock = (sectionId: string) => (!canApprove ? a.noApprove : ownSubmission(sectionId) ? a.fourEyes : undefined)

  const [tab, setTab] = useState<TabId>('queue')
  const [filter, setFilter] = useState<QueueFilter>('submitted')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<{ decision: Exclude<ReviewDecision, 'approve'>; ids: string[] } | null>(null)

  const module = seed.modules.find(m => m.id === moduleId)
  const currentVersion = seed.submissionVersions.find(v => v.moduleId === moduleId)
  const pipeline = useMemo(() => summarize(views), [views])
  const queue = views.filter(v => v.status === filter)
  const moduleActivity = useMemo(() => activity.filter(a => a.moduleId === moduleId && a.kind !== 'answer'), [activity, moduleId])

  const findings = useMemo(() => {
    const evidenceGap = views.find(v => (v.section.meta?.evidence.missing ?? 0) > 0)
    const material = views.find(v => v.section.material && v.status !== 'approved') ?? views.find(v => v.section.material)
    const targets = [evidenceGap, material, views[views.length - 1]]
    return FINDING_RULES.map((r, i) => ({ ...r, section: targets[i] ? qt.shortTitle(targets[i]!.section) : fw.short(moduleId) }))
  }, [views, qt, fw, moduleId])

  if (!module) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title={c.notFound}
          description={c.notFoundBody}
          action={
            <Button icon={ArrowLeft} onClick={() => navigate('/modules')}>
              {c.backToModules}
            </Button>
          }
        />
      </Card>
    )
  }

  const reviewStart = new Date(currentVersion?.createdAt ?? module.lastActivity)
  const slaDays = Math.max(0, Math.floor((Date.now() - reviewStart.getTime()) / 86_400_000))
  const slaOverdue = pipeline.submitted > 0 && slaDays > SLA_DAYS
  const missingEvidence = views.some(v => (v.section.meta?.evidence.missing ?? 0) > 0)
  const checks = [
    { label: s.check.allReviewed, done: pipeline.submitted === 0 },
    { label: s.check.noErrors, done: !views.some(v => (v.section.meta?.validation.errors ?? 0) > 0) },
    { label: s.check.evidence, done: !missingEvidence },
    { label: s.check.returnedResolved, done: pipeline.changes_requested === 0 },
  ]

  const approve = (ids: string[]) => {
    if (!ids.length) return
    const n = decide(moduleId, ids, 'approve')
    setSelected(new Set())
    if (n) toast(fmt(s.approvedToast, { n }))
    // Bulk approval skips sections the four-eyes rule reserves for someone else.
    if (n < ids.length) toast(fmt(s.skippedOwn, { n: ids.length - n }), 'info')
  }
  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow={s.eyebrow}
        title={fmt(s.title, { name: fw.title(module.id, module.title) })}
        description={
          currentVersion
            ? fmt(s.subtitle, { version: currentVersion.version, id: currentVersion.submissionId })
            : fw.description(module.id, module.description)
        }
        actions={
          pipeline.submitted > 0 && (
            <Badge tone={slaOverdue ? 'danger' : 'info'} icon={Clock} className="h-8 px-2.5 text-[13px]">
              {fmt(s.inReviewFor, { days: f.number(slaDays) })}
              {slaOverdue && <span className="font-semibold">· {s.overdue}</span>}
            </Badge>
          )
        }
      />

      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'queue', label: s.tabs.queue, count: pipeline.submitted },
          { value: 'findings', label: s.tabs.findings, count: findings.length },
          { value: 'proofs', label: s.tabs.proofs },
          { value: 'activity', label: s.tabs.activity, count: moduleActivity.length },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {tab === 'queue' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs<QueueFilter>
                  value={filter}
                  onChange={v => (setFilter(v), setSelected(new Set()))}
                  items={(['submitted', 'changes_requested', 'approved'] as const).map(k => ({
                    value: k,
                    label: s.filters[k],
                    count: pipeline[k],
                  }))}
                />
                {filter === 'submitted' && queue.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(selected.size === queue.length ? new Set() : new Set(queue.map(v => v.section.id)))}
                  >
                    {selected.size === queue.length ? s.clearSelection : s.selectAll}
                  </Button>
                )}
              </div>

              {queue.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={ListChecks}
                    title={filter === 'submitted' ? s.awaitingNone : s.filters[filter]}
                    description={filter === 'submitted' ? s.awaitingNoneBody : undefined}
                  />
                </Card>
              ) : (
                <Stagger className="space-y-3">
                  <AnimatePresence initial={false}>
                    {queue.map(v => (
                      <StaggerItem key={v.section.id} layout exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}>
                        <QueueCard
                          view={v}
                          moduleId={moduleId}
                          selectable={filter === 'submitted' && canApprove}
                          selected={selected.has(v.section.id)}
                          onToggle={() => toggle(v.section.id)}
                          onApprove={() => approve([v.section.id])}
                          onReturn={() => setPending({ decision: 'request_changes', ids: [v.section.id] })}
                          onReject={canApprove ? () => setPending({ decision: 'reject', ids: [v.section.id] }) : undefined}
                          onReturnAllowed={canReview}
                          approveBlock={approveBlock(v.section.id)}
                          submittedBy={activity.find(a => a.kind === 'submit' && a.sectionId === v.section.id)}
                        />
                      </StaggerItem>
                    ))}
                  </AnimatePresence>
                </Stagger>
              )}
            </>
          )}

          {tab === 'findings' && (
            <Stagger className="space-y-4">
              {findings.map((finding, index) => {
                const sev = SEVERITY[finding.severity]
                const text = s.findings[index]
                return (
                  <StaggerItem key={finding.rule}>
                    <Card>
                      <div className="flex items-start gap-4">
                        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', sev.iconClass)}>
                          <sev.icon className="w-[18px] h-[18px]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-zinc-900">{text.message}</h3>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                <span>{fmt(s.rule, { v: finding.rule })}</span>
                                <span>{fmt(s.field, { v: finding.section })}</span>
                              </div>
                            </div>
                            <Badge tone={sev.tone} className="self-start">
                              {s.severity[finding.severity]}
                            </Badge>
                          </div>
                          <div className="mt-3 rounded-lg bg-zinc-50 border border-line px-3 py-2.5 text-[13px] text-zinc-700">
                            <span className="font-medium text-zinc-900">{s.suggestion}</span>
                            {text.suggestion}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </StaggerItem>
                )
              })}
            </Stagger>
          )}

          {tab === 'proofs' && (
            <Card>
              {currentVersion ? (
                <>
                  <CardHeader title={s.proofsTitle} description={s.proofsDesc} icon={KeyRound} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ProofTile label={s.payloadCid}>
                      <code className="text-[13px] text-zinc-900 break-all">{currentVersion.payloadCID}</code>
                      <Button variant="ghost" size="sm" icon={ExternalLink} className="mt-2 -ml-2" onClick={() => navigate('/evidence')}>
                        {s.viewPayload}
                      </Button>
                    </ProofTile>
                    <ProofTile label={s.sha256}>
                      <code className="text-[13px] text-zinc-900 break-all">{currentVersion.sha256.slice(0, 32)}…</code>
                    </ProofTile>
                    <ProofTile label={s.merkleRoot}>
                      <code className="text-[13px] text-emerald-700">{currentVersion.merkleRoot}</code>
                    </ProofTile>
                    <ProofTile label={s.transaction}>
                      <code className="text-[13px] text-zinc-900">0x1234…abcd</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={ExternalLink}
                        className="mt-2 -ml-2"
                        title={l10n(region.chain.network)}
                        onClick={() => window.open(region.chain.explorer, '_blank', 'noopener,noreferrer')}
                      >
                        {s.viewExplorer}
                      </Button>
                    </ProofTile>
                  </div>
                </>
              ) : (
                <EmptyState icon={KeyRound} title={s.noProofs} description={s.noProofsBody} />
              )}
            </Card>
          )}

          {tab === 'activity' && (
            <Card>
              {moduleActivity.length === 0 ? (
                <EmptyState icon={Clock} title={s.activityEmpty} description={s.activityEmptyBody} />
              ) : (
                <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-line">
                  {moduleActivity.map(a => (
                    <motion.li key={a.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="relative flex gap-3">
                      <span className="relative z-10 w-8 h-8 rounded-full bg-white ring-1 ring-line flex items-center justify-center shrink-0 text-[11px] font-semibold text-zinc-700">
                        {a.actor.slice(0, 1)}
                      </span>
                      <div className="min-w-0 pt-1">
                        <p className="text-[13px] text-zinc-900">{wt.describe(a)}</p>
                        {a.note && a.kind !== 'import' && (
                          <p className="mt-1 rounded-lg bg-zinc-50 border border-line px-3 py-2 text-[13px] text-zinc-700">{a.note}</p>
                        )}
                        <p className="mt-1 text-[11px] text-zinc-400 tabular">
                          {f.date(a.at, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              )}
            </Card>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <CardHeader title={s.checklist} icon={ListChecks} description={fmt(s.sla, { days: SLA_DAYS })} />
            <ul className="space-y-2.5">
              {checks.map(ch => (
                <li key={ch.label} className="flex items-start gap-2.5 text-[13px]">
                  <motion.span
                    initial={false}
                    animate={{ scale: ch.done ? [0.6, 1.15, 1] : 1 }}
                    transition={{ duration: 0.3 }}
                    className="mt-px"
                  >
                    {ch.done ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-zinc-300" />}
                  </motion.span>
                  <span className={ch.done ? 'text-zinc-500' : 'text-zinc-900'}>{ch.label}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title={s.signing} icon={ShieldCheck} />
            <dl className="text-xs space-y-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500">{s.yourDid}</dt>
                <dd>
                  <code className="text-zinc-900">{region.id === 'cn' ? 'did:bsn:0xa1e4…1dc3' : 'did:ethr:0x1234…5678'}</code>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500">{s.role}</dt>
                <dd className="text-zinc-900">{role ? a.roles[role].name : '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500">{s.vcHash}</dt>
                <dd>
                  <code className="text-emerald-700">0x784b…ce12</code>
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed bottom-5 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-zinc-900 text-white pl-4 pr-2 py-2 shadow-pop">
              <span className="text-[13px] tabular">{fmt(s.selected, { n: selected.size })}</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-zinc-300 hover:text-white hover:bg-white/10"
                onClick={() => setSelected(new Set())}
              >
                {s.clearSelection}
              </Button>
              <Button size="sm" variant="brand" icon={Check} onClick={() => approve([...selected])}>
                {fmt(s.approveSelected, { n: selected.size })}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DecisionDialog
        pending={pending}
        onClose={() => setPending(null)}
        onConfirm={note => {
          if (!pending) return
          decide(moduleId, pending.ids, pending.decision, note)
          toast(pending.decision === 'reject' ? s.rejectedToast : s.returnedToast, 'info')
          setSelected(new Set())
          setPending(null)
        }}
      />
    </div>
  )
}

function QueueCard({
  view,
  moduleId,
  selectable,
  selected,
  onToggle,
  onApprove,
  onReturn,
  onReject,
  onReturnAllowed,
  approveBlock,
  submittedBy,
}: {
  view: SectionView
  moduleId: string
  selectable: boolean
  selected: boolean
  onToggle: () => void
  onApprove: () => void
  onReturn: () => void
  /** Omitted when the member may not reject. */
  onReject?: () => void
  onReturnAllowed: boolean
  /** Reason approval is unavailable to this member, if it is. */
  approveBlock?: string
  submittedBy?: { actor: string; at: string }
}) {
  const s = useStrings(moduleReviewStrings)
  const qt = useQuestionnaireText()
  const wt = useWorkflowText()
  const [open, setOpen] = useState(false)
  const owner = view.section.meta?.owner ? qt.owner(view.section.meta.owner) : undefined
  const by = submittedBy?.actor ?? view.updatedBy ?? owner

  return (
    <Card
      as="article"
      aria-label={qt.sectionTitle(view.section)}
      padded={false}
      className={clsx('overflow-hidden transition-[box-shadow,border-color]', selected && 'border-zinc-900 ring-1 ring-zinc-900')}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        {selectable && (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={onToggle}
            className={clsx(
              'mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
              selected ? 'bg-zinc-900 border-zinc-900 text-white' : 'border-zinc-300 hover:border-zinc-500',
            )}
          >
            {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{qt.sectionTitle(view.section)}</h3>
            <Badge tone={STATUS_TONE[view.status]} dot>
              {wt.status(view.status)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {fmt(s.answered, { answered: view.answered, required: view.required })}
            {by && view.updatedAt && <> · {fmt(s.submittedBy, { actor: by, time: wt.ago(submittedBy?.at ?? view.updatedAt) })}</>}
          </p>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
          >
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.span>
            {open ? s.collapse : s.expand}
          </button>
        </div>
        {view.status === 'submitted' && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {onReturnAllowed && (
              <Button size="sm" variant="ghost" icon={CornerUpLeft} onClick={onReturn}>
                {s.requestChanges}
              </Button>
            )}
            <Button size="sm" variant="brand" icon={Check} onClick={onApprove} disabled={!!approveBlock} title={approveBlock}>
              {s.approve}
            </Button>
          </div>
        )}
      </div>
      {view.status === 'submitted' && approveBlock && (
        <p className="px-4 sm:px-5 -mt-2 pb-3 sm:pl-[52px] text-xs text-zinc-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          {approveBlock}
        </p>
      )}
      {view.status === 'submitted' && (
        <div className="sm:hidden flex items-center gap-2 px-4 pb-4">
          {onReturnAllowed && (
            <Button size="sm" variant="secondary" icon={CornerUpLeft} className="flex-1" onClick={onReturn}>
              {s.requestChanges}
            </Button>
          )}
          <Button size="sm" variant="brand" icon={Check} className="flex-1" onClick={onApprove} disabled={!!approveBlock}>
            {s.approve}
          </Button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: ease.out }}
            className="overflow-hidden"
          >
            <div className="border-t border-line bg-zinc-50/50 px-4 sm:px-5 py-4 space-y-4">
              <dl className="space-y-3">
                {view.section.fields.map(field => (
                  <div key={field.id}>
                    <dt className="text-xs font-medium text-zinc-500">{qt.fieldLabel(view.section, field)}</dt>
                    <dd
                      className={clsx(
                        'mt-0.5 text-[13px] leading-relaxed whitespace-pre-wrap',
                        view.values[field.id] ? 'text-zinc-900' : 'text-zinc-400',
                      )}
                    >
                      {view.values[field.id] || s.empty}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="pt-3 border-t border-line">
                <CommentThread moduleId={moduleId} sectionId={view.section.id} />
              </div>
              {view.status === 'submitted' && onReject && (
                <div className="flex justify-end">
                  <Button size="sm" variant="danger" icon={XCircle} onClick={onReject}>
                    {s.reject}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function DecisionDialog({
  pending,
  onClose,
  onConfirm,
}: {
  pending: { decision: 'request_changes' | 'reject' } | null
  onClose: () => void
  onConfirm: (note: string) => void
}) {
  const s = useStrings(moduleReviewStrings)
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const close = () => {
    setNote('')
    setTouched(false)
    onClose()
  }
  const reject = pending?.decision === 'reject'
  return (
    <Dialog
      open={!!pending}
      onClose={close}
      title={reject ? s.rejectTitle : s.returnTitle}
      description={reject ? s.rejectBody : s.returnBody}
      footer={
        <>
          <Button onClick={close}>{s.cancel}</Button>
          <Button
            variant={reject ? 'danger' : 'primary'}
            onClick={() => {
              setTouched(true)
              if (!note.trim()) return
              onConfirm(note.trim())
              setNote('')
              setTouched(false)
            }}
          >
            {s.confirm}
          </Button>
        </>
      }
    >
      <textarea
        data-autofocus
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={4}
        placeholder={s.notePlaceholder}
        className={textareaClass}
        aria-label={s.notePlaceholder}
      />
      {touched && !note.trim() && <p className="mt-1.5 text-xs text-rose-600">{s.noteRequired}</p>}
    </Dialog>
  )
}

function ProofTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-zinc-50/60 p-4 min-w-0">
      <div className="text-xs font-medium text-zinc-500 mb-1">{label}</div>
      {children}
    </div>
  )
}
