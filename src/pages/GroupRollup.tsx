import { useEffect, useMemo, useState } from 'react'
import {
  Network, ChevronDown, ChevronRight, CheckCircle2, Loader2,
  Factory, Building2, Landmark, Globe2, FileOutput, Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { nexus, type NexusQuestionnaireItem } from '../lib/api'
import { type OrgEntity } from '../lib/orgStore'
import { buildRollup, type RollupNode } from '../lib/rollup'
import { useOrgData } from '../lib/useOrgData'
import { useFramework } from '../lib/frameworks'
import JourneyBar from '../components/JourneyBar'

const TYPE_ICON: Record<OrgEntity['type'], typeof Landmark> = {
  group: Landmark, business_unit: Globe2, subsidiary: Building2, plant: Factory, office: Building2,
}

export default function GroupRollup() {
  const navigate = useNavigate()
  const { data: orgData } = useOrgData()
  const { active: framework } = useFramework()
  const [questions, setQuestions] = useState<NexusQuestionnaireItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQid, setSelectedQid] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      try {
        const t = await nexus.tree(framework.id)
        setQuestions(t)
      } catch { /* no-op */ }
      setLoading(false)
    })()
  }, [framework.id])

  // Preselect a question that has assignments once org data is in
  useEffect(() => {
    if (!orgData || selectedQid != null || questions.length === 0) return
    const hasData = questions.find(q => orgData.assignments.some(a => a.questionId === q.id))
    setSelectedQid(hasData?.id ?? questions[0].id)
  }, [orgData, questions, selectedQid])

  const rollup = useMemo(() => {
    if (!selectedQid || !orgData) return null
    return buildRollup(selectedQid, orgData.entities, orgData.assignments)
  }, [selectedQid, orgData])
  const selectedQ = useMemo(() => questions.find(q => q.id === selectedQid), [questions, selectedQid])

  const filteredQuestions = useMemo(() => {
    if (!query) return questions
    const q = query.toLowerCase()
    return questions.filter(x =>
      x.gri_code.toLowerCase().includes(q) ||
      x.line_item.toLowerCase().includes(q)
    )
  }, [query, questions])

  // auto-expand all on new selection
  useEffect(() => {
    if (rollup) {
      const ids = new Set<string>()
      const walk = (n: RollupNode) => { ids.add(n.entity.id); n.children.forEach(walk) }
      walk(rollup)
      setExpanded(ids)
    }
  }, [selectedQid])

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <JourneyBar variant="compact" highlight="approve" />
      </div>
      <header className="mb-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
          <Network className="w-3 h-3" /> Group rollup
        </div>
        <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)] mt-1">
          Plant data · cumulative group totals
        </h1>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)] max-w-2xl mt-1">
          Every plant enters its own figure. Subsidiary rolls up plants (equity-weighted). Group rolls up subsidiaries.
          The final approved group value is what flows into the GRI report.
        </p>
      </header>

      <div className="grid grid-cols-[320px_1fr] gap-5">
        {/* Question picker sidebar */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Find GRI line item…"
                className="w-full pl-8 pr-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-xs)]"
              />
            </div>
          </div>
          <div className="max-h-[540px] overflow-y-auto">
            {loading ? (
              <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-brand)]" /></div>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {filteredQuestions.map(q => {
                  const hasData = orgData?.assignments.some(a => a.questionId === q.id) ?? false
                  const active = q.id === selectedQid
                  return (
                    <li key={q.id}>
                      <button
                        onClick={() => setSelectedQid(q.id)}
                        className={`w-full text-left p-2.5 text-[var(--text-xs)] transition-colors ${active ? 'bg-[var(--color-brand-soft)]' : 'hover:bg-[var(--bg-secondary)]'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-[var(--color-brand)]">{q.gri_code}</span>
                              {hasData && <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-ok)]" title="Has plant data" />}
                            </div>
                            <div className={`truncate ${active ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {q.line_item}
                            </div>
                          </div>
                          {active && <ChevronRight className="w-3 h-3 text-[var(--color-brand)]" />}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Rollup tree */}
        <div>
          {selectedQ && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-gradient-to-br from-[var(--color-brand-soft)]/50 to-transparent p-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-[var(--color-brand)]">{selectedQ.gri_code}</div>
                  <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mt-0.5">{selectedQ.line_item}</h2>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-tertiary)]">
                    <span>{selectedQ.section} · {selectedQ.subsection}</span>
                    {selectedQ.unit && <span>Unit: {selectedQ.unit}</span>}
                    {selectedQ.scope_split && <span>{selectedQ.scope_split}</span>}
                  </div>
                </div>
                {rollup && rollup.cumulative != null && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-[var(--color-brand-strong)]">Group total</div>
                    <div className="text-[28px] font-bold tabular-nums text-[var(--color-brand-strong)]">
                      {formatNum(rollup.cumulative)}
                    </div>
                    {rollup.unit && <div className="text-[10px] text-[var(--color-brand-strong)]">{rollup.unit}</div>}
                  </div>
                )}
              </div>
              {rollup && (
                <div className="mt-3 flex items-center gap-4 text-[10px]">
                  <CountChip label="Approved" value={rollup.approved} tone="ok" />
                  <CountChip label="In review" value={rollup.submitted} tone="pending" />
                  <CountChip label="Outstanding" value={rollup.notStarted} tone="draft" />
                  <span className="text-[var(--text-tertiary)]">
                    {rollup.approved}/{rollup.assigned} approved
                  </span>
                  {rollup.assigned > 0 && rollup.approved === rollup.assigned && (
                    <span className="inline-flex items-center gap-1 text-[var(--status-ok)] font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Ready for report
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {rollup ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
              <RollupTreeRow
                node={rollup}
                expanded={expanded}
                onToggle={id => {
                  const next = new Set(expanded)
                  if (next.has(id)) next.delete(id); else next.add(id)
                  setExpanded(next)
                }}
                depth={0}
                isRoot
              />
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-primary)] p-14 text-center">
              <Network className="w-10 h-10 mx-auto text-[var(--text-tertiary)] mb-2" />
              <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
                {loading ? 'Loading…' : 'Pick a question to see its rollup'}
              </h3>
              <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1">
                Use the list on the left to select a GRI line item.
              </p>
            </div>
          )}

          {rollup && rollup.assigned > 0 && rollup.approved === rollup.assigned && (
            <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--status-ok)]/30 bg-[var(--accent-green-light)] p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[var(--status-ok)]" />
                <div>
                  <div className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">This line item is fully approved</div>
                  <div className="text-[var(--text-xs)] text-[var(--text-secondary)]">
                    The rolled-up group value will populate directly into the next GRI report.
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/reports')}
                className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-xs)] font-semibold hover:bg-[var(--color-brand-strong)] inline-flex items-center gap-1.5"
              >
                <FileOutput className="w-3.5 h-3.5" /> Go to report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CountChip({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'pending' | 'draft' }) {
  const bg = tone === 'ok' ? 'var(--accent-green-light)' : tone === 'pending' ? 'var(--accent-blue-light)' : 'var(--accent-amber-light)'
  const fg = tone === 'ok' ? 'var(--status-ok)' : tone === 'pending' ? 'var(--status-pending)' : 'var(--status-draft)'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider" style={{ background: bg, color: fg }}>
      {label}: {value}
    </span>
  )
}

function RollupTreeRow({ node, expanded, onToggle, depth, isRoot }: {
  node: RollupNode
  expanded: Set<string>
  onToggle: (id: string) => void
  depth: number
  isRoot?: boolean
}) {
  const isOpen = expanded.has(node.entity.id)
  const Icon = TYPE_ICON[node.entity.type]
  const hasChildren = node.children.length > 0
  const hasData = node.cumulative != null
  const pct = node.assigned > 0 ? (node.approved / node.assigned) * 100 : 0
  const barColor = pct === 100 ? 'var(--status-ok)' : pct >= 50 ? 'var(--status-pending)' : 'var(--status-draft)'

  const typeTint: Record<string, string> = {
    group: 'var(--accent-teal)', business_unit: 'var(--accent-purple)',
    subsidiary: 'var(--accent-blue)', plant: 'var(--accent-amber)', office: 'var(--text-tertiary)',
  }

  return (
    <div>
      <div
        className={`flex items-center gap-3 py-2.5 px-2 rounded-[var(--radius-md)] transition-colors ${isRoot ? 'bg-[var(--color-brand-soft)]/40 border border-[var(--color-brand)]/20' : 'hover:bg-[var(--bg-secondary)]'}`}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        <button
          onClick={() => hasChildren && onToggle(node.entity.id)}
          className={`w-5 h-5 flex items-center justify-center rounded ${hasChildren ? 'hover:bg-[var(--bg-tertiary)]' : 'opacity-30'}`}
        >
          {hasChildren ? (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <span className="w-3.5 h-3.5" />}
        </button>

        <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0 text-white" style={{ background: typeTint[node.entity.type] }}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{node.entity.name}</span>
            <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">{node.entity.type.replace('_', ' ')}</span>
            {node.entity.equity != null && node.entity.equity < 100 && (
              <span className="text-[9px] font-semibold text-[var(--accent-amber)] bg-[var(--accent-amber-light)] px-1.5 py-0.5 rounded">
                {node.entity.equity}% equity
              </span>
            )}
          </div>
          {node.assigned > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden max-w-[240px]">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <span className="text-[9px] font-semibold tabular-nums text-[var(--text-tertiary)]">
                {node.approved}/{node.assigned}
              </span>
            </div>
          )}
        </div>

        {/* Value column */}
        <div className="text-right flex-shrink-0 min-w-[160px]">
          {hasData ? (
            <>
              <div className={`text-[var(--text-base)] font-bold tabular-nums ${isRoot ? 'text-[var(--color-brand-strong)]' : 'text-[var(--text-primary)]'}`}>
                {formatNum(node.cumulative!)}
              </div>
              {node.unit && <div className="text-[9px] text-[var(--text-tertiary)]">{node.unit}</div>}
            </>
          ) : (
            <span className="text-[10px] text-[var(--text-tertiary)] italic">No data</span>
          )}
        </div>
      </div>

      {isOpen && node.children.map(c => (
        <RollupTreeRow
          key={c.entity.id}
          node={c}
          expanded={expanded}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return n.toFixed(2)
}
