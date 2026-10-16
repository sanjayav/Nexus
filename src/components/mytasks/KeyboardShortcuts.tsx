import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { popVariants, transition } from '../../motion/tokens'

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
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="kbd"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kbd-title"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: transition.fast }}
          exit={{ opacity: 0, transition: transition.fast }}
        >
          <motion.div
            className="surface-raised max-w-md w-full p-5 sm:p-6"
            onClick={e => e.stopPropagation()}
            variants={popVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 id="kbd-title" className="type-h3 text-[var(--text-primary)]">{t('tasks.shortcuts.title')}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="w-9 h-9 -mr-1.5 -mt-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)]"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="divide-y divide-[var(--border-subtle)]">
              {SHORTCUTS.map(s => (
                <li key={s.label} className="flex items-center justify-between gap-3 py-2">
                  <span className="type-small text-[var(--text-secondary)]">{t(s.label)}</span>
                  <span className="flex items-center gap-1">
                    {s.keys.map(k => (
                      <kbd key={k} className="kbd min-w-[28px] text-center">{k}</kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
