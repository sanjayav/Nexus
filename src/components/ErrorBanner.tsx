import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  title: string
  message?: string
  onRetry?: () => void
}

/**
 * Page-level error banner. Use when a primary fetch fails and the page can't
 * meaningfully render without the data — shows what went wrong and offers a
 * retry. Distinct from sonner toasts (transient, global) and inline empty
 * states (no data vs. failed to load).
 */
export function ErrorBanner({ title, message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="card-premium border-red-400/30 bg-red-400/5 p-4 mb-6 flex items-start gap-3"
    >
      <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-red-300">{title}</div>
        {message && <div className="text-xs text-red-300/70 mt-1 break-words">{message}</div>}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary text-xs h-8 px-3 inline-flex items-center gap-1.5 flex-shrink-0"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  )
}

export default ErrorBanner
