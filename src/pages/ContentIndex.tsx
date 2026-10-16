import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Circle, AlertTriangle, Printer, Download, Search, Filter } from 'lucide-react'
import { orgStore, type ContentIndexRow, type MaterialTopic } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'
import { FrameworkBadge } from '../components/FrameworkBadge'
import JourneyBar from '../components/JourneyBar'
import { popIn } from '../components/motion'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import { itemLabel } from '../lib/itemLabel'

type StatusFilter = 'all' | 'fully' | 'partially' | 'omitted'

/**
 * GRI Content Index — the master table that opens every GRI report.
 * Auto-built from assignments. Every row says whether the disclosure is
 * fully / partially / omitted, what section it lives in, and which material
 * topic it answers. Print-optimised so reviewers can download a PDF.
 */
export default function ContentIndex() {
  const { t, i18n } = useTranslation()
  const zh = !!i18n.language?.startsWith('zh')
  const { active: framework } = useFramework()
  const fz = framework as { nameZh?: string; descriptionZh?: string }
  const [rows, setRows] = useState<ContentIndexRow[]>([])
  const [topics, setTopics] = useState<MaterialTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [materialOnly, setMaterialOnly] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [r, t] = await Promise.all([
          orgStore.contentIndex(framework.id),
          orgStore.listMaterialTopics(),
        ])
        setRows(r)
        setTopics(t)
      } catch { /* silent */ }
      setLoading(false)
    })()
  }, [framework.id])

  // Which topic (if any) each GRI code is linked to
  const codeToTopic = useMemo(() => {
    const m = new Map<string, MaterialTopic>()
    for (const t of topics.filter(x => x.framework_id === framework.id)) {
      for (const c of (t.linked_gri_codes ?? [])) m.set(c, t)
    }
    return m
  }, [topics, framework.id])

  // GRI codes marked as material via any topic
  const materialCodes = useMemo(() => {
    const set = new Set<string>()
    for (const t of topics.filter(x => x.framework_id === framework.id && x.dma_status === 'material')) {
      for (const c of (t.linked_gri_codes ?? [])) set.add(c)
    }
    return set
  }, [topics, framework.id])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (materialOnly) {
        const codeNoVersion = r.gri_code.split(' ')[0]
        if (!materialCodes.has(codeNoVersion)) return false
      }
      if (!q) return true
      return (
        r.gri_code.toLowerCase().includes(q) ||
        r.line_item.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q)
      )
    })
  }, [rows, query, statusFilter, materialOnly, materialCodes])

  const summary = useMemo(() => {
    const total = filtered.length
    const fully = filtered.filter(r => r.status === 'fully').length
    const partial = filtered.filter(r => r.status === 'partially').length
    const omitted = filtered.filter(r => r.status === 'omitted').length
    return { total, fully, partial, omitted, pct: total ? Math.round((fully / total) * 100) : 0 }
  }, [filtered])

  const handlePrint = () => window.print()

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-4 no-print"><JourneyBar variant="compact" /></div>

      <PageHeader
        breadcrumbs={[
          { label: t('contentIndex.breadcrumbs.reports'), to: '/reports' },
          { label: t('contentIndex.breadcrumbs.library') },
        ]}
        eyebrow={t('contentIndex.header.eyebrow')}
        title={t('contentIndex.header.title')}
        description={t('contentIndex.header.description')}
        actions={
          <div className="flex items-center gap-2 no-print">
            <button onClick={handlePrint} className="btn-secondary">
              <Printer className="w-3.5 h-3.5" /> {t('contentIndex.actions.print')}
            </button>
            <button onClick={handlePrint} className="btn-primary">
              <Download className="w-3.5 h-3.5" /> {t('contentIndex.actions.savePdf')}
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <FrameworkBadge size="md" />
        </div>
      </PageHeader>

      {/* Summary */}
      <motion.section {...popIn(1)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5 no-print">
        <SummaryCard label={t('contentIndex.summary.total')}     value={summary.total}   hint={t('contentIndex.summary.totalHint', { pct: summary.pct })} tone="neutral" />
        <SummaryCard label={t('contentIndex.summary.fully')}     value={summary.fully}   hint={t('contentIndex.summary.fullyHint')} tone="ok" />
        <SummaryCard label={t('contentIndex.summary.partially')} value={summary.partial} hint={t('contentIndex.summary.partiallyHint')} tone="pending" />
        <SummaryCard label={t('contentIndex.summary.omitted')}   value={summary.omitted} hint={t('contentIndex.summary.omittedHint')} tone="reject" />
      </motion.section>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap no-print">
        <div className="flex-1 relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input id="content-index-search" aria-label={t('contentIndex.filters.searchAria')} value={query} onChange={e => setQuery(e.target.value)} placeholder={t('contentIndex.filters.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)]" />
        </div>
        <div className="relative">
          <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <select id="content-status-filter" aria-label={t('contentIndex.filters.statusAria')} value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="pl-7 pr-7 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-xs)] appearance-none">
            <option value="all">{t('contentIndex.filters.allStatuses')}</option>
            <option value="fully">{t('contentIndex.filters.fully')}</option>
            <option value="partially">{t('contentIndex.filters.partially')}</option>
            <option value="omitted">{t('contentIndex.filters.omitted')}</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] cursor-pointer text-[length:var(--text-xs)]">
          <input type="checkbox" checked={materialOnly} onChange={e => setMaterialOnly(e.target.checked)} />
          <span className="font-medium text-[var(--text-secondary)]">{t('contentIndex.filters.materialOnly')}</span>
        </label>
      </div>

      {/* Print-only header (shows up only on PDF output) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-[18pt] font-bold">{t('contentIndex.print.title', { framework: (zh && fz.nameZh) || framework.name })}</h1>
        <p className="text-[10pt] text-gray-600">{t('contentIndex.print.generated', { date: new Date().toLocaleDateString(zh ? 'zh-CN' : undefined), count: filtered.length })}</p>
      </div>

      {/* The index table */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden print:border-0 print:rounded-none">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={10} cols={6} /></div>
        ) : (
          <table className="w-full text-[length:var(--text-sm)] print:text-[9pt]">
            <thead>
              <tr className="text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] print:bg-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold w-[100px]">{t('contentIndex.columns.code')}</th>
                <th className="text-left px-4 py-2.5 font-semibold">{t('contentIndex.columns.disclosure')}</th>
                <th className="text-left px-3 py-2.5 font-semibold w-[140px]">{t('contentIndex.columns.section')}</th>
                <th className="text-left px-3 py-2.5 font-semibold w-[160px]">{t('contentIndex.columns.materialTopic')}</th>
                <th className="text-center px-3 py-2.5 font-semibold w-[100px]">{t('contentIndex.columns.status')}</th>
                <th className="text-center px-3 py-2.5 font-semibold w-[90px] print:hidden">{t('contentIndex.columns.approved')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((r, i) => {
                const codeNoVer = r.gri_code.split(' ')[0]
                const topic = codeToTopic.get(codeNoVer)
                return (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.005 }}>
                    <td className="px-4 py-2 font-mono text-caption text-[var(--color-brand)] font-bold">{r.gri_code}</td>
                    <td className="px-4 py-2 text-[length:var(--text-xs)] text-[var(--text-primary)]">{itemLabel(r, i18n.language)}</td>
                    <td className="px-3 py-2 text-micro text-[var(--text-tertiary)] uppercase tracking-[0.06em]">{r.section}</td>
                    <td className="px-3 py-2 text-caption text-[var(--text-secondary)] truncate">
                      {topic ? topic.topic_name : <span className="italic text-[var(--text-tertiary)]">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center"><IndexStatusChip status={r.status} /></td>
                    <td className="px-3 py-2 text-center text-caption text-[var(--text-tertiary)] tabular-nums print:hidden">
                      {r.total === 0 ? '—' : `${r.approved}/${r.total}`}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: 'ok' | 'pending' | 'reject' | 'neutral' }) {
  const bg = tone === 'ok' ? 'var(--accent-green-light)' : tone === 'pending' ? 'var(--accent-blue-light)' : tone === 'reject' ? 'var(--accent-red-light)' : 'var(--bg-primary)'
  const fg = tone === 'ok' ? 'var(--status-ok)' : tone === 'pending' ? 'var(--status-pending)' : tone === 'reject' ? 'var(--status-reject)' : 'var(--text-primary)'
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] p-4" style={{ background: bg }}>
      <div className="text-micro uppercase tracking-[0.06em] font-semibold" style={{ color: fg, opacity: 0.8 }}>{label}</div>
      <div className="text-[26px] font-bold tabular-nums mt-0.5" style={{ color: fg }}>{value}</div>
      <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{hint}</div>
    </div>
  )
}

function IndexStatusChip({ status }: { status: ContentIndexRow['status'] }) {
  const { t } = useTranslation()
  if (status === 'fully') return (
    <span className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-[0.06em] text-[var(--status-ok)] bg-[var(--accent-green-light)] px-1.5 py-0.5 rounded">
      <CheckCircle2 className="w-2.5 h-2.5" /> {t('contentIndex.status.fully')}
    </span>
  )
  if (status === 'partially') return (
    <span className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-[0.06em] text-[var(--status-pending)] bg-[var(--accent-blue-light)] px-1.5 py-0.5 rounded">
      <Circle className="w-2.5 h-2.5" /> {t('contentIndex.status.partially')}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-[0.06em] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
      <AlertTriangle className="w-2.5 h-2.5" /> {t('contentIndex.status.omitted')}
    </span>
  )
}
