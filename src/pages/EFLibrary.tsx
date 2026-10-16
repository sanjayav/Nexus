import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Search, Plus, Download, Upload, X, ChevronDown, Copy, Check, Sparkles, Loader2, Trash2, Lock } from 'lucide-react'
import { Tabs, Button } from '../design-system'
import JargonTooltip from '../components/JargonTooltip'
import PageHeader from '../components/PageHeader'
import { ai, type AiEfMatchResponse } from '../lib/api'
import { orgStore, type PreferredEmissionFactor } from '../lib/orgStore'
import { useFmt } from '../lib/fmt'
import { useIntegrationStatus, integrationMissing } from '../lib/integrations'
import { StatLedger, StateBoundary, EmptyState, SkeletonTable, ConfirmSheet, notify, useConfirm } from '../components/ui'
import { chartColors } from '../components/ui/ChartFrame'
import { dur, ease } from '../motion/tokens'
import useOrgMarket from '../components/analytics/useOrgMarket'
import {
  RegionFactorPanel, FactorSourceBadge, PreferredMarker, CalcField, CalcInput, CalcSelect, Callout,
  invalidateEmissionFactors, isCnRegion, regionLabel, sourceKey,
} from '../components/analytics/factors'

/* ═══════════════════════════════════════════
   Types — DB-backed shape from /api/emission-factors (with `preferred`)
   ═══════════════════════════════════════════ */
type Row = PreferredEmissionFactor & { deprecated: boolean }

