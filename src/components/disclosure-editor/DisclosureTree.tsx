import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search, Circle, CheckCircle2, CircleDot, List, X } from 'lucide-react'

/**
 * Left-rail navigation tree for the disclosure editor.
 *
 * Subsections render with a status icon (empty / partial / complete), the
 * disclosure code, and an "M/N cells" counter. Expand/collapse per subsection
 * group, search filter at the top, accent-green left-border on the active
 * subsection.
 */
export interface DisclosureTreeSubsection {
  /** Stable id — typically `${section}::${subsection}`. */
  id: string
  /** Section label (e.g. "Climate Change", "Universal"). */
  section: string
  /** Subsection / disclosure code label (e.g. "E1-6 Gross GHG Emissions"). */
  label: string
  /** Short code shown in the row (e.g. "E1-6"). */
  code: string
  /** Total cells in this subsection. */
  total: number
  /** Cells with an approved or submitted value. */
  completed: number
}

export interface DisclosureTreeProps {
  subsections: DisclosureTreeSubsection[]
  activeSubsectionId: string | null
  onSelect: (id: string) => void
  /**
   * Reading-mode behaviour: hide the persistent rail and surface a
   * "Contents" toggle that opens a collapsible drawer overlay instead.
   */
  readingMode?: boolean
}

function statusIcon(completed: number, total: number) {
  if (total === 0) return <Circle className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
  if (completed >= total) return <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-ok)]" />
  if (completed > 0) return <CircleDot className="w-3.5 h-3.5 text-[var(--status-pending)]" />
  return <Circle className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
}

export default function DisclosureTree({
  subsections,
  activeSubsectionId,
  onSelect,
  readingMode = false,
}: DisclosureTreeProps) {
  const [query, setQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? subsections.filter(s =>
          s.label.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.section.toLowerCase().includes(q),
        )
      : subsections
    const map = new Map<string, DisclosureTreeSubsection[]>()
    for (const s of filtered) {
      if (!map.has(s.section)) map.set(s.section, [])
      map.get(s.section)!.push(s)
    }
    return Array.from(map.entries()).map(([section, items]) => ({ section, items }))
  }, [subsections, query])

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  // Shared tree body — used by the persistent rail and the reading-mode drawer.
  const body = (closeDrawer?: () => void) => (
    <>
      <div className="p-3 border-b border-[var(--border-subtle)]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search disclosures…"
            className="w-full pl-7 pr-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-xs)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {filteredGroups.length === 0 && (
          <div className="px-4 py-6 text-[10px] text-[var(--text-tertiary)] italic">
            No disclosures match “{query}”.
          </div>
        )}
        {filteredGroups.map(group => {
          const collapsed = !query && collapsedSections.has(group.section)
          return (
            <div key={group.section} className="mb-1">
              <button
                type="button"
                onClick={() => toggleSection(group.section)}
                className="w-full flex items-center justify-between gap-1 px-3 py-1.5 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                aria-expanded={!collapsed}
              >
                <div className="flex items-center gap-1 min-w-0">
                  {collapsed ? <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />}
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-brand)] truncate">
                    {group.section}
                  </span>
                </div>
                <span className="text-[9px] text-[var(--text-tertiary)] tabular-nums">{group.items.length}</span>
              </button>

              {!collapsed && (
                <ul>
                  {group.items.map(item => {
                    const isActive = item.id === activeSubsectionId
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => { onSelect(item.id); closeDrawer?.() }}
                          className={`relative w-full flex items-center gap-2 pl-4 pr-2 py-1.5 text-left transition-colors ${
                            isActive
                              ? 'bg-[var(--color-brand-soft)] text-[var(--text-primary)]'
                              : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                          }`}
                          data-testid={`tree-item-${item.id}`}
                          aria-current={isActive ? 'true' : undefined}
                        >
                          {isActive && (
                            <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-brand)]" />
                          )}
                          {statusIcon(item.completed, item.total)}
                          <span className="font-mono text-[10px] font-semibold text-[var(--text-tertiary)] flex-shrink-0">
                            {item.code}
                          </span>
                          <span className="text-[11px] truncate flex-1">{item.label.replace(new RegExp(`^${item.code}\\s*[:·-]?\\s*`, 'i'), '')}</span>
                          <span className="text-[9px] tabular-nums text-[var(--text-tertiary)] flex-shrink-0">
                            {item.completed}/{item.total}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </>
  )

  // Reading mode — collapse the rail into a floating "Contents" button that
  // toggles an overlay drawer with the same nav.
  if (readingMode) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDrawerOpen(o => !o)}
          aria-label="Open contents drawer"
          className="no-print fixed left-4 top-[88px] z-30 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-sm text-[12.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <List className="w-3.5 h-3.5" /> Contents
        </button>
        {drawerOpen && (
          <>
            <div
              role="presentation"
              onClick={() => setDrawerOpen(false)}
              className="no-print fixed inset-0 z-30 bg-black/20"
            />
            <aside
              className="no-print fixed left-0 top-[68px] z-40 w-[280px] bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] shadow-lg flex flex-col"
              style={{ height: 'calc(100vh - 68px)' }}
              aria-label="Contents"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Contents</span>
                <button onClick={() => setDrawerOpen(false)} aria-label="Close" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {body(() => setDrawerOpen(false))}
            </aside>
          </>
        )}
      </>
    )
  }

  return (
    <aside
      className="hidden lg:flex flex-col w-[240px] flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-primary)]/60 sticky top-[68px] self-start"
      style={{ height: 'calc(100vh - 68px)' }}
      aria-label="Disclosure tree"
    >
      {body()}
    </aside>
  )
}
