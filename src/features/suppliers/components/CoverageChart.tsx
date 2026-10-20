import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, chartTheme } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { hasSpecificData } from '@/features/suppliers/data'
import type { SupplierView } from '@/features/suppliers/store'
import { suppliersStrings } from '@/features/suppliers/suppliers.strings'

const SPECIFIC = chartTheme.series[1]
const ESTIMATED = '#D4D4D8'

/** Category 1 emissions by purchase category, split into supplier-specific vs spend-based. */
export function CoverageChart({
  suppliers,
  cat1Total,
  longTailLabel,
}: {
  suppliers: SupplierView[]
  cat1Total: number
  longTailLabel: string
}) {
  const s = useStrings(suppliersStrings)
  const f = useFormat()

  const rows = useMemo(() => {
    const by = new Map<string, { category: string; specific: number; estimated: number }>()
    for (const sp of suppliers) {
      if (sp.scope3Cat !== 1) continue
      const row = by.get(sp.category) ?? { category: sp.category, specific: 0, estimated: 0 }
      if (hasSpecificData(sp)) row.specific += sp.emissions
      else row.estimated += sp.emissions
      by.set(sp.category, row)
    }
    const listed = [...by.values()].sort((a, b) => b.specific + b.estimated - (a.specific + a.estimated))
    const listedTotal = listed.reduce((sum, r) => sum + r.specific + r.estimated, 0)
    const tail = cat1Total - listedTotal
    return tail > 0 ? [...listed, { category: longTailLabel, specific: 0, estimated: tail }] : listed
  }, [suppliers, cat1Total, longTailLabel])

  const height = rows.length * 36 + 56

  return (
    <Card className="min-w-0">
      <CardHeader title={s.chart.title} description={s.chart.description} icon={BarChart3} />
      <div style={{ height }} className="-ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
            <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => f.compact(v)}
              tick={{ fontSize: 11, fill: chartTheme.axis }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={112}
              tick={{ fontSize: 12, fill: '#3F3F46' }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <Tooltip {...chartTheme.tooltip} cursor={{ fill: 'rgba(24,24,27,0.04)' }} formatter={(v: number) => f.number(v)} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(v: string) => <span style={{ color: '#52525B' }}>{v}</span>}
            />
            <Bar dataKey="specific" name={s.chart.specific} stackId="a" fill={SPECIFIC} radius={[0, 0, 0, 0]} isAnimationActive={false} />
            <Bar
              dataKey="estimated"
              name={s.chart.estimated}
              stackId="a"
              fill={ESTIMATED}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-zinc-500 tabular">{fmt(s.chart.total, { total: f.number(cat1Total) })}</p>
    </Card>
  )
}
