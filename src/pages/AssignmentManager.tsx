import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { itemLabel } from '../lib/itemLabel'
import { capitalLabelKey, subsectionLabelKey } from '../reports/spdTemplate'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Trash2, Calendar, Factory,
  PencilLine, Calculator as CalcIcon, Plug, AlertCircle, Loader2, FileText,
  List, Columns, GitBranch, Network as NetworkIcon, Users, X, Check, ChevronDown,
} from 'lucide-react'
import { orgStore, type OrgEntity, type OrgMember, type QuestionAssignment, type ResponseType } from '../lib/orgStore'
import JargonTooltip from '../components/JargonTooltip'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import { findCalculator } from '../calculators/registry'
import { useAuth } from '../auth/AuthContext'
import JourneyBar from '../components/JourneyBar'
import { FrameworkBadge } from '../components/FrameworkBadge'
import { useFramework } from '../lib/frameworks'
import SavedViewsBar from '../components/SavedViewsBar'
import PageHeader from '../components/PageHeader'
import { StateBoundary, StatLedger, StatusPill, notify, useConfirm, SkeletonLedger, SkeletonTable } from '../components/ui'
import { useFmt } from '../lib/fmt'
import { dur, ease, spring } from '../motion/tokens'
import SideSheet from '../components/settings/SideSheet'

const MODES = ['Manual', 'Calculator', 'Connector'] as const
type Mode = typeof MODES[number]
type Status = QuestionAssignment['status']
const STATUSES: Status[] = ['not_started', 'in_progress', 'submitted', 'reviewed', 'approved', 'rejected']
const MODE_ICON = { Manual: PencilLine, Calculator: CalcIcon, Connector: Plug } as const

/** Table rows can't animate height; they fade in and slide out to the right. */
const rowMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: dur.fast, ease: ease.out } },
  exit: { opacity: 0, x: 24, transition: { duration: dur.base, ease: ease.out } },
}

const fieldCls =
  'h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-small text-[var(--text-primary)] ' +
  'focus:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-2 focus-visible:ring-[var(--status-success-line)] disabled:opacity-50'

function isOverdue(a: QuestionAssignment): boolean {
  if (typeof a.is_overdue === 'boolean') return a.is_overdue
  if (!a.due_date || a.status === 'approved' || a.status === 'reviewed' || a.status === 'submitted') return false
  return new Date(a.due_date + 'T23:59:59').getTime() < Date.now()
}

