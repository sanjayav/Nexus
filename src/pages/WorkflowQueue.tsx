import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertOctagon, AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronDown, Factory, FileText,
  Info, LineChart, Quote, Paperclip, Plug, Send, User,
} from 'lucide-react'
import { itemLabel } from '../lib/itemLabel'
import { orgStore, type QuestionAssignment, type OrgEntity, type Anomaly } from '../lib/orgStore'
import { useFramework, getFramework } from '../lib/frameworks'
import { useFmt } from '../lib/fmt'
import PageHeader from '../components/PageHeader'
import { FrameworkBadge } from '../components/FrameworkBadge'
import CommentThread from '../components/CommentThread'
import { HistoricalReferencePanel } from '../components/HistoricalReferencePanel'
import { StatLedger, StateBoundary, StatusPill, notify, Skeleton, SkeletonLedger, SkeletonCard } from '../components/ui'
import DecisionBar, { type DecisionAction, type DecisionPhase } from '../components/review/DecisionBar'
import QueueCleared from '../components/review/QueueCleared'
import { crossfadeVariants, dur, ease, listItemMotion } from '../motion/tokens'

export type QueueKind = 'review' | 'approval'

type Status = QuestionAssignment['status']

/** Labels are i18n keys. */
const KIND_META = {
  review: {
    title: 'workflowQueue.review.title',
    subtitle: 'workflowQueue.review.subtitle',
    inputStatus: 'submitted' as Status,
    passStatus: 'reviewed' as Status,
    /** "Return" sends it back to the contributor. */
    returnStatus: 'rejected' as Status,
    passLabel: 'workflowQueue.review.pass',
    returnLabel: 'workflowQueue.review.reject',
    rejectLabel: null as string | null,
    stage: 'review' as const,
    switchTo: '/workflow/approval',
    switchLabel: 'workflowQueue.switchToApproval',
  },
  approval: {
    title: 'workflowQueue.approval.title',
    subtitle: 'workflowQueue.approval.subtitle',
    inputStatus: 'reviewed' as Status,
    passStatus: 'approved' as Status,
    /** "Return" sends it back one step, to the reviewer. */
    returnStatus: 'submitted' as Status,
    passLabel: 'workflowQueue.approval.pass',
    returnLabel: 'workflowQueue.approval.return',
    rejectLabel: 'workflowQueue.approval.reject' as string | null,
    stage: 'approve' as const,
    switchTo: '/workflow/review',
    switchLabel: 'workflowQueue.switchToReview',
  },
}

/** Delay between the seal finishing and the row leaving the queue. */
const SEAL_HOLD_MS = 560

/**
 * Queue of assignments waiting for the reviewer / approver.
 *
 *   submitted → reviewed → approved        (pass, A)
 *   review queue:   submitted → rejected   (return to contributor, R, comment required)
 *   approval queue: reviewed → submitted   (return to reviewer, R, comment required)
 *                   reviewed → rejected    (reject to contributor, comment required)
 *
 * The page never claims "empty" until the queue has actually loaded: loading
 * shows skeletons, a failed load shows an error with Retry.
 */
