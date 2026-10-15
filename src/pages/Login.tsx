import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Lock, Mail, ShieldCheck, AlertCircle, Loader2, Box, ArrowRight, Check, Info, Smartphone, MessageSquare, Building2, ChevronDown, X } from 'lucide-react'
import { useAuth, DEMO_EMAIL, DEMO_PASSWORD } from '../auth/AuthContext'
import { fmt, useStrings } from '../i18n'
import { loginStrings } from '../i18n/pages/login'
import { integrationStrings, SSO_MARK } from '../i18n/pages/integrations'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useWorkspace, useL10n } from '../workspace/WorkspaceContext'
import { WORKSPACES, type SsoProvider } from '../workspace/regions'

const inputClass =
  'w-full h-11 pl-10 pr-3.5 rounded-xl bg-white border border-line text-[15px] text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60 transition-shadow'

export default function Login() {
  const s = useStrings(loginStrings)
  const names = useStrings(integrationStrings)
  const l10n = useL10n()
  const { workspace, region, setWorkspace } = useWorkspace()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  // Honest inline note for identity options that this demo tenant hasn't configured.
  const [notice, setNotice] = useState<string | null>(null)

  const isCn = region.id === 'cn'
  const activeMethod = isCn ? method : 'email'

  const showSsoNote = (p: SsoProvider) => {
    setError(null)
    setNotice(fmt(s.ssoNote, { provider: names.sso[p] }))
  }
  const showSmsNote = (e?: FormEvent) => {
    e?.preventDefault()
    setError(null)
    setNotice(s.smsNote)
  }
  const switchToDemo = () => {
    setMethod('email')
    applyDemo()
    setNotice(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const ok = await login(email, password)
    setLoading(false)

    if (!ok) {
      setError(fmt(s.invalid, { email: DEMO_EMAIL }))
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
    <div className="min-h-[100dvh] w-full bg-canvas flex">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative w-[46%] max-w-[640px] flex-col justify-between p-12 bg-zinc-950 text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-40 -left-20 w-[520px] h-[520px] rounded-full bg-emerald-500/20 blur-[120px]" />
          <div className="absolute bottom-[-180px] right-[-120px] w-[480px] h-[480px] rounded-full bg-teal-400/10 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)' }}
          />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <Box className="w-[18px] h-[18px] text-zinc-950" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight">
              Nexus<span className="text-emerald-400">.</span>
            </div>
            <div className="text-xs text-white/50">{s.tagline}</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-[34px] font-semibold tracking-[-0.025em] leading-[1.15]">{s.heroTitle}</h1>
          <p className="mt-4 text-[15px] text-white/60 leading-relaxed">{s.heroBody}</p>
          <ul className="mt-10 space-y-5">
            {s.features.map(f => (
              <li key={f.title} className="flex gap-3.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-400/15 text-emerald-300 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <div>
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="text-[13px] text-white/50 mt-0.5">{f.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex gap-10 text-sm">
          <div>
            <div className="text-2xl font-semibold tabular">12</div>
            <div className="text-white/50 text-xs mt-1">{s.stat1}</div>
          </div>
          <div>
            <div className="text-2xl font-semibold tabular">48,210</div>
            <div className="text-white/50 text-xs mt-1">{s.stat2}</div>
          </div>
        </div>
      </aside>

      {/* Form */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between h-16 px-5 sm:px-8">
          <div className="flex items-center gap-2.5 lg:invisible">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
              <Box className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              Nexus<span className="text-brand-500">.</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center">
              <span className="sr-only">{s.workspace}</span>
              <Building2 className="absolute left-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" aria-hidden />
              <select
                value={workspace.id}
                onChange={e => { setWorkspace(e.target.value); setNotice(null); setMethod('email') }}
                className="h-8 pl-7 pr-7 rounded-lg bg-white border border-line text-[13px] font-medium text-zinc-700 shadow-sm appearance-none cursor-pointer max-w-[180px] sm:max-w-none truncate focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              >
                {WORKSPACES.map(w => <option key={w.id} value={w.id}>{l10n(w.name)}</option>)}
              </select>
              <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" aria-hidden />
            </label>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 pb-16">
          <div className="w-full max-w-[380px] animate-fade-up">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-zinc-900">{s.welcome}</h2>
            <p className="mt-1.5 text-sm text-zinc-500">{s.welcomeSub}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-zinc-100 text-xs font-medium text-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
              {l10n(workspace.name)} · {l10n(region.label)}
            </p>

            {error && (
              <div role="alert" aria-live="polite" className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" aria-hidden />
                <p>{error}</p>
              </div>
            )}

            {notice && (
              <div role="status" aria-live="polite" className="mt-6 flex items-start gap-2.5 rounded-xl border border-sky-200/80 bg-sky-50/80 px-3.5 py-3 text-[13px] text-sky-900 animate-fade-up">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="leading-relaxed">{notice}</p>
                  <button type="button" onClick={switchToDemo} className="mt-1.5 text-xs font-medium text-sky-800 hover:underline underline-offset-4">
                    {s.useDemo}
                  </button>
                </div>
                <button type="button" onClick={() => setNotice(null)} aria-label={s.dismiss} className="-mr-1 -mt-0.5 w-6 h-6 rounded-md text-sky-700/70 hover:text-sky-900 hover:bg-sky-100 flex items-center justify-center shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isCn && (
              <div role="tablist" aria-label={s.welcome} className="mt-6 grid grid-cols-2 p-0.5 rounded-xl bg-zinc-100 border border-line">
                {(['email', 'phone'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={method === m}
                    onClick={() => { setMethod(m); setError(null) }}
                    className={clsx(
                      'h-9 rounded-[10px] text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors',
                      method === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
                    )}
                  >
                    {m === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                    {m === 'email' ? s.tabEmail : s.tabPhone}
                  </button>
                ))}
              </div>
            )}

            {activeMethod === 'email' ? (
            <form className={clsx(isCn ? 'mt-5' : 'mt-8', 'space-y-4')} onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-[13px] font-medium text-zinc-700">{s.email}</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-600 transition-colors pointer-events-none" aria-hidden />
                  <input id="login-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder={s.emailPlaceholder} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-[13px] font-medium text-zinc-700">{s.password}</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-600 transition-colors pointer-events-none" aria-hidden />
                  <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder={s.passwordPlaceholder} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 group inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white text-[15px] font-medium shadow-sm hover:bg-zinc-800 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    {s.signingIn}
                  </>
                ) : (
                  <>
                    {s.continue}
                    <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                  </>
                )}
              </button>
            </form>
            ) : (
            <form className="mt-5 space-y-4" onSubmit={showSmsNote} noValidate>
              <div className="space-y-1.5">
                <label htmlFor="login-phone" className="block text-[13px] font-medium text-zinc-700">{s.phone}</label>
                <div className="flex h-11 rounded-xl bg-white border border-line shadow-sm focus-within:ring-2 focus-within:ring-brand-500/25 focus-within:border-brand-500/60 transition-shadow">
                  <span className="inline-flex items-center px-3.5 border-r border-line text-[15px] text-zinc-600 tabular shrink-0">{s.countryCode}</span>
                  <input
                    id="login-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={13}
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d ]/g, ''))}
                    className="flex-1 min-w-0 px-3.5 bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-400 tabular focus:outline-none rounded-r-xl"
                    placeholder={s.phonePlaceholder}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-code" className="block text-[13px] font-medium text-zinc-700">{s.code}</label>
                <div className="flex gap-2">
                  <div className="relative group flex-1">
                    <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-600 transition-colors pointer-events-none" aria-hidden />
                    <input
                      id="login-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                      className={inputClass + ' tabular'}
                      placeholder={s.codePlaceholder}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => showSmsNote()}
                    className="h-11 px-4 rounded-xl bg-white border border-line text-[13px] font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 hover:border-zinc-300 transition-colors whitespace-nowrap"
                  >
                    {s.getCode}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 mt-2 group inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white text-[15px] font-medium shadow-sm hover:bg-zinc-800 active:scale-[0.99] transition"
              >
                {s.phoneSubmit}
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" aria-hidden />
              </button>
            </form>
            )}

            {/* Single sign-on (providers depend on the workspace region) */}
            <div className="mt-6">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="h-px flex-1 bg-line" />
                {s.orSso}
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className={clsx('mt-4 grid gap-2', region.sso.length >= 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                {region.sso.map(p => {
                  const mark = SSO_MARK[p]
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => showSsoNote(p)}
                      aria-label={fmt(s.ssoWith, { provider: names.sso[p] })}
                      title={fmt(s.ssoWith, { provider: names.sso[p] })}
                      className="h-10 px-2 rounded-xl bg-white border border-line shadow-sm hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.99] transition inline-flex items-center justify-center gap-2 min-w-0"
                    >
                      <span className={clsx('w-5 h-5 rounded-md text-[11px] font-semibold flex items-center justify-center shrink-0', mark.className)} aria-hidden>{mark.mark}</span>
                      <span className="text-[13px] font-medium text-zinc-800 truncate">{names.ssoShort[p]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white/60 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-zinc-500">{s.demoHint}</span>
                <button type="button" onClick={applyDemo} className="text-xs font-medium text-brand-700 hover:text-brand-600 hover:underline underline-offset-4">
                  {s.fillDemo}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-xs text-zinc-700">
                <span className="bg-zinc-100 px-2 py-1 rounded-md">{DEMO_EMAIL}</span>
                <span className="bg-zinc-100 px-2 py-1 rounded-md">{DEMO_PASSWORD}</span>
              </div>
            </div>

            <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-zinc-400 text-center">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> {s.secure}
            </p>
            <p className="mt-1.5 text-center text-[11px] text-zinc-400">{fmt(s.privacy, { privacy: l10n(region.privacy) })}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
