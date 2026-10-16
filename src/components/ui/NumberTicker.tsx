import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useMemo, useRef } from 'react'
import { useFmt, type Numeric } from '../../lib/fmt'
import { spring } from '../../motion/tokens'

/**
 * NumberTicker — per-digit vertical roll (odometer), tabular figures.
 *
 * Each digit is a 0–9 column translated by −n em with the `ticker` spring.
 * It rolls once when first scrolled into view, then on every value change.
 * Formatting goes through `fmt` (locale-aware, 万/亿 when compact in zh).
 * Screen readers get the formatted value once; the columns are aria-hidden.
 * Reduced motion: renders the final value, no roll.
 *
 *   <NumberTicker value={14} format="percent" />
 *   <NumberTicker value={19373.4} format="compact" />
 *   <NumberTicker value={1937.3} format={(n) => f.exact(n, 'tCO2e')} />
 */
export type TickerFormat = 'number' | 'integer' | 'percent' | 'compact' | ((n: number) => string)

export interface NumberTickerProps {
  value: Numeric
  format?: TickerFormat
  /** Fraction digits for 'number' / 'percent'. */
  precision?: number
  className?: string
  /** Roll from zero on first view (default true). */
  rollOnMount?: boolean
  /** Accessible label override (defaults to the formatted value). */
  'aria-label'?: string
}

export default function NumberTicker({
  value,
  format = 'integer',
  precision,
  className = '',
  rollOnMount = true,
  'aria-label': ariaLabel,
}: NumberTickerProps) {
  const f = useFmt()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduce = useReducedMotion()

  const text = useMemo(() => {
    const n = f.toNumber(value)
    if (n == null) return '—'
    if (typeof format === 'function') return format(n)
    switch (format) {
      case 'percent':
        return f.percent(n, { precision })
      case 'compact':
        return f.compact(n)
      case 'number':
        return f.number(n, { precision })
      default:
        return f.number(Math.round(n), { precision: 0 })
    }
  }, [value, format, precision, f])

  const settled = reduce || !rollOnMount || inView
  const chars = Array.from(text)

  return (
    <span
      ref={ref}
      className={`nx-ticker inline-flex items-start tabular-nums ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
      role="text"
      aria-label={ariaLabel ?? text}
    >
      {chars.map((ch, i) => {
        // Key from the right so existing columns keep identity as digits are added.
        const key = chars.length - i
        const d = ch.charCodeAt(0) - 48
        if (d < 0 || d > 9) {
          return (
            <span key={`s${key}-${ch}`} aria-hidden style={{ height: '1em', lineHeight: 1, whiteSpace: 'pre' }}>
              {ch}
            </span>
          )
        }
        return <DigitColumn key={`d${key}`} digit={settled ? d : 0} animate={!reduce} />
      })}
    </span>
  )
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

function DigitColumn({ digit, animate }: { digit: number; animate: boolean }) {
  return (
    <span
      aria-hidden
      className="relative block overflow-hidden"
      style={{ height: '1em', lineHeight: 1 }}
    >
      {/* Invisible sizer keeps the column exactly one tabular digit wide. */}
      <span className="invisible block">0</span>
      <motion.span
        className="absolute left-0 top-0 flex flex-col"
        initial={false}
        animate={{ y: `${-digit}em` }}
        transition={animate ? spring.ticker : { duration: 0 }}
      >
        {DIGITS.map((n) => (
          <span key={n} style={{ height: '1em', lineHeight: 1 }}>
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  )
}