export default function WorkflowQueue({ kind }: { kind: QueueKind }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const meta = KIND_META[kind]
  const { active: framework } = useFramework()

  const [all, setAll] = useState<QuestionAssignment[]>([])
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [anomalyMap, setAnomalyMap] = useState<Map<string, Anomaly[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [commentError, setCommentError] = useState<string | null>(null)
  const [phase, setPhase] = useState<DecisionPhase | null>(null)
  const [clearedCount, setClearedCount] = useState(0)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  const refresh = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    try {
      const [rows, ents, anomalies] = await Promise.all([
        orgStore.listAssignments(),
        orgStore.listEntities(),
        orgStore.anomalyScan('role', { limit: 500 }).catch(() => ({ anomalies: [] as Anomaly[] })),
      ])
      setAll(rows)
      setEntities(ents)
      const m = new Map<string, Anomaly[]>()
      for (const a of anomalies.anomalies) {
        const arr = m.get(a.assignment_id) ?? []
        arr.push(a)
        m.set(a.assignment_id, arr)
      }
      setAnomalyMap(m)
      setError(null)
      setLoaded(true)
    } catch (e) {
      if (opts.silent) notify.error(t('workflowQueue.errors.refresh'), { description: e instanceof Error ? e.message : undefined })
      else setError(e ?? new Error('load failed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    setClearedCount(0)
    void refresh()
  }, [framework.id, kind, refresh])

  const inFramework = useMemo(() => all.filter(a => a.framework_id === framework.id), [all, framework.id])
  const queue = useMemo(() => inFramework.filter(a => a.status === meta.inputStatus), [inFramework, meta.inputStatus])

  // Keep a valid selection (first row on load; neighbour after a decision).
  useEffect(() => {
    if (!queue.find(a => a.id === selectedId)) setSelectedId(queue[0]?.id ?? null)
  }, [queue, selectedId])

  const index = queue.findIndex(a => a.id === selectedId)
  const selected = index >= 0 ? queue[index] : null
  const comment = selected ? drafts[selected.id] ?? '' : ''

  const plantName = useCallback((id: string) => entities.find(e => e.id === id)?.name ?? id, [entities])

  const select = useCallback((id: string | null) => {
    setSelectedId(id)
    setCommentError(null)
  }, [])

  const go = useCallback((delta: number) => {
    if (!queue.length) return
    const next = Math.min(Math.max((index < 0 ? 0 : index) + delta, 0), queue.length - 1)
    select(queue[next].id)
  }, [queue, index, select])

  const neighbourOf = (id: string) => {
    const i = queue.findIndex(a => a.id === id)
    return queue[i + 1]?.id ?? queue[i - 1]?.id ?? null
  }

  const setComment = (v: string) => {
    if (!selected) return
    setDrafts(d => ({ ...d, [selected.id]: v }))
    if (commentError && v.trim()) setCommentError(null)
  }

  /** One decision: API → (seal) → row exits, counters tick, next row selected → toast with Undo. */
  const decide = async (action: DecisionAction) => {
    const a = selected
    if (!a || phase) return
    const text = (drafts[a.id] ?? '').trim()
    if (action !== 'pass' && !text) {
      setCommentError(t(action === 'reject' ? 'workflowQueue.errors.needCommentReject' : `workflowQueue.errors.needComment_${kind}`))
      commentRef.current?.focus()
      return
    }
    setCommentError(null)
    const nextStatus: Status = action === 'pass' ? meta.passStatus : action === 'return' ? meta.returnStatus : 'rejected'
    const nextComment = action === 'pass' ? (text || a.comment) : text
    const prevComment = a.comment ?? ''
    const nextId = neighbourOf(a.id)

    setPhase({ id: a.id, action, stage: 'busy' })
    try {
      await orgStore.updateAssignment(a.id, { status: nextStatus, comment: nextComment })
    } catch (e) {
      setPhase(null)
      notify.error(t('workflowQueue.errors.updateTitle'), { description: e instanceof Error ? e.message : String(e) })
      return
    }

    if (action === 'pass' && !reduce) {
      setPhase({ id: a.id, action, stage: 'sealed' })
      await new Promise(r => setTimeout(r, SEAL_HOLD_MS))
    }

    // Local commit: the row leaves, the ledger ticks, the neighbour takes focus.
    setAll(rows => rows.map(r => (r.id === a.id ? { ...r, status: nextStatus, comment: nextComment ?? r.comment } : r)))
    setDrafts(d => { const n = { ...d }; delete n[a.id]; return n })
    select(nextId)
    setPhase(null)
    if (action === 'pass') setClearedCount(c => c + 1)

    const who = a.assigneeName
    const label = `${a.gri_code} · ${plantName(a.entityId)}`
    const msg =
      action === 'pass' ? t(`workflowQueue.toast.pass_${kind}`, { item: label })
      : action === 'return' ? t(`workflowQueue.toast.return_${kind}`, { item: label, name: who })
      : t('workflowQueue.toast.reject', { item: label, name: who })
    notify.success(msg, {
      undo: async () => {
        try {
          await orgStore.updateAssignment(a.id, { status: meta.inputStatus, comment: prevComment })
          setAll(rows => rows.map(r => (r.id === a.id ? { ...r, status: meta.inputStatus, comment: prevComment } : r)))
          if (action === 'pass') setClearedCount(c => Math.max(0, c - 1))
          select(a.id)
          notify.message(t('workflowQueue.toast.undone', { item: label }))
        } catch (e) {
          notify.error(t('workflowQueue.errors.updateTitle'), { description: e instanceof Error ? e.message : String(e) })
        }
      },
    })
    void refresh({ silent: true })
  }

  // Keyboard: A approve/pass · R return · J/K next/previous. Ignored while typing or with a dialog open.
  const decideRef = useRef(decide)
  decideRef.current = decide
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return
      const k = e.key.toLowerCase()
      if (k === 'j') { e.preventDefault(); go(1) }
      else if (k === 'k') { e.preventDefault(); go(-1) }
      else if (k === 'a') { e.preventDefault(); void decideRef.current('pass') }
      else if (k === 'r') { e.preventDefault(); void decideRef.current('return') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const flaggedCount = queue.filter(a => (anomalyMap.get(a.id) ?? []).length > 0).length
  const count = (s: Status) => inFramework.filter(a => a.status === s).length
  const ledger = [
    { id: 'waiting', label: t(kind === 'review' ? 'workflowQueue.stats.waitingReview' : 'workflowQueue.stats.waitingApproval'), value: queue.length, tone: queue.length ? 'info' as const : 'neutral' as const },
    { id: 'flagged', label: t('workflowQueue.stats.flagged'), value: flaggedCount, tone: flaggedCount ? 'warning' as const : 'neutral' as const, hint: t('workflowQueue.stats.flaggedHint') },
    kind === 'review'
      ? { id: 'reviewed', label: t('workflowQueue.stats.alreadyReviewed'), value: count('reviewed'), tone: 'info' as const, to: '/workflow/approval' }
      : { id: 'inReview', label: t('workflowQueue.stats.stillInReview'), value: count('submitted'), tone: 'info' as const, to: '/workflow/review' },
    { id: 'approved', label: t('workflowStatus.status.approved'), value: count('approved'), tone: 'success' as const },
  ]

  return (
    <div>
      <PageHeader
        stage={meta.stage}
        eyebrow={t('workflowQueue.eyebrow')}
        title={t(meta.title)}
        subtitle={t(meta.subtitle)}
        actions={
          <>
            <FrameworkBadge size="md" />
            <Link
              to={meta.switchTo}
              className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] whitespace-nowrap transition-colors duration-micro"
            >
              {t(meta.switchLabel)} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        }
      />

      <StateBoundary
        loading={loading}
        error={error}
        hasData={loaded}
        onRetry={() => void refresh()}
        errorState={{ variant: 'error', title: t('workflowQueue.errors.loadTitle'), body: t('workflowQueue.errors.loadBody') }}
        skeleton={<QueueSkeleton />}
      >
        <StatLedger items={ledger} className="mb-6" aria-label={t('workflowQueue.stats.aria')} />

        {queue.length === 0 ? (
          <QueueCleared
            celebrate={clearedCount > 0}
            title={clearedCount > 0 ? t('workflowQueue.cleared.title') : t(`workflowQueue.empty.title_${kind}`)}
            body={clearedCount > 0
              ? t(`workflowQueue.cleared.body_${kind}`, { count: clearedCount })
              : t(`workflowQueue.empty.${kind}`)}
            actions={
              <>
                <Link to={meta.switchTo} className="h-10 px-4 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] shadow-[var(--btn-primary-shadow)] text-small font-semibold whitespace-nowrap">
                  {t(meta.switchLabel)} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link to="/aggregator" className="h-10 px-4 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-small font-semibold text-[var(--text-primary)] whitespace-nowrap">
                  {t('workflowQueue.empty.viewRollup')}
                </Link>
              </>
            }
          />
        ) : (
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] items-start">
            {/* Queue list (desktop) */}
            <nav aria-label={t('workflowQueue.listAria')} className="hidden lg:flex flex-col surface-paper overflow-hidden lg:sticky lg:top-0 max-h-[calc(100vh-140px)]">
              <div className="px-4 h-11 flex items-center justify-between border-b border-[var(--border-subtle)]">
                <span className="text-small font-semibold text-[var(--text-primary)]">{t('workflowQueue.queueHeading')}</span>
                <span className="text-caption tabular-nums text-[var(--text-tertiary)]">{t('workflowQueue.queueCount', { count: queue.length })}</span>
              </div>
              <ul className="overflow-y-auto flex-1">
                <AnimatePresence initial={false}>
                  {queue.map(a => (
                    <motion.li key={a.id} layout {...listItemMotion} className="border-b border-[var(--border-subtle)] last:border-b-0">
                      <QueueRow
                        a={a}
                        selected={a.id === selectedId}
                        flags={anomalyMap.get(a.id) ?? []}
                        entity={plantName(a.entityId)}
                        onSelect={() => select(a.id)}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </nav>

            {/* Queue strip (mobile) */}
            <div className="lg:hidden -mx-4 px-4 sm:-mx-6 sm:px-6 overflow-x-auto snap-x" aria-label={t('workflowQueue.listAria')} role="navigation">
              <div className="flex gap-2 w-max pb-1">
                {queue.map(a => {
                  const on = a.id === selectedId
                  const flags = anomalyMap.get(a.id) ?? []
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => select(a.id)}
                      aria-current={on ? 'true' : undefined}
                      className={`snap-start h-11 px-3 inline-flex items-center gap-2 rounded-[var(--radius-md)] border text-small whitespace-nowrap transition-colors ${
                        on ? 'border-[var(--border-focus)] bg-[var(--color-brand-soft)] text-[var(--text-primary)]' : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {flags.length > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{ background: flags.some(x => x.severity === 'critical') ? 'var(--status-danger)' : 'var(--status-warning)' }} aria-hidden />}
                      <span className="font-mono font-semibold">{a.gri_code}</span>
                      <span className="text-[var(--text-tertiary)]">{plantName(a.entityId)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Detail + sticky decision bar */}
            <section aria-live="polite" className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                {selected && (
                  <motion.div key={selected.id} variants={crossfadeVariants} initial="initial" animate="enter" exit="exit">
                    <DetailPane
                      a={selected}
                      kind={kind}
                      flags={anomalyMap.get(selected.id) ?? []}
                      entity={plantName(selected.entityId)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {selected && (
                <DecisionBar
                  ref={commentRef}
                  passLabel={t(meta.passLabel)}
                  returnLabel={t(meta.returnLabel)}
                  rejectLabel={meta.rejectLabel ? t(meta.rejectLabel) : undefined}
                  onReject={meta.rejectLabel ? () => void decide('reject') : undefined}
                  comment={comment}
                  onComment={setComment}
                  commentError={commentError}
                  commentPlaceholder={t(`workflowQueue.detail.commentPlaceholder_${kind}`)}
                  index={index}
                  total={queue.length}
                  onPrev={() => go(-1)}
                  onNext={() => go(1)}
                  phase={phase && phase.id === selected.id ? phase : null}
                  onPass={() => void decide('pass')}
                  onReturn={() => void decide('return')}
                />
              )}
            </section>
          </div>
        )}
      </StateBoundary>
    </div>
  )
}

/* ── List row ─────────────────────────────────────────────────────────── */

function QueueRow({ a, selected, flags, entity, onSelect }: {
  a: QuestionAssignment
  selected: boolean
  flags: Anomaly[]
  entity: string
  onSelect: () => void
}) {
  const { i18n, t } = useTranslation()
  const f = useFmt()
  const critical = flags.some(x => x.severity === 'critical')
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={`relative w-full text-left px-4 py-3 transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)] ${
        selected ? 'bg-[var(--color-brand-soft)]' : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {selected && <motion.span layoutId="queue-selected" className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[var(--color-brand)]" transition={{ type: 'spring', stiffness: 520, damping: 40 }} aria-hidden />}
      <div className="flex items-center gap-2 text-caption">
        <span className="font-mono font-semibold text-[var(--color-brand-strong)]">{a.gri_code}</span>
        <span className="text-[var(--text-tertiary)] truncate">{entity}</span>
        <span className="ml-auto tabular-nums font-semibold text-[var(--text-primary)] whitespace-nowrap">
          {a.response_type === 'narrative' ? t('workflowQueue.narrativeShort') : a.value != null ? f.number(a.value) : '—'}
        </span>
      </div>
      <div className="mt-1 text-small font-medium text-[var(--text-primary)] line-clamp-2">{itemLabel(a, i18n.language)}</div>
      {flags.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 text-caption min-w-0" style={{ color: critical ? 'var(--status-danger)' : 'var(--status-warning)' }}>
          {critical ? <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
          <span className="truncate">{flags[0].headline || t('workflowQueue.flagged', { count: flags.length })}</span>
          {flags.length > 1 && <span className="flex-shrink-0 tabular-nums">+{flags.length - 1}</span>}
        </div>
      )}
    </button>
  )
}

/* ── Detail pane ──────────────────────────────────────────────────────── */

function DetailPane({ a, kind, flags, entity }: { a: QuestionAssignment; kind: QueueKind; flags: Anomaly[]; entity: string }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const fw = getFramework(a.framework_id)
  const [showHistory, setShowHistory] = useState(false)
  const overdue = !!a.due_date && new Date(a.due_date + 'T23:59:59') < new Date()
  const narrative = a.response_type === 'narrative'

  return (
    <article className="space-y-5">
      {/* Identity */}
      <header>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {fw && <span className="chip">{fw.code}</span>}
          <span className="font-mono text-small font-semibold text-[var(--color-brand-strong)]">{a.gri_code}</span>
          <StatusPill status={a.status} size="sm" />
        </div>
        <h2 className="type-h2 text-[var(--text-primary)] text-balance">{itemLabel(a, i18n.language)}</h2>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-small">
          <Meta icon={Factory} label={t('workflowQueue.detail.entity')} value={entity} />
          <Meta icon={User} label={t('workflowQueue.detail.submittedBy')} value={a.assigneeName} title={a.assigneeEmail} />
          <Meta icon={Calendar} label={t('workflowQueue.detail.due')} value={a.due_date ? f.date(a.due_date) : '—'} tone={overdue ? 'danger' : undefined} />
          <Meta icon={Send} label={t('workflowQueue.detail.modeUsed')} value={a.used_mode ? t(`workflowQueue.mode.${a.used_mode}`, { defaultValue: a.used_mode }) : '—'} />
        </dl>
      </header>

      {/* The figure + checks, pinned on top */}
      <section className="surface-paper overflow-hidden">
        {narrative ? (
          <div className="p-5">
            <div className="text-caption font-semibold text-[var(--text-secondary)] mb-2">
              {t('workflowQueue.detail.narrative', { count: (a.narrative_body ?? '').length })}
            </div>
            <p className="type-body text-[var(--text-primary)] whitespace-pre-wrap max-h-[280px] overflow-y-auto max-w-[70ch]">
              {a.narrative_body || <span className="italic text-[var(--text-tertiary)]">{t('workflowQueue.detail.noNarrative')}</span>}
            </p>
          </div>
        ) : (
          <ValueHeadline a={a} />
        )}
        <Checks a={a} flags={flags} />
      </section>

      {/* Evidence lineage */}
      <Lineage a={a} kind={kind} />

      {/* Contributor note */}
      {a.comment && (
        <section className="flex gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--bg-secondary)]">
          <Quote className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--text-tertiary)]" aria-hidden />
          <div className="min-w-0">
            <div className="text-caption font-semibold text-[var(--text-secondary)]">{t('workflowQueue.detail.note')}</div>
            <p className="type-small text-[var(--text-primary)] mt-0.5 whitespace-pre-wrap">{a.comment}</p>
          </div>
        </section>
      )}

      {/* History, collapsed by default */}
      {!narrative && (
        <section className="surface-paper overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistory(s => !s)}
            aria-expanded={showHistory}
            className="w-full h-12 px-5 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-hover)] transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
          >
            <span className="inline-flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
              <LineChart className="w-4 h-4 text-[var(--color-brand)]" />
              {showHistory ? t('workflowQueue.detail.hideTrend') : t('workflowQueue.detail.showTrend')}
            </span>
            <motion.span animate={{ rotate: showHistory ? 180 : 0 }} transition={{ duration: dur.fast, ease: ease.out }} className="text-[var(--text-tertiary)]">
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: dur.base, ease: ease.out }}
                className="overflow-hidden border-t border-[var(--border-subtle)]"
              >
                <HistoricalReferencePanel questionnaire_item_id={a.questionId} entity_id={a.entityId} currentValue={a.value ?? null} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Discussion */}
      <CommentThread assignmentId={a.id} />
    </article>
  )
}

function Meta({ icon: Icon, label, value, title, tone }: { icon: typeof Factory; label: string; value: string; title?: string; tone?: 'danger' }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0" title={title}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd className={`truncate whitespace-nowrap ${tone === 'danger' ? 'text-[var(--status-danger)] font-semibold' : 'text-[var(--text-secondary)]'}`}>{value}</dd>
    </div>
  )
}

/** The submitted figure, exact, with its YoY delta against last year's reported value. */
function ValueHeadline({ a }: { a: QuestionAssignment }) {
  const { t } = useTranslation()
  const f = useFmt()
  const prior = usePrior(a.questionId)
  const current = a.value != null ? Number(a.value) : null
  const delta = prior && current != null && prior.value !== 0 ? ((current - prior.value) / Math.abs(prior.value)) * 100 : null
  return (
    <div className="p-5 sm:p-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)]">
      <div className="min-w-0">
        <div className="text-caption font-semibold text-[var(--text-secondary)]">{t('workflowQueue.detail.value')}</div>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <span className="type-figure text-[36px] leading-[40px] sm:text-[44px] sm:leading-[48px] text-[var(--text-primary)] tabular-nums break-all">
            {current != null ? f.exact(current) : '—'}
          </span>
          {a.unit && <span className="text-body font-medium text-[var(--text-secondary)]">{f.unit(a.unit)}</span>}
        </div>
      </div>
      {prior && (
        <div className="text-right">
          {delta != null && (
            <div className={`text-body font-semibold tabular-nums ${Math.abs(delta) > 20 ? 'text-[var(--status-warning)]' : 'text-[var(--text-primary)]'}`}>
              {f.delta(delta, { percent: true })}
            </div>
          )}
          <div className="text-caption text-[var(--text-tertiary)] whitespace-nowrap">
            {t('workflowQueue.detail.vsPrior', { year: prior.year, value: f.number(prior.value) })}
          </div>
        </div>
      )}
    </div>
  )
}

/** Last reported value for the question (shared by the headline and checks). */
const priorCache = new Map<string, Promise<{ year: number; value: number } | null>>()
function usePrior(questionId: string) {
  const [prior, setPrior] = useState<{ year: number; value: number } | null>(null)
  useEffect(() => {
    let alive = true
    let p = priorCache.get(questionId)
    if (!p) {
      p = orgStore.historical(questionId)
        .then(rows => {
          const list = Array.isArray(rows) ? [...rows].sort((x, y) => y.year - x.year) : []
          return list[0] ? { year: list[0].year, value: Number(list[0].value) } : null
        })
        .catch(() => null)
      priorCache.set(questionId, p)
      setTimeout(() => priorCache.delete(questionId), 60_000)
    }
    void p.then(v => { if (alive) setPrior(v) })
    return () => { alive = false }
  }, [questionId])
  return prior
}

/** Anomaly scan findings + YoY / unit checks, in one list. */
function Checks({ a, flags }: { a: QuestionAssignment; flags: Anomaly[] }) {
  const { t } = useTranslation()
  const f = useFmt()
  const prior = usePrior(a.questionId)
  const items: Array<{ tone: 'danger' | 'warning' | 'info' | 'ok'; title: string; body?: string }> = []

  for (const x of flags) {
    items.push({ tone: x.severity === 'critical' ? 'danger' : x.severity === 'warn' ? 'warning' : 'info', title: x.headline, body: x.detail })
  }
  if (a.response_type !== 'narrative' && a.value != null) {
    const current = Number(a.value)
    const delta = prior && prior.value !== 0 ? ((current - prior.value) / Math.abs(prior.value)) * 100 : null
    if (delta != null && Math.abs(delta) > 20) {
      items.push({ tone: 'warning', title: t('workflowQueue.variance.large', { delta: f.delta(delta, { percent: true }), year: prior!.year, prior: f.number(prior!.value) }) })
    } else if (delta != null) {
      items.push({ tone: 'ok', title: t('workflowQueue.variance.normal', { delta: f.delta(delta, { percent: true }), year: prior!.year }) })
    } else if (!prior) {
      items.push({ tone: 'info', title: t('workflowQueue.variance.noPrior') })
    }
    if (!a.unit || !a.unit.trim()) items.push({ tone: 'warning', title: t('workflowQueue.variance.noUnit') })
  }
  if (!items.length) return null

  const ICON = { danger: AlertOctagon, warning: AlertTriangle, info: Info, ok: CheckCircle2 }
  const COLOR = { danger: 'var(--status-danger)', warning: 'var(--status-warning)', info: 'var(--text-tertiary)', ok: 'var(--status-success)' }
  return (
    <div className="px-5 py-4 sm:px-6">
      <h3 className="text-caption font-semibold text-[var(--text-secondary)] mb-2">{t('workflowQueue.variance.title')}</h3>
      <ul className="space-y-2">
        {items.map((it, i) => {
          const Icon = ICON[it.tone]
          return (
            <li key={i} className="flex items-start gap-2.5">
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: COLOR[it.tone] }} aria-hidden />
              <div className="min-w-0">
                <div className="type-small text-[var(--text-primary)]">{it.title}</div>
                {it.body && <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{it.body}</div>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Where the figure came from: assignment → entry (mode) → evidence → submission → this decision. */
function Lineage({ a, kind }: { a: QuestionAssignment; kind: QueueKind }) {
  const { t } = useTranslation()
  const f = useFmt()
  const evidence = a.evidence_ids ?? []
  const steps: Array<{ key: string; title: string; meta?: string; done: boolean; current?: boolean }> = [
    { key: 'assigned', title: t('workflowQueue.lineage.assigned', { by: a.assigned_by }), meta: f.date(a.assigned_at), done: true },
    { key: 'entered', title: t('workflowQueue.lineage.entered', { name: a.assigneeName, mode: a.used_mode ? t(`workflowQueue.mode.${a.used_mode}`, { defaultValue: a.used_mode }) : t('workflowQueue.lineage.unknownMode') }), done: true },
    { key: 'submitted', title: t('workflowQueue.lineage.submitted'), meta: a.last_updated ? f.relative(a.last_updated) : undefined, done: true },
    ...(kind === 'approval' ? [{ key: 'reviewed', title: t('workflowQueue.lineage.reviewed'), done: true }] : []),
    { key: 'you', title: t(`workflowQueue.lineage.you_${kind}`), done: false, current: true },
  ]
  return (
    <section className="surface-paper p-5 sm:p-6">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-caption font-semibold text-[var(--text-secondary)] mb-3">{t('workflowQueue.lineage.title')}</h3>
          <ol className="relative">
            {steps.map((s, i) => (
              <li key={s.key} className="relative pl-6 pb-3 last:pb-0">
                {i < steps.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-[var(--border-default)]" aria-hidden />}
                <span
                  className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2"
                  style={{
                    borderColor: s.current ? 'var(--color-brand)' : 'var(--status-success)',
                    background: s.current ? 'var(--bg-primary)' : 'var(--status-success)',
                  }}
                  aria-hidden
                />
                <div className={`type-small ${s.current ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{s.title}</div>
                {s.meta && <div className="text-caption text-[var(--text-tertiary)]">{s.meta}</div>}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="text-caption font-semibold text-[var(--text-secondary)] mb-3">
            {t('workflowQueue.detail.evidence', { count: evidence.length })}
          </h3>
          {evidence.length === 0 ? (
            <p className="type-small text-[var(--status-warning)] inline-flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
              {t('workflowQueue.detail.noEvidence')}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {evidence.map((e, i) => {
                const connector = e.startsWith('connector:')
                const Icon = connector ? Plug : e.startsWith('ev_') ? Paperclip : FileText
                const name = connector ? e.split(':')[1] : e.replace(/^ev_/, '')
                return (
                  <li key={i} className="flex items-center gap-2 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] min-w-0">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                    <span className="text-caption text-[var(--text-tertiary)] flex-shrink-0">{connector ? t('workflowQueue.detail.connector') : t('workflowQueue.detail.file')}</span>
                    <span className="type-small font-mono text-[var(--text-primary)] truncate">{name}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */

function QueueSkeleton() {
  return (
    <div>
      <SkeletonLedger items={4} className="mb-6" />
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <div className="hidden lg:block surface-paper p-4 space-y-4">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton height={12} width="40%" />
              <Skeleton height={14} width="90%" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton height={28} width="70%" />
          <Skeleton height={14} width="45%" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )
}
