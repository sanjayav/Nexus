import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { chartColors, useChartTheme } from '../ui/ChartFrame'
import { Skeleton } from '../Skeleton'
import useFirstView from './useFirstView'

/**
 * ScopeBars — stacked Scope 1/2/3 bars on the emerald ordinal scale
 * (s1 darkest → s3 lightest), 2 px gaps between segments, 4 px top radius on
 * the top segment, horizontal grid only, bars grow on first view.
 */
export interface ScopeRow {
  label: string
  s1: number
  s2: number
  s3: number
}

export interface ScopeBarsProps {
  rows: ScopeRow[]
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  footnote?: ReactNode
  height?: number
  unit?: string
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  emptyTitle?: string
  emptyBody?: string
  className?: string
}

export default function ScopeBars({ rows, title, subtitle, actions, footnote, height = 240, unit = 'tCO2e', loading, error, onRetry, emptyTitle, emptyBody, className = '' }: ScopeBarsProps) {
  const { t } = useTranslation()
  const ct = useChartTheme()
  const [ref, seen] = useFirstView<HTMLDivElement>()
  const many = rows.length > 4
  return (
    <div ref={ref} className={className}>
      {!seen ? (
        <div className="surface-paper p-5"><Skeleton className="w-full" height={height + 44} rounded="lg" /></div>
      ) : (
        <ChartFrame
          title={title}
          subtitle={subtitle}
          actions={actions}
          footnote={footnote}
          height={height}
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={!loading && !error && rows.length === 0}
          emptyTitle={emptyTitle}
          emptyBody={emptyBody}
          legend={[
            { label: t('analytics.scopes.s1'), color: chartColors.s1 },
            { label: t('analytics.scopes.s2'), color: chartColors.s2 },
            { label: t('analytics.scopes.s3'), color: chartColors.s3 },
          ]}
        >
          <BarChart data={rows} margin={{ ...ct.margin, bottom: many ? 8 : 0 }} barCategoryGap="28%">
            <CartesianGrid {...ct.grid} />
            <XAxis
              dataKey="label"
              {...ct.xAxis}
              interval={0}
              tickFormatter={(v: string) => (many && v.length > 10 ? v.slice(0, 9) + '…' : v)}
            />
            <YAxis {...ct.yAxis} />
            <Tooltip {...ct.tooltip({ unit })} />
            <Bar dataKey="s1" stackId="s" name={t('analytics.scopes.s1')} fill={chartColors.s1} stroke="var(--bg-primary)" strokeWidth={1} isAnimationActive animationDuration={500} />
            <Bar dataKey="s2" stackId="s" name={t('analytics.scopes.s2')} fill={chartColors.s2} stroke="var(--bg-primary)" strokeWidth={1} isAnimationActive animationDuration={500} animationBegin={60} />
            <Bar dataKey="s3" stackId="s" name={t('analytics.scopes.s3')} fill={chartColors.s3} stroke="var(--bg-primary)" strokeWidth={1} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={500} animationBegin={120} />
          </BarChart>
        </ChartFrame>
      )}
    </div>
  )
}
