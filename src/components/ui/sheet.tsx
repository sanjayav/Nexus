import { ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { useStrings } from '@/lib/i18n'
import { ease, softSpring } from './motion'
import { uiStrings } from './ui.strings'

function useDismiss(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement>) {
  // Latest onClose without re-running the effect: callers pass inline functions,
  // and re-running on every render would steal focus mid-typing.
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Move focus into the panel so keyboard and screen-reader users land in it.
    const frame = requestAnimationFrame(() =>
      panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, button')?.focus(),
    )
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [open, panel])
}

const Backdrop = ({ onClick }: { onClick: () => void }) => (
  <motion.div
    className="fixed inset-0 bg-zinc-950/30 backdrop-blur-[2px]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    onClick={onClick}
  />
)

/** Right-hand panel for detail views and multi-step side flows. Bottom sheet on phones. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-[560px]',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const ui = useStrings(uiStrings)
  const titleId = useId()
  const descId = useId()
  useDismiss(open, onClose, panel)
  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[90]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
        >
          <Backdrop onClick={onClose} />
          <motion.div
            ref={panel}
            className={clsx(
              'absolute bg-white shadow-pop flex flex-col',
              'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl',
              'sm:inset-y-2 sm:right-2 sm:left-auto sm:bottom-2 sm:max-h-none sm:w-full sm:rounded-2xl',
              width,
            )}
            initial={{ x: 0, y: '100%' }}
            animate={{ x: 0, y: 0 }}
            exit={{ y: '100%' }}
            transition={softSpring}
            style={{ willChange: 'transform' }}
          >
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-line">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[17px] font-semibold text-zinc-900 tracking-[-0.01em]">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-[13px] text-zinc-500 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 -mr-1.5 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label={ui.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
            {footer && (
              <div className="px-5 sm:px-6 py-4 border-t border-line bg-zinc-50/60 sm:rounded-b-2xl flex items-center justify-end gap-2">
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

/** Centred modal for confirmations and focused tasks. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  width?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  useDismiss(open, onClose, panel)
  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
        >
          <Backdrop onClick={onClose} />
          <motion.div
            ref={panel}
            className={clsx('relative w-full bg-white rounded-t-2xl sm:rounded-2xl shadow-pop overflow-hidden', width)}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.2, ease: ease.out }}
          >
            <div className="px-5 sm:px-6 pt-5">
              <h2 id={titleId} className="text-[17px] font-semibold text-zinc-900 tracking-[-0.01em]">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-[13px] text-zinc-500 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {children && <div className="px-5 sm:px-6 py-4">{children}</div>}
            {footer && (
              <div className="px-5 sm:px-6 py-4 border-t border-line bg-zinc-50/60 flex items-center justify-end gap-2">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
