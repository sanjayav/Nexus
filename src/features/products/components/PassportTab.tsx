import { useCallback, useMemo } from 'react'
import clsx from 'clsx'
import { AlertTriangle, BatteryCharging, BatteryWarning, CalendarClock, ChevronDown } from 'lucide-react'
import {
  AnimatedNumber,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Stagger,
  StaggerItem,
  dotTone,
  type Tone,
  ProgressRing,
} from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import {
  DUE_DILIGENCE_DEADLINE,
  PASSPORT_CATEGORIES,
  PASSPORT_DEADLINE,
  PASSPORT_STATUSES,
  type PassportItem,
  type PassportStatus,
  type ProductsData,
} from '@/features/products/data'
import { readiness } from '@/features/products/model'
import { productsStrings } from '@/features/products/products.strings'
import { useProductsActions } from '@/features/products/store'
import { daysUntil } from '@/config/regulatory'

const STATUS_TONE: Record<PassportStatus, Tone> = { done: 'success', inProgress: 'info', notStarted: 'neutral', blocked: 'warning' }
const SELECT_TONE: Record<PassportStatus, string> = {
  done: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  inProgress: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  notStarted: 'bg-zinc-900/[0.04] text-zinc-700 ring-zinc-900/[0.08]',
  blocked: 'bg-amber-50 text-amber-800 ring-amber-600/25',
}

export function PassportTab({ passport }: { passport: ProductsData['passport'] }) {
  const s = useStrings(productsStrings)
  if (!passport) {
    return (
      <Card>
        <EmptyState icon={BatteryWarning} title={s.passport.naTitle} description={s.passport.naDesc} />
      </Card>
    )
  }
  return <PassportReady passport={passport} />
}

function PassportReady({ passport }: { passport: NonNullable<ProductsData['passport']> }) {
  const s = useStrings(productsStrings)
  const p = s.passport
  const f = useFormat()
  const { setPassport } = useProductsActions()
  const items = passport.items
  const score = readiness(items.map(i => i.status))
  const done = items.filter(i => i.status === 'done').length
  const blocked = items.filter(i => i.status === 'blocked').length
  const groups = useMemo(() => PASSPORT_CATEGORIES.map(cat => ({ cat, items: items.filter(i => i.category === cat) })), [items])
  const pct = useCallback((n: number) => f.percent(n), [f])
  const days = useCallback((n: number) => f.number(Math.round(n)), [f])

  const update = (it: PassportItem, status: PassportStatus) => {
    setPassport(it.id, status)
    toast(fmt(p.updated, { item: p.items[it.id] ?? it.id, status: p.status[status] }), 'info')
  }

  const deadlines = [
    { key: 'passport', label: p.passportDeadline, date: PASSPORT_DEADLINE },
    { key: 'dd', label: p.ddDeadline, date: DUE_DILIGENCE_DEADLINE },
  ]

  return (
    <div className="space-y-6">
      <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <StaggerItem>
          <Card className="h-full">
            <CardHeader title={p.readinessTitle} description={p.regulation} icon={BatteryCharging} />
            <div className="flex items-center gap-5">
              <ProgressRing value={score}>
                <AnimatedNumber value={score} format={pct} className="display text-2xl font-semibold text-zinc-900" />
              </ProgressRing>
              <div className="min-w-0 space-y-2 text-[13px]">
                <p className="font-medium text-zinc-900">{fmt(p.itemsDone, { done, total: items.length })}</p>
                {blocked > 0 && (
                  <Badge tone="warning" dot>
                    {fmt(p.blockedCount, { count: blocked })}
                  </Badge>
                )}
                <p className="text-xs text-zinc-500 leading-relaxed">{p.readinessDesc}</p>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="h-full">
            <CardHeader title={p.deadlinesTitle} icon={CalendarClock} />
            <div className="grid grid-cols-2 gap-3">
              {deadlines.map(d => (
                <div key={d.key} className="rounded-xl border border-line p-3 min-w-0">
                  <div className="text-xs text-zinc-500 leading-snug">{d.label}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <AnimatedNumber
                      value={Math.max(0, daysUntil(d.date))}
                      format={days}
                      className="display text-[26px] font-semibold text-zinc-900 leading-none"
                    />
                    <span className="text-xs text-zinc-500">{p.days}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-zinc-600 tabular">{f.date(d.date)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-zinc-500">{p.scopeTitle}</div>
            <ul className="mt-1.5 space-y-1.5 text-[13px] text-zinc-700">
              {passport.products.map(name => (
                <li key={name} className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                  <span className="truncate">{name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-500">{p.scopeNote}</p>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="h-full bg-amber-50/40 border-amber-200/70">
            <CardHeader title={p.art7Title} icon={AlertTriangle} />
            <p className="text-[13px] leading-relaxed text-zinc-700">{p.art7Body}</p>
          </Card>
        </StaggerItem>
      </Stagger>

      <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {groups.map(g => {
          const gDone = g.items.filter(i => i.status === 'done').length
          return (
            <StaggerItem key={g.cat}>
              <Card className="h-full">
                <CardHeader
                  title={p.categories[g.cat]}
                  className="mb-3"
                  action={
                    <Badge tone={gDone === g.items.length ? 'success' : 'neutral'} className="tabular">
                      {fmt(p.groupProgress, { done: gDone, total: g.items.length })}
                    </Badge>
                  }
                />
                <ul className="divide-y divide-line">
                  {g.items.map(it => (
                    <li key={it.id} className="py-3 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-zinc-900 leading-snug">{p.items[it.id] ?? it.id}</div>
                        <div className="mt-0.5 text-xs text-zinc-500">{fmt(p.itemMeta, { owner: it.owner, date: f.date(it.due) })}</div>
                      </div>
                      <StatusSelect
                        value={it.status}
                        label={fmt(p.statusLabel, { item: p.items[it.id] ?? it.id })}
                        options={PASSPORT_STATUSES.map(st => ({ value: st, label: p.status[st] }))}
                        onChange={st => update(it, st)}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            </StaggerItem>
          )
        })}
      </Stagger>
    </div>
  )
}

function StatusSelect({
  value,
  label,
  options,
  onChange,
}: {
  value: PassportStatus
  label: string
  options: { value: PassportStatus; label: string }[]
  onChange: (v: PassportStatus) => void
}) {
  return (
    <div className="relative inline-flex items-center self-start sm:self-auto shrink-0">
      <span className={clsx('pointer-events-none absolute left-2.5 w-1.5 h-1.5 rounded-full', dotTone[STATUS_TONE[value]])} />
      <select
        aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value as PassportStatus)}
        className={clsx(
          'appearance-none h-7 pl-6 pr-7 rounded-md text-xs font-medium ring-1 ring-inset cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          SELECT_TONE[value],
        )}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 w-3.5 h-3.5 opacity-60" />
    </div>
  )
}
