import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { homeRouteFor } from '../lib/rbac'
import { useTranslation } from 'react-i18next'

/**
 * 404 catch-all. Distinguishes between a typo in a deep link (offer the
 * user their role-appropriate home) and an unauthenticated visitor
 * (offer the login screen).
 */
export default function NotFound() {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const home = isAuthenticated ? homeRouteFor(user) : '/login'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 rounded-[var(--radius-xl)] bg-[var(--bg-tertiary)] flex items-center justify-center mb-5">
        <span className="font-display text-[length:var(--text-2xl)] font-semibold text-[var(--text-primary)]">404</span>
      </div>
      <h1 className="font-display text-[length:var(--text-2xl)] font-semibold text-[var(--text-primary)] mb-2">
        {t('components.notFound.title')}
      </h1>
      <p className="text-[length:var(--text-sm)] text-[var(--text-tertiary)] mb-6 max-w-md">
        {t('components.notFound.body')}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-[length:var(--text-sm)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition"
        >
          <ArrowLeft className="w-4 h-4" /> {t('components.notFound.goBack')}
        </button>
        <Link
          to={home}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-sm)] font-medium hover:opacity-90 transition"
        >
          <Home className="w-4 h-4" /> {isAuthenticated ? t('components.notFound.backToDashboard') : t('login.signIn')}
        </Link>
      </div>
    </div>
  )
}
