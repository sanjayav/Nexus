import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertOctagon, AlertTriangle, Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StatusPill, type PillTone } from '../ui'
import Button from '../../design-system/components/Button'
import { popVariants } from '../../motion/tokens'

/** Shared anomaly encodings: one severity scale for the feed, triage and AI panel. */
export type SeverityKey = 'critical' | 'warn' | 'warning' | 'info'

export const SEVERITY_TONE: Record<SeverityKey, PillTone> = {
  critical: 'danger',
  warn: 'warning',
  warning: 'warning',
  info: 'info',
}

export const SEVERITY_ICON = { critical: AlertOctagon, warn: AlertTriangle, warning: AlertTriangle, info: Info } as const

export const SEVERITY_VAR: Record<SeverityKey, string> = {
  critical: 'var(--status-danger)',
  warn: 'var(--status-warning)',
  warning: 'var(--status-warning)',
  info: 'var(--status-info)',
}

export function SeverityPill({ severity, size = 'md' }: { severity: string; size?: 'sm' | 'md' }) {
  const { t } = useTranslation()
  const key = (['critical', 'warn', 'warning', 'info'].includes(severity) ? severity : 'info') as SeverityKey
  const label = t(`anomalyPage.severity.${key === 'warning' ? 'warn' : key}`)
  return <StatusPill tone={SEVERITY_TONE[key]} dot={key === 'critical'} size={size}>{label}</StatusPill>
}

export const ANOMALY_STATUS_TONE: Record<string, PillTone> = {
  open: 'neutral',
  investigating: 'info',
  resolved: 'success',
  dismissed: 'neutral',
}

/**
 * ReasonSheet — capture an audit-logged reason (≥ 10 characters) before a
 * dismiss / suppress. Bottom sheet on mobile, centred dialog on desktop;
 * Esc and the scrim cancel; focus starts in the textarea.
 */
export function ReasonSheet({
  title, subject, body, label, placeholder, confirmLabel, onCancel, onConfirm, minLength = 10, counter,
}: {
  title: string
  subject?: ReactNode
  body: ReactNode
  label: string
  placeholder?: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: (reason: string) => Promise<void>
  minLength?: number
  counter: (n: number) => string
}) {
  const { t } = useTranslation()
  const id = useId()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const n = reason.trim().length
  const short = n < minLength

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  const submit = async () => {
    if (short || busy) return
    setBusy(true); setErr(null)
    try { await onConfirm(reason.trim()) } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setBusy(false) }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(2px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => !busy && onCancel()}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}
        variants={popVariants} initial="hidden" animate="visible" exit="exit"
        className="surface-paper w-full sm:max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <h3 id={`${id}-t`} className="type-h3 text-[var(--text-primary)]">{title}</h3>
            {subject && <p className="text-small text-[var(--text-secondary)] mt-1">{subject}</p>}
          </div>
          <button type="button" onClick={onCancel} aria-label={t('common.cancel')} className="w-10 h-10 -mr-2 -mt-2 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="px-5 pb-5 space-y-3">
          <p className="text-caption text-[var(--text-tertiary)]">{body}</p>
          <div>
            <label htmlFor={`${id}-r`} className="block text-caption font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
            <textarea
              id={`${id}-r`} ref={ref} value={reason} onChange={e => setReason(e.target.value)} rows={4}
              placeholder={placeholder}
              aria-describedby={`${id}-c`}
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] resize-none"
            />
            <div id={`${id}-c`} className={`text-caption mt-1 tabular-nums ${short && n > 0 ? 'text-[var(--status-warning)]' : 'text-[var(--text-tertiary)]'}`}>{counter(n)}</div>
          </div>
          {err && <p role="alert" className="text-caption text-[var(--status-danger)]">{err}</p>}
        </div>
        <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" size="md" onClick={onCancel} disabled={busy}>{t('common.cancel')}</Button>
          <Button variant="danger" size="md" onClick={submit} disabled={short} loading={busy}>{confirmLabel}</Button>
        </footer>
      </motion.div>
    </motion.div>
  )
}
