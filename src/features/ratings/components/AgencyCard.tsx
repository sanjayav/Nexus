import clsx from 'clsx'
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Badge, Card, Progress, StaggerItem } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useL10n } from '@/features/workspace/WorkspaceContext'
import { currentPoint, direction, previousPoint, type Rating } from '@/features/ratings/data'
import { ratingsStrings } from '@/features/ratings/ratings.strings'
import { useRatingDisplay } from './useRatingDisplay'

const DIR = {
  1: { icon: ArrowUpRight, cls: 'bg-emerald-50 text-emerald-700' },
  0: { icon: ArrowRight, cls: 'bg-zinc-900/[0.05] text-zinc-600' },
  [-1]: { icon: ArrowDownRight, cls: 'bg-rose-50 text-rose-700' },
} as const

export function AgencyCard({ rating, industry, onOpen }: { rating: Rating; industry: string; onOpen: () => void }) {
  const s = useStrings(ratingsStrings)
  const f = useFormat()
  const l10n = useL10n()
  const show = useRatingDisplay()
  const cur = currentPoint(rating)
  const prev = previousPoint(rating)
  const dir = direction(rating)
  const Dir = DIR[dir].icon
  const dirLabel = dir > 0 ? s.agencies.up : dir < 0 ? s.agencies.down : s.agencies.flat
  const unit = rating.kind === 'score' ? s.agencies.scoreUnit : undefined

  return (
    <StaggerItem>
      <Card
        interactive
        role="button"
        tabIndex={0}
        aria-label={`${l10n(rating.name)} · ${s.agencies.open}`}
        onClick={onOpen}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
        className="h-full flex flex-col group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-zinc-900 truncate">{l10n(rating.name)}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge>{rating.origin === 'domestic' ? s.agencies.domestic : s.agencies.international}</Badge>
              {!rating.scaleVerified && <Badge tone="warning">{s.agencies.scaleUnverified}</Badge>}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>

        <div className="mt-5 flex items-end justify-between gap-2">
          <div className="shrink-0">
            <div className="text-xs text-zinc-500">{s.agencies.current}</div>
            <div className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="display text-[34px] font-semibold text-zinc-900 leading-none">{show(rating, cur.value)}</span>
              {unit && <span className="text-xs text-zinc-500">{unit}</span>}
            </div>
          </div>
          <div className="text-right min-w-0">
            <span className={clsx('inline-flex items-center gap-0.5 h-6 px-1.5 rounded-md text-xs font-medium', DIR[dir].cls)}>
              <Dir className="w-3.5 h-3.5" />
              {dirLabel}
            </span>
            <div className="mt-1 text-xs text-zinc-500 tabular">
              {prev
                ? fmt(s.agencies.previous, { value: show(rating, prev.value) + (rating.previousBadge ? ` · ${rating.previousBadge}` : '') })
                : s.agencies.noPrevious}
            </div>
          </div>
        </div>

        {rating.badge && (
          <div className="mt-2">
            <Badge tone={rating.kind === 'risk' ? 'info' : 'success'}>{rating.badge}</Badge>
          </div>
        )}

        <div className="mt-5">
          <Progress value={rating.percentile} tone={rating.percentile >= 75 ? 'success' : 'neutral'} />
          <div className="mt-2 text-xs text-zinc-600">{fmt(s.agencies.percentile, { pct: f.percent(rating.percentile), industry })}</div>
        </div>

        <div className="flex-1" />
        <dl className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-zinc-500">{s.agencies.updated}</dt>
            <dd className="mt-0.5 text-zinc-800 tabular">{f.date(rating.lastUpdate)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{s.agencies.nextReview}</dt>
            <dd className="mt-0.5 text-zinc-800 tabular">{f.date(rating.nextReview)}</dd>
          </div>
        </dl>
      </Card>
    </StaggerItem>
  )
}
