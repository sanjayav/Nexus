import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle, Calculator as CalcIcon, ArrowRight, Search, Info,
} from 'lucide-react'
import {
  nexus,
  type NexusQuestionnaireItem,
} from '../lib/api'
import { CALCULATORS, findCalculator, hasCalculator, type CalcDescriptor } from '../calculators/registry'
import { localizeCalc, localizeUnit } from '../calculators/labels'
import { itemLabel } from '../lib/itemLabel'
import SetupGuard from '../components/SetupGuard'
import { Button } from '../design-system'
import PageHeader from '../components/PageHeader'
import { SkeletonCard } from '../components/Skeleton'
import { Stagger, StaggerItem } from '../components/MotionPrimitives'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; error: string }
  | { kind: 'ready'; items: NexusQuestionnaireItem[] }

/**
 * Calculators hub — fully derived from the live GRI questionnaire.
 * Only shows line items that have a registered calculator in the registry
 * (src/calculators/registry.ts). Grouped by descriptor so users see one
 * row per calculator with every question it applies to listed inline.
 */
export default function Calculators() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [query, setQuery] = useState('')

  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const items = await nexus.tree()
      if (items.length === 0) return setState({ kind: 'empty' })
      setState({ kind: 'ready', items })
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : t('calculators.page.failedToLoad') })
    }
  }

  useEffect(() => { load() }, [])

  // Group live items by the calculator descriptor that serves them.
  // Dedupe happens upstream in nexus.tree() — see lib/api.ts.
  const groups = useMemo(() => {
    if (state.kind !== 'ready') return []
    const q = query.toLowerCase().trim()
    const byDescriptor = new Map<string, { descriptor: CalcDescriptor; items: NexusQuestionnaireItem[] }>()
    for (const item of state.items) {
      if (!hasCalculator(item)) continue
      const d = findCalculator(item)!
      const ld = localizeCalc(t, d)
      const hay = `${d.title} ${d.description} ${ld.title} ${ld.description} ${item.line_item} ${itemLabel(item, i18n.language)} ${item.gri_code} ${item.section}`.toLowerCase()
      if (q && !hay.includes(q)) continue
      if (!byDescriptor.has(d.id)) byDescriptor.set(d.id, { descriptor: ld, items: [] })
      byDescriptor.get(d.id)!.items.push(item)
    }
    return CALCULATORS
      .map(d => byDescriptor.get(d.id))
      .filter((g): g is NonNullable<typeof g> => !!g)
  }, [state, query, t, i18n.language])

  // List line items marked Calculator-mode but missing a registered
  // descriptor. Dedupe happens upstream in nexus.tree().
  const uncovered = useMemo(() => {
    if (state.kind !== 'ready') return []
    return state.items.filter(i =>
      i.entry_mode_default === 'Calculator' && !hasCalculator(i) && i.reporting_scope === 'group'
    )
  }, [state])

  if (state.kind === 'loading') return (
    <div className="page-container space-y-3">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
  if (state.kind === 'empty') return <SetupGuard onReady={load} />
  if (state.kind === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">{t('calculators.page.errorTitle')}</h3>
            <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)] font-mono mt-1">{state.error}</p>
            <button onClick={load} className="mt-3 text-[length:var(--text-sm)] font-medium text-[var(--color-brand)] hover:underline">{t('calculators.page.retry')}</button>
          </div>
        </div>
      </div>
    )
  }

  const totalCovered = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="page-container space-y-5 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: t('calculators.page.breadcrumbData'), to: '/data' },
          { label: t('calculators.page.title') },
        ]}
        title={t('calculators.page.title')}
        description={t('calculators.page.description')}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('calculators.page.searchPlaceholder')}
            className="w-full pl-10 pr-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none"
          />
        </div>
        <div className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] whitespace-nowrap">
          <span className="font-semibold text-[var(--text-primary)]">{groups.length}</span> {t('calculators.page.summaryCalculators')}
          <span className="font-semibold text-[var(--text-primary)] mx-1">{totalCovered}</span> {t('calculators.page.summaryLineItems')}
        </div>
      </div>

      <Stagger>
        <div className="space-y-3">
        {groups.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] p-10 text-center text-[length:var(--text-sm)] text-[var(--text-tertiary)]">
            {t('calculators.page.noMatch', { query })}
          </div>
        )}

        {groups.map(({ descriptor, items }) => (
          <StaggerItem key={descriptor.id}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
            <div className="p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] flex items-center justify-center flex-shrink-0">
                  <CalcIcon className="w-5 h-5 text-[var(--color-brand)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-[length:var(--text-base)] font-semibold text-[var(--text-primary)]">{descriptor.title}</h3>
                  <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)] mt-0.5">{descriptor.description}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)] text-micro font-semibold uppercase tracking-[0.06em] whitespace-nowrap">
                {t('calculators.page.lineItemCount', { count: items.length })}
              </span>
            </div>

            {/* Inputs preview */}
            <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap text-caption">
              {descriptor.inputs.map(inp => (
                <span key={inp.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  {inp.label}
                  {inp.unit && <span className="text-[var(--text-tertiary)]">({localizeUnit(t, inp.unit)})</span>}
                </span>
              ))}
            </div>

            {/* Line items */}
            <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
              {items.map(it => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => navigate(`/data/entry/${it.id}?mode=Calculator`)}
                  className="w-full text-left px-5 py-2.5 flex items-center gap-3 hover:bg-[var(--color-brand-soft)] transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[length:var(--text-xs)] font-medium text-[var(--text-primary)] group-hover:text-[var(--color-brand-strong)] truncate">
                      {itemLabel(it, i18n.language)}
                    </div>
                    <div className="text-caption text-[var(--text-tertiary)]">
                      {it.section} · {it.gri_code}
                      {it.scope_split ? ` · ${it.scope_split}` : ''}
                      {it.unit ? ` · ${it.unit}` : ''}
                      {it.reporting_scope === 'jv' ? ' · JV' : ''}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--color-brand)]" />
                </button>
              ))}
            </div>

            {descriptor.footnotes && descriptor.footnotes.length > 0 && (
              <div className="px-5 py-2 bg-[var(--bg-secondary)] text-caption text-[var(--text-tertiary)] italic border-t border-[var(--border-subtle)]">
                {t('calculators.page.methodology', { notes: descriptor.footnotes.join(t('calculators.page.listSeparator')) })}
              </div>
            )}
          </div>
          </StaggerItem>
        ))}
        </div>
      </Stagger>

      {/* Coverage gap — items flagged as Calculator mode but no descriptor registered yet */}
      {uncovered.length > 0 && !query && (
        <section className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-4">
          <div className="flex items-center gap-2 text-[length:var(--text-xs)] text-[var(--text-tertiary)] mb-2">
            <Info className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wider">{t('calculators.page.coverageGap', { count: uncovered.length })}</span>
            <span>{t('calculators.page.coverageGapNote')}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {uncovered.slice(0, 10).map(it => (
              <div key={it.id} className="text-caption text-[var(--text-secondary)] px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                <span className="font-mono text-[var(--text-tertiary)]">{it.gri_code}</span> — {itemLabel(it, i18n.language)}
              </div>
            ))}
            {uncovered.length > 10 && <div className="text-caption text-[var(--text-tertiary)] italic px-2 py-1">{t('calculators.page.andMore', { count: uncovered.length - 10 })}</div>}
          </div>
        </section>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={() => navigate('/questionnaires')}>{t('calculators.page.openGriTree')}</Button>
        <Button variant="primary" size="sm" onClick={() => navigate('/data/entry')}>{t('calculators.page.dataEntry')}</Button>
      </div>
    </div>
  )
}
