import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'
import { captureError } from '../lib/sentry'
import i18n from '../i18n'
import Illustration from '../design-system/illustrations/Illustration'

/**
 * ErrorBoundary — two placements:
 *
 *   variant="app"   (default) around the whole router: full-screen fallback,
 *                   last line of defence.
 *   variant="route" inside AppShell around the routed page: the sidebar and
 *                   top bar stay, only the page area shows the fallback.
 *                   Pass `resetKey={pathname}` so navigating away recovers.
 *
 * Errors are forwarded to Sentry when VITE_SENTRY_DSN is set.
 */
interface State {
  error: Error | null
  info: ErrorInfo | null
}

interface Props {
  children: ReactNode
  variant?: 'app' | 'route'
  /** When this value changes, a caught error is cleared (e.g. the pathname). */
  resetKey?: unknown
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
    this.setState({ info })
    captureError(error, { componentStack: info.componentStack, boundary: this.props.variant ?? 'app' })
  }

  componentDidUpdate(prev: Props): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset()
  }

  reset = () => this.setState({ error: null, info: null })

  goHome = () => {
    this.reset()
    window.location.href = '/'
  }

  render() {
    if (!this.state.error) return this.props.children

    const t = i18n.t.bind(i18n)
    const message = this.state.error.message || t('components.errorBoundary.unexpected')
    const stack = import.meta.env.DEV ? this.state.error.stack : null

    if (this.props.variant === 'route') {
      return (
        <div role="alert" className="flex flex-col items-center text-center py-16 px-6">
          <div className="mb-4">
            <Illustration name="error" size={136} />
          </div>
          <h1 className="type-h2 text-[var(--text-primary)] max-w-md">{t('ui.routeError.title')}</h1>
          <p className="type-body text-[var(--text-secondary)] mt-1.5 max-w-md">{t('ui.routeError.body')}</p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-5">
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] shadow-[var(--btn-primary-shadow)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t('components.errorBoundary.tryAgain')}
            </button>
            <button
              onClick={this.goHome}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-small font-semibold hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" /> {t('components.errorBoundary.goHome')}
            </button>
          </div>
          <details className="mt-5 max-w-lg w-full text-left">
            <summary className="text-caption text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)] text-center list-none">
              {t('ui.state.details')}
            </summary>
            <div className="mt-2 p-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono text-caption text-[var(--text-secondary)] break-words whitespace-pre-wrap">
              {message}
              {stack && <pre className="mt-2 text-[var(--text-tertiary)] overflow-auto max-h-[200px]">{stack}</pre>}
            </div>
          </details>
        </div>
      )
    }

    return (
      <div role="alert" className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: 'var(--bg-app)' }}>
        <div className="surface-paper max-w-lg w-full p-8">
          <div
            className="w-12 h-12 rounded-[var(--radius-xl)] flex items-center justify-center mb-4"
            style={{ background: 'var(--status-danger-soft)', color: 'var(--status-danger)' }}
          >
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="type-h2 text-[var(--text-primary)]">{t('common.error')}</h1>
          <p className="type-body text-[var(--text-secondary)] mt-2">{t('components.errorBoundary.body')}</p>

          <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono text-caption text-[var(--text-secondary)] break-words">
            {message}
          </div>

          {stack && (
            <details className="mt-3">
              <summary className="text-caption text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]">
                {t('components.errorBoundary.stack')}
              </summary>
              <pre className="mt-2 p-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono text-caption text-[var(--text-tertiary)] overflow-auto max-h-[200px]">
                {stack}
              </pre>
            </details>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] shadow-[var(--btn-primary-shadow)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] active:scale-[0.98] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t('components.errorBoundary.tryAgain')}
            </button>
            <button
              onClick={this.goHome}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-small font-semibold hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" /> {t('components.errorBoundary.goHome')}
            </button>
          </div>
        </div>
      </div>
    )
  }
}
