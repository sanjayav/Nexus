import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, ArrowUpRight, ArrowDownRight, Globe2,
  Building2, Factory, Search, Plus, Filter,
  BarChart3, AlertCircle, Wallet,
} from 'lucide-react'
import clsx from 'clsx'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Progress, StatCard, Tabs, inputClass, tableClass, type Tone } from '../components/ui'
import { useWorkspace, useMoney } from '../workspace/WorkspaceContext'
import { fmt, useFormat, useStrings } from '../i18n'
import { portfolioManagementStrings } from '../i18n/pages/portfolioManagement'

interface Entity {
  id: string
  name: string
  region: string
  industry: string
  emissions: number
  /** Annual revenue in the workspace currency. */
  revenue: number
  emissionsChange: number
  dataCoverage: number
  status: 'on_track' | 'at_risk' | 'lagging'
}

const mockEntities: Entity[] = [
  { id: '1', name: 'Asyad Ports', region: 'GCC', industry: 'Logistics', emissions: 145000, revenue: 420_000_000, emissionsChange: -4.2, dataCoverage: 98, status: 'on_track' },
  { id: '2', name: 'Asyad Shipping', region: 'Global', industry: 'Maritime', emissions: 890000, revenue: 1_100_000_000, emissionsChange: 1.5, dataCoverage: 92, status: 'at_risk' },
  { id: '3', name: 'Oman Rail', region: 'GCC', industry: 'Rail', emissions: 45000, revenue: 85_000_000, emissionsChange: -12.4, dataCoverage: 100, status: 'on_track' },
  { id: '4', name: 'Asyad Logistics', region: 'GCC', industry: 'Logistics', emissions: 112000, revenue: 310_000_000, emissionsChange: 5.8, dataCoverage: 76, status: 'lagging' },
  { id: '5', name: 'OICT', region: 'GCC', industry: 'Ports', emissions: 67000, revenue: 190_000_000, emissionsChange: -2.1, dataCoverage: 95, status: 'on_track' },
  { id: '6', name: 'Asyad Drydock', region: 'GCC', industry: 'Shipbuilding', emissions: 230000, revenue: 260_000_000, emissionsChange: 0.8, dataCoverage: 88, status: 'at_risk' },
]

// Mainland tenant: 绿源控股集团 subsidiaries (revenue in CNY).
const cnEntities: Entity[] = [
  { id: 'cn1', name: '绿源光伏科技（江苏盐城）', region: 'Jiangsu · Yancheng', industry: 'PV modules', emissions: 186400, revenue: 9_860_000_000, emissionsChange: -6.1, dataCoverage: 96, status: 'on_track' },
  { id: 'cn2', name: '绿源风电（内蒙古乌兰察布）', region: 'Inner Mongolia · Ulanqab', industry: 'Wind power', emissions: 8900, revenue: 2_140_000_000, emissionsChange: -3.2, dataCoverage: 100, status: 'on_track' },
  { id: 'cn3', name: '绿源储能（广东肇庆）', region: 'Guangdong · Zhaoqing', industry: 'Energy storage', emissions: 64200, revenue: 4_620_000_000, emissionsChange: 7.4, dataCoverage: 81, status: 'at_risk' },
  { id: 'cn4', name: '绿源智造（安徽合肥）', region: 'Anhui · Hefei', industry: 'Smart manufacturing', emissions: 41300, revenue: 2_790_000_000, emissionsChange: 2.2, dataCoverage: 74, status: 'lagging' },
  { id: 'cn5', name: '绿源新材料（四川宜宾）', region: 'Sichuan · Yibin', industry: 'Battery materials', emissions: 228700, revenue: 5_830_000_000, emissionsChange: -1.8, dataCoverage: 88, status: 'at_risk' },
]

const statusTone: Record<Entity['status'], Tone> = { on_track: 'success', at_risk: 'warning', lagging: 'danger' }

