import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'

/**
 * Top-level error boundary. Catches any uncaught render error in the React
 * tree and shows a recoverable fallback instead of a white screen. Mount it
 * once around <AppRoutes>.
 *
 * For production, hook `componentDidCatch` to your error tracker (Sentry,
 * Bugsnag, etc.) — the TODO is left in place so the integration is explicit.
 */
interface State {
  error: Error | null
  info: ErrorInfo | null
}

interface Props {
  children: ReactNode
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface during dev so the source line is visible in the console.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
    this.setState({ info })
    // Production hook: send to error-tracking service here.
    // e.g. Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } })
  }

  reset = () => this.setState({ error: null, info: null })

  goHome = () => {
    this.reset()
    window.location.href = '/'
  }

  render() {
    if (!this.state.error) return this.props.children

    const message = this.state.error.message || 'An unexpected error occurred'
    const stack = import.meta.env.DEV ? this.state.error.stack : null

    return (
      <div
        role="alert"
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div
          className="surface-paper max-w-lg w-full p-8"
          style={{ borderColor: 'rgba(220,38,38,0.2)' }}
        >
          <div
            className="w-12 h-12 rounded-[12px] flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-red-light)', color: 'var(--status-reject)' }}
          >
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="font-display text-[22px] font-bold text-[var(--text-primary)] tracking-[-0.01em]">
            Something went wrong
          </h1>
          <p className="text-[13.5px] text-[var(--text-secondary)] mt-2 leading-relaxed">
            The page hit an unexpected error. Your data is safe — try the action again, return home, or refresh.
          </p>

          <div className="mt-4 p-3 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono text-[11.5px] text-[var(--text-secondary)] break-words">
            {message}
          </div>

          {stack && (
            <details className="mt-3">
              <summary className="text-[11px] text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]">
                Stack trace (dev only)
              </summary>
              <pre className="mt-2 p-3 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono text-[10.5px] text-[var(--text-tertiary)] overflow-auto max-h-[200px]">
                {stack}
              </pre>
            </details>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[8px] bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand-strong)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try again
            </button>
            <button
              onClick={this.goHome}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" /> Go home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
