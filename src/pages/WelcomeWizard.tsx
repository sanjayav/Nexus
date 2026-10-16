import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, Check, Globe, Sparkles, Users, Factory, Library, Mail, Loader2, X } from 'lucide-react'
import { z } from 'zod'
import { useAuth } from '../auth/AuthContext'
import { orgStore } from '../lib/orgStore'
import { getActiveFrameworks } from '../lib/frameworks'
import { ROLE_CATALOG, type PlatformRole } from '../lib/rbac'
import JargonTooltip from '../components/JargonTooltip'
import { useTranslation } from 'react-i18next'
import { frameworkName } from '../components/FrameworkBadge'

/**
 * First-run onboarding wizard at `/welcome`. Five compact steps that bootstrap
 * a fresh workspace: identity → first facility → frameworks → invites → done.
 *
 * Gate logic: on entering the dashboard with zero facilities AND no
 * `aeiforo_onboarding_done_<orgId>` localStorage flag, redirect here.
 * The flag is set when the user finishes step 5 (or hits "Skip for now").
 *
 * Forms use hand-rolled zod parsing rather than react-hook-form to keep the
 * dependency footprint small. The pattern is identical (parse → render
 * field-level errors → block submit until valid).
 */

/** English labels; rendered via `onboarding.welcome.steps.s<i>`. */
const STEPS = ['Welcome', 'First facility', 'Frameworks', 'Invite teammates', 'All set'] as const
type StepIdx = 0 | 1 | 2 | 3 | 4

// GICS sector roll-up — short list is enough; users can refine later.
const GICS_SECTORS = [
  'Energy', 'Materials', 'Industrials', 'Consumer Discretionary',
  'Consumer Staples', 'Health Care', 'Financials', 'Information Technology',
  'Communication Services', 'Utilities', 'Real Estate',
]

const FACILITY_TYPES = [
  { value: 'refinery',  label: 'Refinery' },
  { value: 'factory',   label: 'Factory / plant' },
  { value: 'office',    label: 'Office' },
  { value: 'warehouse', label: 'Warehouse / DC' },
] as const

const STARTER_FRAMEWORKS = new Set(['gri', 'csrd-e1', 'tcfd'])

// ── Schemas ─────────────────────────────────────────────────
const welcomeSchema = z.object({
  workspaceName: z.string().trim().min(2, 'Workspace name needs at least 2 characters.'),
  industry: z.string().trim().min(1, 'Pick the closest GICS sector.'),
  country: z.string().trim().min(2, 'Country is required.'),
})
const facilitySchema = z.object({
  name: z.string().trim().min(2, 'Facility name needs at least 2 characters.'),
  location: z.string().trim().min(2, 'Location is required.'),
  type: z.enum(['refinery', 'factory', 'office', 'warehouse']),
  productionVolume: z.string().trim().optional(),
})
const inviteSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.string(),
})

type WelcomeData = z.infer<typeof welcomeSchema>
type FacilityData = z.infer<typeof facilitySchema>
type Invite = { email: string; role: PlatformRole }

// ── Country list (compact) ─────────────────────────────────
/**
 * Country options. `value` stays the English name (what gets stored);
 * `label` is localised for display when the UI language isn't English.
 */
