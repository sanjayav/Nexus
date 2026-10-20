import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, Database, Globe, PackageCheck } from 'lucide-react'
import { AnimatedNumber, Card, EmptyState, FadeIn, PageHeader, Stagger, StaggerItem, Stat, StatStrip, Tabs } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { productsStrings } from './products.strings'
import { useProductsData } from './hooks'
import { ProductCard } from './components/ProductCard'
import { ProductSheet } from './components/ProductSheet'
import { PassportTab } from './components/PassportTab'
import { CbamTab } from './components/CbamTab'

type Tab = 'footprints' | 'passport' | 'cbam'
const TABS: Tab[] = ['footprints', 'passport', 'cbam']

export default function ProductFootprintPage() {
  const { workspace } = useWorkspace()
  // Keyed so sheet and tab-local state never leak between tenants.
  return <ProductFootprintView key={workspace.id} />
}

function ProductFootprintView() {
  const s = useStrings(productsStrings)
  const f = useFormat()
  const { workspace } = useWorkspace()
  const data = useProductsData()
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.find(t => t === params.get('tab')) ?? 'footprints'
  const setTab = (t: Tab) =>
    setParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (t === 'footprints') next.delete('tab')
        else next.set('tab', t)
        return next
      },
      { replace: true },
    )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const selected = data.products.find(p => p.id === selectedId) ?? null
  // Stable: the sheet's dismiss effect re-runs (and refocuses) whenever onClose changes.
  const closeSheet = useCallback(() => setOpen(false), [])

  const products = data.products
  const certified = products.filter(p => p.cert === 'certified').length
  const inProgress = products.filter(p => p.cert === 'applied' || p.cert === 'audit').length
  const avgPrimary = products.length ? products.reduce((sum, p) => sum + p.primaryShare, 0) / products.length : 0
  const euExport = products.filter(p => p.euExport).length
  const int = useCallback((n: number) => f.number(Math.round(n)), [f])
  const pct = useCallback((n: number) => f.percent(n), [f])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={fmt(s.eyebrow, { year: workspace.reportingYear })} title={s.title} description={s.description} />

      <FadeIn>
        <StatStrip>
          <Stat label={s.stats.products} icon={PackageCheck} value={<AnimatedNumber value={products.length} format={int} />} />
          <Stat
            label={s.stats.certified}
            icon={BadgeCheck}
            value={<AnimatedNumber value={certified} format={int} />}
            deltaLabel={fmt(s.stats.inProgress, { count: inProgress })}
          />
          <Stat
            label={s.stats.primary}
            icon={Database}
            value={<AnimatedNumber value={avgPrimary} format={pct} />}
            deltaLabel={s.stats.primaryCaption}
          />
          <Stat
            label={s.stats.euExport}
            icon={Globe}
            value={<AnimatedNumber value={euExport} format={int} />}
            deltaLabel={euExport > 0 ? s.stats.euCaption : s.stats.euNone}
          />
        </StatStrip>
      </FadeIn>

      <Tabs items={TABS.map(t => ({ value: t, label: s.tabs[t] }))} value={tab} onChange={setTab} />

      {tab === 'footprints' &&
        (products.length === 0 ? (
          <Card>
            <EmptyState icon={PackageCheck} title={s.emptyTitle} description={s.emptyDesc} />
          </Card>
        ) : (
          <Stagger key="footprints" className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {products.map(p => (
              <StaggerItem key={p.id}>
                <ProductCard
                  product={p}
                  onOpen={() => {
                    setSelectedId(p.id)
                    setOpen(true)
                  }}
                />
              </StaggerItem>
            ))}
          </Stagger>
        ))}
      {tab === 'passport' && <PassportTab passport={data.passport} />}
      {tab === 'cbam' && <CbamTab cbam={data.cbam} />}

      <ProductSheet product={selected} open={open} onClose={closeSheet} />
    </div>
  )
}
