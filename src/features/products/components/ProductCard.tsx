import { useCallback } from 'react'
import { BatteryCharging, ChevronRight, Container, Cpu, Ship, Sun, Zap, type LucideIcon } from 'lucide-react'
import { AnimatedNumber, Badge, Card, Progress } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import type { Product, ProductKind } from '@/features/products/data'
import { pcfOf } from '@/features/products/model'
import { productsStrings } from '@/features/products/products.strings'
import { CertStepper } from './CertStepper'

export const KIND_ICON: Record<ProductKind, LucideIcon> = {
  pv: Sun,
  cell: BatteryCharging,
  ess: Container,
  inverter: Cpu,
  electricity: Zap,
  logistics: Ship,
}

export function ProductCard({ product: p, onOpen }: { product: Product; onOpen: () => void }) {
  const s = useStrings(productsStrings)
  const f = useFormat()
  const Icon = KIND_ICON[p.kind]
  const pcf = pcfOf(p.stages)
  const format = useCallback(
    (n: number) => f.number(n, { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals }),
    [f, p.decimals],
  )

  return (
    <Card
      interactive
      role="button"
      tabIndex={0}
      aria-label={fmt(s.pair, { a: p.name, b: s.viewDetail })}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-900/[0.04] ring-1 ring-inset ring-zinc-900/[0.06] text-zinc-600 flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug tracking-[-0.01em]">{p.name}</h3>
            <p className="text-[13px] text-zinc-500 mt-0.5 truncate">{fmt(s.pair, { a: p.model, b: p.site })}</p>
          </div>
        </div>
        {p.euExport && (
          <Badge tone="info" className="shrink-0">
            {s.euBadge}
          </Badge>
        )}
      </div>

      <div className="mt-5 flex items-baseline gap-1.5 flex-wrap">
        <AnimatedNumber value={pcf} format={format} className="display text-[34px] font-semibold text-zinc-900 leading-none" />
        <span className="text-sm text-zinc-500">{fmt(s.perUnit, { unit: p.declaredUnit })}</span>
      </div>
      {p.altUnit && (
        <p className="mt-1.5 text-xs text-zinc-500 tabular">
          {fmt(s.altValue, { value: f.number(pcf * p.altUnit.factor, { maximumFractionDigits: 0 }), unit: p.altUnit.label })}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge>{s.boundary[p.boundary]}</Badge>
        {p.standards.map(st => (
          <Badge key={st}>{st}</Badge>
        ))}
      </div>

      <div className="mt-5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">{s.primaryData}</span>
          <span className="font-medium text-zinc-800 tabular">{f.percent(p.primaryShare)}</span>
        </div>
        <Progress value={p.primaryShare} tone={p.primaryShare >= 70 ? 'success' : 'warning'} />
        <p className="text-xs text-zinc-500 pt-1 tabular">
          {fmt(s.gridFactor, { value: f.number(p.electricity.factor, { maximumFractionDigits: 4 }) })}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-line">
        <div className="text-xs text-zinc-500 mb-3">{s.certification}</div>
        <CertStepper stage={p.cert} labels={s.cert} />
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between text-xs text-zinc-500">
        <span className="tabular">{fmt(s.version, { version: p.version, date: f.date(p.date) })}</span>
        <span className="inline-flex items-center gap-0.5 font-medium text-zinc-700">
          {s.viewDetail}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Card>
  )
}
