import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { chartColors, useChartTheme } from '../ui/ChartFrame'
import { Skeleton } from '../Skeleton'
import { useFmt } from '../../lib/fmt'
import useFirstView from './useFirstView'
import type { TargetGap } from './targetGap'

/**
 * TargetGapChart — audit 4.3 target-gap chart.
 *
 *   · actuals: ink line with filled dots (connected across missing years)
 *   · pathway: dashed emerald line from baseline to target
 *   · gap: band between them in --chart-band, only where actuals sit above
 *   · direct label at the last actual: "+2.4k tCO₂e above pathway"
 *   · draws in on first view (mount gated by useFirstView)
 */
export interface TargetGapChartProps {
  gap: TargetGap
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  footnote?: ReactNode
  height?: number
  framed?: boolean
  className?: string
}

export default function TargetGapChart({ gap, title, subtitle, actions, footnote, height = 240, framed = true, className = '' }: TargetGapChartProps) {
  const { t } = useTranslation()
  const f = useFmt()
  const ct = useChartTheme()
  const [ref, seen] = useFirstView<HTMLDivElement>()
  const unit = gap.target.baseline_unit || 'tCO2e'

  const data = useMemo(() => gap.rows.map(r => ({ ...r })), [gap.rows])
  const lastIdx = gap.latestYear != null ? data.findIndex(r => r.year === gap.latestYear) : -1
  const targetIdx = data.length - 1

  const gapLabel =
    gap.gap == null
      ? null
      : gap.gap > 0
        ? t('analytics.targetChart.above', { value: f.compact(gap.gap), unit: f.unit(unit) })
        : t('analytics.targetChart.below', { value: f.compact(Math.abs(gap.gap)), unit: f.unit(unit) })

  return (
    <div ref={ref} className={className}>
      {!seen ? (
        <div className={framed ? 'surface-paper p-5' : ''}>
          <Skeleton className="w-full" height={height + (title ? 44 : 0)} rounded="lg" />
        </div>
      ) : (
        <ChartFrame
          title={title}
          subtitle={subtitle}
          actions={actions}
          height={height}
          framed={framed}
          footnote={footnote}
          legend={[
            { label: t('analytics.targetChart.actual'), color: chartColors.ink },
            { label: t('analytics.targetChart.pathway'), color: chartColors.target, dashed: true },
          ]}
        >
          <ComposedChart data={data} margin={{ ...ct.margin, top: 28, right: 28 }}>
            <CartesianGrid {...ct.grid} />
            <XAxis dataKey="year" {...ct.xAxis} />
            <YAxis {...ct.yAxis} domain={[0, 'auto']} />
            <Tooltip
              {...ct.tooltip({ unit })}
              content={(p: { active?: boolean; label?: unknown; payload?: Array<{ dataKey?: unknown; value?: unknown }> }) => (
                <GapTooltip active={p.active} label={p.label} payload={p.payload} unit={unit} />
              )}
            />
            <Area
              dataKey="band"
              stroke="none"
              fill={chartColors.band}
              fillOpacity={1}
              isAnimationActive
              animationDuration={700}
              activeDot={false}
              connectNulls={false}
              name="band"
            />
            <Line
              dataKey="pathway"
              name={t('analytics.targetChart.pathway')}
              stroke={chartColors.target}
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: chartColors.target }}
              isAnimationActive
              animationDuration={700}
            />
            <Line
              dataKey="actual"
              name={t('analytics.targetChart.actual')}
              stroke={chartColors.ink}
              strokeWidth={2}
              connectNulls
              dot={{ r: 3.5, fill: chartColors.ink, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--bg-primary)', fill: chartColors.ink }}
              isAnimationActive
              animationDuration={800}
              label={(props: { index?: number; x?: number | string; y?: number | string }) => {
                if (props.index !== lastIdx || gapLabel == null || props.x == null || props.y == null) return <g />
                const x = Number(props.x)
                const y = Number(props.y)
                const anchorEnd = lastIdx > data.length * 0.6
                return (
                  <text
                    x={anchorEnd ? x - 8 : x + 8}
                    y={y - 10}
                    textAnchor={anchorEnd ? 'end' : 'start'}
                    fill={gap.gap != null && gap.gap > 0 ? chartColors.risk : chartColors.target}
                    fontSize={12}
                    fontWeight={600}
                  >
                    {gapLabel}
                  </text>
                )
              }}
            />
            <ReferenceDot
              x={data[targetIdx]?.year}
              y={gap.targetValue}
              r={4}
              fill="var(--bg-primary)"
              stroke={chartColors.target}
              strokeWidth={2}
              label={{
                value: t('analytics.targetChart.target', { year: gap.target.target_year }),
                position: 'insideTopRight',
                offset: 10,
                fill: chartColors.target,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          </ComposedChart>
        </ChartFrame>
      )}
    </div>
  )
}

function GapTooltip({ active, label, payload, unit }: { active?: boolean; label?: unknown; payload?: Array<{ dataKey?: unknown; value?: unknown }>; unit: string }) {
  const { t } = useTranslation()
  const f = useFmt()
  if (!active || !payload?.length) return null
  const get = (k: string) => {
    const v = payload.find(p => p.dataKey === k)?.value
    return typeof v === 'number' ? v : null
  }
  const actual = get('actual')
  const pathway = get('pathway')
  const diff = actual != null && pathway != null ? actual - pathway : null
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-overlay)] px-3 py-2.5 min-w-[180px]">
      <div className="text-caption text-[var(--text-tertiary)] mb-1.5">{t('analytics.targetChart.fy', { year: String(label) })}</div>
      <Row color={chartColors.ink} name={t('analytics.targetChart.actual')} value={actual} unit={unit} />
      <Row color={chartColors.target} name={t('analytics.targetChart.pathway')} value={pathway} unit={unit} />
      {diff != null && (
        <div className={`mt-1.5 pt-1.5 border-t border-[var(--border-subtle)] text-caption font-semibold tabular-nums ${diff > 0 ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>
          {diff > 0
            ? t('analytics.targetChart.above', { value: f.number(diff, { maxFraction: 0 }), unit: f.unit(unit) })
            : t('analytics.targetChart.below', { value: f.number(Math.abs(diff), { maxFraction: 0 }), unit: f.unit(unit) })}
        </div>
      )}
    </div>
  )
}

function Row({ color, name, value, unit }: { color: string; name: string; value: number | null; unit: string }) {
  const f = useFmt()
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="inline-flex items-center gap-1.5 text-caption text-[var(--text-secondary)]">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} aria-hidden />
        {name}
      </span>
      <span className="text-[16px] leading-5 font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">
        {value == null ? '—' : f.number(value, { maxFraction: 0 })}
        {value != null && <span className="text-caption text-[var(--text-tertiary)] font-medium ml-1">{f.unit(unit)}</span>}
      </span>
    </div>
  )
}
