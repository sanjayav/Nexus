import { motion } from 'framer-motion'
import { List, LayoutGrid, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { spring } from '../../motion/tokens'
import type { ViewMode } from './shared'

interface ViewToggleProps {
  view: ViewMode
  onChange: (v: ViewMode) => void
}

/** List / Board / Calendar segmented control. The selection pill slides (layoutId). Keys 1–3. */
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
      className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5"
    >
      {opts.map(o => {
        const active = view === o.key
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-keyshortcuts={o.sk}
            onClick={() => onChange(o.key)}
            className={`relative inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-sm)] text-small font-semibold whitespace-nowrap transition-colors duration-micro ${
              active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {active && (
              <motion.span
                layoutId="tasks-view-pill"
                transition={spring.snappy}
                aria-hidden
                className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)] border border-[var(--border-subtle)]"
              />
            )}
            <o.icon className="relative w-3.5 h-3.5" aria-hidden />
            <span className="relative">{o.label}</span>
            <kbd className="relative hidden sm:inline-block ml-0.5 text-micro font-mono px-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] normal-case tracking-normal">
              {o.sk}
            </kbd>
          </button>
        )
      })}
    </div>
  )
}
