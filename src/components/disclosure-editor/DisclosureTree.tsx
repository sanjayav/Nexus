import { useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Search, Circle, CheckCircle2, CircleDot, List, X } from 'lucide-react'
import { spring, transition } from '../../motion/tokens'
import { sectionLabel, subsectionLabel } from '../entry/labels'

/**
 * Left-rail navigation tree for the disclosure editor.
 *
 * Sections group subsections. Each subsection row shows a status glyph, the
 * disclosure code, its translated name, an "M/N" count and a thin progress
 * bar. The active row carries a sliding indicator (shared layout).
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
  /** Reading mode: hide the rail and offer a "Contents" drawer instead. */
  readingMode?: boolean
  /** `desktop` (sticky rail ≥ lg) or `inline` (inside the mobile shell). */
  variant?: 'desktop' | 'inline'
}

function StatusGlyph({ completed, total }: { completed: number; total: number }) {
  if (total > 0 && completed >= total) return <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)] flex-shrink-0" aria-hidden />
  if (completed > 0) return <CircleDot className="w-3.5 h-3.5 text-[var(--status-info)] flex-shrink-0" aria-hidden />
  return <Circle className="w-3.5 h-3.5 text-[var(--text-quaternary)] flex-shrink-0" aria-hidden />
}

export default function DisclosureTree({
  subsections, activeSubsectionId, onSelect, readingMode = false, variant = 'desktop',
}: DisclosureTreeProps) {
  const { t } = useTranslation()
  const layoutGroup = useId()
  const [query, setQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? subsections.filter(s =>
          s.label.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.section.toLowerCase().includes(q) ||
          subsectionLabel(t, s.label).toLowerCase().includes(q) ||
          sectionLabel(t, s.section).toLowerCase().includes(q),
        )
      : subsections
    const map = new Map<string, DisclosureTreeSubsection[]>()
    for (const s of filtered) {
      if (!map.has(s.section)) map.set(s.section, [])
      map.get(s.section)!.push(s)
    }
    return Array.from(map.entries()).map(([section, items]) => ({
      section,
      items,
      done: items.reduce((a, s) => a + s.completed, 0),
      total: items.reduce((a, s) => a + s.total, 0),
    }))
  }, [subsections, query, t])

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const body = (closeDrawer?: () => void) => (
    <>
      <div className="p-3 border-b border-[var(--border-subtle)]">
        <label className="relative block">
          <span className="sr-only">{t('disclosureEditor.tree.search')}</span>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('disclosureEditor.tree.search')}
            className="w-full h-9 pl-8 pr-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none"
          />
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto py-2" aria-label={t('disclosureEditor.tree.aria')}>
        {filteredGroups.length === 0 && (
          <p className="px-4 py-6 text-caption text-[var(--text-tertiary)]">{t('disclosureEditor.tree.noMatch', { query })}</p>
        )}
        {filteredGroups.map(group => {
          const collapsed = !query && collapsedSections.has(group.section)
          return (
            <div key={group.section} className="mb-1.5">
              <button
                type="button"
                onClick={() => toggleSection(group.section)}
                className="w-full flex items-center justify-between gap-2 px-3 h-9 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                aria-expanded={!collapsed}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <motion.span animate={{ rotate: collapsed ? -90 : 0 }} transition={transition.fast} className="flex-shrink-0 text-[var(--text-tertiary)]">
                    <ChevronDown className="w-3.5 h-3.5" aria-hidden />
                  </motion.span>
                  <span className="text-caption font-semibold text-[var(--text-primary)] truncate">{sectionLabel(t, group.section)}</span>
                </span>
                <span className="text-caption text-[var(--text-tertiary)] tabular-nums flex-shrink-0">{group.done}/{group.total}</span>
              </button>

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={transition.base}
                    className="overflow-hidden"
                  >
                    {group.items.map(item => {
                      const isActive = item.id === activeSubsectionId
                      const pct = item.total > 0 ? (item.completed / item.total) * 100 : 0
                      const name = subsectionLabel(t, item.label).replace(new RegExp(`^${item.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:·-]?\\s*`, 'i'), '')
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => { onSelect(item.id); closeDrawer?.() }}
                            className={`relative w-full pl-4 pr-3 py-1.5 text-left transition-colors outline-none focus-visible:bg-[var(--bg-secondary)] ${
                              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                            data-testid={`tree-item-${item.id}`}
                            aria-current={isActive ? 'true' : undefined}
                          >
                            {isActive && (
                              <motion.span
                                layoutId={`${layoutGroup}-active`}
                                transition={spring.snappy}
                                aria-hidden
                                className="absolute inset-y-0.5 left-1.5 right-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)]"
                              />
                            )}
                            {isActive && (
                              <motion.span layoutId={`${layoutGroup}-bar`} transition={spring.snappy} aria-hidden className="absolute left-1.5 top-2 bottom-2 w-[3px] rounded-full bg-[var(--color-brand)]" />
                            )}
                            <span className="relative flex items-center gap-2 min-w-0">
                              <StatusGlyph completed={item.completed} total={item.total} />
                              <span className="font-mono text-caption font-semibold text-[var(--text-tertiary)] flex-shrink-0">{item.code}</span>
                              <span className="text-caption truncate flex-1" title={name}>{name}</span>
                              <span className="text-caption tabular-nums text-[var(--text-tertiary)] flex-shrink-0">{item.completed}/{item.total}</span>
                            </span>
                            <span className="relative mt-1 ml-[22px] block h-[3px] rounded-full bg-[var(--bg-tertiary)] overflow-hidden" aria-hidden>
                              <motion.span
                                className={`block h-full rounded-full ${pct >= 100 ? 'bg-[var(--status-success)]' : 'bg-[var(--color-brand)]'}`}
                                initial={false}
                                animate={{ width: `${pct}%` }}
                                transition={spring.gentle}
                              />
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>
    </>
  )

  if (readingMode) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDrawerOpen(o => !o)}
          aria-label={t('disclosureEditor.tree.openContents')}
          aria-expanded={drawerOpen}
          className="no-print fixed left-4 top-[88px] z-30 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-raised)] text-small font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <List className="w-3.5 h-3.5" aria-hidden /> {t('disclosureEditor.tree.contents')}
        </button>
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                key="scrim"
                role="presentation"
                onClick={() => setDrawerOpen(false)}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition.fast}
                className="no-print fixed inset-0 z-30 bg-black/20"
              />
              <motion.aside
                key="drawer"
                initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={spring.gentle}
                className="no-print fixed left-0 top-[68px] z-40 w-[288px] bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] shadow-[var(--shadow-overlay)] flex flex-col"
                style={{ height: 'calc(100vh - 68px)' }}
                aria-label={t('disclosureEditor.tree.contents')}
              >
                <div className="flex items-center justify-between px-3 h-11 border-b border-[var(--border-subtle)]">
                  <span className="text-small font-semibold text-[var(--text-primary)]">{t('disclosureEditor.tree.contents')}</span>
                  <button onClick={() => setDrawerOpen(false)} aria-label={t('common.close')} className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
                {body(() => setDrawerOpen(false))}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  if (variant === 'inline') {
    return <aside className="flex flex-col w-full h-full bg-[var(--bg-primary)]" aria-label={t('disclosureEditor.tree.aria')}>{body()}</aside>
  }

  return (
    <aside
      className="hidden lg:flex flex-col w-[264px] flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 self-stretch min-h-0"
      aria-label={t('disclosureEditor.tree.aria')}
    >
      {body()}
    </aside>
  )
}
