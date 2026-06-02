import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const firstName = user?.name?.split(' ')[0] || 'there'

  const [mine, setMine] = useState<QuestionAssignment[] | null>(null)
  const [all, setAll] = useState<QuestionAssignment[] | null>(null)
  const [activity, setActivity] = useState<AuditExplorerEntry[] | null>(null)
  const [criticalAnomalies, setCriticalAnomalies] = useState<number | null>(null)
  const [hashOk, setHashOk] = useState<boolean | null>(null)

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
      if (mineRes.status === 'fulfilled') setMine(mineRes.value.filter(a => a.framework_id === framework.id))
      else setMine([])
      if (allRes.status === 'fulfilled') setAll(allRes.value.filter(a => a.framework_id === framework.id))
      else setAll([])
      if (activityRes.status === 'fulfilled') setActivity(activityRes.value.rows)
      else setActivity([])
      if (anomaliesRes.status === 'fulfilled') setCriticalAnomalies(anomaliesRes.value.summary?.critical ?? 0)
      else setCriticalAnomalies(0)
      if (hashRes.status === 'fulfilled' && hashRes.value) setHashOk(!!hashRes.value.verified)
      else setHashOk(null)
    })()
    return () => { cancelled = true }
  }, [user, framework.id])

  const now = Date.now()
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
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
      return `This ${suggested.gri_code ?? 'disclosure'} is required for ${framework.code} compliance and is overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}.`
    }
    if (suggested.status === 'rejected') {
      return `This ${suggested.gri_code ?? 'disclosure'} was returned for revision — close the loop to keep the cycle moving.`
    }
    return `Highest-impact open item in your queue — start here to unblock downstream reviewers.`
  }, [suggested, framework.code, now])

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
    return { pct, daysLeft, label: `Q${q + 1} reporting period` }
  }, [])

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-2">
      {/* Hero greeting */}
      <FadeIn>
        <header className="space-y-3">
          <h1 className="h-display text-[var(--text-primary)]">
            {greeting}, {firstName}
          </h1>
          <div className="flex items-center gap-3 text-[13px] text-[var(--text-tertiary)]">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>
              <strong className="font-semibold text-[var(--text-secondary)]">{quarterStatus.label}</strong>
              <span className="mx-2">·</span>
              <span>{quarterStatus.daysLeft} days remaining</span>
            </span>
          </div>
          {/* Quarter progress bar */}
          <div className="h-1 w-full max-w-md rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-strong)] transition-all duration-500"
              style={{ width: `${quarterStatus.pct}%` }}
              aria-label={`${quarterStatus.pct}% of period elapsed`}
            />
          </div>
        </header>
      </FadeIn>

      {/* Three primary cards — stagger left to right, 80ms apart */}
      <Stagger staggerMs={80} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <StaggerItem>
          <DueTodayCard
            loading={loading}
            items={dueToday.slice(0, 5)}
            onStart={(qid) => navigate(`/data/entry/${qid}`)}
            onSeeAll={() => navigate('/my-tasks')}
            now={now}
          />
        </StaggerItem>
        <StaggerItem>
          <ReviewQueueCard
            loading={loading}
            items={reviewQueue.slice(0, 5)}
            onOpen={() => navigate('/work/review')}
          />
        </StaggerItem>
        <StaggerItem>
          <SuggestedNextCard
            loading={loading}
            item={suggested}
            reasoning={suggestedReasoning}
            onOpen={() => suggested && navigate(`/data/entry/${suggested.questionId}`)}
          />
        </StaggerItem>
      </Stagger>

      {/* KPI strip — divider above and below */}
      <div className="border-t border-b border-[var(--border-subtle)] py-4">
        <section
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          aria-label="At-a-glance metrics"
        >
          <Kpi label="Open assignments" value={loading ? '—' : String(kpi.open)} />
          <Kpi label="Approved this week" value={loading ? '—' : String(kpi.approvedThisWeek)} />
          <Kpi
            label="Critical anomalies"
            value={criticalAnomalies == null ? '—' : criticalAnomalies > 0 ? String(criticalAnomalies) : '0'}
            tone={criticalAnomalies && criticalAnomalies > 0 ? 'warn' : 'ok'}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
          />
          <Kpi
            label="Hash chain"
            value={hashOk == null ? '—' : hashOk ? '✓ Verified' : 'Broken'}
            tone={hashOk === false ? 'warn' : 'ok'}
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
          />
        </section>
      </div>

      {/* Activity feed */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-[var(--text-tertiary)]" />
            <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
              Recent activity
            </h2>
          </div>
          <button
            onClick={() => navigate('/admin/audit')}
            className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
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
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--text-tertiary)] mb-2.5">
        {eyebrow}
      </div>
      {children}
    </article>
  )
}

