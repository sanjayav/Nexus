import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import NumberTicker, { type TickerFormat } from './NumberTicker'
import Sparkline from './Sparkline'
import { useFmt } from '../../lib/fmt'
import { Skeleton } from '../Skeleton'

/**
 * StatLedger — the KPI strip. One paper surface, hairline dividers (no boxes,
 * no pastel tiles), a 12 px caption with an 8 px semantic dot, a 32/36
 * tabular figure that rolls in, then an optional delta chip and sparkline.
 *
 *   <StatLedger items={[
 *     { id: 'open', label: t('…open'), value: 17, tone: 'neutral', to: '/my-tasks' },
 *     { id: 'approved', label: t('…approved'), value: 4, tone: 'success',
 *       delta: { value: 33, percent: true, goodWhen: 'up', label: t('…vsLastWeek') },
 *       spark: [1, 2, 2, 3, 4] },
 *     { id: 'anomalies', label: t('…critical'), value: 1, tone: 'danger' },
 *     { id: 'chain', label: t('…hashChain'), value: t('…verified'), tone: 'success' },
 *   ]} />
 *
 * Responsive: 2 columns below `md`, one row from `md` (up to 6 items).
 */
export type LedgerTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

export interface LedgerDelta {
  value: number
  /** Treat value as a percentage change. */
  percent?: boolean
  /** Which direction is good (colours the chip). Default 'up'. */
  goodWhen?: 'up' | 'down' | 'neutral'
  /** Context, e.g. "vs last week". */
  label?: string
}

export interface StatLedgerItem {
  id: string
  label: ReactNode
  /** Number rolls in via NumberTicker; strings render as-is (e.g. "Verified"). */
  value: number | string | null | undefined
  format?: TickerFormat
  precision?: number
  /** Unit after the figure, e.g. "tCO₂e" or "%". */
  unit?: string
  tone?: LedgerTone
  delta?: LedgerDelta
  /** Real series behind the figure; renders a 48×16 sparkline. */
  spark?: number[]
  /** One quiet line under the figure. */
  hint?: ReactNode
  to?: string
  onClick?: () => void
  /** Per-item loading (renders a skeleton figure). */
  loading?: boolean
}

export interface StatLedgerProps {
  items: StatLedgerItem[]
  /** Whole-strip loading. */
  loading?: boolean
  className?: string
  'aria-label'?: string
}

const DOT: Record<LedgerTone, string> = {
  neutral: 'var(--text-quaternary)',
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  danger: 'var(--status-danger)',
  info: 'var(--status-info)',
  brand: 'var(--color-brand)',
}

const COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
}

export default function StatLedger({ items, loading = false, className = '', 'aria-label': ariaLabel }: StatLedgerProps) {
  const n = Math.min(Math.max(items.length, 1), 6)
  return (
    <section
      aria-label={ariaLabel}
      className={`surface-paper overflow-hidden ${className}`}
    >
      <div
        className={`grid grid-cols-2 ${COLS[n]} gap-px bg-[var(--border-subtle)]`}
      >
        {items.map((it) => (
          <LedgerCell key={it.id} item={it} loading={loading || it.loading} />
        ))}
        {/* Fill the trailing cell on odd counts in the 2-col mobile grid. */}
        {items.length % 2 === 1 && <div className="bg-[var(--bg-primary)] md:hidden" aria-hidden />}
      </div>
    </section>
  )
}

function LedgerCell({ item, loading }: { item: StatLedgerItem; loading?: boolean }) {
  const tone = item.tone ?? 'neutral'
  const interactive = Boolean(item.to || item.onClick)
  const body = (
    <>
      <div className="flex items-center gap-2 text-caption text-[var(--text-tertiary)] font-medium min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DOT[tone] }} aria-hidden />
        <span className="truncate">{item.label}</span>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3 min-w-0">
        <span className="flex items-baseline gap-1.5 min-w-0">
          {loading ? (
            <Skeleton className="h-8 w-16" rounded="md" />
          ) : typeof item.value === 'number' ? (
            <NumberTicker
              value={item.value}
              format={item.format}
              precision={item.precision}
              className="type-figure text-[28px] sm:text-[32px] leading-[36px] text-[var(--text-primary)]"
            />
          ) : (
            <span className="type-figure text-[20px] sm:text-[24px] leading-[36px] text-[var(--text-primary)] truncate">
              {item.value ?? '—'}
            </span>
          )}
          {item.unit && !loading && (
            <span className="text-small text-[var(--text-tertiary)] font-medium whitespace-nowrap">{item.unit}</span>
          )}
        </span>
        {item.spark && !loading && <Sparkline data={item.spark} color={DOT[tone === 'neutral' ? 'brand' : tone]} className="mb-2" />}
      </div>
      {(item.delta || item.hint) && !loading && (
        <div className="mt-2 flex items-center gap-2 min-w-0 text-caption text-[var(--text-tertiary)]">
          {item.delta && <DeltaChip delta={item.delta} />}
          {item.delta?.label && <span className="truncate">{item.delta.label}</span>}
          {!item.delta && item.hint && <span className="truncate">{item.hint}</span>}
        </div>
      )}
    </>
  )

  const cellClass =
    'relative block text-left bg-[var(--bg-primary)] px-4 py-4 sm:px-5 sm:py-5 min-w-0 ' +
    (interactive
      ? 'transition-colors duration-micro ease-out hover:bg-[var(--bg-hover)] focus-visible:relative focus-visible:z-10 cursor-pointer'
      : '')

  if (item.to) {
    return (
      <Link to={item.to} className={cellClass}>
        {body}
      </Link>
    )
  }
  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} className={`${cellClass} w-full`}>
        {body}
      </button>
    )
  }
  return <div className={cellClass}>{body}</div>
}

export function DeltaChip({ delta }: { delta: LedgerDelta }) {
  const f = useFmt()
  const { t } = useTranslation()
  const dir = delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'flat'
  const good = delta.goodWhen ?? 'up'
  const tone: LedgerTone =
    dir === 'flat' || good === 'neutral' ? 'neutral' : dir === good ? 'success' : 'danger'
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus
  return (
    <span
      className="nx-pill"
      data-tone={tone}
      data-size="sm"
      aria-label={dir === 'flat' ? t('ui.ledger.noChange') : undefined}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {f.delta(delta.value, { percent: delta.percent })}
    </span>
  )
}
