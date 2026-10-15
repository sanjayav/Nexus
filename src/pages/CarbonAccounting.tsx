import { FormEvent, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Activity, CheckCircle2, Coins, Loader2, Plus, RefreshCw, Target, X } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Field, PageHeader, inputClass, tableClass } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { carbonAccountingStrings } from '../i18n/pages/carbonAccounting'
import { useL10n, useMockData, useMoney, useWorkspace } from '../workspace/WorkspaceContext'
import { useToast } from '../components/useToast'

type ActivityKey = 'grid' | 'fleet' | 'travel' | 'steel'
type Scope = 1 | 2 | 3
type Factor = { value: number; unit: string; source: string; year: string }

interface RecordRow {
  id: string
  key?: ActivityKey
  label?: string
  source: string
  amount: number
  unit: string
  result: number
  status: 'done' | 'pending'
  scope: Scope
}

/** Reduction ambition (vs first trend year) used for the target ring. */
const TARGET_REDUCTION_PCT = 40

/**
 * Illustrative carbon prices per tCO₂e, in the workspace currency.
 * global: internal shadow price on Scope 1 + 2. cn: national carbon market
 * (全国碳市场) reference allowance price, applied to direct (Scope 1) emissions.
 */
const CARBON_PRICE: Record<'global' | 'cn', { price: number; scopes: Scope[] }> = {
  global: { price: 50, scopes: [1, 2] },
  cn: { price: 90, scopes: [1] },
}

const scopeChip: Record<Scope, string> = {
  1: 'bg-zinc-900 text-white',
  2: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  3: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
}

/** 'tCO₂e/kL' → 'kL' */
const denominator = (unit: string) => unit.split('/')[1]?.trim() || unit

