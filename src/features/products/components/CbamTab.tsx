import { ReactNode, useCallback, useMemo, useState } from 'react'
import clsx from 'clsx'
import { motion } from 'motion/react'
import { Ban, CheckCircle2, Euro, FileSpreadsheet, Info, Scale } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AnimatedNumber,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  FadeIn,
  Field,
  Stagger,
  StaggerItem,
  chartTheme,
  ease,
  inputClass,
  tableClass,
  type Tone,
  Switch,
} from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { CBAM_MILESTONES, type CbamVerification, type ProductsData } from '@/features/products/data'
import { cbamExposure, embeddedOf } from '@/features/products/model'
import { productsStrings } from '@/features/products/products.strings'
import { useProductsActions, useProductsSlice } from '@/features/products/store'
import { downloadCsv } from '@/lib/download'
import { daysUntil } from '@/config/regulatory'

const VERIFICATION_TONE: Record<CbamVerification, Tone> = { verified: 'success', inProgress: 'info', pending: 'warning' }

export function CbamTab({ cbam }: { cbam: ProductsData['cbam'] }) {
  const s = useStrings(productsStrings)
  if (!cbam) {
    return (
      <Card>
        <EmptyState icon={Scale} title={s.cbam.naTitle} description={s.cbam.naDesc} />
      </Card>
    )
  }
  return <CbamReady cbam={cbam} />
}

