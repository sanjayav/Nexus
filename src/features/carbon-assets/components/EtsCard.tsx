import { useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Coins, Landmark, ShieldCheck } from 'lucide-react'
import { AnimatedNumber, Badge, Card, CardHeader, Progress, ease, Switch } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useMoney } from '@/features/workspace/WorkspaceContext'
import { carbonAssetsStrings } from '@/features/carbon-assets/carbonAssets.strings'
import type { EtsContext } from '@/features/carbon-assets/data'
import { useCarbonAssetsActions } from '@/features/carbon-assets/store'

export function EtsCard({ ets, scenarioOn }: { ets: EtsContext; scenarioOn: boolean }) {
  return ets.kind === 'cn' ? <CnEts ets={ets} scenarioOn={scenarioOn} /> : <NoEts internalPrice={ets.internalPrice} />
}

function CnEts({ ets, scenarioOn }: { ets: Extract<EtsContext, { kind: 'cn' }>; scenarioOn: boolean }) {
  const s = useStrings(carbonAssetsStrings)
  const e = s.ets.cn
  const f = useFormat()
  const money = useMoney()
  const { setEtsScenario } = useCarbonAssetsActions()
  const sc = ets.scenario
  const gap = sc.emissions - sc.allowances
  const int = useCallback((n: number) => f.number(Math.round(n)), [f])
  const cash = useCallback((n: number) => money.full(n), [money])

  return (
    <Card>
      <CardHeader title={e.title} icon={Landmark} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-line p-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-zinc-900">{e.statusTitle}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">{e.statusBody}</p>
              <div className="mt-3 text-xs text-zinc-500">{e.covered}</div>
              <div className="mt-0.5 text-[13px] font-medium text-zinc-800">{e.coveredList}</div>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
              <h4 className="text-[13px] font-semibold text-zinc-900 shrink-0">{e.watchlist}</h4>
              <span className="text-xs text-zinc-500 sm:text-right">{e.watchlistNote}</span>
            </div>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {ets.watchlist.map(w => (
                <li key={w.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <div className="flex items-center gap-2 sm:w-40 shrink-0">
                    <span className="text-[13px] font-medium text-zinc-900">{s.ets.sectors[w.id]}</span>
                    <Badge tone="info">{e.sectorStatus}</Badge>
                  </div>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge tone={w.relevant ? 'warning' : 'neutral'} dot>
                      {w.relevant ? e.relevant : e.notRelevant}
                    </Badge>
                    <span className="text-xs text-zinc-500 min-w-0">{w.note}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-zinc-50/60 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <label htmlFor="ets-scenario" className="text-[14px] font-semibold text-zinc-900">
                {e.toggle}
              </label>
              <p className="mt-0.5 text-xs text-zinc-500">{fmt(e.scenarioDesc, { entity: sc.entity })}</p>
            </div>
            <Switch id="ets-scenario" checked={scenarioOn} onChange={setEtsScenario} label={e.toggle} />
          </div>

          <AnimatePresence initial={false}>
            {scenarioOn && (
              <motion.div
                key="scenario"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.24, ease: ease.out }}
                className="mt-5 space-y-4"
              >
                <Row label={e.emissions} value={f.number(sc.emissions)} pct={100} tone="neutral" />
                <Row
                  label={e.allowances}
                  value={f.number(sc.allowances)}
                  pct={(sc.allowances / Math.max(sc.emissions, sc.allowances)) * 100}
                  tone="success"
                />
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-500">{gap > 0 ? e.shortfall : e.surplus}</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <AnimatedNumber value={Math.abs(gap)} format={int} className="display text-xl font-semibold text-zinc-900" />
                      <span className="text-xs text-zinc-500">tCO₂e</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-500">{fmt(e.cost, { price: money.full(sc.price) })}</div>
                    <AnimatedNumber
                      value={Math.max(0, gap) * sc.price}
                      format={cash}
                      className="mt-1 block display text-xl font-semibold text-zinc-900 truncate"
                    />
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500">{e.scenarioNote}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  )
}

function Row({ label, value, pct, tone }: { label: string; value: string; pct: number; tone: 'neutral' | 'success' }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-zinc-600">{label}</span>
        <span className="tabular font-medium text-zinc-900">
          {value} <span className="text-xs font-normal text-zinc-500">tCO₂e</span>
        </span>
      </div>
      <Progress value={pct} tone={tone} className="mt-1.5" />
    </div>
  )
}

function NoEts({ internalPrice }: { internalPrice: number }) {
  const s = useStrings(carbonAssetsStrings)
  const e = s.ets.global
  const money = useMoney()
  return (
    <Card>
      <CardHeader title={e.title} icon={Landmark} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-line p-4">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-zinc-900">{e.statusTitle}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">{e.statusBody}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-line p-4">
          <Coins className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-zinc-900">{e.internalPrice}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">
              {fmt(e.internalPriceBody, { price: money.full(internalPrice) })}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
