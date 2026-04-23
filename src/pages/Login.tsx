import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Mail, AlertCircle, Loader2, ArrowRight, Leaf, Shield, Zap, BarChart3, Globe, User } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { SplineScene } from '../components/SplineScene'
import { Spotlight } from '../components/Spotlight'
import { homeRouteFor } from '../lib/rbac'

/**
 * Shortcut accounts for the defined roles. All six are real users in Neon
 * (seeded by scripts/patch-roles.ts) — clicking fires a live auth request
 * against /api/auth/login, same as typing the email manually.
 *
 * The shared password is convenience for exploration only; every account
 * can be rotated via the /admin/users page like any other user.
 */
const ROLE_ACCOUNTS = [
  { label: 'Platform Admin',                 email: 'admin@aeiforo.com',    role: 'ADM', desc: 'Full access · manages org + assignments' },
  { label: 'Group Sustainability Officer',   email: 'so@aeiforo.com',       role: 'GSO', desc: 'Approves consolidated figures + publishes' },
  { label: 'Subsidiary Lead',                email: 'tl@aeiforo.com',       role: 'SL',  desc: 'Reviews plant submissions' },
  { label: 'Plant Manager',                  email: 'fm@aeiforo.com',       role: 'PM',  desc: 'Owns a plant, assigns contributors' },
  { label: 'Data Contributor',               email: 'maya@aeiforo.com',     role: 'DC',  desc: 'Answers assigned GRI questions' },
  { label: 'Narrative Owner',                email: 'narrator@aeiforo.com', role: 'NO',  desc: 'Writes governance + strategy disclosures' },
  { label: 'Auditor',                        email: 'aud@aeiforo.com',      role: 'AUD', desc: 'Read-only published data + trail' },
]
const SHARED_PASSWORD = 'demo2026'

const features = [
  { icon: BarChart3, text: '10+ GHG Protocol calculator modules' },
  { icon: Globe, text: 'GRI, CSRD, ISSB, TCFD, CDP frameworks' },
  { icon: Shield, text: 'RBAC with SO / FM / TL approval chain' },
  { icon: Zap, text: 'Excel ingestion with auto-mapping' },
]

