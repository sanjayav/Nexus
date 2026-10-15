import { useState } from 'react'

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
}

export default function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id)
  const active = activeTab ?? internalActive

  const handleChange = (tabId: string) => {
    setInternalActive(tabId)
    onChange?.(tabId)
  }

  return (
    <div className={`flex items-center gap-1 p-1 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleChange(tab.id)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5
            text-[var(--text-sm)] font-medium rounded-[var(--radius-sm)]
            transition-all duration-[var(--transition-fast)] cursor-pointer
            ${active === tab.id
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`
              text-[var(--text-xs)] px-1.5 py-0.5 rounded-[var(--radius-full)]
              ${active === tab.id
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                : 'bg-[var(--border-default)] text-[var(--text-tertiary)]'
              }
            `}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
