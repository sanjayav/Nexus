import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { itemLabel } from '../lib/itemLabel'
import {
  ChevronRight, ChevronDown, Search,
  PencilLine, Calculator, Plug, Bot,
} from 'lucide-react'
import { StateBoundary } from '../components/ui'
import { SkeletonTable } from '../components/Skeleton'
import { sectionLabel, subsectionLabel } from '../components/entry/labels'
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
  const { t, i18n } = useTranslation()
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
      setState({ kind: 'error', error: e instanceof Error ? e.message : t('dataEntry.picker.failedToLoad') })
    }
  }

  useEffect(() => { load() }, [])

  const grouped = useMemo(() => {
    if (state.kind !== 'ready') return []
    const q = query.toLowerCase().trim()
    const items = q
      ? state.items.filter(i =>
          i.line_item.toLowerCase().includes(q) ||
          itemLabel(i, i18n.language).toLowerCase().includes(q) ||
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
  }, [state, query, i18n.language])

  if (state.kind === 'empty') return <SetupGuard onReady={load} />
  if (state.kind !== 'ready') {
    return (
      <StateBoundary
        loading={state.kind === 'loading'}
        error={state.kind === 'error' ? state.error : null}
        onRetry={() => void load()}
        errorState={{ title: t('dataEntry.picker.unableToLoad') }}
        skeleton={<SkeletonTable rows={6} cols={2} />}
      >
        {null}
      </StateBoundary>
    )
  }

  const total = state.items.filter(i => i.reporting_scope === 'group').length

  return (
    <div className="space-y-5">
      <header>
        <h1 className="type-h1 text-[var(--text-primary)]">{t('dataEntry.picker.title')}</h1>
        <p className="text-small text-[var(--text-secondary)] mt-1">
          {t('dataEntry.picker.subtitle', { year: 'FY2026' })}
          <span className="text-[var(--text-tertiary)] ml-2">{t('dataEntry.picker.seeded', { count: total, year: 'FY2025' })}</span>
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('dataEntry.picker.search')}
          aria-label={t('dataEntry.picker.search')}
          className="w-full pl-10 pr-3 h-10 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none"
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
                  <span className="type-h3 text-[var(--text-primary)]">{sectionLabel(t, cap.capital)}</span>
                </div>
                <span className="text-caption text-[var(--text-tertiary)] tabular-nums">{t('dataEntry.picker.items', { count })}</span>
              </button>

              {isOpen && (
                <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                  {cap.subsections.map(sub => (
                    <div key={sub.name} className="px-5 py-3">
                      <div className="text-caption font-semibold text-[var(--color-brand-strong)] mb-2">{subsectionLabel(t, sub.name)}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
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
  const { t, i18n } = useTranslation()
  const ModeIcon =
    item.entry_mode_default === 'Calculator' ? Calculator :
    item.entry_mode_default === 'Connector' ? Plug :
    PencilLine
  const RoleBadge = item.default_workflow_role === 'AUTO' ? Bot : null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-[var(--radius-md)] hover:bg-[var(--color-brand-soft)] transition-colors min-w-0"
    >
      <ModeIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--color-brand)] flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-small font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--color-brand-strong)]">
          {itemLabel(item, i18n.language)}
        </div>
        <div className="text-caption text-[var(--text-tertiary)] font-mono">
          {item.gri_code}
          {item.scope_split ? ` · ${item.scope_split}` : ''}
          {item.unit ? ` · ${item.unit}` : ''}
        </div>
      </div>
      <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-secondary)] group-hover:bg-[var(--bg-primary)] text-caption font-semibold text-[var(--text-tertiary)] flex-shrink-0 inline-flex items-center gap-1 whitespace-nowrap">
        {RoleBadge && <RoleBadge className="w-2.5 h-2.5" />}
        {t(`workflowStatus.role.${item.default_workflow_role}`, { defaultValue: item.default_workflow_role })}
      </span>
    </button>
  )
}
