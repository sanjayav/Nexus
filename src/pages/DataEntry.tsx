import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CalendarClock, Factory, Target } from 'lucide-react'
import { itemLabel } from '../lib/itemLabel'
import { localizeUnit } from '../calculators/labels'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import { orgStore, type OrgEntity, type OrgMember, type QuestionAssignment } from '../lib/orgStore'
import { useActiveReportingYear } from '../lib/activeReportingYear'
import { useFmt } from '../lib/fmt'
import SetupGuard from '../components/SetupGuard'
import { StateBoundary, StatusPill, EmptyState } from '../components/ui'
import { Skeleton, SkeletonCard } from '../components/Skeleton'
import ValueEntry from '../components/entry/ValueEntry'
import { sectionLabel, subsectionLabel } from '../components/entry/labels'
import type { EntryMode } from '../components/entry/persist'

type Loaded = {
  item: NexusQuestionnaireItem
  assignment: QuestionAssignment | null
  entities: OrgEntity[]
  members: OrgMember[]
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'notfound' }
  | { kind: 'error'; error: string }
  | { kind: 'ready'; data: Loaded }

/**
 * /data/entry/:questionId — the full-page version of the shared entry
 * surface. Same <ValueEntry> as the My Tasks panel and the editor rail, with
 * room for the 4-year history, linked data and the discussion.
 *
 * `?assignment=<id>` picks the assignment (from My Tasks "Open full page");
 * otherwise the caller's open assignment for this question is used.
 * `?mode=Manual|Calculator|Connector` preselects the entry mode.
 */
