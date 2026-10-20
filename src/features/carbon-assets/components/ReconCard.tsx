import { ReactNode, useCallback } from 'react'
import { CheckCircle2, Equal, Minus, Scale } from 'lucide-react'
import { AnimatedNumber, Badge, Card, CardHeader, Progress } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useL10n, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { carbonAssetsStrings } from '@/features/carbon-assets/carbonAssets.strings'
import type { CarbonAssetsView } from '@/features/carbon-assets/hooks'

export function ReconCard({ view }: { view: CarbonAssetsView }) {
  const s = useStrings(carbonAssetsStrings)
  const r = s.recon
  const f = useFormat()
  const l10n = useL10n()
  const { region } = useWorkspace()
  const { scope2, location, factor, reportedMarket } = view
  const int = useCallback((n: number) => f.number(Math.round(n)), [f])
  const diff = Math.round(scope2.market) - reportedMarket
  const matches = Math.abs(diff) < 1

  return (
    <Card>
      <CardHeader
        title={r.title}
        description={fmt(r.desc, { source: l10n(region.gridFactor.source) })}
        icon={Scale}
        className="flex-col sm:flex-row"
        action={
          matches ? (
            <Badge tone="success" icon={CheckCircle2}>
              {r.matches}
            </Badge>
          ) : (
            <Badge tone="warning">
              {fmt(r.differs, { delta: f.number(diff, { signDisplay: 'exceptZero' }), reported: f.number(reportedMarket) })}
            </Badge>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3">
        <Figure
          label={r.location}
          value={<span className="tabular">{f.number(location)}</span>}
          sub={fmt(s.pair, { a: r.grid, b: fmt(s.mwh, { value: f.number(Math.round(scope2.gridMWh)) }) })}
        />
        <Op icon={Minus} />
        <Figure
          label={fmt(r.less, {
            name: r.instrumentsShort[region.id],
            mwh: f.number(Math.round(scope2.covered)),
            factor: f.number(factor, { maximumFractionDigits: 4 }),
          })}
          value={<AnimatedNumber value={scope2.reduction} format={int} />}
        />
        <Op icon={Equal} />
        <Figure emphasis label={r.market} value={<AnimatedNumber value={scope2.market} format={int} />} />
      </div>

      <div className="mt-5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">{r.coverage}</span>
          <span className="font-medium text-zinc-900 tabular">{f.percent(scope2.coverage, 1)}</span>
        </div>
        <Progress value={scope2.coverage} tone="success" />
      </div>
      <p className="mt-4 text-xs text-zinc-500 leading-relaxed">{r.note}</p>
    </Card>
  )
}

function Figure({ label, value, sub, emphasis }: { label: string; value: ReactNode; sub?: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? 'rounded-xl bg-zinc-900 text-white p-4 min-w-0' : 'rounded-xl border border-line p-4 min-w-0'}>
      <div className={emphasis ? 'text-xs text-zinc-300 leading-snug' : 'text-xs text-zinc-500 leading-snug'}>{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={
            emphasis ? 'display text-[26px] font-semibold leading-none' : 'display text-[26px] font-semibold text-zinc-900 leading-none'
          }
        >
          {value}
        </span>
        <span className={emphasis ? 'text-xs text-zinc-300' : 'text-xs text-zinc-500'}>tCO₂e</span>
      </div>
      {sub && <div className="mt-1.5 text-xs text-zinc-500 tabular">{sub}</div>}
    </div>
  )
}

function Op({ icon: Icon }: { icon: typeof Minus }) {
  return (
    <div className="flex items-center justify-center text-zinc-400" aria-hidden>
      <Icon className="w-4 h-4" />
    </div>
  )
}
