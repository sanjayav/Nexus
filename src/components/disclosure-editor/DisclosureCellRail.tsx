import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { itemLabel } from '../../lib/itemLabel'
import {
  CheckCircle2, XCircle, Sparkles, History, ScrollText, MessageSquare, ChevronDown, ShieldCheck, ArrowRight, Users,
} from 'lucide-react'
import type { NexusQuestionnaireItem, NexusAuditEvent } from '../../lib/api'
import { nexus } from '../../lib/api'
import type { QuestionAssignment } from '../../lib/orgStore'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../lib/rbac'
import { useFmt } from '../../lib/fmt'
import CommentThread from '../CommentThread'
import { StatusPill } from '../ui'
import { Skeleton } from '../Skeleton'
import { spring, transition } from '../../motion/tokens'
import ValueEntry from '../entry/ValueEntry'
import { sectionLabel, subsectionLabel } from '../entry/labels'
import FactDetailsPanel from './FactDetailsPanel'
import GapAnalysisPanel from './GapAnalysisPanel'

/** Summary of the subsection in view, shown when no cell is selected. */
export interface RailSectionSummary {
  /** Whole framework (nothing picked in the tree) or one subsection. */
  scope: 'framework' | 'subsection'
  section: string
  subsection: string
  total: number
  approved: number
  inReview: number
  drafted: number
  notStarted: number
  owners: string[]
  /** First cell that still needs a value. */
  nextOpenId: string | null
}

/**
 * Right rail for the selected disclosure cell: the shared <ValueEntry> (same
 * entry, evidence, AI extraction and submit as My Tasks and /data/entry),
 * reviewer decisions, fact details and the audit trail. With nothing
 * selected it summarises the subsection in view.
 */
export interface DisclosureCellRailProps {
  item: NexusQuestionnaireItem | null
  assignment: QuestionAssignment | null
  /** Workflow status transition. Caller refreshes state on success. */
  onWorkflowAction: (action: 'submit' | 'approve' | 'reject') => Promise<void>
  workflowBusy?: boolean
  /** `desktop` (rail ≥ xl) or `inline` (inside the mobile shell). */
  variant?: 'desktop' | 'inline'
  /** Framework + year context used by the FactDetailsPanel + GapAnalysisPanel. */
  frameworkId: string
  reportingYear: number
  /** All questionnaire items in the framework — used by gap-analysis "Open" buttons. */
  items: NexusQuestionnaireItem[]
  /** Caller focuses a cell (gap analysis "Open", summary "Next open cell"). */
  onOpenCell?: (questionnaireItemId: string) => void
  /** Optimistic sync after the entry form saves or submits. */
  onAssignmentChange?: (next: QuestionAssignment) => void
  /** Reading mode disables editing. */
  readingMode?: boolean
  summary?: RailSectionSummary | null
}

type RailTab = 'fact' | 'comments' | 'gap'