export default function CarbonAccounting() {
  const s = useStrings(carbonAccountingStrings)
  const f = useFormat()
  const l10n = useL10n()
  const money = useMoney()
  const { region } = useWorkspace()
  const { ghg, scope3, ghgTrends, emissionFactors } = useMockData()
  const { toast, show } = useToast()
  const regional = s.regional[region.id] ?? s.regional.global
  const grid = region.gridFactor
  const gridSource = l10n(grid.source)

  // Tenant factor library, flattened generically.
  const libraryFactors = useMemo(
    () =>
      Object.values(emissionFactors as Record<string, Record<string, Factor>>).flatMap(group =>
        Object.entries(group).map(([key, v]) => ({ key, ...v })),
      ),
    [emissionFactors],
  )

  // Calculator options: regional grid factor for Scope 2, tenant fuel factors for Scope 1.
  const options = useMemo(() => {
    const fuels = libraryFactors
      .filter(x => x.key !== 'gridElectricity')
      .filter((x, i, arr) => arr.findIndex(y => y.key === x.key) === i)
      .map(x => ({ id: `lib:${x.key}`, key: x.key, value: x.value, unit: denominator(x.unit), source: `${x.source} ${x.year}`.trim(), scope: 1 as Scope }))
    return [{ id: 'grid', key: 'gridElectricity', value: grid.value, unit: denominator(grid.unit), source: gridSource, scope: 2 as Scope }, ...fuels]
  }, [libraryFactors, grid.value, grid.unit, gridSource])

  const seedRecords = useMemo<RecordRow[]>(() => {
    const diesel = libraryFactors.find(x => x.key === 'diesel')
    // Convert litres to the factor's activity unit (per kL, or per tonne at 0.84 kg/L).
    const dieselUnit = diesel ? denominator(diesel.unit) : 'kL'
    const dieselQty = /^t\b|^t[（(]|^tonne/i.test(dieselUnit) ? 124500 * 0.00084 : 124500 / 1000
    const dieselFactor = diesel?.value ?? 2.68
    return [
      // Scope 2 location-based: kWh → MWh × regional grid factor.
      { id: 'grid', key: 'grid', source: gridSource, amount: 850000, unit: 'kWh', result: (850000 / 1000) * grid.value, status: 'done', scope: 2 },
      // Scope 1 diesel: litres → kL × tenant diesel factor.
      { id: 'fleet', key: 'fleet', source: diesel ? `${diesel.source} ${diesel.year}`.trim() : 'IPCC 2006', amount: 124500, unit: 'Liters', result: dieselQty * dieselFactor, status: 'done', scope: 1 },
      { id: 'travel', key: 'travel', source: 'Climatiq ER', amount: 2400000, unit: 'Passenger km', result: 480.0, status: 'pending', scope: 3 },
      { id: 'steel', key: 'steel', source: 'Ecoinvent 3.9', amount: 12000, unit: 'Tonnes', result: 22800.0, status: 'done', scope: 3 },
    ]
  }, [libraryFactors, grid.value, gridSource])

  const [added, setAdded] = useState<RecordRow[]>([])
  const [recalculated, setRecalculated] = useState(false)
  const [running, setRunning] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [optId, setOptId] = useState('grid')
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')

  const records = [...seedRecords, ...added].map(r => (recalculated && r.status === 'pending' ? { ...r, status: 'done' as const } : r))

  // Inventory totals from the tenant dataset (Scope 2 market-based, per GHG Protocol dual reporting).
  const scopes = [
    { key: 'scope1' as const, n: 1 as Scope, value: ghg.scope1.value, color: 'bg-zinc-900' },
    { key: 'scope2' as const, n: 2 as Scope, value: ghg.scope2Market.value, color: 'bg-emerald-500' },
    { key: 'scope3' as const, n: 3 as Scope, value: scope3.total, color: 'bg-sky-500' },
  ]
  const total = scopes.reduce((sum, sc) => sum + sc.value, 0)

  const target = useMemo(() => {
    if (ghgTrends.length < 2) return 0
    const first = ghgTrends[0]
    const last = ghgTrends[ghgTrends.length - 1]
    const base = first.scope1 + first.scope2
    const reduction = base > 0 ? ((base - (last.scope1 + last.scope2)) / base) * 100 : 0
    return Math.max(0, Math.min(100, Math.round((reduction / TARGET_REDUCTION_PCT) * 100)))
  }, [ghgTrends])

  const pricing = CARBON_PRICE[region.id] ?? CARBON_PRICE.global
  const pricedEmissions = scopes.filter(sc => pricing.scopes.includes(sc.n)).reduce((sum, sc) => sum + sc.value, 0)

  const selected = options.find(o => o.id === optId) ?? options[0]
  const amountNum = Number(amount)
  const preview = amountNum > 0 ? amountNum * selected.value : 0
  const optionLabel = (o: { id: string; key: string }) => (o.id === 'grid' ? s.gridOption : s.factors[o.key] ?? o.key.replace(/([A-Z])/g, ' $1').trim())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!(amountNum > 0)) return
    const row: RecordRow = {
      id: `rec-${Date.now()}`,
      label: label.trim() || optionLabel(selected),
      source: selected.source,
      amount: amountNum,
      unit: selected.unit,
      result: preview,
      status: 'done',
      scope: selected.scope,
    }
    setAdded(prev => [...prev, row])
    setAmount('')
    setLabel('')
    setFormOpen(false)
    show(fmt(s.added, { result: f.number(preview, { maximumFractionDigits: 1 }) }))
  }

  const runEngine = () => {
    if (running) return
    setRunning(true)
    window.setTimeout(() => {
      setRunning(false)
      setRecalculated(true)
      show(fmt(s.runDone, { count: records.length }))
    }, 900)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={<Button variant="primary" icon={Plus} onClick={() => setFormOpen(true)}>{s.addRecord}</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {/* Total + scope breakdown */}
        <Card className="md:col-span-2 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-zinc-500">{s.totalCarbon}</span>
            <Badge tone="success" icon={Activity}>{s.liveSync}</Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[40px] font-semibold tracking-[-0.02em] text-zinc-900 tabular leading-none">{f.number(total)}</span>
            <span className="text-sm text-zinc-500">tCO₂e</span>
          </div>

          <div className="mt-6 flex h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            {scopes.map(sc => (
              <div key={sc.key} className={sc.color} style={{ width: `${total > 0 ? (sc.value / total) * 100 : 0}%` }} />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {scopes.map(sc => (
              <div key={sc.key} className="rounded-xl border border-line p-3 hover:bg-zinc-50 transition-colors min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] text-zinc-500">
                  <span className={clsx('w-2 h-2 rounded-full shrink-0', sc.color)} />
                  <span className="truncate">{s[sc.key]}</span>
                </div>
                <div className="mt-1 text-xl font-semibold text-zinc-900 tabular">{f.compact(sc.value)}</div>
                <div className="text-xs text-zinc-500 tabular">{fmt(s.ofTotal, { pct: f.percent(total > 0 ? (sc.value / total) * 100 : 0) })}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">{s.scope2Basis}</p>
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
                  strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - target / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-zinc-900 tabular">{f.percent(target)}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[13px] text-zinc-500 text-center">
            <span className="block font-medium text-zinc-700">{s.sbtiProgress}</span>
            {fmt(s.sbtiCaption, { pct: f.percent(TARGET_REDUCTION_PCT) })}
          </p>
        </Card>

        {/* Carbon price exposure (region-aware) */}
        <Card className="flex flex-col">
          <CardHeader title={regional.priceTitle} icon={Coins} className="mb-4" />
          <div className="text-[13px] text-zinc-500">{s.exposure}</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-zinc-900 tabular">{money.compact(pricedEmissions * pricing.price)}</div>
          <div className="mt-1 text-xs text-zinc-500 tabular">
            {fmt(s.priceBasis, { price: money.full(pricing.price), emissions: f.number(pricedEmissions) })}
          </div>
          <p className="mt-3 text-[13px] text-zinc-500 leading-relaxed flex-1">{regional.priceBody}</p>
          <Badge className="mt-4 self-start">{regional.priceScope}</Badge>
        </Card>
      </div>

      {/* Register */}
      <Card>
        <CardHeader
          title={s.registerTitle}
          description={fmt(s.registerDesc, { source: gridSource })}
          className="flex-col sm:flex-row"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={running ? Loader2 : RefreshCw} onClick={runEngine} disabled={running} className={clsx(running && '[&>svg]:animate-spin')}>
                {running ? s.running : s.runEngine}
              </Button>
              <Button variant="ghost" size="sm" icon={Plus} onClick={() => setFormOpen(o => !o)} aria-expanded={formOpen}>{s.addRecord}</Button>
            </div>
          }
        />

        {formOpen && (
          <form onSubmit={submit} className="mb-5 rounded-xl border border-line bg-zinc-50/60 p-4 animate-fade-up">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-semibold text-zinc-900">{s.form.title}</h4>
              <button type="button" onClick={() => setFormOpen(false)} aria-label={s.form.close} className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label={s.form.factor} htmlFor="ca-factor">
                <select id="ca-factor" value={selected.id} onChange={e => setOptId(e.target.value)} className={inputClass}>
                  {options.map(o => (
                    <option key={o.id} value={o.id}>{optionLabel(o)} · S{o.scope}</option>
                  ))}
                </select>
              </Field>
              <Field label={fmt(s.form.amount, { unit: s.units[selected.unit] ?? selected.unit })} htmlFor="ca-amount">
                <input id="ca-amount" type="number" min={0} step="any" inputMode="decimal" required value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
              </Field>
              <Field label={s.form.label} htmlFor="ca-label">
                <input id="ca-label" type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder={optionLabel(selected)} className={inputClass} />
              </Field>
              <div className="flex flex-col justify-end gap-1.5">
                <div className="text-xs text-zinc-500 tabular truncate" title={selected.source}>
                  {fmt(s.form.preview, { result: f.number(preview, { maximumFractionDigits: 1 }) })}
                </div>
                <Button type="submit" variant="primary" icon={Plus} disabled={!(amountNum > 0)}>{s.form.submit}</Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">{fmt(s.form.factorNote, { value: f.number(selected.value, { maximumFractionDigits: 4 }), unit: selected.unit, source: selected.source })}</p>
          </form>
        )}

        {records.length === 0 ? (
          <EmptyState icon={Activity} title={s.emptyTitle} description={s.emptyDesc} />
        ) : (
          <div className={tableClass.wrap}>
            <table className={clsx(tableClass.table, 'min-w-[760px]')}>
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
                  <tr key={row.id} className={tableClass.tr}>
                    <td className={tableClass.td}>
                      <div className="flex items-center gap-3">
                        <span className={clsx('inline-flex h-6 min-w-[28px] items-center justify-center rounded-md px-1.5 text-[11px] font-semibold', scopeChip[row.scope])}>
                          S{row.scope}
                        </span>
                        <span className="font-medium text-zinc-900">{row.key ? regional.activities[row.key] : row.label}</span>
                      </div>
                    </td>
                    <td className={tableClass.td}>
                      <span title={row.source} className="inline-block max-w-[240px] truncate align-middle h-6 leading-6 px-2 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200">{row.source}</span>
                    </td>
                    <td className={clsx(tableClass.td, 'text-right tabular')}>{f.number(row.amount)}</td>
                    <td className={clsx(tableClass.td, 'text-zinc-500')}>{s.units[row.unit] ?? row.unit}</td>
                    <td className={clsx(tableClass.td, 'text-right tabular font-semibold text-zinc-900')}>{f.number(row.result, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
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
        )}
      </Card>
      {toast}
    </div>
  )
}
