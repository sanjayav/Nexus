import { useReducedMotion } from 'framer-motion'

/**
 * Premium skeleton screens — quiet placeholders matching the
 * `card-premium` aesthetic. Respects `prefers-reduced-motion`.
 *
 *   <Skeleton className="h-4 w-32" />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 *   <SkeletonTable rows={5} cols={5} />
 */

type Rounded = 'sm' | 'md' | 'lg' | 'full'

interface SkeletonProps {
  className?: string
  rounded?: Rounded
}

const ROUNDED: Record<Rounded, string> = {
  sm:   'rounded',
  md:   'rounded-lg',
  lg:   'rounded-xl',
  full: 'rounded-full',
}

export function Skeleton({ className = '', rounded = 'md' }: SkeletonProps) {
  const reduce = useReducedMotion()
  return (
    <div
      aria-hidden
      className={`bg-white/[0.04] ${ROUNDED[rounded]} ${reduce ? '' : 'animate-pulse'} ${className}`}
    />
  )
}

export function SkeletonText({
  lines = 3,
  className = '',
}: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card-premium space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <SkeletonText lines={3} />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}

export function SkeletonTable({
  rows = 5,
  cols = 5,
}: { rows?: number; cols?: number }) {
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
  return (
    <div className="space-y-2">
      <div className="grid gap-4" style={gridStyle}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 w-3/4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`r-${r}`}
          className="grid gap-4 py-2 border-t border-white/[0.04]"
          style={gridStyle}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`c-${r}-${c}`} className="h-3" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default Skeleton
