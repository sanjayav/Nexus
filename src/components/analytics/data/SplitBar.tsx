import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { dur, ease } from '../../../motion/tokens'

/**
 * SplitBar — one proportion bar made of segments (fully / partially /
 * omitted, direct / hybrid, mapped / unmapped). Segments grow from the left
 * once in view; a key with exact counts sits underneath when `legend` is set.
 */
export interface SplitSegment {
  id: string
  value: number
  color: string
  label?: ReactNode
  /** Formatted value for the key (defaults to the raw number). */
  display?: ReactNode
}

export interface SplitBarProps {
  segments: SplitSegment[]
  /** Denominator; defaults to the sum of segments (a remainder shows as track). */
  total?: number
  height?: number
  legend?: boolean
  className?: string
  'aria-label'?: string
}

export default function SplitBar({ segments, total, height = 8, legend = false, className = '', 'aria-label': ariaLabel }: SplitBarProps) {
  const reduce = useReducedMotion()
  const sum = segments.reduce((a, s) => a + Math.max(0, s.value), 0)
  const denom = total ?? sum
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)] gap-[2px]"
        style={{ height }}
      >
        {denom > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s, i) => (
              <motion.span
                key={s.id}
                className="h-full first:rounded-l-full last:rounded-r-full origin-left"
                style={{ width: `${(s.value / denom) * 100}%`, background: s.color }}
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: dur.slow, ease: ease.out, delay: 0.08 + i * 0.06 }}
              />
            ))}
      </div>
      {legend && (
        <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-caption text-[var(--text-secondary)]">
          {segments.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} aria-hidden />
              {s.label}
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">{s.display ?? s.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
