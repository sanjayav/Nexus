import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { dur, ease, spring } from '../../motion/tokens'
import { useIsBelowLg } from '../../lib/breakpoints'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * SideSheet — a form panel. Right-hand drawer on desktop, bottom sheet on
 * mobile. Focus moves to the first field, is trapped while open and returns
 * to the trigger on close; Esc and the scrim close it (unless `busy`).
 */
export default function SideSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  busy = false,
  width = 480,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  busy?: boolean
  width?: number
}) {
  const { t } = useTranslation()
  const mobile = useIsBelowLg()
  const reduce = useReducedMotion()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement as HTMLElement | null
    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      first?.focus()
    })
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prev
      returnFocus.current?.focus?.()
    }
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      if (!busy) onClose()
      return
    }
    if (e.key !== 'Tab') return
    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (!nodes.length) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const panelMotion = mobile
    ? { initial: { y: reduce ? 0 : '100%' }, animate: { y: 0 }, exit: { y: reduce ? 0 : '100%' } }
    : { initial: { x: reduce ? 0 : 40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: reduce ? 0 : 40, opacity: 0 } }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{ background: 'var(--bg-overlay)', backdropFilter: "blur(2px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast, ease: ease.out }}
            onClick={() => !busy && onClose()}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            {...panelMotion}
            transition={spring.gentle}
            style={mobile ? undefined : { width }}
            className={`absolute flex flex-col bg-[var(--bg-primary)] shadow-[var(--shadow-overlay)]
              ${mobile ? 'inset-x-0 bottom-0 max-h-[92vh] rounded-t-[var(--radius-2xl)]' : 'inset-y-0 right-0 max-w-[100vw] border-l border-[var(--border-default)]'}`}
          >
            {mobile && <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--border-strong)]" />}
            <header className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="type-h3 text-[var(--text-primary)]">{title}</h2>
                {description && <p className="mt-0.5 text-small text-[var(--text-secondary)]">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label={t('common.close')}
                className="-mr-2 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <footer className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] px-5 py-3 sm:flex-row sm:justify-end">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
