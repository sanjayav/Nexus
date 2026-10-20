import { ReactNode, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

export type ToastTone = 'success' | 'info' | 'warning'

type ToastItem = { id: number; text: ReactNode; tone: ToastTone }

const useToastStore = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, 'id'>) => void; dismiss: (id: number) => void }>(set => ({
  items: [],
  push: t => {
    const id = Date.now() + Math.random()
    set(s => ({ items: [...s.items.slice(-2), { ...t, id }] }))
    window.setTimeout(() => set(s => ({ items: s.items.filter(i => i.id !== id) })), 3600)
  },
  dismiss: id => set(s => ({ items: s.items.filter(i => i.id !== id) })),
}))

/** Show a transient status message. Call from anywhere, including outside React. */
export const toast = (text: ReactNode, tone: ToastTone = 'success') => useToastStore.getState().push({ text, tone })

/**
 * Hook form kept for existing pages: `const { show } = useToast()`.
 * `toast` is always null now; the global <Toaster /> in the shell renders messages.
 */
export function useToast() {
  const show = useCallback((text: ReactNode, tone: ToastTone = 'success') => toast(text, tone), [])
  return { toast: null as ReactNode, show }
}

const ICON = { success: CheckCircle2, info: Info, warning: AlertTriangle }
const ICON_CLASS = { success: 'text-emerald-400', info: 'text-sky-300', warning: 'text-amber-300' }

export function Toaster() {
  const items = useToastStore(s => s.items)
  const dismiss = useToastStore(s => s.dismiss)
  return createPortal(
    <div className="fixed inset-x-0 bottom-5 z-[120] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map(t => {
          const Icon = ICON[t.tone]
          return (
            <motion.div
              key={t.id}
              layout
              role="status"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              onClick={() => dismiss(t.id)}
              className="pointer-events-auto max-w-md flex items-start gap-2.5 rounded-xl bg-zinc-900 text-white text-[13px] leading-relaxed px-4 py-3 shadow-pop cursor-default"
            >
              <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0', ICON_CLASS[t.tone])} />
              <span>{t.text}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
