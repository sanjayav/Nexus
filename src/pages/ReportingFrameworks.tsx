import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, AlertCircle, ChevronRight, ChevronDown, Search,
  PencilLine, Calculator, Plug, Bot, CheckCircle2, Clock, Hash,
} from 'lucide-react'
import {
  nexus,
  type NexusQuestionnaireItem,
  type NexusDataValue,
  type NexusHistoricalPoint,
} from '../lib/api'
import { formatValue, truncateHash } from '../reports/spdTemplate'
import SetupGuard from '../components/SetupGuard'
import { Button } from '../design-system'

const ACTIVE_YEAR = 2026

const CAPITAL_ORDER = [
  'Financial Capital',
  'Manufacture Capital',
  'Human Capital',
  'Social & Relationship Capital',
  'Natural Capital',
] as const

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; error: string }
  | {
      kind: 'ready'
      items: NexusQuestionnaireItem[]
      currentByItem: Map<string, NexusDataValue>
      // Sparse — only fetched on expand for performance.
      historyByItem: Map<string, NexusHistoricalPoint[]>
    }

type ScopeFilter = 'group' | 'jv'

/**
 * GRI Questionnaire page — SRD §8.
 * Live tree from nexus.tree(), grouped in the exact hierarchy the PTTGC SPD PDF
 * publishes (Capital → Subsection → GRI disclosure → Line item), with per-item
 * FY2026 status chip + 4-year history on expand. Click any item → /data/entry/:id.
 */
