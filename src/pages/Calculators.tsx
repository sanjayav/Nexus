import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { Calculator as CalcIcon, ArrowRight, Search, X, Truck, Landmark, ChevronRight } from 'lucide-react'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import { CALCULATORS, findCalculator, hasCalculator, type CalcDescriptor } from '../calculators/registry'
import { localizeCalc, localizeUnit } from '../calculators/labels'
import { itemLabel } from '../lib/itemLabel'
import SetupGuard from '../components/SetupGuard'
import { Button } from '../design-system'
import PageHeader from '../components/PageHeader'
import { StatLedger, StateBoundary, EmptyState, SkeletonCard, SkeletonLedger } from '../components/ui'
import { riseIn } from '../motion/tokens'
import useOrgMarket from '../components/analytics/useOrgMarket'
import { RegionFactorPanel, PreferredFactorList, PreferredFactorInline } from '../components/analytics/factors'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; error: string }
  | { kind: 'ready'; items: NexusQuestionnaireItem[] }

/** Calculators whose result depends on the grid electricity factor. */
const GRID_CALCULATORS = new Set(['scope-2-electricity'])

/**
 * Calculators hub — fully derived from the live GRI questionnaire.
 * Only shows line items that have a registered calculator in the registry
 * (src/calculators/registry.ts). Grouped by descriptor so users see one
 * row per calculator with every question it applies to listed inline.
 * China-market orgs also see the MEE grid factors the electricity
 * calculator uses.
 */
