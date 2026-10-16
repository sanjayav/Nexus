import { useState } from 'react'
import { Database, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { setup } from '../lib/api'
import Illustration from '../design-system/illustrations/Illustration'

/**
 * Shown when a Nexus-live page finds the backend returned an empty tree/queue —
 * means the schema/seed has not been applied to this database yet.
 * One click runs POST /api/setup (idempotent, ON CONFLICT DO NOTHING) and reloads.
 */
export default function SetupGuard({
  title,
  message,
  onReady,
}: {
  title?: string
  message?: string
  onReady?: () => void
}) {
  const { t } = useTranslation()
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
      setError(e instanceof Error ? e.message : t('onboarding.guard.unknownError'))
      setStatus('error')
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="surface-paper max-w-lg w-full p-8 text-center" role={status === 'error' ? 'alert' : 'status'} aria-live="polite">
        <Illustration name={status === 'done' ? 'cleared' : status === 'error' ? 'error' : 'setup'} size={128} className="mx-auto" />
        <h2 className="type-h2 text-[var(--text-primary)] mt-4">
          {status === 'done' ? t('onboarding.guard.complete') : status === 'error' ? t('onboarding.guard.failed') : (title ?? t('onboarding.guard.title'))}
        </h2>
        <p className="text-small text-[var(--text-secondary)] mt-2 mb-6 break-words">
          {status === 'done' ? t('onboarding.guard.reloading') : status === 'error' ? error : (message ?? t('onboarding.guard.message'))}
        </p>
        {status !== 'done' && (
          <button
            type="button"
            onClick={run}
            disabled={status === 'running'}
            className="inline-flex items-center gap-2 min-h-[40px] px-5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-60 transition-colors duration-micro"
          >
            {status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Database className="w-4 h-4" aria-hidden />}
            {status === 'running' ? t('onboarding.guard.initializing') : status === 'error' ? t('onboarding.guard.retry') : t('onboarding.guard.initialize')}
          </button>
        )}
        <p className="text-caption text-[var(--text-tertiary)] mt-5">{t('onboarding.guard.footnote')}</p>
      </div>
    </div>
  )
}
