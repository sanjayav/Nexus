import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, AlertCircle, Loader2, ArrowRight, Leaf, Shield, Zap, BarChart3, Globe, User } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const DEMO_ACCOUNTS = [
  { label: 'Platform Admin', email: 'admin@aeiforo.com', role: 'PA', desc: 'Full access' },
  { label: 'Team Lead', email: 'tl@aeiforo.com', role: 'TL', desc: 'Group oversight' },
  { label: 'Facility Manager', email: 'fm@aeiforo.com', role: 'FM', desc: 'Review & approve' },
  { label: 'Source Owner', email: 'so@aeiforo.com', role: 'SO', desc: 'Data entry' },
]

const PASSWORD = 'demo2026'

const features = [
  { icon: BarChart3, text: '10+ GHG Protocol calculator modules' },
  { icon: Globe, text: 'GRI, CSRD, ISSB, TCFD, CDP frameworks' },
  { icon: Shield, text: 'RBAC with SO / FM / TL approval chain' },
  { icon: Zap, text: 'Excel ingestion with auto-mapping' },
]

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('admin@aeiforo.com')
  const [password, setPassword] = useState(PASSWORD)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState(0)

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
      navigate('/dashboard', { replace: true })
      return
    }

    const ok = await login(email, password)
    setLoading(false)
    if (!ok) { setError('Invalid credentials.'); return }
    navigate('/dashboard', { replace: true })
  }

  const handleQuickLogin = async (idx: number) => {
    setSelectedRole(idx)
    const acc = DEMO_ACCOUNTS[idx]
    setEmail(acc.email)
    setPassword(PASSWORD)
    setError(null)
    setLoading(true)
    const ok = await login(acc.email, PASSWORD)
    setLoading(false)
    if (ok) navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[var(--bg-secondary)]">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] right-[-15%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #0F7B6F, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(circle, #2563EB, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[1000px] bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] overflow-hidden flex min-h-[600px] relative z-10 shadow-xl">

        {/* ── Left panel ── */}
        <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 bg-[var(--bg-inverse)] text-white relative overflow-hidden">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />
          {/* Glow */}
          <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #0F7B6F, transparent 70%)' }} />

          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-teal)] to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[18px] font-display font-bold tracking-tight block">Aeiforo</span>
                <span className="text-[10px] text-white/30 font-medium tracking-wide">Carbon & ESG Platform</span>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-[28px] font-display font-bold tracking-tight leading-[1.15]">
                Real-time carbon<br />accounting &<br />
                <span className="text-gradient bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text" style={{ WebkitTextFillColor: 'transparent' }}>ESG reporting</span>
              </h1>
              <p className="text-[13px] text-white/40 leading-relaxed max-w-[300px]">
                GHG Protocol calculators, 5 reporting frameworks, approval workflows — all from one dataset.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {features.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 group">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-[12px] text-white/50 group-hover:text-white/70 transition-colors">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-[10px] text-white/15">
            v1.0 POC &middot; Aeiforo Ltd
          </p>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-[380px] space-y-7">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent-teal)] to-emerald-600 flex items-center justify-center shadow-sm">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="text-[17px] font-display font-bold text-[var(--text-primary)]">Aeiforo</span>
            </div>

            <div>
              <h2 className="text-[22px] font-display font-bold text-[var(--text-primary)] tracking-tight">Sign in</h2>
              <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
                Pick a demo role to explore the platform.
              </p>
            </div>

            {/* Role cards */}
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc, i) => (
                <button
                  key={acc.email}
                  onClick={() => handleQuickLogin(i)}
                  disabled={loading}
                  className={`
                    relative flex flex-col items-start p-3.5 rounded-xl border text-left
                    transition-all duration-200 cursor-pointer disabled:opacity-50 group
                    ${selectedRole === i && loading
                      ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-subtle)] shadow-[var(--shadow-glow-teal)]'
                      : 'border-[var(--border-default)] hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal-subtle)] hover:shadow-sm'
                    }
                  `}
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center mb-2 group-hover:bg-[var(--accent-teal-light)] group-hover:border-[var(--accent-teal)]/20 transition-all">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] group-hover:text-[var(--accent-teal)] transition-colors">{acc.role}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">{acc.label}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{acc.desc}</span>
                  {selectedRole === i && loading && (
                    <Loader2 className="absolute top-3 right-3 w-4 h-4 text-[var(--accent-teal)] animate-spin" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border-default)]" />
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">{mode === 'login' ? 'or sign in' : 'create account'}</span>
              <div className="h-px flex-1 bg-[var(--border-default)]" />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--accent-red-light)] border border-red-200 text-[12px] text-[var(--accent-red)]">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <div>
                <label htmlFor="email" className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1 focus:border-transparent transition-all hover:border-[var(--border-strong)]"
                  />
                </div>
              </div>
              {mode === 'register' && (
                <div>
                  <label htmlFor="name" className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1 focus:border-transparent transition-all hover:border-[var(--border-strong)]"
                    />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="password" className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Min. 6 characters' : ''}
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1 focus:border-transparent transition-all hover:border-[var(--border-strong)]"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[var(--bg-inverse)] text-[var(--text-inverse)] text-[13px] font-semibold hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>{mode === 'login' ? 'Sign in' : 'Create Account'}</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
                className="w-full text-center text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent-teal)] transition-colors cursor-pointer"
              >
                {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
