import { useMemo, type ReactElement, type ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'
import { useFmt } from '../../lib/fmt'
import StateBoundary from './StateBoundary'
import { Skeleton } from '../Skeleton'

/**
 * ChartFrame — the Nexus wrapper around a Recharts chart.
 *
 * Style rules (applied through `useChartTheme()`):
 *   · horizontal gridlines only, 1 px --chart-grid, no axis lines
 *   · ticks 11 px (12 px in zh), tabular, --chart-axis
 *   · token colours: scopes are an emerald ordinal scale (s1 → s3), actuals
 *     are ink, targets dashed emerald, risk/gap in --chart-risk
 *   · direct end-of-line labels (`endLabel`) instead of detached legends
 *   · area fills 12 % → 0 % (`<AreaGradient/>`), bars with 4 px top radius
 *   · tooltip = paper card, 12 px caption, 16 px tabular value
 *
 *   const ct = useChartTheme()
 *   <ChartFrame title={t('…')} subtitle="tCO₂e" height={260} empty={!rows.length} loading={loading}>
 *     <AreaChart data={rows} margin={ct.margin}>
 *       <defs><AreaGradient id="s1" color={chartColors.s1} /></defs>
 *       <CartesianGrid {...ct.grid} />
 *       <XAxis dataKey="year" {...ct.xAxis} />
 *       <YAxis {...ct.yAxis} />
 *       <Tooltip {...ct.tooltip({ unit: 'tCO2e' })} />
 *       <Area dataKey="scope1" name="Scope 1" stroke={chartColors.s1} fill="url(#s1)" {...ct.series}
 *             label={endLabel('Scope 1', chartColors.s1, rows.length - 1)} />
 *     </AreaChart>
 *   </ChartFrame>
 */

export const chartColors = {
  s1: 'var(--chart-s1)',
  s2: 'var(--chart-s2)',
  s3: 'var(--chart-s3)',
  ink: 'var(--chart-ink)',
  target: 'var(--chart-target)',
  risk: 'var(--chart-risk)',
  band: 'var(--chart-band)',
  c4: 'var(--chart-c4)',
  c5: 'var(--chart-c5)',
  c6: 'var(--chart-c6)',
  c7: 'var(--chart-c7)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
} as const

/** Ordered categorical series (scope scale first, then extras). */
export const seriesPalette = [chartColors.s1, chartColors.s2, chartColors.s3, chartColors.c4, chartColors.c5, chartColors.c6, chartColors.c7]

export interface LegendKey {
  label: ReactNode
  color: string
  dashed?: boolean
}

export interface ChartFrameProps {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  /** Plot height in px. Default 240. */
  height?: number
  /** Compact key under the title — prefer direct labels when lines ≤ 4. */
  legend?: LegendKey[]
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  empty?: boolean
  emptyTitle?: string
  emptyBody?: string
  footnote?: ReactNode
  /** Paper card chrome. Default true. */
  framed?: boolean
  className?: string
  /** A single Recharts chart element. */
  children: ReactElement
}

export default function ChartFrame({
  title,
  subtitle,
  actions,
  height = 240,
  legend,
  loading,
  error,
  onRetry,
  empty,
  emptyTitle,
  emptyBody,
  footnote,
  framed = true,
  className = '',
  children,
}: ChartFrameProps) {
  const { t } = useTranslation()
  return (
    <figure className={`${framed ? 'surface-paper p-5' : ''} min-w-0 ${className}`}>
      {(title || actions || subtitle) && (
        <figcaption className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            {title && <div className="type-h3 text-[var(--text-primary)]">{title}</div>}
            {subtitle && <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </figcaption>
      )}
      {legend && legend.length > 0 && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-caption text-[var(--text-secondary)]">
          {legend.map((k, i) => (
            <li key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <svg width="14" height="6" aria-hidden>
                <line x1="0" y1="3" x2="14" y2="3" stroke={k.color} strokeWidth="2" strokeDasharray={k.dashed ? '3 2' : undefined} strokeLinecap="round" />
              </svg>
              {k.label}
            </li>
          ))}
        </ul>
      )}
      <StateBoundary
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={empty}
        compact
        skeleton={<Skeleton className="w-full" height={height} rounded="lg" />}
        emptyState={{ art: 'noData', title: emptyTitle ?? t('ui.chart.noData'), body: emptyBody, density: 'compact' }}
      >
        <div style={{ height }} className="w-full min-w-0 [&_.recharts-cartesian-axis-tick_text]:tabular-nums">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </StateBoundary>
      {footnote && <div className="mt-3 text-caption text-[var(--text-tertiary)]">{footnote}</div>}
    </figure>
  )
}

/* ── Theme props ───────────────────────────────────────────────────────── */

export interface TooltipOpts {
  unit?: string
  /** Format each value; default exact grouped number. */
  format?: (v: number) => string
  /** Format the header label (x value). */
  labelFormat?: (label: unknown) => ReactNode
}

export function useChartTheme() {
  const { i18n } = useTranslation()
  const f = useFmt()
  const zh = (i18n.language ?? '').startsWith('zh')
  return useMemo(() => {
    const tick = { fill: chartColors.axis, fontSize: zh ? 12 : 11 }
    return {
      margin: { top: 8, right: 16, bottom: 0, left: 0 },
      grid: { stroke: chartColors.grid, vertical: false, strokeDasharray: undefined as string | undefined },
      xAxis: { axisLine: false, tickLine: false, tick, tickMargin: 8, minTickGap: 12 },
      yAxis: {
        axisLine: false,
        tickLine: false,
        tick,
        tickMargin: 6,
        width: 48,
        tickFormatter: (v: number) => f.compact(v),
      },
      series: { isAnimationActive: true, animationDuration: 600, animationEasing: 'ease-out' as const, strokeWidth: 2, dot: false, activeDot: { r: 4, strokeWidth: 2, stroke: 'var(--bg-primary)' } },
      bar: { radius: [4, 4, 0, 0] as [number, number, number, number], isAnimationActive: true, animationDuration: 500, animationEasing: 'ease-out' as const },
      tooltip: (o: TooltipOpts = {}) => ({
        cursor: { stroke: 'var(--border-strong)', strokeDasharray: '3 3', fill: 'var(--bg-hover)' },
        content: (p: TooltipContentProps) => <ChartTooltip {...p} {...o} />,
        wrapperStyle: { outline: 'none' },
      }),
    }
  }, [zh, f])
}

interface TooltipContentProps {
  active?: boolean
  label?: unknown
  payload?: Array<{ name?: ReactNode; value?: number | string; color?: string; stroke?: string; fill?: string; dataKey?: unknown }>
}

export function ChartTooltip({ active, label, payload, unit, format, labelFormat }: TooltipContentProps & TooltipOpts) {
  const f = useFmt()
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-overlay)] px-3 py-2.5 min-w-[140px]">
      {label != null && label !== '' && (
        <div className="text-caption text-[var(--text-tertiary)] mb-1.5">{labelFormat ? labelFormat(label) : String(label)}</div>
      )}
      <ul className="space-y-1">
        {payload.map((p, i) => {
          const n = typeof p.value === 'number' ? p.value : f.toNumber(p.value)
          const color = p.color ?? p.stroke ?? (typeof p.fill === 'string' && !p.fill.startsWith('url(') ? p.fill : chartColors.s2)
          return (
            <li key={i} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-caption text-[var(--text-secondary)] min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} aria-hidden />
                <span className="truncate">{p.name}</span>
              </span>
              <span className="text-[16px] leading-5 font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                {n == null ? '—' : format ? format(n) : f.number(n)}
                {unit && <span className="text-caption text-[var(--text-tertiary)] font-medium ml-1">{f.unit(unit)}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** 12 % → 0 % vertical area fill. Place inside the chart's <defs>. */
export function AreaGradient({ id, color, from = 0.12 }: { id: string; color: string; from?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={from} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  )
}

/**
 * Direct end-of-series label for a Line/Area `label` prop: renders `name`
 * beside the last point only.
 */
export function endLabel(name: string, color: string, lastIndex: number) {
  return function EndLabel(props: { x?: number | string; y?: number | string; index?: number }) {
    if (props.index !== lastIndex || props.x == null || props.y == null) return null
    return (
      <text x={Number(props.x) + 8} y={Number(props.y)} dy={4} fill={color} fontSize={11} fontWeight={600}>
        {name}
      </text>
    )
  }
}
