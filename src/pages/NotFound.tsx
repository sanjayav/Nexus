import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { homeRouteFor } from '../lib/rbac'
import { useTranslation } from 'react-i18next'
import { Illustration } from '../components/ui'

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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 py-12">
      <div className="relative mb-6">
        <Illustration name="filtered" size={160} />
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 type-caption font-semibold tabular-nums px-2 h-6 inline-flex items-center rounded-full"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
        >
          404
        </span>
      </div>
      <h1 className="type-h1 mb-2" style={{ color: 'var(--text-primary)' }}>
        {t('components.notFound.title')}
      </h1>
      <p className="type-body mb-7 max-w-md" style={{ color: 'var(--text-secondary)' }}>
        {t('components.notFound.body')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => window.history.back()} className="btn-secondary h-10">
          <ArrowLeft className="w-4 h-4" aria-hidden /> {t('components.notFound.goBack')}
        </button>
        <Link to={home} className="btn-primary h-10">
          <Home className="w-4 h-4" aria-hidden /> {isAuthenticated ? t('components.notFound.backToDashboard') : t('login.signIn')}
        </Link>
      </div>
    </div>
  )
}
