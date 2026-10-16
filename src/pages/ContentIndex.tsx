import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, CircleDashed, MinusCircle, Printer, Download, Search } from 'lucide-react'
import { orgStore, type ContentIndexRow, type MaterialTopic } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'
import { FrameworkBadge } from '../components/FrameworkBadge'
import JourneyBar from '../components/JourneyBar'
import PageHeader from '../components/PageHeader'
import { EmptyState, StateBoundary, StatLedger, StatusPill, SkeletonLedger, type PillTone } from '../components/ui'
import { SkeletonTable } from '../components/Skeleton'
import SplitBar from '../components/analytics/data/SplitBar'
import { itemLabel } from '../lib/itemLabel'
import { useFmt } from '../lib/fmt'

type StatusFilter = 'all' | 'fully' | 'partially' | 'omitted'

/** Rows may carry localised headings (section_zh / subsection_zh); English is the fallback. */
type IndexRow = ContentIndexRow

/** Frameworks whose index title / code column have their own wording; others use the generic copy. */
const NAMED_INDEX = new Set(['gri', 'cn-sse', 'cn-csds', 'hkex-esg', 'issb', 'issb-s1', 'issb-s2', 'tcfd', 'cdp', 'cdp-2024', 'cass-esg'])
const CODE_PREFIX: Record<string, string> = { 'hkex-esg': 'HKEX-' }

const STATUS_META: Record<ContentIndexRow['status'], { tone: PillTone; icon: ReactElement }> = {
  fully: { tone: 'success', icon: <CheckCircle2 /> },
  partially: { tone: 'info', icon: <CircleDashed /> },
  omitted: { tone: 'neutral', icon: <MinusCircle /> },
}

/**
 * Content index — the master table that opens every framework report.
 * Auto-built from assignments: each disclosure is fully / partially /
 * omitted, with its section and the material topic it answers.
 * Print-optimised so reviewers can save a PDF.
 */
