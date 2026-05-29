import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

/**
 * Friendly empty-state placeholder. Drop into any list view when the
 * underlying data is empty (not loading, not errored — just no items
 * yet). Shows an icon, a short title, an optional helper sentence and an
 * optional CTA button or link.
 *
 *   <EmptyState
 *     icon={Inbox}
 *     title="No assignments yet"
 *     body="Click 'Bulk assign' to distribute disclosures to your team."
 *     cta={{ label: 'Bulk assign', onClick: () => setOpen(true) }}
 *   />
 *
 * Keeps the Glass UI / dark aesthetic by leaning entirely on CSS
 * variables — no inline colour values.
 */
export interface EmptyStateCta {
  label: string
  onClick?: () => void
  href?: string
  /** Disables the CTA visually (e.g. while loading). */
  disabled?: boolean
}

export interface EmptyStateProps {
  /** Lucide icon to render in the medallion. Defaults to Inbox. */
  icon?: LucideIcon
  /** Headline — one short line, e.g. "No assignments yet". */
  title: string
  /** Optional helper sentence under the title. */
  body?: string
  /** Optional primary CTA button. */
  cta?: EmptyStateCta
  /** Optional secondary CTA, rendered as a subdued link next to the primary. */
  secondaryCta?: EmptyStateCta
  /** Visual density. `compact` shrinks vertical padding for in-card use. */
  density?: 'comfortable' | 'compact'
  /** Extra class names appended to the wrapper. */
  className?: string
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  cta,
  secondaryCta,
  density = 'comfortable',
  className = '',
}: EmptyStateProps) {
  const pad = density === 'compact' ? 'py-8 px-4' : 'py-14 px-6'
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center text-center ${pad} ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-soft)] flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-[var(--color-brand)]" strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">{title}</h3>
      {body && (
        <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1 max-w-md leading-relaxed">
          {body}
        </p>
      )}
      {(cta || secondaryCta) && (
        <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
          {cta && <EmptyCtaBtn {...cta} variant="primary" />}
          {secondaryCta && <EmptyCtaBtn {...secondaryCta} variant="ghost" />}
        </div>
      )}
    </div>
  )
}

function EmptyCtaBtn({
  label, onClick, href, disabled, variant,
}: EmptyStateCta & { variant: 'primary' | 'ghost' }) {
  const base =
    variant === 'primary'
      ? 'px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-50 transition-colors'
      : 'px-3 py-2 text-[var(--text-sm)] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors'
  if (href && !disabled) {
    return (
      <a href={href} className={base}>
        {label}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={base}>
      {label}
    </button>
  )
}