export default function AssignmentManager() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const { user } = useAuth()
  const confirm = useConfirm()
  const { active: framework } = useFramework()
  const [questions, setQuestions] = useState<NexusQuestionnaireItem[]>([])
  const [entities, setEntities] = useState<OrgEntity[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [assignments, setAssignments] = useState<QuestionAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<Status | 'all' | 'overdue'>('all')
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [view, setView] = useState<'list' | 'kanban' | 'tree' | 'network'>(() => {
    try { return (localStorage.getItem('aeiforo_assignment_view') as 'list' | 'kanban' | 'tree' | 'network') || 'list' } catch { return 'list' }
  })
  useEffect(() => { try { localStorage.setItem('aeiforo_assignment_view', view) } catch { /* private mode */ } }, [view])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // bulk-assign sheet
  const [bulkOpen, setBulkOpen] = useState(false)

  // new-assignment sheet
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pickedQuestion, setPickedQuestion] = useState<NexusQuestionnaireItem | null>(null)
  const [pickedEntity, setPickedEntity] = useState<string>('')
  const [pickedMember, setPickedMember] = useState<string>('')
  const [pickedModes, setPickedModes] = useState<Mode[]>(['Manual'])
  const [pickedResponseType, setPickedResponseType] = useState<ResponseType>('numeric')
  const [pickedDue, setPickedDue] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    setLoadError(null)
    try {
      const [tree, ents, mems, asgs] = await Promise.all([
        nexus.tree(framework.id).catch(() => [] as NexusQuestionnaireItem[]),
        orgStore.listEntities(),
        orgStore.listMembers(),
        orgStore.listAssignments(),
      ])
      setQuestions(tree)
      setEntities(ents)
      setMembers(mems)
      setAssignments(asgs.filter(a => a.framework_id === framework.id))
      setLoaded(true)
    } catch (e) {
      setLoadError(e)
    }
  }, [framework.id])

  const load = useCallback(async () => {
    setLoading(true)
    await refresh()
    setLoading(false)
  }, [refresh])

  useEffect(() => { void load() }, [load])

  const entityById = useMemo(() => new Map(entities.map(e => [e.id, e])), [entities])
  const memberById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const plants = useMemo(() => entities.filter(e => e.type === 'plant' || e.type === 'office'), [entities])

  const openDrawer = useCallback(() => {
    setPickedQuestion(null)
    setPickedEntity(plants[0]?.id || '')
    setPickedMember('')
    setPickedModes(['Manual'])
    setPickedResponseType('numeric')
    setPickedDue('')
    setDrawerOpen(true)
  }, [plants])

  // Deep links: ?action=bulk-assign (top bar "New"), ?bulk=1 and ?new=1 (command
  // palette). Open the matching sheet once, then clear the param so a reload
  // doesn't re-trigger it.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const wantsBulk = searchParams.get('action') === 'bulk-assign' || searchParams.get('bulk') === '1'
    const wantsNew = searchParams.get('new') === '1'
    if (!wantsBulk && !wantsNew) return
    if (wantsNew && !loaded) return // wait for entities so the sheet can preselect one
    if (wantsBulk) setBulkOpen(true)
    if (wantsNew) openDrawer()
    const next = new URLSearchParams(searchParams)
    next.delete('action'); next.delete('bulk'); next.delete('new')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, loaded, openDrawer])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return assignments.filter(a => {
      if (filterStatus === 'overdue') { if (!isOverdue(a)) return false }
      else if (filterStatus !== 'all' && a.status !== filterStatus) return false
      if (filterEntity !== 'all' && a.entityId !== filterEntity) return false
      if (!q) return true
      return (
        a.gri_code.toLowerCase().includes(q) ||
        a.line_item.toLowerCase().includes(q) ||
        itemLabel(a, i18n.language).toLowerCase().includes(q) ||
        a.assigneeName.toLowerCase().includes(q) ||
        a.assigneeEmail.toLowerCase().includes(q)
      )
    })
  }, [assignments, query, filterStatus, filterEntity, i18n.language])

  // Drop selections that are no longer visible.
  useEffect(() => {
    setSelected(prev => {
      if (prev.size === 0) return prev
      const visible = new Set(filtered.map(a => a.id))
      const next = new Set([...prev].filter(id => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [filtered])

  const stats = useMemo(() => ({
    total: assignments.length,
    approved: assignments.filter(a => a.status === 'approved').length,
    inFlight: assignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length,
    open: assignments.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected').length,
    overdue: assignments.filter(isOverdue).length,
  }), [assignments])

  const toggleMode = (m: Mode) => {
    setPickedModes(prev => {
      if (prev.includes(m)) {
        const next = prev.filter(x => x !== m)
        return next.length === 0 ? prev : next // always keep at least one
      }
      return [...prev, m]
    })
  }

  const saveAssignment = async () => {
    if (!pickedQuestion || !pickedEntity || !pickedMember || pickedModes.length === 0) return
    const m = memberById.get(pickedMember)
    if (!m) return
    setSaving(true)
    try {
      const created = await orgStore.addAssignment({
        framework_id: framework.id,
        questionId: pickedQuestion.id,
        gri_code: pickedQuestion.gri_code,
        line_item: pickedQuestion.line_item,
        entityId: pickedEntity,
        assigneeId: m.userId,
        assigneeName: m.name,
        assigneeEmail: m.email,
        entry_modes: pickedResponseType === 'narrative' ? ['Manual'] : pickedModes,
        due_date: pickedDue || null,
        assigned_by: user?.email || 'unknown',
        unit: pickedQuestion.unit,
        response_type: pickedResponseType,
      })
      setAssignments(a => [created, ...a])
      setDrawerOpen(false)
      notify.success(t('assignments.toast.created', { code: created.gri_code, name: m.name }))
    } catch (e) {
      notify.error(t('assignments.errors.createTitle'), { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  const removeMany = async (ids: string[]) => {
    if (ids.length === 0) return
    const one = ids.length === 1 ? assignments.find(a => a.id === ids[0]) : null
    const ok = await confirm({
      title: one
        ? t('assignments.remove.oneTitle', { code: one.gri_code, name: one.assigneeName })
        : t('assignments.remove.manyTitle', { count: ids.length }),
      description: t('assignments.remove.body', { count: ids.length }),
      confirmLabel: t('assignments.remove.confirm', { count: ids.length }),
      tone: 'destructive',
    })
    if (!ok) return
    const results = await Promise.allSettled(ids.map(id => orgStore.removeAssignment(id)))
    const removed = ids.filter((_, i) => results[i].status === 'fulfilled')
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    setAssignments(a => a.filter(x => !removed.includes(x.id)))
    setSelected(new Set())
    if (removed.length) notify.success(t('assignments.remove.done', { count: removed.length }))
    if (failed) notify.error(t('assignments.remove.failed', { count: ids.length - removed.length }), { description: failed.reason instanceof Error ? failed.reason.message : String(failed.reason) })
  }

  const setDueMany = async (ids: string[], due: string | null) => {
    const results = await Promise.allSettled(ids.map(id => orgStore.updateAssignment(id, { due_date: due })))
    const okIds = ids.filter((_, i) => results[i].status === 'fulfilled')
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    setAssignments(a => a.map(x => (okIds.includes(x.id) ? { ...x, due_date: due, is_overdue: undefined } : x)))
    if (okIds.length) notify.success(t('assignments.bulkBar.dueDone', { count: okIds.length }))
    if (failed) notify.error(t('assignments.bulkBar.dueFailed', { count: ids.length - okIds.length }), { description: failed.reason instanceof Error ? failed.reason.message : String(failed.reason) })
    setSelected(new Set())
  }

  const removeAssignment = (id: string) => void removeMany([id])
  const filtersOn = query !== '' || filterStatus !== 'all' || filterEntity !== 'all'
  const clearFilters = () => { setQuery(''); setFilterStatus('all'); setFilterEntity('all') }

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title={t('assignments.title')}
        description={
          <Trans
            i18nKey="assignments.description"
            values={{ framework: framework.code }}
            components={{ rbac: <JargonTooltip term="RBAC" />, b: <strong /> }}
          />
        }
        actions={
          <>
            <button onClick={() => setBulkOpen(true)} className="btn-secondary">
              <Users className="w-4 h-4" aria-hidden /> {t('assignments.bulkAssign')}
            </button>
            <button onClick={openDrawer} className="btn-primary">
              <Plus className="w-4 h-4" aria-hidden /> {t('assignments.newAssignment')}
            </button>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <JourneyBar variant="compact" highlight="assign" />
        <FrameworkBadge size="md" />
      </div>

      <StateBoundary
        loading={loading}
        error={loadError}
        hasData={loaded}
        onRetry={load}
        errorState={{ title: t('assignments.errors.loadTitle') }}
        skeleton={<div className="space-y-5"><SkeletonLedger items={5} /><SkeletonTable rows={6} cols={6} /></div>}
      >
        {() => (
          <>
            <StatLedger
              className="mb-5"
              aria-label={t('assignments.stats.aria')}
              items={[
                { id: 'total', label: t('assignments.stats.total'), value: stats.total, tone: 'neutral', onClick: () => setFilterStatus('all') },
                { id: 'open', label: t('assignments.stats.open'), value: stats.open, tone: 'warning', onClick: () => setFilterStatus('in_progress') },
                { id: 'review', label: t('assignments.stats.inReview'), value: stats.inFlight, tone: 'info', onClick: () => setFilterStatus('submitted') },
                { id: 'approved', label: t('assignments.stats.approved'), value: stats.approved, tone: 'success', onClick: () => setFilterStatus('approved'),
                  hint: stats.total ? t('assignments.stats.approvedHint', { pct: f.number((stats.approved / stats.total) * 100, { maxFraction: 0 }) }) : undefined },
                { id: 'overdue', label: t('assignments.stats.overdue'), value: stats.overdue, tone: stats.overdue ? 'danger' : 'neutral', onClick: () => setFilterStatus('overdue') },
              ]}
            />

            <SavedViewsBar
              page="assignment-manager"
              filters={{ query, filterStatus, filterEntity }}
              onApply={(fv: { query?: string; filterStatus?: Status | 'all' | 'overdue'; filterEntity?: string }) => {
                if (typeof fv.query === 'string') setQuery(fv.query)
                if (fv.filterStatus) setFilterStatus(fv.filterStatus)
                if (fv.filterEntity) setFilterEntity(fv.filterEntity)
              }}
              className="mb-3"
            />

            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('assignments.searchPlaceholder')}
                  aria-label={t('assignments.searchPlaceholder')}
                  className={`${fieldCls} pl-9`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | 'all' | 'overdue')} aria-label={t('assignments.allStatuses')} className={`${fieldCls} w-auto min-w-[150px] flex-1 sm:flex-none`}>
                  <option value="all">{t('assignments.allStatuses')}</option>
                  <option value="overdue">{t('assignments.stats.overdue')}</option>
                  {STATUSES.map(s => <option key={s} value={s}>{t(`workflowStatus.status.${s}`)}</option>)}
                </select>
                <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} aria-label={t('assignments.allEntities')} className={`${fieldCls} w-auto min-w-[150px] max-w-[240px] flex-1 sm:flex-none`}>
                  <option value="all">{t('assignments.allEntities')}</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ViewSwitch value={view} onChange={setView} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <StateBoundary
                empty
                emptyState={assignments.length === 0
                  ? { art: 'setup', title: t('assignments.empty.noneTitle'), body: t('assignments.empty.noneBody'), cta: { label: t('assignments.bulkAssign'), onClick: () => setBulkOpen(true) }, secondaryCta: { label: t('assignments.empty.create'), onClick: openDrawer }, framed: true }
                  : { variant: 'filtered', title: t('assignments.empty.noResults'), body: t('assignments.empty.noResultsBody'), onClearFilters: clearFilters, framed: true }}
              >{null}</StateBoundary>
            ) : view === 'kanban' ? (
              <KanbanView assignments={filtered} entityById={entityById} onRemove={removeAssignment} />
            ) : view === 'tree' ? (
              <TreeView assignments={filtered} entities={entities} onRemove={removeAssignment} />
            ) : view === 'network' ? (
              <NetworkView assignments={filtered} entities={entities} />
            ) : (
              <AssignmentTable
                rows={filtered}
                entityById={entityById}
                selected={selected}
                setSelected={setSelected}
                onRemove={removeAssignment}
                grouped={filterEntity === 'all'}
              />
            )}
            {filtersOn && filtered.length > 0 && (
              <p className="mt-3 text-caption text-[var(--text-tertiary)]">
                {t('assignments.showing', { shown: filtered.length, total: assignments.length })}{' '}
                <button type="button" onClick={clearFilters} className="font-medium text-[var(--color-brand)] hover:underline underline-offset-2">{t('assignments.clearFilters')}</button>
              </p>
            )}
          </>
        )}
      </StateBoundary>

      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onRemove={() => removeMany([...selected])}
        onSetDue={(d) => setDueMany([...selected], d)}
      />

      {bulkOpen && (
        <BulkAssignModal
          frameworkId={framework.id}
          entities={entities}
          members={members}
          questions={questions}
          onClose={() => setBulkOpen(false)}
          onDone={async () => { setBulkOpen(false); await refresh() }}
        />
      )}

      {/* New assignment sheet */}
      <SideSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        busy={saving}
        width={540}
        title={t('assignments.newAssignment')}
        description={t('assignments.drawer.subtitle', { framework: framework.code })}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn-secondary h-10" disabled={saving}>{t('common.cancel')}</button>
            <button onClick={saveAssignment} disabled={saving || !pickedQuestion || !pickedEntity || !pickedMember} className="btn-primary h-10">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
              {t('assignments.empty.create')}
            </button>
          </>
        }
      >
        <DrawerProgress
          steps={[!!pickedQuestion, !!pickedQuestion, !!pickedEntity, !!pickedMember, pickedModes.length > 0, !!pickedDue]}
        />
        <Step num={1} title={t('assignments.drawer.step1')} done={!!pickedQuestion}>
          <QuestionPicker
            questions={questions}
            selected={pickedQuestion}
            onSelect={q => {
              setPickedQuestion(q)
              if (!q) { setPickedModes(['Manual']); return }
              const defaultMode = q.entry_mode_default as Mode
              const hasCalc = findCalculator(q)
              const modes: Mode[] = ['Manual']
              if (hasCalc) modes.push('Calculator')
              if (defaultMode === 'Connector') modes.push('Connector')
              setPickedModes(modes)
            }}
          />
        </Step>

        <Step num={2} title={t('assignments.drawer.step2')} disabled={!pickedQuestion} done={!!pickedQuestion}>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('assignments.drawer.step2')}>
            {([
              { key: 'numeric',   label: t('assignments.drawer.numeric'),   desc: t('assignments.drawer.numericDesc'), icon: CalcIcon },
              { key: 'narrative', label: t('assignments.drawer.narrative'), desc: t('assignments.drawer.narrativeDesc'), icon: FileText },
            ] as Array<{ key: ResponseType; label: string; desc: string; icon: typeof CalcIcon }>).map(opt => {
              const active = pickedResponseType === opt.key
              const Icon = opt.icon
              return (
                <button key={opt.key} type="button" role="radio" aria-checked={active} onClick={() => setPickedResponseType(opt.key)}
                  className={`text-left p-3 rounded-[var(--radius-md)] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] ${active ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`h-4 w-4 ${active ? 'text-[var(--color-brand-strong)]' : 'text-[var(--text-secondary)]'}`} aria-hidden />
                    <span className={`text-small font-semibold ${active ? 'text-[var(--color-brand-strong)]' : 'text-[var(--text-primary)]'}`}>{opt.label}</span>
                  </div>
                  <div className="text-caption text-[var(--text-tertiary)]">{opt.desc}</div>
                </button>
              )
            })}
          </div>
        </Step>

        <Step num={3} title={t('assignments.drawer.step3')} disabled={!pickedQuestion} done={!!pickedEntity}>
          <select value={pickedEntity} onChange={e => setPickedEntity(e.target.value)} disabled={!pickedQuestion} aria-label={t('assignments.drawer.step3')} className={fieldCls}>
            <option value="">{t('assignments.drawer.selectEntity')}</option>
            {entities
              .filter(e => e.type === 'plant' || e.type === 'office' || e.type === 'subsidiary')
              .map(e => {
                const path = orgStore.pathOf(entities, e.id).slice(0, -1).map(p => p.name).join(' › ')
                return <option key={e.id} value={e.id}>{path ? `${path} › ` : ''}{e.name}</option>
              })}
          </select>
        </Step>

        <Step num={4} title={t('assignments.drawer.step4')} disabled={!pickedEntity} done={!!pickedMember}>
          {pickedEntity ? (
            <AssigneePicker entityId={pickedEntity} members={members} entities={entities} value={pickedMember} onChange={setPickedMember} />
          ) : (
            <div className="text-small text-[var(--text-tertiary)]">{t('assignments.drawer.pickEntityFirst')}</div>
          )}
        </Step>

        <Step num={5} title={t('assignments.drawer.step5')} disabled={!pickedQuestion || pickedResponseType === 'narrative'} done={!!pickedQuestion && pickedModes.length > 0}>
          <p className="text-caption text-[var(--text-tertiary)] mb-2">{t('assignments.drawer.modesHint')}</p>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => {
              const Icon = MODE_ICON[m]
              const hasCalc = pickedQuestion ? findCalculator(pickedQuestion) : null
              const disabled = m === 'Calculator' && !hasCalc
              const active = pickedModes.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => toggleMode(m)}
                  className={`relative px-3 py-3 rounded-[var(--radius-md)] border text-small font-semibold flex flex-col items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] ${
                    active ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
                           : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {active && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]" aria-hidden>
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                  <Icon className="w-4 h-4" aria-hidden />
                  {t(`assignments.mode.${m}`)}
                  {disabled && <span className="text-caption font-normal text-[var(--text-tertiary)]">{t('assignments.drawer.noCalculator')}</span>}
                </button>
              )
            })}
          </div>
          {pickedModes.length > 1 && (
            <p className="text-caption text-[var(--color-brand)] mt-2">
              {t('assignments.drawer.tabSwitcher', { modes: pickedModes.map(m => t(`assignments.mode.${m}`)).join(' · ') })}
            </p>
          )}
        </Step>

        <Step num={6} title={t('assignments.drawer.step6')} done={!!pickedDue} last>
          <input type="date" value={pickedDue} onChange={e => setPickedDue(e.target.value)} aria-label={t('assignments.drawer.step6')} className={fieldCls} />
        </Step>
      </SideSheet>
    </div>
  )
}

/* ── View switcher (sliding paper pill) ──────────────────────────────── */

function ViewSwitch({ value, onChange }: { value: 'list' | 'kanban' | 'tree' | 'network'; onChange: (v: 'list' | 'kanban' | 'tree' | 'network') => void }) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" aria-label={t('assignments.view.aria')} className="inline-flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1">
      {([
        { k: 'list',    icon: List },
        { k: 'kanban',  icon: Columns },
        { k: 'tree',    icon: GitBranch },
        { k: 'network', icon: NetworkIcon },
      ] as const).map(({ k, icon: Icon }) => {
        const active = value === k
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(k)}
            title={t(`assignments.view.${k}`)}
            className={`relative inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
          >
            {active && <motion.span layoutId="assignment-view-pill" transition={spring.snappy} aria-hidden className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)] ring-1 ring-[var(--border-subtle)]" />}
            <Icon className="relative h-4 w-4" aria-hidden />
            <span className="relative hidden xl:inline">{t(`assignments.view.${k}`)}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── List view: grouped by entity, sticky headers, selection ─────────── */

function AssignmentTable({
  rows, entityById, selected, setSelected, onRemove, grouped,
}: {
  rows: QuestionAssignment[]
  entityById: Map<string, OrgEntity>
  selected: Set<string>
  setSelected: (s: Set<string>) => void
  onRemove: (id: string) => void
  grouped: boolean
}) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const headerRef = useRef<HTMLInputElement>(null)

  const groups = useMemo(() => {
    if (!grouped) return [{ id: 'all', name: '', rows }]
    const m = new Map<string, QuestionAssignment[]>()
    for (const a of rows) {
      const list = m.get(a.entityId) ?? []
      list.push(a)
      m.set(a.entityId, list)
    }
    return [...m.entries()]
      .map(([id, list]) => ({ id, name: entityById.get(id)?.name ?? '—', rows: list }))
      .sort((a, b) => a.name.localeCompare(b.name, i18n.language))
  }, [rows, grouped, entityById, i18n.language])

  const allIds = rows.map(r => r.id)
  const allOn = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someOn = !allOn && allIds.some(id => selected.has(id))
  useEffect(() => { if (headerRef.current) headerRef.current.indeterminate = someOn }, [someOn])

  const toggle = (ids: string[], on: boolean) => {
    const next = new Set(selected)
    for (const id of ids) on ? next.add(id) : next.delete(id)
    setSelected(next)
  }

  return (
    <div className="surface-paper overflow-hidden">
      <div className="max-h-[min(72vh,900px)] overflow-auto">
        <table className="data-table min-w-[920px]">
          <thead>
            <tr>
              <th className="sticky top-0 z-[3] w-11 !pr-0">
                <label className="-m-2 flex h-10 w-10 cursor-pointer items-center justify-center">
                  <input
                    ref={headerRef}
                    type="checkbox"
                    checked={allOn}
                    onChange={e => toggle(allIds, e.target.checked)}
                    aria-label={t('assignments.table.selectAll')}
                    className="h-4 w-4 accent-[var(--color-brand)]"
                  />
                </label>
              </th>
              <th className="sticky top-0 z-[2]">{t('assignments.table.lineItem')}</th>
              {!grouped && <th className="sticky top-0 z-[2]">{t('assignments.table.entity')}</th>}
              <th className="sticky top-0 z-[2]">{t('assignments.table.assignee')}</th>
              <th className="sticky top-0 z-[2]">{t('assignments.table.mode')}</th>
              <th className="sticky top-0 z-[2]">{t('assignments.table.due')}</th>
              <th className="sticky top-0 z-[2]">{t('assignments.table.status')}</th>
              <th className="sticky top-0 z-[2] w-14"><span className="sr-only">{t('common.actions')}</span></th>
            </tr>
          </thead>
          {groups.map(g => {
            const ids = g.rows.map(r => r.id)
            const gAll = ids.every(id => selected.has(id))
            const approved = g.rows.filter(r => r.status === 'approved').length
            return (
              <tbody key={g.id}>
                {grouped && (
                  <tr className="hover:!bg-transparent">
                    <th colSpan={7} scope="rowgroup" className="sticky top-[38px] z-[1] !normal-case !tracking-normal border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] !py-2 text-left">
                      <div className="flex items-center gap-3">
                        <span className="-ml-2 -mr-1 flex h-6 w-10 flex-shrink-0 items-center justify-center">
                          <input
                            type="checkbox"
                            checked={gAll}
                            onChange={e => toggle(ids, e.target.checked)}
                            aria-label={t('assignments.table.selectGroup', { name: g.name })}
                            className="h-4 w-4 accent-[var(--color-brand)]"
                          />
                        </span>
                        <Factory className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
                        <span className="text-small font-semibold text-[var(--text-primary)]">{g.name}</span>
                        <span className="text-caption font-normal text-[var(--text-tertiary)]">
                          {t('assignments.table.groupCount', { count: g.rows.length, approved })}
                        </span>
                        <span className="ml-auto mr-1 hidden h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg-tertiary)] sm:block" aria-hidden>
                          <span className="block h-full rounded-full bg-[var(--status-success)]" style={{ width: `${(approved / g.rows.length) * 100}%` }} />
                        </span>
                      </div>
                    </th>
                  </tr>
                )}
                <AnimatePresence initial={false}>
                  {g.rows.map(a => {
                    const modes = a.entry_modes ?? ['Manual']
                    const overdue = isOverdue(a)
                    const on = selected.has(a.id)
                    return (
                      <motion.tr key={a.id} layout="position" {...rowMotion} className={`group ${on ? '!bg-[var(--color-brand-soft)]' : ''}`} aria-selected={on}>
                        <td className="!pr-0">
                          <label className="-m-2 flex h-10 w-10 cursor-pointer items-center justify-center">
                            <input type="checkbox" checked={on} onChange={e => toggle([a.id], e.target.checked)} aria-label={t('assignments.table.select', { code: a.gri_code })} className="h-4 w-4 accent-[var(--color-brand)]" />
                          </label>
                        </td>
                        <td>
                          <div className="font-mono text-caption font-semibold text-[var(--color-brand)] whitespace-nowrap">{a.gri_code}</div>
                          <div className="max-w-[340px] truncate text-small font-medium text-[var(--text-primary)]" title={itemLabel(a, i18n.language)}>{itemLabel(a, i18n.language)}</div>
                        </td>
                        {!grouped && <td className="whitespace-nowrap text-[var(--text-primary)]">{entityById.get(a.entityId)?.name ?? '—'}</td>}
                        <td>
                          <div className="flex items-center gap-2" title={a.assigneeEmail}>
                            <span aria-hidden className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-inverse)] text-caption font-semibold text-[var(--sidebar-accent)]">
                              {a.assigneeName.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate text-small font-medium text-[var(--text-primary)] max-w-[160px]">{a.assigneeName}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            {modes.map(m => {
                              const Icon = MODE_ICON[m as Mode] ?? PencilLine
                              const used = a.used_mode === m
                              return (
                                <span key={m}
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] ${used ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]' : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'}`}
                                  title={`${t(`assignments.mode.${m}`, { defaultValue: m })} · ${used ? t('assignments.mode.usedTitle') : t('assignments.mode.allowedTitle')}`}
                                >
                                  <Icon className="h-3.5 w-3.5" aria-hidden />
                                  <span className="sr-only">{t(`assignments.mode.${m}`, { defaultValue: m })}</span>
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          {a.due_date ? (
                            <span className={`inline-flex items-center gap-1.5 tabular-nums ${overdue ? 'font-medium text-[var(--status-danger)]' : 'text-[var(--text-secondary)]'}`}>
                              <Calendar className="h-3.5 w-3.5" aria-hidden />
                              {f.date(a.due_date, { style: 'short' })}
                              {overdue && <span className="sr-only">{t('assignments.stats.overdue')}</span>}
                            </span>
                          ) : <span className="text-[var(--text-quaternary)]">—</span>}
                        </td>
                        <td><StatusPill status={a.status} /></td>
                        <td className="text-right">
                          <button
                            onClick={() => onRemove(a.id)}
                            aria-label={t('assignments.removeAria', { code: a.gri_code })}
                            title={t('assignments.removeLabel')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] opacity-0 transition-opacity hover:bg-[var(--status-danger-soft)] hover:text-[var(--status-danger)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            )
          })}
        </table>
      </div>
    </div>
  )
}