function useCountries(language: string): Array<{ value: string; label: string }> {
  return useMemo(() => {
    const plain = (names: string[]) => names.map(n => ({ value: n, label: n }))
    try {
      if (typeof Intl === 'undefined' || !(Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf) {
        return plain(['United Kingdom', 'United States', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Thailand', 'India', 'Singapore'])
      }
      const codes = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('region')
      const dn = new Intl.DisplayNames(['en'], { type: 'region' })
      const locale = language.startsWith('zh') ? 'zh-CN' : language.startsWith('th') ? 'th' : 'en'
      const dnLocal = new Intl.DisplayNames([locale], { type: 'region' })
      const rows = codes
        .map(c => ({ value: dn.of(c), label: dnLocal.of(c) }))
        .filter((r): r is { value: string; label: string } => !!r.value && !!r.label && /^[A-Z]/.test(r.value))
      return locale === 'en'
        ? rows.sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0))
        : rows.sort((a, b) => a.label.localeCompare(b.label, locale))
    } catch {
      return plain(['United Kingdom', 'United States', 'Germany', 'Thailand', 'India'])
    }
  }, [language])
}

// ── Component ───────────────────────────────────────────────
function doneKey(orgId: string | null) {
  return `aeiforo_onboarding_done_${orgId || 'default'}`
}

export function isWelcomeDone(orgId: string | null): boolean {
  try { return localStorage.getItem(doneKey(orgId)) === '1' } catch { return false }
}

export default function WelcomeWizard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const orgId = (user as unknown as { org_id?: string | null } | null)?.org_id ?? null
  const [step, setStep] = useState<StepIdx>(0)

  // Step 1 — Welcome
  const [welcomeForm, setWelcomeForm] = useState<WelcomeData>({
    workspaceName: '', industry: '', country: '',
  })
  const [welcomeErrors, setWelcomeErrors] = useState<Partial<Record<keyof WelcomeData, string>>>({})

  // Step 2 — First facility
  const [facilityForm, setFacilityForm] = useState<FacilityData>({
    name: '', location: '', type: 'factory', productionVolume: '',
  })
  const [facilityErrors, setFacilityErrors] = useState<Partial<Record<keyof FacilityData, string>>>({})

  // Step 3 — Frameworks
  const [picked, setPicked] = useState<Set<string>>(new Set(STARTER_FRAMEWORKS))

  // Step 4 — Invites (up to 3)
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteDraft, setInviteDraft] = useState<{ email: string; role: PlatformRole }>({
    email: '', role: 'data_contributor',
  })
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Step 5 — submission + completion
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const countries = useCountries(i18n.language ?? 'en')

  const validate = <T,>(parse: () => T, setErr: (e: Record<string, string>) => void): T | null => {
    try {
      return parse()
    } catch (e) {
      if (e instanceof z.ZodError) {
        const out: Record<string, string> = {}
        // zod v4 stores issues on `.issues` (alias of `.errors`)
        const issues = (e as unknown as { issues?: { path: (string | number)[]; message: string }[]; errors?: { path: (string | number)[]; message: string }[] }).issues
          ?? (e as unknown as { errors?: { path: (string | number)[]; message: string }[] }).errors
          ?? []
        for (const iss of issues) {
          const k = String(iss.path[0] ?? '_')
          out[k] = t(`onboarding.welcome.errors.${k}`, { defaultValue: iss.message })
        }
        setErr(out)
      }
      return null
    }
  }

  const next = () => {
    if (step === 0) {
      const parsed = validate(() => welcomeSchema.parse(welcomeForm), setWelcomeErrors as (e: Record<string, string>) => void)
      if (!parsed) return
      setWelcomeErrors({})
    } else if (step === 1) {
      const parsed = validate(() => facilitySchema.parse(facilityForm), setFacilityErrors as (e: Record<string, string>) => void)
      if (!parsed) return
      setFacilityErrors({})
    }
    setStep(s => (Math.min(4, s + 1) as StepIdx))
  }
  const back = () => setStep(s => (Math.max(0, s - 1) as StepIdx))

  const skip = () => {
    try { localStorage.setItem(doneKey(orgId), '1') } catch { /* ignore */ }
    navigate('/dashboard', { replace: true })
  }

  const finish = async () => {
    setSubmitting(true)
    setServerError(null)
    try {
      // 1) Seed the org tree with a group + first plant.
      const group = await orgStore.addEntity({
        type: 'group',
        name: welcomeForm.workspaceName,
        country: welcomeForm.country,
        industry: welcomeForm.industry,
        parentId: null,
      })
      await orgStore.addEntity({
        type: facilityForm.type === 'office' ? 'office' : 'plant',
        name: facilityForm.name,
        country: welcomeForm.country,
        parentId: group.id,
      })
      // 2) Send invites (fire-and-forget — failures don't block completion).
      await Promise.allSettled(invites.map(inv =>
        orgStore.addMember({
          userId: null,
          name: inv.email.split('@')[0],
          email: inv.email,
          role: inv.role,
          entityId: group.id,
        })
      ))
      // 3) Persist framework picks (best-effort — localStorage fallback).
      try { localStorage.setItem('aeiforo_enabled_frameworks', JSON.stringify([...picked])) } catch { /* ignore */ }
      try { localStorage.setItem(doneKey(orgId), '1') } catch { /* ignore */ }
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t('onboarding.welcome.saveFailed'))
      setSubmitting(false)
    }
  }

  // Keyboard shortcut: Enter on last step finishes; on others advances.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const target = e.target as HTMLElement | null
      // Don't hijack Enter inside textareas, etc.
      if (target && (target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true')) return
      e.preventDefault()
      if (step === 4) void finish()
      else next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, welcomeForm, facilityForm, invites, picked])

  return (
    <div className="max-w-[760px] mx-auto animate-fade-in">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-micro uppercase tracking-[0.06em] font-semibold text-[var(--color-brand)]">
          <Sparkles className="w-3 h-3" /> {t('components.tour.steps.welcome.title')}
        </div>
        <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)] mt-1">{t('onboarding.welcome.title')}</h1>
        <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)] mt-1">
          {t('onboarding.welcome.subtitle')}
        </p>
      </header>

      <ProgressBar step={step} />

      <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-6">
        {step === 0 && (
          <Step1
            value={welcomeForm}
            errors={welcomeErrors}
            countries={countries}
            onChange={setWelcomeForm}
          />
        )}
        {step === 1 && (
          <Step2
            value={facilityForm}
            errors={facilityErrors}
            onChange={setFacilityForm}
          />
        )}
        {step === 2 && (
          <Step3 picked={picked} onToggle={id => {
            setPicked(p => {
              const next = new Set(p)
              if (next.has(id)) next.delete(id); else next.add(id)
              return next
            })
          }} />
        )}
        {step === 3 && (
          <Step4
            invites={invites}
            draft={inviteDraft}
            draftError={inviteError}
            onDraftChange={setInviteDraft}
            onAdd={() => {
              try {
                inviteSchema.parse(inviteDraft)
              } catch (e) {
                if (e instanceof z.ZodError) {
                  const issues = (e as unknown as { issues?: { message: string }[] }).issues
                    ?? (e as unknown as { errors?: { message: string }[] }).errors
                    ?? []
                  setInviteError(issues[0] ? t('auth.register.errors.email') : t('onboarding.welcome.invalidInvite'))
                }
                return
              }
              if (invites.length >= 3) { setInviteError(t('onboarding.welcome.inviteLimit')); return }
              if (invites.some(i => i.email.toLowerCase() === inviteDraft.email.toLowerCase())) {
                setInviteError(t('onboarding.welcome.inviteDuplicate')); return
              }
              setInvites(arr => [...arr, { email: inviteDraft.email, role: inviteDraft.role }])
              setInviteDraft({ email: '', role: 'data_contributor' })
              setInviteError(null)
            }}
            onRemove={i => setInvites(arr => arr.filter((_, k) => k !== i))}
          />
        )}
        {step === 4 && (
          <Step5
            workspaceName={welcomeForm.workspaceName}
            facility={facilityForm}
            picked={picked}
            invites={invites}
            serverError={serverError}
            onFinish={finish}
            submitting={submitting}
          />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            onClick={back}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <button
            onClick={skip}
            className="px-3 py-2 text-[length:var(--text-xs)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {t('onboarding.welcome.skip')}
          </button>
          {step < 4 ? (
            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-sm)] font-semibold hover:bg-[var(--btn-primary-bg-hover)] transition-colors"
            >
              {t('onboarding.welcome.continue')} <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-sm)] font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t('onboarding.welcome.goToDashboard')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ step }: { step: StepIdx }) {
  const { t } = useTranslation()
  return (
    <ol className="flex items-center gap-2 text-caption">
      {STEPS.map((label, i) => {
        const done = i < step
        const active = i === step
        return (
          <li key={label} className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-colors ${
                done ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
                  : active ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)] border border-[var(--color-brand)]/40'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'
              }`}
            >
              {done ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`truncate ${active ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-tertiary)]'}`}>{t(`onboarding.welcome.steps.s${i}`, { defaultValue: label })}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-[var(--border-subtle)] mx-1" />}
          </li>
        )
      })}
    </ol>
  )
}

