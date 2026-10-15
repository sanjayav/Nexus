import { Download, FileText, Search, ArrowDownRight } from 'lucide-react'
import clsx from 'clsx'
import { mockData } from '../data/mockData'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { PageHeader, Card, CardHeader, Button, Badge, Progress, inputClass, tableClass, chartTheme } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { anchorsEventsStrings } from '../i18n/pages/anchorsEvents'

const EVENTS_OVER_TIME = [
  { date: '2024-11-01', events: 12 },
  { date: '2024-11-02', events: 8 },
  { date: '2024-11-03', events: 15 },
  { date: '2024-11-04', events: 10 },
  { date: '2024-11-05', events: 18 },
  { date: '2024-11-06', events: 14 },
  { date: '2024-11-07', events: 20 },
]

const APPROVALS_VS_REJECTIONS = [
  { module: 'GRI', approved: 45, rejected: 3 },
  { module: 'MSX', approved: 32, rejected: 2 },
  { module: 'S1', approved: 28, rejected: 1 },
  { module: 'S2', approved: 35, rejected: 2 },
]

const axisProps = { stroke: chartTheme.axis, tick: { fontSize: 12, fill: chartTheme.axis }, tickLine: false, axisLine: false } as const

export default function AnchorsEvents() {
  const s = useStrings(anchorsEventsStrings)
  const f = useFormat()
  const { anchorsEvents } = mockData

  const lineData = EVENTS_OVER_TIME.map(d => ({ ...d, label: f.date(d.date, { month: 'short', day: 'numeric' }) }))
  const selectClass = clsx(inputClass, 'cursor-pointer')

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <>
            <Button icon={Download}>{s.exportCsv}</Button>
            <Button icon={Download}>{s.exportJson}</Button>
            <Button variant="primary" icon={FileText}>{s.auditPack}</Button>
          </>
        }
      />

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input type="text" placeholder={s.searchPlaceholder} aria-label={s.searchLabel} className={clsx(inputClass, 'pl-9')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex gap-3 lg:[&>select]:w-44">
            <select className={selectClass} aria-label={s.eventTypeLabel}>
              <option>{s.allEventTypes}</option>
              <option>{s.eventTypes.anchor}</option>
              <option>{s.eventTypes.approval}</option>
              <option>{s.eventTypes.upload}</option>
              <option>{s.eventTypes.validation}</option>
            </select>
            <select className={selectClass} aria-label={s.moduleLabel}>
              <option>{s.allModules}</option>
              <option>GRI</option>
              <option>MSX</option>
              <option>S1</option>
              <option>S2</option>
            </select>
            <select className={selectClass} aria-label={s.periodLabel}>
              <option>{s.allPeriods}</option>
              <option>FY2025</option>
              <option>FY2024</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title={s.eventsOverTime} description={s.eventsOverTimeDesc} />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip {...chartTheme.tooltip} />
              <Line type="monotone" dataKey="events" name={s.eventsSeries} stroke={chartTheme.series[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title={s.avgApprove} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] font-semibold tracking-[-0.02em] text-zinc-900 tabular leading-none">{f.number(2.8)}</span>
            <span className="text-sm text-zinc-500">{s.days}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600 tabular">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {f.percent(15)}
            </span>
            <span className="text-zinc-500">{s.vsLast}</span>
          </div>
          <div className="mt-6 pt-5 border-t border-line space-y-4">
            {[
              { module: 'GRI', days: 2.1, pct: 70 },
              { module: 'MSX', days: 3.5, pct: 50 },
            ].map(r => (
              <div key={r.module}>
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="font-medium text-zinc-700">{r.module}</span>
                  <span className="text-zinc-500 tabular">{fmt(s.daysShort, { n: f.number(r.days) })}</span>
                </div>
                <Progress value={r.pct} tone="success" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={s.approvalsVsRejections} description={s.approvalsVsRejectionsDesc} />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={APPROVALS_VS_REJECTIONS} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={4}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="module" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...chartTheme.tooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: chartTheme.axis }} />
            <Bar dataKey="approved" fill={chartTheme.series[1]} radius={[4, 4, 0, 0]} maxBarSize={36} name={s.approved} />
            <Bar dataKey="rejected" fill={chartTheme.series[5]} radius={[4, 4, 0, 0]} maxBarSize={36} name={s.rejected} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Events table */}
      <Card>
        <CardHeader title={s.ledger} action={<span className="text-[13px] text-zinc-500 tabular">{fmt(s.ledgerCount, { count: anchorsEvents.length })}</span>} className="mb-4" />
        <div className={tableClass.wrap}>
          <table className={tableClass.table}>
            <thead>
              <tr>
                <th className={tableClass.th}>{s.colEvent}</th>
                <th className={tableClass.th}>{s.colPeriod}</th>
                <th className={tableClass.th}>{s.colModule}</th>
                <th className={tableClass.th}>{s.colSubmission}</th>
                <th className={tableClass.th}>{s.colMerkle}</th>
                <th className={tableClass.th}>{s.colCid}</th>
                <th className={tableClass.th}>{s.colTx}</th>
                <th className={tableClass.th}>{s.colBy}</th>
                <th className={tableClass.th}>{s.colTimestamp}</th>
              </tr>
            </thead>
            <tbody>
              {anchorsEvents.map((event, index) => (
                <tr key={index} className={tableClass.tr}>
                  <td className={clsx(tableClass.td, 'font-medium text-zinc-900 whitespace-nowrap')}>{s.events[event.event] ?? event.event}</td>
                  <td className={tableClass.td}>{event.periodId}</td>
                  <td className={tableClass.td}><Badge>{event.moduleId}</Badge></td>
                  <td className={clsx(tableClass.td, 'font-mono text-[13px] whitespace-nowrap')}>{event.submissionId}</td>
                  <td className={clsx(tableClass.td, 'font-mono text-xs text-zinc-500 whitespace-nowrap')}>{event.merkleRoot || s.na}</td>
                  <td className={tableClass.td}>
                    <div className="font-mono text-xs text-zinc-500 max-w-[150px] truncate" title={event.cid}>{event.cid}</div>
                  </td>
                  <td className={clsx(tableClass.td, 'whitespace-nowrap')}>
                    {event.txHash ? <span className="font-mono text-xs text-zinc-500">{event.txHash}</span> : <Badge tone="warning" dot>{s.pending}</Badge>}
                  </td>
                  <td className={clsx(tableClass.td, 'font-mono text-xs whitespace-nowrap')}>{event.by.slice(0, 20)}…</td>
                  <td className={clsx(tableClass.td, 'text-[13px] text-zinc-500 whitespace-nowrap tabular')}>
                    {f.date(event.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}
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