/* ── Bulk action bar (slides up while rows are selected) ─────────────── */

function BulkActionBar({ count, onClear, onRemove, onSetDue }: { count: number; onClear: () => void; onRemove: () => void; onSetDue: (d: string | null) => Promise<void> }) {
  const { t } = useTranslation()
  const [dueOpen, setDueOpen] = useState(false)
  const [due, setDue] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (count === 0) { setDueOpen(false); setDue('') } }, [count])

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={spring.gentle}
          className="fixed inset-x-3 bottom-4 z-40 mx-auto max-w-[760px]"
          role="region"
          aria-label={t('assignments.bulkBar.aria')}
        >
          <div className="flex flex-col gap-2 rounded-[var(--radius-xl)] bg-[var(--bg-inverse)] px-3 py-2.5 text-[var(--sidebar-fg)] shadow-[var(--shadow-overlay)] sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 px-1">
              <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[var(--sidebar-accent)] px-1.5 text-caption font-semibold tabular-nums text-[var(--bg-inverse)]">{count}</span>
              <span className="text-small font-medium">{t('assignments.bulkBar.selected', { count })}</span>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
              {dueOpen ? (
                <form
                  className="flex items-center gap-1.5"
                  onSubmit={async e => { e.preventDefault(); if (!due) return; setBusy(true); await onSetDue(due); setBusy(false) }}
                >
                  <input type="date" value={due} onChange={e => setDue(e.target.value)} aria-label={t('assignments.bulkBar.dueDate')} autoFocus
                    className="h-9 rounded-[var(--radius-md)] border border-[var(--sidebar-divider)] bg-transparent px-2 text-small text-[var(--sidebar-fg)] [color-scheme:dark]" />
                  <button type="submit" disabled={!due || busy} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--sidebar-accent)] px-3 text-small font-semibold text-[var(--bg-inverse)] disabled:opacity-50">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
                    {t('assignments.bulkBar.apply')}
                  </button>
                </form>
              ) : (
                <button type="button" onClick={() => setDueOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] px-3 text-small font-medium hover:bg-[var(--sidebar-hover-bg)]">
                  <Calendar className="h-4 w-4" aria-hidden /> {t('assignments.bulkBar.setDue')}
                </button>
              )}
              <button type="button" onClick={onRemove} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] px-3 text-small font-medium text-[var(--sidebar-warn)] hover:bg-[var(--sidebar-hover-bg)]">
                <Trash2 className="h-4 w-4" aria-hidden /> {t('assignments.bulkBar.remove')}
              </button>
              <button type="button" onClick={onClear} aria-label={t('assignments.bulkBar.clear')} title={t('assignments.bulkBar.clear')} className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--sidebar-hover-bg)]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DrawerProgress({ steps }: { steps: boolean[] }) {
  const { t } = useTranslation()
  const done = steps.filter(Boolean).length
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between text-caption text-[var(--text-tertiary)]">
        <span>{t('assignments.drawer.progress', { done, total: steps.length })}</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
        <motion.div className="h-full rounded-full bg-[var(--color-brand)]" initial={false} animate={{ width: `${(done / steps.length) * 100}%` }} transition={spring.gentle} />
      </div>
    </div>
  )
}

