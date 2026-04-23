interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export default function Skeleton({ width = '100%', height = 16, className = '', rounded = 'sm' }: SkeletonProps) {
  const radius =
    rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : rounded === 'md' ? 'rounded-md' : 'rounded-sm'
  return (
    <span
      className={`skeleton ${radius} ${className}`}
      style={{ display: 'block', width, height }}
      aria-hidden
    />
  )
}

export function SkeletonLines({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={10} width={`${100 - i * 8}%`} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`surface-paper p-5 ${className}`}>
      <Skeleton width={90} height={10} />
      <div className="mt-3">
        <Skeleton width={160} height={28} rounded="md" />
      </div>
      <div className="mt-3">
        <SkeletonLines lines={2} />
      </div>
    </div>
  )
}
