import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileText, Search, ArrowDownRight, ExternalLink, ListFilter } from 'lucide-react'
import clsx from 'clsx'
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
import { PageHeader, Card, CardHeader, Button, Badge, Progress, EmptyState, inputClass, tableClass, chartTheme } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { anchorsEventsStrings } from '../i18n/pages/anchorsEvents'
import { moduleIdOf, useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useL10n, useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import { useToast } from '../components/useToast'

const EVENTS_OVER_TIME = [
  { date: '2024-11-01', events: 12 },
  { date: '2024-11-02', events: 8 },
  { date: '2024-11-03', events: 15 },
  { date: '2024-11-04', events: 10 },
  { date: '2024-11-05', events: 18 },
  { date: '2024-11-06', events: 14 },
  { date: '2024-11-07', events: 20 },
]

type EventType = 'anchor' | 'approval' | 'upload' | 'validation'

/** Classify a ledger event name (EN or ZH data) into a filterable type. */
const eventTypeOf = (name: string): EventType | null => {
  const n = name.toLowerCase()
  if (n.includes('anchor') || n.includes('锚定')) return 'anchor'
  if (n.includes('approv') || n.includes('审批')) return 'approval'
  if (n.includes('upload') || n.includes('上传')) return 'upload'
  if (n.includes('valid') || n.includes('校验')) return 'validation'
  return null
}

const round1 = (n: number) => Math.round(n * 10) / 10

const axisProps = { stroke: chartTheme.axis, tick: { fontSize: 12, fill: chartTheme.axis }, tickLine: false, axisLine: false } as const

export default function AnchorsEvents() {
  const s = useStrings(anchorsEventsStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const l10n = useL10n()
  const navigate = useNavigate()
  const mockData = useMockData()
  const { region, workspace } = useWorkspace()
  const { toast, show } = useToast()
  const { anchorsEvents } = mockData
  const network = l10n(region.chain.network)
  const explorer = region.chain.explorer.replace(/\/$/, '')

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')

  // Active frameworks: the region's list, limited to modules the tenant runs (falls back to all tenant modules).
  const activeModules = useMemo(() => {
    const byId = new Map(mockData.modules.map(m => [m.id, m]))
    const inRegion = region.frameworks.filter(id => byId.has(id)).map(id => byId.get(id)!)
    return inRegion.length > 0 ? inRegion : mockData.modules
  }, [mockData, region.frameworks])

  // Illustrative per-framework approval stats, derived deterministically from module coverage.
  const approvalsData = useMemo(
    () =>
      activeModules.map(m => ({
        module: fw.short(m.id, m.title),
        approved: Math.max(4, Math.round(m.coverage * 0.5)),
        rejected: Math.max(1, Math.round((100 - m.coverage) / 15)),
      })),
    [activeModules, fw],
  )
  const approveTimes = activeModules.slice(0, 3).map(m => ({
    id: m.id,
    label: fw.short(m.id, m.title),
    days: round1(1.5 + (100 - m.coverage) / 20),
    pct: m.coverage,
  }))

  const periods = useMemo(
    () => Array.from(new Set([workspace.reportingYear, ...anchorsEvents.map(e => e.periodId)])).sort().reverse(),
    [anchorsEvents, workspace.reportingYear],
  )
  const moduleOptions = useMemo(() => {
    const ids = new Set(activeModules.map(m => m.id))
    anchorsEvents.forEach(e => ids.add(moduleIdOf(e.moduleId)))
    return Array.from(ids)
  }, [activeModules, anchorsEvents])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return anchorsEvents.filter(e => {
      if (typeFilter !== 'all' && eventTypeOf(e.event) !== typeFilter) return false
      if (moduleFilter !== 'all' && moduleIdOf(e.moduleId) !== moduleFilter) return false
      if (periodFilter !== 'all' && e.periodId !== periodFilter) return false
      if (q) {
        const hay = [e.event, s.events[e.event] ?? '', e.submissionId, e.by, e.cid ?? '', e.txHash ?? '', fw.short(moduleIdOf(e.moduleId))].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [anchorsEvents, query, typeFilter, moduleFilter, periodFilter, s.events, fw])

  const filtersActive = query !== '' || typeFilter !== 'all' || moduleFilter !== 'all' || periodFilter !== 'all'
  const clearFilters = () => {
    setQuery('')
    setTypeFilter('all')
    setModuleFilter('all')
    setPeriodFilter('all')
  }

  const download = (kind: 'csv' | 'json') => {
    const cols = ['event', 'periodId', 'moduleId', 'submissionId', 'merkleRoot', 'cid', 'txHash', 'by', 'timestamp'] as const
    const body =
      kind === 'json'
        ? JSON.stringify({ network: region.chain.network.en, explorer, events: rows }, null, 2)
        : [cols.join(','), ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([body], { type: kind === 'json' ? 'application/json' : 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-events-${workspace.id}.${kind}`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    show(fmt(s.exported, { count: rows.length }))
  }

  const lineData = EVENTS_OVER_TIME.map(d => ({ ...d, label: f.date(d.date, { month: 'short', day: 'numeric' }) }))
  const selectClass = clsx(inputClass, 'cursor-pointer')

  return (
    <div className="space-y-6">
      {toast}
      <PageHeader
        title={s.title}
        description={fmt(s.description, { network })}
        actions={
          <>
            <Button icon={Download} onClick={() => download('csv')} disabled={rows.length === 0}>{s.exportCsv}</Button>
            <Button icon={Download} onClick={() => download('json')} disabled={rows.length === 0}>{s.exportJson}</Button>
            <Button variant="primary" icon={FileText} onClick={() => navigate('/verify')}>{s.auditPack}</Button>
          </>
        }
      />

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={s.searchPlaceholder}
              aria-label={s.searchLabel}
              className={clsx(inputClass, 'pl-9')}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex gap-3 lg:[&>select]:w-44">
            <select className={selectClass} aria-label={s.eventTypeLabel} value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | EventType)}>
              <option value="all">{s.allEventTypes}</option>
              {(Object.keys(s.eventTypes) as EventType[]).map(k => (
                <option key={k} value={k}>{s.eventTypes[k]}</option>
              ))}
            </select>
            <select className={selectClass} aria-label={s.moduleLabel} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
              <option value="all">{s.allModules}</option>
              {moduleOptions.map(id => (
                <option key={id} value={id}>{fw.short(id)}</option>
              ))}
            </select>
            <select className={selectClass} aria-label={s.periodLabel} value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}>
              <option value="all">{s.allPeriods}</option>
              {periods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
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
            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-700 tabular">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {f.percent(15)}
            </span>
            <span className="text-zinc-500">{s.vsLast}</span>
          </div>
          <div className="mt-6 pt-5 border-t border-line space-y-4">
            {approveTimes.map(r => (
              <div key={r.id}>
                <div className="flex items-center justify-between gap-3 text-[13px] mb-1.5">
                  <span className="font-medium text-zinc-700 truncate">{r.label}</span>
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
          <BarChart data={approvalsData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={4}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="module" {...axisProps} interval={0} tick={{ fontSize: approvalsData.length > 5 ? 11 : 12, fill: chartTheme.axis }} />
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
        <CardHeader
          title={s.ledger}
          description={fmt(s.ledgerDesc, { network, kind: l10n(region.chain.kind) })}
          action={
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-zinc-500 tabular whitespace-nowrap">
                {filtersActive ? fmt(s.ledgerFiltered, { shown: rows.length, count: anchorsEvents.length }) : fmt(s.ledgerCount, { count: anchorsEvents.length })}
              </span>
              <a
                href={explorer}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700 hover:text-emerald-700 whitespace-nowrap"
              >
                {s.openExplorer}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          }
          className="mb-4"
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={ListFilter}
            title={s.emptyTitle}
            description={s.emptyDesc}
            action={<Button size="sm" onClick={clearFilters}>{s.clearFilters}</Button>}
          />
        ) : (
        <div className={tableClass.wrap}>
          <table className={clsx(tableClass.table, 'min-w-[1080px]')}>
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
              {rows.map((event, index) => (
                <tr key={index} className={tableClass.tr}>
                  <td className={clsx(tableClass.td, 'font-medium text-zinc-900 whitespace-nowrap')}>{s.events[event.event] ?? event.event}</td>
                  <td className={clsx(tableClass.td, 'whitespace-nowrap')}>{event.periodId}</td>
                  <td className={clsx(tableClass.td, 'whitespace-nowrap')}><Badge>{fw.short(event.moduleId)}</Badge></td>
                  <td className={clsx(tableClass.td, 'font-mono text-[13px] whitespace-nowrap')}>{event.submissionId}</td>
                  <td className={clsx(tableClass.td, 'font-mono text-xs text-zinc-500 whitespace-nowrap')}>{event.merkleRoot || s.na}</td>
                  <td className={tableClass.td}>
                    <div className="font-mono text-xs text-zinc-500 max-w-[150px] truncate" title={event.cid}>{event.cid}</div>
                  </td>
                  <td className={clsx(tableClass.td, 'whitespace-nowrap')}>
                    {event.txHash ? (
                      <a
                        href={`${explorer}/tx/${event.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        title={fmt(s.viewOn, { network })}
                        className="inline-flex items-center gap-1 font-mono text-xs text-zinc-500 hover:text-emerald-700 transition-colors"
                      >
                        {event.txHash}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <Badge tone="warning" dot>{s.pending}</Badge>
                    )}
                  </td>
                  <td className={clsx(tableClass.td, 'font-mono text-xs whitespace-nowrap')} title={event.by}>
                    {event.by.length > 20 ? `${event.by.slice(0, 20)}…` : event.by}
                  </td>
                  <td className={clsx(tableClass.td, 'text-[13px] text-zinc-500 whitespace-nowrap tabular')}>
                    {f.date(event.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}
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