export default function ContentIndex() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const zh = !!i18n.language?.startsWith('zh')
  const { active: framework } = useFramework()
  const fz = framework as { nameZh?: string }
  const [rows, setRows] = useState<IndexRow[] | null>(null)
  const [topics, setTopics] = useState<MaterialTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [materialOnly, setMaterialOnly] = useState(false)

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([orgStore.contentIndex(framework.id), orgStore.listMaterialTopics().catch(() => [] as MaterialTopic[])])
      .then(([r, tp]) => {
        if (!alive) return
        setRows(Array.isArray(r) ? (r as IndexRow[]) : [])
        setTopics(Array.isArray(tp) ? tp : [])
      })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [framework.id])

  useEffect(() => {
    setRows(null)
    return load()
  }, [load])

  const fwName = (zh && fz.nameZh) || framework.name
  const named = NAMED_INDEX.has(framework.id)
  const indexTitle = named ? t(`contentIndex.frameworks.${framework.id}.index`) : t('contentIndex.frameworks.fallbackIndex', { code: framework.code })
  const codeColumn = named ? t(`contentIndex.frameworks.${framework.id}.code`) : t('contentIndex.columns.code')
  const prefix = CODE_PREFIX[framework.id]
  const displayCode = (c: string) => (prefix && c.startsWith(prefix) ? c.slice(prefix.length) : c)

  const list = rows ?? []

  // CN frameworks put every item under one section; their subsection is the real topic.
  const singleSection = useMemo(() => new Set(list.map((r) => r.section)).size <= 1 && list.some((r) => r.subsection), [list])
  const sectionLabel = (r: IndexRow) =>
    singleSection ? (zh && r.subsection_zh) || r.subsection : (zh && r.section_zh) || r.section

  const codeToTopic = useMemo(() => {
    const m = new Map<string, MaterialTopic>()
    for (const tp of topics.filter((x) => x.framework_id === framework.id)) for (const c of tp.linked_gri_codes ?? []) m.set(c, tp)
    return m
  }, [topics, framework.id])

  const materialCodes = useMemo(() => {
    const set = new Set<string>()
    for (const tp of topics.filter((x) => x.framework_id === framework.id && x.dma_status === 'material')) for (const c of tp.linked_gri_codes ?? []) set.add(c)
    return set
  }, [topics, framework.id])

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter((r) => {
      if (materialOnly && !materialCodes.has(r.gri_code.split(' ')[0])) return false
      if (!q) return true
      return (
        r.gri_code.toLowerCase().includes(q) ||
        r.line_item.toLowerCase().includes(q) ||
        (r.line_item_zh ?? '').toLowerCase().includes(q) ||
        sectionLabel(r).toLowerCase().includes(q)
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, query, materialOnly, materialCodes, zh, singleSection])

  const filtered = useMemo(() => (statusFilter === 'all' ? scoped : scoped.filter((r) => r.status === statusFilter)), [scoped, statusFilter])

  const summary = useMemo(() => {
    const total = scoped.length
    const fully = scoped.filter((r) => r.status === 'fully').length
    const partial = scoped.filter((r) => r.status === 'partially').length
    const omitted = scoped.filter((r) => r.status === 'omitted').length
    return { total, fully, partial, omitted, pct: total ? Math.round((fully / total) * 100) : 0 }
  }, [scoped])

  const toggleStatus = (s: StatusFilter) => setStatusFilter((cur) => (cur === s ? 'all' : s))
  const filtersOn = query.trim() !== '' || statusFilter !== 'all' || materialOnly
  const clearFilters = () => {
    setQuery('')
    setStatusFilter('all')
    setMaterialOnly(false)
  }

  return (
    <div>
      <div className="mb-4 no-print">
        <JourneyBar variant="compact" />
      </div>

      <PageHeader
        eyebrow={indexTitle}
        title={t('contentIndex.header.title')}
        description={t('contentIndex.header.description', { framework: fwName })}
        actions={
          <div className="flex items-center gap-2 no-print">
            <button onClick={() => window.print()} className="btn-secondary" disabled={!rows?.length}>
              <Printer className="w-3.5 h-3.5" /> {t('contentIndex.actions.print')}
            </button>
            <button onClick={() => window.print()} className="btn-primary" disabled={!rows?.length}>
              <Download className="w-3.5 h-3.5" /> {t('contentIndex.actions.savePdf')}
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-2 flex-wrap">
          <FrameworkBadge size="md" />
        </div>
      </PageHeader>

      {/* Summary — each figure filters the table */}
      <div className={`no-print space-y-3 ${rows && list.length === 0 ? '' : 'mb-5'}`}>
        <StateBoundary loading={loading} hasData={!!rows} error={error} onRetry={load} skeleton={<SkeletonLedger items={4} />} errorState={<></>} empty={!!rows && list.length === 0} emptyState={<></>}>
          <StatLedger
            aria-label={t('contentIndex.summary.aria')}
            items={[
              { id: 'total', label: t('contentIndex.summary.total'), value: summary.total, tone: 'brand', hint: t('contentIndex.summary.totalHint', { pct: summary.pct }), onClick: () => setStatusFilter('all') },
              { id: 'fully', label: t('contentIndex.summary.fully'), value: summary.fully, tone: 'success', hint: t('contentIndex.summary.fullyHint'), onClick: () => toggleStatus('fully') },
              { id: 'partially', label: t('contentIndex.summary.partially'), value: summary.partial, tone: 'info', hint: t('contentIndex.summary.partiallyHint'), onClick: () => toggleStatus('partially') },
              { id: 'omitted', label: t('contentIndex.summary.omitted'), value: summary.omitted, tone: 'neutral', hint: t('contentIndex.summary.omittedHint'), onClick: () => toggleStatus('omitted') },
            ]}
          />
          {summary.total > 0 && (
            <div className="surface-paper px-5 py-4">
              <div className="flex items-baseline justify-between gap-3 mb-2.5">
                <span className="text-small font-semibold text-[var(--text-primary)]">{t('contentIndex.coverage.title')}</span>
                <span className="text-caption text-[var(--text-tertiary)] tabular-nums">{t('contentIndex.coverage.value', { pct: f.percent(summary.pct) })}</span>
              </div>
              <SplitBar
                height={10}
                legend
                aria-label={t('contentIndex.coverage.title')}
                segments={[
                  { id: 'fully', value: summary.fully, color: 'var(--chart-s1)', label: t('contentIndex.status.fully'), display: f.number(summary.fully) },
                  { id: 'partially', value: summary.partial, color: 'var(--chart-s3)', label: t('contentIndex.status.partially'), display: f.number(summary.partial) },
                  { id: 'omitted', value: summary.omitted, color: 'var(--border-strong)', label: t('contentIndex.status.omitted'), display: f.number(summary.omitted) },
                ]}
              />
            </div>
          )}
        </StateBoundary>
      </div>

      {/* Filters */}
      {!error && list.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 no-print">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden />
            <input
              id="content-index-search"
              type="search"
              aria-label={t('contentIndex.filters.searchAria')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('contentIndex.filters.searchPlaceholder')}
              className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              id="content-status-filter"
              aria-label={t('contentIndex.filters.statusAria')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="flex-1 sm:flex-initial h-10 pl-3 pr-8 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--color-brand)]"
            >
              <option value="all">{t('contentIndex.filters.allStatuses')}</option>
              <option value="fully">{t('contentIndex.filters.fully')}</option>
              <option value="partially">{t('contentIndex.filters.partially')}</option>
              <option value="omitted">{t('contentIndex.filters.omitted')}</option>
            </select>
            <label className="inline-flex items-center gap-2 h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] cursor-pointer text-small whitespace-nowrap has-[:checked]:border-[var(--color-brand)] has-[:checked]:bg-[var(--color-brand-soft)]">
              <input type="checkbox" className="accent-[var(--color-brand)] w-4 h-4" checked={materialOnly} onChange={(e) => setMaterialOnly(e.target.checked)} />
              <span className="font-medium text-[var(--text-secondary)]">{t('contentIndex.filters.materialOnly')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Print-only header (PDF output) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-[18pt] font-bold">{t('contentIndex.print.title', { index: indexTitle, framework: fwName })}</h1>
        <p className="text-[10pt] text-[var(--text-secondary)]">
          {t('contentIndex.print.generated', { date: f.date(new Date()), count: filtered.length })}
        </p>
      </div>

      <StateBoundary
        loading={loading}
        hasData={!!rows}
        error={error}
        onRetry={load}
        skeleton={
          <div className="surface-paper p-4">
            <SkeletonTable rows={10} cols={5} />
          </div>
        }
        errorState={{ title: t('contentIndex.errorTitle') }}
        empty={!!rows && filtered.length === 0}
        emptyState={
          list.length === 0 ? (
            <EmptyState
              art="noData"
              title={t('contentIndex.empty.title', { index: indexTitle })}
              body={t('contentIndex.empty.body')}
              cta={{ label: t('contentIndex.empty.cta'), to: '/admin/assignments' }}
            />
          ) : (
            { variant: 'filtered', onClearFilters: clearFilters }
          )
        }
      >
        <section className="surface-paper overflow-hidden print:border-0 print:shadow-none print:rounded-none">
          {filtersOn && (
            <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between gap-3 no-print">
              <span className="text-caption text-[var(--text-secondary)] tabular-nums">{t('contentIndex.filters.showing', { n: filtered.length, total: list.length })}</span>
              <button type="button" onClick={clearFilters} className="text-caption font-semibold text-[var(--color-brand)] hover:underline underline-offset-2">
                {t('contentIndex.filters.clear')}
              </button>
            </div>
          )}
          <table className="data-table print:text-[9pt]">
            <thead>
              <tr>
                <th scope="col" className="hidden sm:table-cell print:table-cell w-[132px]">{codeColumn}</th>
                <th scope="col">{t('contentIndex.columns.disclosure')}</th>
                <th scope="col" className="hidden md:table-cell w-[200px] print:table-cell">
                  {singleSection ? t('contentIndex.columns.topic') : t('contentIndex.columns.section')}
                </th>
                <th scope="col" className="hidden lg:table-cell w-[170px] print:table-cell">{t('contentIndex.columns.materialTopic')}</th>
                <th scope="col" className="w-[120px]">{t('contentIndex.columns.status')}</th>
                <th scope="col" className="num hidden sm:table-cell w-[90px] print:hidden">{t('contentIndex.columns.approved')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const topic = codeToTopic.get(r.gri_code.split(' ')[0])
                const meta = STATUS_META[r.status]
                return (
                  <tr key={r.id}>
                    <td className="hidden sm:table-cell print:table-cell font-mono text-caption font-semibold !text-[var(--color-brand)] whitespace-nowrap align-top">{displayCode(r.gri_code)}</td>
                    <td className="!text-[var(--text-primary)] align-top">
                      <span className="sm:hidden print:hidden block font-mono text-caption font-semibold text-[var(--color-brand)] mb-0.5">{displayCode(r.gri_code)}</span>
                      <span className="text-pretty">{itemLabel(r, i18n.language)}</span>
                      <span className="md:hidden print:hidden block text-caption text-[var(--text-tertiary)] mt-0.5">{sectionLabel(r)}</span>
                    </td>
                    <td className="hidden md:table-cell print:table-cell text-caption align-top">{sectionLabel(r)}</td>
                    <td className="hidden lg:table-cell print:table-cell text-caption align-top">
                      {topic ? topic.topic_name : <span className="text-[var(--text-quaternary)]">—</span>}
                    </td>
                    <td className="align-top">
                      <StatusPill tone={meta.tone} icon={meta.icon} size="sm">
                        {t(`contentIndex.status.${r.status}`)}
                      </StatusPill>
                    </td>
                    <td className="num hidden sm:table-cell print:hidden text-caption align-top">
                      {r.total === 0 ? '—' : `${f.number(r.approved)}/${f.number(r.total)}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </StateBoundary>
    </div>
  )
}
