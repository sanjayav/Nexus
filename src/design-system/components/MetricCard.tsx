import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Card from './Card'

interface MetricCardProps {
  label: string
  value: string | number
  trend?: { value: number; label?: string }
  icon?: React.ReactNode
  accentColor?: string
  className?: string
}

export default function MetricCard({ label, value, trend, icon, accentColor, className = '' }: MetricCardProps) {
  // For emissions: down is good (green), up is bad (red)
  const trendColor = trend
    ? trend.value > 0
      ? 'text-[var(--accent-red)]'
      : trend.value < 0
        ? 'text-[var(--accent-green)]'
        : 'text-[var(--text-tertiary)]'
    : ''

  const trendBg = trend
    ? trend.value > 0
      ? 'bg-[var(--accent-red-light)]'
      : trend.value < 0
        ? 'bg-[var(--accent-green-light)]'
        : 'bg-[var(--bg-tertiary)]'
    : ''

  const TrendIcon = trend
    ? trend.value > 0 ? TrendingUp
    : trend.value < 0 ? TrendingDown
    : Minus
    : null

  return (
    <Card hover className={`group relative overflow-hidden ${className}`}>
      {/* Subtle accent gradient at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
        style={{
          background: accentColor
            ? `linear-gradient(90deg, ${accentColor}, transparent)`
            : 'linear-gradient(90deg, var(--accent-teal), transparent)',
        }}
      />

      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em]">
          {label}
        </span>
        {icon && (
          <span className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">
            {icon}
          </span>
        )}
      </div>

      <div className="font-display text-[var(--text-4xl)] font-bold text-[var(--text-primary)] leading-none tracking-tight tabular-nums">
        {value}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${trendColor} ${trendBg}`}>
            {TrendIcon && <TrendIcon className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span className="text-[11px] text-[var(--text-tertiary)]">{trend.label}</span>
          )}
        </div>
      )}
    </Card>
  )
}
