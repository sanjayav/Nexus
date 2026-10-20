import { useState } from 'react'
import clsx from 'clsx'
import { Leaf, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Tabs, tableClass, type Tone } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { carbonAssetsStrings } from '@/features/carbon-assets/carbonAssets.strings'
import { isInstrument, type ContractStatus, type InstrumentType } from '@/features/carbon-assets/data'
import type { CarbonAssetsView } from '@/features/carbon-assets/hooks'
import { useCarbonAssetsActions } from '@/features/carbon-assets/store'

const STATUS_TONE: Record<ContractStatus, Tone> = { signed: 'info', delivered: 'neutral', retired: 'success' }
const TYPE_DOT: Record<InstrumentType, string> = {
  greenTrade: 'bg-emerald-500',
  gec: 'bg-sky-500',
  irec: 'bg-sky-500',
  self: 'bg-amber-500',
}

type Filter = 'all' | InstrumentType

export function LedgerCard({ view, onAdd }: { view: CarbonAssetsView; onAdd: () => void }) {
  const s = useStrings(carbonAssetsStrings)
  const l = s.ledger
  const f = useFormat()
  const { workspace, region } = useWorkspace()
  const { removeContract } = useCarbonAssetsActions()
  const [filter, setFilter] = useState<Filter>('all')

  const rows = view.contracts.filter(c => filter === 'all' || c.type === filter)
  const filters: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: l.all, count: view.contracts.length },
    ...view.instrumentTypes.map(t => ({ value: t, label: s.types[t], count: view.contracts.filter(c => c.type === t).length })),
  ]
  const instrumentTotal = rows.filter(isInstrument).reduce((sum, c) => sum + c.mwh, 0)
  const selfTotal = rows.filter(c => !isInstrument(c)).reduce((sum, c) => sum + c.mwh, 0)

  return (
    <Card>
      <CardHeader
        title={l.title[region.id]}
        description={fmt(l.desc[region.id], { year: workspace.reportingYear })}
        icon={Leaf}
        className="flex-col sm:flex-row"
        action={
          <Button variant="secondary" size="sm" icon={Plus} onClick={onAdd}>
            {l.add}
          </Button>
        }
      />
      <Tabs items={filters} value={filter} onChange={setFilter} className="mb-4" />

      {rows.length === 0 ? (
        <EmptyState
          icon={Leaf}
          title={l.emptyTitle}
          description={l.emptyDesc}
          action={
            <Button size="sm" icon={Plus} onClick={onAdd}>
              {l.add}
            </Button>
          }
        />
      ) : (
        <div className={clsx(tableClass.wrap, '[&_tfoot_tr:last-child>td]:border-b-0')}>
          <table className={clsx(tableClass.table, 'min-w-[980px]')}>
            <thead>
              <tr>
                <th className={tableClass.th}>{l.cols.type}</th>
                <th className={clsx(tableClass.th, 'min-w-[240px]')}>{l.cols.counterparty}</th>
                <th className={tableClass.th}>{l.cols.site}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{l.cols.mwh}</th>
                <th className={tableClass.th}>{l.cols.period}</th>
                <th className={tableClass.th}>{l.cols.certIds}</th>
                <th className={tableClass.th}>{l.cols.status}</th>
                {/* relative: keeps the sr-only label inside the scroll container. */}
                <th className={clsx(tableClass.th, 'relative')}>
                  <span className="sr-only">{l.cols.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className={tableClass.tr}>
                  <td className={clsx(tableClass.td, 'whitespace-nowrap')}>
                    <span className="inline-flex items-center gap-2">
                      <span className={clsx('w-2 h-2 rounded-full', TYPE_DOT[c.type])} />
                      <span className="text-zinc-900 font-medium">{s.types[c.type]}</span>
                      {c.userAdded && <Badge tone="info">{l.userBadge}</Badge>}
                    </span>
                  </td>
                  <td className={tableClass.td}>{c.counterparty}</td>
                  <td className={clsx(tableClass.td, 'whitespace-nowrap')}>{c.site}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular text-zinc-900')}>{f.number(c.mwh)}</td>
                  <td className={clsx(tableClass.td, 'whitespace-nowrap tabular text-xs')}>
                    {fmt(s.range, { start: f.date(c.start), end: f.date(c.end) })}
                  </td>
                  <td className={clsx(tableClass.td, 'font-mono text-[11px] text-zinc-500 max-w-[220px] truncate')} title={c.certIds}>
                    {c.certIds || s.none}
                  </td>
                  <td className={tableClass.td}>
                    <Badge tone={STATUS_TONE[c.status]} dot>
                      {s.status[c.status]}
                    </Badge>
                  </td>
                  <td className={clsx(tableClass.td, 'w-10 text-right')}>
                    {c.userAdded && (
                      <button
                        type="button"
                        onClick={() => {
                          removeContract(c.id)
                          toast(l.removed, 'info')
                        }}
                        aria-label={fmt(l.remove, { name: c.counterparty })}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {instrumentTotal > 0 && (
                <tr className="bg-zinc-50/80">
                  <td className={clsx(tableClass.td, 'font-medium text-zinc-900')} colSpan={3}>
                    {l.totalInstruments}
                  </td>
                  <td className={clsx(tableClass.td, 'text-right tabular font-semibold text-zinc-900')}>{f.number(instrumentTotal)}</td>
                  <td className={tableClass.td} colSpan={4} />
                </tr>
              )}
              {selfTotal > 0 && (
                <tr className="bg-zinc-50/80">
                  <td className={clsx(tableClass.td, 'font-medium text-zinc-700')} colSpan={3}>
                    {l.totalSelf}
                  </td>
                  <td className={clsx(tableClass.td, 'text-right tabular font-medium text-zinc-700')}>{f.number(selfTotal)}</td>
                  <td className={tableClass.td} colSpan={4} />
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}
