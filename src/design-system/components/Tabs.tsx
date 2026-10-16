import { useId, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { spring } from '../../motion/tokens'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab?: string
  onChange?: (tabId: string) => void
  className?: string
  /** Accessible name for the tab list. */
  'aria-label'?: string
}

/**
 * Tabs — segmented control. The active "paper" pill slides between tabs
 * (shared layoutId, snappy spring); scoped per instance so two Tabs on a
 * page never steal each other's indicator. Arrow keys move between tabs.
 */
export default function Tabs({ tabs, activeTab, onChange, className = '', 'aria-label': ariaLabel }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id)
  const active = activeTab ?? internalActive
  const group = useId()

  const handleChange = (tabId: string) => {
    setInternalActive(tabId)
    onChange?.(tabId)
  }

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = tabs[(index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    if (!next) return
    handleChange(next.id)
    const el = (e.currentTarget.parentElement?.querySelector(`[data-tab-id="${CSS.escape(next.id)}"]`) as HTMLElement | null)
    el?.focus()
  }

  return (
    <LayoutGroup id={group}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={`flex items-center gap-1 p-1 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] ${className}`}
      >
        {tabs.map((tab, i) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              data-tab-id={tab.id}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleChange(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-small font-medium rounded-[var(--radius-sm)] whitespace-nowrap
                transition-colors duration-micro ease-out cursor-pointer
                ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-active"
                  transition={spring.snappy}
                  aria-hidden
                  className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)] ring-1 ring-[var(--border-subtle)]"
                />
              )}
              <span className="relative">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`relative text-caption px-1.5 py-0.5 rounded-[var(--radius-full)] tabular-nums leading-none ${
                    isActive ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' : 'bg-[var(--border-default)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