export default function Calculators() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const market = useOrgMarket()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const items = await nexus.tree()
      if (items.length === 0) return setState({ kind: 'empty' })
      setState({ kind: 'ready', items })
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : t('calculators.page.failedToLoad') })
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  // All calculator groups (unfiltered) — for the ledger and the empty state.
  const allGroups = useMemo(() => {
    if (state.kind !== 'ready') return []
    const by = new Map<string, NexusQuestionnaireItem[]>()
    for (const item of state.items) {
      const d = findCalculator(item)
      if (!d) continue
      by.set(d.id, [...(by.get(d.id) ?? []), item])
    }
    return CALCULATORS.filter(d => by.has(d.id)).map(d => ({ descriptor: d, items: by.get(d.id)! }))
  }, [state])

  // Filtered + localised groups. Dedupe happens upstream in nexus.tree().
  const groups = useMemo(() => {
    const q = query.toLowerCase().trim()
    const out: Array<{ descriptor: CalcDescriptor; items: NexusQuestionnaireItem[] }> = []
    for (const g of allGroups) {
      const ld = localizeCalc(t, g.descriptor)
      const items = g.items.filter(item => {
        if (!q) return true
        const hay = `${g.descriptor.title} ${g.descriptor.description} ${ld.title} ${ld.description} ${item.line_item} ${itemLabel(item, i18n.language)} ${item.gri_code} ${item.section}`.toLowerCase()
        return hay.includes(q)
      })
      if (items.length) out.push({ descriptor: ld, items })
    }
    return out
  }, [allGroups, query, t, i18n.language])

  // Line items marked Calculator-mode but missing a registered descriptor.
  const uncovered = useMemo(() => {
    if (state.kind !== 'ready') return []
    return state.items.filter(i => i.entry_mode_default === 'Calculator' && !hasCalculator(i) && i.reporting_scope === 'group')
  }, [state])

  if (state.kind === 'empty') return <SetupGuard onReady={load} />

  const ready = state.kind === 'ready'
  const totalCovered = allGroups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('calculators.page.breadcrumbData'), to: '/data' },
          { label: t('calculators.page.title') },
        ]}
        title={t('calculators.page.title')}
        description={t('calculators.page.description')}
        actions={
          <>
            <Button variant="secondary" size="md" onClick={() => navigate('/questionnaires')}>{t('calculators.page.openGriTree')}</Button>
            <Button variant="primary" size="md" onClick={() => navigate('/data/entry')}>{t('calculators.page.dataEntry')}</Button>
          </>
        }
      />

      <StateBoundary
        loading={state.kind === 'loading'}
        error={state.kind === 'error' ? state.error : null}
        onRetry={load}
        errorState={{ title: t('calculators.page.errorTitle') }}
        skeleton={
          <div className="space-y-5">
            <SkeletonLedger items={3} />
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        }
      >
        <div className="space-y-6">
          <StatLedger
            aria-label={t('calculators.hub.ledgerLabel')}
            items={[
              { id: 'calcs', label: t('calculators.hub.kpiCalculators'), value: allGroups.length, tone: 'brand' },
              { id: 'items', label: t('calculators.hub.kpiLineItems'), value: totalCovered, tone: 'success' },
              {
                id: 'gap',
                label: t('calculators.hub.kpiGap'),
                value: uncovered.length,
                tone: uncovered.length > 0 ? 'warning' : 'neutral',
                hint: uncovered.length > 0 ? t('calculators.hub.kpiGapHint') : t('calculators.hub.kpiGapNone'),
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
            <div className="space-y-4 min-w-0">
              <SearchBar value={query} onChange={setQuery} shown={groups.length} />

              {allGroups.length === 0 ? (
                <EmptyState
                  framed
                  art="noData"
                  title={t('calculators.hub.noneTitle')}
                  body={t('calculators.hub.noneBody')}
                  cta={{ label: t('calculators.page.openGriTree'), to: '/questionnaires' }}
                />
              ) : groups.length === 0 ? (
                <EmptyState
                  variant="filtered"
                  framed
                  title={t('calculators.page.noMatch', { query })}
                  body={t('calculators.hub.noMatchBody')}
                  onClearFilters={() => setQuery('')}
                />
              ) : (
                <div className="space-y-3">
                  {groups.map(({ descriptor, items }, i) => (
                    <CalculatorCard
                      key={descriptor.id}
                      index={i}
                      descriptor={descriptor}
                      items={items}
                      showGridFactor={GRID_CALCULATORS.has(descriptor.id) && !market.loading}
                      isCn={market.isCn}
                    />
                  ))}
                </div>
              )}

              {ready && uncovered.length > 0 && !query && <CoverageGap items={uncovered} />}
            </div>

            <aside className="space-y-4 min-w-0 xl:sticky xl:top-20">
              {market.loading ? null : market.isCn ? (
                <RegionFactorPanel linkToLibrary />
              ) : (
                <PreferredFactorList linkToLibrary />
              )}
              <MoreCalculators />
            </aside>
          </div>
        </div>
      </StateBoundary>
    </div>
  )
}

function SearchBar({ value, onChange, shown }: { value: string; onChange: (v: string) => void; shown: number }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={t('calculators.page.searchPlaceholder')}
          aria-label={t('calculators.page.searchPlaceholder')}
          className="w-full h-10 pl-9 pr-9 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)] transition-[border-color,box-shadow] duration-micro"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t('calculators.hub.clearSearch')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {value && (
        <span className="text-caption text-[var(--text-tertiary)] whitespace-nowrap" role="status">
          {t('calculators.hub.shown', { count: shown })}
        </span>
      )}
    </div>
  )
}

