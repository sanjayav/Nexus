import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/20 blur-3xl rounded-full" />
        <div className="absolute top-40 right-0 w-96 h-96 bg-cyan-500/10 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[1.1fr,1fr] gap-10 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1 text-sm text-emerald-200">
            <ShieldCheck className="w-4 h-4" />
            <span>Demo access · Aeiforo Sustainability Control Room</span>
          </div>

          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Sign in to your
              <span className="text-emerald-400"> reporting workspace</span>
            </h1>
            <p className="mt-3 text-sm text-slate-300 max-w-xl">
              Use the demo credentials to explore GRI questionnaires, evidence trails, and
              analytics as an admin reviewer.
            </p>
          </div>

          <div className="hidden md:block space-y-4 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">You&apos;ll be able to:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Walk GRI questionnaires with field-aware guidance.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Review Scope 1 &amp; 2 breakdown tables and KPIs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Inspect evidence, anchors and validation results.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Jump straight into the executive dashboard view.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500/40 via-cyan-500/30 to-sky-500/30 rounded-3xl opacity-70 blur-xl" />
          <div className="relative bg-slate-950/80 border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-900 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20 border border-emerald-500/20">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-100 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
                    Nexus
                  </h1>
                  <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase">Enterprise</span>
                </div>
              </div>
              <div className="space-y-0.5 pl-1">
                <div className="flex items-center gap-1.5 opacity-80">
                  <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Powered by</span>
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">aeiforo</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-80">
                  <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Partnered by</span>
                  <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">SmartEsg</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-100">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">
                  Work email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Demo credentials: <span className="text-emerald-300">admin@aeiforo.co.uk / admin</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm py-2.5 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Enter workspace
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}


