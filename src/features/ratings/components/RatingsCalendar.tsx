import { useMemo } from 'react'
import clsx from 'clsx'
import { CalendarClock } from 'lucide-react'
import { Badge, Card, CardHeader, EmptyState, Stagger, StaggerItem, type Tone } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useL10n } from '@/features/workspace/WorkspaceContext'
import { daysUntil } from '@/config/regulatory'
import type { CalendarItem, CalendarKind, Rating } from '@/features/ratings/data'
import { ratingsStrings } from '@/features/ratings/ratings.strings'

const KIND_TONE: Record<CalendarKind, Tone> = { questionnaire: 'info', verification: 'warning', review: 'neutral', publication: 'success' }

/** Ordered timeline of rating deadlines, soonest first, with days remaining. */
export function RatingsCalendar({ items, ratings }: { items: CalendarItem[]; ratings: Rating[] }) {
  const s = useStrings(ratingsStrings)
  const f = useFormat()
  const l10n = useL10n()
  const names = useMemo(() => new Map(ratings.map(r => [r.id, l10n(r.name)])), [ratings, l10n])
  const sorted = useMemo(
    () => [...items].map(i => ({ ...i, days: daysUntil(i.date) })).sort((a, b) => a.date.localeCompare(b.date)),
    [items],
  )
  // Keep the two most recent passed items for context, then everything upcoming.
  const passed = sorted.filter(i => i.days < 0).slice(-2)
  const upcoming = sorted.filter(i => i.days >= 0)
  const list = [...passed, ...upcoming]

  const remaining = (days: number) =>
    days < 0
      ? fmt(s.calendar.passed, { days: Math.abs(days) })
      : days === 0
        ? s.calendar.today
        : days === 1
          ? s.calendar.dayLeft
          : fmt(s.calendar.daysLeft, { days })

  return (
    <Card className="flex flex-col">
      <CardHeader title={s.calendar.title} description={s.calendar.description} icon={CalendarClock} />
      {list.length === 0 ? (
        <EmptyState icon={CalendarClock} title={s.calendar.emptyTitle} description={s.calendar.emptyDesc} />
      ) : (
        <Stagger as="ul" className="relative">
          {list.map((item, i) => {
            const soon = item.days >= 0 && item.days <= 14
            const past = item.days < 0
            return (
              <StaggerItem as="li" key={item.id} className="relative pl-6 pb-5 last:pb-0">
                {i < list.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-line" aria-hidden />}
                <span
                  className={clsx(
                    'absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ring-[3px] ring-white',
                    past ? 'bg-zinc-300' : soon ? 'bg-amber-500' : 'bg-zinc-900',
                  )}
                  aria-hidden
                />
                <div className="flex items-baseline justify-between gap-3">
                  <time dateTime={item.date} className={clsx('text-xs tabular', past ? 'text-zinc-400' : 'text-zinc-500')}>
                    {f.date(item.date)}
                  </time>
                  <span
                    className={clsx(
                      'text-xs font-medium tabular whitespace-nowrap',
                      past ? 'text-zinc-400' : soon ? 'text-amber-700' : 'text-zinc-700',
                    )}
                  >
                    {remaining(item.days)}
                  </span>
                </div>
                <div className={clsx('mt-1 text-sm leading-snug', past ? 'text-zinc-500' : 'text-zinc-900 font-medium')}>{item.title}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone={past ? 'neutral' : KIND_TONE[item.kind]}>{s.calendar.kind[item.kind]}</Badge>
                  <Badge>{names.get(item.ratingId) ?? item.ratingId}</Badge>
                </div>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
      <p className="mt-5 pt-4 border-t border-line text-xs text-zinc-500">{s.calendar.note}</p>
    </Card>
  )
}