function CalculatorCard({
  descriptor,
  items,
  index,
  showGridFactor,
  isCn,
}: {
  descriptor: CalcDescriptor
  items: NexusQuestionnaireItem[]
  index: number
  showGridFactor: boolean
  isCn: boolean
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  return (
    <motion.article {...(reduce ? {} : riseIn(index))} className="surface-paper overflow-hidden">
      <div className="p-5 flex items-start gap-3.5">
        <span className="hidden sm:flex w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] items-center justify-center flex-shrink-0" aria-hidden>
          <CalcIcon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="type-h3 text-[var(--text-primary)] min-w-0">{descriptor.title}</h2>
            <span className="nx-pill flex-shrink-0" data-tone="neutral" data-size="sm">
              {t('calculators.page.lineItemCount', { count: items.length })}
            </span>
          </div>
          <p className="text-small text-[var(--text-secondary)] mt-1">{descriptor.description}</p>
          <ul className="mt-3 flex items-center gap-1.5 flex-wrap" aria-label={t('calculators.hub.inputs')}>
            {descriptor.inputs.map(inp => (
              <li key={inp.key} className="chip">
                {inp.label}
                {inp.unit && <span className="text-[var(--text-tertiary)]">{localizeUnit(t, inp.unit)}</span>}
              </li>
            ))}
          </ul>
          {showGridFactor && (
            <div className="mt-3 pt-3 border-t border-dashed border-[var(--border-subtle)]">
              <PreferredFactorInline isCn={isCn} />
            </div>
          )}
        </div>
      </div>

      <ul className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
        {items.map(it => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => navigate(`/data/entry/${it.id}?mode=Calculator`)}
              className="w-full text-left px-5 py-3 min-h-[48px] flex items-center gap-3 hover:bg-[var(--bg-hover)] focus-visible:bg-[var(--bg-hover)] transition-colors duration-micro group"
            >
              <span className="font-mono text-caption text-[var(--text-tertiary)] whitespace-nowrap w-[6.5rem] flex-shrink-0 hidden sm:block">{it.gri_code}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-small font-medium text-[var(--text-primary)] group-hover:text-[var(--color-brand-strong)] truncate">
                  {itemLabel(it, i18n.language)}
                </span>
                <span className="block text-caption text-[var(--text-tertiary)] truncate">
                  <span className="sm:hidden font-mono">{it.gri_code} · </span>
                  {it.section}
                  {it.scope_split ? ` · ${it.scope_split}` : ''}
                  {it.unit ? ` · ${it.unit}` : ''}
                  {it.reporting_scope === 'jv' ? ' · JV' : ''}
                </span>
              </span>
              <span className="text-caption font-medium text-[var(--text-tertiary)] group-hover:text-[var(--color-brand-strong)] whitespace-nowrap hidden md:inline">
                {t('calculators.hub.open')}
              </span>
              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--color-brand-strong)] group-hover:translate-x-0.5 transition-transform duration-micro flex-shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {descriptor.footnotes && descriptor.footnotes.length > 0 && (
        <footer className="px-5 py-3 bg-[var(--bg-subtle)] text-caption text-[var(--text-tertiary)] border-t border-[var(--border-subtle)]">
          {t('calculators.page.methodology', { notes: descriptor.footnotes.join(t('calculators.page.listSeparator')) })}
        </footer>
      )}
    </motion.article>
  )
}

function CoverageGap({ items }: { items: NexusQuestionnaireItem[] }) {
  const { t, i18n } = useTranslation()
  return (
    <section className="surface-outlined p-5" aria-labelledby="coverage-gap">
      <h2 id="coverage-gap" className="text-small font-semibold text-[var(--text-primary)]">
        {t('calculators.hub.gapTitle', { count: items.length })}
      </h2>
      <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('calculators.hub.gapBody')}</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {items.slice(0, 10).map(it => (
          <li key={it.id} className="text-caption text-[var(--text-secondary)] px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] truncate">
            <span className="font-mono text-[var(--text-tertiary)]">{it.gri_code}</span> {itemLabel(it, i18n.language)}
          </li>
        ))}
        {items.length > 10 && <li className="text-caption text-[var(--text-tertiary)] px-2.5 py-1.5">{t('calculators.page.andMore', { count: items.length - 10 })}</li>}
      </ul>
    </section>
  )
}

function MoreCalculators() {
  const { t } = useTranslation()
  const links = [
    { to: '/calculators/scope3', icon: Truck, title: t('calculators.hub.scope3Title'), body: t('calculators.hub.scope3Body') },
    { to: '/calculators/pcaf', icon: Landmark, title: t('calculators.hub.pcafTitle'), body: t('calculators.hub.pcafBody') },
  ]
  return (
    <nav className="surface-paper overflow-hidden" aria-label={t('calculators.hub.moreTitle')}>
      <div className="px-5 pt-4 pb-2 text-caption font-medium text-[var(--text-tertiary)]">{t('calculators.hub.moreTitle')}</div>
      <ul className="divide-y divide-[var(--border-subtle)]">
        {links.map(l => (
          <li key={l.to}>
            <Link to={l.to} className="flex items-center gap-3 px-5 py-3 min-h-[56px] hover:bg-[var(--bg-hover)] transition-colors duration-micro group">
              <span className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] flex items-center justify-center flex-shrink-0" aria-hidden>
                <l.icon className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-small font-medium text-[var(--text-primary)]">{l.title}</span>
                <span className="block text-caption text-[var(--text-tertiary)] truncate">{l.body}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
