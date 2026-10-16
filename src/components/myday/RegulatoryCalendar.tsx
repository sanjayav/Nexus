import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { regulatoryCalendar, type RegulatoryCalendarItem, type CalendarRegion } from '../../lib/api'
import { getFramework } from '../../lib/frameworks'
import { useFmt } from '../../lib/fmt'
import { StateBoundary, StatusPill, Skeleton, type PillTone } from '../ui'
import { dur, ease } from '../../motion/tokens'

/* ── Data ──────────────────────────────────────────────────────────────── */

export function useRegulatoryCalendar() {
  const { i18n } = useTranslation()
  const [items, setItems] = useState<RegulatoryCalendarItem[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (isCancelled: () => boolean = () => false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await regulatoryCalendar.get()
      if (!isCancelled()) setItems(Array.isArray(res?.items) ? res.items : [])
    } catch (e) {
      if (!isCancelled()) setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      if (!isCancelled()) setLoading(false)
    }
  }, [])

  // Titles are rendered server-side in the request language — refetch on switch.
  useEffect(() => {
    let cancelled = false
    void load(() => cancelled)
    return () => { cancelled = true }
  }, [load, i18n.language])

  return { items, error, loading, reload: () => void load() }
}

/** Highlighted first, then dated (soonest first), then undated. */
export function sortCalendar(items: RegulatoryCalendarItem[]): RegulatoryCalendarItem[] {
  return [...items].sort((a, b) => {
    if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

function countdownTone(it: RegulatoryCalendarItem): PillTone {
  if (it.status === 'overdue') return 'danger'
  if (it.status === 'due_soon') return 'warning'
  if (it.status === 'no_fixed_date') return 'neutral'
  return 'info'
}

function CountdownChip({ item }: { item: RegulatoryCalendarItem }) {
  const { t } = useTranslation()
  let label: string
  if (item.due_date == null || item.days_until == null) {
    label = item.due_note ?? (item.region === 'CN' ? t('regCalendar.perMeeNotice') : t('regCalendar.perNotice'))
  } else if (item.days_until === 0) {
    label = t('regCalendar.dueToday')
  } else if (item.days_until < 0) {
    label = t('regCalendar.overdue', { count: Math.abs(item.days_until) })
  } else {
    label = t('regCalendar.dueIn', { count: item.days_until })
  }
  return (
    <StatusPill
      tone={countdownTone(item)}
      size="sm"
      dot={item.status === 'due_soon' || item.status === 'overdue'}
      className="max-w-full"
      title={label}
    >
      <span className="truncate">{label}</span>
    </StatusPill>
  )
}

/** One deadline (wrap in an <li>). */
export function CalendarRow({ item, showDetail = false }: { item: RegulatoryCalendarItem; showDetail?: boolean }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const fw = item.framework_id ? getFramework(item.framework_id) : undefined
  const zh = i18n.language?.startsWith('zh')
  const fwName = fw ? (zh && fw.nameZh ? fw.nameZh : fw.name) : undefined
  const dateText = item.due_date ? f.date(item.due_date, { style: 'medium' }) : null

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="type-small font-medium text-[var(--text-primary)] text-pretty">{item.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 min-w-0">
            <CountdownChip item={item} />
            {fw && (
              <Link
                to={`/disclosure-editor/${fw.id}`}
                title={t('regCalendar.openFramework', { name: fwName })}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
              >
                <StatusPill tone={item.highlighted ? 'brand' : 'neutral'} size="sm" className="hover:brightness-95">
                  {fw.code}
                </StatusPill>
              </Link>
            )}
            <span className="text-caption text-[var(--text-tertiary)] whitespace-nowrap">
              {t(`regCalendar.region.${item.region}`)} · {t(`regCalendar.kind.${item.kind}`)}
            </span>
          </div>
          {(dateText || (item.due_date && item.due_note)) && (
            <p className="mt-1 text-caption text-[var(--text-tertiary)] tabular-nums">
              {dateText}
              {item.due_date && item.due_note && <span> · {item.due_note}</span>}
            </p>
          )}
          {showDetail && item.detail && (
            <p className="mt-1.5 type-small text-[var(--text-secondary)] max-w-3xl text-pretty">{item.detail}</p>
          )}
        </div>
      </div>
    </div>
  )
}

const ROW_LI = 'py-3.5 first:pt-0 last:pb-0 min-w-0'

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-20" rounded="full" />
            <Skeleton className="h-5 w-12" rounded="full" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ── My Day card ───────────────────────────────────────────────────────── */

const CARD_LIMIT = 5

/**
 * Regulatory calendar on My Day: China and global filing deadlines with
 * countdown chips. Items that match the org's frameworks or listing venue
 * ("Applies to you") come first; undated obligations say how the date is set
 * ("Per MEE annual notice") instead of inventing one. If the endpoint fails
 * the card says so and offers a retry — it never pretends there is nothing due.
 */
export default function RegulatoryCalendarCard({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { items, error, loading, reload } = useRegulatoryCalendar()
  const [expanded, setExpanded] = useState(false)
  const sorted = useMemo(() => sortCalendar(items ?? []), [items])
  const mine = sorted.filter(i => i.highlighted)
  const others = sorted.filter(i => !i.highlighted)
  const visibleOthers = expanded ? others : others.slice(0, Math.max(0, CARD_LIMIT - mine.length))
  const hidden = others.length - visibleOthers.length

  return (
    <section aria-labelledby="reg-cal-title" className={`surface-paper p-5 sm:p-6 flex flex-col min-w-0 ${className}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 id="reg-cal-title" className="type-h3 text-[var(--text-primary)] flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
            {t('regCalendar.title')}
          </h2>
          <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('regCalendar.subtitle')}</p>
        </div>
        <Link
          to="/work/calendar"
          className="inline-flex items-center gap-1 h-8 px-2 -mr-2 rounded-[var(--radius-sm)] text-caption font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
        >
          {t('regCalendar.fullCalendar')} <ArrowRight className="w-3 h-3" aria-hidden />
        </Link>
      </header>

      <StateBoundary
        loading={loading && items == null}
        error={error}
        onRetry={reload}
        compact
        empty={items != null && items.length === 0}
        emptyState={{ art: false, title: t('regCalendar.empty.title'), body: t('regCalendar.empty.body') }}
        errorState={{ art: false, title: t('regCalendar.error.title'), body: t('regCalendar.error.body') }}
        skeleton={<ListSkeleton />}
      >
        <div className="space-y-5">
          {mine.length > 0 && (
            <div>
              <h3 className="text-caption font-semibold text-[var(--color-brand-strong)] mb-2.5">{t('regCalendar.appliesToYou')}</h3>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {mine.map(it => <li key={it.id} className={ROW_LI}><CalendarRow item={it} /></li>)}
              </ul>
            </div>
          )}
          {visibleOthers.length > 0 && (
            <div>
              {mine.length > 0 && (
                <h3 className="text-caption font-semibold text-[var(--text-tertiary)] mb-2.5">{t('regCalendar.otherDeadlines')}</h3>
              )}
              <ul className="divide-y divide-[var(--border-subtle)]">
                <AnimatePresence initial={false}>
                  {visibleOthers.map(it => (
                    <motion.li
                      key={it.id}
                      className="min-w-0 [&:first-child>div]:pt-0 [&:last-child>div]:pb-0"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: dur.base, ease: ease.out }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="py-3.5"><CalendarRow item={it} /></div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}
          {(hidden > 0 || expanded) && others.length > CARD_LIMIT - mine.length && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              aria-expanded={expanded}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] text-small font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              {expanded ? t('regCalendar.showLess') : t('regCalendar.showMore', { count: hidden })}
            </button>
          )}
        </div>
      </StateBoundary>
    </section>
  )
}

export type { CalendarRegion }
