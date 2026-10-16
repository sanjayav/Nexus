import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Zap } from 'lucide-react'
import type { PreferredEmissionFactor } from '../../../lib/orgStore'
import { useFmt } from '../../../lib/fmt'
import { ease, staggerDelay } from '../../../motion/tokens'
import { StateBoundary, Skeleton } from '../../ui'
import useEmissionFactors from './useEmissionFactors'
import { FactorSourceBadge, PreferredMarker } from './FactorSourceBadge'
import { gridBasis, isCnRegion, isElectricity, regionLabel, sourceKey } from './factorMeta'

const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Pick the China grid rows out of a factor list. */
export function splitChinaGrid(rows: PreferredEmissionFactor[]) {
  const grid = rows.filter(r => r.scope === 2 && isElectricity(r.category) && isCnRegion(r.region))
  const pref = grid.filter(r => r.preferred)
  const national = pref.filter(r => r.region.toUpperCase() === 'CN')
  const location = national.find(r => gridBasis(r.fuel_or_activity, r.subcategory) === 'location') ?? null
  const extras = national.filter(r => r !== location)
  const regional = pref
    .filter(r => r.region.toUpperCase() !== 'CN' && gridBasis(r.fuel_or_activity, r.subcategory) === 'location')
    .sort((a, b) => num(b.co2e_per_unit) - num(a.co2e_per_unit))
  // Non-preferred national location-based rows (IEA, older MEE) for comparison.
  const alternates = grid.filter(r => !r.preferred && r.region.toUpperCase() === 'CN' && gridBasis(r.fuel_or_activity, r.subcategory) === 'location')
  return { location, extras, regional, alternates }
}

interface PanelProps {
  /** Pre-loaded factor rows (e.g. the EF library). Omit to fetch preferred scope-2 rows. */
  rows?: PreferredEmissionFactor[]
  /** 'stack' for a side column, 'wide' for a full-width band. */
  layout?: 'stack' | 'wide'
  /** Show the "Open emission factors" link. */
  linkToLibrary?: boolean
  className?: string
}

/**
 * RegionFactorPanel — China grid factors for China-market orgs: the MEE
 * national grid average (location-based Scope 2) as the headline figure, the
 * market-based residual and fossil-only variants beneath it, and the regional
 * grids as a bar ledger with the national average marked. When the full
 * factor list is passed, non-preferred national rows (IEA, older MEE years)
 * are shown against the preferred MEE value.
 */
export default function RegionFactorPanel({ rows: given, layout = 'stack', linkToLibrary = false, className = '' }: PanelProps) {
  const { t } = useTranslation()
  const fetched = useEmissionFactors({ scope: 2, preferredOnly: true }, !given)
  const rows = given ?? fetched.rows
  const loading = given ? false : fetched.loading
  const error = given ? null : fetched.error
  const split = useMemo(() => splitChinaGrid(rows), [rows])
  const empty = !split.location && split.regional.length === 0

  return (
    <section className={`surface-paper overflow-hidden ${className}`} aria-labelledby="cn-grid-title">
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] flex items-center justify-center flex-shrink-0" aria-hidden>
            <Zap className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h2 id="cn-grid-title" className="type-h3 text-[var(--text-primary)]">{t('calculators.factors.cnGridTitle')}</h2>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('calculators.factors.cnGridSubtitle')}</p>
          </div>
        </div>
        {linkToLibrary && (
          <Link
            to="/data/ef-library"
            className="inline-flex items-center gap-1 text-caption font-medium text-[var(--color-brand-strong)] hover:underline whitespace-nowrap min-h-[32px]"
          >
            {t('calculators.factors.openLibrary')}
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        )}
      </header>

      <div className="px-5 pb-5 pt-4">
        <StateBoundary
          loading={loading}
          error={error}
          onRetry={fetched.retry}
          empty={empty}
          compact
          skeleton={<PanelSkeleton />}
          errorState={{ title: t('calculators.factors.loadErrorTitle'), body: t('calculators.factors.loadErrorBody'), density: 'compact' }}
          emptyState={{
            art: 'noData',
            density: 'compact',
            title: t('calculators.factors.cnEmptyTitle'),
            body: t('calculators.factors.cnEmptyBody'),
            cta: linkToLibrary ? { label: t('calculators.factors.openLibrary'), to: '/data/ef-library' } : undefined,
          }}
        >
          <div className={layout === 'wide' ? 'grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : 'space-y-5'}>
            <NationalBlock location={split.location} extras={split.extras} alternates={split.alternates} />
            {split.regional.length > 0 && (
              <RegionalBars rows={split.regional} national={split.location ? num(split.location.co2e_per_unit) : null} />
            )}
          </div>
        </StateBoundary>
      </div>

      <footer className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-caption text-[var(--text-tertiary)]">
        {t('calculators.factors.cnGridFootnote')}
      </footer>
    </section>
  )
}

