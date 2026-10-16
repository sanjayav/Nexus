import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Search, Loader2 } from 'lucide-react'
import type { PcafAsset, PcafAssetClass } from '../../lib/api'
import { pcaf as pcafApi } from '../../lib/api'
import { EmptyState, notify, useConfirm } from '../ui'
import { CalcSelect } from '../analytics/factors'
import { ASSET_CLASSES, num, useAssetClassLabel, usePcafFormat, dqTone } from './format'

/**
 * Portfolio table. Filterable by asset class and free-text counterparty
 * search. Delete is destructive — confirmed through the ConfirmSheet.
 */
interface Props {
  assets: PcafAsset[]
  onChange?: () => void
  /** Opens the add-asset drawer (empty state CTA). */
  onAdd?: () => void
}

export default function PortfolioGrid({ assets, onChange, onAdd }: Props) {
  const { t } = useTranslation()
  const classLabel = useAssetClassLabel()
  const { f, money, tonnes } = usePcafFormat()
  const confirm = useConfirm()
  const [filterClass, setFilterClass] = useState<PcafAssetClass | ''>('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return assets.filter(a => {
      if (filterClass && a.asset_class !== filterClass) return false
      if (q && !a.counterparty_name.toLowerCase().includes(q)) return false
      return true
    })
  }, [assets, filterClass, query])

  const remove = async (a: PcafAsset) => {
    const ok = await confirm({
      title: t('pcaf.grid.deleteTitle', { name: a.counterparty_name }),
      description: t('pcaf.grid.deleteBody'),
      confirmLabel: t('pcaf.grid.delete'),
      tone: 'destructive',
    })
    if (!ok) return
    setBusy(a.id)
    try {
      await pcafApi.deleteAsset(a.id)
      notify.success(t('pcaf.grid.deleted', { name: a.counterparty_name }))
      onChange?.()
    } catch (e) {
      notify.error(t('pcaf.grid.deleteFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  const filtering = Boolean(query.trim() || filterClass)

  return (
    <section className="surface-paper overflow-hidden" aria-labelledby="pcaf-portfolio">
      <div className="px-5 pt-4 pb-3 flex flex-col md:flex-row md:items-center gap-3">
        <h2 id="pcaf-portfolio" className="type-h3 text-[var(--text-primary)] md:mr-auto">{t('pcaf.grid.title')}</h2>
        <div className="relative md:w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('pcaf.grid.searchPlaceholder')}
            aria-label={t('pcaf.grid.searchPlaceholder')}
            className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)] transition-[border-color,box-shadow] duration-micro"
          />
        </div>
        <div className="md:w-[220px]">
          <CalcSelect value={filterClass} onChange={e => setFilterClass(e.target.value as PcafAssetClass | '')} aria-label={t('pcaf.grid.allAssetClasses')}>
            <option value="">{t('pcaf.grid.allAssetClasses')}</option>
            {ASSET_CLASSES.map(k => <option key={k} value={k}>{classLabel(k)}</option>)}
          </CalcSelect>
        </div>
        <span className="text-caption text-[var(--text-tertiary)] whitespace-nowrap" role="status">
          {t('pcaf.grid.countSummary', { shown: filtered.length, count: assets.length })}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="border-t border-[var(--border-subtle)]">
          {filtering ? (
            <EmptyState variant="filtered" density="compact" onClearFilters={() => { setQuery(''); setFilterClass('') }} />
          ) : (
            <EmptyState
              density="compact"
              art="noData"
              title={t('pcaf.grid.emptyTitle')}
              body={t('pcaf.grid.emptyBody')}
              cta={onAdd ? { label: t('pcaf.grid.emptyAction'), onClick: onAdd } : undefined}
            />
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-[var(--border-subtle)]">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>{t('pcaf.grid.counterparty')}</th>
                <th>{t('pcaf.grid.assetClass')}</th>
                <th className="num">{t('pcaf.grid.outstanding')}</th>
                <th className="num">{t('pcaf.grid.attribution')}</th>
                <th className="num">{t('pcaf.grid.financed')}</th>
                <th className="text-center">{t('pcaf.grid.dq')}</th>
                <th><span className="sr-only">{t('pcaf.grid.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="group">
                  <td>
                    <div className="font-medium text-[var(--text-primary)]">{a.counterparty_name}</div>
                    {a.counterparty_sector ? (
                      <div className="text-caption text-[var(--text-tertiary)]">
                        {t(`pcaf.options.counterpartySector.${a.counterparty_sector}`, { defaultValue: a.counterparty_sector })}
                        {a.counterparty_country ? ` · ${a.counterparty_country}` : ''}
                      </div>
                    ) : null}
                  </td>
                  <td>{classLabel(a.asset_class)}</td>
                  <td className="num text-[var(--text-primary)]">{money(a.outstanding_amount, { compact: false })}</td>
                  <td className="num">{f.number(num(a.attribution_factor), { precision: 4 })}</td>
                  <td className="num text-[var(--text-primary)] font-medium">{tonnes(a.financed_emissions_total)}</td>
                  <td className="text-center">
                    <span className="nx-pill" data-tone={dqTone(num(a.data_quality_score))} data-size="sm" title={t('pcaf.grid.dqTitle')}>
                      {a.data_quality_score}
                    </span>
                  </td>
                  <td className="text-right w-12">
                    <button
                      type="button"
                      onClick={() => void remove(a)}
                      disabled={busy === a.id}
                      aria-label={t('pcaf.grid.deleteAria', { name: a.counterparty_name })}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-[opacity,color,background-color] duration-micro disabled:opacity-100"
                    >
                      {busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
