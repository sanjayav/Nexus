import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Suspense fallback shown while a lazy-loaded route chunk is being fetched.
 * Centred spinner — kept intentionally minimal so it doesn't compete with
 * the chunk it's about to be replaced by.
 */
export default function RouteLoader() {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[60vh] gap-3"
    >
      <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" aria-hidden="true" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}