function Step({ num, title, disabled, done, last, children }: { num: number; title: string; disabled?: boolean; done?: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <section className={`relative pl-9 ${last ? '' : 'pb-5'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`} aria-disabled={disabled || undefined}>
      {!last && <span aria-hidden className="absolute left-[11px] top-7 bottom-1 w-px bg-[var(--border-default)]" />}
      <span
        aria-hidden
        className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full text-caption font-semibold transition-colors ${done ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]' : 'border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}
      >
        {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : num}
      </span>
      <h3 className="mb-2 pt-0.5 text-small font-semibold text-[var(--text-primary)]">{title}</h3>
      {children}
    </section>
  )
}

function QuestionPicker({ questions, selected, onSelect }: {
  questions: NexusQuestionnaireItem[]
  selected: NexusQuestionnaireItem | null
  onSelect: (q: NexusQuestionnaireItem) => void
}) {
  const { t, i18n } = useTranslation()
  const [q, setQ] = useState('')

  // The seed keeps one `questionnaire_item` row per (year × entity × breakdown),
  // so the raw list has ~2000 rows for only ~350 unique disclosures. Dedupe by
  // (gri_code, line_item) for the picker — the assignment only needs the code.
  const uniqueQuestions = useMemo(() => {
    const seen = new Set<string>()
    const out: NexusQuestionnaireItem[] = []
    for (const x of questions) {
      const key = `${x.gri_code}|${x.line_item}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(x)
    }
    return out
  }, [questions])

  const filtered = useMemo(() => {
    if (!q) return uniqueQuestions.slice(0, 50)
    const s = q.toLowerCase()
    return uniqueQuestions.filter(x =>
      x.gri_code.toLowerCase().includes(s) ||
      x.line_item.toLowerCase().includes(s) ||
      itemLabel(x, i18n.language).toLowerCase().includes(s) ||
      x.section.toLowerCase().includes(s)
    ).slice(0, 50)
  }, [q, uniqueQuestions, i18n.language])

  return (
    <div>
      {selected ? (
        <div className="p-3 rounded-[var(--radius-md)] border border-[var(--color-brand)] bg-[var(--color-brand-soft)]/40">
          <div className="font-mono text-caption font-semibold text-[var(--color-brand-strong)]">{selected.gri_code}</div>
          <div className="text-small font-semibold text-[var(--text-primary)] mt-0.5">{itemLabel(selected, i18n.language)}</div>
          <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t(capitalLabelKey(selected.section), { defaultValue: selected.section })} · {t(subsectionLabelKey(selected.subsection), { defaultValue: selected.subsection })}</div>
          <button type="button" onClick={() => onSelect(null as unknown as NexusQuestionnaireItem)} className="mt-2 inline-flex h-8 items-center text-small font-medium text-[var(--color-brand)] hover:underline underline-offset-2">{t('assignments.picker.change')}</button>
        </div>
      ) : (
        <>
          <div className="relative mb-2">
            <Search className="pointer-events-none w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={t('assignments.picker.search')}
              aria-label={t('assignments.picker.search')}
              className={`${fieldCls} pl-9`}
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)]">
            {filtered.map(x => (
              <button
                key={x.id}
                type="button"
                onClick={() => onSelect(x)}
                className="w-full px-3 py-2 text-left hover:bg-[var(--bg-primary)] focus-visible:bg-[var(--bg-primary)] focus-visible:outline-none border-b border-[var(--border-subtle)] last:border-b-0"
              >
                <div className="font-mono text-caption font-semibold text-[var(--color-brand)]">{x.gri_code}</div>
                <div className="text-small font-medium text-[var(--text-primary)] truncate">{itemLabel(x, i18n.language)}</div>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-4 text-center text-small text-[var(--text-tertiary)]">{t('assignments.picker.noMatches')}</div>}
          </div>
        </>
      )}
    </div>
  )
}

function AssigneePicker({ entityId, members, entities, value, onChange }: {
  entityId: string
  members: OrgMember[]
  entities: OrgEntity[]
  value: string
  onChange: (id: string) => void
}) {
  const { t } = useTranslation()
  const inScope = useMemo(() => {
    const ids = new Set(orgStore.descendantIds(entities, entityId))
    const path = new Set(orgStore.pathOf(entities, entityId).map(p => p.id))
    return members.filter(m => ids.has(m.entityId) || path.has(m.entityId))
  }, [entityId, members, entities])

  if (inScope.length === 0) {
    return (
      <div className="p-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)] text-small text-[var(--text-secondary)]">
        <AlertCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
        <Trans i18nKey="assignments.picker.noMembers" components={{ b: <strong /> }} />
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={t('assignments.picker.selectAssignee')}
      className={fieldCls}
    >
      <option value="">{t('assignments.picker.selectAssignee')}</option>
      {inScope.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
    </select>
  )
}



// ─── Kanban view ────────────────────────────────────────────

/** `label` is an i18n key. */
const KANBAN_COLS: Array<{ status: QuestionAssignment['status']; label: string; color: string }> = [
  { status: 'not_started', label: 'workflowStatus.status.not_started', color: 'var(--status-neutral)' },
  { status: 'in_progress', label: 'workflowStatus.status.in_progress', color: 'var(--status-warning)' },
  { status: 'submitted',   label: 'workflowStatus.status.submitted',   color: 'var(--status-info)' },
  { status: 'reviewed',    label: 'workflowStatus.status.reviewed',    color: 'var(--status-info)' },
  { status: 'approved',    label: 'workflowStatus.status.approved',    color: 'var(--status-success)' },
  { status: 'rejected',    label: 'workflowStatus.status.rejected',    color: 'var(--status-danger)' },
]

function KanbanView({
  assignments, entityById, onRemove,
}: {
  assignments: QuestionAssignment[]
  entityById: Map<string, OrgEntity>
  onRemove: (id: string) => void
}) {
  const { t } = useTranslation()
  const grouped = useMemo(() => {
    const m = new Map<QuestionAssignment['status'], QuestionAssignment[]>()
    for (const c of KANBAN_COLS) m.set(c.status, [])
    for (const a of assignments) m.get(a.status)?.push(a)
    return m
  }, [assignments])

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
      {KANBAN_COLS.map((col, ci) => {
        const cards = grouped.get(col.status) ?? []
        return (
          <motion.div
            key={col.status}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.03 }}
            className="flex-shrink-0 w-[300px] surface-paper overflow-hidden flex flex-col max-h-[calc(100vh-280px)]"
          >
            <header className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2 flex-shrink-0 bg-[var(--bg-secondary)]">
              <span className="w-2 h-2 rounded-full" style={{ background: col.color }} aria-hidden />
              <span className="text-small font-semibold text-[var(--text-primary)]">{t(col.label)}</span>
              <span className="ml-auto text-caption font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-[var(--bg-primary)] text-[var(--text-secondary)]">{cards.length}</span>
            </header>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {cards.length === 0 ? (
                <div className="py-6 text-center text-caption text-[var(--text-tertiary)]">{t('assignments.kanban.emptyLane')}</div>
              ) : (
                cards.map((a, i) => <KanbanCard key={a.id} a={a} entity={entityById.get(a.entityId)} index={i} onRemove={() => onRemove(a.id)} />)
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function KanbanCard({ a, entity, index, onRemove }: {
  a: QuestionAssignment
  entity: OrgEntity | undefined
  index: number
  onRemove: () => void
}) {
  const { t, i18n } = useTranslation()
  const { date: fmtDate } = useFmt()
  const modes = a.entry_modes ?? ['Manual']
  const overdue = isOverdue(a)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.015 }}
      className="rounded-[8px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-3 hover:shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] transition-all group cursor-pointer relative"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-mono text-caption font-semibold text-[var(--color-brand)]">{a.gri_code}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove() }} aria-label={t('assignments.removeAria', { code: a.gri_code })} className="-m-1.5 w-8 h-8 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity inline-flex items-center justify-center">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-small font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">{itemLabel(a, i18n.language)}</div>
      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
        {entity && (
          <span className="inline-flex items-center gap-1 text-caption text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
            <Factory className="w-2.5 h-2.5" />{entity.name}
          </span>
        )}
        {a.response_type === 'narrative' && (
          <span className="inline-flex items-center gap-1 text-caption text-[var(--status-info)] bg-[var(--status-info-soft)] px-1.5 py-0.5 rounded font-semibold">
            <FileText className="w-2.5 h-2.5" />{t('assignments.drawer.narrative')}
          </span>
        )}
        {modes.length > 0 && modes[0] && (() => {
          const Icon = modes[0] === 'Manual' ? PencilLine : modes[0] === 'Calculator' ? CalcIcon : Plug
          return (
            <span className="inline-flex items-center gap-0.5 text-caption text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
              <Icon className="w-2.5 h-2.5" />{t(`assignments.mode.${modes[0]}`, { defaultValue: modes[0] })}
            </span>
          )
        })()}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold flex-shrink-0 bg-[var(--bg-inverse)] text-[var(--sidebar-accent)]" aria-hidden>
            {a.assigneeName.slice(0, 1).toUpperCase()}
          </div>
          <span className="text-caption text-[var(--text-secondary)] truncate font-medium">{a.assigneeName}</span>
        </div>
        {a.due_date && (
          <span className={`inline-flex items-center gap-1 text-caption tabular-nums whitespace-nowrap flex-shrink-0 font-medium ${overdue ? 'text-[var(--status-danger)]' : 'text-[var(--text-tertiary)]'}`}>
            <Calendar className="w-3 h-3" aria-hidden />
            {fmtDate(a.due_date, { style: 'short' })}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Tree view — by entity hierarchy (enterprise refresh) ───

const TREE_SPRING = { type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.7 }

function TreeView({
  assignments, entities, onRemove,
}: {
  assignments: QuestionAssignment[]
  entities: OrgEntity[]
  onRemove: (id: string) => void
}) {
  const { t } = useTranslation()
  const rootIds = entities.filter(e => !e.parentId).map(e => e.id)
  const byParent = useMemo(() => {
    const m = new Map<string | null, OrgEntity[]>()
    for (const e of entities) {
      const k = e.parentId ?? null
      const arr = m.get(k) ?? []
      arr.push(e)
      m.set(k, arr)
    }
    return m
  }, [entities])

  const byEntity = useMemo(() => {
    const m = new Map<string, QuestionAssignment[]>()
    for (const a of assignments) {
      const arr = m.get(a.entityId) ?? []
      arr.push(a)
      m.set(a.entityId, arr)
    }
    return m
  }, [assignments])

  if (rootIds.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)] py-14 text-center">
        <GitBranch className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-2" />
        <div className="text-body text-[var(--text-tertiary)]">{t('assignments.tree.empty')}</div>
      </div>
    )
  }

  return (
    <div className="surface-paper p-4 relative overflow-hidden">
      {/* ambient top-right wash */}
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-24 w-[360px] h-[360px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(4, 120, 87,0.06), transparent 60%)' }} />
      <div className="relative space-y-1">
        {rootIds.map((id, i) => (
          <TreeNode key={id} entityId={id} depth={0} byParent={byParent} byEntity={byEntity} entities={entities} onRemove={onRemove} index={i} />
        ))}
      </div>
    </div>
  )
}

/** Entity icon painted into a filled rounded square with tint matching the type. */
function EntityGlyph({ type }: { type: string }) {
  // Monochrome by design: hierarchy is carried by position, not by hue.
  const style = type === 'group'
    ? { fg: 'var(--sidebar-accent)', bg: 'var(--bg-inverse)' }
    : { fg: 'var(--text-secondary)', bg: 'var(--bg-tertiary)' }

  return (
    <div
      className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 relative" aria-hidden
      style={{ background: style.bg, color: style.fg }}
    >
      <Factory className="w-[15px] h-[15px]" />
    </div>
  )
}

/** Stacked distribution bar: green approved · blue review · amber open · red reject. */
function DistributionBar({
  approved, inReview, open, rejected, total,
}: { approved: number; inReview: number; open: number; rejected: number; total: number }) {
  const { t } = useTranslation()
  if (total === 0) {
    return (
      <div className="w-[160px] h-[6px] rounded-full bg-[var(--bg-tertiary)]/60 overflow-hidden" />
    )
  }
  const segs = [
    { pct: (approved / total) * 100,  color: 'var(--status-success)', title: t('assignments.counts.approved', { count: approved }) },
    { pct: (inReview / total) * 100,  color: 'var(--status-info)', title: t('assignments.counts.inReview', { count: inReview }) },
    { pct: (open / total) * 100,      color: 'var(--status-warning)', title: t('assignments.counts.open', { count: open }) },
    { pct: (rejected / total) * 100,  color: 'var(--status-danger)', title: t('assignments.counts.rejected', { count: rejected }) },
  ].filter(s => s.pct > 0)
  return (
    <div className="w-[160px] h-[6px] rounded-full bg-[var(--bg-tertiary)]/40 overflow-hidden flex" title={segs.map(s => s.title).join(' · ')}>
      {segs.map((s, i) => (
        <motion.div
          key={i}
          initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
          className="h-full"
          style={{ background: s.color, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15)` }}
        />
      ))}
    </div>
  )
}

