import { useEffect, useState } from 'react'
import { useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'

/**
 * Counts from previous value to the current one with a spring.
 * Uses useMotionValueEvent (the correct subscribe API) to pipe spring
 * updates into React state without violating render-phase rules.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 90, damping: 22, mass: 1 })
  const [display, setDisplay] = useState(format(value))

  useEffect(() => { mv.set(value) }, [mv, value])

  useMotionValueEvent(spring, 'change', (latest) => {
    setDisplay(format(latest))
  })

  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</span>
}

export function formatBig(n: number | string | null | undefined): string {
  // Defensive coercion — Postgres NUMERIC columns arrive as strings over JSON.
  const num = typeof n === 'number' ? n : n == null ? NaN : Number(n)
  if (!isFinite(num)) return '—'
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + 'k'
  return num.toFixed(0)
}

export function formatPct(n: number): string {
  return Math.round(n) + '%'
}
