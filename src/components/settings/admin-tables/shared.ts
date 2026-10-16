import { useEffect, useRef } from 'react'
import type { Variants } from 'framer-motion'
import { dur, ease } from '../../../motion/tokens'

/**
 * Shared bits for the admin tables (users, reporting cycles, connectors).
 */

/**
 * Table-row enter/exit. `listItemMotion` animates height, which a <tr> can't
 * collapse below its content, so rows fade + nudge instead. Use on a
 * `motion.tr` with `layout` inside <AnimatePresence initial={false}>.
 */
export const rowVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  enter: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
  exit: { opacity: 0, x: 24, transition: { duration: dur.fast, ease: ease.out } },
}

export const rowMotion = {
  variants: rowVariants,
  initial: 'initial',
  animate: 'enter',
  exit: 'exit',
  layout: 'position' as const,
}

/** Hover/focus-revealed row actions; always visible on touch. */
export const revealOnRowHover =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150'

/** Sticky table header cell (inside a scroll container). */
export const stickyTh = 'sticky top-0 z-[1]'

/** Text input / select / textarea look shared by admin forms. */
export const inputClass =
  'w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--color-brand)]/15 disabled:opacity-50 disabled:cursor-not-allowed'

/** Field label (sentence case, no tracking — CJK-safe). */
export const labelClass = 'block text-small font-medium text-[var(--text-secondary)] mb-1.5'

/**
 * Dialog basics for hand-rolled modals and drawers: Escape closes, focus
 * moves to the first field (or `initialFocus`) on open and returns to the
 * trigger on close.
 */
export function useDialogA11y(open: boolean, onClose: () => void, initialFocusSelector = 'input, select, textarea, button') {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const returnTo = document.activeElement as HTMLElement | null
    const raf = requestAnimationFrame(() => {
      const el = ref.current?.querySelector<HTMLElement>(initialFocusSelector)
      el?.focus()
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      returnTo?.focus?.()
    }
  }, [open, initialFocusSelector])
  return ref
}
