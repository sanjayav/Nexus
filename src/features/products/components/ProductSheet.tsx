import { useCallback, useId, useMemo, useState } from 'react'
import { ArrowRight, Download, Flame, Recycle, RotateCcw, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AnimatedNumber, Badge, Button, Progress, Sheet, Tabs, chartTheme } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { downloadCsv } from '@/lib/download'
import { CERT_STAGES, STAGES, type CertStage, type Product, type Stage } from '@/features/products/data'
import {
  PRIMARY_ALUMINIUM_FACTOR,
  RECYCLED_ALUMINIUM_FACTOR,
  baselineScenario,
  pcfOf,
  round,
  scenarioStages,
  type Scenario,
} from '@/features/products/model'
import { productsStrings } from '@/features/products/products.strings'
import { useProductsActions } from '@/features/products/store'
import { CertStepper } from './CertStepper'

const STAGE_COLOR: Record<Stage, string> = {
  raw: chartTheme.series[0],
  manufacturing: chartTheme.series[1],
  distribution: chartTheme.series[2],
  use: chartTheme.series[3],
  endOfLife: chartTheme.series[4],
}

export function ProductSheet({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const s = useStrings(productsStrings)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="max-w-[640px]"
      title={product?.name ?? ''}
      description={product ? fmt(s.pair, { a: product.model, b: product.site }) : undefined}
    >
      {/* Keyed so the scenario resets when a different product opens. */}
      {product && <SheetBody key={product.id} product={product} />}
    </Sheet>
  )
}