export default function ReportingFrameworks() {
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<ScopeFilter>('group')
  const [openCap, setOpenCap] = useState<Record<string, boolean>>({ 'Natural Capital': true })
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({})
  const [openCode, setOpenCode] = useState<Record<string, boolean>>({})

  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const [items, reviewQ, approvalQ] = await Promise.all([
        nexus.tree(),
        nexus.reviewQueue(),
        nexus.approvalQueue(),
      ])
      if (items.length === 0) return setState({ kind: 'empty' })
      const currentByItem = new Map<string, NexusDataValue>()
      for (const dv of reviewQ) currentByItem.set(dv.questionnaire_item_id, dv)
      for (const dv of approvalQ) currentByItem.set(dv.questionnaire_item_id, dv)
      setState({ kind: 'ready', items, currentByItem, historyByItem: new Map() })
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : 'Failed to load' })
    }
  }

  useEffect(() => { load() }, [])

  const fetchHistoryIfNeeded = async (itemId: string) => {
    if (state.kind !== 'ready') return
    if (state.historyByItem.has(itemId)) return
    try {
      const history = await nexus.historical(itemId)
      setState(s => {
        if (s.kind !== 'ready') return s
        const next = new Map(s.historyByItem)
        next.set(itemId, history)
        return { ...s, historyByItem: next }
      })
    } catch { /* swallow — empty history renders as em-dash */ }
  }

  const tree = useMemo(() => {
    if (state.kind !== 'ready') return []
    const q = query.toLowerCase().trim()
    const items = state.items.filter(i => i.reporting_scope === scope)
    const matches = q
      ? items.filter(i =>
          i.line_item.toLowerCase().includes(q) ||
          i.gri_code.toLowerCase().includes(q) ||
          i.subsection.toLowerCase().includes(q) ||
          i.section.toLowerCase().includes(q))
      : items

    // Capital → Subsection → GRI code → items
    return CAPITAL_ORDER.map(capital => {
      const inCap = matches.filter(i => i.section === capital)
      const subs = Array.from(new Set(inCap.map(i => i.subsection)))
      return {
        capital,
        subsections: subs.map(sub => {
          const inSub = inCap.filter(i => i.subsection === sub)
          const codes = Array.from(new Set(inSub.map(i => i.gri_code)))
          return {
            name: sub,
            codes: codes.map(code => ({
              code,
              items: inSub.filter(i => i.gri_code === code),
            })),
          }
        }),
      }
    }).filter(c => c.subsections.length > 0)
  }, [state, query, scope])

  const stats = useMemo(() => {
    if (state.kind !== 'ready') return { total: 0, approved: 0, pending: 0, notStarted: 0 }
    const items = state.items.filter(i => i.reporting_scope === scope)
    const total = items.length
    let approved = 0, pending = 0
    for (const it of items) {
      const dv = state.currentByItem.get(it.id)
      if (dv?.status === 'approved' || dv?.status === 'published') approved++
      else if (dv && dv.status !== 'not_started' && dv.status !== 'draft') pending++
    }
    return { total, approved, pending, notStarted: total - approved - pending }
  }, [state, scope])

  if (state.kind === 'loading') return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>
  if (state.kind === 'empty') return <SetupGuard onReady={load} />
  if (state.kind === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Unable to load questionnaire</h3>
            <p className="text-[var(--text-sm)] text-[var(--text-secondary)] font-mono mt-1">{state.error}</p>
            <button onClick={load} className="mt-3 text-[var(--text-sm)] font-medium text-[var(--color-brand)] hover:underline">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header>
        <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)]">GRI Questionnaire — FY{ACTIVE_YEAR}</h1>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1">
          Full GRI inventory inherited from the published PTTGC Sustainability Performance Data report — same hierarchy, same line items, same units. Click any row to enter, compute, or pull its FY{ACTIVE_YEAR} value.
        </p>
      </header>

      {/* Scope toggle + KPIs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-1">
          {(['group', 'jv'] as ScopeFilter[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-semibold transition-colors ${
                scope === s
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {s === 'group' ? 'GC Group' : 'JV Parallel'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[var(--text-xs)]">
          <span className="px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)] tabular-nums">{stats.total}</span> items
          </span>
          <span className="px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--accent-green-light)] text-[var(--status-ok)]">
            <span className="font-semibold tabular-nums">{stats.approved}</span> approved
          </span>
          <span className="px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--accent-blue-light)] text-[var(--status-pending)]">
            <span className="font-semibold tabular-nums">{stats.pending}</span> in flight
          </span>
          <span className="px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
            <span className="font-semibold tabular-nums">{stats.notStarted}</span> not started
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search GRI code, line item, or subsection…"
          className="w-full pl-10 pr-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none"
        />
      </div>

      {/* Tree */}
      <div className="space-y-3">
        {tree.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] p-10 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">
            No matches for "{query}".
          </div>
        )}
        {tree.map(cap => {
          const isCapOpen = query ? true : (openCap[cap.capital] ?? false)
          const capCount = cap.subsections.reduce((n, s) => n + s.codes.reduce((m, c) => m + c.items.length, 0), 0)
          return (
            <div key={cap.capital} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCap(e => ({ ...e, [cap.capital]: !isCapOpen }))}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCapOpen ? <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />}
                  <span className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">{cap.capital}</span>
                </div>
                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] tabular-nums">{capCount} items</span>
              </button>

              {isCapOpen && (
                <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                  {cap.subsections.map(sub => {
                    const subKey = `${cap.capital}::${sub.name}`
                    const isSubOpen = query ? true : (openSub[subKey] ?? true)
                    const subCount = sub.codes.reduce((n, c) => n + c.items.length, 0)
                    return (
                      <div key={sub.name}>
                        <button
                          type="button"
                          onClick={() => setOpenSub(e => ({ ...e, [subKey]: !isSubOpen }))}
                          className="w-full flex items-center justify-between px-5 py-2.5 bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isSubOpen ? <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />}
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-brand)]">{sub.name}</span>
                          </div>
                          <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{subCount}</span>
                        </button>

                        {isSubOpen && (
                          <div className="divide-y divide-[var(--border-subtle)]/60">
                            {sub.codes.map(codeGroup => {
                              const codeKey = `${subKey}::${codeGroup.code}`
                              const isCodeOpen = query ? true : (openCode[codeKey] ?? (codeGroup.items.length <= 3))
                              return (
                                <div key={codeGroup.code}>
                                  {codeGroup.items.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setOpenCode(e => ({ ...e, [codeKey]: !isCodeOpen }))}
                                      className="w-full flex items-center gap-2 px-5 py-1.5 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                                    >
                                      {isCodeOpen ? <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />}
                                      <span className="font-mono text-[10px] font-semibold text-[var(--text-tertiary)]">{codeGroup.code}</span>
                                      <span className="text-[10px] text-[var(--text-tertiary)]">· {codeGroup.items.length} rows</span>
                                    </button>
                                  )}
                                  {(isCodeOpen || codeGroup.items.length === 1) && codeGroup.items.map(it => (
                                    <LineItem
                                      key={it.id}
                                      item={it}
                                      dv={state.currentByItem.get(it.id) ?? null}
                                      history={state.historyByItem.get(it.id) ?? null}
                                      onHover={() => fetchHistoryIfNeeded(it.id)}
                                      onOpen={() => navigate(`/data/entry/${it.id}`)}
                                    />
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={() => navigate('/reports/preview')}>View regenerated report</Button>
        <Button variant="primary" size="sm" onClick={() => navigate('/reports')}>Publish Centre</Button>
      </div>
    </div>
  )
}

function LineItem({
  item, dv, history, onHover, onOpen,
}: {
  item: NexusQuestionnaireItem
  dv: NexusDataValue | null
  history: NexusHistoricalPoint[] | null
  onHover: () => void
  onOpen: () => void
}) {
  const ModeIcon =
    item.entry_mode_default === 'Calculator' ? Calculator :
    item.entry_mode_default === 'Connector' ? Plug :
    PencilLine

  const latest = history && history.length > 0 ? history[history.length - 1].value : null

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={onHover}
      onFocus={onHover}
      className="w-full group text-left flex items-center gap-3 pl-12 pr-5 py-2 hover:bg-[var(--color-brand-soft)] transition-colors"
    >
      <ModeIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--color-brand)] flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[var(--text-xs)] font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--color-brand-strong)]">
          {item.line_item}
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)]">
          {item.scope_split ? `${item.scope_split} · ` : ''}
          {item.unit ?? '—'}
          {item.target_fy2026 != null ? ` · target ${item.target_fy2026}` : ''}
        </div>
      </div>

      {/* FY2025 latest (from history) */}
      {latest != null && (
        <span className="text-[10px] tabular-nums text-[var(--text-tertiary)] hidden md:inline-block" title="FY2025">
          '25 {formatValue(latest)}
        </span>
      )}

      {/* Current-year status / hash */}
      {dv ? (
        <StatusPill status={dv.status} value={dv.value} hash={dv.value_hash} />
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] text-[9px] font-semibold uppercase tracking-wider bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
          Not started
        </span>
      )}

      {/* Role badge */}
      <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-secondary)] group-hover:bg-white text-[9px] font-semibold text-[var(--text-tertiary)] flex-shrink-0 inline-flex items-center gap-1 min-w-[36px] justify-center">
        {item.default_workflow_role === 'AUTO' && <Bot className="w-2.5 h-2.5" />}
        {item.default_workflow_role}
      </span>
    </button>
  )
}

