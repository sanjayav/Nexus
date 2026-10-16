import { motion, useReducedMotion } from 'framer-motion'
import { useId, useMemo } from 'react'
import { ease } from '../../motion/tokens'

/**
 * Sparkline — 48 × 16 trend line for ledger figures. Real data only: pass the
 * series the figure is computed from (fewer than two points renders nothing).
 * Draws in once (pathLength); last point gets a dot.
 */
export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  /** CSS colour; defaults to the series ink token. */
  color?: string
  /** Soft area fill under the line. Default true. */
  area?: boolean
  className?: string
  'aria-label'?: string
}

export default function Sparkline({ data, width = 48, height = 16, color = 'var(--chart-s2)', area = true, className = '', 'aria-label': label }: SparklineProps) {
  const reduce = useReducedMotion()
  const gid = useId().replace(/:/g, '')
  const geo = useMemo(() => {
    const pts = data.filter((n) => Number.isFinite(n))
    if (pts.length < 2) return null
    const min = Math.min(...pts)
    const max = Math.max(...pts)
    const span = max - min || 1
    const pad = 2
    const xy = pts.map((v, i) => [
      (i / (pts.length - 1)) * (width - pad * 2) + pad,
      height - pad - ((v - min) / span) * (height - pad * 2),
    ])
    const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')
    const fill = `${line}L${xy[xy.length - 1][0].toFixed(1)} ${height}L${xy[0][0].toFixed(1)} ${height}Z`
    return { line, fill, last: xy[xy.length - 1] }
  }, [data, width, height])

  if (!geo) return null
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible flex-shrink-0 ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ color }}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={`spk-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={geo.fill} fill={`url(#spk-${gid})`} />
        </>
      )}
      <motion.path
        d={geo.line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: ease.out }}
      />
      <circle cx={geo.last[0]} cy={geo.last[1]} r={1.75} fill="currentColor" />
    </svg>
  )
}
