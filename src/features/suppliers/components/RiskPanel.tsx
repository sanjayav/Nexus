import { useMemo } from 'react'
import { BatteryCharging, ShieldAlert } from 'lucide-react'
import { Button, Card, CardHeader, EmptyState, Progress } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { daysUntil } from '@/config/regulatory'
import type { ReasonCode } from '@/features/suppliers/data'
import type { SupplierView } from '@/features/suppliers/store'
import { suppliersStrings } from '@/features/suppliers/suppliers.strings'

/** EU Battery Regulation supply-chain due diligence start (README §7, regulatory facts). */
const EU_BATTERY_DD = '2027-08-18'

export function RiskPanel({
  suppliers,
  euBattery,
  onDueDiligence,
}: {
  suppliers: SupplierView[]
  euBattery: boolean
  onDueDiligence: (ids: string[]) => void
}) {
  const s = useStrings(suppliersStrings)
  const f = useFormat()

  const counts = useMemo(() => {
    const m = new Map<ReasonCode, number>()
    for (const sp of suppliers) for (const r of sp.reasons) m.set(r, (m.get(r) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [suppliers])
  const max = counts[0]?.[1] ?? 1

  const ddPending = suppliers.filter(sp => sp.reasons.includes('conflictMinerals') && sp.status !== 'verified')
  const days = daysUntil(EU_BATTERY_DD)

  return (
    <Card className="flex flex-col min-w-0">
      <CardHeader title={s.risk.title} description={s.risk.description} icon={ShieldAlert} />
      {counts.length === 0 ? (
        <EmptyState icon={ShieldAlert} title={s.risk.none} />
      ) : (
        <ul className="space-y-3">
          {counts.map(([code, n]) => (
            <li key={code}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-zinc-700 min-w-0 truncate">{s.reasons[code]}</span>
                <span className="font-semibold text-zinc-900 tabular">{f.number(n)}</span>
              </div>
              <Progress
                className="mt-1.5"
                value={(n / max) * 100}
                tone={code === 'conflictMinerals' || code === 'origin' ? 'danger' : 'warning'}
              />
            </li>
          ))}
        </ul>
      )}

      {euBattery && (
        <div className="mt-6 rounded-xl border border-line bg-zinc-50/70 p-4">
          <div className="flex items-start gap-2.5">
            <BatteryCharging className="w-4 h-4 mt-0.5 text-zinc-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-zinc-900 leading-snug">{s.risk.eu.title}</div>
              <p className="mt-1 text-xs text-zinc-600 leading-relaxed">{s.risk.eu.body}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-zinc-700">
              <span className="block">{fmt(s.risk.eu.count, { count: ddPending.length })}</span>
              {days > 0 && <span className="block text-zinc-500 tabular">{fmt(s.risk.eu.days, { days: f.number(days) })}</span>}
            </div>
            {ddPending.length > 0 && (
              <Button size="sm" variant="primary" onClick={() => onDueDiligence(ddPending.map(sp => sp.id))}>
                {s.risk.eu.action}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
