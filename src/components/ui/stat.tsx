import { ReactNode } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { Card } from './card'

export type StatProps = {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  delta?: number
  deltaLabel?: ReactNode
  goodWhen?: 'up' | 'down'
  icon?: LucideIcon
  footer?: ReactNode
  className?: string
}

function StatBody({ label, value, unit, delta, deltaLabel, goodWhen = 'up', icon: Icon, footer }: StatProps) {
  const isGood = delta === undefined ? undefined : goodWhen === 'up' ? delta >= 0 : delta <= 0
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-zinc-500 truncate">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.9} />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5 min-w-0">
        <span className="display text-[30px] font-semibold text-zinc-900 leading-none truncate">{value}</span>
        {unit && <span className="text-sm text-zinc-500 shrink-0">{unit}</span>}
      </div>
      {(delta !== undefined || deltaLabel) && (
        <div className="mt-3 flex items-center gap-2 text-xs min-w-0">
          {delta !== undefined && (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md font-medium tabular shrink-0',
                isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
              )}
            >
              {delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(delta)}%
            </span>
          )}
          {deltaLabel && <span className="text-zinc-500 truncate">{deltaLabel}</span>}
        </div>
      )}
      {footer && <div className="mt-4 pt-4 border-t border-line">{footer}</div>}
    </>
  )
}

/** A single stat on its own card. */
export function StatCard({ className, ...props }: StatProps) {
  return (
    <Card className={clsx('flex flex-col', className)}>
      <StatBody {...props} />
    </Card>
  )
}

/**
 * Several stats on one surface, separated by hairlines: a ledger strip
 * rather than a row of identical boxes. Use with `<Stat>` children.
 */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card padded={false} className={clsx('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 overflow-hidden', className)}>
      {children}
    </Card>
  )
}

export function Stat({ className, ...props }: StatProps) {
  return (
    <div
      className={clsx(
        'flex flex-col p-5 sm:p-6 min-w-0',
        // Hairlines between cells, correct for every column count.
        'border-line border-t sm:border-t-0 first:border-t-0',
        'sm:[&:nth-child(n+3)]:border-t xl:[&:nth-child(n+3)]:border-t-0',
        'sm:[&:nth-child(2n)]:border-l xl:[&:not(:first-child)]:border-l',
        className,
      )}
    >
      <StatBody {...props} />
    </div>
  )
}
