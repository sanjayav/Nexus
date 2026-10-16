import type { CSSProperties } from 'react'

/**
 * Skeleton — the one loading placeholder. A shimmer sweeps across
 * `--bg-tertiary` (visible in light and dark; see `.skeleton` in index.css).
 * Reduced motion stops the sweep (global CSS guard).
 *
 *   <Skeleton className="h-4 w-32" />            // Tailwind sizing
 *   <Skeleton width={160} height={28} />          // explicit sizing
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 *   <SkeletonTable rows={5} cols={5} />
 *   <SkeletonLedger items={4} />
 *   <SkeletonPage />                              // route-level fallback
 *
 * `design-system/components/Skeleton` re-exports these.
 */

type Rounded = 'sm' | 'md' | 'lg' | 'full'

export interface SkeletonProps {
  className?: string
  rounded?: Rounded
  width?: string | number
  height?: string | number
  style?: CSSProperties
}

const ROUNDED: Record<Rounded, string> = {
  sm: 'rounded-[var(--radius-xs)]',
  md: 'rounded-[var(--radius-sm)]',
  lg: 'rounded-[var(--radius-md)]',
  full: 'rounded-full',
}

export function Skeleton({ className = '', rounded = 'md', width, height, style }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={`skeleton ${ROUNDED[rounded]} ${className}`}
      style={{ width, height, ...style }}
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

/** Alias with the design-system signature (lines narrow by 8 % each). */
export function SkeletonLines({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={10} width={`${100 - i * 8}%`} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`surface-paper p-5 space-y-4 ${className}`} aria-hidden>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-40" />
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonTable({
  rows = 5,
  cols = 5,
  className = '',
  framed = false,
}: { rows?: number; cols?: number; className?: string; /** Wrap in a paper card. */ framed?: boolean }) {
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
  return (
    <div className={`${framed ? 'surface-paper' : 'rounded-[var(--radius-xl)] border border-[var(--border-subtle)]'} overflow-hidden ${className}`} aria-hidden>
      <div className="grid gap-4 px-4 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-default)]" style={gridStyle}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-2.5 w-2/3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="grid gap-4 px-4 py-3.5 border-b border-[var(--border-subtle)] last:border-b-0" style={gridStyle}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`c-${r}-${c}`} className={`h-3 ${c === 0 ? 'w-5/6' : (r + c) % 3 === 0 ? 'w-1/2' : 'w-3/4'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonLedger({ items = 4, className = '' }: { items?: number; className?: string }) {
  return (
    <div className={`surface-paper overflow-hidden ${className}`} aria-hidden>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border-subtle)]">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="bg-[var(--bg-primary)] px-5 py-5 space-y-3">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Route-level placeholder: page header, ledger strip and a table. */
export function SkeletonPage({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-7 ${className}`} aria-hidden>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <SkeletonLedger />
      <SkeletonTable rows={6} cols={4} framed />
    </div>
  )
}

export default Skeleton
