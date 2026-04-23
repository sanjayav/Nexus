import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, AlertCircle, ChevronRight, ChevronDown, Search,
  PencilLine, Calculator, Plug, Bot,
} from 'lucide-react'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import SetupGuard from '../components/SetupGuard'
import { CAPITAL_ORDER, SUBSECTION_ORDER } from '../reports/spdTemplate'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; error: string }
  | { kind: 'ready'; items: NexusQuestionnaireItem[] }

/**
 * Question picker for /data/entry.
 * Live GRI tree from nexus.tree(). Click any line item to jump into the entry screen.
 */
export default function DataEntryPicker() {
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Natural Capital': true, // default-open the hero capital
  })

  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const items = await nexus.tree()
      if (items.length === 0) return setState({ kind: 'empty' })
      setState({ kind: 'ready', items })
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : 'Failed to load' })
    }
  }

  useEffect(() => { load() }, [])

  const grouped = useMemo(() => {
    if (state.kind !== 'ready') return []
    const q = query.toLowerCase().trim()
    const items = q
      ? state.items.filter(i =>
          i.line_item.toLowerCase().includes(q) ||
          i.gri_code.toLowerCase().includes(q) ||
          i.subsection.toLowerCase().includes(q))
      : state.items

    return CAPITAL_ORDER
      .map(capital => {
        const inCap = items.filter(i => i.section === capital && i.reporting_scope === 'group')
        const knownSubs = SUBSECTION_ORDER[capital] || []
        const allSubs = Array.from(new Set([
          ...knownSubs.filter(s => inCap.some(i => i.subsection === s)),
          ...inCap.map(i => i.subsection).filter(s => !knownSubs.includes(s)),
        ]))
        return {
          capital,
          subsections: allSubs.map(sub => ({
            name: sub,
            rows: inCap.filter(i => i.subsection === sub),
          })).filter(s => s.rows.length > 0),
        }
      })
      .filter(c => c.subsections.length > 0)
  }, [state, query])

  if (state.kind === 'loading') return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>
  if (state.kind === 'empty') return <SetupGuard onReady={load} />
  if (state.kind === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Unable to load question tree</h3>
            <p className="text-[var(--text-sm)] text-[var(--text-secondary)] font-mono mt-1">{state.error}</p>
            <button onClick={load} className="mt-3 text-[var(--text-sm)] font-medium text-[var(--color-brand)] hover:underline">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  const total = state.items.filter(i => i.reporting_scope === 'group').length

  return (
    <div className="space-y-5 animate-fade-in">
      <header>
        <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)]">Data Collection</h1>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1">
          Pick any GRI line item to enter, compute, or pull its FY2026 value.
          <span className="text-[var(--text-tertiary)] ml-2">{total} group-scope items seeded from PTTGC FY2025 SPD.</span>
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by GRI code or line item…"
          className="w-full pl-10 pr-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none"
        />
      </div>

      {/* Tree */}
      <div className="space-y-3">
        {grouped.map(cap => {
          const isOpen = query ? true : (expanded[cap.capital] ?? false)
          const count = cap.subsections.reduce((acc, s) => acc + s.rows.length, 0)
          return (
            <div key={cap.capital} className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(e => ({ ...e, [cap.capital]: !isOpen }))}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />}
                  <span className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">{cap.capital}</span>
                </div>
                <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] tabular-nums">{count} items</span>
              </button>

              {isOpen && (
                <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                  {cap.subsections.map(sub => (
                    <div key={sub.name} className="px-5 py-3">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-brand)] mb-2">{sub.name}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {sub.rows.map(it => <LineItemRow key={it.id} item={it} onOpen={() => navigate(`/data/entry/${it.id}`)} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LineItemRow({ item, onOpen }: { item: NexusQuestionnaireItem; onOpen: () => void }) {
  const ModeIcon =
    item.entry_mode_default === 'Calculator' ? Calculator :
    item.entry_mode_default === 'Connector' ? Plug :
    PencilLine
  const RoleBadge = item.default_workflow_role === 'AUTO' ? Bot : null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-brand-soft)] transition-colors min-w-0"
    >
      <ModeIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--color-brand)] flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[var(--text-xs)] font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--color-brand-strong)]">
          {item.line_item}
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)] font-mono">
          {item.gri_code}
          {item.scope_split ? ` · ${item.scope_split}` : ''}
          {item.unit ? ` · ${item.unit}` : ''}
        </div>
      </div>
      <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-secondary)] group-hover:bg-white text-[9px] font-semibold text-[var(--text-tertiary)] flex-shrink-0 inline-flex items-center gap-1">
        {RoleBadge && <RoleBadge className="w-2.5 h-2.5" />}
        {item.default_workflow_role}
      </span>
    </button>
  )
}
