import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { chartColors } from '../ui/ChartFrame'
import { spring, staggerDelay } from '../../motion/tokens'

/**
 * MaterialityMatrix — double-materiality matrix as plain SVG, sized by the
 * ResponsiveContainer inside <ChartFrame> (it receives width/height props).
 *
 *   x = financial materiality (outside-in), y = impact materiality (inside-out),
 *   both 0–5, threshold lines dashed emerald. The top-right quadrant (material
 *   on both axes) carries a faint emerald wash. Points spring in once, then
 *   glide to new positions when a score changes; hover/focus shows a paper
 *   tooltip. Points are keyboard-focusable with a full aria-label.
 */
export interface MatrixPoint {
  id: string
  label: string
  x: number
  y: number
  /** true = material, false = not material, null = not finalised. */
  material: boolean | null
  /** Optional second line in the tooltip (e.g. the CN-SSE topic). */
  sub?: string
}

export interface MaterialityMatrixProps {
  points: MatrixPoint[]
  threshold: number
  width?: number
  height?: number
  onSelect?: (id: string) => void
  selectedId?: string | null
}

const PAD = { top: 30, right: 20, bottom: 40, left: 36 }
const MAX = 5

export default function MaterialityMatrix({ points, threshold, width = 600, height = 420, onSelect, selectedId }: MaterialityMatrixProps) {
  const { t, i18n } = useTranslation()
  const reduce = useReducedMotion()
  const zh = (i18n.language ?? '').startsWith('zh')
  const [hover, setHover] = useState<string | null>(null)
  const w = Math.max(0, width - PAD.left - PAD.right)
  const h = Math.max(0, height - PAD.top - PAD.bottom)
  const sx = (v: number) => PAD.left + (Math.max(0, Math.min(MAX, v)) / MAX) * w
  const sy = (v: number) => PAD.top + h - (Math.max(0, Math.min(MAX, v)) / MAX) * h
  const tick = zh ? 12 : 11
  const narrow = width < 480

  // Spread points that share a cell on a small ring so none hide another.
  const placed = useMemo(() => {
    const groups = new Map<string, MatrixPoint[]>()
    for (const p of points) {
      const k = `${p.x}|${p.y}`
      groups.set(k, [...(groups.get(k) ?? []), p])
    }
    const out: Array<MatrixPoint & { px: number; py: number }> = []
    for (const g of groups.values()) {
      g.forEach((p, i) => {
        const r = g.length > 1 ? 11 : 0
        const a = (i / g.length) * Math.PI * 2 - Math.PI / 2
        out.push({ ...p, px: sx(p.x) + Math.cos(a) * r, py: sy(p.y) + Math.sin(a) * r })
      })
    }
    return out
  }, [points, w, h])

  const tx = sx(threshold)
  const ty = sy(threshold)
  const active = placed.find(p => p.id === (hover ?? selectedId))

  return (
    <svg width={width} height={height} role="img" aria-label={t('materiality.matrix.aria', { count: points.length })} style={{ overflow: 'visible' }}>
      {/* quadrant wash: material on both axes */}
      <rect x={tx} y={PAD.top} width={Math.max(0, PAD.left + w - tx)} height={Math.max(0, ty - PAD.top)} fill={chartColors.s2} opacity={0.07} rx={4} />
      {/* grid */}
      {[0, 1, 2, 3, 4, 5].map(v => (
        <g key={v}>
          <line x1={PAD.left} x2={PAD.left + w} y1={sy(v)} y2={sy(v)} stroke={chartColors.grid} />
          <text x={PAD.left - 10} y={sy(v)} dy={4} textAnchor="end" fontSize={tick} fill={chartColors.axis} className="tabular-nums">{v}</text>
          <text x={sx(v)} y={PAD.top + h + 18} textAnchor="middle" fontSize={tick} fill={chartColors.axis} className="tabular-nums">{v}</text>
        </g>
      ))}
      {/* thresholds */}
      <line x1={tx} x2={tx} y1={PAD.top} y2={PAD.top + h} stroke={chartColors.target} strokeDasharray="4 4" strokeWidth={1.25} />
      <line x1={PAD.left} x2={PAD.left + w} y1={ty} y2={ty} stroke={chartColors.target} strokeDasharray="4 4" strokeWidth={1.25} />
      {/* quadrant captions */}
      {!narrow && (
        <g fontSize={tick} fontWeight={600}>
          <text x={PAD.left + w - 6} y={PAD.top + 16} textAnchor="end" fill={chartColors.target}>{t('materiality.matrix.quadDouble')}</text>
          <text x={PAD.left + 6} y={PAD.top + 16} fill={chartColors.axis}>{t('materiality.matrix.quadImpact')}</text>
          <text x={PAD.left + w - 6} y={ty + 18} textAnchor="end" fill={chartColors.axis}>{t('materiality.matrix.quadFinancial')}</text>
        </g>
      )}
      {/* axis titles */}
      <text x={PAD.left + w} y={height - 4} textAnchor="end" fontSize={tick} fontWeight={600} fill="var(--text-secondary)">{t('materiality.matrix.financialAxis')} →</text>
      {/* y-axis title sits horizontally above the axis — rotated CJK reads sideways */}
      <text x={PAD.left - 10} y={PAD.top - 14} fontSize={tick} fontWeight={600} fill="var(--text-secondary)">↑ {t('materiality.matrix.impactAxis')}</text>

      {/* points */}
      {placed.map((p, i) => {
        const on = p.id === (hover ?? selectedId)
        const fill = p.material === true ? chartColors.s1 : p.material === false ? 'var(--bg-primary)' : chartColors.s3
        const stroke = p.material === false ? chartColors.axis : chartColors.s1
        const short = p.label.length > (zh ? 8 : 16) ? p.label.slice(0, zh ? 7 : 15) + '…' : p.label
        const near = (dir: 1 | -1) => placed.some(o => o.id !== p.id && Math.abs(o.py - p.py) < 14 && (o.px - p.px) * dir > 0 && Math.abs(o.px - p.px) < 130)
        const edgeRight = p.px > PAD.left + w * 0.72
        const rightBlocked = edgeRight || near(1)
        const leftBlocked = p.px < PAD.left + 110 || near(-1)
        const place: 'right' | 'left' | 'above' = !rightBlocked ? 'right' : !leftBlocked ? 'left' : 'above'
        return (
          <motion.g
            key={p.id}
            initial={reduce ? false : { opacity: 0, x: p.px, y: PAD.top + h }}
            animate={{ opacity: 1, x: p.px, y: p.py }}
            transition={reduce ? { duration: 0 } : { ...spring.gentle, delay: staggerDelay(i, 0.04) }}
            tabIndex={0}
            role="button"
            aria-label={t('materiality.matrix.pointAria', { topic: p.label, financial: p.x, impact: p.y })}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(p.id)}
            onBlur={() => setHover(null)}
            onClick={() => onSelect?.(p.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(p.id) } }}
            style={{ cursor: onSelect ? 'pointer' : 'default', outline: 'none' }}
          >
            <circle r={18} fill="transparent" />
            <motion.circle
              r={on ? 8 : 6}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.75}
              animate={{ r: on ? 8 : 6 }}
              transition={spring.snappy}
            />
            {on && <circle r={13} fill="none" stroke={chartColors.s2} strokeOpacity={0.5} strokeWidth={1.5} />}
            {!narrow && (
              <text x={place === 'right' ? 12 : place === 'left' ? -12 : 0} y={place === 'above' ? -14 : 4} textAnchor={place === 'right' ? 'start' : place === 'left' ? 'end' : 'middle'} fontSize={tick} fill={on ? 'var(--text-primary)' : 'var(--text-secondary)'} fontWeight={on ? 600 : 500}>
                {short}
              </text>
            )}
          </motion.g>
        )
      })}

      {/* tooltip */}
      {active && (
        <foreignObject
          x={Math.min(active.px + 14, PAD.left + w - 200)}
          y={Math.max(PAD.top, active.py - 74)}
          width={200}
          height={80}
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-overlay)] px-3 py-2">
            <div className="text-caption font-semibold text-[var(--text-primary)] truncate">{active.label}</div>
            {active.sub && <div className="text-caption text-[var(--text-tertiary)] truncate">{active.sub}</div>}
            <div className="text-caption text-[var(--text-secondary)] tabular-nums mt-0.5">
              {t('materiality.matrix.tipScores', { financial: active.x, impact: active.y })}
            </div>
          </div>
        </foreignObject>
      )}
    </svg>
  )
}
