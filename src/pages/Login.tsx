import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ShieldCheck, AlertCircle, Loader2, Box, ArrowRight } from 'lucide-react'
import { useAuth, DEMO_EMAIL, DEMO_PASSWORD } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const ok = await login(email, password)
    setLoading(false)

    if (!ok) {
      setError(`Invalid credentials. Use ${DEMO_EMAIL} with the demo password.`)
      return
    }

    navigate('/executive', { replace: true })
  }

  const applyDemo = () => {
    setEmail(DEMO_EMAIL)
    setPassword(DEMO_PASSWORD)
    setError(null)
  }

  return (
    <div className="min-h-screen w-full font-sans overflow-x-hidden selection:bg-emerald-500/20 bg-[#e0e5ec] relative flex flex-col">
      <div
        className="absolute inset-0 opacity-45 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 42%, rgba(255,255,255,0.92), transparent 32%), radial-gradient(circle at 82% 28%, rgba(255,255,255,0.88), transparent 28%), radial-gradient(circle at 48% 88%, rgba(255,255,255,0.75), transparent 35%)',
          backgroundSize: '100% 100%',
        }}
      />
      <div className="absolute top-[-12%] right-[-8%] w-[55%] max-w-[680px] aspect-square bg-gradient-to-br from-emerald-200/35 via-white/40 to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-12%] w-[60%] max-w-[720px] aspect-square bg-gradient-to-tr from-white/50 via-emerald-100/20 to-transparent rounded-full blur-[110px] pointer-events-none" />

      <div className="relative z-10 flex-1 flex w-full min-h-screen min-h-[100dvh] p-4 sm:p-6 items-stretch">
        <div className="flex flex-1 rounded-[2rem] sm:rounded-[2.5rem] bg-white/45 backdrop-blur-2xl border border-white/70 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
            }}
          />

          <div className="relative z-10 flex flex-1 flex-col lg:flex-row">
            <aside className="flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-black/[0.05] px-7 sm:px-10 py-10 sm:py-14 lg:py-16 lg:w-[min(100%,420px)] lg:shrink-0 bg-gradient-to-br from-white/[0.5] via-white/[0.2] to-emerald-50/10 relative">
              <div className="absolute inset-y-10 right-0 w-px bg-gradient-to-b from-transparent via-black/[0.05] to-transparent hidden lg:block" aria-hidden />
              <div className="space-y-9 sm:space-y-10 max-w-md mx-auto lg:mx-0 w-full">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[11px] bg-zinc-900 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 ring-2 ring-white/30">
                    <Box className="w-[19px] h-[19px] text-white" strokeWidth={2} />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[1.4rem] sm:text-[1.5rem] font-bold tracking-tight text-zinc-900 block">
                      Nexus<span className="text-emerald-600">.</span>
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Reporting &amp; assurance
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2.5 rounded-full border border-zinc-900/8 bg-white/75 backdrop-blur-sm shadow-[0_2px_16px_rgba(0,0,0,0.05)] px-4 py-2.5 w-fit">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.25} aria-hidden />
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                    Secure workspace
                  </span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-[1.7rem] sm:text-[2rem] lg:text-[2.25rem] font-bold tracking-[-0.025em] text-zinc-900 leading-[1.12]">
                    Sign in to your{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500">
                      reporting workspace
                    </span>
                  </h1>
                  <p className="text-[0.9375rem] sm:text-[0.95rem] text-zinc-500 max-w-sm leading-[1.65]">
                    One place for frameworks, evidence vaults, emissions views, and executive
                    insights—aligned with your signed-in profile.
                  </p>
                </div>

                <div className="hidden md:block pt-1 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Included</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5 text-[13px] text-zinc-600 leading-snug">
                    {[
                      'Guided framework questionnaires.',
                      'Emissions & KPI dashboards.',
                      'Evidence, anchors, validation.',
                      'Executive overview on entry.',
                    ].map(line => (
                      <li key={line} className="flex items-start gap-2.5">
                        <span className="mt-2 h-1 w-3.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>

            <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-14 relative">
              <div className="absolute inset-0 pointer-events-none opacity-[0.55] bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(16,185,129,0.07),transparent_65%)]" aria-hidden />

              <div className="relative w-full max-w-[420px] space-y-6">
                <div className="lg:hidden flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0 ring-1 ring-white/20">
                    <Box className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-zinc-900">
                    Nexus<span className="text-emerald-600">.</span>
                  </span>
                </div>

                <div className="relative rounded-[1.75rem] border border-white/90 bg-white/70 backdrop-blur-xl p-8 sm:p-9 shadow-[0_16px_56px_-20px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(255,255,255,0.9)] ring-1 ring-zinc-900/[0.04]">
                  <div className="absolute left-0 top-10 bottom-10 w-[3px] rounded-r-full bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-600 opacity-90" aria-hidden />

                  <div className="pl-1 sm:pl-2">
                    <h2 className="text-xl sm:text-[1.35rem] font-bold text-zinc-900 tracking-tight">
                      Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                      Use your work email to continue.
                    </p>

                    <button
                      type="button"
                      onClick={applyDemo}
                      className="mt-4 text-left text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 rounded"
                    >
                      Fill demo credentials
                    </button>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200/90 bg-red-50/95 px-3.5 py-3 text-sm text-red-900 shadow-sm"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden />
                      <p>{error}</p>
                    </div>
                  )}

                  <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                        Work email
                      </label>
                      <div className="relative group">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none">
                          <Mail className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden />
                        </span>
                        <input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={event => setEmail(event.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/95 border border-zinc-200/90 text-[15px] text-zinc-900 placeholder:text-zinc-400 shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400/70 transition-shadow"
                          placeholder="you@company.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="login-password" className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                        Password
                      </label>
                      <div className="relative group">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none">
                          <Lock className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden />
                        </span>
                        <input
                          id="login-password"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={event => setPassword(event.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/95 border border-zinc-200/90 text-[15px] text-zinc-900 placeholder:text-zinc-400 shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400/70 transition-shadow"
                          placeholder="Enter password"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
                        <span className="text-zinc-400 font-medium uppercase tracking-wider">Demo</span>{' '}
                        <span className="font-mono text-[11px] text-zinc-700 bg-zinc-100/80 px-2 py-0.5 rounded-md">
                          {DEMO_EMAIL}
                        </span>
                        <span className="text-zinc-300 mx-1.5">·</span>
                        <span className="font-mono text-[11px] text-zinc-700 bg-zinc-100/80 px-2 py-0.5 rounded-md">
                          {DEMO_PASSWORD}
                        </span>
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 group inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 text-white text-[15px] font-semibold py-3.5 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.45)] hover:bg-zinc-800 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] transition-[background,box-shadow] disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:bg-zinc-900"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                          Signing in…
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
