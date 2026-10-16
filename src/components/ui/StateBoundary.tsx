import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState, { type EmptyStateProps } from '../EmptyState'
import { SkeletonText } from '../Skeleton'

/**
 * StateBoundary — truthful async states. It decides, in this order:
 *
 *   1. error    → error state with Retry (never an "all done" message)
 *   2. loading  → skeleton (only while there is no data yet; with data it
 *                 keeps showing children so refreshes don't flash)
 *   3. empty    → the empty/cleared/filtered state you describe
 *   4. children
 *
 *   <StateBoundary
 *     loading={loading}
 *     error={error}
 *     onRetry={reload}
 *     empty={rows.length === 0}
 *     emptyState={{ variant: 'cleared', title: t('queue.clearedTitle') }}
 *     skeleton={<SkeletonTable rows={5} />}
 *   >
 *     <QueueList rows={rows} />
 *   </StateBoundary>
 *
 * `hasData` lets a refresh keep stale content on screen (stale-while-
 * revalidate). `error` may be a string, an Error or any truthy value.
 */
export interface StateBoundaryProps {
  loading?: boolean
  error?: unknown
  empty?: boolean
  /** True when previously loaded data is still on screen (keeps children during refresh). */
  hasData?: boolean
  onRetry?: () => void
  /** Custom loading UI. Default: three skeleton lines. */
  skeleton?: ReactNode
  /** Props for the empty state, or a custom node. */
  emptyState?: EmptyStateProps | ReactNode
  /** Props overriding the error state (title/body/cta), or a custom node. */
  errorState?: EmptyStateProps | ReactNode
  /** Compact padding (for in-card regions). */
  compact?: boolean
  children: ReactNode | (() => ReactNode)
}

function isProps(x: unknown): x is EmptyStateProps {
  return !!x && typeof x === 'object' && !('$$typeof' in (x as object)) && !Array.isArray(x)
}

function messageOf(err: unknown): string | null {
  if (!err) return null
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err && 'message' in err) return String((err as { message: unknown }).message)
  return null
}

export default function StateBoundary({
  loading = false,
  error,
  empty = false,
  hasData = false,
  onRetry,
  skeleton,
  emptyState,
  errorState,
  compact = false,
  children,
}: StateBoundaryProps) {
  const { t } = useTranslation()
  const density = compact ? 'compact' : 'comfortable'

  if (error) {
    if (errorState && !isProps(errorState)) return <>{errorState}</>
    return (
      <EmptyState
        variant="error"
        density={density}
        onRetry={onRetry}
        detail={messageOf(error)}
        {...(isProps(errorState) ? errorState : {})}
      />
    )
  }

  if (loading && !hasData) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">{t('ui.state.loading')}</span>
        {skeleton ?? (
          <div className={compact ? 'py-4' : 'py-8'}>
            <SkeletonText lines={3} />
          </div>
        )}
      </div>
    )
  }

  if (empty) {
    if (emptyState && !isProps(emptyState)) return <>{emptyState}</>
    return <EmptyState density={density} {...(isProps(emptyState) ? emptyState : {})} />
  }

  return <>{typeof children === 'function' ? (children as () => ReactNode)() : children}</>
}