function TreeNode({
  entityId, depth, byParent, byEntity, entities, onRemove, index,
}: {
  entityId: string
  depth: number
  byParent: Map<string | null, OrgEntity[]>
  byEntity: Map<string, QuestionAssignment[]>
  entities: OrgEntity[]
  onRemove: (id: string) => void
  index: number
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(depth < 2)
  const entity = entities.find(e => e.id === entityId)
  if (!entity) return null
  const children = byParent.get(entityId) ?? []
  const allIds = new Set(orgStore.descendantIds(entities, entityId))
  const allAssignments = Array.from(allIds).flatMap(id => byEntity.get(id) ?? [])
  const directAssignments = byEntity.get(entityId) ?? []
  const isExpandable = children.length > 0 || directAssignments.length > 0

  const bucket = {
    total: allAssignments.length,
    approved: allAssignments.filter(a => a.status === 'approved').length,
    inReview: allAssignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length,
    open:     allAssignments.filter(a => a.status === 'not_started' || a.status === 'in_progress').length,
    rejected: allAssignments.filter(a => a.status === 'rejected').length,
  }
  const pct = bucket.total === 0 ? 0 : Math.round((bucket.approved / bucket.total) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...TREE_SPRING, delay: Math.min(index * 0.02, 0.12) }}
      style={{ paddingLeft: depth === 0 ? 0 : 22 }}
      className="relative"
    >
      {/* indent guide */}
      {depth > 0 && (
        <span
          aria-hidden
          className="absolute left-[10px] top-0 bottom-0 w-px"
          style={{ background: 'linear-gradient(to bottom, var(--border-subtle) 0%, var(--border-subtle) 70%, transparent 100%)' }}
        />
      )}

      {/* row */}
      <motion.button
        type="button"
        whileHover={isExpandable ? { x: 1 } : undefined}
        onClick={() => isExpandable && setOpen(o => !o)}
        disabled={!isExpandable}
        className="w-full group relative flex items-center gap-3 pl-2 pr-3 py-2.5 rounded-[10px] text-left transition-colors hover:bg-[var(--bg-secondary)]"
      >
        {/* chevron */}
        <span className="w-5 flex justify-center flex-shrink-0">
          {isExpandable ? (
            <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </motion.span>
          ) : null}
        </span>

        <EntityGlyph type={entity.type as string} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-small font-semibold text-[var(--text-primary)] truncate">
              {entity.name}
            </span>
            <span
              className="text-caption font-medium px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] whitespace-nowrap"
            >
              {t(`assignments.entityType.${entity.type}`, { defaultValue: entity.type.replace('_', ' ') })}
            </span>
            {entity.country && (
              <span className="text-caption text-[var(--text-tertiary)]">
                · {entity.country}
              </span>
            )}
          </div>
          {bucket.total > 0 && (
            <div className="mt-1 flex items-center gap-2 text-caption text-[var(--text-tertiary)]">
              {bucket.approved > 0 && <span className="text-[var(--status-success)] font-semibold">{t('assignments.counts.approved', { count: bucket.approved })}</span>}
              {bucket.inReview > 0 && <span className="text-[var(--status-info)] font-semibold">{t('assignments.counts.inReview', { count: bucket.inReview })}</span>}
              {bucket.open > 0     && <span className="text-[var(--status-warning)] font-semibold">{t('assignments.counts.open', { count: bucket.open })}</span>}
              {bucket.rejected > 0 && <span className="text-[var(--status-danger)] font-semibold">{t('assignments.counts.rejected', { count: bucket.rejected })}</span>}
            </div>
          )}
        </div>

        {/* distribution + percentage */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <DistributionBar approved={bucket.approved} inReview={bucket.inReview} open={bucket.open} rejected={bucket.rejected} total={bucket.total} />
          <span
            className="text-small font-semibold tabular-nums w-10 text-right"
            style={{ color: pct === 100 ? 'var(--status-success)' : pct > 0 ? 'var(--text-primary)' : 'var(--text-quaternary)' }}
          >
            {pct}%
          </span>
          <span className="text-caption tabular-nums text-[var(--text-tertiary)] font-medium w-[62px] text-right">
            {bucket.approved}<span className="text-[var(--text-quaternary)]">/{bucket.total}</span>
          </span>
        </div>
      </motion.button>

      {/* children */}
      <AnimatePresence initial={false}>
        {open && isExpandable && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pt-1">
              {directAssignments.map((a, i) => (
                <TreeAssignmentRow key={a.id} a={a} depth={depth + 1} onRemove={() => onRemove(a.id)} index={i} />
              ))}
              {children.map((c, i) => (
                <TreeNode key={c.id} entityId={c.id} depth={depth + 1} byParent={byParent} byEntity={byEntity} entities={entities} onRemove={onRemove} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function TreeAssignmentRow({ a, depth, onRemove, index }: {
  a: QuestionAssignment
  depth: number
  onRemove: () => void
  index: number
}) {
  const { t, i18n } = useTranslation()
  const { date: fmtDate } = useFmt()
  const modes = a.entry_modes ?? ['Manual']
  const ModeIcon = MODE_ICON[modes[0] as Mode] ?? PencilLine
  const overdue = isOverdue(a)

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...TREE_SPRING, delay: Math.min(index * 0.015, 0.1) }}
      style={{ paddingLeft: depth * 22 + 12 }}
      className="relative"
    >
      {/* indent guide */}
      <span aria-hidden className="absolute left-[10px] top-0 bottom-0 w-px bg-[var(--border-subtle)]" />

      <div className="group relative flex items-center gap-3 pl-3 pr-2.5 py-2 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--bg-secondary)]">
        {/* code + line-item */}
        <div className="min-w-0 flex-1 grid grid-cols-[auto_1fr] gap-x-2.5 items-center">
          <span className="font-mono text-caption font-semibold text-[var(--color-brand)]">{a.gri_code}</span>
          <span className="text-small text-[var(--text-primary)] truncate font-medium">{itemLabel(a, i18n.language)}</span>
        </div>

        {/* mode chip */}
        <span className="hidden md:inline-flex items-center gap-1 px-1.5 h-6 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-caption text-[var(--text-tertiary)] font-medium flex-shrink-0 whitespace-nowrap">
          <ModeIcon className="w-3 h-3" aria-hidden />
          {t(`assignments.mode.${modes[0]}`, { defaultValue: modes[0] })}
        </span>

        {/* assignee */}
        <div className="hidden sm:inline-flex items-center gap-1.5 flex-shrink-0" title={a.assigneeEmail}>
          <span aria-hidden className="w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold bg-[var(--bg-inverse)] text-[var(--sidebar-accent)]">
            {a.assigneeName.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-caption text-[var(--text-secondary)] font-medium truncate max-w-[96px]">{a.assigneeName}</span>
        </div>

        <StatusPill status={a.status} size="sm" />

        {/* due date */}
        {a.due_date ? (
          <span className={`hidden sm:inline-flex items-center gap-1 text-caption tabular-nums whitespace-nowrap flex-shrink-0 min-w-[64px] justify-end font-medium ${overdue ? 'text-[var(--status-danger)]' : 'text-[var(--text-tertiary)]'}`}>
            <Calendar className="w-3 h-3" aria-hidden />
            {fmtDate(a.due_date, { style: 'short' })}
          </span>
        ) : (
          <span className="hidden sm:block min-w-[64px] flex-shrink-0" />
        )}

        <button
          onClick={onRemove}
          aria-label={t('assignments.removeAria', { code: a.gri_code })}
          className="w-8 h-8 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity inline-flex items-center justify-center flex-shrink-0"
          title={t('assignments.removeLabel')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Network view — force-directed org graph with glowing beams ──

interface NetworkNode {
  id: string
  name: string
  type: string
  depth: number
  x: number
  y: number
  radius: number
  childCount: number
  total: number
  approved: number
  inReview: number
  open: number
  rejected: number
}

function NetworkView({
  assignments, entities,
}: {
  assignments: QuestionAssignment[]
  entities: OrgEntity[]
}) {
  const { t } = useTranslation()
  const [hoverId, setHoverId] = useState<string | null>(null)

  const { nodes, edges, viewBox } = useMemo(() => {
    const byParent = new Map<string | null, OrgEntity[]>()
    for (const e of entities) {
      const k = e.parentId ?? null
      const arr = byParent.get(k) ?? []
      arr.push(e); byParent.set(k, arr)
    }
    const depthOf = new Map<string, number>()
    const walk = (id: string | null, d: number) => {
      for (const c of byParent.get(id) ?? []) { depthOf.set(c.id, d); walk(c.id, d + 1) }
    }
    walk(null, 0)

    const byDepth = new Map<number, OrgEntity[]>()
    for (const e of entities) {
      const d = depthOf.get(e.id) ?? 0
      const arr = byDepth.get(d) ?? []
      arr.push(e); byDepth.set(d, arr)
    }
    const maxDepth = Math.max(0, ...Array.from(byDepth.keys()))

    // Tight radial layout, smaller overall. 24px base node.
    const W = 960, H = 460
    const cx = W / 2, cy = H / 2
    const ringStep = 110
    const nodeR = 22  // small, restrained

    const nodesOut: NetworkNode[] = []
    for (let d = 0; d <= maxDepth; d++) {
      const items = byDepth.get(d) ?? []
      const radius = d === 0 ? 0 : ringStep * d
      const count = items.length
      items.forEach((e, i) => {
        let x = cx, y = cy
        if (d > 0) {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2
          x = cx + Math.cos(angle) * radius
          y = cy + Math.sin(angle) * radius
        }
        const subIds = new Set<string>([e.id])
        const fanOut = (id: string) => { for (const c of byParent.get(id) ?? []) { subIds.add(c.id); fanOut(c.id) } }
        fanOut(e.id)
        const mine = assignments.filter(a => subIds.has(a.entityId))
        nodesOut.push({
          id: e.id, name: e.name, type: e.type, depth: d, x, y,
          radius: d === 0 ? nodeR + 4 : nodeR,
          childCount: (byParent.get(e.id) ?? []).length,
          total: mine.length,
          approved: mine.filter(a => a.status === 'approved').length,
          inReview: mine.filter(a => a.status === 'submitted' || a.status === 'reviewed').length,
          open:     mine.filter(a => a.status === 'not_started' || a.status === 'in_progress').length,
          rejected: mine.filter(a => a.status === 'rejected').length,
        })
      })
    }

    const edgesOut: Array<{ from: NetworkNode; to: NetworkNode }> = []
    for (const e of entities) {
      if (!e.parentId) continue
      const from = nodesOut.find(n => n.id === e.parentId)
      const to = nodesOut.find(n => n.id === e.id)
      if (from && to) edgesOut.push({ from, to })
    }
    return { nodes: nodesOut, edges: edgesOut, viewBox: `0 0 ${W} ${H}` }
  }, [entities, assignments])

  if (nodes.length === 0) {
    return (
      <div className="surface-paper py-14 text-center">
        <NetworkIcon className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-2" />
        <div className="text-small text-[var(--text-tertiary)]">{t('assignments.network.empty')}</div>
      </div>
    )
  }

  const BRAND = 'var(--color-brand)'
  const hovered = hoverId ? nodes.find(n => n.id === hoverId) : null

  return (
    <div className="surface-paper relative overflow-hidden" style={{ minHeight: 520 }}>
      {/* chrome */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-caption text-[var(--text-tertiary)]">
          <NetworkIcon className="w-3.5 h-3.5" />
          <span className="font-medium">{t('assignments.view.network')}</span>
          <span className="text-[var(--text-quaternary)]">·</span>
          <span>{t('assignments.network.nodesLinks', { nodes: nodes.length, links: edges.length })}</span>
        </div>
        <div className="flex items-center gap-3 text-caption text-[var(--text-tertiary)]">
          <LegendItem label={t('assignments.entityType.group')} />
          <LegendItem label={t('assignments.network.bu')} />
          <LegendItem label={t('assignments.entityType.subsidiary')} />
          <LegendItem label={t('assignments.entityType.plant')} />
          <LegendItem label={t('assignments.entityType.office')} />
        </div>
      </div>

      <div className="relative">
        <svg viewBox={viewBox} className="w-full" style={{ height: 460, display: 'block', overflow: 'visible' }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgb(11 18 32)" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* edges — stop at node border, not centre, so lines don't poke through circles */}
          {edges.map((e, i) => {
            const dx = e.to.x - e.from.x
            const dy = e.to.y - e.from.y
            const len = Math.max(1, Math.sqrt(dx * dx + dy * dy))
            const ux = dx / len, uy = dy / len
            const x1 = e.from.x + ux * e.from.radius
            const y1 = e.from.y + uy * e.from.radius
            const x2 = e.to.x - ux * (e.to.radius + 4)  // +4 so arc doesn't overlap
            const y2 = e.to.y - uy * (e.to.radius + 4)
            const isHovered = hoverId === e.to.id || hoverId === e.from.id
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isHovered ? BRAND : 'var(--border-default)'}
                strokeWidth={isHovered ? 1.25 : 1}
                style={{ transition: 'all 180ms' }}
              />
            )
          })}

          {/* nodes + radial labels — all in the same SVG so they stay pixel-aligned */}
          {nodes.map((n, i) => {
            const W = 960, H = 460
            const cx = W / 2, cy = H / 2
            // Radial direction from centre → node. For the root itself, default to straight down.
            const vx = n.x - cx
            const vy = n.y - cy
            const mag = Math.sqrt(vx * vx + vy * vy)
            const ux = mag === 0 ? 0 : vx / mag
            const uy = mag === 0 ? 1 : vy / mag
            // Place the label outside the progress arc (node.radius + 4px arc + 14px gap)
            const labelDist = n.radius + 22
            const lx = n.x + ux * labelDist
            const ly = n.y + uy * labelDist
            // text-anchor based on horizontal position relative to centre; tolerance for "almost centre"
            const anchor: 'start' | 'middle' | 'end' =
              Math.abs(ux) < 0.35 ? 'middle' : ux > 0 ? 'start' : 'end'
            const label = n.name.length > 20 ? n.name.slice(0, 18) + '…' : n.name

            return (
              <g key={n.id}>
                <NetworkNodeSvg
                  node={n}
                  brand={BRAND}
                  hovered={hoverId === n.id}
                  onHover={setHoverId}
                  index={i}
                />
                {!n.depth ? null : (
                  <g style={{ pointerEvents: 'none' }}>
                    <text
                      x={lx}
                      y={ly}
                      textAnchor={anchor}
                      dominantBaseline="central"
                      fontSize={11}
                      fontWeight={600}
                      fill="var(--text-primary)"
                      style={{ letterSpacing: '-0.005em' }}
                    >
                      {label}
                    </text>
                    <text
                      x={lx}
                      y={ly + 12}
                      textAnchor={anchor}
                      dominantBaseline="central"
                      fontSize={10}
                      fill="var(--text-tertiary)"
                      style={{ fontFeatureSettings: '"tnum"' }}
                    >
                      {n.total === 0 ? t(`assignments.entityType.${n.type}`, { defaultValue: n.type.replace('_', ' ') }) : `${n.approved}/${n.total}`}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Root label — always centred below the root */}
          {(() => {
            const root = nodes.find(n => n.depth === 0)
            if (!root) return null
            return (
              <g style={{ pointerEvents: 'none' }}>
                <text
                  x={root.x}
                  y={root.y + root.radius + 18}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={700}
                  fill="var(--text-primary)"
                  style={{ letterSpacing: '-0.005em' }}
                >
                  {root.name.length > 22 ? root.name.slice(0, 20) + '…' : root.name}
                </text>
                <text
                  x={root.x}
                  y={root.y + root.radius + 32}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fill="var(--text-tertiary)"
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {root.total === 0 ? t('assignments.network.orgRoot') : `${root.approved}/${root.total}`}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>

      {/* hover tooltip — flat card under the SVG, not floating */}
      <div className="border-t border-[var(--border-subtle)] px-5 py-3 min-h-[56px] flex items-center">
        {hovered ? (
          <div className="flex items-center gap-5 flex-wrap">
            <div>
              <div className="text-small font-semibold text-[var(--text-primary)]">{hovered.name}</div>
              <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t(`assignments.entityType.${hovered.type}`, { defaultValue: hovered.type.replace('_', ' ') })}</div>
            </div>
            <span className="h-8 w-px bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-4 text-caption font-semibold tabular-nums">
              <span className="text-[var(--status-ok)]">{t('assignments.counts.approved', { count: hovered.approved })}</span>
              <span className="text-[var(--status-pending)]">{t('assignments.counts.review', { count: hovered.inReview })}</span>
              <span className="text-[var(--status-draft)]">{t('assignments.counts.open', { count: hovered.open })}</span>
              {hovered.rejected > 0 && <span className="text-[var(--status-reject)]">{t('assignments.counts.rejected', { count: hovered.rejected })}</span>}
            </div>
            <span className="h-8 w-px bg-[var(--border-subtle)]" />
            <div className="text-h3 font-semibold tabular-nums text-[var(--text-primary)]">
              {hovered.total === 0 ? '—' : Math.round((hovered.approved / hovered.total) * 100) + '%'}
            </div>
          </div>
        ) : (
          <div className="text-caption text-[var(--text-tertiary)]">{t('assignments.network.hoverHint')}</div>
        )}
      </div>
    </div>
  )
}

function LegendItem({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-quaternary)' }} />
      {label}
    </span>
  )
}

function NetworkNodeSvg({ node, brand, hovered, onHover, index }: {
  node: NetworkNode
  brand: string
  hovered: boolean
  onHover: (id: string | null) => void
  index: number
}) {
  const pct = node.total === 0 ? 0 : (node.approved / node.total)
  const ringR = node.radius + 4
  const circumference = 2 * Math.PI * ringR
  const isRoot = node.depth === 0

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* subtle hover ring */}
      {hovered && (
        <circle
          cx={node.x} cy={node.y}
          r={node.radius + 8}
          fill="none"
          stroke={brand}
          strokeOpacity="0.15"
          strokeWidth={8}
        />
      )}
      {/* body */}
      <circle
        cx={node.x} cy={node.y}
        r={node.radius}
        fill={isRoot ? brand : 'var(--bg-primary)'}
        stroke={isRoot ? brand : (hovered ? brand : 'var(--border-strong)')}
        strokeWidth={isRoot ? 0 : (hovered ? 1.5 : 1)}
        style={{ filter: 'url(#node-shadow)', transition: 'stroke 180ms, stroke-width 180ms' }}
      />
      {/* progress arc — thin, brand only */}
      {node.total > 0 && !isRoot && (
        <circle
          cx={node.x} cy={node.y}
          r={ringR}
          fill="none"
          stroke={brand}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray={`${pct * circumference} ${circumference}`}
          transform={`rotate(-90 ${node.x} ${node.y})`}
          opacity={0.85}
        />
      )}
      {/* centered % for root only — otherwise no text inside */}
      {isRoot && node.total > 0 && (
        <text
          x={node.x} y={node.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fontWeight={700}
          fill="white"
          style={{ pointerEvents: 'none', fontFeatureSettings: '"tnum"' }}
        >
          {Math.round((node.approved / node.total) * 100) + '%'}
        </text>
      )}
    </motion.g>
  )
}

// ── Bulk-assign modal ──────────────────────────────────────────────
function BulkAssignModal({
  frameworkId, entities, members, questions, onClose, onDone,
}: {
  frameworkId: string
  entities: OrgEntity[]
  members: OrgMember[]
  questions: NexusQuestionnaireItem[]
  onClose: () => void
  onDone: () => Promise<void> | void
}) {
  const { t } = useTranslation()
  const [entityId, setEntityId] = useState<string>('')
  const [assigneeMemberId, setAssigneeMemberId] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [sectionPicks, setSectionPicks] = useState<Set<string>>(new Set())
  const [reviewerEmail, setReviewerEmail] = useState<string>('')
  const [approverEmail, setApproverEmail] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null)

  // Distinct sections in the loaded questionnaire — gives the admin a quick
  // "all ESRS E1" style toggle without having to know GRI code prefixes.
  const allSections = useMemo(() => {
    const s = new Set<string>()
    for (const q of questions) if (q.section) s.add(q.section)
    return Array.from(s).sort()
  }, [questions])

  const matchedCount = useMemo(() => {
    if (sectionPicks.size === 0) return questions.length
    return questions.filter(q => q.section && sectionPicks.has(q.section)).length
  }, [questions, sectionPicks])

  const tooMany = matchedCount > 500

  const toggleSection = (s: string) => {
    setSectionPicks(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  }

  const memberById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])

  const submit = async () => {
    setErr(null)
    const m = memberById.get(assigneeMemberId)
    if (!m) { setErr(t('assignments.bulk.pickAssignee')); return }
    if (tooMany) { setErr(t('assignments.bulk.capError')); return }
    setSubmitting(true)
    try {
      const sections = Array.from(sectionPicks)
      const res = await orgStore.bulkAssign({
        framework_id: frameworkId,
        entity_id: entityId || undefined,
        filter: sections.length > 0 ? { sections } : undefined,
        assignee_email: m.email,
        assignee_name: m.name,
        due_date: dueDate || undefined,
        reviewer_email: reviewerEmail || undefined,
        approver_email: approverEmail || undefined,
      })
      setDone({ created: res.totalCreated, skipped: res.totalSkipped })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const labelCls = 'block text-small font-medium text-[var(--text-primary)] mb-1.5'
  return (
    <SideSheet
      open
      onClose={onClose}
      busy={submitting}
      width={520}
      title={t('assignments.bulk.title')}
      description={t('assignments.bulk.intro')}
      footer={done ? (
        <button onClick={() => void onDone()} className="btn-primary h-10">{t('common.close')}</button>
      ) : (
        <>
          <button onClick={onClose} className="btn-secondary h-10" disabled={submitting}>{t('common.cancel')}</button>
          <button onClick={submit} disabled={submitting || !assigneeMemberId || tooMany} className="btn-primary h-10">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Users className="w-4 h-4" aria-hidden />}
            {t('assignments.bulk.assign')}
          </button>
        </>
      )}
    >
      {done ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--status-success-line)] bg-[var(--status-success-soft)] p-4" role="status">
          <div className="flex items-center gap-2 text-small font-semibold text-[var(--status-success)]">
            <Check className="h-4 w-4" aria-hidden /> {t('assignments.bulk.done')}
          </div>
          <div className="text-small text-[var(--text-secondary)] mt-1">
            <Trans i18nKey="assignments.bulk.result" count={done.created} values={{ count: done.created, skipped: done.skipped }} components={{ b: <strong /> }} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className={labelCls}>{t('assignments.bulk.entity')}</span>
            <select value={entityId} onChange={e => setEntityId(e.target.value)} className={fieldCls}>
              <option value="">{t('assignments.bulk.orgRoot')}</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name}{e.code ? ` (${e.code})` : ''}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelCls}>{t('assignments.bulk.assignee')}</span>
            <select value={assigneeMemberId} onChange={e => setAssigneeMemberId(e.target.value)} className={fieldCls}>
              <option value="">{t('assignments.bulk.pickPerson')}</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} · {m.email}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelCls}>{t('assignments.bulk.dueDate')}</span>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={fieldCls} />
          </label>

          <fieldset>
            <legend className={labelCls}>{t('assignments.bulk.sections', { count: questions.length })}</legend>
            <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto p-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)]">
              {allSections.map(sec => {
                const on = sectionPicks.has(sec)
                return (
                  <button key={sec} type="button" aria-pressed={on} onClick={() => toggleSection(sec)} className={`chip h-8 px-3 ${on ? 'chip-active' : ''}`}>
                    {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                    {t(capitalLabelKey(sec), { defaultValue: sec })}
                  </button>
                )
              })}
              {allSections.length === 0 && (
                <span className="text-caption text-[var(--text-tertiary)]">{t('assignments.bulk.noSections')}</span>
              )}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>{t('assignments.bulk.reviewer')}</span>
              <input type="email" value={reviewerEmail} onChange={e => setReviewerEmail(e.target.value)} className={fieldCls} placeholder="reviewer@example.com" />
            </label>
            <label className="block">
              <span className={labelCls}>{t('assignments.bulk.approver')}</span>
              <input type="email" value={approverEmail} onChange={e => setApproverEmail(e.target.value)} className={fieldCls} placeholder="approver@example.com" />
            </label>
          </div>

          <div className={`p-3 rounded-[var(--radius-md)] text-small border ${tooMany ? 'bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-[var(--status-danger-line)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}`} aria-live="polite">
            <Trans i18nKey="assignments.bulk.matched" count={matchedCount} values={{ count: matchedCount }} components={{ b: <strong /> }} />
            {tooMany && t('assignments.bulk.capHint')}
          </div>

          {err && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] border border-[var(--status-danger-line)] bg-[var(--status-danger-soft)] text-small text-[var(--status-danger)]">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden /> {err}
            </div>
          )}
        </div>
      )}
    </SideSheet>
  )
}
