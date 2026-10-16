import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useFramework } from '../lib/frameworks'
import { orgStore, type QuestionAssignment, type ReportingPeriod } from '../lib/orgStore'
import { auditLog, type AuditExplorerEntry } from '../lib/api'
import { useOrgData } from '../lib/useOrgData'
import { nextAction as computeNextAction, isAssignmentOverdue, isOpenAssignment } from '../lib/journey'
import { resolvePermissions, hasPermission } from '../lib/rbac'
import { NumberTicker, Skeleton, StatLedger, type StatLedgerItem } from '../components/ui'
import NextActionHeader from '../components/mytasks/NextActionHeader'
import ReadinessHero, { type Readiness } from '../components/myday/ReadinessHero'
import ActivityTimeline from '../components/myday/ActivityTimeline'
import RegulatoryCalendarCard from '../components/myday/RegulatoryCalendar'
import QuickStartCard from '../components/QuickStartCard'
import { isSetupOwner } from '../components/onboarding/useSetupProgress'

const DAY_MS = 24 * 60 * 60 * 1000

type Async<T> = { data: T | null; error: unknown; loading: boolean }
const pending = <T,>(): Async<T> => ({ data: null, error: null, loading: true })

/** Run one request into an Async slot; never throws, never sets state after unmount. */
function settle<T>(set: (s: Async<T>) => void, p: Promise<T>, alive: () => boolean) {
  set(pending<T>())
  p.then(
    data => { if (alive()) set({ data, error: null, loading: false }) },
    error => { if (alive()) set({ data: null, error: error instanceof Error ? error : new Error(String(error)), loading: false }) },
  )
}

/**
 * My Day — the post-login home.
 *
 *   1. Hero: real reporting-period readiness (approved / total) + deadline.
 *   2. "Your next action" (from lib/journey — the same model My Tasks uses)
 *      beside a "Waiting on you" stack of queue counts.
 *   3. KPI ledger with sparklines.
 *   4. Recent activity timeline + regulatory calendar.
 *
 * Every region owns its loading / error / empty state; nothing claims "caught
 * up" until the data has actually loaded.
 */
