import { useState } from 'react'
import { Database, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { setup } from '../lib/api'

/**
 * Shown when a Nexus-live page finds the backend returned an empty tree/queue —
 * means Phase 2 schema/seed has not been applied to this Neon yet.
 * One click runs POST /api/setup (idempotent, ON CONFLICT DO NOTHING) and reloads.
 */
export default function SetupGuard({
  title = 'Live data not found',
  message = 'This screen reads directly from the Nexus backend. The database appears empty — run the idempotent setup to provision tables and seed PTTGC FY2022–FY2025 historical values.',
  onReady,
}: {
  title?: string
  message?: string
  onReady?: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setStatus('running')
    setError(null)
    try {
      await setup.run()
      setStatus('done')
      if (onReady) setTimeout(onReady, 600)
      else setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg w-full rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-8 text-center">
        <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--color-brand-soft)] flex items-center justify-center mx-auto mb-5">
          {status === 'done'
            ? <CheckCircle2 className="w-7 h-7 text-[var(--status-ok)]" />
            : status === 'error'
            ? <AlertCircle className="w-7 h-7 text-[var(--status-reject)]" />
            : <Database className="w-7 h-7 text-[var(--color-brand)]" />}
        </div>

        <h2 className="font-display text-[var(--text-xl)] font-semibold text-[var(--text-primary)] mb-2">
          {status === 'done' ? 'Setup complete' : status === 'error' ? 'Setup failed' : title}
        </h2>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mb-6 leading-relaxed">
          {status === 'done' ? 'Reloading with live data…'
            : status === 'error' ? error
            : message}
        </p>

        {status !== 'done' && (
          <button
            type="button"
            onClick={run}
            disabled={status === 'running'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-60 transition-colors"
          >
            {status === 'running'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Initializing…</>
              : status === 'error'
              ? <>Retry initialization</>
              : <><Database className="w-4 h-4" /> Initialize database</>}
          </button>
        )}

        <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-5">
          Idempotent. Creates tables if missing, seeds PTTGC SPD data, safe to run multiple times.
        </p>
      </div>
    </div>
  )
}
