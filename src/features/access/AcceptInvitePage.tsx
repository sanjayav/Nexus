import { FormEvent, ReactNode, useId, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Box, Eye, EyeOff, Info, Link2Off, TimerOff } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { Avatar, Button, FadeIn } from '@/components/ui'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { REGIONS, WORKSPACES } from '@/config/regions'
import { useL10n } from '@/features/workspace/WorkspaceContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { findInvite, getSlice, hashPassword, useAccessStore } from './store'
import { INVITE_TTL_DAYS, isExpired } from './model'
import { accessStrings } from './access.strings'

const MIN_PASSWORD = 8

const inputClass =
  'w-full h-11 px-3.5 rounded-xl bg-white border border-line text-[15px] text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60 transition-shadow aria-[invalid=true]:border-rose-300'

/** Public page behind an invitation link: confirm who you are, set a password, join. */
export default function AcceptInvitePage() {
  const { token = '' } = useParams<{ token: string }>()
  const s = useStrings(accessStrings).invite
  const roles = useStrings(accessStrings).roles
  const all = useStrings(accessStrings).allFrameworks
  const l10n = useL10n()
  const f = useFormat()
  const fw = useFrameworkLabels()
  const navigate = useNavigate()
  const { user, startSession } = useAuth()
  const workspaces = useAccessStore(st => st.workspaces)
  const invite = useMemo(() => findInvite({ workspaces }, token), [workspaces, token])

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [consent, setConsent] = useState(false)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<'expired' | 'notFound' | null>(null)
  const ids = { name: useId(), password: useId(), consent: useId() }

  if (!invite || failure === 'notFound') {
    return (
      <Frame>
        <Outcome icon={Link2Off} title={s.invalidTitle} body={s.invalidBody} action={s.toSignIn} />
      </Frame>
    )
  }

  const { ws, member } = invite
  const workspace = WORKSPACES.find(w => w.id === ws)!
  const region = REGIONS[workspace.region]
  const inviter = getSlice({ workspaces }, ws).members.find(m => m.id === member.invitedBy)

  if (isExpired(member) || failure === 'expired') {
    return (
      <Frame>
        <Outcome
          icon={TimerOff}
          title={s.expiredTitle}
          body={fmt(s.expiredBody, { days: INVITE_TTL_DAYS, inviter: inviter?.name ?? '—' })}
          action={s.toSignIn}
        />
      </Frame>
    )
  }

  // A provisional name (the address' local part) is replaced by what the person types.
  const defaultName = member.name === member.email.split('@')[0] ? '' : member.name
  const finalName = name || defaultName
  const errors = {
    name: !finalName.trim() ? s.nameRequired : null,
    password: password.length < MIN_PASSWORD ? s.passwordShort : null,
    consent: !consent ? s.consentRequired : null,
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (errors.name || errors.password || errors.consent) return
    setBusy(true)
    const result = useAccessStore.getState().acceptInvite(token, { name: finalName, passwordHash: await hashPassword(password) })
    setBusy(false)
    if (!result.ok) return setFailure(result.error)
    startSession(result.value.ws, result.value.member.id, result.value.member.email)
    navigate('/', { replace: true })
  }

  const frameworks = member.scope.length ? member.scope.map(id => fw.short(id)).join(' · ') : all

  return (
    <Frame>
      <FadeIn className="w-full max-w-[420px]">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center text-lg font-semibold shadow-fill">
          {l10n(workspace.name).slice(0, 1)}
        </div>
        <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.02em] text-zinc-900 leading-tight">
          {fmt(s.join, { workspace: l10n(workspace.name) })}
        </h1>
        <p className="mt-2 text-[15px] text-zinc-600 leading-relaxed">
          {fmt(s.invitedBy, { inviter: inviter?.name ?? '—', role: roles[member.role].name })}
        </p>

        <dl className="mt-6 rounded-xl border border-line bg-white shadow-card divide-y divide-line text-[13px]">
          {[
            [s.workspaceLabel, `${l10n(workspace.name)} · ${l10n(region.label)}`],
            [s.roleLabel, roles[member.role].name],
            [s.frameworks, frameworks],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start gap-4 px-4 py-2.5">
              <dt className="w-20 shrink-0 text-zinc-500">{k}</dt>
              <dd className="min-w-0 text-zinc-900 font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        {user && user.email !== member.email && (
          <p className="mt-4 flex items-start gap-2 text-[13px] text-zinc-600">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-zinc-400" aria-hidden />
            {fmt(s.signedInAs, { email: user.email })}
          </p>
        )}

        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <p className="flex items-center gap-2.5 text-[13px] text-zinc-600">
            <Avatar name={finalName || member.email} size="sm" />
            <span className="min-w-0">{fmt(s.sentTo, { email: member.email })}</span>
          </p>

          <div className="space-y-1.5">
            <label htmlFor={ids.name} className="block text-[13px] font-medium text-zinc-700">
              {s.name}
            </label>
            <input
              id={ids.name}
              value={finalName}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              aria-invalid={tried && !!errors.name}
              className={inputClass}
              autoFocus
            />
            {tried && errors.name && <FieldError>{errors.name}</FieldError>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={ids.password} className="block text-[13px] font-medium text-zinc-700">
              {s.password}
            </label>
            <div className="relative">
              <input
                id={ids.password}
                type={reveal ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-invalid={tried && !!errors.password}
                aria-describedby={`${ids.password}-hint`}
                className={clsx(inputClass, 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setReveal(r => !r)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label={reveal ? s.hide : s.show}
                aria-pressed={reveal}
              >
                {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {tried && errors.password ? (
              <FieldError>{errors.password}</FieldError>
            ) : (
              <p id={`${ids.password}-hint`} className="text-xs text-zinc-500">
                {s.passwordHint}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.consent} className="flex items-start gap-2.5 text-[13px] text-zinc-600 leading-relaxed cursor-pointer">
              <input
                id={ids.consent}
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                aria-invalid={tried && !!errors.consent}
                className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-brand-500/30"
              />
              <span>{fmt(s.consent, { privacy: l10n(region.privacy) })}</span>
            </label>
            {tried && errors.consent && <FieldError>{errors.consent}</FieldError>}
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
            {busy ? s.joining : s.accept}
          </Button>
          {member.expiresAt && (
            <p className="text-center text-xs text-zinc-500">
              {fmt(s.expiresIn, { when: f.date(member.expiresAt, { dateStyle: 'medium', timeStyle: 'short' }) })}
            </p>
          )}
        </form>
      </FadeIn>
    </Frame>
  )
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-700">
      <AlertCircle className="w-3.5 h-3.5" aria-hidden />
      {children}
    </p>
  )
}

function Outcome({ icon: Icon, title, body, action }: { icon: typeof Info; title: string; body: string; action: string }) {
  return (
    <FadeIn className="w-full max-w-[420px] text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-900/[0.05] text-zinc-600 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-[-0.015em] text-zinc-900">{title}</h1>
      <p className="mt-2 text-[14px] text-zinc-600 leading-relaxed">{body}</p>
      <Link
        to="/login"
        className="mt-6 inline-flex items-center justify-center h-9 px-3.5 rounded-[10px] bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
      >
        {action}
      </Link>
    </FadeIn>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-canvas flex flex-col">
      <header className="flex items-center justify-between h-16 px-5 sm:px-8">
        <Link to="/login" className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <Box className="w-4 h-4 text-white" />
          </span>
          <span className="text-base font-semibold tracking-tight text-zinc-900">
            Nexus<span className="text-brand-500">.</span>
          </span>
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-5 sm:px-8 pt-6 pb-16">{children}</main>
    </div>
  )
}
