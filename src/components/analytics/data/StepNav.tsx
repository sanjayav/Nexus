import { useId, type ReactNode } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { spring } from '../../../motion/tokens'

/**
 * StepNav — numbered steps for an ingestion flow (Upload → Preview → Map →
 * Validate). Completed steps show a check, the current step carries a sliding
 * emerald underline, locked steps are disabled until their prerequisite is
 * met. Extra (non-sequential) destinations go in `trailing`.
 * Scrolls inside itself on phones (never the page).
 */
export interface NavStep {
  id: string
  label: ReactNode
  done?: boolean
  locked?: boolean
  count?: ReactNode
}

export default function StepNav({
  steps,
  active,
  onSelect,
  trailing,
  'aria-label': ariaLabel,
}: {
  steps: NavStep[]
  active: string
  onSelect: (id: string) => void
  trailing?: NavStep[]
  'aria-label'?: string
}) {
  const group = useId()
  const item = (s: NavStep, n: number | null) => {
    const current = s.id === active
    return (
      <li key={s.id} className="flex-shrink-0">
        <button
          type="button"
          disabled={s.locked}
          aria-current={current ? 'step' : undefined}
          onClick={() => onSelect(s.id)}
          className={`relative h-11 inline-flex items-center gap-2 px-3 text-small font-medium whitespace-nowrap rounded-[var(--radius-sm)] transition-colors duration-micro ease-out
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]
            disabled:cursor-not-allowed disabled:text-[var(--text-quaternary)]
            ${current ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          {n != null && (
            <span
              aria-hidden
              className={`w-5 h-5 rounded-full text-caption font-semibold tabular-nums flex items-center justify-center flex-shrink-0 ${
                s.done
                  ? 'bg-[var(--color-brand-strong)] text-[var(--btn-primary-fg)]'
                  : current
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
              }`}
            >
              {s.done ? <Check className="w-3 h-3" strokeWidth={3} /> : n}
            </span>
          )}
          <span>{s.label}</span>
          {s.count != null && (
            <span className="text-caption tabular-nums px-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">{s.count}</span>
          )}
          {current && (
            <motion.span
              layoutId="data-step-active"
              transition={spring.snappy}
              aria-hidden
              className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-[var(--color-brand)]"
            />
          )}
        </button>
      </li>
    )
  }
  return (
    <LayoutGroup id={group}>
      <nav aria-label={ariaLabel} className="border-b border-[var(--border-subtle)] -mx-1 overflow-x-auto [scrollbar-width:none]">
        <ol className="flex items-center gap-1 px-1 min-w-max">
          {steps.flatMap((s, i) => [
            item(s, i + 1),
            i < steps.length - 1 ? <li key={`${s.id}-sep`} aria-hidden className="w-4 h-px bg-[var(--border-default)] flex-shrink-0" /> : null,
          ])}
          {trailing && trailing.length > 0 && (
            <>
              <li aria-hidden className="w-px h-5 bg-[var(--border-default)] mx-2 flex-shrink-0" />
              {trailing.map((s) => item(s, null))}
            </>
          )}
        </ol>
      </nav>
    </LayoutGroup>
  )
}
