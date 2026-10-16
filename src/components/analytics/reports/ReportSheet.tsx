import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { dur, ease, spring } from '../../../motion/tokens'

/**
 * ReportSheet — a focused task dialog for the report screens (centred on
 * desktop, bottom sheet below 640 px). Focus is trapped, Escape closes,
 * focus returns to the opener. Mirrors ConfirmSheet's surface so the two
 * read as one family.
 */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ReportSheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  kicker?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  /** Block closing (e.g. while parsing a file). */
  busy?: boolean
}

export default function ReportSheet({ open, onClose, title, description, kicker, children, footer, busy = false }: ReportSheetProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement as HTMLElement | null
    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input, select, textarea') ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
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

  const close = () => {
    if (!busy) onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
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

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-6" onKeyDown={onKeyDown}>
          <motion.div
            className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast, ease: ease.out }}
            onClick={close}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={reduce ? { duration: dur.fast } : spring.gentle}
            className="relative w-full sm:max-w-[520px] max-h-[92vh] overflow-y-auto bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-overlay)] rounded-t-[var(--radius-2xl)] sm:rounded-[var(--radius-2xl)] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" aria-hidden />
            <button
              type="button"
              onClick={close}
              disabled={busy}
              aria-label={t('perfReport.sheet.close')}
              className="absolute top-3 right-3 w-10 h-10 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
            <div className="px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
              {kicker && <p className="text-caption font-medium text-[var(--text-tertiary)] mb-1">{kicker}</p>}
              <h2 id={titleId} className="type-h2 text-[var(--text-primary)] pr-10">
                {title}
              </h2>
              {description && (
                <div id={descId} className="type-small text-[var(--text-secondary)] mt-2 text-pretty">
                  {description}
                </div>
              )}
              {children && <div className="mt-5">{children}</div>}
            </div>
            {footer && (
              <div className="px-6 py-4 sm:px-7 border-t border-[var(--border-subtle)] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