function SheetBody({ product: p }: { product: Product }) {
  const s = useStrings(productsStrings)
  const f = useFormat()
  const { setCert } = useProductsActions()
  const [sc, setSc] = useState<Scenario>(() => baselineScenario(p))

  const base = useMemo(() => pcfOf(p.stages), [p.stages])
  const scStages = useMemo(() => scenarioStages(p, sc), [p, sc])
  const scenario = pcfOf(scStages)
  const delta = scenario - base
  const deltaPct = base > 0 ? delta / base : 0
  const changed = sc.green !== p.electricity.baselineGreen || sc.recycled !== (p.aluminium?.baselineRecycled ?? 0)

  const num = useCallback(
    (n: number) => f.number(n, { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals }),
    [f, p.decimals],
  )
  const outside = (st: Stage) => p.boundary === 'cradleToGate' && st !== 'raw' && st !== 'manufacturing'
  const shownStages = STAGES.filter(st => !outside(st))

  const chartData = [
    { name: s.sheet.baseline, ...p.stages },
    { name: s.sheet.scenario, ...scStages },
  ]

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      [s.csv.field, s.csv.value],
      [s.csv.product, p.name],
      [s.csv.model, p.model],
      [s.csv.site, p.site],
      [s.csv.declaredUnit, p.declaredUnit],
      [s.csv.boundary, s.boundary[p.boundary]],
      [s.csv.standards, p.standards.join('; ')],
      [s.csv.pcf, round(base, p.decimals + 1)],
      ...shownStages.map(st => [fmt(s.csv.stage, { stage: s.stages[st] }), round(p.stages[st], p.decimals + 1)]),
      [s.csv.primaryShare, p.primaryShare],
      [s.csv.gridFactor, p.electricity.factor],
      [s.csv.factorSources, p.factorSources.join('; ')],
      [s.csv.version, p.version],
      [s.csv.date, p.date],
      [s.csv.cert, s.cert[p.cert]],
    ]
    if (changed) {
      rows.push([s.csv.scenario, round(scenario, p.decimals + 1)], [s.csv.greenShare, sc.green])
      if (p.aluminium) rows.push([s.csv.recycledShare, sc.recycled])
    }
    rows.push([s.csv.generated, new Date().toISOString()])
    downloadCsv(`PCF_${p.model.replace(/\s+/g, '_')}_${p.version}.csv`, rows)
    toast(s.sheet.exported)
  }

  const updateCert = (stage: CertStage) => {
    setCert(p.id, stage)
    toast(fmt(s.sheet.certUpdated, { stage: s.cert[stage] }), 'info')
  }

  return (
    <div className="space-y-7">
      {/* Facts */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
        <Fact label={s.sheet.declaredUnit} value={p.altUnit ? fmt(s.pair, { a: p.declaredUnit, b: p.altUnit.label }) : p.declaredUnit} />
        <Fact label={s.sheet.boundaryLabel} value={s.boundary[p.boundary]} />
        <Fact label={s.sheet.standards} value={p.standards.join(' / ')} />
        <Fact label={s.sheet.site} value={p.site} />
      </dl>

      {/* Headline + what-if */}
      <section className="rounded-2xl border border-line bg-zinc-50/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-zinc-900">{s.sheet.whatIfTitle}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{s.sheet.whatIfDesc}</p>
          </div>
          <Button size="sm" variant="ghost" icon={RotateCcw} disabled={!changed} onClick={() => setSc(baselineScenario(p))}>
            {s.sheet.reset}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">{s.sheet.baseline}</div>
            <div className="mt-1 display text-xl font-semibold text-zinc-500 leading-none truncate">{num(base)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">{s.sheet.scenarioPcf}</div>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <AnimatedNumber value={scenario} format={num} className="display text-[28px] font-semibold text-zinc-900 leading-none" />
              <Badge tone={delta < 0 ? 'success' : 'neutral'} className="tabular">
                {f.number(deltaPct, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-zinc-500 tabular">
              {fmt(s.sheet.vsBaseline, {
                delta: f.number(delta, { maximumFractionDigits: p.decimals, signDisplay: 'exceptZero' }),
                unit: p.declaredUnit,
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <Slider
            icon={Zap}
            label={s.sheet.greenShare}
            value={sc.green}
            baseline={p.electricity.baselineGreen}
            baselineLabel={fmt(s.sheet.baselineMark, { pct: f.percent(p.electricity.baselineGreen) })}
            display={f.percent(sc.green)}
            onChange={green => setSc(v => ({ ...v, green }))}
          />
          {p.aluminium ? (
            <Slider
              icon={Recycle}
              label={s.sheet.recycledShare}
              value={sc.recycled}
              baseline={p.aluminium.baselineRecycled}
              baselineLabel={fmt(s.sheet.baselineMark, { pct: f.percent(p.aluminium.baselineRecycled) })}
              display={f.percent(sc.recycled)}
              onChange={recycled => setSc(v => ({ ...v, recycled }))}
            />
          ) : (
            <p className="text-xs text-zinc-500">{s.sheet.noAluminium}</p>
          )}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
          {fmt(s.sheet.modelNote, {
            primary: f.number(PRIMARY_ALUMINIUM_FACTOR),
            recycled: f.number(RECYCLED_ALUMINIUM_FACTOR),
            grid: f.number(p.electricity.factor, { maximumFractionDigits: 4 }),
          })}
        </p>
      </section>

      {/* Lifecycle stages */}
      <section>
        <h3 className="text-[15px] font-semibold text-zinc-900">{s.sheet.stagesTitle}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{fmt(s.sheet.stagesDesc, { unit: p.declaredUnit })}</p>
        <div className="mt-3 h-[132px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap={14}>
              <CartesianGrid horizontal={false} stroke={chartTheme.grid} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: chartTheme.axis }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => f.number(Number(v), { maximumFractionDigits: 2 })}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={68}
                tick={{ fontSize: 12, fill: chartTheme.axis }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                {...chartTheme.tooltip}
                cursor={{ fill: 'rgba(24,24,27,0.04)' }}
                formatter={(v, name) => [num(Number(v)), s.stages[name as Stage] ?? String(name)]}
              />
              {/* Not animated: the scenario bar follows the sliders directly. */}
              {shownStages.map((st, i) => (
                <Bar
                  key={st}
                  dataKey={st}
                  stackId="pcf"
                  fill={STAGE_COLOR[st]}
                  isAnimationActive={false}
                  radius={i === shownStages.length - 1 ? [0, 6, 6, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {STAGES.map(st => (
            <li key={st} className="flex items-center justify-between gap-3 py-2 text-[13px]">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: outside(st) ? '#E4E4E7' : STAGE_COLOR[st] }} />
                <span className={outside(st) ? 'text-zinc-400' : 'text-zinc-700'}>{s.stages[st]}</span>
              </span>
              {outside(st) ? (
                <span className="text-xs text-zinc-400">{s.sheet.outside}</span>
              ) : (
                <span className="tabular text-zinc-900">
                  {num(p.stages[st])}
                  {scStages[st] !== p.stages[st] && (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                      <ArrowRight className="w-3 h-3" />
                      {num(scStages[st])}
                    </span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Hotspots */}
      <section>
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-zinc-400" />
          <h3 className="text-[15px] font-semibold text-zinc-900">{s.sheet.hotspotsTitle}</h3>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{s.sheet.hotspotsDesc}</p>
        <ul className="mt-3 space-y-3">
          {p.hotspots.map((h, i) => (
            <li key={h.name}>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-zinc-800 min-w-0 truncate">
                  <span className="text-zinc-400 tabular mr-2">{i + 1}</span>
                  {h.name}
                </span>
                <span className="tabular font-medium text-zinc-900">{f.percent(h.share)}</span>
              </div>
              <Progress value={h.share} className="mt-1.5" tone={i === 0 ? 'neutral' : 'info'} />
            </li>
          ))}
        </ul>
      </section>

      {/* Certification */}
      <section>
        <h3 className="text-[15px] font-semibold text-zinc-900">{s.sheet.certTitle}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{fmt(s.pair, { a: s.sheet.certScheme, b: p.certScheme })}</p>
        <div className="mt-4">
          <CertStepper stage={p.cert} labels={s.cert} />
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500">{s.sheet.setStage}</span>
          <Tabs
            items={CERT_STAGES.map(st => ({ value: st, label: s.cert[st] }))}
            value={p.cert}
            onChange={updateCert}
            className="self-start"
          />
        </div>
      </section>

      {/* Data quality and sources */}
      <section>
        <h3 className="text-[15px] font-semibold text-zinc-900">{s.sheet.dataQuality}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{fmt(s.sheet.primaryShare, { pct: f.percent(p.primaryShare) })}</p>
        <Progress value={p.primaryShare} tone={p.primaryShare >= 70 ? 'success' : 'warning'} className="mt-3" />
        <div className="mt-4 text-xs text-zinc-500">{s.sheet.factorSources}</div>
        <ul className="mt-1.5 space-y-1 text-[13px] text-zinc-700 list-disc pl-4 marker:text-zinc-300">
          {p.factorSources.map(src => (
            <li key={src}>{src}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="primary" icon={Download} onClick={exportCsv}>
          {s.sheet.exportCsv}
        </Button>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900 font-medium break-words">{value}</dd>
    </div>
  )
}

function Slider({
  icon: Icon,
  label,
  value,
  baseline,
  baselineLabel,
  display,
  onChange,
}: {
  icon: typeof Zap
  label: string
  value: number
  baseline: number
  baselineLabel: string
  display: string
  onChange: (v: number) => void
}) {
  const id = useId()
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-2 text-[13px] font-medium text-zinc-800 min-w-0">
          <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
          <span>{label}</span>
        </label>
        <span className="tabular text-[13px] font-semibold text-zinc-900">{display}</span>
      </div>
      <div className="relative mt-2">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          aria-valuetext={display}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 accent-zinc-900 cursor-pointer"
        />
        {/* Baseline tick. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-2 h-1.5 w-0.5 rounded-full bg-zinc-400 -translate-x-1/2"
          style={{ left: `${baseline}%` }}
        />
      </div>
      <div className="mt-2.5 text-[11px] text-zinc-500 tabular">{baselineLabel}</div>
    </div>
  )
}
