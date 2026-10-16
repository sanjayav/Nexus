import { List, LayoutGrid, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ViewMode } from './shared'

interface ViewToggleProps {
  view: ViewMode
  onChange: (v: ViewMode) => void
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const { t } = useTranslation()
  const opts: { key: ViewMode; label: string; icon: typeof List; sk: string }[] = [
    { key: 'list',     label: t('tasks.view.list'),     icon: List,       sk: '1' },
    { key: 'board',    label: t('tasks.view.board'),    icon: LayoutGrid, sk: '2' },
    { key: 'calendar', label: t('tasks.view.calendar'), icon: Calendar,   sk: '3' },
  ]

  return (
    <div
      role="tablist"
      aria-label={t('tasks.view.switchAria')}
      className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-card-premium)] p-0.5"
    >
      {opts.map(o => {
        const active = view === o.key
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            aria-keyshortcuts={o.sk}
            onClick={() => onChange(o.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-semibold transition-all ${
              active
                ? 'bg-[var(--color-brand)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <o.icon className="w-3.5 h-3.5" />
            <span>{o.label}</span>
            <kbd className={`hidden sm:inline-block ml-1 text-[9px] font-mono px-1 rounded ${
              active ? 'bg-white/20 text-white/90' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
            }`}>{o.sk}</kbd>
          </button>
        )
      })}
    </div>
  )
}
