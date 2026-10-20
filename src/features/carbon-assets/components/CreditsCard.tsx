import clsx from 'clsx'
import { CheckCircle2, Info, Ticket } from 'lucide-react'
import { Badge, Card, CardHeader, EmptyState, tableClass } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { carbonAssetsStrings } from '@/features/carbon-assets/carbonAssets.strings'
import type { CarbonAssetsView } from '@/features/carbon-assets/hooks'

export function CreditsCard({ view }: { view: CarbonAssetsView }) {
  const s = useStrings(carbonAssetsStrings)
  const c = s.credits
  const f = useFormat()
  const { region } = useWorkspace()
  const { credits, credit } = view

  return (
    <Card>
      <CardHeader title={c.title} description={c.desc} icon={Ticket} />
      {credits.length === 0 ? (
        <EmptyState icon={Ticket} title={c.emptyTitle} description={c.emptyDesc} />
      ) : (
        <div className={clsx(tableClass.wrap, '[&_tfoot_tr:last-child>td]:border-b-0')}>
          <table className={clsx(tableClass.table, 'min-w-[900px]')}>
            <thead>
              <tr>
                <th className={clsx(tableClass.th, 'min-w-[260px]')}>{c.cols.project}</th>
                <th className={tableClass.th}>{c.cols.standard}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{c.cols.vintage}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{c.cols.acquired}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{c.cols.retired}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{c.cols.held}</th>
                <th className={tableClass.th}>{c.cols.disclosure}</th>
                <th className={tableClass.th}>{c.cols.registry}</th>
              </tr>
            </thead>
            <tbody>
              {credits.map(cr => (
                <tr key={cr.id} className={tableClass.tr}>
                  <td className={tableClass.td}>
                    <div className="font-medium text-zinc-900">{cr.project}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {cr.purpose ? fmt(s.pair, { a: cr.projectType, b: fmt(c.purpose, { purpose: cr.purpose }) }) : cr.projectType}
                    </div>
                  </td>
                  <td className={clsx(tableClass.td, 'whitespace-nowrap')}>
                    <Badge tone={cr.standard === 'CCER' ? 'success' : 'neutral'}>{c.standard[cr.standard]}</Badge>
                  </td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>{cr.vintage}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>{f.number(cr.acquired)}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>{f.number(cr.retired)}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular font-medium text-zinc-900')}>
                    {f.number(cr.acquired - cr.retired)}
                  </td>
                  <td className={tableClass.td}>
                    {cr.retiredForDisclosure ? (
                      <Badge tone="success" icon={CheckCircle2}>
                        {c.disclosed}
                      </Badge>
                    ) : (
                      <span className="text-xs text-zinc-500">{cr.retired > 0 ? s.none : c.notRetired}</span>
                    )}
                  </td>
                  <td className={clsx(tableClass.td, 'text-xs text-zinc-500')}>{cr.registry}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50/80">
                <td className={clsx(tableClass.td, 'font-medium text-zinc-900')} colSpan={3}>
                  {c.total}
                </td>
                <td className={clsx(tableClass.td, 'text-right tabular font-semibold text-zinc-900')}>{f.number(credit.acquired)}</td>
                <td className={clsx(tableClass.td, 'text-right tabular font-semibold text-zinc-900')}>{f.number(credit.retired)}</td>
                <td className={clsx(tableClass.td, 'text-right tabular font-semibold text-zinc-900')}>{f.number(credit.held)}</td>
                <td className={tableClass.td} colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-sky-50/60 ring-1 ring-inset ring-sky-600/15 p-3.5">
        <Info className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
        <p className="text-[13px] leading-relaxed text-zinc-700">{c.note[region.id]}</p>
      </div>
    </Card>
  )
}
