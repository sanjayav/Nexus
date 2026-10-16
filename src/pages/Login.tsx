import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, Mail, AlertCircle, Loader2, ArrowRight, ArrowLeft, User, Building2, KeyRound, ChevronDown, Smartphone, Fingerprint } from 'lucide-react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { homeRouteFor } from '../lib/rbac'
import { auth as authApi, setToken } from '../lib/api'
import AuthShell from '../components/auth/AuthShell'
import AuthField from '../components/auth/AuthField'
import { CnProviderButtons, PhoneSignIn } from '../components/auth/ChinaSignIn'
import { dur, ease, spring } from '../motion/tokens'

/**
 * Register-form schema. Field-level errors are derived from this and shown
 * inline beneath each input (login mode keeps the existing top-level
 * "error" banner since the server is the source of truth for bad creds).
 */
const registerSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  name: z.string().trim().min(2, 'Name needs at least 2 characters.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})
type RegisterFieldErrors = Partial<Record<'email' | 'name' | 'password', string>>

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
/**
 * Demo password sourced from build-time env. In dev (`npm run dev`) we
 * default to "demo2026" so the role tiles work out of the box without local
 * env setup. In production, the value MUST come from VITE_DEMO_PASSWORD —
 * if it's unset, the tiles disappear entirely so no known string ships.
 */
const SHARED_PASSWORD: string = import.meta.env.VITE_DEMO_PASSWORD
  ?? (import.meta.env.DEV ? 'demo2026' : '')
const DEMO_TILES_ENABLED = SHARED_PASSWORD.length > 0

type Method = 'email' | 'phone'

function ErrorBanner({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      id={id}
      className="flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 type-small"
      style={{ background: 'var(--status-danger-soft)', border: '1px solid var(--status-danger-line)', color: 'var(--status-danger)' }}
    >
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1" aria-hidden>
      <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
      <span className="type-caption whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
    </div>
  )
}

export default function Login() {
  const { t, i18n } = useTranslation()
  const { login, register, user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Marketing CTAs link to /login?mode=register — honour it.
  const [mode, setMode] = useState<'login' | 'register'>(() => (params.get('mode') === 'register' ? 'register' : 'login'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  // China sign-in options: always offered in Chinese; behind "More sign-in
  // options" otherwise. `method` switches the form between email and SMS.
  const isZh = (i18n.language ?? 'en').startsWith('zh')
  const [moreOpen, setMoreOpen] = useState(false)
  const [method, setMethod] = useState<Method>('email')
  // Register-mode inline validation state. Errors keyed by field; we only
  // surface an error once the field has been blurred (`touched`) so the
  // user isn't yelled at while still typing.
  const [touched, setTouched] = useState<Partial<Record<'email' | 'name' | 'password', boolean>>>({})
  const registerErrors: RegisterFieldErrors = (() => {
    if (mode !== 'register') return {}
    const r = registerSchema.safeParse({ email, name, password })
    if (r.success) return {}
    const out: RegisterFieldErrors = {}
    for (const iss of r.error.issues) {
      const k = iss.path[0] as 'email' | 'name' | 'password' | undefined
      if (k && !out[k]) out[k] = t(`auth.register.errors.${k}`, { defaultValue: iss.message })
    }
    return out
  })()
  const registerValid = Object.keys(registerErrors).length === 0
  const [loading, setLoading] = useState(false)
  const [quickIdx, setQuickIdx] = useState<number | null>(null)
  // Step-up MFA — when login returns mfaRequired we collect a TOTP code.
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  // SSO discovery — when the user types an enterprise email we ask the API
  // whether their domain has a WorkOS connection configured. If so, the form
  // hides the password and surfaces a "Continue with SSO" CTA instead.
  const [ssoAvailable, setSsoAvailable] = useState(false)
  const [ssoConnectionId, setSsoConnectionId] = useState<string | null>(null)
  const [ssoLoading, setSsoLoading] = useState(false)
  const ssoDebounce = useRef<number | null>(null)

  // Surface the "expired" banner when the API client bounces us here after a 401.
  useEffect(() => {
    if (params.get('expired') === '1') {
      setError(t('auth.login.sessionExpired'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // Leaving Chinese collapses back to email unless the user opened the options.
  useEffect(() => {
    if (!isZh && !moreOpen) setMethod('email')
  }, [isZh, moreOpen])

  // Debounced SSO discovery on email input. Quiet failure is fine — if the
  // domain isn't SSO-enabled we just show the password field.
  useEffect(() => {
    if (mode !== 'login') {
      setSsoAvailable(false); setSsoConnectionId(null)
      return
    }
    const at = email.indexOf('@')
    const hasDomain = at > 0 && email.length > at + 2
    if (!hasDomain) {
      setSsoAvailable(false); setSsoConnectionId(null)
      return
    }
    if (ssoDebounce.current) window.clearTimeout(ssoDebounce.current)
    ssoDebounce.current = window.setTimeout(async () => {
      try {
        const res = await authApi.ssoDiscover(email)
        if (res.ssoAvailable && res.connectionId) {
          setSsoAvailable(true); setSsoConnectionId(res.connectionId)
        } else {
          setSsoAvailable(false); setSsoConnectionId(null)
        }
      } catch {
        setSsoAvailable(false); setSsoConnectionId(null)
      }
    }, 400)
    return () => {
      if (ssoDebounce.current) window.clearTimeout(ssoDebounce.current)
    }
  }, [email, mode])

  const handleSsoContinue = async (overrideConnectionId?: string) => {
    setError(null); setSsoLoading(true)
    try {
      const body: { email?: string; connectionId?: string } = {}
      if (overrideConnectionId) body.connectionId = overrideConnectionId
      else if (ssoConnectionId) body.connectionId = ssoConnectionId
      else if (email) body.email = email
      const { authorizationUrl } = await authApi.ssoInitiate(body)
      window.location.assign(authorizationUrl)
    } catch (e) {
      setSsoLoading(false)
      setError(e instanceof Error ? e.message : t('auth.login.ssoStartFailed'))
    }
  }

  /**
   * Live-API login that handles the MFA gate. Returns:
   *   - 'ok' on full success (session set in context)
   *   - 'mfa' when a TOTP code is required (tempToken stored in state)
   *   - 'fail' on error (error state set)
   */
  const liveLogin = async (loginEmail: string, loginPassword: string): Promise<'ok' | 'mfa' | 'fail'> => {
    try {
      const res = await authApi.login(loginEmail, loginPassword)
      if ('mfaRequired' in res && res.mfaRequired) {
        setMfaTempToken(res.tempToken)
        return 'mfa'
      }
      // Normal session — push the token + hydrate the user via /me so the
      // AuthContext gets a User object the same way the SSO callback does.
      setToken(res.token)
      await refreshUser()
      return 'ok'
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.login.signInFailed'))
      return 'fail'
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'register') {
      setTouched({ email: true, name: true, password: true })
      if (!registerValid) { setLoading(false); return }
      const ok = await register({
        email,
        name,
        password,
        workspaceName: workspaceName.trim() || undefined,
      })
      setLoading(false)
      if (!ok) { setError(t('auth.register.failed')); return }
      navigate(homeRouteFor(user), { replace: true })
      return
    }

    const outcome = await liveLogin(email, password)
    setLoading(false)
    if (outcome === 'fail') return
    if (outcome === 'mfa') return // panel will render below
    navigate(homeRouteFor(user), { replace: true })
  }

  const handleQuickLogin = async (idx: number) => {
    const acc = ROLE_ACCOUNTS[idx]
    setQuickIdx(idx)
    setEmail(acc.email)
    setPassword(SHARED_PASSWORD)
    setError(null)
    setLoading(true)
    // Demo tile path still goes through the context login for now — demo
    // users don't have MFA enabled, so this short-circuits cleanly.
    const ok = await login(acc.email, SHARED_PASSWORD)
    setLoading(false)
    setQuickIdx(null)
    if (!ok) { setError(t('auth.login.quickFailed', { email: acc.email })); return }
    navigate(homeRouteFor(user), { replace: true })
  }

  const handleMfaSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!mfaTempToken) return
    setError(null)
    setMfaLoading(true)
    try {
      const res = await authApi.mfaVerify(mfaTempToken, mfaCode.trim())
      setToken(res.token)
      await refreshUser()
      setMfaTempToken(null)
      setMfaCode('')
      navigate(homeRouteFor(user), { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.mfa.invalidCode'))
    } finally {
      setMfaLoading(false)
    }
  }

  const cancelMfa = () => {
    setMfaTempToken(null)
    setMfaCode('')
    setPassword('')
    setError(null)
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setMethod('email')
    setError(null)
    setTouched({})
  }

  const showCn = mode === 'login' && (isZh || moreOpen)
  const showTabs = mode === 'login' && isZh
  const phone = mode === 'login' && method === 'phone'

  const heading = mfaTempToken ? t('auth.mfa.title') : mode === 'login' ? t('auth.login.heading') : t('auth.register.heading')
  const subtitle = mfaTempToken ? t('auth.mfa.subtitle') : mode === 'login' ? t('auth.login.subtitle') : t('auth.register.subtitle')

  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h1 id="form-title" className="type-h1" style={{ color: 'var(--text-primary)' }}>{heading}</h1>
          <p className="mt-2 type-body" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        </div>

        {/* ── MFA step-up panel ── */}
        {mfaTempToken && (
          <div className="space-y-4">
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <AuthField
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                icon={KeyRound}
                label={t('auth.mfa.codeLabel')}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123456"
                className="tracking-[0.3em] tabular-nums"
                hint={t('auth.mfa.lostDevice')}
              />
              <button
                type="submit"
                disabled={mfaLoading || mfaCode.trim().length < 6}
                className="btn-primary w-full h-11 text-[14px]"
              >
                {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>{t('auth.mfa.verify')}</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <button
                type="button"
                onClick={cancelMfa}
                className="w-full h-10 text-center type-small rounded-md hover:underline underline-offset-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('auth.mfa.cancel')}
              </button>
            </form>
          </div>
        )}

        {!mfaTempToken && (
          <>
            {/* Method tabs — Chinese UI: email or mobile + SMS code */}
            {showTabs && (
              <div
                role="tablist"
                aria-label={t('auth.cn.methodAria')}
                className="relative grid grid-cols-2 p-1 rounded-[12px]"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                {(['email', 'phone'] as const).map((m) => {
                  const active = method === m
                  const Icon = m === 'email' ? Mail : Smartphone
                  return (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      id={`tab-${m}`}
                      aria-selected={active}
                      aria-controls={`panel-${m}`}
                      onClick={() => { setMethod(m); setError(null) }}
                      className="relative h-10 inline-flex items-center justify-center gap-2 rounded-[9px] text-[14px] font-medium transition-colors"
                      style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                    >
                      {active && (
                        <motion.span
                          layoutId="login-method-pill"
                          className="absolute inset-0 rounded-[9px]"
                          style={{ background: 'var(--bg-primary)', boxShadow: 'var(--shadow-card), 0 0 0 1px var(--border-default)' }}
                          transition={spring.snappy}
                          aria-hidden
                        />
                      )}
                      <Icon className="relative w-4 h-4" aria-hidden />
                      <span className="relative">{t(`auth.cn.tabs.${m}`)}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              {phone ? (
                <motion.div
                  key="phone"
                  id="panel-phone"
                  role={showTabs ? 'tabpanel' : undefined}
                  aria-labelledby={showTabs ? 'tab-phone' : undefined}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: dur.fast, ease: ease.out }}
                  className="space-y-4"
                >
                  <PhoneSignIn />
                  {!showTabs && (
                    <button
                      type="button"
                      onClick={() => setMethod('email')}
                      className="inline-flex items-center gap-1.5 h-10 type-small rounded-md hover:underline underline-offset-4"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <ArrowLeft className="w-4 h-4" aria-hidden />
                      {t('auth.cn.backToEmail')}
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="email"
                  id="panel-email"
                  role={showTabs ? 'tabpanel' : undefined}
                  aria-labelledby={showTabs ? 'tab-email' : undefined}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: dur.fast, ease: ease.out }}
                  className="space-y-5"
                >
                  {/* Enterprise / regional single sign-on */}
                  {mode === 'login' && (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => handleSsoContinue()}
                        disabled={ssoLoading || loading}
                        aria-label={t('auth.sso.aria')}
                        aria-busy={ssoLoading}
                        title={t('auth.sso.title')}
                        className="btn-secondary w-full h-11 text-[14px] font-semibold"
                      >
                        {ssoLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Fingerprint className="w-4 h-4" style={{ color: 'var(--color-brand)' }} aria-hidden />}
                        {t('auth.sso.continueEnterprise')}
                      </button>

                      <AnimatePresence initial={false}>
                        {showCn && (
                          <motion.div
                            key="cn"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: dur.base, ease: ease.out }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2.5">
                              <CnProviderButtons />
                              {!showTabs && (
                                <button
                                  type="button"
                                  onClick={() => { setMethod('phone'); setError(null) }}
                                  className="btn-secondary w-full h-11 text-[14px]"
                                >
                                  <Smartphone className="w-4 h-4" aria-hidden />
                                  {t('auth.cn.usePhone')}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isZh && (
                        <button
                          type="button"
                          onClick={() => setMoreOpen((v) => !v)}
                          aria-expanded={moreOpen}
                          className="inline-flex items-center gap-1.5 h-10 type-small font-medium rounded-md"
                          style={{ color: 'var(--text-link)' }}
                        >
                          {moreOpen ? t('auth.cn.fewerOptions') : t('auth.cn.moreOptions')}
                          <ChevronDown
                            className="w-4 h-4 transition-transform duration-200"
                            style={{ transform: moreOpen ? 'rotate(180deg)' : 'none' }}
                            aria-hidden
                          />
                        </button>
                      )}
                    </div>
                  )}

                  {mode === 'login' && <Divider label={t('auth.login.orCredentials')} />}

                  {error && <ErrorBanner id="login-error">{error}</ErrorBanner>}

                  <form onSubmit={handleSubmit} noValidate aria-labelledby="form-title" className="space-y-4">
                    <AuthField
                      id="email"
                      type="email"
                      autoComplete="email"
                      icon={Mail}
                      label={t('login.email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched((tt) => ({ ...tt, email: true }))}
                      aria-required="true"
                      aria-invalid={mode === 'register' ? !!(touched.email && registerErrors.email) : error ? true : undefined}
                      aria-describedby={mode !== 'register' && error ? 'login-error' : undefined}
                      error={mode === 'register' && touched.email ? registerErrors.email : null}
                      placeholder="user@company.com"
                    />
                    {mode === 'register' && (
                      <>
                        <AuthField
                          id="name"
                          type="text"
                          autoComplete="name"
                          icon={User}
                          label={t('auth.register.fullName')}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onBlur={() => setTouched((tt) => ({ ...tt, name: true }))}
                          aria-required="true"
                          error={touched.name ? registerErrors.name : null}
                          placeholder={t('auth.register.namePlaceholder')}
                        />
                        <AuthField
                          id="workspace"
                          type="text"
                          autoComplete="organization"
                          icon={Building2}
                          label={<>{t('auth.register.workspace')} <span style={{ color: 'var(--text-tertiary)' }}>{t('auth.register.optional')}</span></>}
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          placeholder={t('auth.register.workspacePlaceholder')}
                        />
                      </>
                    )}
                    {/* When SSO is wired up for this email's domain, hide password
                        entry entirely and route the user via the IdP. They can still
                        flip back to a password sign-in if needed. */}
                    {mode === 'login' && ssoAvailable ? (
                      <div className="space-y-3">
                        <div
                          className="rounded-[10px] px-3.5 py-3 type-small"
                          style={{ background: 'var(--status-success-soft)', border: '1px solid var(--status-success-line)', color: 'var(--text-secondary)' }}
                        >
                          {t('auth.sso.enabledForDomain')}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSsoContinue()}
                          disabled={ssoLoading}
                          className="btn-primary w-full h-11 text-[14px]"
                        >
                          {ssoLoading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><span>{t('auth.sso.continue')}</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSsoAvailable(false); setSsoConnectionId(null) }}
                          className="w-full h-10 text-center type-small rounded-md hover:underline underline-offset-4"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {t('auth.sso.usePassword')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <AuthField
                          id="password"
                          type="password"
                          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                          icon={Lock}
                          label={t('login.password')}
                          labelAside={mode === 'login' ? (
                            <Link to="/forgot-password" className="type-small font-medium rounded-sm hover:underline underline-offset-4" style={{ color: 'var(--text-link)' }}>
                              {t('login.forgotPassword')}
                            </Link>
                          ) : undefined}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => setTouched((tt) => ({ ...tt, password: true }))}
                          aria-required="true"
                          aria-invalid={mode === 'register' ? !!(touched.password && registerErrors.password) : error ? true : undefined}
                          aria-describedby={mode !== 'register' && error ? 'login-error' : undefined}
                          error={mode === 'register' && touched.password ? registerErrors.password : null}
                          placeholder={mode === 'register' ? t('auth.register.minChars') : ''}
                        />
                        <button
                          type="submit"
                          disabled={loading || (mode === 'register' && !registerValid)}
                          aria-busy={loading}
                          className="btn-primary w-full h-11 text-[14px]"
                        >
                          {loading && quickIdx === null
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><span>{mode === 'login' ? t('login.signIn') : t('auth.register.submit')}</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                      </>
                    )}
                    <p className="text-center type-small" style={{ color: 'var(--text-secondary)' }}>
                      <button
                        type="button"
                        onClick={switchMode}
                        className="h-10 px-1 font-medium rounded-md hover:underline underline-offset-4"
                        style={{ color: 'var(--text-link)' }}
                      >
                        {mode === 'login' ? t('auth.login.needAccount') : t('auth.register.haveAccount')}
                      </button>
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick-login role tiles — real auth against Neon. Hidden in
                production builds where VITE_DEMO_PASSWORD isn't set, and
                hidden during MFA step-up. */}
            {mode === 'login' && DEMO_TILES_ENABLED && (
              <section
                aria-labelledby="demo-roles-title"
                className="rounded-[14px] p-4 sm:p-5"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <h2 id="demo-roles-title" className="type-h3" style={{ color: 'var(--text-primary)' }}>{t('auth.demo.title')}</h2>
                  <span className="type-caption" style={{ color: 'var(--text-tertiary)' }}>{t('auth.demo.note')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ROLE_ACCOUNTS.map((acc, i) => {
                    const isActive = quickIdx === i && loading
                    const label = t(`auth.roleTiles.${acc.role}.label`, { defaultValue: acc.label })
                    return (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => handleQuickLogin(i)}
                        disabled={loading}
                        aria-label={t('auth.login.quickAria', { role: label })}
                        aria-busy={isActive}
                        title={t(`auth.roleTiles.${acc.role}.desc`, { defaultValue: acc.desc })}
                        className="group relative flex items-center gap-2.5 min-h-[44px] px-2.5 py-2 rounded-[10px] text-left transition-[background-color,border-color,box-shadow] duration-150 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[var(--bg-primary)] hover:shadow-[var(--shadow-card)]"
                        style={{ border: `1px solid ${isActive ? 'var(--border-focus)' : 'transparent'}`, background: isActive ? 'var(--bg-primary)' : undefined }}
                      >
                        <span
                          aria-hidden
                          className="w-9 h-7 flex-shrink-0 rounded-[7px] inline-flex items-center justify-center text-[11px] font-semibold tabular-nums"
                          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand-strong)' }}
                        >
                          {isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : acc.role}
                        </span>
                        <span className="min-w-0 type-small font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{label}</span>
                        <ArrowRight className="ml-auto w-3.5 h-3.5 flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" style={{ color: 'var(--text-tertiary)' }} aria-hidden />
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AuthShell>
  )
}
