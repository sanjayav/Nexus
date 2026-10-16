import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { auth as authApi } from '../lib/api'
import AuthShell from '../components/auth/AuthShell'
import AuthField from '../components/auth/AuthField'
import { Illustration, SealCheck } from '../components/ui'

/**
 * Field-level reset-password schema. `superRefine` lets us attach the
 * "passwords do not match" error to the confirm field rather than the form.
 */
const resetSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  confirm: z.string(),
}).superRefine((v, ctx) => {
  if (v.password !== v.confirm) {
    ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Passwords do not match.' })
  }
})
type ResetForm = z.infer<typeof resetSchema>
type FieldErr = Partial<Record<keyof ResetForm, string>>

/**
 * /reset-password?token=… — public page. Token arrives in the query string
 * from the email link. On success, redirects to /login.
 */
export default function ResetPassword() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErr>({})
  const [touched, setTouched] = useState<Partial<Record<keyof ResetForm, boolean>>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const tokenMissing = token.length === 0

  // Live validation — we run the schema on every keystroke once the field
  // has been blurred so the user sees errors clear in real time.
  const validate = (form: ResetForm): FieldErr => {
    const result = resetSchema.safeParse(form)
    if (result.success) return {}
    const out: FieldErr = {}
    const issues = (result.error as unknown as { issues?: { path: (string | number)[]; message: string }[] }).issues ?? []
    for (const iss of issues) {
      const k = iss.path[0] as keyof ResetForm
      if (!out[k]) out[k] = k === 'password' ? t('auth.register.errors.password') : t('auth.reset.mismatch')
    }
    return out
  }

  const onBlur = (k: keyof ResetForm) => () => {
    setTouched(t => ({ ...t, [k]: true }))
    setFieldErrors(validate({ password, confirm }))
  }

  // Recompute errors as user types (only revealing those whose field is touched).
  const refreshErrors = (next: Partial<ResetForm>) => {
    const merged = { password, confirm, ...next }
    setFieldErrors(validate(merged))
  }

  const isValid = Object.keys(validate({ password, confirm })).length === 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setTouched({ password: true, confirm: true })
    const errs = validate({ password, confirm })
    setFieldErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.reset.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {tokenMissing ? (
        <div className="space-y-5">
          <Illustration name="error" size={112} />
          <div>
            <h1 className="type-h1" style={{ color: 'var(--text-primary)' }}>{t('auth.reset.invalidLink')}</h1>
            <p className="mt-2 type-body" style={{ color: 'var(--text-secondary)' }}>{t('auth.reset.missingToken')}</p>
          </div>
          <Link to="/forgot-password" className="btn-primary h-11 text-[14px]">
            <span>{t('auth.reset.requestNew')}</span>
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      ) : success ? (
        <div className="space-y-4" role="status">
          <SealCheck size={56} ripple />
          <div>
            <h1 className="type-h1" style={{ color: 'var(--text-primary)' }}>{t('auth.reset.updated')}</h1>
            <p className="mt-2 type-body" style={{ color: 'var(--text-secondary)' }}>{t('auth.reset.redirecting')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 id="reset-title" className="type-h1" style={{ color: 'var(--text-primary)' }}>{t('auth.reset.title')}</h1>
            <p className="mt-2 type-body" style={{ color: 'var(--text-secondary)' }}>{t('auth.reset.subtitle')}</p>
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

          <form onSubmit={handleSubmit} noValidate aria-labelledby="reset-title" className="space-y-4">
            <AuthField
              id="pw"
              type="password"
              autoComplete="new-password"
              icon={Lock}
              label={t('auth.reset.newPassword')}
              value={password}
              onChange={e => { setPassword(e.target.value); refreshErrors({ password: e.target.value }) }}
              onBlur={onBlur('password')}
              required
              minLength={6}
              placeholder={t('auth.register.minChars')}
              error={touched.password ? fieldErrors.password : null}
            />
            <AuthField
              id="pw2"
              type="password"
              autoComplete="new-password"
              icon={Lock}
              label={t('auth.reset.confirmPassword')}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); refreshErrors({ confirm: e.target.value }) }}
              onBlur={onBlur('confirm')}
              required
              minLength={6}
              error={touched.confirm ? fieldErrors.confirm : null}
            />
            <button type="submit" disabled={loading || !isValid} className="btn-primary w-full h-11 text-[14px]">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t('auth.reset.submit')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </AuthShell>
  )
}
