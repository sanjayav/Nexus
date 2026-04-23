import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState } from 'react'
import { popIn } from '../../components/motion'

interface MetricCardProps {
  label: string
  value: string | number
  delta?: string | number
  trend?: { value: number; label?: string; invert?: boolean }
  icon?: React.ReactNode
  accent?: 'teal' | 'blue' | 'purple' | 'amber' | 'red' | 'green'
  sub?: string
  index?: number
  className?: string
  children?: React.ReactNode
}

const accentMap: Record<NonNullable<MetricCardProps['accent']>, string> = {
  teal:   'var(--color-brand-strong)',
  blue:   'var(--accent-blue)',
  purple: 'var(--accent-purple)',
  amber:  'var(--accent-amber)',
  red:    'var(--accent-red)',
  green:  'var(--status-ok)',
}

/**
 * MetricCard — restrained, Linear/Attio/Stripe enterprise feel.
 * No 3D tilt, no glass, no neon. One thin accent bar, flat icon chip,
 * spring count-up for the numeric reveal — nothing else.
 */
export default function MetricCard({
  label,
  value,
  trend,
  icon,
  accent = 'teal',
  sub,
  index = 0,
  className = '',
  children,
}: MetricCardProps) {
  const color = accentMap[accent]
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value))
  const isPct = typeof value === 'string' && value.trim().endsWith('%')

  const trendDelta = trend?.value ?? 0
  const inv = trend?.invert ?? false
  const goodWhenNegative = !inv
  const trendState =
    trendDelta === 0
      ? 'flat'
      : (trendDelta > 0) === goodWhenNegative
        ? 'bad'
        : 'good'

  const trendColor =
    trendState === 'good'
      ? 'text-[var(--accent-green)] bg-[var(--accent-green-light)]'
      : trendState === 'bad'
        ? 'text-[var(--accent-red)] bg-[var(--accent-red-light)]'
        : 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]'

  const TrendIcon = trend ? (trendDelta > 0 ? TrendingUp : trendDelta < 0 ? TrendingDown : Minus) : null

  return (
    <motion.div
      {...popIn(index)}
      className={`surface-paper p-5 relative ${className}`}
    >
      {/* Top rail — 1px accent stripe, no glow */}
      <span
        aria-hidden
        className="absolute top-0 left-0 h-[2px] rounded-b-full"
        style={{ width: 28, background: color }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10.5px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.14em]">
          {label}
        </span>
        {icon && (
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg-secondary)', color }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <CountUp
          value={numericValue}
          isPct={isPct}
          className="font-display text-[28px] leading-none font-bold tracking-[-0.02em] text-[var(--text-primary)] tabular-nums"
        />
        {sub && (
          <span className="text-[12.5px] text-[var(--text-tertiary)] tabular-nums">{sub}</span>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[11px] font-semibold ${trendColor}`}>
            {TrendIcon && <TrendIcon className="w-3 h-3" />}
            {trend.value > 0 ? '+' : ''}
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-[11px] text-[var(--text-tertiary)]">{trend.label}</span>
          )}
        </div>
      )}

      {children && <div className="mt-3">{children}</div>}
    </motion.div>
  )
}

/** Animated number counter — springs from 0 to target on mount. */
function CountUp({ value, isPct, className }: { value: number; isPct: boolean; className: string }) {
  const [display, setDisplay] = useState('0')
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 90, damping: 22, mass: 1 })
  const rounded = useTransform(spring, (v) => {
    if (!isFinite(value)) return '—'
    if (isPct) return Math.round(v) + '%'
    if (Math.abs(value) >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
    if (Math.abs(value) >= 1_000) return (v / 1_000).toFixed(1) + 'k'
    return Math.round(v).toLocaleString()
  })

  useEffect(() => {
    mv.set(value)
  }, [mv, value])

  useMotionValueEvent(rounded, 'change', (v) => setDisplay(v))

  return <span className={className}>{display}</span>
}
