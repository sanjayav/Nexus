import clsx from 'clsx'
import { Activity, CheckCircle2, CloudLightning, Loader2, Plus, RefreshCw, Target } from 'lucide-react'
import { Badge, Button, Card, CardHeader, PageHeader, tableClass } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { carbonAccountingStrings } from '../i18n/pages/carbonAccounting'

type ActivityKey = 'grid' | 'fleet' | 'travel' | 'steel'

const records: { key: ActivityKey; source: string; amount: number; unit: string; result: number; status: 'done' | 'pending'; scope: 1 | 2 | 3 }[] = [
  { key: 'grid', source: 'DEFRA 2024', amount: 850000, unit: 'kWh', result: 198.4, status: 'done', scope: 2 },
  { key: 'fleet', source: 'US EPA 2023', amount: 124500, unit: 'Liters', result: 332.1, status: 'done', scope: 1 },
  { key: 'travel', source: 'Climatiq ER', amount: 2400000, unit: 'Passenger km', result: 480.0, status: 'pending', scope: 3 },
  { key: 'steel', source: 'Ecoinvent 3.9', amount: 12000, unit: 'Tonnes', result: 22800.0, status: 'done', scope: 3 },
]

const TOTAL = 14285
const scopes = [
  { key: 'scope1' as const, value: 1200, color: 'bg-zinc-900' },
  { key: 'scope2' as const, value: 3800, color: 'bg-emerald-500' },
  { key: 'scope3' as const, value: 9200, color: 'bg-sky-500' },
]

const scopeChip: Record<1 | 2 | 3, string> = {
  1: 'bg-zinc-900 text-white',
  2: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  3: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
}

export default function CarbonAccounting() {
  const s = useStrings(carbonAccountingStrings)
  const f = useFormat()
  const sbti = 60

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={<Button variant="primary" icon={Plus}>{s.addRecord}</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {/* Total + scope breakdown */}
        <Card className="md:col-span-2 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-zinc-500">{s.totalCarbon}</span>
            <Badge tone="success" icon={Activity}>{s.liveSync}</Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[40px] font-semibold tracking-[-0.02em] text-zinc-900 tabular leading-none">{f.number(TOTAL)}</span>
            <span className="text-sm text-zinc-500">tCO₂e</span>
          </div>

          <div className="mt-6 flex h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            {scopes.map(sc => (
              <div key={sc.key} className={sc.color} style={{ width: `${(sc.value / (1200 + 3800 + 9200)) * 100}%` }} />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {scopes.map(sc => (
              <div key={sc.key} className="rounded-xl border border-line p-3 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-1.5 text-[13px] text-zinc-500">
                  <span className={clsx('w-2 h-2 rounded-full', sc.color)} />
                  {s[sc.key]}
                </div>
                <div className="mt-1 text-xl font-semibold text-zinc-900 tabular">{f.compact(sc.value)}</div>
                <div className="text-xs text-zinc-500 tabular">{fmt(s.ofTotal, { pct: f.percent((sc.value / (1200 + 3800 + 9200)) * 100) })}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* SBTi target */}
        <Card className="flex flex-col">
          <CardHeader title={s.sbtiTarget} icon={Target} className="mb-4" />
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="#F4F4F5" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="transparent" stroke="#18181B" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - sbti / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-zinc-900 tabular">{f.percent(sbti)}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[13px] text-zinc-500 text-center">
            <span className="block font-medium text-zinc-700">{s.sbtiProgress}</span>
            {s.sbtiCaption}
          </p>
        </Card>

        {/* Engine */}
        <Card className="flex flex-col">
          <CardHeader title={s.calculations} icon={CloudLightning} className="mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 leading-snug">{s.engineTitle}</h3>
          <p className="mt-1 text-[13px] text-zinc-500 leading-relaxed flex-1">{s.engineBody}</p>
          <Button variant="secondary" icon={RefreshCw} className="mt-5 w-full">{s.runEngine}</Button>
        </Card>
      </div>

      {/* Register */}
      <Card>
        <CardHeader
          title={s.registerTitle}
          description={s.registerDesc}
          action={<Button variant="ghost" size="sm" icon={Plus}>{s.addRecord}</Button>}
        />
        <div className={tableClass.wrap}>
          <table className={clsx(tableClass.table, 'min-w-[720px]')}>
            <thead>
              <tr>
                <th className={tableClass.th}>{s.cols.activity}</th>
                <th className={tableClass.th}>{s.cols.source}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{s.cols.amount}</th>
                <th className={tableClass.th}>{s.cols.unit}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{s.cols.result}</th>
                <th className={tableClass.th}>{s.cols.status}</th>
              </tr>
            </thead>
            <tbody>
              {records.map(row => (
                <tr key={row.key} className={tableClass.tr}>
                  <td className={tableClass.td}>
                    <div className="flex items-center gap-3">
                      <span className={clsx('inline-flex h-6 min-w-[28px] items-center justify-center rounded-md px-1.5 text-[11px] font-semibold', scopeChip[row.scope])}>
                        S{row.scope}
                      </span>
                      <span className="font-medium text-zinc-900">{s.activities[row.key]}</span>
                    </div>
                  </td>
                  <td className={tableClass.td}><Badge>{row.source}</Badge></td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>{f.number(row.amount)}</td>
                  <td className={clsx(tableClass.td, 'text-zinc-500')}>{s.units[row.unit as keyof typeof s.units] ?? row.unit}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular font-semibold text-zinc-900')}>{f.number(row.result, { minimumFractionDigits: 1 })}</td>
                  <td className={tableClass.td}>
                    {row.status === 'done' ? (
                      <Badge tone="success" icon={CheckCircle2}>{s.status.done}</Badge>
                    ) : (
                      <Badge tone="warning"><Loader2 className="w-3.5 h-3.5 animate-spin" />{s.status.pending}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
