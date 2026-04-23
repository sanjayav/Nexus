import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle2, Circle, AlertTriangle, Printer, Download, Search, Filter, Loader2 } from 'lucide-react'
import { orgStore, type ContentIndexRow, type MaterialTopic } from '../lib/orgStore'
import { useFramework } from '../lib/frameworks'
import { FrameworkBadge } from '../components/FrameworkBadge'
import JourneyBar from '../components/JourneyBar'
import { riseIn, popIn } from '../components/motion'

type StatusFilter = 'all' | 'fully' | 'partially' | 'omitted'

/**
 * GRI Content Index — the master table that opens every GRI report.
 * Auto-built from assignments. Every row says whether the disclosure is
 * fully / partially / omitted, what section it lives in, and which material
 * topic it answers. Print-optimised so reviewers can download a PDF.
 */
export default function ContentIndex() {
  const { active: framework } = useFramework()
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
    <div className="animate-fade-in">
      <div className="mb-4 no-print"><JourneyBar variant="compact" /></div>

      <motion.header {...riseIn(0)} className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
            <BookOpen className="w-3 h-3" /> GRI Content Index
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)]">Disclosure index</h1>
            <FrameworkBadge size="md" />
          </div>
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1 max-w-2xl">
            Auto-generated from your assignments. Every GRI disclosure, its status, the section it lives in, and the material topic it answers. This is the table that opens every GRI-compliant report.
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={handlePrint} className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-xs)] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] inline-flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button onClick={handlePrint} className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold hover:bg-[var(--color-brand-strong)] inline-flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Save as PDF
          </button>
        </div>
      </motion.header>

      {/* Summary */}
      <motion.section {...popIn(1)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5 no-print">
        <SummaryCard label="Total disclosures" value={summary.total} hint={`${summary.pct}% fully reported`} tone="neutral" />
        <SummaryCard label="Fully reported"    value={summary.fully}   hint="All required data approved" tone="ok" />
        <SummaryCard label="Partially"          value={summary.partial} hint="Some data in / review" tone="pending" />
        <SummaryCard label="Omitted"            value={summary.omitted} hint="No data · needs assignment" tone="reject" />
      </motion.section>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap no-print">
        <div className="flex-1 relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search GRI code, line item, section…"
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]" />
        </div>
        <div className="relative">
          <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="pl-7 pr-7 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] appearance-none">
            <option value="all">All statuses</option>
            <option value="fully">Fully reported</option>
            <option value="partially">Partially</option>
            <option value="omitted">Omitted</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] cursor-pointer text-[var(--text-xs)]">
          <input type="checkbox" checked={materialOnly} onChange={e => setMaterialOnly(e.target.checked)} />
          <span className="font-medium text-[var(--text-secondary)]">Material topics only</span>
        </label>
      </div>

      {/* Print-only header (shows up only on PDF output) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-[18pt] font-bold">GRI Content Index — {framework.name}</h1>
        <p className="text-[10pt] text-gray-600">Generated {new Date().toLocaleDateString()} · {filtered.length} disclosures</p>
      </div>

      {/* The index table */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden print:border-0 print:rounded-none">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-brand)]" /></div>
        ) : (
          <table className="w-full text-[var(--text-sm)] print:text-[9pt]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-secondary)] print:bg-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold w-[100px]">Code</th>
                <th className="text-left px-4 py-2.5 font-semibold">Disclosure</th>
                <th className="text-left px-3 py-2.5 font-semibold w-[140px]">Section</th>
                <th className="text-left px-3 py-2.5 font-semibold w-[160px]">Material topic</th>
                <th className="text-center px-3 py-2.5 font-semibold w-[100px]">Status</th>
                <th className="text-center px-3 py-2.5 font-semibold w-[90px] print:hidden">Approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((r, i) => {
                const codeNoVer = r.gri_code.split(' ')[0]
                const topic = codeToTopic.get(codeNoVer)
                return (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.005 }}>
                    <td className="px-4 py-2 font-mono text-[10px] text-[var(--color-brand)] font-bold">{r.gri_code}</td>
                    <td className="px-4 py-2 text-[var(--text-xs)] text-[var(--text-primary)]">{r.line_item}</td>
                    <td className="px-3 py-2 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{r.section}</td>
                    <td className="px-3 py-2 text-[10px] text-[var(--text-secondary)] truncate">
                      {topic ? topic.topic_name : <span className="italic text-[var(--text-tertiary)]">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center"><IndexStatusChip status={r.status} /></td>
                    <td className="px-3 py-2 text-center text-[10px] text-[var(--text-tertiary)] tabular-nums print:hidden">
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
      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: fg, opacity: 0.8 }}>{label}</div>
      <div className="text-[26px] font-bold tabular-nums mt-0.5" style={{ color: fg }}>{value}</div>
      <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{hint}</div>
    </div>
  )
}

function IndexStatusChip({ status }: { status: ContentIndexRow['status'] }) {
  if (status === 'fully') return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--status-ok)] bg-[var(--accent-green-light)] px-1.5 py-0.5 rounded">
      <CheckCircle2 className="w-2.5 h-2.5" /> Fully
    </span>
  )
  if (status === 'partially') return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--status-pending)] bg-[var(--accent-blue-light)] px-1.5 py-0.5 rounded">
      <Circle className="w-2.5 h-2.5" /> Partial
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
      <AlertTriangle className="w-2.5 h-2.5" /> Omitted
    </span>
  )
}
