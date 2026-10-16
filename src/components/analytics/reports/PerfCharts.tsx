import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { AreaGradient, chartColors, endLabel, useChartTheme } from '../../ui/ChartFrame'
import { Skeleton } from '../../Skeleton'
import type { CellValue, DemoReport, ReportRow } from '../../../data/demoReport'

/* ── Data helpers ──────────────────────────────────────────────────────── */

/** Core-scope row by id (JV sections are reported separately). */
export function findRow(report: DemoReport, id: string): ReportRow | undefined {
  for (const s of report.sections) {
    if (s.scope !== 'core') continue
    for (const tb of s.tables) {
      const r = tb.rows.find(x => x.id === id)
      if (r) return r
    }
  }
  return undefined
}

/** Numeric value of a cell; male + female for split rows (null when both are missing). */
export function cellNumber(v: CellValue | undefined): number | null {
  if (v == null) return null
  if (typeof v === 'number') return v
  if (v.male == null && v.female == null) return null
  return (v.male ?? 0) + (v.female ?? 0)
}

export function series(report: DemoReport, id: string, factor = 1): Array<number | null> {
  const row = findRow(report, id)
  return report.years.map(y => {
    const n = cellNumber(row?.values[y])
    return n == null ? null : n * factor
  })
}

/** Gate a chart's mount on first view so the draw-in plays when it is seen. */
function useFirstView() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  return [ref, seen] as const
}

const HEIGHT = 240

/* ── GHG emissions by scope (stacked, emerald ordinal scale) ─────────── */

export function EmissionsByScopeChart({ report }: { report: DemoReport }) {
  const { t } = useTranslation()
  const ct = useChartTheme()
  const [ref, seen] = useFirstView()
  const s1 = series(report, 'nc-ghg-s1')
  const s2 = series(report, 'nc-ghg-s2')
  const s3 = series(report, 'nc-ghg-s3')
  const rows = report.years
    .map((y, i) => ({ year: String(y), s1: s1[i], s2: s2[i], s3: s3[i] }))
    .filter(r => r.s1 != null || r.s2 != null || r.s3 != null)
  const unit = t('perfReport.charts.mtUnit')
  return (
    <div ref={ref} className="min-w-0">
      {!seen ? (
        <div className="surface-paper p-5">
          <Skeleton className="w-full" height={HEIGHT + 64} rounded="lg" />
        </div>
      ) : (
        <ChartFrame
          title={t('perfReport.charts.ghgTitle')}
          subtitle={t('perfReport.charts.ghgSubtitle', { unit })}
          height={HEIGHT}
          empty={rows.length === 0}
          emptyTitle={t('perfReport.charts.noData')}
          legend={[
            { label: t('perfReport.charts.scope1'), color: chartColors.s1 },
            { label: t('perfReport.charts.scope2'), color: chartColors.s2 },
            { label: t('perfReport.charts.scope3'), color: chartColors.s3 },
          ]}
          footnote={t('perfReport.charts.ghgFootnote')}
        >
          <BarChart data={rows} margin={ct.margin} barCategoryGap="32%">
            <CartesianGrid {...ct.grid} />
            <XAxis dataKey="year" {...ct.xAxis} />
            <YAxis {...ct.yAxis} />
            <Tooltip {...ct.tooltip({ unit })} />
            <Bar dataKey="s1" stackId="g" name={t('perfReport.charts.scope1')} fill={chartColors.s1} stroke="var(--bg-primary)" strokeWidth={1} isAnimationActive animationDuration={500} />
            <Bar dataKey="s2" stackId="g" name={t('perfReport.charts.scope2')} fill={chartColors.s2} stroke="var(--bg-primary)" strokeWidth={1} isAnimationActive animationDuration={500} animationBegin={60} />
            <Bar dataKey="s3" stackId="g" name={t('perfReport.charts.scope3')} fill={chartColors.s3} stroke="var(--bg-primary)" strokeWidth={1} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={500} animationBegin={120} />
          </BarChart>
        </ChartFrame>
      )}
    </div>
  )
}

/* ── Energy consumption: direct vs indirect, direct end labels ───────── */

export function EnergyChart({ report }: { report: DemoReport }) {
  const { t } = useTranslation()
  const ct = useChartTheme()
  const [ref, seen] = useFirstView()
  const direct = series(report, 'nc-en-direct')
  const indirect = series(report, 'nc-en-indirect')
  const rows = report.years
    .map((y, i) => ({ year: String(y), direct: direct[i], indirect: indirect[i] }))
    .filter(r => r.direct != null || r.indirect != null)
  const last = rows.length - 1
  const directLabel = t('perfReport.charts.direct')
  const indirectLabel = t('perfReport.charts.indirect')
  return (
    <div ref={ref} className="min-w-0">
      {!seen ? (
        <div className="surface-paper p-5">
          <Skeleton className="w-full" height={HEIGHT + 64} rounded="lg" />
        </div>
      ) : (
        <ChartFrame
          title={t('perfReport.charts.energyTitle')}
          subtitle={t('perfReport.charts.energySubtitle')}
          height={HEIGHT}
          empty={rows.length === 0}
          emptyTitle={t('perfReport.charts.noData')}
          footnote={t('perfReport.charts.energyFootnote')}
        >
          <AreaChart data={rows} margin={{ ...ct.margin, right: 72 }}>
            <defs>
              <AreaGradient id="perf-en-direct" color={chartColors.s1} />
              <AreaGradient id="perf-en-indirect" color={chartColors.s2} />
            </defs>
            <CartesianGrid {...ct.grid} />
            <XAxis dataKey="year" {...ct.xAxis} padding={{ left: 8, right: 8 }} />
            {/* Wider axis: zh compact ticks read "3,400万". */}
            <YAxis {...ct.yAxis} width={68} />
            <Tooltip {...ct.tooltip({ unit: 'MWh' })} />
            <Area
              type="monotone"
              dataKey="direct"
              name={directLabel}
              stroke={chartColors.s1}
              fill="url(#perf-en-direct)"
              {...ct.series}
              label={endLabel(directLabel, chartColors.s1, last)}
            />
            <Area
              type="monotone"
              dataKey="indirect"
              name={indirectLabel}
              stroke={chartColors.s2}
              fill="url(#perf-en-indirect)"
              {...ct.series}
              animationBegin={80}
              label={endLabel(indirectLabel, chartColors.s2, last)}
            />
          </AreaChart>
        </ChartFrame>
      )}
    </div>
  )
}
