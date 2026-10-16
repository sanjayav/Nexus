import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { auth as authApi } from '../lib/api'
import AuthShell from '../components/auth/AuthShell'
import AuthField from '../components/auth/AuthField'
import { Illustration } from '../components/ui'

const emailSchema = z.string().trim().email('Enter a valid email address.')

/**
 * /forgot-password — public page (sibling of /login, NOT inside the authed
 * shell). Always shows the same success message after submit, regardless of
 * whether the email is registered, to prevent user-enumeration.
 */
export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Field-level email validation. Surfaces only after blur so the user
  // isn't yelled at while still typing.
  const fieldError: string | null = (() => {
    const r = emailSchema.safeParse(email)
    return r.success ? null : t('auth.register.errors.email')
  })()
  const showFieldError = touched && fieldError

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setTouched(true)
    if (fieldError) return
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim().toLowerCase())
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgot.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {submitted ? (
        <div className="space-y-5" role="status">
          <Illustration name="inbox" size={112} />
          <div>
            <h1 className="type-h1" style={{ color: 'var(--text-primary)' }}>{t('auth.forgot.checkEmail')}</h1>
            <p className="mt-2 type-body" style={{ color: 'var(--text-secondary)' }}>{t('auth.forgot.sentBody')}</p>
          </div>
          <p className="type-small" style={{ color: 'var(--text-tertiary)' }}>{t('auth.forgot.spamHint')}</p>
          <Link to="/login" className="btn-secondary h-11 text-[14px]">
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t('auth.backToSignIn')}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 id="forgot-title" className="type-h1" style={{ color: 'var(--text-primary)' }}>{t('auth.forgot.title')}</h1>
            <p className="mt-2 type-body" style={{ color: 'var(--text-secondary)' }}>{t('auth.forgot.subtitle')}</p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 type-small"
              style={{ background: 'var(--status-danger-soft)', border: '1px solid var(--status-danger-line)', color: 'var(--status-danger)' }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-labelledby="forgot-title" className="space-y-4">
            <AuthField
              id="email"
              type="email"
              autoComplete="email"
              icon={Mail}
              label={t('login.email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              required
              error={showFieldError ? fieldError : null}
              placeholder="user@company.com"
            />
            <button type="submit" disabled={loading || !!fieldError} className="btn-primary w-full h-11 text-[14px]">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t('auth.forgot.send')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 h-10 type-small rounded-md hover:underline underline-offset-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              {t('auth.backToSignIn')}
            </Link>
          </form>
        </div>
      )}
    </AuthShell>
  )
}
