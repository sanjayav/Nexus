import { Skeleton as BaseSkeleton, type SkeletonProps } from '../../components/Skeleton'

/**
 * Design-system entry for the one Skeleton (implementation lives in
 * `components/Skeleton`). The default export keeps this module's historic
 * defaults: full width, 16 px tall.
 */
export default function Skeleton({ width = '100%', height = 16, rounded = 'sm', ...rest }: SkeletonProps) {
  return <BaseSkeleton width={width} height={height} rounded={rounded} {...rest} />
}

export { SkeletonLines, SkeletonCard, SkeletonText, SkeletonTable, SkeletonLedger, SkeletonPage } from '../../components/Skeleton'
export type { SkeletonProps }
