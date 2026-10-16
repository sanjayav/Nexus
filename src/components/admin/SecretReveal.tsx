import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ShieldAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { iconSwapVariants, popIn } from '../../motion/tokens'
import { notify } from '../ui'

/**
 * CopyButton — copies `value`, swaps the copy glyph for a check for ~2 s.
 * Labels come from the caller's locale area (no strings of its own).
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  failedLabel,
  variant = 'secondary',
  className = '',
}: {
  value: string
  label: string
  copiedLabel: string
  failedLabel: string
  variant?: 'secondary' | 'ghost'
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      notify.error(failedLabel)
    }
  }

  const look =
    variant === 'ghost'
      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-[var(--radius-md)] text-small font-semibold whitespace-nowrap transition-colors duration-micro ease-out ${look} ${className}`}
    >
      <span className="relative inline-flex w-4 h-4 flex-shrink-0" aria-hidden>
        <AnimatePresence initial={false}>
          <motion.span
            key={copied ? 'check' : 'copy'}
            variants={iconSwapVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className={`absolute inset-0 inline-flex items-center justify-center ${copied ? 'text-[var(--status-success)]' : ''}`}
          >
            {copied ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Copy className="w-4 h-4" />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  )
}

/**
 * SecretReveal — the one-time token reveal used by API keys and SCIM tokens.
 * A warning band says plainly that the secret will not be shown again; the
 * token sits in a mono well (click selects it all) with a copy button; the
 * panel is closed deliberately with "I've stored it".
 */
export default function SecretReveal({
  title,
  warning,
  token,
  meta,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  tokenLabel,
  doneLabel,
  onDone,
}: {
  title: string
  warning: string
  token: string
  meta?: ReactNode
  copyLabel: string
  copiedLabel: string
  copyFailedLabel: string
  tokenLabel: string
  doneLabel: string
  onDone: () => void
}) {
  const titleId = useId()
  return (
    <motion.section
      {...popIn()}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.18 } }}
      aria-labelledby={titleId}
      className="surface-paper overflow-hidden"
    >
      <div className="flex items-start gap-3 px-5 py-4 bg-[var(--status-warning-soft)] border-b border-[var(--status-warning-line)]">
        <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--status-warning)]" aria-hidden />
        <div className="min-w-0">
          <h2 id={titleId} className="text-h3 text-[var(--text-primary)]">{title}</h2>
          <p className="text-small text-[var(--text-secondary)] mt-0.5 text-pretty">{warning}</p>
        </div>
      </div>
      <div className="px-5 py-4">
        <span className="block text-caption font-medium text-[var(--text-tertiary)] mb-1.5">{tokenLabel}</span>
        <div className="flex flex-col sm:flex-row gap-2">
          <code
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-default)] font-mono text-small text-[var(--text-primary)] break-all select-all"
            tabIndex={0}
          >
            {token}
          </code>
          <CopyButton value={token} label={copyLabel} copiedLabel={copiedLabel} failedLabel={copyFailedLabel} />
        </div>
        {meta && <div className="mt-3 text-caption text-[var(--text-tertiary)]">{meta}</div>}
      </div>
      <div className="flex justify-end px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
        <button type="button" onClick={onDone} className="btn-secondary">
          {doneLabel}
        </button>
      </div>
    </motion.section>
  )
}