export default function Login() {
  const { login, register, user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [quickIdx, setQuickIdx] = useState<number | null>(null)

  // Surface the "expired" banner when the API client bounces us here after a 401.
  useEffect(() => {
    if (params.get('expired') === '1') {
      setError('Your session expired. Please sign in again.')
    }
  }, [params])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'register') {
      if (!name.trim()) { setError('Name is required.'); setLoading(false); return }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return }
      const ok = await register({ email, name, password })
      setLoading(false)
      if (!ok) { setError('Registration failed. Email may already exist or DB not connected.'); return }
      navigate(homeRouteFor(user), { replace: true })
      return
    }

    const ok = await login(email, password)
    setLoading(false)
    if (!ok) { setError('Invalid credentials.'); return }
    navigate(homeRouteFor(user), { replace: true })
  }

  const handleQuickLogin = async (idx: number) => {
    const acc = ROLE_ACCOUNTS[idx]
    setQuickIdx(idx)
    setEmail(acc.email)
    setPassword(SHARED_PASSWORD)
    setError(null)
    setLoading(true)
    const ok = await login(acc.email, SHARED_PASSWORD)
    setLoading(false)
    setQuickIdx(null)
    if (!ok) { setError(`Couldn't sign in as ${acc.email}. Check that the backend is running and the user is seeded.`); return }
    navigate(homeRouteFor(user), { replace: true })
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        // Dark sustainability backdrop — deep carbon with a hint of forest.
        background:
          'radial-gradient(120% 80% at 50% 0%, #061914 0%, #05100E 45%, #030809 100%)',
      }}
    >
      {/* Animated green aurora — drifting sustainability ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary aurora blob — drifts slowly across the top */}
        <div
          className="absolute top-[-30%] left-[-15%] w-[900px] h-[900px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(34,197,94,0.28), rgba(16,185,129,0.12) 40%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'aurora-drift-1 22s ease-in-out infinite',
          }}
        />
        {/* Secondary aurora — warmer teal, counter-drift */}
        <div
          className="absolute bottom-[-25%] right-[-10%] w-[800px] h-[800px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(20,184,166,0.22), rgba(13,148,136,0.10) 40%, transparent 70%)',
            filter: 'blur(90px)',
            animation: 'aurora-drift-2 28s ease-in-out infinite',
          }}
        />
        {/* Tertiary — small, bright emerald highlight */}
        <div
          className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(110,231,183,0.18), transparent 70%)',
            filter: 'blur(60px)',
            animation: 'aurora-drift-3 18s ease-in-out infinite',
          }}
        />

        {/* Faint grid for structure */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Slow drifting leaf-like specks — the "living" signal */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(2px 2px at 20% 30%, rgba(110,231,183,0.35), transparent), ' +
              'radial-gradient(1.5px 1.5px at 70% 60%, rgba(52,211,153,0.3), transparent), ' +
              'radial-gradient(1.5px 1.5px at 40% 80%, rgba(34,197,94,0.25), transparent), ' +
              'radial-gradient(1px 1px at 85% 20%, rgba(110,231,183,0.3), transparent), ' +
              'radial-gradient(1px 1px at 10% 70%, rgba(52,211,153,0.3), transparent)',
            animation: 'specks-drift 40s linear infinite',
          }}
        />
      </div>

      <div className="w-full max-w-[1200px] max-h-[calc(100vh-3rem)] grid lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] gap-6 relative z-10">

        {/* ── Card (dark — ambient green aurora highlights it) ── */}
        <div
          className="bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]"
          style={{
            boxShadow:
              '0 30px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 80px -10px rgba(52,211,153,0.35)',
          }}
        >

          {/* Compact brand strip — one row, tight padding so role tiles + form fit in viewport */}
          <div className="hidden lg:flex items-center gap-3 px-6 py-4 border-b border-white/5 flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent-teal)] to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/30 flex-shrink-0">
              <Leaf className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[15px] font-display font-bold tracking-tight block text-white leading-tight">Aeiforo</span>
              <span className="text-[10px] text-white/40 font-medium tracking-wide">
                Real-time carbon accounting &{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text" style={{ WebkitTextFillColor: 'transparent' }}>
                  ESG reporting
                </span>
              </span>
            </div>
          </div>

          {/* Form area — scrollable if the viewport is very short */}
          <div className="flex-1 flex items-start justify-center p-6 sm:p-8 overflow-y-auto">
          <div className="w-full max-w-[460px] space-y-4">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent-teal)] to-emerald-600 flex items-center justify-center shadow-sm">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="text-[17px] font-display font-bold text-white">Aeiforo</span>
            </div>

            <div>
              <h2 className="text-[20px] font-display font-bold text-white tracking-tight leading-none">
                {mode === 'login' ? 'Sign in · เข้าสู่ระบบ' : 'Create account'}
              </h2>
              <p className="mt-1 text-[12px] text-white/40">
                {mode === 'login'
                  ? 'Pick a role, or enter credentials.'
                  : 'Register with an admin invite.'}
              </p>
            </div>

            {mode === 'login' && (
              <button
                type="button"
                disabled
                title="SSO integration arrives Q2 — Azure AD, Okta, and PTT Group IDaaS (SAML 2.0 + OIDC)"
                className="w-full h-10 rounded-[8px] flex items-center justify-center gap-2 text-[13px] font-semibold text-white/70 bg-white/[0.04] border border-white/[0.08] cursor-not-allowed"
              >
                <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold">SSO</span>
                Continue with enterprise SSO
                <span className="text-[10px] font-medium text-white/40 ml-1">· Q2 2026</span>
              </button>
            )}

            {/* Quick-login role tiles — real auth against Neon */}
            {mode === 'login' && (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {ROLE_ACCOUNTS.map((acc, i) => {
                    const isActive = quickIdx === i && loading
                    return (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => handleQuickLogin(i)}
                        disabled={loading}
                        className={`relative flex flex-col items-start p-2.5 rounded-lg border text-left
                          transition-all duration-200 cursor-pointer disabled:opacity-50 group
                          ${isActive
                            ? 'border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_20px_-6px_rgba(52,211,153,0.5)]'
                            : 'border-white/10 bg-white/[0.02] hover:border-emerald-400/40 hover:bg-white/[0.04]'
                          }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-5 h-5 rounded bg-white/[0.06] border border-white/10 flex items-center justify-center text-[8px] font-bold text-white/50 group-hover:text-emerald-400 group-hover:border-emerald-400/30 transition-all">
                            {acc.role}
                          </span>
                          {isActive && <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />}
                        </div>
                        <span className="text-[11px] font-semibold text-white leading-tight line-clamp-1">{acc.label}</span>
                        <span className="text-[9px] text-white/40 mt-0.5 leading-tight line-clamp-2">{acc.desc}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">or sign in with credentials</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[12px] text-red-300">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <div>
                <label htmlFor="email" className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-white/10 bg-white/[0.03] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all hover:border-white/20"
                  />
                </div>
              </div>
              {mode === 'register' && (
                <div>
                  <label htmlFor="name" className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-white/10 bg-white/[0.03] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all hover:border-white/20"
                    />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="password" className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Min. 6 characters' : ''}
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-white/10 bg-white/[0.03] text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all hover:border-white/20"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[13px] font-semibold hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_20px_-6px_rgba(52,211,153,0.6)]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>{mode === 'login' ? 'Sign in' : 'Create Account'}</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
                className="w-full text-center text-[12px] text-white/40 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
              </button>
            </form>
          </div>
        </div>
        </div>

        {/* ── Standalone 3D hero — visible, full-height, own column ── */}
        <div className="hidden lg:flex relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-black/80 via-slate-950/80 to-emerald-950/40 backdrop-blur-xl min-h-[640px] shadow-2xl">
          {/* Local spotlight layered on top of the scene */}
          <Spotlight className="-top-20 -left-10" fill="rgba(110, 231, 183, 0.8)" />

          {/* The 3D scene — visible, interactive, full-bleed */}
          <div className="absolute inset-0 z-0">
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </div>

          {/* Subtle vignette so copy stays readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10" />

          {/* Overlay copy at the bottom */}
          <div className="relative z-20 flex flex-col justify-end p-10 w-full pointer-events-none">
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 3D
              </span>
              <h2 className="text-[32px] font-display font-bold text-white tracking-tight leading-tight max-w-[400px]">
                One dataset.<br />Every framework.
              </h2>
              <p className="text-[13px] text-white/50 max-w-[360px] leading-relaxed">
                GRI, CSRD, ISSB, TCFD, CDP — regenerated from the same approved values, with a full audit trail.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 max-w-[360px] pointer-events-auto">
                {features.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 p-2 rounded-lg bg-black/40 backdrop-blur border border-white/5">
                    <div className="w-6 h-6 rounded-md bg-emerald-400/10 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-white/60 leading-tight">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
