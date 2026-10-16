import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import { dur, ease, spring } from '../../motion/tokens'
import { useIsBelowLg } from '../../lib/breakpoints'

/**
 * ConfirmSheet — accessible confirmation dialog (replaces window.confirm).
 * Centred sheet on desktop, bottom sheet on mobile. Focus is trapped while
 * open and returned to the trigger on close; Esc and the backdrop cancel
 * (unless the action is running).
 *
 * Declarative:
 *   <ConfirmSheet
 *     open={open} onOpenChange={setOpen}
 *     title={t('publish.confirmTitle')}
 *     description={t('publish.confirmBody')}
 *     confirmLabel={t('publish.publish')}
 *     onConfirm={async () => { await publish() }}   // sheet shows a spinner; throws keep it open
 *   >
 *     <ReadinessSummary />                           // optional body
 *   </ConfirmSheet>
 *
 * Imperative (drop-in for `if (!confirm(...)) return`):
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: t('…'), tone: 'destructive', confirmLabel: t('…delete') }))) return
 *
 * Destructive: red action, focus starts on Cancel, optional `requireText`
 * (type the entity name to enable the action).
 */

export interface ConfirmOptions {
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'destructive'
  /** User must type this exact text to enable the confirm button. */
  requireText?: string
  /** Optional leading visual (illustration, SealCheck, icon). */
  icon?: ReactNode
  size?: 'md' | 'lg'
}

export interface ConfirmSheetProps extends ConfirmOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** May return a promise; the sheet stays open (busy) until it settles and closes on success. */
  onConfirm: () => void | Promise<unknown>
  onCancel?: () => void
  children?: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function ConfirmSheet({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  requireText,
  icon,
  size = 'md',
  children,
}: ConfirmSheetProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const isMobile = useIsBelowLg()
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const destructive = tone === 'destructive'
  const canConfirm = !busy && (!requireText || typed.trim() === requireText)

  // Reset transient state each time the sheet opens.
  useEffect(() => {
    if (!open) return
    setTyped('')
    setFailure(null)
    setBusy(false)
    returnFocus.current = document.activeElement as HTMLElement | null
    const raf = requestAnimationFrame(() => {
      const target = requireText ? inputRef.current : destructive ? cancelRef.current : confirmRef.current
      target?.focus()
    })
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prevOverflow
      returnFocus.current?.focus?.()
    }
  }, [open, requireText, destructive])

  const cancel = useCallback(() => {
    if (busy) return
    onCancel?.()
    onOpenChange(false)
  }, [busy, onCancel, onOpenChange])

  const confirm = useCallback(async () => {
    if (!canConfirm) return
    try {
      const r = onConfirm()
      if (r && typeof (r as Promise<unknown>).then === 'function') {
        setBusy(true)
        await r
      }
      setBusy(false)
      onOpenChange(false)
    } catch (e) {
      setBusy(false)
      setFailure(e instanceof Error ? e.message : String(e ?? ''))
    }
  }, [canConfirm, onConfirm, onOpenChange])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      cancel()
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

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : isMobile
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
      : { initial: { opacity: 0, scale: 0.97, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.98, y: 4 } }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end lg:items-center justify-center lg:p-6" onKeyDown={onKeyDown}>
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(4, 12, 10, 0.48)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast, ease: ease.out }}
            onClick={cancel}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role={destructive ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            {...panelMotion}
            transition={isMobile ? spring.gentle : { duration: dur.base, ease: ease.out }}
            className={`relative w-full ${size === 'lg' ? 'lg:max-w-[640px]' : 'lg:max-w-[480px]'} max-h-[92vh] overflow-y-auto
              bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-overlay)]
              rounded-t-[var(--radius-2xl)] lg:rounded-[var(--radius-2xl)] pb-[env(safe-area-inset-bottom)]`}
          >
            {isMobile && <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[var(--border-strong)]" aria-hidden />}
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              aria-label={t('ui.confirm.close')}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
              {icon && <div className="mb-4">{icon}</div>}
              <h2 id={titleId} className="type-h2 text-[var(--text-primary)] pr-8">
                {title}
              </h2>
              {description && (
                <div id={descId} className="type-body text-[var(--text-secondary)] mt-2 text-pretty">
                  {description}
                </div>
              )}
              {children && <div className="mt-5">{children}</div>}
              {requireText && (
                <label className="block mt-5">
                  <span className="text-small text-[var(--text-secondary)]">
                    {t('ui.confirm.typeToConfirm', { text: requireText })}
                  </span>
                  <input
                    ref={inputRef}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void confirm() }}
                    className="mt-1.5 w-full h-10 px-3 rounded-[var(--radius-md)] bg-[var(--bg-primary)] border border-[var(--border-default)] text-body text-[var(--text-primary)] font-mono focus:border-[var(--border-focus)] outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              )}
              {failure !== null && (
                <p role="alert" className="mt-4 text-small text-[var(--status-danger)]">
                  {failure || t('ui.confirm.failed')}
                </p>
              )}
            </div>
            <div className="px-6 pb-6 sm:px-7 flex flex-col-reverse gap-2 lg:flex-row lg:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={cancel}
                disabled={busy}
                className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {cancelLabel ?? t('ui.confirm.cancel')}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => void confirm()}
                disabled={!canConfirm}
                aria-busy={busy || undefined}
                className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-md)] text-small font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                  destructive
                    ? 'bg-[var(--btn-danger-bg)] text-[var(--btn-danger-fg)] hover:bg-[var(--btn-danger-bg-hover)]'
                    : 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] shadow-[var(--btn-primary-shadow)]'
                }`}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                {busy ? t('ui.confirm.working') : confirmLabel ?? t('ui.confirm.confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ── Imperative confirm (one host, mounted by <AppToaster />) ─────────── */

type Pending = ConfirmOptions & { id: number; resolve: (ok: boolean) => void }
let pending: Pending | null = null
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Promise-based confirm. Resolves true on confirm, false on cancel/close. */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    pending?.resolve(false)
    pending = { ...opts, id: ++seq, resolve }
    emit()
  })
}

export function useConfirm() {
  return confirmAction
}

export function ConfirmHost() {
  const current = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => pending,
    () => null,
  )
  // Keep the last request on screen while the exit animation plays.
  const [shown, setShown] = useState<Pending | null>(null)
  const [open, setOpen] = useState(false)
  const settled = useRef<number | null>(null)
  useEffect(() => {
    if (!current) return
    setShown(current)
    setOpen(true)
  }, [current])

  const settle = (ok: boolean) => {
    if (!shown || settled.current === shown.id) return
    settled.current = shown.id
    shown.resolve(ok)
    if (pending?.id === shown.id) pending = null
    setOpen(false)
    window.setTimeout(() => {
      setShown((s) => (s?.id === shown.id ? null : s))
      emit()
    }, 260)
  }

  if (!shown) return null
  const { resolve: _resolve, id: _id, ...opts } = shown
  void _resolve
  void _id
  return (
    <ConfirmSheet
      {...opts}
      open={open}
      onOpenChange={(o) => { if (!o) settle(false) }}
      onConfirm={() => settle(true)}
    />
  )
}
