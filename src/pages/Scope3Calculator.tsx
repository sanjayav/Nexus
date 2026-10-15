import { useState } from 'react'
import { Calculator, ChevronRight, Zap, Truck, Plane, Users, Package, Gauge } from 'lucide-react'
import clsx from 'clsx'
import { mockData } from '../data/mockData'
import { Button, Card, CardHeader, PageHeader, Progress, StatCard } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { scope3CalculatorStrings } from '../i18n/pages/scope3Calculator'

const categoryIcons: Record<number, typeof Package> = {
  1: Package, 3: Zap, 4: Truck, 6: Plane, 7: Users, 11: Zap,
}

export default function Scope3Calculator() {
  const s = useStrings(scope3CalculatorStrings)
  const f = useFormat()
  const { scope3, emissionFactors } = mockData
  const [activeCategory, setActiveCategory] = useState<number | null>(null)

  const catName = (id: number, name: string) => s.categories[String(id)] ?? name
  const method = (m: string) => s.methodologies[m] ?? m

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={<Button variant="primary" icon={Calculator}>{s.runEngine}</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title={s.byCategory} description={s.byCategoryDesc} />
          <div className="divide-y divide-line -mx-2">
            {scope3.categories.map(cat => {
              const Icon = categoryIcons[cat.id] || Package
              const pct = Math.round((cat.value / scope3.total) * 100)
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
          <div className="mt-4 pt-4 border-t border-line flex justify-between items-center gap-4">
            <span className="text-[13px] font-medium text-zinc-500">{s.total}</span>
            <span className="text-lg font-semibold text-zinc-900 tabular">{f.number(scope3.total)} tCO₂e</span>
          </div>
        </Card>

        <div className="space-y-4 sm:space-y-6">
          <StatCard
            label={s.total}
            value={f.number(scope3.total)}
            unit="tCO₂e"
            icon={Gauge}
            deltaLabel={fmt(s.measured, { count: scope3.categories.length })}
          />

          <Card>
            <CardHeader title={s.factorsTitle} className="mb-4" />
            <div className="space-y-2.5">
              {Object.entries(emissionFactors.india).map(([key, v]) => (
                <div key={key} className="flex justify-between items-center gap-3 text-sm">
                  <span className="text-zinc-600">{s.factors[key] ?? key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="font-medium text-zinc-900 tabular">{v.value} <span className="text-zinc-500 font-normal">{v.unit}</span></span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-4 pt-3 border-t border-line">{s.factorsSource}</p>
          </Card>

          <Card>
            <CardHeader title={s.runTitle} description={s.runBody} icon={Calculator} className="mb-4" />
            <Button variant="secondary" icon={Calculator} className="w-full">{s.runEngine}</Button>
          </Card>
        </div>
      </div>
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
