import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CalendarClock } from 'lucide-react'
import type { ReportingPeriod } from '../../lib/orgStore'
import { useFmt } from '../../lib/fmt'
import { NumberTicker, Skeleton, StatusPill } from '../ui'
import { ease, dur } from '../../motion/tokens'

export interface Readiness {
  total: number
  approved: number
  inReview: number
  open: number
}

export interface ReadinessHeroProps {
  greeting: string
  /** Framework short code, e.g. "GRI". */
  frameworkCode: string
  loading: boolean
  error?: unknown
  onRetry?: () => void
  period: ReportingPeriod | null
  readiness: Readiness | null
  /** Days until the submission deadline (negative when past), null if none set. */
  daysToDeadline: number | null
  /** My overdue disclosures. */
  overdue: number | null
  canManagePeriods: boolean
}

/**
 * My Day hero — the one display figure on the page: how much of the active
 * reporting period is approved, from real `periods` + `framework-progress`
 * data (not calendar-quarter time), with the submission deadline beside it.
 * The figure rolls in and the segmented bar fills once: the page's single
 * authored motion moment.
 */
export default function ReadinessHero({
  greeting, frameworkCode, loading, error, onRetry, period, readiness, daysToDeadline, overdue, canManagePeriods,
}: ReadinessHeroProps) {
  const { t } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const total = readiness?.total ?? 0
  const pct = total > 0 ? Math.round((readiness!.approved / total) * 100) : 0
  const seg = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  let body: React.ReactNode
  if (loading) {
    body = (
      <div className="mt-6 space-y-4" role="status" aria-busy="true">
        <span className="sr-only">{t('ui.state.loading')}</span>
        <Skeleton className="h-14 w-48" rounded="lg" />
        <Skeleton className="h-2 w-full max-w-xl" rounded="full" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  } else if (error) {
    body = (
      <div className="mt-6 max-w-xl" role="alert">
        <p className="type-h3 text-[var(--text-primary)]">{t('myDay.hero.errorTitle')}</p>
        <p className="type-small text-[var(--text-secondary)] mt-1">{t('myDay.hero.errorBody')}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center h-10 px-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            {t('ui.state.retry')}
          </button>
        )}
      </div>
    )
  } else if (!period) {
    body = (
      <div className="mt-6 max-w-xl">
        <p className="type-h3 text-[var(--text-primary)]">{t('myDay.hero.noPeriodTitle', { framework: frameworkCode })}</p>
        <p className="type-small text-[var(--text-secondary)] mt-1">{t('myDay.hero.noPeriodBody')}</p>
        {canManagePeriods && (
          <Link
            to="/admin/periods"
            className="mt-3 inline-flex items-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)]"
          >
            {t('myDay.hero.setUpPeriod')} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        )}
      </div>
    )
  } else if (!readiness || total === 0) {
    body = (
      <div className="mt-6 max-w-xl">
        <p className="type-h3 text-[var(--text-primary)]">{t('myDay.hero.nothingAssignedTitle', { period: period.label })}</p>
        <p className="type-small text-[var(--text-secondary)] mt-1">{t('myDay.hero.nothingAssignedBody')}</p>
      </div>
    )
  } else {
    body = (
      <>
        <div className="mt-5 sm:mt-6 flex items-end gap-x-4 gap-y-1 flex-wrap">
          <NumberTicker
            value={pct}
            format="percent"
            className="type-display-xl text-[var(--text-primary)]"
            aria-label={t('myDay.hero.figureAria', { pct, period: period.label })}
          />
          <p className="pb-1.5 sm:pb-2 type-body text-[var(--text-secondary)]">
            {t('myDay.hero.ofApproved', { period: period.label })}
            <span className="block text-caption text-[var(--text-tertiary)] tabular-nums">
              {t('myDay.hero.approvedOfTotal', { approved: f.number(readiness!.approved), total: f.number(total) })}
            </span>
          </p>
        </div>

        {/* Segmented readiness: approved · in review · open */}
        <div
          className="mt-5 h-2 w-full max-w-2xl rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex"
          role="img"
          aria-label={t('myDay.hero.barAria', { approved: readiness!.approved, review: readiness!.inReview, open: readiness!.open })}
        >
          {[
            { n: readiness!.approved, c: 'var(--status-success)' },
            { n: readiness!.inReview, c: 'var(--status-info)' },
          ].map((s, i) => (
            <motion.span
              key={i}
              className="h-full"
              style={{ background: s.c }}
              initial={reduce ? false : { width: '0%' }}
              animate={{ width: `${seg(s.n)}%` }}
              transition={{ duration: 0.8, ease: ease.out, delay: reduce ? 0 : 0.15 + i * dur.fast }}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-caption text-[var(--text-secondary)]">
          <Legend color="var(--status-success)" label={t('myDay.hero.legendApproved')} value={f.number(readiness!.approved)} />
          <Legend color="var(--status-info)" label={t('myDay.hero.legendReview')} value={f.number(readiness!.inReview)} />
          <Legend color="var(--bg-tertiary)" ring label={t('myDay.hero.legendOpen')} value={f.number(readiness!.open)} />
        </ul>
      </>
    )
  }

  const deadline = period?.submission_deadline ?? null
  return (
    <section aria-labelledby="myday-greeting" className="surface-hero p-5 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-caption font-semibold text-[var(--color-brand-strong)] whitespace-nowrap">
              {period ? t('myDay.hero.kicker', { period: period.label, framework: frameworkCode }) : frameworkCode}
            </span>
            {period && (
              <StatusPill tone={period.status === 'active' || period.status === 'published' ? 'brand' : 'neutral'} dot={period.status === 'active'} size="sm">
                {t(`myDay.hero.periodStatus.${period.status}`)}
              </StatusPill>
            )}
          </div>
          <h1 id="myday-greeting" className="type-h1 text-[var(--text-primary)] mt-2">{greeting}</h1>
          {body}
        </div>

        {/* Deadline panel */}
        <aside
          aria-label={t('myDay.hero.deadlineAria')}
          className="min-w-0 border-t border-[var(--border-subtle)] pt-5 lg:border-t-0 lg:pt-1 lg:border-l lg:pl-8 flex flex-col"
        >
          <span className="text-caption font-medium text-[var(--text-tertiary)] flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" aria-hidden /> {t('myDay.hero.deadline')}
          </span>
          {loading ? (
            <Skeleton className="h-10 w-24 mt-3" rounded="lg" />
          ) : deadline && daysToDeadline != null ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`type-figure text-[40px] leading-[44px] ${daysToDeadline < 0 ? 'text-[var(--status-danger)]' : 'text-[var(--text-primary)]'}`}
                >
                  {f.number(Math.abs(daysToDeadline))}
                </span>
                <span className="type-small text-[var(--text-secondary)]">
                  {daysToDeadline < 0
                    ? t('myDay.hero.daysPast', { count: Math.abs(daysToDeadline) })
                    : t('myDay.hero.daysLeft', { count: daysToDeadline })}
                </span>
              </div>
              <span className="text-caption text-[var(--text-tertiary)] tabular-nums">{f.date(deadline, { style: 'long' })}</span>
            </>
          ) : (
            <p className="mt-2 type-small text-[var(--text-secondary)]">{period ? t('myDay.hero.noDeadline') : '—'}</p>
          )}
          {!loading && overdue != null && overdue > 0 && (
            <Link
              to="/my-tasks"
              className="mt-4 lg:mt-auto inline-flex items-center gap-1.5 self-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
            >
              <StatusPill tone="danger" dot size="md">{t('myDay.hero.overdueMine', { count: overdue })}</StatusPill>
            </Link>
          )}
        </aside>
      </div>
    </section>
  )
}

function Legend({ color, label, value, ring }: { color: string; label: string; value: string; ring?: boolean }) {
  return (
    <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className="w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: ring ? 'inset 0 0 0 1px var(--border-strong)' : undefined }}
      />
      {label}
      <strong className="font-semibold text-[var(--text-primary)] tabular-nums">{value}</strong>
    </li>
  )
}
