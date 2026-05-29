import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, ArrowRight, Loader2, Leaf, CheckCircle2, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { auth as authApi } from '../lib/api'

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
      if (!out[k]) out[k] = iss.message
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
      setError(err instanceof Error ? err.message : 'Reset failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 0%, #061914 0%, #05100E 45%, #030809 100%)',
      }}
    >
      <div className="w-full max-w-[460px] relative z-10">
        <div
          className="bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden p-8"
          style={{
            boxShadow:
              '0 30px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 80px -10px rgba(52,211,153,0.35)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-[17px] font-display font-bold text-white">Nexus</span>
          </div>

          {tokenMissing ? (
            <div className="space-y-4">
              <h2 className="text-[20px] font-display font-bold text-white tracking-tight">Invalid reset link</h2>
              <p className="text-[13px] text-white/60">
                The link is missing its token. Request a new reset email.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-2 text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>Request new link</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-[20px] font-display font-bold text-white tracking-tight">Password updated</h2>
              </div>
              <p className="text-[13px] text-white/60">
                Taking you to the sign-in page...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-[20px] font-display font-bold text-white tracking-tight mb-1">Set a new password</h2>
              <p className="text-[12px] text-white/50 mb-6">
                Pick something at least 6 characters long.
              </p>

              {error && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[12px] text-red-300 mb-4">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="pw" className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-1">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="pw"
                      type="password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); refreshErrors({ password: e.target.value }) }}
                      onBlur={onBlur('password')}
                      aria-invalid={!!(touched.password && fieldErrors.password)}
                      aria-describedby={touched.password && fieldErrors.password ? 'pw-err' : undefined}
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      className={`w-full h-10 pl-10 pr-4 rounded-lg border bg-white/[0.03] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
                        touched.password && fieldErrors.password ? 'border-red-500/60' : 'border-white/10'
                      }`}
                    />
                  </div>
                  {touched.password && fieldErrors.password && (
                    <p id="pw-err" className="mt-1 text-[11px] text-red-300">{fieldErrors.password}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="pw2" className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-1">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="pw2"
                      type="password"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); refreshErrors({ confirm: e.target.value }) }}
                      onBlur={onBlur('confirm')}
                      aria-invalid={!!(touched.confirm && fieldErrors.confirm)}
                      aria-describedby={touched.confirm && fieldErrors.confirm ? 'pw2-err' : undefined}
                      required
                      minLength={6}
                      className={`w-full h-10 pl-10 pr-4 rounded-lg border bg-white/[0.03] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
                        touched.confirm && fieldErrors.confirm ? 'border-red-500/60' : 'border-white/10'
                      }`}
                    />
                  </div>
                  {touched.confirm && fieldErrors.confirm && (
                    <p id="pw2-err" className="mt-1 text-[11px] text-red-300">{fieldErrors.confirm}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !isValid}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[13px] font-semibold hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Reset password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
