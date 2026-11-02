import { Component, type ReactNode } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { useStrings } from '@/lib/i18n'
import { Button, Card } from '@/components/ui'
import { shellStrings } from '@/components/layout/shell.strings'

/**
 * Catches render errors and failed route-chunk downloads (common on slow
 * cross-border links) so one broken page never blanks the whole app.
 * Reset by `resetKey` (the pathname) when the person navigates away.
 */
export class RouteErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    return this.state.error ? <PageError /> : this.props.children
  }
}

function PageError() {
  const s = useStrings(shellStrings).pageError
  return (
    <Card className="max-w-lg mx-auto mt-6 sm:mt-16 p-6 sm:p-8" role="alert">
      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-[-0.015em] text-zinc-900">{s.title}</h1>
      <p className="mt-2 text-[14px] text-zinc-600 leading-relaxed">{s.body}</p>
      <Button variant="primary" icon={RefreshCw} className="mt-6" onClick={() => window.location.reload()}>
        {s.reload}
      </Button>
    </Card>
  )
}
