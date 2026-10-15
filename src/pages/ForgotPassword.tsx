import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, Loader2, Leaf, ArrowLeft, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { auth as authApi } from '../lib/api'

const emailSchema = z.string().trim().email('Enter a valid email address.')

/**
 * /forgot-password — public page (sibling of /login, NOT inside the authed
 * shell). Always shows the same success message after submit, regardless of
 * whether the email is registered, to prevent user-enumeration.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Field-level email validation. Surfaces only after blur so the user
  // isn't yelled at while still typing.
  const fieldError: string | null = (() => {
    const r = emailSchema.safeParse(email)
    return r.success ? null : r.error.issues[0]?.message ?? 'Invalid email.'
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
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
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

          {submitted ? (
            <div className="space-y-4">
              <h2 className="text-[20px] font-display font-bold text-white tracking-tight">Check your email</h2>
              <p className="text-[13px] text-white/60 leading-relaxed">
                If an account exists for that address, we've sent reset instructions. The link is valid for 30 minutes.
              </p>
              <p className="text-[12px] text-white/40">
                Didn't get anything? Check your spam folder, or try again in a few minutes.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-[20px] font-display font-bold text-white tracking-tight mb-1">Forgot your password?</h2>
              <p className="text-[12px] text-white/50 mb-6">
                Enter your email and we'll send you a link to set a new one.
              </p>

              {error && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[12px] text-red-300 mb-4">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onBlur={() => setTouched(true)}
                      aria-invalid={!!showFieldError}
                      aria-describedby={showFieldError ? 'email-err' : undefined}
                      required
                      placeholder="user@company.com"
                      className={`w-full h-10 pl-10 pr-4 rounded-lg border bg-white/[0.03] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent ${
                        showFieldError ? 'border-red-500/60' : 'border-white/10'
                      }`}
                    />
                  </div>
                  {showFieldError && (
                    <p id="email-err" className="mt-1 text-[11px] text-red-300">{fieldError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !!fieldError}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[13px] font-semibold hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send reset link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <Link
                  to="/login"
                  className="block text-center text-[12px] text-white/40 hover:text-emerald-400 transition-colors"
                >
                  Back to sign in
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