function NationalBlock({
  location,
  extras,
  alternates,
}: {
  location: PreferredEmissionFactor | null
  extras: PreferredEmissionFactor[]
  alternates: PreferredEmissionFactor[]
}) {
  const { t } = useTranslation()
  const f = useFmt()
  if (!location) return null
  const v = num(location.co2e_per_unit)
  return (
    <div>
      <div className="text-caption font-medium text-[var(--text-secondary)]">{t('calculators.factors.nationalAverage')}</div>
      <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
        <span className="type-figure text-[32px] leading-9 text-[var(--text-primary)]">{f.number(v, { maxFraction: 4 })}</span>
        <span className="text-small text-[var(--text-tertiary)] whitespace-nowrap">{f.unit(location.unit)}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
        <PreferredMarker />
        <FactorSourceBadge source={location.source} version={location.source_version} validFrom={location.valid_from} />
      </div>

      {(extras.length > 0 || alternates.length > 0) && (
        <dl className="mt-4 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {extras.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2">
              <dt className="text-caption text-[var(--text-secondary)] min-w-0">{t(`calculators.factors.basis.${gridBasis(r.fuel_or_activity, r.subcategory)}`)}</dt>
              <dd className="text-small font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                {f.number(num(r.co2e_per_unit), { maxFraction: 4 })}
              </dd>
            </div>
          ))}
          {alternates.map(r => {
            const av = num(r.co2e_per_unit)
            const delta = v ? ((av - v) / v) * 100 : 0
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2">
                <dt className="min-w-0 flex items-center gap-1.5 flex-wrap">
                  <FactorSourceBadge source={r.source} version={r.source_version} validFrom={r.valid_from} />
                  <span className="text-caption text-[var(--text-tertiary)]">{t('calculators.factors.notPreferred')}</span>
                </dt>
                <dd className="text-small tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                  {f.number(av, { maxFraction: 4 })}
                  <span className="ml-1.5 text-caption text-[var(--text-tertiary)]">{f.delta(delta, { percent: true })}</span>
                </dd>
              </div>
            )
          })}
        </dl>
      )}
    </div>
  )
}

function RegionalBars({ rows, national }: { rows: PreferredEmissionFactor[]; national: number | null }) {
  const { t } = useTranslation()
  const f = useFmt()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduce = useReducedMotion()
  const max = Math.max(...rows.map(r => num(r.co2e_per_unit)), national ?? 0) * 1.05 || 1
  const natPct = national != null ? (national / max) * 100 : null

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-caption font-medium text-[var(--text-secondary)]">{t('calculators.factors.regionalGrids')}</div>
        <div className="text-caption text-[var(--text-tertiary)] whitespace-nowrap">{f.unit(rows[0]?.unit ?? 'kgCO2e/kWh')}</div>
      </div>
      <ul className="mt-2.5 space-y-2" aria-label={t('calculators.factors.regionalGrids')}>
        {rows.map((r, i) => {
          const v = num(r.co2e_per_unit)
          const pct = (v / max) * 100
          return (
            <li key={r.id} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center gap-3">
              <span className="text-caption text-[var(--text-secondary)] truncate" title={r.fuel_or_activity}>{regionLabel(t, r.region)}</span>
              <span className="relative h-2 rounded-full bg-[var(--bg-tertiary)]">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'var(--chart-s2)' }}
                  initial={reduce ? false : { width: '0%' }}
                  animate={inView || reduce ? { width: `${pct}%` } : { width: '0%' }}
                  transition={{ duration: 0.6, ease: ease.out, delay: staggerDelay(i) }}
                />
                {natPct != null && (
                  <span
                    className="absolute -top-1 -bottom-1 w-px bg-[var(--chart-ink)] opacity-60"
                    style={{ left: `${natPct}%` }}
                    aria-hidden
                  />
                )}
              </span>
              <span className="text-caption font-semibold tabular-nums text-[var(--text-primary)] text-right w-[3.25rem]">
                {f.number(v, { precision: 4 })}
              </span>
            </li>
          )
        })}
      </ul>
      {natPct != null && (
        <p className="mt-2.5 text-caption text-[var(--text-tertiary)] flex items-center gap-1.5">
          <span className="inline-block w-px h-3 bg-[var(--chart-ink)] opacity-60" aria-hidden />
          {t('calculators.factors.nationalMarker')}
        </p>
      )}
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-40" rounded="md" />
      <Skeleton className="h-5 w-52" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
      </div>
    </div>
  )
}

/**
 * PreferredFactorList — for global orgs: the preferred grid-electricity row
 * per region, compact ledger.
 */
