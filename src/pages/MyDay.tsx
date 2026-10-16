import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  ArrowRight, Calendar as CalendarIcon, CheckCircle2, Clock,
  AlertTriangle, Inbox, ShieldCheck, Activity as ActivityIcon, Sparkles,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useFramework } from '../lib/frameworks'
import { orgStore, type QuestionAssignment } from '../lib/orgStore'
import { auditLog, type AuditExplorerEntry } from '../lib/api'
import { FadeIn, Stagger, StaggerItem } from '../components/MotionPrimitives'
import { Skeleton, SkeletonText } from '../components/Skeleton'
import { itemLabel } from '../lib/itemLabel'
import {
  EmptyTasksIllustration,
  EmptyInboxIllustration,
} from '../data/illustrations'

/**
 * MyDay — the post-login home. Hero greeting + Q close indicator,
 * three-card hero grid (Due today · Review queue · Suggested next),
 * KPI strip and an activity feed. Stagger reveals + skeleton placeholders.
 */
export default function MyDay() {
  const { user } = useAuth()
  const { active: framework } = useFramework()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const firstName = user?.name?.split(' ')[0] || t('myDay.there')

  const [mine, setMine] = useState<QuestionAssignment[] | null>(null)
  const [all, setAll] = useState<QuestionAssignment[] | null>(null)
  const [activity, setActivity] = useState<AuditExplorerEntry[] | null>(null)
  const [criticalAnomalies, setCriticalAnomalies] = useState<number | null>(null)
  const [hashOk, setHashOk] = useState<boolean | null>(null)
  // Per-card warning surfaces — when an individual fetch fails the page still
  // renders, the failing card just shows a small "couldn't load" chip
  // instead of pretending the data is zero/empty.
  const [warnings, setWarnings] = useState<{ mine?: string; all?: string; activity?: string; anomalies?: string; hash?: string }>({})

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void (async () => {
      const [mineRes, allRes, activityRes, anomaliesRes, hashRes] = await Promise.allSettled([
        orgStore.myAssignments(),
        orgStore.listAssignments(),
        auditLog.explore({ limit: 10, offset: 0 }),
        orgStore.anomalyScan('role', { limit: 1 }),
        (() => {
          const t = localStorage.getItem('aeiforo_token')
          const headers: Record<string, string> = t ? { Authorization: `Bearer ${t}` } : {}
          return fetch('/api/blockchain?view=verify', { headers })
            .then(r => (r.ok ? r.json() as Promise<{ verified?: boolean }> : null))
        })(),
      ])
      if (cancelled) return
      const nextWarnings: { mine?: string; all?: string; activity?: string; anomalies?: string; hash?: string } = {}
      if (mineRes.status === 'fulfilled') setMine(mineRes.value.filter(a => a.framework_id === framework.id))
      else { setMine([]); nextWarnings.mine = errMsg(mineRes.reason, t('myDay.warn.mine')) }
      if (allRes.status === 'fulfilled') setAll(allRes.value.filter(a => a.framework_id === framework.id))
      else { setAll([]); nextWarnings.all = errMsg(allRes.reason, t('myDay.warn.all')) }
      if (activityRes.status === 'fulfilled') setActivity(activityRes.value.rows)
      else { setActivity([]); nextWarnings.activity = errMsg(activityRes.reason, t('myDay.warn.activity')) }
      if (anomaliesRes.status === 'fulfilled') setCriticalAnomalies(anomaliesRes.value.summary?.critical ?? 0)
      else { setCriticalAnomalies(0); nextWarnings.anomalies = errMsg(anomaliesRes.reason, t('myDay.warn.anomalies')) }
      if (hashRes.status === 'fulfilled' && hashRes.value) setHashOk(!!hashRes.value.verified)
      else { setHashOk(null); if (hashRes.status === 'rejected') nextWarnings.hash = errMsg(hashRes.reason, t('myDay.warn.hash')) }
      setWarnings(nextWarnings)
    })()
    return () => { cancelled = true }
  }, [user, framework.id])

  const now = Date.now()
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return t('myDay.greeting.morning')
    if (h < 18) return t('myDay.greeting.afternoon')
    return t('myDay.greeting.evening')
  })()

  const dueToday = useMemo(() => {
    if (!mine) return []
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const cutoff = todayEnd.getTime() + 24 * 60 * 60 * 1000
    return mine
      .filter(a => a.due_date && (a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected'))
      .filter(a => new Date(a.due_date as string).getTime() <= cutoff)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  }, [mine])

  const reviewQueue = useMemo(() => {
    if (!all) return []
    return all
      .filter(a => a.status === 'submitted' || a.status === 'reviewed')
      .sort((a, b) => (b.last_updated ?? '').localeCompare(a.last_updated ?? ''))
  }, [all])

  // Suggested next — most overdue + highest-impact draft (overdue beats stale).
  const suggested = useMemo(() => {
    if (!mine) return null
    const open = mine.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected')
    if (open.length === 0) return null
    const scored = open.map(a => {
      const overdueDays = a.due_date ? Math.max(0, Math.floor((now - new Date(a.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 0
      const staleDays = a.last_updated ? Math.floor((now - new Date(a.last_updated).getTime()) / (1000 * 60 * 60 * 24)) : 30
      return { a, score: overdueDays * 10 + staleDays }
    }).sort((x, y) => y.score - x.score)
    return scored[0]?.a ?? null
  }, [mine, now])

  const suggestedReasoning = useMemo(() => {
    if (!suggested) return ''
    const overdueDays = suggested.due_date
      ? Math.max(0, Math.floor((now - new Date(suggested.due_date).getTime()) / (1000 * 60 * 60 * 24)))
      : 0
    if (overdueDays > 0) {
      return t('myDay.suggested.overdue', { code: suggested.gri_code ?? t('myDay.suggested.disclosure'), framework: framework.code, count: overdueDays })
    }
    if (suggested.status === 'rejected') {
      return t('myDay.suggested.rejected', { code: suggested.gri_code ?? t('myDay.suggested.disclosure') })
    }
    return t('myDay.suggested.default')
  }, [suggested, framework.code, now, t])

  const kpi = useMemo(() => {
    if (!all) return { open: 0, approvedThisWeek: 0 }
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    return {
      open: all.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected').length,
      approvedThisWeek: all.filter(a => a.status === 'approved' && a.last_updated && new Date(a.last_updated).getTime() > weekAgo).length,
    }
  }, [all, now])

  const loading = mine === null || all === null

  // Quarter progress — coarse heuristic: % through current calendar quarter.
  const quarterStatus = useMemo(() => {
    const d = new Date()
    const q = Math.floor(d.getMonth() / 3)
    const qEnd = new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59)
    const qStart = new Date(d.getFullYear(), q * 3, 1)
    const total = qEnd.getTime() - qStart.getTime()
    const elapsed = d.getTime() - qStart.getTime()
    const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
    const daysLeft = Math.max(0, Math.ceil((qEnd.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)))
    return { pct, daysLeft, label: t('myDay.quarterLabel', { q: q + 1 }) }
  }, [t])

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-2">
      {/* Hero greeting */}
      <FadeIn>
        <header className="space-y-3">
          <h1 className="h-display text-[var(--text-primary)]">
            {t('myDay.greetingLine', { greeting, name: firstName })}
          </h1>
          <div className="flex items-center gap-3 text-[13px] text-[var(--text-tertiary)]">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>
              <strong className="font-semibold text-[var(--text-secondary)]">{quarterStatus.label}</strong>
              <span className="mx-2">·</span>
              <span>{t('myDay.daysRemaining', { count: quarterStatus.daysLeft })}</span>
            </span>
          </div>
          {/* Quarter progress bar */}
          <div className="h-1 w-full max-w-md rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-strong)] transition-all duration-500"
              style={{ width: `${quarterStatus.pct}%` }}
              aria-label={t('myDay.periodElapsed', { pct: quarterStatus.pct })}
            />
          </div>
        </header>
      </FadeIn>

      {/* Three primary cards — stack on phone, side-by-side at lg. Smaller
          gap on mobile so the cards don't push the fold too far down. */}
      <Stagger staggerMs={80} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <StaggerItem>
          <DueTodayCard
            loading={loading}
            items={dueToday.slice(0, 5)}
            onStart={(qid) => navigate(`/data/entry/${qid}`)}
            onSeeAll={() => navigate('/my-tasks')}
            now={now}
            warning={warnings.mine}
          />
        </StaggerItem>
        <StaggerItem>
          <ReviewQueueCard
            loading={loading}
            items={reviewQueue.slice(0, 5)}
            onOpen={() => navigate('/work/review')}
            warning={warnings.all}
          />
        </StaggerItem>
        <StaggerItem>
          <SuggestedNextCard
            loading={loading}
            item={suggested}
            reasoning={suggestedReasoning}
            onOpen={() => suggested && navigate(`/data/entry/${suggested.questionId}`)}
            warning={warnings.mine}
          />
        </StaggerItem>
      </Stagger>

      {/* KPI strip — divider above and below */}
      <div className="border-t border-b border-[var(--border-subtle)] py-4">
        <section
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          aria-label={t('myDay.kpi.aria')}
        >
          <Kpi label={t('myDay.kpi.open')} value={loading ? '—' : String(kpi.open)} />
          <Kpi label={t('myDay.kpi.approvedWeek')} value={loading ? '—' : String(kpi.approvedThisWeek)} />
          <Kpi
            label={t('myDay.kpi.critical')}
            value={criticalAnomalies == null ? '—' : criticalAnomalies > 0 ? String(criticalAnomalies) : '0'}
            tone={criticalAnomalies && criticalAnomalies > 0 ? 'warn' : 'ok'}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
          />
          <Kpi
            label={t('myDay.kpi.hashChain')}
            value={hashOk == null ? '—' : hashOk ? t('myDay.kpi.verified') : t('myDay.kpi.broken')}
            tone={hashOk === false ? 'warn' : 'ok'}
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
          />
        </section>
      </div>

      {/* Activity feed */}
      <section>
        {warnings.activity && (
          <div className="mb-3">
            <WarningChip text={warnings.activity} />
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-[var(--text-tertiary)]" />
            <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
              {t('myDay.recentActivity')}
            </h2>
          </div>
          <button
            onClick={() => navigate('/admin/audit')}
            className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1"
          >
            {t('myDay.viewAll')} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <ActivityFeed loading={activity === null} entries={activity ?? []} />
      </section>
    </div>
  )
}

// ─── Cards ──────────────────────────────────────────────────

function HeroCard({
  eyebrow, tone = 'default', children,
}: {
  eyebrow: string
  tone?: 'default' | 'ok' | 'attention'
  children: React.ReactNode
}) {
  const accent = tone === 'attention'
    ? 'border-[var(--accent-amber-light)]'
    : 'border-[var(--border-subtle)]'
  return (
    <article
      className={`card-premium ${accent} flex flex-col min-h-[280px] transition-all duration-250 hover:border-emerald-400/30 hover:shadow-[0_4px_20px_rgba(16,185,129,0.06)]`}
    >
      <div className="text-micro uppercase tracking-[0.14em] font-semibold text-[var(--text-tertiary)] mb-2.5">
        {eyebrow}
      </div>
      {children}
    </article>
  )
}

/**
 * Inline non-blocking warning. Shown at the top of a card when that card's
 * data fetch failed but the page-level surface still renders. Keeps the
 * visual hierarchy intact — the user sees what loaded plus a small chip
 * explaining what didn't.
 */
function WarningChip({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="mb-3 flex items-start gap-1.5 px-2 py-1.5 rounded-[8px] bg-amber-500/10 border border-amber-500/30 text-caption text-amber-400"
    >
      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
      <span className="break-words">{text}</span>
    </div>
  )
}

function HeroCardSkeleton({ eyebrow }: { eyebrow: string }) {
  return (
    <article className="card-premium border-[var(--border-subtle)] flex flex-col min-h-[280px]">
      <div className="text-micro uppercase tracking-[0.14em] font-semibold text-[var(--text-tertiary)] mb-2.5">
        {eyebrow}
      </div>
      <Skeleton className="h-6 w-3/4 mb-5" />
      <SkeletonText lines={3} />
      <div className="mt-auto pt-5">
        <Skeleton className="h-4 w-24" />
      </div>
    </article>
  )
}

function DueTodayCard({
  loading, items, onStart, onSeeAll, now, warning,
}: {
  loading: boolean
  items: QuestionAssignment[]
  onStart: (qid: string) => void
  onSeeAll: () => void
  now: number
  warning?: string
}) {
  const { t, i18n } = useTranslation()
  if (loading) return <HeroCardSkeleton eyebrow={t('myDay.dueToday.eyebrow')} />
  if (items.length === 0) {
    return (
      <HeroCard eyebrow={t('myDay.dueToday.eyebrow')} tone="ok">
        {warning && <WarningChip text={warning} />}
        <div className="flex flex-col items-center text-center py-2">
          <EmptyTasksIllustration className="w-24 h-24 text-[var(--color-brand)] opacity-80 mb-3" />
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-1">
            {warning ? t('myDay.dueToday.noneShown') : t('myDay.dueToday.nothing')}
          </h2>
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            {warning ? t('myDay.dueToday.tryRefresh') : t('myDay.dueToday.quiet')}
          </p>
        </div>
      </HeroCard>
    )
  }
  return (
    <HeroCard eyebrow={t('myDay.dueToday.eyebrow')} tone="attention">
      {warning && <WarningChip text={warning} />}
      <h2 className="font-display text-[19px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-5">
        {t('myDay.dueToday.needValues', { count: items.length })}
      </h2>
      <ul className="space-y-3 flex-1">
        {items.slice(0, 4).map(a => {
          const overdue = a.due_date && new Date(a.due_date).getTime() < now
          return (
            <li key={a.id} className="flex items-start justify-between gap-3 text-[13px]">
              <div className="min-w-0 flex-1">
                <div className="text-[var(--text-primary)] font-medium truncate">
                  <span className="font-mono text-caption text-[var(--text-tertiary)] mr-1.5">{a.gri_code}</span>
                  {itemLabel(a, i18n.language)}
                </div>
                <div className="text-caption text-[var(--text-tertiary)] mt-0.5">
                  {overdue ? (
                    <span className="text-[var(--status-reject)]">{t('myDay.dueToday.overdue')} · {a.due_date && relativeDays(a.due_date, t)}</span>
                  ) : (
                    <span>{t('myDay.dueToday.due', { date: a.due_date ? new Date(a.due_date).toLocaleDateString(i18n.language?.startsWith('zh') ? 'zh-CN' : undefined, { month: 'short', day: 'numeric' }) : t('myDay.dueToday.soon') })}</span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <CardFooter>
        <button
          onClick={() => {
            const first = items[0]
            if (first) onStart(first.questionId)
            else onSeeAll()
          }}
          className="text-[12.5px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1.5"
        >
          {t('myDay.dueToday.startNext')} <ArrowRight className="w-3 h-3" />
        </button>
      </CardFooter>
    </HeroCard>
  )
}

function ReviewQueueCard({
  loading, items, onOpen, warning,
}: {
  loading: boolean
  items: QuestionAssignment[]
  onOpen: () => void
  warning?: string
}) {
  const { t, i18n } = useTranslation()
  if (loading) return <HeroCardSkeleton eyebrow={t('myDay.review.eyebrow')} />
  if (items.length === 0) {
    return (
      <HeroCard eyebrow={t('myDay.review.eyebrow')} tone="ok">
        {warning && <WarningChip text={warning} />}
        <div className="flex flex-col items-center text-center py-2">
          <EmptyInboxIllustration className="w-24 h-24 text-[var(--color-brand)] opacity-80 mb-3" />
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-1">
            {t('myDay.review.nothing')}
          </h2>
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            {t('myDay.review.inboxZero')}
          </p>
        </div>
      </HeroCard>
    )
  }
  return (
    <HeroCard eyebrow={t('myDay.review.eyebrow')} tone="attention">
      {warning && <WarningChip text={warning} />}
      <h2 className="font-display text-[19px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-5">
        {t('myDay.review.awaiting', { count: items.length })}
      </h2>
      <ul className="space-y-3 flex-1">
        {items.slice(0, 5).map(a => (
          <li key={a.id} className="flex items-start gap-3 text-[13px]">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-[var(--text-tertiary)] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[var(--text-primary)] font-medium truncate">
                <span className="font-mono text-caption text-[var(--text-tertiary)] mr-1.5">{a.gri_code}</span>
                {itemLabel(a, i18n.language)}
              </div>
              <div className="text-caption text-[var(--text-tertiary)] mt-0.5 truncate">
                {a.assigneeName ?? t('myDay.review.unassigned')}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <CardFooter>
        <button
          onClick={onOpen}
          className="text-[12.5px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1.5"
        >
          {t('myDay.review.openQueue')} <ArrowRight className="w-3 h-3" />
        </button>
      </CardFooter>
    </HeroCard>
  )
}

function SuggestedNextCard({
  loading, item, reasoning, onOpen, warning,
}: {
  loading: boolean
  item: QuestionAssignment | null
  reasoning: string
  onOpen: () => void
  warning?: string
}) {
  const { t, i18n } = useTranslation()
  if (loading) return <HeroCardSkeleton eyebrow={t('myDay.suggested.eyebrow')} />
  if (!item) {
    return (
      <HeroCard eyebrow={t('myDay.suggested.eyebrow')} tone="ok">
        {warning && <WarningChip text={warning} />}
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-14 h-14 rounded-full bg-[var(--color-brand-soft)] flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-[var(--color-brand)]" />
          </div>
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-1">
            {t('myDay.suggested.caughtUp')}
          </h2>
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            {t('myDay.suggested.nothingStale')}
          </p>
        </div>
      </HeroCard>
    )
  }
  return (
    <HeroCard eyebrow={t('myDay.suggested.eyebrow')}>
      <h2 className="font-display text-[18px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-1.5 line-clamp-2">
        {itemLabel(item, i18n.language)}
      </h2>
      <div className="font-mono text-caption text-[var(--text-tertiary)] mb-4">{item.gri_code}</div>
      <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed flex-1">
        {reasoning}
      </p>
      <div className="pt-5 mt-5 border-t border-[var(--border-subtle)]">
        <button
          onClick={onOpen}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[13px] font-semibold hover:bg-[var(--btn-primary-bg-hover)] transition-colors"
        >
          {t('myDay.suggested.openInEditor')} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </HeroCard>
  )
}

// ─── Primitives ─────────────────────────────────────────────

function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="pt-5 mt-5 border-t border-[var(--border-subtle)]">{children}</div>
}

function Kpi({
  label, value, tone = 'default', icon,
}: {
  label: string
  value: string
  tone?: 'default' | 'ok' | 'warn'
  icon?: React.ReactNode
}) {
  const color = tone === 'warn'
    ? 'text-[var(--status-draft)]'
    : tone === 'ok'
      ? 'text-[var(--status-ok)]'
      : 'text-[var(--text-primary)]'
  return (
    <div className="card-premium !p-4 !rounded-[10px]">
      <div className="text-micro uppercase tracking-[0.14em] font-semibold text-[var(--text-tertiary)] mb-1.5">
        {label}
      </div>
      <div className={`text-[22px] font-semibold tabular-nums tracking-[-0.01em] inline-flex items-center gap-1.5 ${color}`}>
        {icon}
        {value}
      </div>
    </div>
  )
}

function ActivityFeed({
  loading, entries,
}: {
  loading: boolean
  entries: AuditExplorerEntry[]
}) {
  const { t, i18n } = useTranslation()
  if (loading) {
    return (
      <ul className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-[12px] overflow-hidden bg-[var(--bg-primary)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="px-5 py-3.5">
            <SkeletonText lines={2} />
          </li>
        ))}
      </ul>
    )
  }
  if (entries.length === 0) {
    return (
      <div className="text-[13px] text-[var(--text-tertiary)] py-6 leading-relaxed">
        {t('myDay.activity.none')}
      </div>
    )
  }
  return (
    <Stagger staggerMs={30} className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-[12px] overflow-hidden bg-[var(--bg-primary)]">
      {entries.map(e => (
        <StaggerItem key={e.id}>
          <div className="px-5 py-3.5 flex items-baseline gap-4 text-[13px]">
              <span className="text-caption text-[var(--text-tertiary)] tabular-nums flex-shrink-0 w-[88px]">
                {relativeShort(e.created_at, t, i18n.language)}
              </span>
              <ActorBadge name={e.user_name ?? e.user_email ?? null} />
              <span className="text-[var(--text-secondary)] flex-1 truncate leading-snug">
                <strong className="font-semibold text-[var(--text-primary)]">
                  {e.user_name ?? e.user_email ?? t('myDay.activity.system')}
                </strong>{' '}
                <span className="text-[var(--text-tertiary)]">{humanAction(e.action, t)}</span>{' '}
                {e.resource_type && (
                  <span className="text-[var(--text-tertiary)]">{e.resource_type.replace(/_/g, ' ')}</span>
                )}
              </span>
            </div>
          </StaggerItem>
        ))}
    </Stagger>
  )
}

function ActorBadge({ name }: { name: string | null }) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : 'S'
  return (
    <span
      aria-hidden
      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold text-white"
      style={{
        background: 'linear-gradient(135deg, #10B981, #047857)',
      }}
    >
      {initial}
    </span>
  )
}

// ─── Helpers ────────────────────────────────────────────────

function relativeDays(iso: string, t: TFunction): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.round(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return t('myDay.rel.today')
  if (days === 1) return t('myDay.rel.daysAgo', { count: 1 })
  if (days === -1) return t('myDay.rel.tomorrow')
  if (days < 0) return t('myDay.rel.inDays', { count: Math.abs(days) })
  return t('myDay.rel.daysAgo', { count: days })
}

function relativeShort(iso: string, t: TFunction, language?: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('myDay.rel.justNow')
  if (mins < 60) return t('myDay.rel.minsAgo', { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('myDay.rel.hrsAgo', { count: hrs })
  const days = Math.floor(hrs / 24)
  if (days < 7) return t('myDay.rel.daysAgo', { count: days })
  return new Date(iso).toLocaleDateString(language?.startsWith('zh') ? 'zh-CN' : undefined, { month: 'short', day: 'numeric' })
}

function humanAction(a: string, t: TFunction): string {
  if (a.endsWith('.create')) return t('myDay.action.created')
  if (a.endsWith('.update')) return t('myDay.action.updated')
  if (a.endsWith('.delete')) return t('myDay.action.deleted')
  if (a.endsWith('.login')) return t('myDay.action.signedIn')
  if (a.endsWith('.approve')) return t('myDay.action.approved')
  if (a.endsWith('.reject')) return t('myDay.action.rejected')
  if (a.endsWith('.submit')) return t('myDay.action.submitted')
  return a.replace(/[._]/g, ' ')
}

/** Best-effort extraction of a user-friendly message from a Promise rejection. */
function errMsg(reason: unknown, fallback: string): string {
  if (reason instanceof Error && reason.message) return reason.message
  if (typeof reason === 'string' && reason) return reason
  return fallback
}

// Tiny unused-imports guard — Clock/Inbox kept for future tone variants.
void Clock; void Inbox
