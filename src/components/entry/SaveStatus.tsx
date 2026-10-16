import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, Loader2, Circle } from 'lucide-react'
import { crossfadeVariants } from '../../motion/tokens'
import { relativeTime } from './labels'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

/**
 * Autosave indicator — "Saved · 2s ago". The state swap is a quiet 120 ms
 * crossfade; the relative time refreshes in place every 5 s (no ticker).
 * Announced politely to screen readers.
 */
export default function SaveStatus({
  state, savedAt, error, onRetry, className = '',
}: {
  state: SaveState
  savedAt?: number | null
  error?: string | null
  onRetry?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (state !== 'saved' && state !== 'idle') return
    const id = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(id)
  }, [state])

  let icon = null
  let label = ''
  let tone = 'text-[var(--text-tertiary)]'
  if (state === 'saving') {
    icon = <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
    label = t('entry.save.saving')
  } else if (state === 'dirty') {
    icon = <Circle className="w-2 h-2 fill-current" aria-hidden />
    label = t('entry.save.unsaved')
    tone = 'text-[var(--status-warning)]'
  } else if (state === 'error') {
    icon = <AlertCircle className="w-3.5 h-3.5" aria-hidden />
    label = t('entry.save.failed')
    tone = 'text-[var(--status-danger)]'
  } else if (savedAt) {
    icon = <Check className="w-3.5 h-3.5" aria-hidden />
    label = t('entry.save.savedAgo', { time: relativeTime(t, savedAt, now) })
    tone = state === 'saved' ? 'text-[var(--status-success)]' : 'text-[var(--text-tertiary)]'
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={`relative inline-flex items-center min-h-[20px] text-caption font-medium whitespace-nowrap ${className}`}
      title={state === 'error' && error ? error : undefined}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {label && (
          <motion.span
            key={state === 'idle' ? 'saved' : state}
            variants={crossfadeVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className={`inline-flex items-center gap-1.5 ${tone}`}
          >
            {icon}
            <span>{label}</span>
            {state === 'error' && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="ml-1 underline underline-offset-2 hover:no-underline text-[var(--status-danger)]"
              >
                {t('entry.save.retry')}
              </button>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
