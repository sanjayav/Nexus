import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ShieldCheck, AlertCircle, Loader2, Box } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@aeiforo.co.uk')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const ok = await login(email, password)
    setLoading(false)

    if (!ok) {
      setError('Invalid demo credentials. Use admin@aeiforo.co.uk / admin.')
      return
    }

    navigate('/executive', { replace: true })
  }

  return (
    <div className="min-h-screen w-full font-sans overflow-hidden selection:bg-black/20 bg-[#e0e5ec] relative flex flex-col">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 50%, rgba(255,255,255,0.8), transparent 25%), radial-gradient(circle at 85% 30%, rgba(255,255,255,0.9), transparent 25%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.7), transparent 25%)',
          backgroundSize: '100% 100%',
        }}
      />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-white/10 to-white/70 rounded-[100%] blur-[80px] rotate-[-20deg] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-bl from-white/10 to-white/60 rounded-[100%] blur-[100px] rotate-[10deg] pointer-events-none" />

      <div className="relative z-10 flex-1 flex w-full h-full min-h-screen p-6 items-stretch">
        <div className="flex flex-1 rounded-[2.5rem] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
            }}
          />

          <div className="relative z-10 flex flex-1 flex-col lg:flex-row">
            {/* Brand rail — mirrors app sidebar tone */}
            <aside className="flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-black/[0.06] px-8 py-12 lg:py-16 lg:w-[min(100%,400px)] lg:shrink-0 bg-gradient-to-b from-white/[0.35] to-white/[0.12] relative">
              <div className="absolute inset-y-8 right-0 w-px bg-gradient-to-b from-transparent via-black/[0.06] to-transparent hidden lg:block" aria-hidden />
              <div className="space-y-10 max-w-md">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-black shadow-lg shadow-black/20 flex items-center justify-center shrink-0 ring-1 ring-white/20">
                    <Box className="w-[18px] h-[18px] text-white" />
                  </div>
                  <span className="text-[1.35rem] font-bold tracking-tight text-black">
                    Nexus<span className="text-emerald-500">.</span>
                  </span>
                </div>

                <div className="inline-flex items-center gap-2.5 rounded-full border border-black/[0.07] bg-white/70 shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-black/55">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.25} />
                  <span>Demo workspace</span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-[1.75rem] sm:text-[2rem] lg:text-[2.125rem] font-bold tracking-[-0.02em] text-black leading-[1.15]">
                    Sign in to your{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500">
                      reporting workspace
                    </span>
                  </h1>
                  <p className="text-[0.9375rem] text-black/48 max-w-sm leading-[1.65]">
                    Explore frameworks, evidence, and analytics in the same environment you use after
                    login.
                  </p>
                </div>

                <div className="hidden md:block pt-2 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/38">What&apos;s inside</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 text-[13px] text-black/55 leading-snug">
                    {[
                      'Framework questionnaires with guidance.',
                      'Emissions views and KPI snapshots.',
                      'Evidence, anchors, and validation.',
                      'Executive dashboard on entry.',
                    ].map(line => (
                      <li key={line} className="flex items-start gap-2.5 group">
                        <span className="mt-2 h-1 w-4 rounded-full bg-emerald-500/90 shrink-0 group-hover:w-5 transition-[width] duration-300" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>

            {/* Form */}
            <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
              <div className="w-full max-w-md space-y-6">
                <div className="lg:hidden flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-[10px] bg-black flex items-center justify-center shrink-0">
                    <Box className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-black">
                    Nexus<span className="text-emerald-500">.</span>
                  </span>
                </div>

                <div className="rounded-[1.75rem] border border-white/90 bg-white/55 backdrop-blur-xl p-8 sm:p-9 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(255,255,255,0.85)] ring-1 ring-black/[0.03]">
                  <h2 className="text-xl font-bold text-black tracking-tight">Welcome back</h2>
                  <p className="mt-2 text-sm text-black/45 leading-relaxed">Sign in with your work email.</p>

                  {error && (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-xs text-red-900">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                      <p>{error}</p>
                    </div>
                  )}

                  <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40">
                        Work email
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none">
                          <Mail className="w-[18px] h-[18px]" strokeWidth={2} />
                        </span>
                        <input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={event => setEmail(event.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/90 border border-black/[0.07] text-[15px] text-black placeholder:text-black/32 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500/40 transition-shadow shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                          placeholder="you@company.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="login-password" className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40">
                        Password
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none">
                          <Lock className="w-[18px] h-[18px]" strokeWidth={2} />
                        </span>
                        <input
                          id="login-password"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={event => setPassword(event.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/90 border border-black/[0.07] text-[15px] text-black placeholder:text-black/32 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500/40 transition-shadow shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                          placeholder="••••••••"
                        />
                      </div>
                      <p className="text-xs text-black/38 pt-0.5">
                        Demo:{' '}
                        <span className="text-emerald-700 font-semibold tabular-nums">admin@aeiforo.co.uk</span>
                        <span className="text-black/30 mx-1">·</span>
                        <span className="text-emerald-700 font-semibold">admin</span>
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-black text-white text-[15px] font-semibold py-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.4)] hover:-translate-y-px active:translate-y-0 transition-[transform,box-shadow] disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-md"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        'Enter workspace'
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
