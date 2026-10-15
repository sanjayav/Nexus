import { useState } from 'react'
import {
  Activity, ArrowUpRight, ArrowDownRight, Globe2,
  Building2, Factory, Search, Plus, Filter,
  BarChart3, AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Progress, StatCard, inputClass, tableClass, type Tone } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { portfolioManagementStrings } from '../i18n/pages/portfolioManagement'

interface Entity {
  id: string
  name: string
  region: string
  industry: string
  emissions: number
  emissionsChange: number
  dataCoverage: number
  status: 'on_track' | 'at_risk' | 'lagging'
}

const mockEntities: Entity[] = [
  { id: '1', name: 'Asyad Ports', region: 'GCC', industry: 'Logistics', emissions: 145000, emissionsChange: -4.2, dataCoverage: 98, status: 'on_track' },
  { id: '2', name: 'Asyad Shipping', region: 'Global', industry: 'Maritime', emissions: 890000, emissionsChange: 1.5, dataCoverage: 92, status: 'at_risk' },
  { id: '3', name: 'Oman Rail', region: 'GCC', industry: 'Rail', emissions: 45000, emissionsChange: -12.4, dataCoverage: 100, status: 'on_track' },
  { id: '4', name: 'Asyad Logistics', region: 'GCC', industry: 'Logistics', emissions: 112000, emissionsChange: 5.8, dataCoverage: 76, status: 'lagging' },
  { id: '5', name: 'OICT', region: 'GCC', industry: 'Ports', emissions: 67000, emissionsChange: -2.1, dataCoverage: 95, status: 'on_track' },
  { id: '6', name: 'Asyad Drydock', region: 'GCC', industry: 'Shipbuilding', emissions: 230000, emissionsChange: 0.8, dataCoverage: 88, status: 'at_risk' },
]

const statusTone: Record<Entity['status'], Tone> = { on_track: 'success', at_risk: 'warning', lagging: 'danger' }

export default function PortfolioManagement() {
  const s = useStrings(portfolioManagementStrings)
  const f = useFormat()
  const [search, setSearch] = useState('')

  const industry = (i: string) => s.industries[i] ?? i
  const q = search.toLowerCase()
  const filteredEntities = mockEntities.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.industry.toLowerCase().includes(q) ||
    industry(e.industry).toLowerCase().includes(q),
  )

  const totalEmissions = mockEntities.reduce((acc, curr) => acc + curr.emissions, 0)
  const avgCoverage = Math.round(mockEntities.reduce((acc, curr) => acc + curr.dataCoverage, 0) / mockEntities.length)
  const attention = mockEntities.filter(e => e.status !== 'on_track').length

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <>
            <Button variant="secondary" icon={BarChart3}>{s.analytics}</Button>
            <Button variant="primary" icon={Plus}>{s.addEntity}</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard label={s.totalEmissions} value={f.compact(totalEmissions)} unit="tCO₂e" icon={Factory} delta={-2.4} goodWhen="down" deltaLabel={s.yoy} />
        <StatCard label={s.avgCoverage} value={f.percent(avgCoverage)} icon={Activity} delta={5} deltaLabel={s.vsQ1} />
        <StatCard
          label={s.attention}
          value={attention}
          unit={fmt(s.ofTotal, { total: mockEntities.length })}
          icon={AlertCircle}
        />
      </div>

      <Card>
        <CardHeader
          title={s.entitiesTitle}
          description={fmt(s.entitiesDesc, { count: mockEntities.length })}
          icon={Building2}
          className="mb-4"
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              aria-label={s.searchAria}
              placeholder={s.searchPlaceholder}
              className={clsx(inputClass, 'pl-9')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="secondary" icon={Filter}>{s.filters}</Button>
        </div>

        {filteredEntities.length === 0 ? (
          <EmptyState
            icon={Search}
            title={s.emptyTitle}
            description={s.emptyBody}
            action={<Button size="sm" onClick={() => setSearch('')}>{s.clear}</Button>}
          />
        ) : (
          <div className={tableClass.wrap}>
            <table className={clsx(tableClass.table, 'min-w-[760px]')}>
              <thead>
                <tr>
                  <th className={tableClass.th}>{s.cols.name}</th>
                  <th className={tableClass.th}>{s.cols.industry}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{s.cols.emissions}</th>
                  <th className={tableClass.th}>{s.cols.change}</th>
                  <th className={tableClass.th}>{s.cols.coverage}</th>
                  <th className={tableClass.th}>{s.cols.status}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map(entity => (
                  <tr key={entity.id} className={clsx(tableClass.tr, 'cursor-pointer')}>
                    <td className={tableClass.td}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-zinc-900">{entity.name}</span>
                      </div>
                    </td>
                    <td className={tableClass.td}>
                      <div className="text-zinc-900">{industry(entity.industry)}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Globe2 className="w-3 h-3" /> {s.regions[entity.region] ?? entity.region}
                      </div>
                    </td>
                    <td className={clsx(tableClass.td, 'text-right tabular font-medium text-zinc-900')}>{f.number(entity.emissions)}</td>
                    <td className={tableClass.td}>
                      <span className={clsx('inline-flex items-center gap-0.5 text-xs font-medium tabular', entity.emissionsChange > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                        {entity.emissionsChange > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {f.number(Math.abs(entity.emissionsChange), { maximumFractionDigits: 1 })}%
                      </span>
                    </td>
                    <td className={tableClass.td}>
                      <div className="flex items-center gap-3 w-[150px]">
                        <Progress
                          value={entity.dataCoverage}
                          tone={entity.dataCoverage > 90 ? 'success' : entity.dataCoverage > 80 ? 'neutral' : 'warning'}
                          className="flex-1"
                        />
                        <span className="text-xs text-zinc-500 tabular w-9 text-right">{f.percent(entity.dataCoverage)}</span>
                      </div>
                    </td>
                    <td className={tableClass.td}>
                      <Badge tone={statusTone[entity.status]} dot>{s.status[entity.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