export default function MyDay() {
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const firstName = user?.name?.split(' ')[0] || t('myDay.there')
  const perms = resolvePermissions(user)

  const org = useOrgData()
  const [mine, setMine] = useState<Async<QuestionAssignment[]>>(pending)
  const [periods, setPeriods] = useState<Async<ReportingPeriod[]>>(pending)
  const [progress, setProgress] = useState<Async<Array<{ framework_id: string; total: number; approved: number; in_review: number; open: number }>>>(pending)
  const [activity, setActivity] = useState<Async<AuditExplorerEntry[]>>(pending)
  const [anomalies, setAnomalies] = useState<Async<number>>(pending)
  const [chain, setChain] = useState<Async<{ verified: boolean; totalRecords?: number }>>(pending)
  const [skipIds, setSkipIds] = useState<Set<string>>(new Set())

  const loadMine = useCallback((alive: () => boolean = () => true) => settle(setMine, orgStore.myAssignments(), alive), [])
  const loadHero = useCallback((alive: () => boolean = () => true) => {
    settle(setPeriods, orgStore.listPeriods(), alive)
    settle(setProgress, orgStore.frameworkProgress(), alive)
  }, [])
  const loadActivity = useCallback((alive: () => boolean = () => true) =>
    settle(setActivity, auditLog.explore({ limit: 8, offset: 0 }).then(r => r.rows ?? []), alive), [])

  useEffect(() => {
    if (!user) return
    let alive = true
    const ok = () => alive
    loadMine(ok)
    loadHero(ok)
    loadActivity(ok)
    settle(setAnomalies, orgStore.anomalyScan('role', { limit: 1 }).then(r => r.summary?.critical ?? 0), ok)
    settle(setChain, (async () => {
      const token = localStorage.getItem('aeiforo_token')
      const r = await fetch('/api/blockchain?view=verify', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json() as { verified: boolean; totalRecords?: number }
    })(), ok)
    return () => { alive = false }
  }, [user, loadMine, loadHero, loadActivity])

  const now = Date.now()
  const greeting = (() => {
    const h = new Date().getHours()
    const g = h < 12 ? t('myDay.greeting.morning') : h < 18 ? t('myDay.greeting.afternoon') : t('myDay.greeting.evening')
    return t('myDay.greetingLine', { greeting: g, name: firstName })
  })()

  const mineFw = useMemo(() => mine.data?.filter(a => a.framework_id === framework.id) ?? null, [mine.data, framework.id])
  const allFw = useMemo(() => org.data?.assignments.filter(a => a.framework_id === framework.id) ?? null, [org.data, framework.id])

  // ── Hero: active period + readiness ────────────────────────────────
  const period = useMemo(() => {
    const list = (periods.data ?? []).filter(p => p.framework_id === framework.id && p.status !== 'archived')
    const rank = (p: ReportingPeriod) => (p.status === 'active' ? 0 : p.status === 'setup' ? 1 : p.status === 'locked' ? 2 : 3)
    return [...list].sort((a, b) => rank(a) - rank(b) || b.year - a.year)[0] ?? null
  }, [periods.data, framework.id])

  const readiness: Readiness | null = useMemo(() => {
    const row = progress.data?.find(r => r.framework_id === framework.id)
    if (row) return { total: row.total, approved: row.approved, inReview: row.in_review, open: row.open }
    if (allFw) {
      const approved = allFw.filter(a => a.status === 'approved').length
      const inReview = allFw.filter(a => a.status === 'submitted' || a.status === 'reviewed').length
      return { total: allFw.length, approved, inReview, open: allFw.length - approved - inReview }
    }
    return null
  }, [progress.data, allFw, framework.id])

  const heroLoading = periods.loading || (progress.loading && org.loading)
  const heroError = periods.error && !readiness ? periods.error : null
  const daysToDeadline = period?.submission_deadline
    ? Math.ceil((new Date(period.submission_deadline + 'T23:59:59').getTime() - now) / DAY_MS)
    : null
  const myOverdue = mineFw ? mineFw.filter(a => isOpenAssignment(a) && isAssignmentOverdue(a, now)).length : null

  // ── Next action (single source: lib/journey) ───────────────────────
  const action = useMemo(() => {
    if (!mineFw) return null
    const input = { all: allFw, org: org.data ?? null }
    const full = computeNextAction(user, { mine: mineFw, ...input })
    if (skipIds.size === 0 || !full.assignment) return full
    const alt = computeNextAction(user, { mine: mineFw.filter(a => !skipIds.has(a.id)), ...input })
    return alt.assignment ? { ...full, kind: alt.kind, assignment: alt.assignment } : full
  }, [user, mineFw, allFw, org.data, skipIds])

  const entityName = useCallback((a: QuestionAssignment) => org.data?.entities.find(e => e.id === a.entityId)?.name, [org.data])

  // ── Ledger ──────────────────────────────────────────────────────────
  const ledger: StatLedgerItem[] = useMemo(() => {
    const all = allFw ?? []
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
    const approvedOn = (from: number, to: number) => all.filter(a => {
      if (a.status !== 'approved' || !a.last_updated) return false
      const ts = new Date(a.last_updated).getTime()
      return ts >= from && ts < to
    }).length
    // Daily approvals for the last 7 days (oldest → today): the real series behind the figure.
    const spark = Array.from({ length: 7 }, (_, i) => {
      const from = dayStart.getTime() - (6 - i) * DAY_MS
      return approvedOn(from, from + DAY_MS)
    })
    const weekFrom = dayStart.getTime() - 6 * DAY_MS
    const thisWeek = approvedOn(weekFrom, dayStart.getTime() + DAY_MS)
    const lastWeek = approvedOn(weekFrom - 7 * DAY_MS, weekFrom)
    const open = all.filter(isOpenAssignment)
    const openOverdue = open.filter(a => isAssignmentOverdue(a, now)).length
    const chainTotal = chain.data?.totalRecords
    // An empty chain (or a response without a verdict) is "no anchors yet", never "Broken".
    const chainEmpty = chainTotal === 0 || typeof chain.data?.verified !== 'boolean'

    return [
      {
        id: 'open', label: t('myDay.kpi.open'), value: org.error ? '—' : open.length, tone: openOverdue > 0 ? 'warning' : 'neutral',
        loading: org.loading && !org.data,
        hint: org.error ? t('myDay.warn.all') : openOverdue > 0 ? t('myDay.kpi.overdueHint', { count: openOverdue }) : undefined,
        to: '/my-tasks',
      },
      {
        id: 'approved', label: t('myDay.kpi.approvedWeek'), value: org.error ? '—' : thisWeek, tone: 'success',
        hint: org.error ? t('myDay.warn.all') : undefined,
        loading: org.loading && !org.data,
        spark: spark.some(n => n > 0) ? spark : undefined,
        delta: org.data ? { value: thisWeek - lastWeek, goodWhen: 'up', label: t('myDay.kpi.vsLastWeek') } : undefined,
      },
      {
        id: 'anomalies', label: t('myDay.kpi.critical'),
        value: anomalies.error ? '—' : anomalies.data,
        tone: anomalies.data ? 'danger' : 'neutral',
        loading: anomalies.loading,
        hint: anomalies.error ? t('myDay.warn.anomalies') : undefined,
        to: '/analytics/anomalies',
      },
      {
        id: 'chain', label: t('myDay.kpi.hashChain'),
        value: chain.error ? '—'
          : chain.data == null ? null
          : chainEmpty ? t('myDay.kpi.noAnchors')
          : chain.data.verified ? t('myDay.kpi.verified') : t('myDay.kpi.broken'),
        tone: chain.error || chainEmpty ? 'neutral' : chain.data?.verified ? 'success' : chain.data ? 'danger' : 'neutral',
        loading: chain.loading,
        hint: chain.error ? t('myDay.warn.hash') : chainTotal ? t('myDay.kpi.records', { count: chainTotal }) : undefined,
      },
    ]
  }, [allFw, org.loading, org.data, org.error, anomalies, chain, t, now])

  const canManagePeriods = hasPermission(perms, 'admin.assignments')

  return (
    <div className="max-w-6xl mx-auto py-1 space-y-6 sm:space-y-8">
      <ReadinessHero
        greeting={greeting}
        frameworkCode={framework.code}
        loading={heroLoading}
        error={heroError}
        onRetry={() => { loadHero(); void org.reload() }}
        period={period}
        readiness={readiness}
        daysToDeadline={daysToDeadline}
        overdue={myOverdue}
        canManagePeriods={canManagePeriods}
      />

      {/* The one setup card — hides itself once every setup step is done, on error, or when dismissed. */}
      {isSetupOwner(user) && <QuickStartCard />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-8 min-w-0">
          <NextActionHeader
            className="h-full"
            loading={mine.loading || (org.loading && !org.data)}
            error={mine.error}
            onRetry={() => loadMine()}
            action={action}
            stages={[]}
            entityName={entityName}
            onOpenTask={(a) => navigate(`/my-tasks?open=${encodeURIComponent(a.id)}`)}
            onSkip={() => action?.assignment && setSkipIds(s => { const n = new Set(s); n.add(action.assignment!.id); return n })}
            onSeeApproved={() => navigate('/my-tasks')}
            onShowSubmitted={() => navigate('/my-tasks')}
          />
        </div>
        <WaitingOnYou
          className="lg:col-span-4"
          loading={mine.loading || (org.loading && !org.data)}
          mineOpen={action?.openCount ?? null}
          returned={action?.returnedCount ?? 0}
          review={hasPermission(perms, 'workflow.review') ? (action?.reviewCount ?? (allFw ? allFw.filter(a => a.status === 'submitted').length : -1)) : null}
          approval={hasPermission(perms, 'workflow.approve') ? (action?.approvalCount ?? (allFw ? allFw.filter(a => a.status === 'reviewed').length : -1)) : null}
          queueError={!!org.error}
        />
      </div>

      <StatLedger items={ledger} aria-label={t('myDay.kpi.aria')} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        <ActivityTimeline
          className="lg:col-span-7"
          entries={activity.data}
          loading={activity.loading}
          error={activity.error}
          onRetry={() => loadActivity()}
        />
        <RegulatoryCalendarCard className="lg:col-span-5" />
      </div>
    </div>
  )
}

/** Compact counts of work blocked on the viewer. Rows the user has no permission for are omitted. */
function WaitingOnYou({
  loading, mineOpen, returned, review, approval, queueError, className = '',
}: {
  loading: boolean
  mineOpen: number | null
  returned: number
  review: number | null
  approval: number | null
  queueError: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const rows: { id: string; label: string; hint?: string; value: number | null; to: string; tone?: 'danger' }[] = [
    { id: 'mine', label: t('myDay.waiting.mine'), hint: returned > 0 ? t('myDay.waiting.returned', { count: returned }) : undefined, value: mineOpen, to: '/my-tasks', tone: returned > 0 ? 'danger' : undefined },
  ]
  // -1 = permitted but the count is unknown (failed load) → shown as "—".
  if (review != null) rows.push({ id: 'review', label: t('myDay.waiting.review'), value: queueError || review < 0 ? null : review, to: '/work/review' })
  if (approval != null) rows.push({ id: 'approval', label: t('myDay.waiting.approval'), value: queueError || approval < 0 ? null : approval, to: '/work/approval' })

  return (
    <section aria-labelledby="waiting-title" className={`surface-paper p-2 min-w-0 flex flex-col ${className}`}>
      <h2 id="waiting-title" className="px-3 pt-3 pb-1 text-caption font-semibold text-[var(--text-tertiary)]">
        {t('myDay.waiting.title')}
      </h2>
      <ul className="flex-1 flex flex-col">
        {rows.map(r => (
          <li key={r.id} className="flex-1">
            <Link
              to={r.to}
              className="group h-full min-h-[64px] flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] active:scale-[0.99] transition-[background-color,transform] duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
            >
              <span className="w-12 flex-shrink-0">
                {loading ? (
                  <Skeleton className="h-7 w-9" rounded="md" />
                ) : r.value == null ? (
                  <span className="type-figure text-[28px] leading-none text-[var(--text-tertiary)]" title={t('myDay.warn.all')}>—</span>
                ) : (
                  <NumberTicker value={r.value} className={`type-figure text-[28px] ${r.value > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`} />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block type-small font-medium text-[var(--text-primary)]">{r.label}</span>
                {r.hint && !loading && (
                  <span className={`block text-caption ${r.tone === 'danger' ? 'text-[var(--status-danger)]' : 'text-[var(--text-tertiary)]'}`}>{r.hint}</span>
                )}
              </span>
              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-transform duration-fast" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
