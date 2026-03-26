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
            <aside className="flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-black/[0.06] px-8 py-10 lg:w-[min(100%,380px)] lg:shrink-0 bg-white/[0.25]">
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-black flex items-center justify-center shrink-0">
                    <Box className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-black flex items-center">
                    Nexus<span className="text-emerald-500">.</span>
                  </span>
                </div>

                <div className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Demo · Sustainability workspace</span>
                </div>

                <div>
                  <h1 className="text-3xl lg:text-[2rem] font-bold tracking-tight text-black leading-tight">
                    Sign in to your{' '}
                    <span className="text-emerald-600">reporting workspace</span>
                  </h1>
                  <p className="mt-4 text-sm text-black/50 max-w-md leading-relaxed">
                    Use the demo credentials to explore questionnaires, evidence trails, and analytics
                    as an admin reviewer — same environment you use after login.
                  </p>
                </div>

                <div className="hidden md:block space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-black/40">You&apos;ll be able to</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-black/60">
                    {[
                      'Walk frameworks with field-aware guidance.',
                      'Review emissions breakdowns and KPIs.',
                      'Inspect evidence, anchors, and validation.',
                      'Open the executive dashboard immediately.',
                    ].map(line => (
                      <li key={line} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10 lg:mt-0 space-y-1 text-[10px] text-black/40 uppercase tracking-wider">
                <div>
                  <span className="font-medium">Powered by </span>
                  <span className="font-bold text-emerald-600">aeiforo</span>
                </div>
                <div>
                  <span className="font-medium">Partnered by </span>
                  <span className="font-bold text-black/60">SmartEsg</span>
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

                <div className="rounded-3xl border border-white/80 bg-white/50 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <h2 className="text-lg font-bold text-black tracking-tight">Welcome back</h2>
                  <p className="mt-1 text-xs text-black/45">Enter your work email to continue.</p>

                  {error && (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-xs text-red-900">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                      <p>{error}</p>
                    </div>
                  )}

                  <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-1.5">
                      <label htmlFor="login-email" className="text-[10px] font-bold uppercase tracking-widest text-black/45">
                        Work email
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35 pointer-events-none">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={event => setEmail(event.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 border border-black/[0.08] text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/15 transition-shadow"
                          placeholder="you@company.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="login-password" className="text-[10px] font-bold uppercase tracking-widest text-black/45">
                        Password
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35 pointer-events-none">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          id="login-password"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={event => setPassword(event.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 border border-black/[0.08] text-sm text-black placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/15 transition-shadow"
                          placeholder="••••••••"
                        />
                      </div>
                      <p className="text-[11px] text-black/40 pt-0.5">
                        Demo:{' '}
                        <span className="text-emerald-700 font-medium">admin@aeiforo.co.uk / admin</span>
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-black text-white text-sm font-semibold py-3 shadow-lg shadow-black/15 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
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