// ── Step 1 ─────────────────────────────────────────────────
function Step1({
  value, errors, countries, onChange,
}: {
  value: WelcomeData
  errors: Partial<Record<keyof WelcomeData, string>>
  countries: Array<{ value: string; label: string }>
  onChange: (v: WelcomeData) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <SectionHeading icon={Building2} title={t('onboarding.welcome.step1.title')} />
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Field label={t('onboarding.welcome.step1.workspaceName')} error={errors.workspaceName} id="wn">
          <input
            id="wn"
            autoFocus
            value={value.workspaceName}
            onChange={e => onChange({ ...value, workspaceName: e.target.value })}
            aria-invalid={!!errors.workspaceName}
            aria-describedby={errors.workspaceName ? 'wn-err' : undefined}
            placeholder={t('auth.register.workspacePlaceholder')}
            className={inputCls(!!errors.workspaceName)}
          />
        </Field>
        <Field label={t('onboarding.welcome.step1.industry')} error={errors.industry} id="ind">
          <select
            id="ind"
            value={value.industry}
            onChange={e => onChange({ ...value, industry: e.target.value })}
            aria-invalid={!!errors.industry}
            aria-describedby={errors.industry ? 'ind-err' : undefined}
            className={inputCls(!!errors.industry)}
          >
            <option value="">{t('onboarding.welcome.step1.pickSector')}</option>
            {GICS_SECTORS.map(s => <option key={s} value={s}>{t(`onboarding.gics.${s}`, { defaultValue: s })}</option>)}
          </select>
        </Field>
        <Field label={t('onboarding.welcome.step1.country')} error={errors.country} id="cty">
          <select
            id="cty"
            value={value.country}
            onChange={e => onChange({ ...value, country: e.target.value })}
            aria-invalid={!!errors.country}
            aria-describedby={errors.country ? 'cty-err' : undefined}
            className={inputCls(!!errors.country)}
          >
            <option value="">{t('onboarding.welcome.step1.pickCountry')}</option>
            {countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </div>
    </>
  )
}

// ── Step 2 ─────────────────────────────────────────────────
function Step2({
  value, errors, onChange,
}: {
  value: FacilityData
  errors: Partial<Record<keyof FacilityData, string>>
  onChange: (v: FacilityData) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <SectionHeading icon={Factory} title={t('onboarding.welcome.step2.title')} />
      <p className="text-[length:var(--text-sm)] text-[var(--text-tertiary)] mt-1">
        {t('onboarding.welcome.step2.body')}
      </p>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Field label={t('onboarding.welcome.step2.name')} error={errors.name} id="fn">
          <input
            id="fn"
            autoFocus
            value={value.name}
            onChange={e => onChange({ ...value, name: e.target.value })}
            aria-invalid={!!errors.name}
            placeholder={t('onboarding.welcome.step2.namePlaceholder')}
            className={inputCls(!!errors.name)}
          />
        </Field>
        <Field label={t('onboarding.welcome.step2.location')} error={errors.location} id="loc">
          <input
            id="loc"
            value={value.location}
            onChange={e => onChange({ ...value, location: e.target.value })}
            aria-invalid={!!errors.location}
            placeholder={t('onboarding.welcome.step2.locationPlaceholder')}
            className={inputCls(!!errors.location)}
          />
        </Field>
        <Field label={t('onboarding.welcome.step2.type')} id="ft">
          <select
            id="ft"
            value={value.type}
            onChange={e => onChange({ ...value, type: e.target.value as FacilityData['type'] })}
            className={inputCls(false)}
          >
            {FACILITY_TYPES.map(ft => <option key={ft.value} value={ft.value}>{t(`onboarding.welcome.facilityTypes.${ft.value}`, { defaultValue: ft.label })}</option>)}
          </select>
        </Field>
        <Field label={t('onboarding.welcome.step2.volume')} hint={t('onboarding.welcome.step2.volumeHint')} id="pv">
          <input
            id="pv"
            value={value.productionVolume ?? ''}
            onChange={e => onChange({ ...value, productionVolume: e.target.value })}
            placeholder={t('onboarding.welcome.step2.volumePlaceholder')}
            className={inputCls(false)}
          />
        </Field>
      </div>
    </>
  )
}

// ── Step 3 ─────────────────────────────────────────────────
function Step3({ picked, onToggle }: { picked: Set<string>; onToggle: (id: string) => void }) {
  const { t, i18n } = useTranslation()
  const frameworks = getActiveFrameworks()
  return (
    <>
      <SectionHeading icon={Library} title={t('onboarding.welcome.step3.title')} />
      <p className="text-[length:var(--text-sm)] text-[var(--text-tertiary)] mt-1">
        {t('onboarding.welcome.step3.preselected')}{' '}
        <JargonTooltip term="GRI" />{t('onboarding.welcome.listSep')}<JargonTooltip term="ESRS E1" />{t('onboarding.welcome.listSep')}<JargonTooltip term="TCFD" />{t('onboarding.welcome.step3.endSentence')}
        {t('onboarding.welcome.step3.tweak')}
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {frameworks.map(f => {
          const checked = picked.has(f.id)
          const recommended = STARTER_FRAMEWORKS.has(f.id)
          return (
            <li key={f.id}>
              <label className={`flex items-start gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                checked
                  ? 'border-[var(--color-brand)]/50 bg-[var(--color-brand-soft)]'
                  : 'border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'
              }`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(f.id)}
                  className="mt-1 h-3.5 w-3.5 rounded text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)]">{f.code}</span>
                    {recommended && (
                      <span className="text-micro uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-brand)]/20 text-[var(--color-brand-strong)] font-semibold">
                        {t('onboarding.welcome.step3.recommended')}
                      </span>
                    )}
                  </div>
                  <div className="text-caption text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{frameworkName(f, i18n.language)}</div>
                </div>
              </label>
            </li>
          )
        })}
      </ul>
    </>
  )
}

// ── Step 4 ─────────────────────────────────────────────────
function Step4({
  invites, draft, draftError, onDraftChange, onAdd, onRemove,
}: {
  invites: Invite[]
  draft: { email: string; role: PlatformRole }
  draftError: string | null
  onDraftChange: (v: { email: string; role: PlatformRole }) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <SectionHeading icon={Users} title={t('onboarding.welcome.step4.title')} />
      <p className="text-[length:var(--text-sm)] text-[var(--text-tertiary)] mt-1">
        {t('onboarding.welcome.step4.body')}
      </p>
      <div className="mt-4 grid grid-cols-[1fr_180px_auto] gap-2">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={draft.email}
            onChange={e => onDraftChange({ ...draft, email: e.target.value })}
            placeholder="teammate@company.com"
            type="email"
            aria-invalid={!!draftError}
            aria-describedby={draftError ? 'invite-err' : undefined}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
            className={`w-full pl-9 pr-3 h-10 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] text-[length:var(--text-sm)] ${
              draftError ? 'border-[var(--status-reject)]' : 'border-[var(--border-default)]'
            }`}
          />
        </div>
        <select
          value={draft.role}
          onChange={e => onDraftChange({ ...draft, role: e.target.value as PlatformRole })}
          className="h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)]"
        >
          {Object.values(ROLE_CATALOG).map(r => (
            <option key={r.slug} value={r.slug}>{t(`shell.roles.${r.slug}.name`, { defaultValue: r.name })}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onAdd}
          disabled={!draft.email}
          className="px-4 h-10 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-sm)] font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-50 transition-colors"
        >
          {t('onboarding.welcome.step4.add')}
        </button>
      </div>
      {draftError && (
        <p id="invite-err" role="alert" className="mt-1 text-[12px] text-[var(--status-reject)]">{draftError}</p>
      )}
      {invites.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {invites.map((inv, i) => (
            <li key={`${inv.email}-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)]">
              <Mail className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="text-[length:var(--text-sm)] text-[var(--text-primary)] truncate flex-1">{inv.email}</span>
              <span className="text-micro uppercase tracking-wider font-semibold text-[var(--color-brand)] bg-[var(--color-brand-soft)] px-1.5 py-0.5 rounded">
                {t(`shell.roles.${inv.role}.name`, { defaultValue: ROLE_CATALOG[inv.role].name })}
              </span>
              <button
                onClick={() => onRemove(i)}
                aria-label={t('onboarding.welcome.step4.remove', { email: inv.email })}
                className="w-6 h-6 rounded text-[var(--text-tertiary)] hover:text-[var(--status-reject)] hover:bg-[var(--accent-red-light)] flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ── Step 5 ─────────────────────────────────────────────────
function Step5({
  workspaceName, facility, picked, invites, serverError, onFinish, submitting,
}: {
  workspaceName: string
  facility: FacilityData
  picked: Set<string>
  invites: Invite[]
  serverError: string | null
  onFinish: () => void
  submitting: boolean
}) {
  const { t } = useTranslation()
  const frameworks = getActiveFrameworks().filter(f => picked.has(f.id))
  return (
    <>
      <SectionHeading icon={Globe} title={t('onboarding.welcome.step5.title')} />
      <p className="text-[length:var(--text-sm)] text-[var(--text-tertiary)] mt-1">
        {t('onboarding.welcome.step5.body')}
      </p>
      <div className="mt-4 space-y-3">
        <Summary label={t('onboarding.welcome.step5.workspace')} value={workspaceName || t('onboarding.welcome.step5.notSet')} />
        <Summary label={t('onboarding.welcome.step5.facility')} value={facility.name ? `${facility.name} · ${facility.location}` : t('onboarding.welcome.step5.notSet')} />
        <Summary
          label={t('onboarding.welcome.step5.frameworks')}
          value={frameworks.length ? frameworks.map(f => f.code).join(', ') : t('onboarding.welcome.step5.noneSelected')}
        />
        <Summary
          label={t('onboarding.welcome.step5.invites')}
          value={invites.length ? t('onboarding.welcome.step5.teammates', { count: invites.length }) : t('onboarding.welcome.step5.none')}
        />
      </div>
      {serverError && (
        <div role="alert" className="mt-4 flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--accent-red-light)] text-[12px] text-[var(--status-reject)]">
          {serverError}
        </div>
      )}
      <button
        onClick={onFinish}
        disabled={submitting}
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-sm)] font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-50 transition-colors"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {t('onboarding.welcome.goToDashboard')}
      </button>
    </>
  )
}

// ── Shared primitives ──────────────────────────────────────
function SectionHeading({ icon: Icon, title }: { icon: typeof Building2; title: string }) {
  return (
    <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)] flex items-center gap-2">
      <Icon className="w-4 h-4 text-[var(--color-brand)]" />
      {title}
    </h2>
  )
}

function Field({
  label, error, hint, id, children,
}: {
  label: string
  error?: string
  hint?: string
  id: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1 text-[12px] text-[var(--status-reject)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-caption text-[var(--text-tertiary)]">{hint}</p>
      ) : null}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return `w-full h-10 px-3 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] text-[length:var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/40 focus:border-[var(--color-brand)] transition-colors ${
    hasError ? 'border-[var(--status-reject)]' : 'border-[var(--border-default)]'
  }`
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border-subtle)]">
      <span className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)]">{label}</span>
      <span className="text-[length:var(--text-sm)] text-[var(--text-primary)] font-medium text-right truncate max-w-[60%]">{value}</span>
    </div>
  )
}
