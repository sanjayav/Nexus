import { toast } from 'sonner'
import i18n from '../../i18n'

/**
 * notify — toast-first feedback (replaces alert()). Renders in <AppToaster/>.
 *
 *   notify.success(t('tasks.submitted', { name }), { undo: () => revert(id) })
 *   notify.error(t('…saveFailed'), { description: err.message })
 *   notify.promise(save(), { loading: t('…saving'), success: t('…saved'), error: t('…failed') })
 *
 * `undo` adds an "Undo" action and keeps the toast for 5 s. Validation that
 * belongs next to a field should stay inline — toasts are for outcomes.
 */
export interface NotifyOptions {
  description?: string
  /** Adds an Undo action. */
  undo?: () => void
  /** Custom action instead of Undo. */
  action?: { label: string; onClick: () => void }
  duration?: number
  id?: string | number
}

function opts(o: NotifyOptions = {}) {
  const action = o.action ?? (o.undo ? { label: i18n.t('ui.toast.undo'), onClick: o.undo } : undefined)
  return {
    description: o.description,
    action,
    duration: o.duration ?? (action ? 5000 : 4000),
    id: o.id,
  }
}

export const notify = {
  success: (message: string, o?: NotifyOptions) => toast.success(message, opts(o)),
  error: (message: string, o?: NotifyOptions) => toast.error(message, { ...opts(o), duration: o?.duration ?? 7000 }),
  info: (message: string, o?: NotifyOptions) => toast.info(message, opts(o)),
  warning: (message: string, o?: NotifyOptions) => toast.warning(message, opts(o)),
  message: (message: string, o?: NotifyOptions) => toast(message, opts(o)),
  promise: <T,>(p: Promise<T>, m: { loading: string; success: string | ((v: T) => string); error: string | ((e: unknown) => string) }) =>
    toast.promise(p, m),
  dismiss: (id?: string | number) => toast.dismiss(id),
}

export default notify