function HeroCardSkeleton({ eyebrow }: { eyebrow: string }) {
  return (
    <article className="card-premium border-[var(--border-subtle)] flex flex-col min-h-[280px]">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--text-tertiary)] mb-2.5">
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
  loading, items, onStart, onSeeAll, now,
}: {
  loading: boolean
  items: QuestionAssignment[]
  onStart: (qid: string) => void
  onSeeAll: () => void
  now: number
}) {
  if (loading) return <HeroCardSkeleton eyebrow="Due today" />
  if (items.length === 0) {
    return (
      <HeroCard eyebrow="Due today" tone="ok">
        <div className="flex flex-col items-center text-center py-2">
          <EmptyTasksIllustration className="w-24 h-24 text-[var(--color-brand)] opacity-80 mb-3" />
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-1">
            Nothing due today
          </h2>
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            Quiet day — get ahead or take a breath.
          </p>
        </div>
      </HeroCard>
    )
  }
  return (
    <HeroCard eyebrow="Due today" tone="attention">
      <h2 className="font-display text-[19px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-5">
        {items.length} disclosure{items.length === 1 ? '' : 's'} need values
      </h2>
      <ul className="space-y-3 flex-1">
        {items.slice(0, 4).map(a => {
          const overdue = a.due_date && new Date(a.due_date).getTime() < now
          return (
            <li key={a.id} className="flex items-start justify-between gap-3 text-[13px]">
              <div className="min-w-0 flex-1">
                <div className="text-[var(--text-primary)] font-medium truncate">
                  <span className="font-mono text-[11.5px] text-[var(--text-tertiary)] mr-1.5">{a.gri_code}</span>
                  {a.line_item}
                </div>
                <div className="text-[11.5px] text-[var(--text-tertiary)] mt-0.5">
                  {overdue ? (
                    <span className="text-[var(--status-reject)]">Overdue · {a.due_date && relativeDays(a.due_date)}</span>
                  ) : (
                    <span>Due {a.due_date ? new Date(a.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'soon'}</span>
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
          Start the next <ArrowRight className="w-3 h-3" />
        </button>
      </CardFooter>
    </HeroCard>
  )
}

function ReviewQueueCard({
  loading, items, onOpen,
}: {
  loading: boolean
  items: QuestionAssignment[]
  onOpen: () => void
}) {
  if (loading) return <HeroCardSkeleton eyebrow="Review queue" />
  if (items.length === 0) {
    return (
      <HeroCard eyebrow="Review queue" tone="ok">
        <div className="flex flex-col items-center text-center py-2">
          <EmptyInboxIllustration className="w-24 h-24 text-[var(--color-brand)] opacity-80 mb-3" />
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-1">
            Nothing to review
          </h2>
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            Inbox zero — reviewers can rest.
          </p>
        </div>
      </HeroCard>
    )
  }
  return (
    <HeroCard eyebrow="Review queue" tone="attention">
      <h2 className="font-display text-[19px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-5">
        {items.length} submission{items.length === 1 ? '' : 's'} awaiting review
      </h2>
      <ul className="space-y-3 flex-1">
        {items.slice(0, 5).map(a => (
          <li key={a.id} className="flex items-start gap-3 text-[13px]">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-[var(--text-tertiary)] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[var(--text-primary)] font-medium truncate">
                <span className="font-mono text-[11.5px] text-[var(--text-tertiary)] mr-1.5">{a.gri_code}</span>
                {a.line_item}
              </div>
              <div className="text-[11.5px] text-[var(--text-tertiary)] mt-0.5 truncate">
                {a.assigneeName ?? 'Unassigned'}
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
          Open queue <ArrowRight className="w-3 h-3" />
        </button>
      </CardFooter>
    </HeroCard>
  )
}

function SuggestedNextCard({
  loading, item, reasoning, onOpen,
}: {
  loading: boolean
  item: QuestionAssignment | null
  reasoning: string
  onOpen: () => void
}) {
  if (loading) return <HeroCardSkeleton eyebrow="Suggested next" />
  if (!item) {
    return (
      <HeroCard eyebrow="Suggested next" tone="ok">
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-14 h-14 rounded-full bg-[var(--color-brand-soft)] flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-[var(--color-brand)]" />
          </div>
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-1">
            You're caught up
          </h2>
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            Nothing stale on your plate. Time to celebrate.
          </p>
        </div>
      </HeroCard>
    )
  }
  return (
    <HeroCard eyebrow="Suggested next">
      <h2 className="font-display text-[18px] font-semibold tracking-[-0.012em] text-[var(--text-primary)] leading-snug mb-1.5 line-clamp-2">
        {item.line_item}
      </h2>
      <div className="font-mono text-[11.5px] text-[var(--text-tertiary)] mb-4">{item.gri_code}</div>
      <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed flex-1">
        {reasoning}
      </p>
      <div className="pt-5 mt-5 border-t border-[var(--border-subtle)]">
        <button
          onClick={onOpen}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand-strong)] transition-colors"
        >
          Open in editor <ArrowRight className="w-3.5 h-3.5" />
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
      <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--text-tertiary)] mb-1.5">
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
        No activity in the last few days.
      </div>
    )
  }
  return (
    <Stagger staggerMs={30} className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-[12px] overflow-hidden bg-[var(--bg-primary)]">
      {entries.map(e => (
        <StaggerItem key={e.id}>
          <div className="px-5 py-3.5 flex items-baseline gap-4 text-[13px]">
              <span className="text-[11.5px] text-[var(--text-tertiary)] tabular-nums flex-shrink-0 w-[88px]">
                {relativeShort(e.created_at)}
              </span>
              <ActorBadge name={e.user_name ?? e.user_email ?? null} />
              <span className="text-[var(--text-secondary)] flex-1 truncate leading-snug">
                <strong className="font-semibold text-[var(--text-primary)]">
                  {e.user_name ?? e.user_email ?? 'System'}
                </strong>{' '}
                <span className="text-[var(--text-tertiary)]">{humanAction(e.action)}</span>{' '}
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
      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
      style={{
        background: 'linear-gradient(135deg, #2fa98e, #1B6B7B)',
      }}
    >
      {initial}
    </span>
  )
}

// ─── Helpers ────────────────────────────────────────────────

function relativeDays(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.round(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days === -1) return 'tomorrow'
  if (days < 0) return `in ${Math.abs(days)}d`
  return `${days}d ago`
}

function relativeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function humanAction(a: string): string {
  if (a.endsWith('.create')) return 'created'
  if (a.endsWith('.update')) return 'updated'
  if (a.endsWith('.delete')) return 'deleted'
  if (a.endsWith('.login')) return 'signed in'
  if (a.endsWith('.approve')) return 'approved'
  if (a.endsWith('.reject')) return 'rejected'
  if (a.endsWith('.submit')) return 'submitted'
  return a.replace(/[._]/g, ' ')
}

// Tiny unused-imports guard — Clock/Inbox kept for future tone variants.
void Clock; void Inbox