function CbamReady({ cbam }: { cbam: NonNullable<ProductsData['cbam']> }) {
  const s = useStrings(productsStrings)
  const c = s.cbam
  const f = useFormat()
  const slice = useProductsSlice()
  const { setEuPrice, setIncludeIndirect } = useProductsActions()

  const price = slice.euPrice ?? cbam.defaultPrice
  const includeIndirect = slice.includeIndirect ?? false
  // Local text so the field can be cleared while typing; the store keeps the last valid number.
  const [priceText, setPriceText] = useState(String(price))

  const embedded = cbam.lines.reduce((sum, l) => sum + embeddedOf(l, includeIndirect), 0)
  const exposure = cbamExposure(cbam.lines, price, includeIndirect)

  const euro = useCallback((n: number) => f.number(n, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }), [f])
  const tonnes = useCallback((n: number) => f.number(n, { maximumFractionDigits: 0 }), [f])
  const see = (n: number) => f.number(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const chartData = useMemo(
    () => cbam.lines.map(l => ({ code: l.cnCode, good: l.good, actual: l.actual?.direct ?? null, default: l.defaults.direct })),
    [cbam.lines],
  )

  const onPrice = (v: string) => {
    setPriceText(v)
    const n = Number(v)
    if (v.trim() !== '' && Number.isFinite(n) && n >= 0) setEuPrice(n)
  }

  const exportCsv = () => {
    const h = c.csv
    const rows: (string | number)[][] = [
      [h.installation, h.good, h.cnCode, h.category, h.period, h.tonnes, h.direct, h.indirect, h.basis, h.verification],
      ...cbam.lines.map(l => {
        const src = l.basis === 'actual' && l.actual ? l.actual : l.defaults
        return [
          l.installation,
          l.good,
          l.cnCode,
          c.category[l.category],
          '2026-01-01/2026-12-31',
          l.tonnes,
          src.direct,
          src.indirect,
          c.basis[l.basis],
          c.verification[l.verification],
        ]
      }),
    ]
    downloadCsv('CBAM_operator_emissions_communication_2026.csv', rows)
    toast(c.csvDone)
  }

  // Timeline: position of today between the first and last milestone.
  const first = new Date(CBAM_MILESTONES[0].date).getTime()
  const last = new Date(CBAM_MILESTONES[CBAM_MILESTONES.length - 1].date).getTime()
  const todayPos = Math.max(0, Math.min(1, (Date.now() - first) / (last - first)))
  const nextIdx = CBAM_MILESTONES.findIndex(m => daysUntil(m.date) > 0)

  return (
    <div className="space-y-6">
      <Stagger className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <StaggerItem className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader title={c.explainTitle} icon={Info} />
            <p className="text-[13px] leading-relaxed text-zinc-700">{c.explainBody}</p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-line p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Ban className="w-3.5 h-3.5" />
                  {c.notGoods}
                </div>
                <div className="mt-1.5 text-[13px] font-medium text-zinc-900">{c.notGoodsList}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {c.goods}
                </div>
                <div className="mt-1.5 text-[13px] font-medium text-zinc-900">{c.goodsList}</div>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader title={c.exposureTitle} description={c.exposureDesc} icon={Euro} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={c.priceLabel} hint={c.priceHint} htmlFor="cbam-price">
                <input
                  id="cbam-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  value={priceText}
                  onChange={e => onPrice(e.target.value)}
                  className={clsx(inputClass, 'tabular')}
                />
              </Field>
              <div className="space-y-1.5">
                <label htmlFor="cbam-indirect" className="block text-[13px] font-medium text-zinc-700">
                  {c.includeIndirect}
                </label>
                <div className="h-9 flex items-center">
                  <Switch id="cbam-indirect" checked={includeIndirect} onChange={setIncludeIndirect} label={c.includeIndirect} />
                </div>
                <p className="text-xs text-zinc-500">{c.includeIndirectHint}</p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-line grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <div className="text-xs text-zinc-500">{c.embeddedTotal}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <AnimatedNumber value={embedded} format={tonnes} className="display text-xl font-semibold text-zinc-900" />
                  <span className="text-xs text-zinc-500">tCO₂e</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-500">{c.exposure}</div>
                <AnimatedNumber
                  value={exposure}
                  format={euro}
                  className="mt-1 block display text-[26px] font-semibold text-zinc-900 leading-tight truncate"
                />
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">{c.exposureNote}</p>
          </Card>
        </StaggerItem>
      </Stagger>

      {/* Timeline */}
      <FadeCard>
        <CardHeader title={c.timelineTitle} />
        <div className="relative">
          <div className="hidden sm:block absolute left-[16.66%] right-[16.66%] top-[7px] h-0.5 rounded-full bg-zinc-900/[0.08]">
            <motion.div
              className="h-full rounded-full bg-emerald-500 origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: todayPos }}
              transition={{ duration: 0.9, ease: ease.out }}
            />
          </div>
          <ol className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3">
            {CBAM_MILESTONES.map((m, i) => {
              const d = daysUntil(m.date)
              const state = d <= 0 ? 'past' : i === nextIdx ? 'next' : 'upcoming'
              return (
                <li key={m.id} className="flex sm:flex-col sm:items-center gap-3 sm:gap-2 sm:text-center">
                  <span
                    className={clsx(
                      'mt-0.5 sm:mt-0 w-4 h-4 rounded-full ring-1 ring-inset shrink-0',
                      state === 'past' && 'bg-emerald-500 ring-emerald-500',
                      state === 'next' && 'bg-white ring-2 ring-emerald-500',
                      state === 'upcoming' && 'bg-white ring-zinc-900/[0.15]',
                    )}
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-zinc-900 tabular">{f.date(m.date)}</div>
                    <div className="text-[13px] text-zinc-700 leading-snug">{c.milestones[m.id]}</div>
                    <div className="mt-1.5 flex flex-wrap sm:justify-center gap-1.5">
                      <Badge tone={state === 'past' ? 'success' : state === 'next' ? 'info' : 'neutral'}>{c.state[state]}</Badge>
                      {d > 0 && <span className="text-xs text-zinc-500 tabular self-center">{fmt(c.daysAway, { days: f.number(d) })}</span>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </FadeCard>

      {/* Lines */}
      <FadeCard>
        <CardHeader
          title={c.linesTitle}
          description={c.linesDesc}
          className="flex-col sm:flex-row"
          action={
            <Button variant="primary" size="sm" icon={FileSpreadsheet} onClick={exportCsv}>
              {c.generateCsv}
            </Button>
          }
        />
        <div className={tableClass.wrap}>
          <table className={clsx(tableClass.table, 'min-w-[920px]')}>
            <thead>
              <tr>
                <th className={clsx(tableClass.th, 'min-w-[260px]')}>{c.cols.good}</th>
                <th className={tableClass.th}>{c.cols.cnCode}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{c.cols.tonnes}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{c.cols.direct}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{c.cols.indirect}</th>
                <th className={clsx(tableClass.th, 'text-right')}>{c.cols.defaultDirect}</th>
                <th className={tableClass.th}>{c.cols.basis}</th>
                <th className={tableClass.th}>{c.cols.verification}</th>
              </tr>
            </thead>
            <tbody>
              {cbam.lines.map(l => (
                <tr key={l.id} className={tableClass.tr}>
                  <td className={tableClass.td}>
                    <div className="font-medium text-zinc-900">{l.good}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{fmt(s.pair, { a: c.category[l.category], b: l.installation })}</div>
                  </td>
                  <td className={clsx(tableClass.td, 'font-mono text-xs whitespace-nowrap')}>{l.cnCode}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>{tonnes(l.tonnes)}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>{l.actual ? see(l.actual.direct) : s.none}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular')}>{l.actual ? see(l.actual.indirect) : s.none}</td>
                  <td className={clsx(tableClass.td, 'text-right tabular text-zinc-500')}>{see(l.defaults.direct)}</td>
                  <td className={tableClass.td}>
                    <Badge tone={l.basis === 'actual' ? 'neutral' : 'warning'}>{c.basis[l.basis]}</Badge>
                  </td>
                  <td className={tableClass.td}>
                    <Badge tone={VERIFICATION_TONE[l.verification]} dot>
                      {c.verification[l.verification]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-zinc-500">{c.verifierNote}</p>
      </FadeCard>

      {/* Actual vs default */}
      <FadeCard>
        <CardHeader title={c.chartTitle} description={c.chartDesc} />
        <div className="h-[260px] -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={4} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={chartTheme.grid} />
              <XAxis dataKey="code" tick={{ fontSize: 11, fill: chartTheme.axis }} axisLine={false} tickLine={false} interval={0} />
              <YAxis
                width={40}
                tick={{ fontSize: 11, fill: chartTheme.axis }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => f.number(Number(v))}
              />
              <Tooltip
                {...chartTheme.tooltip}
                cursor={{ fill: 'rgba(24,24,27,0.04)' }}
                labelFormatter={(_, payload) => String(payload?.[0]?.payload?.good ?? '')}
                formatter={(v, name) => [v == null ? s.none : see(Number(v)), name === 'actual' ? c.chartActual : c.chartDefault]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={v => <span className="text-zinc-600">{v === 'actual' ? c.chartActual : c.chartDefault}</span>}
              />
              <Bar dataKey="actual" fill={chartTheme.series[1]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="default" fill="#D4D4D8" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </FadeCard>
    </div>
  )
}

function FadeCard({ children }: { children: ReactNode }) {
  return (
    <FadeIn>
      <Card>{children}</Card>
    </FadeIn>
  )
}
