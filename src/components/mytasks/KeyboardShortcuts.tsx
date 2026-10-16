import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface KeyboardShortcutsProps {
  open: boolean
  onClose: () => void
}

/** `label` is an i18n key. */
const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['J'],         label: 'tasks.shortcuts.next' },
  { keys: ['K'],         label: 'tasks.shortcuts.prev' },
  { keys: ['Enter'],     label: 'tasks.shortcuts.open' },
  { keys: ['1'],         label: 'tasks.shortcuts.list' },
  { keys: ['2'],         label: 'tasks.shortcuts.board' },
  { keys: ['3'],         label: 'tasks.shortcuts.calendar' },
  { keys: ['?'],         label: 'tasks.shortcuts.overlay' },
  { keys: ['Esc'],       label: 'tasks.shortcuts.close' },
]

export default function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-title"
      onClick={onClose}
    >
      <div
        className="card-premium max-w-md w-full p-5 sm:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="kbd-title" className="h-section text-[var(--text-primary)]">{t('tasks.shortcuts.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)]"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map(s => (
            <li key={s.label} className="flex items-center justify-between gap-3 py-1">
              <span className="text-[var(--text-sm)] text-[var(--text-secondary)]">{t(s.label)}</span>
              <span className="flex items-center gap-1">
                {s.keys.map(k => (
                  <kbd
                    key={k}
                    className="font-mono text-[10px] font-semibold px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] min-w-[24px] text-center"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
