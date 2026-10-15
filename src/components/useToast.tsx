import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

type ToastTone = 'success' | 'info' | 'warning'

const ICON = { success: CheckCircle2, info: Info, warning: AlertTriangle }
const ICON_CLASS = { success: 'text-emerald-400', info: 'text-sky-300', warning: 'text-amber-300' }

/**
 * Lightweight action feedback for demo pages: `show('Saved')` renders a
 * transient status pill at the bottom of the viewport.
 */
export function useToast() {
  const [msg, setMsg] = useState<{ text: ReactNode; tone: ToastTone; id: number } | null>(null)
  const timer = useRef<number>()

  const show = useCallback((text: ReactNode, tone: ToastTone = 'success') => {
    setMsg({ text, tone, id: Date.now() })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 3600)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const Icon = msg ? ICON[msg.tone] : null
  const toast =
    msg && Icon
      ? createPortal(
          <div className="fixed inset-x-0 bottom-5 z-[120] flex justify-center px-4 pointer-events-none">
            <div
              key={msg.id}
              role="status"
              aria-live="polite"
              className="pointer-events-auto max-w-md flex items-start gap-2.5 rounded-xl bg-zinc-900 text-white text-[13px] leading-relaxed px-4 py-3 shadow-pop animate-fade-up"
            >
              <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0', ICON_CLASS[msg.tone])} />
              <span>{msg.text}</span>
            </div>
          </div>,
          document.body,
        )
      : null

  return { toast, show }
}
