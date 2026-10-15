import { useMemo, useState } from 'react'
import { Calculator, ChevronRight, Zap, Truck, Plane, Users, Package, Gauge, Loader2, Layers } from 'lucide-react'
import clsx from 'clsx'
import { Badge, Button, Card, CardHeader, EmptyState, Field, PageHeader, Progress, StatCard, inputClass } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { scope3CalculatorStrings } from '../i18n/pages/scope3Calculator'
import { useL10n, useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import { useToast } from '../components/useToast'

const categoryIcons: Record<number, typeof Package> = {
  1: Package, 3: Zap, 4: Truck, 6: Plane, 7: Users, 11: Zap,
}

type Factor = { value: number; unit: string; source: string; year: string }

/** Default transmission & distribution loss share used for the Cat. 3 estimate. */
const TD_LOSS_PCT = 5

export default function Scope3Calculator() {
  const s = useStrings(scope3CalculatorStrings)
  const f = useFormat()
  const l10n = useL10n()
  const { region } = useWorkspace()
  const { scope3, emissionFactors } = useMockData()
  const { toast, show } = useToast()
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [mwh, setMwh] = useState('1000')

  const catName = (id: number, name: string) => s.categories[String(id)] ?? name
  const method = (m: string) => s.methodologies[m] ?? m
  const factorLabel = (key: string) => s.factors[key] ?? key.replace(/([A-Z])/g, ' $1').trim()

  const grid = region.gridFactor
  const gridSource = l10n(grid.source)

  // Tenant factor library, flattened generically (group keys carry no meaning in the UI).
  const factors = useMemo(
    () =>
      Object.values(emissionFactors as Record<string, Record<string, Factor>>).flatMap(group =>
        Object.entries(group).map(([key, v]) => ({ key, ...v })),
      ),
    [emissionFactors],
  )
  const librarySources = useMemo(() => Array.from(new Set(factors.map(x => x.source))), [factors])

  const total = scope3.total || scope3.categories.reduce((sum, c) => sum + c.value, 0)
  const mwhValue = Math.max(0, Number(mwh) || 0)
  const scope2Estimate = mwhValue * grid.value
  const tdEstimate = mwhValue * (TD_LOSS_PCT / 100) * grid.value

  const runEngine = () => {
    if (running) return
    setRunning(true)
    window.setTimeout(() => {
      setRunning(false)
      show(fmt(s.runDone, { count: scope3.categories.length, total: f.number(total) }))
    }, 900)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <Button variant="primary" icon={running ? Loader2 : Calculator} onClick={runEngine} disabled={running} className={clsx(running && '[&>svg]:animate-spin')}>
            {running ? s.running : s.runEngine}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title={s.byCategory} description={s.byCategoryDesc} />
          {scope3.categories.length === 0 ? (
            <EmptyState icon={Layers} title={s.emptyTitle} description={s.emptyDesc} />
          ) : (
            <div className="divide-y divide-line -mx-2">
              {scope3.categories.map(cat => {
                const Icon = categoryIcons[cat.id] || Package
                const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0
                const open = activeCategory === cat.id
                return (
                  <div key={cat.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setActiveCategory(open ? null : cat.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 sm:gap-4 px-2 py-3 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
                        open ? 'bg-zinc-50' : 'hover:bg-zinc-50',
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{fmt(s.category, { id: cat.id, name: catName(cat.id, cat.name) })}</p>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{method(cat.methodology)} · {fmt(s.coverage, { pct: f.percent(cat.coverage) })}</p>
                      </div>
                      <div className="hidden sm:block w-24">
                        <Progress value={pct} />
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-zinc-900 tabular">{f.number(cat.value)}</p>
                        <p className="text-xs text-zinc-500">{cat.unit}</p>
                      </div>
                      <ChevronRight className={clsx('w-4 h-4 text-zinc-400 transition-transform shrink-0', open && 'rotate-90')} />
                    </button>
                    {open && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-2 sm:pl-[60px] pb-4 pt-1">
                        <Detail label={s.methodologyLabel} value={method(cat.methodology)} />
                        <Detail label={s.coverageLabel} value={f.percent(cat.coverage)} />
                        <Detail label={s.share} value={f.percent(pct)} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-line flex justify-between items-center gap-4">
            <span className="text-[13px] font-medium text-zinc-500">{s.total}</span>
            <span className="text-lg font-semibold text-zinc-900 tabular">{f.number(total)} tCO₂e</span>
          </div>
        </Card>

        <div className="space-y-4 sm:space-y-6">
          <StatCard
            label={s.total}
            value={f.number(total)}
            unit="tCO₂e"
            icon={Gauge}
            deltaLabel={fmt(s.measured, { count: scope3.categories.length })}
          />

          <Card>
            <CardHeader title={s.factorsTitle} description={s.factorsDesc} className="mb-4" />
            <div className="rounded-lg bg-zinc-50 border border-line px-3 py-2.5 mb-3">
              <div className="flex justify-between items-center gap-3 text-sm">
                <span className="text-zinc-700 font-medium">{s.regionalGrid}</span>
                <span className="font-semibold text-zinc-900 tabular whitespace-nowrap">
                  {f.number(grid.value, { maximumFractionDigits: 4 })} <span className="text-zinc-500 font-normal">{grid.unit}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{gridSource}</p>
            </div>
            {factors.length === 0 ? (
              <p className="text-[13px] text-zinc-500">{s.noFactors}</p>
            ) : (
              <div className="space-y-2.5">
                {factors.map((v, i) => (
                  <div key={`${v.key}-${i}`} className="flex justify-between items-start gap-3 text-sm">
                    <div className="min-w-0">
                      <span className="text-zinc-600">{factorLabel(v.key)}</span>
                      <span className="block text-[11px] text-zinc-400 truncate">{v.source} · {v.year}</span>
                    </div>
                    <span className="font-medium text-zinc-900 tabular whitespace-nowrap">{f.number(v.value, { maximumFractionDigits: 4 })} <span className="text-zinc-500 font-normal">{v.unit}</span></span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-4 pt-3 border-t border-line">
              {fmt(s.factorsSource, { sources: librarySources.length ? librarySources.join(s.listSep) : '—' })}
            </p>
          </Card>

          <Card>
            <CardHeader title={s.estimateTitle} description={s.estimateDesc} icon={Calculator} className="mb-4" />
            <Field label={s.electricityInput} htmlFor="s3-mwh">
              <input
                id="s3-mwh"
                type="number"
                min={0}
                inputMode="decimal"
                value={mwh}
                onChange={e => setMwh(e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-zinc-600">{s.scope2Estimate}</span>
                <span className="font-semibold text-zinc-900 tabular">{f.number(scope2Estimate, { maximumFractionDigits: 1 })} tCO₂e</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-600">{fmt(s.tdEstimate, { pct: f.percent(TD_LOSS_PCT) })}</span>
                <span className="font-semibold text-zinc-900 tabular">{f.number(tdEstimate, { maximumFractionDigits: 1 })} tCO₂e</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center gap-2">
              <Badge tone="info">{fmt(s.usingFactor, { value: f.number(grid.value, { maximumFractionDigits: 4 }), unit: grid.unit })}</Badge>
            </div>
          </Card>
        </div>
      </div>
      {toast}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-medium text-zinc-900 tabular">{value}</div>
    </div>
  )
}