export function PreferredFactorList({ limit = 6, linkToLibrary = false, className = '' }: { limit?: number; linkToLibrary?: boolean; className?: string }) {
  const { t } = useTranslation()
  const f = useFmt()
  const q = useEmissionFactors({ scope: 2, preferredOnly: true })
  const rows = useMemo(
    () => q.rows.filter(r => isElectricity(r.category) && gridBasis(r.fuel_or_activity, r.subcategory) === 'location').slice(0, limit),
    [q.rows, limit],
  )
  return (
    <section className={`surface-paper overflow-hidden ${className}`}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] flex items-center justify-center flex-shrink-0" aria-hidden>
            <Zap className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h2 className="type-h3 text-[var(--text-primary)]">{t('calculators.factors.gridTitle')}</h2>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('calculators.factors.gridSubtitle')}</p>
          </div>
        </div>
        {linkToLibrary && (
          <Link to="/data/ef-library" className="inline-flex items-center gap-1 text-caption font-medium text-[var(--color-brand-strong)] hover:underline whitespace-nowrap min-h-[32px]">
            {t('calculators.factors.openLibrary')}
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        )}
      </header>
      <div className="px-5 pb-4 pt-3">
        <StateBoundary
          loading={q.loading}
          error={q.error}
          onRetry={q.retry}
          empty={rows.length === 0}
          compact
          skeleton={<PanelSkeleton />}
          errorState={{ title: t('calculators.factors.loadErrorTitle'), body: t('calculators.factors.loadErrorBody'), density: 'compact' }}
          emptyState={{ art: 'noData', density: 'compact', title: t('calculators.factors.emptyTitle'), body: t('calculators.factors.emptyBody') }}
        >
          <ul className="divide-y divide-[var(--border-subtle)]">
            {rows.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-small font-medium text-[var(--text-primary)] truncate">{regionLabel(t, r.region)}</div>
                  <div className="mt-1"><FactorSourceBadge source={r.source} version={r.source_version} validFrom={r.valid_from} /></div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="text-small font-semibold tabular-nums text-[var(--text-primary)]">{f.number(num(r.co2e_per_unit), { maxFraction: 4 })}</div>
                  <div className="text-caption text-[var(--text-tertiary)]">{f.unit(r.unit)}</div>
                </div>
              </li>
            ))}
          </ul>
        </StateBoundary>
      </div>
    </section>
  )
}

/**
 * PreferredFactorInline — one-line "factor in use" strip for a calculator:
 * the preferred grid factor for the org's market, with source and marker.
 */
export function PreferredFactorInline({
  isCn,
  onUse,
  className = '',
}: {
  isCn: boolean
  /** Offer a "Use this factor" action (fills the calculator's grid EF input). */
  onUse?: (row: PreferredEmissionFactor) => void
  className?: string
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const q = useEmissionFactors({ scope: 2, preferredOnly: true })
  const row = useMemo(() => {
    const grid = q.rows.filter(r => isElectricity(r.category) && gridBasis(r.fuel_or_activity, r.subcategory) === 'location')
    if (isCn) return grid.find(r => r.region.toUpperCase() === 'CN') ?? null
    return grid.find(r => r.region.toUpperCase() === 'GLOBAL') ?? null
  }, [q.rows, isCn])

  if (q.error) {
    return (
      <div className={`flex items-center justify-between gap-3 text-caption text-[var(--text-tertiary)] ${className}`} role="status">
        <span>{t('calculators.factors.inlineError')}</span>
        <button type="button" onClick={q.retry} className="font-medium text-[var(--color-brand-strong)] hover:underline min-h-[32px]">
          {t('calculators.factors.retry')}
        </button>
      </div>
    )
  }
  if (q.loading) return <Skeleton className={`h-5 w-64 ${className}`} />
  if (!row) return null
  const official = sourceKey(row.source) !== 'other' && isCnRegion(row.region)
  return (
    <div className={`flex items-center gap-x-3 gap-y-1.5 flex-wrap ${className}`}>
      <span className="text-caption text-[var(--text-tertiary)]">{t('calculators.factors.preferredGridFactor')}</span>
      <span className="text-small font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">
        {f.number(num(row.co2e_per_unit), { maxFraction: 4 })}
        <span className="ml-1 text-caption font-normal text-[var(--text-tertiary)]">{f.unit(row.unit)}</span>
      </span>
      <span className="text-caption text-[var(--text-secondary)]">{regionLabel(t, row.region)}</span>
      <FactorSourceBadge source={row.source} version={row.source_version} validFrom={row.valid_from} />
      <PreferredMarker regional={official || isCn} />
      {onUse && (
        <button
          type="button"
          onClick={() => onUse(row)}
          className="ml-auto inline-flex items-center min-h-[32px] px-2.5 rounded-[var(--radius-sm)] text-caption font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)]"
        >
          {t('calculators.factors.useFactor')}
        </button>
      )}
    </div>
  )
}