export default function DisclosureCellRail({
  item, assignment, onWorkflowAction, workflowBusy = false, variant = 'desktop',
  frameworkId, reportingYear, items, onOpenCell, onAssignmentChange, readingMode = false, summary,
}: DisclosureCellRailProps) {
  const { t } = useTranslation()
  const inline = variant === 'inline'
  const [tab, setTab] = useState<RailTab>('fact')

  return (
    <aside
      className={inline
        ? 'flex flex-col w-full h-full bg-[var(--bg-primary)] overflow-y-auto'
        : 'hidden xl:flex flex-col w-[380px] flex-shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-primary)] self-stretch min-h-0 overflow-y-auto'}
      aria-label={t('disclosureEditor.rail.aria')}
    >
      <RailTabs tab={tab} onChange={setTab} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab === 'fact' ? `fact-${item?.id ?? 'none'}` : tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition.fast}
          className="flex-1 min-h-0 flex flex-col"
        >
          {tab === 'gap' ? (
            <GapAnalysisPanel frameworkId={frameworkId} reportingYear={reportingYear} items={items} onOpenCell={onOpenCell} />
          ) : !item ? (
            <SectionSummary summary={summary ?? null} onOpenCell={onOpenCell} />
          ) : tab === 'fact' ? (
            <CellPanel
              item={item}
              assignment={assignment}
              onWorkflowAction={onWorkflowAction}
              workflowBusy={workflowBusy}
              frameworkId={frameworkId}
              reportingYear={reportingYear}
              onAssignmentChange={onAssignmentChange}
              readingMode={readingMode}
            />
          ) : (
            <div className="p-5">
              {assignment ? <CommentThread assignmentId={assignment.id} /> : (
                <p className="text-caption text-[var(--text-tertiary)]">{t('disclosureEditor.rail.commentsEmpty')}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </aside>
  )
}

function RailTabs({ tab, onChange }: { tab: RailTab; onChange: (t: RailTab) => void }) {
  const { t: tr } = useTranslation()
  const id = useId()
  const tabs: Array<{ key: RailTab; label: string; icon: typeof ScrollText }> = [
    { key: 'fact', label: tr('disclosureEditor.rail.tabEntry'), icon: ScrollText },
    { key: 'comments', label: tr('disclosureEditor.rail.tabComments'), icon: MessageSquare },
    { key: 'gap', label: tr('disclosureEditor.rail.tabGap'), icon: Sparkles },
  ]
  return (
    <div role="tablist" className="flex items-stretch border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] sticky top-0 z-20">
      {tabs.map(x => {
        const active = tab === x.key
        const Icon = x.icon
        return (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`rail-tab-${x.key}`}
            onClick={() => onChange(x.key)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 h-11 text-caption font-semibold whitespace-nowrap transition-colors ${
              active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
            {x.label}
            {active && <motion.span layoutId={`${id}-tab`} transition={spring.snappy} className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-[var(--color-brand)]" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}

function SectionSummary({ summary, onOpenCell }: { summary: RailSectionSummary | null; onOpenCell?: (id: string) => void }) {
  const { t } = useTranslation()
  if (!summary) {
    return <p className="p-6 text-small text-[var(--text-tertiary)]">{t('disclosureEditor.rail.empty')}</p>
  }
  const done = summary.approved + summary.inReview
  const rows = [
    { label: t('disclosureEditor.summary.approved'), n: summary.approved, cls: 'bg-[var(--color-brand)]' },
    { label: t('disclosureEditor.summary.inReview'), n: summary.inReview, cls: 'bg-[var(--chart-s2)] opacity-70' },
    { label: t('disclosureEditor.summary.drafted'), n: summary.drafted, cls: 'bg-[var(--chart-s3)] opacity-60' },
    { label: t('disclosureEditor.summary.notStarted'), n: summary.notStarted, cls: 'bg-[var(--bg-tertiary)]' },
  ]
  return (
    <div className="p-5 space-y-5">
      <div>
        {summary.scope === 'subsection' && <div className="text-caption font-semibold text-[var(--color-brand-strong)]">{sectionLabel(t, summary.section)}</div>}
        <h3 className="type-h3 text-[var(--text-primary)] mt-0.5">{summary.scope === 'subsection' ? subsectionLabel(t, summary.subsection) : t('disclosureEditor.summary.wholeFramework')}</h3>
        <p className="text-caption text-[var(--text-secondary)] mt-1">{t('disclosureEditor.summary.progress', { done, total: summary.total })}</p>
      </div>
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.label} className="flex items-center gap-2.5 text-small">
            <span className={`w-2.5 h-2.5 rounded-full ${r.cls}`} aria-hidden />
            <span className="flex-1 text-[var(--text-secondary)]">{r.label}</span>
            <span className="tabular-nums font-semibold text-[var(--text-primary)]">{r.n}</span>
          </li>
        ))}
      </ul>
      {summary.owners.length > 0 && (
        <div>
          <div className="text-caption font-semibold text-[var(--text-secondary)] inline-flex items-center gap-1.5 mb-1.5"><Users className="w-3.5 h-3.5" aria-hidden />{t('disclosureEditor.summary.owners')}</div>
          <p className="text-small text-[var(--text-primary)]">{summary.owners.join(t('disclosureEditor.document.listSep'))}</p>
        </div>
      )}
      {summary.nextOpenId && onOpenCell ? (
        <button
          type="button"
          onClick={() => onOpenCell(summary.nextOpenId!)}
          className="w-full inline-flex items-center justify-between gap-2 h-10 px-3.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)]"
        >
          {t('disclosureEditor.summary.nextOpen')} <ArrowRight className="w-4 h-4" aria-hidden />
        </button>
      ) : (
        <p className="text-small text-[var(--status-success)] inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" aria-hidden />{t('disclosureEditor.summary.allFilled')}</p>
      )}
      <p className="text-caption text-[var(--text-tertiary)]">{t('disclosureEditor.summary.hint')}</p>
    </div>
  )
}

function CellPanel({
  item, assignment, onWorkflowAction, workflowBusy, frameworkId, reportingYear, onAssignmentChange, readingMode,
}: {
  item: NexusQuestionnaireItem
  assignment: QuestionAssignment | null
  onWorkflowAction: (action: 'submit' | 'approve' | 'reject') => Promise<void>
  workflowBusy: boolean
  frameworkId: string
  reportingYear: number
  onAssignmentChange?: (next: QuestionAssignment) => void
  readingMode: boolean
}) {
  const { user, permissions } = useAuth()
  const { t, i18n } = useTranslation()
  const canReview = hasPermission(permissions, 'workflow.approve')
  const status = assignment?.status ?? 'not_started'
  const isAssignee = assignment?.assigneeEmail
    ? assignment.assigneeEmail.toLowerCase() === (user?.email ?? '').toLowerCase()
    : false
  // Same rule as the inline cells.
  const allowEdit = !!user && !readingMode && hasPermission(permissions, 'data.upload') && (isAssignee || canReview)

  return (
    <div className="flex flex-col">
      <header className="px-5 pt-4 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-mono text-[var(--text-tertiary)]">{item.gri_code}</span>
          <StatusPill status={status} size="sm" />
          {assignment?.is_overdue && <StatusPill status="overdue" size="sm" />}
        </div>
        <h3 className="type-h3 text-[var(--text-primary)] mt-1">{itemLabel(item, i18n.language)}</h3>
        {assignment?.assigneeName && (
          <p className="text-caption text-[var(--text-tertiary)] mt-1">{t('disclosureEditor.rail.assignedToName', { name: assignment.assigneeName })}</p>
        )}
        {canReview && assignment && status === 'submitted' && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void onWorkflowAction('approve')}
              disabled={workflowBusy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden /> {t('disclosureEditor.rail.approve')}
            </button>
            <button
              type="button"
              onClick={() => void onWorkflowAction('reject')}
              disabled={workflowBusy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] border border-[var(--status-danger-line)] bg-[var(--bg-primary)] text-[var(--status-danger)] text-small font-semibold hover:bg-[var(--status-danger-soft)] disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" aria-hidden /> {t('disclosureEditor.rail.reject')}
            </button>
          </div>
        )}
      </header>

      <div className="border-t border-[var(--border-subtle)] pt-4">
        <ValueEntry
          key={`${item.id}:${assignment?.id ?? 'none'}`}
          variant="rail"
          question={item}
          assignment={assignment}
          readOnly={!allowEdit}
          onAssignmentChange={onAssignmentChange}
          fullPageHref={`/data/entry/${encodeURIComponent(item.id)}${assignment ? `?assignment=${encodeURIComponent(assignment.id)}` : ''}`}
        />
      </div>

      <Disclosure title={t('disclosureEditor.rail.factDetails')} icon={<ScrollText className="w-3.5 h-3.5" aria-hidden />}>
        <FactDetailsPanel item={item} assignment={assignment} reportingYear={reportingYear} currentFrameworkId={frameworkId} />
      </Disclosure>
      <Disclosure title={t('disclosureEditor.rail.audit')} icon={<History className="w-3.5 h-3.5" aria-hidden />}>
        <AuditTrail assignment={assignment} itemId={item.id} />
      </Disclosure>
    </div>
  )
}

function Disclosure({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <section className="border-t border-[var(--border-subtle)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-5 h-11 text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
      >
        <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">{icon}<span className="text-[var(--text-primary)]">{title}</span></span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={transition.fast}><ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" aria-hidden /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition.base} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function AuditTrail({ assignment, itemId }: { assignment: QuestionAssignment | null; itemId: string }) {
  const { t } = useTranslation()
  const f = useFmt()
  const [trail, setTrail] = useState<NexusAuditEvent[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    setTrail(null); setFailed(false)
    if (!assignment) { setTrail([]); return }
    nexus.trail(assignment.id)
      .then(r => { if (!cancelled) setTrail(r) })
      .catch(() => { if (!cancelled) { setFailed(true); setTrail([]) } })
    return () => { cancelled = true }
  }, [assignment?.id, itemId])

  if (trail === null) return <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /></div>
  if (failed) return <p className="text-caption text-[var(--text-tertiary)]">{t('disclosureEditor.rail.auditFailed')}</p>
  if (trail.length === 0) return <p className="text-caption text-[var(--text-tertiary)]">{t('disclosureEditor.rail.noAudit')}</p>
  return (
    <ol className="relative space-y-3 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-[var(--border-subtle)]">
      {trail.map(e => (
        <li key={e.id} className="relative pl-6 text-caption">
          <ShieldCheck className="absolute left-0 top-0.5 w-[15px] h-[15px] text-[var(--color-brand)] bg-[var(--bg-primary)]" aria-hidden />
          <div className="font-semibold text-[var(--text-primary)]">{t(`auditor.event.${e.event_type}`, { defaultValue: e.event_type })}</div>
          <div className="text-[var(--text-tertiary)]">
            {e.actor_name ?? e.actor_email ?? t('disclosureEditor.rail.system')} · {f.dateTime(e.timestamp)}
          </div>
        </li>
      ))}
    </ol>
  )
}