export default function PortfolioManagement() {
  const s = useStrings(portfolioManagementStrings)
  const f = useFormat()
  const money = useMoney()
  const navigate = useNavigate()
  const { region } = useWorkspace()
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<Entity['status'] | 'all'>('all')

  const entities = region.id === 'cn' ? cnEntities : mockEntities
  const industry = (i: string) => s.industries[i] ?? i
  const regionName = (r: string) => s.regions[r] ?? r
  const q = search.toLowerCase()
  const filteredEntities = entities.filter(e =>
    (statusFilter === 'all' || e.status === statusFilter) &&
    (e.name.toLowerCase().includes(q) ||
      e.industry.toLowerCase().includes(q) ||
      industry(e.industry).toLowerCase().includes(q) ||
      regionName(e.region).toLowerCase().includes(q)),
  )

  const totalEmissions = entities.reduce((acc, curr) => acc + curr.emissions, 0)
  const totalRevenue = entities.reduce((acc, curr) => acc + curr.revenue, 0)
  const avgCoverage = Math.round(entities.reduce((acc, curr) => acc + curr.dataCoverage, 0) / entities.length)
  const attention = entities.filter(e => e.status !== 'on_track').length
  // tCO₂e per million units of the workspace currency.
  const intensity = (e: Entity) => e.emissions / (e.revenue / 1_000_000)
  const clearAll = () => { setSearch(''); setStatusFilter('all') }

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <>
            <Button variant="secondary" icon={BarChart3} onClick={() => navigate('/analytics')}>{s.analytics}</Button>
            <Button variant="primary" icon={Plus} onClick={() => navigate('/admin/organization')}>{s.addEntity}</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={s.totalEmissions} value={f.compact(totalEmissions)} unit="tCO₂e" icon={Factory} delta={-2.4} goodWhen="down" deltaLabel={s.yoy} />
        <StatCard label={s.avgCoverage} value={f.percent(avgCoverage)} icon={Activity} delta={5} deltaLabel={s.vsQ1} />
        <StatCard
          label={s.attention}
          value={attention}
          unit={fmt(s.ofTotal, { total: entities.length })}
          icon={AlertCircle}
        />
        <StatCard label={s.revenue} value={money.compact(totalRevenue)} icon={Wallet} deltaLabel={s.revenueSub} />
      </div>

      <Card>
        <CardHeader
          title={s.entitiesTitle}
          description={fmt(s.entitiesDesc, { count: entities.length })}
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
          <Button variant={showFilters || statusFilter !== 'all' ? 'primary' : 'secondary'} icon={Filter} onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters}>
            {s.filters}
          </Button>
        </div>
        {showFilters && (
          <div className="mb-4" aria-label={s.filterAria}>
            <Tabs
              value={statusFilter}
              onChange={setStatusFilter}
              items={[
                { value: 'all', label: s.allStatuses, count: entities.length },
                ...(['on_track', 'at_risk', 'lagging'] as const).map(v => ({ value: v, label: s.status[v], count: entities.filter(e => e.status === v).length })),
              ]}
            />
          </div>
        )}

        {filteredEntities.length === 0 ? (
          <EmptyState
            icon={Search}
            title={s.emptyTitle}
            description={s.emptyBody}
            action={<Button size="sm" onClick={clearAll}>{s.clear}</Button>}
          />
        ) : (
          <div className={tableClass.wrap}>
            <table className={clsx(tableClass.table, 'min-w-[980px]')}>
              <thead>
                <tr>
                  <th className={tableClass.th}>{s.cols.name}</th>
                  <th className={tableClass.th}>{s.cols.industry}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{s.cols.revenue}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{s.cols.emissions}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{s.cols.intensity}</th>
                  <th className={tableClass.th}>{s.cols.change}</th>
                  <th className={tableClass.th}>{s.cols.coverage}</th>
                  <th className={tableClass.th}>{s.cols.status}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map(entity => (
                  <tr key={entity.id} className={tableClass.tr}>
                    <td className={tableClass.td}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-zinc-900 whitespace-nowrap">{entity.name}</span>
                      </div>
                    </td>
                    <td className={tableClass.td}>
                      <div className="text-zinc-900 whitespace-nowrap">{industry(entity.industry)}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                        <Globe2 className="w-3 h-3" /> {regionName(entity.region)}
                      </div>
                    </td>
                    <td className={clsx(tableClass.td, 'text-right tabular text-zinc-700 whitespace-nowrap')}>{money.compact(entity.revenue)}</td>
                    <td className={clsx(tableClass.td, 'text-right tabular font-medium text-zinc-900')}>{f.number(entity.emissions)}</td>
                    <td className={clsx(tableClass.td, 'text-right whitespace-nowrap')}>
                      <div className="tabular text-zinc-900">{f.number(intensity(entity), { maximumFractionDigits: 1 })}</div>
                      <div className="text-[11px] text-zinc-400">{s.intensityUnit[region.id]}</div>
                    </td>
                    <td className={tableClass.td}>
                      <span className={clsx('inline-flex items-center gap-0.5 text-xs font-medium tabular', entity.emissionsChange > 0 ? 'text-rose-600' : 'text-emerald-700')}>
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