export default function DataEntry() {
  const { questionId } = useParams<{ questionId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const activeYear = useActiveReportingYear()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const assignmentParam = searchParams.get('assignment')
  const modeParam = searchParams.get('mode')
  const initialMode: EntryMode | null = modeParam === 'Manual' || modeParam === 'Calculator' || modeParam === 'Connector' ? modeParam : null

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const mine = await orgStore.myAssignments().catch(() => [] as QuestionAssignment[])
      const candidates = mine.filter(a => a.questionId === questionId)
      const assignment =
        candidates.find(a => a.id === assignmentParam) ??
        candidates.find(a => a.status === 'in_progress' || a.status === 'not_started' || a.status === 'rejected') ??
        candidates[0] ?? null
      let tree = await nexus.tree(assignment?.framework_id ?? 'gri')
      let item = tree.find(q => q.id === questionId)
      if (!item && assignment && assignment.framework_id !== 'gri') {
        tree = await nexus.tree('gri')
        item = tree.find(q => q.id === questionId)
      }
      if (tree.length === 0) return setState({ kind: 'empty' })
      if (!item) return setState({ kind: 'notfound' })
      const [entities, members] = await Promise.all([
        orgStore.listEntities().catch(() => [] as OrgEntity[]),
        orgStore.listMembers().catch(() => [] as OrgMember[]),
      ])
      setState({ kind: 'ready', data: { item, assignment, entities, members } })
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : t('dataEntry.entry.failedToLoad') })
    }
  }, [questionId, assignmentParam, t])

  useEffect(() => { void load() }, [load])

  const onAssignmentChange = useCallback((next: QuestionAssignment) => {
    setState(s => (s.kind === 'ready' ? { kind: 'ready', data: { ...s.data, assignment: next } } : s))
  }, [])

  if (state.kind === 'empty') return <SetupGuard onReady={() => void load()} />

  const ready = state.kind === 'ready' ? state.data : null
  const noYear = activeYear.kind === 'none'
  const yearError = activeYear.kind === 'error' ? activeYear.error : null
  // Without an assignment the snapshot IS the record, so an open year is required.
  const blockedByYear = !!ready && !ready.assignment && (noYear || !!yearError)

  return (
    <div className="space-y-5">
      <StateBoundary
        loading={state.kind === 'loading' || activeYear.kind === 'loading'}
        error={state.kind === 'error' ? state.error : null}
        onRetry={() => void load()}
        errorState={{ title: t('dataEntry.entry.unableToLoad') }}
        empty={state.kind === 'notfound'}
        emptyState={{
          variant: 'empty',
          art: 'noData',
          title: t('dataEntry.entry.notFound'),
          body: t('dataEntry.entry.notFoundBody'),
          cta: { label: t('dataEntry.page.backToTasks'), onClick: () => navigate('/my-tasks') },
        }}
        skeleton={<EntrySkeleton />}
      >
        {() => {
          if (!ready) return null
          const { item, assignment, entities, members } = ready
          const entity = assignment ? entities.find(e => e.id === assignment.entityId) : undefined
          return (
            <>
              {/* Context bar — stays in view while the form scrolls. */}
              <nav
                aria-label={t('dataEntry.page.contextAria')}
                className="topbar-surface sticky top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 -mt-1 py-2.5 flex items-center justify-between gap-3"
              >
                <Link to="/my-tasks" className="inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-[var(--radius-sm)] text-small font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] group">
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" aria-hidden /> {t('dataEntry.page.backToTasks')}
                </Link>
                <div className="flex items-center gap-2 min-w-0 text-caption text-[var(--text-tertiary)]">
                  <span className="hidden md:inline truncate">{sectionLabel(t, item.section)}</span>
                  <span className="hidden md:inline text-[var(--text-quaternary)]" aria-hidden>/</span>
                  <span className="hidden sm:inline truncate">{subsectionLabel(t, item.subsection)}</span>
                  <span className="hidden sm:inline text-[var(--text-quaternary)]" aria-hidden>/</span>
                  <span className="font-semibold text-[var(--text-primary)] tabular-nums whitespace-nowrap">{item.gri_code}</span>
                  {assignment && <StatusPill status={assignment.status} size="sm" />}
                </div>
              </nav>

              <header className="surface-hero p-5 sm:p-7">
                <div className="flex items-center gap-2 flex-wrap text-caption text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--color-brand-strong)] tabular-nums">{item.gri_code}</span>
                  <span aria-hidden>·</span>
                  <span>{t(`workflowStatus.role.${item.default_workflow_role}`, { defaultValue: item.default_workflow_role })}</span>
                </div>
                <h1 className="type-h1 text-[var(--text-primary)] mt-2 max-w-3xl text-balance">{itemLabel(item, i18n.language)}</h1>
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-small">
                  {item.unit && <Meta label={t('dataEntry.entry.unit')} value={localizeUnit(t, item.unit)} />}
                  {item.scope_split && <Meta label={t('dataEntry.entry.scope')} value={t(`dataEntry.scope.${item.scope_split}`, { defaultValue: item.scope_split })} />}
                  <Meta label={t('dataEntry.entry.reporting')} value={item.reporting_scope === 'jv' ? t('dataEntry.entry.jvParallel') : t('dataEntry.entry.group')} />
                  {entity && <Meta icon={<Factory className="w-3.5 h-3.5" aria-hidden />} label={t('dataEntry.page.entity')} value={entity.name} />}
                  {assignment?.due_date && <Meta icon={<CalendarClock className="w-3.5 h-3.5" aria-hidden />} label={t('dataEntry.page.due')} value={f.date(assignment.due_date)} tone={assignment.is_overdue ? 'danger' : undefined} />}
                  {item.target_fy2026 != null && <Meta icon={<Target className="w-3.5 h-3.5" aria-hidden />} label={t('dataEntry.entry.target', { year: 2026 })} value={f.exact(item.target_fy2026, item.unit)} />}
                </dl>
              </header>

              {(noYear || yearError) && (
                <div className="surface-paper">
                  <EmptyState
                    density="compact"
                    icon={CalendarClock}
                    title={yearError ? t('dataEntry.page.yearErrorTitle') : t('reportingYear.none.title')}
                    body={yearError ?? (assignment ? t('dataEntry.page.yearNoneWithAssignment') : t('reportingYear.none.body'))}
                    cta={{ label: t('reportingYear.none.cta'), onClick: () => navigate('/admin/periods') }}
                    secondaryCta={{ label: t('reportingYear.none.retry'), onClick: activeYear.reload }}
                  />
                </div>
              )}

              {!blockedByYear && (
                <ValueEntry
                  key={`${item.id}:${assignment?.id ?? 'none'}`}
                  variant="page"
                  question={item}
                  assignment={assignment}
                  onAssignmentChange={onAssignmentChange}
                  entities={entities}
                  members={members}
                  initialMode={initialMode}
                  onPeerClick={peer => navigate(`/data/entry/${peer.questionnaire_item_id}`)}
                />
              )}
            </>
          )
        }}
      </StateBoundary>
    </div>
  )
}

function Meta({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone?: 'danger' }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {icon && <span className="text-[var(--text-tertiary)]">{icon}</span>}
      <dt className="text-[var(--text-tertiary)] whitespace-nowrap">{label}</dt>
      <dd className={`font-semibold truncate ${tone === 'danger' ? 'text-[var(--status-danger)]' : 'text-[var(--text-primary)]'}`}>{value}</dd>
    </div>
  )
}

function EntrySkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-full" />
      <div className="surface-paper p-7 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <SkeletonCard className="h-[420px]" />
        <SkeletonCard className="h-[420px]" />
      </div>
    </div>
  )
}