function toRow(r: PreferredEmissionFactor): Row {
  // Deprecated = valid_to in the past
  const validTo = r.valid_to ? new Date(r.valid_to) : null
  return { ...r, deprecated: validTo ? validTo.getTime() < Date.now() : false }
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

function categoryLabel(t: TFunction, c: string | null | undefined): string {
  if (!c) return '—'
  return t(`efLibrary.categories.${slug(c)}`, { defaultValue: humanize(c) })
}

function activityLabel(t: TFunction, name: string): string {
  return t(`efLibrary.activities.${slug(name)}`, { defaultValue: name })
}

const SCOPE_DOT: Record<number, string> = { 1: chartColors.s1, 2: chartColors.s2, 3: chartColors.s3 }

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function EFLibrary() {
  const { t } = useTranslation()
  const f = useFmt()
  const market = useOrgMarket()
  const confirm = useConfirm()
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [preferredOnly, setPreferredOnly] = useState(true)
  const [showDeprecated, setShowDeprecated] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setLoadError(null)
      try {
        const data = await orgStore.listEmissionFactors()
        if (!cancelled) { setRows((Array.isArray(data) ? data : []).map(toRow)); setLoaded(true) }
      } catch (err: unknown) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : t('efLibrary.loadError.unknown'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [reloadNonce, t])

  const reload = useCallback(() => { invalidateEmissionFactors(); setReloadNonce(n => n + 1) }, [])

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: t('efLibrary.deleteTitle', { name: activityLabel(t, row.fuel_or_activity) }),
      description: t('efLibrary.confirmDelete', { name: row.fuel_or_activity }),
      confirmLabel: t('efLibrary.row.deleteShort'),
      tone: 'destructive',
    })
    if (!ok) return
    setDeletingId(row.id)
    try {
      await orgStore.deleteEmissionFactor(row.id)
      notify.success(t('efLibrary.toast.removed'))
      reload()
    } catch (e) {
      notify.error(t('efLibrary.toast.deleteFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setDeletingId(null)
    }
  }

  const SOURCES = useMemo(() => [...new Set(rows.map(r => r.source))].sort(), [rows])
  const CATEGORIES = useMemo(() => [...new Set(rows.map(r => r.category))].sort(), [rows])
  const REGIONS = useMemo(() => [...new Set(rows.map(r => r.region))].sort(), [rows])

  const tabsConfig = useMemo(() => [
    { id: 'all', label: t('efLibrary.tabs.all'), count: rows.length },
    { id: 'scope1', label: t('efLibrary.scope.1'), count: rows.filter(r => r.scope === 1).length },
    { id: 'scope2', label: t('efLibrary.scope.2'), count: rows.filter(r => r.scope === 2).length },
    { id: 'scope3', label: t('efLibrary.scope.3'), count: rows.filter(r => r.scope === 3).length },
  ], [rows, t])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (tab !== 'all' && `scope${r.scope}` !== tab) return false
      if (preferredOnly && !r.preferred) return false
      if (!showDeprecated && r.deprecated) return false
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
      if (regionFilter !== 'all' && r.region !== regionFilter) return false
      if (q) {
        const hay = `${r.fuel_or_activity} ${activityLabel(t, r.fuel_or_activity)} ${r.category} ${categoryLabel(t, r.category)} ${r.source} ${r.unit} ${r.region} ${regionLabel(t, r.region)}`.toLowerCase()
        return hay.includes(q)
      }
      return true
    })
  }, [rows, tab, search, sourceFilter, categoryFilter, regionFilter, showDeprecated, preferredOnly, t])

  const filtersActive = Boolean(search || sourceFilter !== 'all' || categoryFilter !== 'all' || regionFilter !== 'all' || tab !== 'all')
  const clearFilters = () => {
    setSearch(''); setSourceFilter('all'); setCategoryFilter('all'); setRegionFilter('all'); setTab('all'); setPreferredOnly(false); setShowDeprecated(true)
  }

  const preferredCount = rows.filter(r => r.preferred).length
  const deprecatedCount = rows.filter(r => r.deprecated).length
  const cnOfficial = rows.filter(r => isCnRegion(r.region) && ['mee', 'meeNbs', 'gbt'].includes(sourceKey(r.source))).length

  const handleCopy = async (row: Row) => {
    const text = `${row.co2e_per_unit} ${row.unit}`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(row.id)
      setTimeout(() => setCopiedId(null), 1500)
      notify.success(t('efLibrary.toast.copied', { value: f.exact(row.co2e_per_unit, row.unit) }))
    } catch {
      notify.error(t('efLibrary.toast.copyFailed'))
    }
  }

  const exportCsv = () => {
    const cols = ['scope', 'category', 'subcategory', 'fuel_or_activity', 'region', 'unit', 'co2e_per_unit', 'co2_per_unit', 'ch4_per_unit', 'n2o_per_unit', 'source', 'source_version', 'valid_from', 'valid_to', 'preferred'] as const
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [cols.join(','), ...filtered.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `emission-factors-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify.success(t('efLibrary.toast.exported', { count: filtered.length }))
  }

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('efLibrary.breadcrumb.data'), to: '/data' },
          { label: t('efLibrary.breadcrumb.current') },
        ]}
        title={t('efLibrary.title')}
        description={
          <>
            {market.isCn ? t('efLibrary.description.prefixCn') : t('efLibrary.description.prefix')} <JargonTooltip term="IPCC AR5" iconOnly /> {t('efLibrary.description.suffix')}
          </>
        }
        actions={
          <>
            <Button variant="secondary" size="lg" icon={<Download className="w-4 h-4" />} onClick={exportCsv} disabled={!loaded || filtered.length === 0}>
              {t('efLibrary.actions.export')}
            </Button>
            <Button variant="secondary" size="lg" icon={<Upload className="w-4 h-4" />} disabled title={t('efLibrary.actions.importSoon')}>
              {t('efLibrary.actions.import')}
            </Button>
            <Button size="lg" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>{t('efLibrary.actions.addFactor')}</Button>
          </>
        }
      />

      <StateBoundary
        loading={loading}
        hasData={loaded}
        error={loadError}
        onRetry={reload}
        errorState={{ title: t('efLibrary.loadError.title'), body: t('efLibrary.loadError.body') }}
        skeleton={<SkeletonTable rows={8} cols={6} framed />}
        empty={loaded && rows.length === 0}
        emptyState={{
          art: 'noData',
          title: t('efLibrary.emptyLibrary.title'),
          body: t('efLibrary.emptyLibrary.body'),
          cta: { label: t('efLibrary.actions.addFactor'), onClick: () => setShowAdd(true) },
        }}
      >
        <div className="space-y-6">
          <StatLedger
            aria-label={t('efLibrary.kpi.label')}
            items={[
              { id: 'total', label: t('efLibrary.kpi.total'), value: rows.length, tone: 'neutral' },
              {
                id: 'preferred',
                label: market.isCn ? t('efLibrary.kpi.preferredRegion') : t('efLibrary.kpi.preferred'),
                value: preferredCount,
                tone: 'success',
                hint: t('efLibrary.kpi.preferredHint'),
                onClick: () => { setPreferredOnly(true); setShowDeprecated(false) },
              },
              market.isCn
                ? { id: 'cn', label: t('efLibrary.kpi.cnOfficial'), value: cnOfficial, tone: 'brand', hint: t('efLibrary.kpi.cnOfficialHint') }
                : { id: 'sources', label: t('efLibrary.kpi.sources'), value: SOURCES.length, tone: 'info' },
              {
                id: 'deprecated',
                label: t('efLibrary.kpi.deprecated'),
                value: deprecatedCount,
                tone: deprecatedCount > 0 ? 'warning' : 'neutral',
                onClick: deprecatedCount > 0 ? () => { setShowDeprecated(true); setPreferredOnly(false) } : undefined,
              },
            ]}
          />

          {market.isCn && <RegionFactorPanel rows={rows} layout="wide" />}

          <section className="surface-paper overflow-hidden" aria-label={t('efLibrary.listLabel')}>
            <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3 border-b border-[var(--border-subtle)]">
              <div className="overflow-x-auto -mx-1 px-1">
                <Tabs tabs={tabsConfig} activeTab={tab} onChange={setTab} aria-label={t('efLibrary.scopeTabs')} className="w-max" />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
                <input
                  type="search"
                  placeholder={t('efLibrary.search.placeholder')}
                  aria-label={t('efLibrary.search.placeholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-9 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)] transition-[border-color,box-shadow] duration-micro [&::-webkit-search-cancel-button]:hidden"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label={t('efLibrary.search.clear')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:items-center gap-2">
                <FilterSelect label={t('efLibrary.filters.allSources')} value={sourceFilter} onChange={setSourceFilter} options={SOURCES.map(s => ({ value: s, label: s }))} />
                <FilterSelect label={t('efLibrary.filters.allCategories')} value={categoryFilter} onChange={setCategoryFilter} options={CATEGORIES.map(c => ({ value: c, label: categoryLabel(t, c) }))} />
                <FilterSelect label={t('efLibrary.filters.allRegions')} value={regionFilter} onChange={setRegionFilter} options={REGIONS.map(r => ({ value: r, label: regionLabel(t, r) }))} />
                <div className="flex items-center gap-4 lg:ml-auto flex-wrap sm:col-span-3">
                  <Toggle checked={preferredOnly} onChange={setPreferredOnly} label={t('efLibrary.filters.preferredOnly')} />
                  <Toggle checked={showDeprecated} onChange={setShowDeprecated} label={t('efLibrary.filters.showDeprecated')} />
                  <span className="text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap ml-auto lg:ml-0" role="status">
                    {t('efLibrary.filters.resultCount', { count: filtered.length })}
                  </span>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                variant="filtered"
                density="compact"
                title={t('efLibrary.empty.title')}
                body={preferredOnly && !filtersActive ? t('efLibrary.empty.preferredBody') : t('efLibrary.empty.body')}
                onClearFilters={clearFilters}
              />
            ) : (
              <>
                <div className="hidden lg:grid grid-cols-[minmax(0,2.1fr)_96px_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_92px] gap-4 px-5 py-2.5 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] text-caption font-medium text-[var(--text-tertiary)]">
                  <span>{t('efLibrary.cols.factor')}</span>
                  <span>{t('efLibrary.cols.scope')}</span>
                  <span>{t('efLibrary.cols.region')}</span>
                  <span className="text-right">{t('efLibrary.cols.value')}</span>
                  <span>{t('efLibrary.cols.source')}</span>
                  <span className="sr-only">{t('efLibrary.cols.actions')}</span>
                </div>
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {filtered.map(row => (
                    <FactorRow
                      key={row.id}
                      row={row}
                      isCn={market.isCn}
                      expanded={expanded === row.id}
                      onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                      copied={copiedId === row.id}
                      onCopy={() => void handleCopy(row)}
                      onDelete={() => void handleDelete(row)}
                      deleting={deletingId === row.id}
                    />
                  ))}
                </ul>
              </>
            )}
          </section>

          <VendorAiSearch />

          <SourcesLedger isCn={market.isCn} />
        </div>
      </StateBoundary>

      <AddFactorSheet
        open={showAdd}
        onOpenChange={setShowAdd}
        defaultRegion={market.isCn ? 'CN' : 'GLOBAL'}
        defaultSource={market.isCn ? 'MEE' : 'DEFRA'}
        onCreated={() => { notify.success(t('efLibrary.toast.added')); reload() }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════
   Factor row (table on desktop, stacked on mobile)
   ═══════════════════════════════════════════ */
function FactorRow({
  row, isCn, expanded, onToggle, copied, onCopy, onDelete, deleting,
}: {
  row: Row
  isCn: boolean
  expanded: boolean
  onToggle: () => void
  copied: boolean
  onCopy: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const regional = isCn ? isCnRegion(row.region) : true
  const detailId = `ef-${row.id}-detail`
  return (
    <li className={`group ${row.deprecated ? 'opacity-70' : ''}`}>
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,2.1fr)_96px_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_92px] gap-x-4 gap-y-1.5 px-4 sm:px-5 py-3.5 hover:bg-[var(--bg-hover)] transition-colors duration-micro">
        {/* Factor */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailId}
          className="col-start-1 row-start-1 lg:col-start-auto lg:row-start-auto min-w-0 text-left flex items-start gap-2 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--border-focus)]"
        >
          <ChevronDown className={`w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--text-tertiary)] transition-transform duration-fast ${expanded ? 'rotate-180' : ''}`} aria-hidden />
          <span className="min-w-0">
            <span className="block text-small font-semibold text-[var(--text-primary)] lg:truncate">{activityLabel(t, row.fuel_or_activity)}</span>
            <span className="block text-caption text-[var(--text-tertiary)] truncate">
              {categoryLabel(t, row.category)}{row.subcategory ? ` · ${categoryLabel(t, row.subcategory)}` : ''}
            </span>
          </span>
        </button>

        {/* Scope (desktop) */}
        <span className="hidden lg:flex items-center gap-1.5 text-caption text-[var(--text-secondary)] whitespace-nowrap">
          <span className="w-2 h-2 rounded-full" style={{ background: SCOPE_DOT[row.scope] }} aria-hidden />
          {t(`efLibrary.scope.${row.scope}`)}
        </span>

        {/* Region (desktop) */}
        <span className="hidden lg:block min-w-0">
          <span className="block text-small text-[var(--text-primary)] truncate">{regionLabel(t, row.region)}</span>
          <span className="block text-caption text-[var(--text-tertiary)] font-mono">{row.region}</span>
        </span>

        {/* Value */}
        <span className="col-start-2 row-start-1 lg:col-start-auto lg:row-start-auto text-right self-start">
          <span className="block text-small font-semibold tabular-nums text-[var(--text-primary)] whitespace-nowrap">{f.number(row.co2e_per_unit, { maxFraction: 6 })}</span>
          <span className="block text-caption text-[var(--text-tertiary)] whitespace-nowrap">{f.unit(row.unit)}</span>
        </span>

        {/* Source + status */}
        <span className="flex items-center gap-1.5 flex-wrap min-w-0 col-start-1 row-start-2 lg:col-start-auto lg:row-start-auto pl-6 lg:pl-0">
          <span className="lg:hidden inline-flex items-center gap-1.5 text-caption text-[var(--text-secondary)] whitespace-nowrap">
            <span className="w-2 h-2 rounded-full" style={{ background: SCOPE_DOT[row.scope] }} aria-hidden />
            {t(`efLibrary.scope.${row.scope}`)} · {regionLabel(t, row.region)}
          </span>
          <FactorSourceBadge source={row.source} version={row.source_version} validFrom={row.valid_from} />
          {row.preferred && !row.deprecated && <PreferredMarker regional={regional} />}
          {row.deprecated && <span className="nx-pill" data-tone="neutral" data-size="sm">{t('efLibrary.status.deprecated')}</span>}
        </span>

        {/* Actions */}
        <span className="relative z-[1] col-start-2 row-start-2 self-end lg:self-auto lg:col-start-auto lg:row-start-auto flex items-center justify-end -mr-2 lg:mr-0 gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity duration-micro">
          <button
            type="button"
            onClick={onCopy}
            className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            aria-label={t('efLibrary.row.copy')}
            title={t('efLibrary.row.copy')}
          >
            {copied ? <Check className="w-4 h-4 text-[var(--status-success)]" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] disabled:opacity-50 disabled:cursor-wait"
            aria-label={t('efLibrary.row.delete')}
            title={t('efLibrary.row.delete')}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={detailId}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 pl-10 sm:pl-11">
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] px-4 py-3.5">
                <Detail label={t('efLibrary.row.value')} value={f.exact(row.co2e_per_unit, row.unit)} strong />
                <Detail label={t('efLibrary.row.gases')} value={[
                  row.co2_per_unit != null ? `CO₂ ${f.number(row.co2_per_unit, { maxFraction: 6 })}` : null,
                  row.ch4_per_unit != null ? `CH₄ ${f.number(row.ch4_per_unit, { maxFraction: 6 })}` : null,
                  row.n2o_per_unit != null ? `N₂O ${f.number(row.n2o_per_unit, { maxFraction: 6 })}` : null,
                ].filter(Boolean).join(' · ') || t('efLibrary.row.gasesNone')} />
                <Detail label={t('efLibrary.row.validFrom')} value={`${f.date(row.valid_from)}${row.valid_to ? ` – ${f.date(row.valid_to)}` : ''}`} />
                <Detail label={t('efLibrary.row.status')} value={row.deprecated ? t('efLibrary.status.deprecated') : row.preferred ? t('efLibrary.status.preferred') : t('efLibrary.status.active')} />
                <div className="col-span-2 md:col-span-4">
                  <Detail label={t('efLibrary.row.source')} value={[row.source, row.source_version].filter(Boolean).join(' · ')} />
                </div>
                {row.notes && (
                  <div className="col-span-2 md:col-span-4">
                    <Detail label={t('efLibrary.row.notes')} value={row.notes} />
                  </div>
                )}
              </dl>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-[var(--text-tertiary)]">{label}</dt>
      <dd className={`mt-0.5 text-small break-words ${strong ? 'font-semibold tabular-nums text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{value}</dd>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="lg:w-[190px] min-w-0">
      <CalcSelect value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
        <option value="all">{label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </CalcSelect>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 min-h-[40px] cursor-pointer select-none text-small text-[var(--text-secondary)] whitespace-nowrap">
      <input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={`relative w-8 h-[18px] rounded-full transition-colors duration-micro peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--border-focus)] ${checked ? 'bg-[var(--btn-primary-bg)]' : 'bg-[var(--border-strong)]'}`}
      >
        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-[var(--bg-primary)] shadow-[var(--shadow-card)] transition-transform duration-micro ${checked ? 'translate-x-[14px]' : ''}`} />
      </span>
      {label}
    </label>
  )
}

/* ═══════════════════════════════════════════
   Publishers — what each source is and when it is preferred
   ═══════════════════════════════════════════ */
function SourcesLedger({ isCn }: { isCn: boolean }) {
  const { t } = useTranslation()
  const ids = isCn ? ['mee', 'gbt', 'iea', 'ipcc', 'defra'] : ['ipcc', 'defra', 'iea', 'mee']
  return (
    <section className="surface-paper overflow-hidden" aria-labelledby="ef-sources">
      <div className="px-5 pt-4 pb-2">
        <h2 id="ef-sources" className="type-h3 text-[var(--text-primary)]">{t('efLibrary.references.title')}</h2>
        <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{isCn ? t('efLibrary.references.subtitleCn') : t('efLibrary.references.subtitle')}</p>
      </div>
      <dl className="divide-y divide-[var(--border-subtle)]">
        {ids.map(id => (
          <div key={id} className="grid sm:grid-cols-[220px_minmax(0,1fr)] gap-x-6 gap-y-1 px-5 py-3">
            <dt className="text-small font-semibold text-[var(--text-primary)]">{t(`efLibrary.references.${id}.name`)}</dt>
            <dd className="text-small text-[var(--text-secondary)]">{t(`efLibrary.references.${id}.desc`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* ═══════════════════════════════════════════
   Add factor — ConfirmSheet with inline validation, POSTs to /api/emission-factors
   ═══════════════════════════════════════════ */
function AddFactorSheet({
  open, onOpenChange, onCreated, defaultRegion, defaultSource,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
  defaultRegion: string
  defaultSource: string
}) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)
  const blank = useCallback(() => ({
    fuel_or_activity: '',
    category: '',
    scope: 1 as 1 | 2 | 3,
    co2e_per_unit: '',
    unit: '',
    source: defaultSource,
    source_version: String(new Date().getFullYear() - 1),
    region: defaultRegion,
    valid_from: today,
  }), [defaultRegion, defaultSource, today])
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => { if (open) { setForm(blank()); setErrors({}) } }, [open, blank])

  const set = <K extends keyof ReturnType<typeof blank>>(k: K, v: ReturnType<typeof blank>[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    if (errors[k as string]) setErrors(e => { const n = { ...e }; delete n[k as string]; return n })
  }

  const submit = async () => {
    const errs: Record<string, string> = {}
    const req = t('calculators.form.requiredError')
    if (!form.fuel_or_activity.trim()) errs.fuel_or_activity = req
    if (!form.category.trim()) errs.category = req
    if (!form.unit.trim()) errs.unit = req
    if (!form.source.trim()) errs.source = req
    if (!form.valid_from) errs.valid_from = req
    const v = Number(form.co2e_per_unit)
    if (form.co2e_per_unit.trim() === '') errs.co2e_per_unit = req
    else if (!Number.isFinite(v) || v <= 0) errs.co2e_per_unit = t('calculators.form.positive')
    setErrors(errs)
    if (Object.keys(errs).length) throw new Error(t('calculators.form.fixFields'))
    await orgStore.createEmissionFactor({
      scope: form.scope,
      category: form.category.trim().toLowerCase().replace(/\s+/g, '_'),
      fuel_or_activity: form.fuel_or_activity.trim(),
      unit: form.unit.trim(),
      co2e_per_unit: v,
      source: form.source.trim(),
      source_version: form.source_version.trim() || null,
      region: form.region.trim() || 'GLOBAL',
      valid_from: form.valid_from,
    })
    onCreated()
  }

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('efLibrary.modal.title')}
      description={t('efLibrary.modal.description')}
      confirmLabel={t('efLibrary.modal.submit')}
      onConfirm={submit}
    >
      <div className="space-y-4">
        <CalcField label={t('efLibrary.modal.factorName')} required error={errors.fuel_or_activity}>
          {p => <CalcInput {...p} value={form.fuel_or_activity} onChange={e => set('fuel_or_activity', e.target.value)} placeholder={t('efLibrary.modal.factorNamePlaceholder')} />}
        </CalcField>
        <div className="grid sm:grid-cols-2 gap-4">
          <CalcField label={t('efLibrary.modal.category')} required error={errors.category}>
            {p => <CalcInput {...p} value={form.category} onChange={e => set('category', e.target.value)} placeholder={t('efLibrary.modal.categoryPlaceholder')} />}
          </CalcField>
          <CalcField label={t('efLibrary.modal.scope')}>
            {p => (
              <CalcSelect {...p} value={form.scope} onChange={e => set('scope', Number(e.target.value) as 1 | 2 | 3)}>
                <option value={1}>{t('efLibrary.scope.1')}</option>
                <option value={2}>{t('efLibrary.scope.2')}</option>
                <option value={3}>{t('efLibrary.scope.3')}</option>
              </CalcSelect>
            )}
          </CalcField>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <CalcField label={t('efLibrary.modal.value')} required error={errors.co2e_per_unit} unit={form.unit.trim() || undefined}>
            {p => <CalcInput {...p} type="number" min={0} step="any" value={form.co2e_per_unit} onChange={e => set('co2e_per_unit', e.target.value)} placeholder="0.5306" />}
          </CalcField>
          <CalcField label={t('efLibrary.modal.unit')} required error={errors.unit}>
            {({ unit: _u, ...p }) => <CalcInput {...p} value={form.unit} onChange={e => set('unit', e.target.value)} placeholder={t('efLibrary.modal.unitPlaceholder')} />}
          </CalcField>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <CalcField label={t('efLibrary.modal.source')} required error={errors.source} className="col-span-2 sm:col-span-1">
            {p => <CalcInput {...p} value={form.source} onChange={e => set('source', e.target.value)} placeholder="MEE" />}
          </CalcField>
          <CalcField label={t('efLibrary.modal.version')}>
            {p => <CalcInput {...p} value={form.source_version} onChange={e => set('source_version', e.target.value)} placeholder="2023" />}
          </CalcField>
          <CalcField label={t('efLibrary.modal.region')} hint={t('efLibrary.modal.regionHint')}>
            {p => <CalcInput {...p} value={form.region} onChange={e => set('region', e.target.value)} placeholder="CN-EAST" />}
          </CalcField>
        </div>
        <CalcField label={t('efLibrary.modal.validFrom')} required error={errors.valid_from} className="sm:w-1/2">
          {p => <CalcInput {...p} type="date" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} />}
        </CalcField>
      </div>
    </ConfirmSheet>
  )
}

/* ═══════════════════════════════════════════
   Vendor → AI search panel
   Type any vendor name + region; the backend asks the configured AI provider
   with the candidate set from emission_factors. The result surfaces a
   "best EF" with reasoning, and the alternates inline.
   ═══════════════════════════════════════════ */
function VendorAiSearch() {
  const { t } = useTranslation()
  const f = useFmt()
  const market = useOrgMarket()
  const integrations = useIntegrationStatus()
  const [vendor, setVendor] = useState('')
  const [region, setRegion] = useState(market.isCn ? 'CN' : 'GLOBAL')
  const [loading, setLoading] = useState(false)
  const [match, setMatch] = useState<AiEfMatchResponse['match'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unconfiguredFromCall, setUnconfiguredFromCall] = useState(false)
  const orgDisabled = !market.loading && !market.aiEnabled
  const unavailable = orgDisabled || unconfiguredFromCall || integrationMissing(integrations, 'ai')

  useEffect(() => { if (market.isCn) setRegion(r => (r === 'GLOBAL' ? 'CN' : r)) }, [market.isCn])

  const run = async () => {
    if (!vendor.trim() || unavailable) return
    setLoading(true); setError(null); setMatch(null); setUnconfiguredFromCall(false)
    try {
      const res = await ai.matchEf({
        vendorName: vendor.trim(),
        region: region as 'GLOBAL' | 'UK' | 'US' | 'EU',
        scope: 3,
      })
      setMatch(res.match)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/API_KEY/i.test(msg) || /503/.test(msg)) setUnconfiguredFromCall(true)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="surface-paper p-5" aria-labelledby="ef-vendor">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--color-brand-strong)]" aria-hidden />
        <h2 id="ef-vendor" className="type-h3 text-[var(--text-primary)]">{t('efLibrary.vendor.title')}</h2>
      </div>
      <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('efLibrary.vendor.hint')}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
        <CalcInput
          type="text"
          value={vendor}
          onChange={e => setVendor(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void run() }}
          placeholder={t('efLibrary.vendor.placeholder')}
          aria-label={t('efLibrary.vendor.vendorLabel')}
        />
        <CalcSelect value={region} onChange={e => setRegion(e.target.value)} aria-label={t('efLibrary.vendor.regionLabel')}>
          {['GLOBAL', 'CN', 'UK', 'US', 'EU', 'IN', 'JP', 'AU', 'CA', 'DE', 'FR'].map(r => <option key={r} value={r}>{r === 'CN' ? t('efLibrary.vendor.china') : regionLabel(t, r)}</option>)}
        </CalcSelect>
        <Button
          size="lg"
          onClick={run}
          loading={loading}
          disabled={!vendor.trim() || unavailable}
          icon={unavailable ? <Lock className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        >
          {unavailable ? t('efLibrary.vendor.unavailable') : t('efLibrary.vendor.suggest')}
        </Button>
      </div>

      {unavailable && (
        <div className="mt-3">
          <Callout tone="info">{orgDisabled ? t('efLibrary.vendor.orgDisabled') : t('efLibrary.vendor.notConfigured')}</Callout>
        </div>
      )}
      {error && !unavailable && <div className="mt-3"><Callout tone="danger">{error}</Callout></div>}

      {match && (
        <ul className="mt-4 space-y-2">
          {[{ ef: match.ef, confidence: match.confidence, reasoning: match.reasoning, badge: t('efLibrary.vendor.topMatch') },
            ...match.alternates.map((a, i) => ({ ef: a.ef, confidence: a.confidence, reasoning: a.reasoning, badge: t('efLibrary.vendor.alt', { n: i + 1 }) }))].map(m => (
            <li key={m.ef.id} className="rounded-[var(--radius-md)] border border-[var(--border-default)] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-caption text-[var(--text-tertiary)]">{m.badge}</div>
                  <div className="text-small font-semibold text-[var(--text-primary)] truncate">{m.ef.fuel_or_activity}</div>
                </div>
                <span className="nx-pill" data-tone={m.confidence >= 0.8 ? 'success' : m.confidence >= 0.5 ? 'warning' : 'danger'} data-size="sm">
                  {f.percent(m.confidence, { ratio: true })}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap text-caption text-[var(--text-secondary)]">
                <span className="tabular-nums font-medium text-[var(--text-primary)]">{f.exact(m.ef.co2e_per_unit, m.ef.unit)}</span>
                <FactorSourceBadge source={m.ef.source} version={m.ef.source_version} />
                {m.ef.region && <span>{regionLabel(t, m.ef.region)}</span>}
                {m.ef.category && <span>{categoryLabel(t, m.ef.category)}</span>}
              </div>
              <p className="mt-1.5 text-caption text-[var(--text-secondary)]">{m.reasoning}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