function StatusPill({ status, value, hash }: { status: NexusDataValue['status']; value: number | null; hash: string | null }) {
  const map: Record<NexusDataValue['status'], { label: string; bg: string; fg: string; Icon: typeof Clock }> = {
    not_started: { label: 'Not started', bg: 'var(--bg-tertiary)', fg: 'var(--text-tertiary)', Icon: Clock },
    draft:       { label: 'Draft', bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)', Icon: Clock },
    submitted:   { label: 'Submitted', bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)', Icon: Clock },
    reviewed:    { label: 'Reviewed', bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)', Icon: Clock },
    approved:    { label: 'Approved', bg: 'var(--accent-green-light)', fg: 'var(--status-ok)', Icon: CheckCircle2 },
    published:   { label: 'Published', bg: 'var(--accent-green-light)', fg: 'var(--status-ok)', Icon: CheckCircle2 },
    rejected:    { label: 'Rejected', bg: 'var(--accent-red-light)', fg: 'var(--status-reject)', Icon: AlertCircle },
  }
  const c = map[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px]">
      {value != null && <span className="tabular-nums font-semibold text-[var(--text-primary)]">{formatValue(value)}</span>}
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-xs)] font-semibold uppercase tracking-wider" style={{ background: c.bg, color: c.fg }}>
        <c.Icon className="w-2.5 h-2.5" />
        {c.label}
      </span>
      {hash && <span className="font-mono text-[9px] text-[var(--text-tertiary)] inline-flex items-center gap-0.5"><Hash className="w-2 h-2" />{truncateHash(hash)}</span>}
    </span>
  )
}
