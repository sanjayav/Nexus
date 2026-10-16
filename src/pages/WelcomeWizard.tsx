import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Building2, Check, Compass, Factory, Globe2, Landmark, Mail, Plus, X, Zap,
} from 'lucide-react'
import { z } from 'zod'
import { useAuth } from '../auth/AuthContext'
import { orgStore, type PreferredEmissionFactor } from '../lib/orgStore'
import { orgSettings, type OrgMarket } from '../lib/api'
import { getActiveFrameworks } from '../lib/frameworks'
import { ROLE_CATALOG, type PlatformRole } from '../lib/rbac'
import { useTranslation } from 'react-i18next'
import { frameworkName } from '../components/FrameworkBadge'
import Button from '../design-system/components/Button'
import Illustration, { type IllustrationName } from '../design-system/illustrations/Illustration'
import { ContourField } from '../design-system/illustrations/ContourField'
import { StateBoundary, StatusPill, notify, SkeletonCard } from '../components/ui'
import SetupChecklist, { SetupRing } from '../components/onboarding/SetupChecklist'
import useSetupProgress, { invalidateSetup } from '../components/onboarding/useSetupProgress'
import { invalidateOrgMarket, CN_FRAMEWORKS } from '../components/analytics/useOrgMarket'
import { startTour } from '../components/onboarding/tour'
import DemoSeedModal from '../components/DemoSeedModal'
import { useFmt } from '../lib/fmt'
import { spring, transition, staggerDelay } from '../motion/tokens'

/**
 * /welcome — the one guided setup.
 *
 *   Empty workspace → a five-step split-screen wizard: the form on the left,
 *   a live preview of the workspace being built on the right (entity tree,
 *   frameworks, team) with a step illustration. "Start with sample data" is
 *   the alternative path.
 *
 *   Anything already set up → the setup hub: the real-state checklist
 *   (shared with the sidebar and My Day), market-specific recommendations
 *   and the optional tour.
 *
 * China-market workspaces (chosen here, or market = cn in settings) are
 * steered to CN-SSE / CSDS / HKEX ESG, MEE grid factors and the
 * Market & compliance settings.
 */

type StepIdx = 0 | 1 | 2 | 3 | 4
const STEP_ART: IllustrationName[] = ['setup', 'connect', 'materiality', 'inbox', 'published']
const STEP_KEYS = ['org', 'site', 'frameworks', 'team', 'review'] as const

// GICS sector roll-up — short list is enough; users can refine later.
const GICS_SECTORS = [
  'Energy', 'Materials', 'Industrials', 'Consumer Discretionary',
  'Consumer Staples', 'Health Care', 'Financials', 'Information Technology',
  'Communication Services', 'Utilities', 'Real Estate',
]

const FACILITY_TYPES = ['refinery', 'factory', 'office', 'warehouse'] as const

const STARTER: Record<OrgMarket, string[]> = {
  global: ['gri', 'csrd-e1', 'tcfd'],
  cn: ['cn-sse', 'cn-csds', 'hkex-esg'],
}

const welcomeSchema = z.object({
  workspaceName: z.string().trim().min(2, 'Workspace name needs at least 2 characters.'),
  industry: z.string().trim().min(1, 'Pick the closest GICS sector.'),
  country: z.string().trim().min(2, 'Country is required.'),
})
const facilitySchema = z.object({
  name: z.string().trim().min(2, 'Facility name needs at least 2 characters.'),
  location: z.string().trim().min(2, 'Location is required.'),
  type: z.enum(FACILITY_TYPES),
  productionVolume: z.string().trim().optional(),
})
const inviteSchema = z.object({ email: z.string().trim().email(), role: z.string() })

type WelcomeData = z.infer<typeof welcomeSchema>
type FacilityData = z.infer<typeof facilitySchema>
type Invite = { email: string; role: PlatformRole }

const isCnCountry = (c: string) => /China|Hong Kong|Macao|Macau|中国|香港|澳门/i.test(c)

/** Country options: `value` stays the English name (stored); `label` is localised. */
function useCountries(language: string): Array<{ value: string; label: string }> {
  return useMemo(() => {
    const plain = (names: string[]) => names.map(n => ({ value: n, label: n }))
    try {
      const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
      if (!sv) return plain(['China', 'Hong Kong SAR China', 'United Kingdom', 'United States', 'Germany', 'Singapore', 'Thailand'])
      const codes = sv('region')
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
      return plain(['China', 'United Kingdom', 'United States', 'Germany', 'Thailand'])
    }
  }, [language])
}

function doneKey(orgId: string | null) {
  return `aeiforo_onboarding_done_${orgId || 'default'}`
}

export function isWelcomeDone(orgId: string | null): boolean {
  try { return localStorage.getItem(doneKey(orgId)) === '1' } catch { return false }
}

export default function WelcomeWizard() {
  const { t } = useTranslation()
  const progress = useSetupProgress()
  const [params] = useSearchParams()
  const forceWizard = params.get('view') === 'wizard'

  return (
    <div className="page-container">
      <StateBoundary
        loading={progress.loading}
        error={progress.error}
        onRetry={progress.refresh}
        skeleton={<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6"><SkeletonCard /><SkeletonCard /></div>}
        errorState={{ title: t('onboarding.hub.errorTitle') }}
      >
        {() => (progress.isEmptyWorkspace || forceWizard ? <Wizard onFinished={progress.refresh} defaultMarket={progress.market.isCn ? 'cn' : undefined} /> : <SetupHub progress={progress} />)}
      </StateBoundary>
    </div>
  )
}

/* ─────────────────────────── Setup hub ─────────────────────────── */

function SetupHub({ progress }: { progress: ReturnType<typeof useSetupProgress> }) {
  const { t } = useTranslation()
  const { cn, market } = progress
  return (
    <div className="space-y-6">
      <section className="surface-hero relative overflow-hidden rounded-[var(--radius-2xl)] px-5 py-7 sm:px-8 sm:py-9">
        <div aria-hidden className="pointer-events-none absolute inset-0 text-[var(--color-brand)] opacity-60">
          <ContourField anchor="top-right" rings={16} animate className="w-full h-full" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <SetupRing pct={progress.pct} size={88} stroke={7} label={<span className="type-figure text-[22px] text-[var(--text-primary)] tabular-nums">{progress.pct}%</span>} />
          <div className="min-w-0 flex-1">
            <p className="text-caption font-medium text-[var(--color-brand)]">{t('onboarding.hub.eyebrow')}</p>
            <h1 className="type-h1 text-[var(--text-primary)] mt-1">
              {progress.isDone ? t('onboarding.hub.doneTitle') : t('onboarding.hub.title')}
            </h1>
            <p className="text-small text-[var(--text-secondary)] mt-1.5 max-w-[60ch]">
              {progress.isDone ? t('onboarding.hub.doneBody') : t('onboarding.hub.body', { completed: progress.completed, total: progress.total })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {progress.next && (
              <Link to={progress.next.route} className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] transition-colors duration-micro">
                {t(`onboarding.setup.steps.${progress.next.key}.title`)} <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            )}
            <Link to="/" className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              {t('onboarding.hub.myDay')}
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <SetupChecklist progress={progress} variant="card" hideHeader />
        <aside className="space-y-4">
          <MarketCard cn={cn} enabled={market.enabled} />
          <section className="surface-paper p-5 flex items-start gap-4">
            <Illustration name="inbox" size={72} className="flex-shrink-0 -my-1" />
            <div className="min-w-0">
              <h2 className="text-small font-semibold text-[var(--text-primary)]">{t('onboarding.hub.tourTitle')}</h2>
              <p className="text-caption text-[var(--text-secondary)] mt-0.5">{t('onboarding.hub.tourBody')}</p>
              <button type="button" onClick={startTour} className="mt-2 inline-flex items-center gap-1.5 min-h-[36px] text-caption font-semibold text-[var(--color-brand)] hover:underline">
                <Compass className="w-3.5 h-3.5" aria-hidden /> {t('onboarding.setup.takeTour')}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

/** Market-specific recommendations: frameworks, factors, settings. */
function MarketCard({ cn, enabled }: { cn: boolean; enabled: string[] }) {
  const { t, i18n } = useTranslation()
  const frameworks = getActiveFrameworks().filter(f => (cn ? STARTER.cn : STARTER.global).includes(f.id))
  return (
    <section className="surface-paper overflow-hidden" aria-labelledby="market-card-h">
      <header className="px-5 pt-5 pb-3">
        <h2 id="market-card-h" className="text-small font-semibold text-[var(--text-primary)]">{t(cn ? 'onboarding.hub.cnTitle' : 'onboarding.hub.globalTitle')}</h2>
        <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t(cn ? 'onboarding.hub.cnBody' : 'onboarding.hub.globalBody')}</p>
      </header>
      <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
        {frameworks.map(f => (
          <li key={f.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-caption font-semibold text-[var(--text-primary)]">{f.code}</span>
              <span className="block text-caption text-[var(--text-tertiary)] truncate">{frameworkName(f, i18n.language)}</span>
            </span>
            {enabled.includes(f.id)
              ? <StatusPill tone="success" size="sm" icon={<Check />}>{t('onboarding.hub.enabled')}</StatusPill>
              : <Link to="/settings?tab=frameworks" className="text-caption font-medium text-[var(--color-brand)] hover:underline whitespace-nowrap">{t('onboarding.hub.enable')}</Link>}
          </li>
        ))}
        {cn && (
          <>
            <li className="px-5 py-2.5"><CnFactorLine /></li>
            <li className="px-5 py-3">
              <Link to="/settings?tab=market" className="inline-flex items-center gap-1.5 text-caption font-semibold text-[var(--color-brand)] hover:underline">
                {t('onboarding.hub.marketSettings')} <ArrowRight className="w-3 h-3" aria-hidden />
              </Link>
            </li>
          </>
        )}
      </ul>
    </section>
  )
}

/** The preferred CN national grid factor (MEE) the calculators will use. */
function CnFactorLine() {
  const { t } = useTranslation()
  const f = useFmt()
  const [factor, setFactor] = useState<PreferredEmissionFactor | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    orgStore.listEmissionFactors({ scope: 2, region: 'CN', preferredOnly: true })
      .then(r => { if (alive) setFactor((Array.isArray(r) ? r : []).find(x => x.region === 'CN') ?? (Array.isArray(r) ? r[0] : null) ?? null) })
      .catch(() => { if (alive) setFactor(null) })
    return () => { alive = false }
  }, [])
  return (
    <div className="flex items-start gap-2.5">
      <Zap className="w-4 h-4 mt-0.5 text-[var(--color-brand)] flex-shrink-0" aria-hidden />
      <div className="min-w-0">
        <div className="text-caption font-semibold text-[var(--text-primary)]">{t('onboarding.hub.factorTitle')}</div>
        <div className="text-caption text-[var(--text-tertiary)] tabular-nums">
          {factor === undefined ? t('onboarding.hub.factorLoading')
            : factor === null ? t('onboarding.hub.factorMissing')
              : t('onboarding.hub.factorValue', { value: f.number(factor.co2e_per_unit, { maxFraction: 4 }), unit: f.unit(factor.unit), source: factor.source, version: factor.source_version ?? '' })}
        </div>
        <Link to="/data/ef-library" className="text-caption font-medium text-[var(--color-brand)] hover:underline">{t('onboarding.hub.factorLink')}</Link>
      </div>
    </div>
  )
}

/* ─────────────────────────── Wizard ─────────────────────────── */

function Wizard({ onFinished, defaultMarket }: { onFinished: () => void; defaultMarket?: OrgMarket }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { user } = useAuth()
  const orgId = (user as unknown as { org_id?: string | null } | null)?.org_id ?? null
  const [step, setStep] = useState<StepIdx>(0)
  const [dir, setDir] = useState(1)
  const [demoOpen, setDemoOpen] = useState(false)

  const [welcomeForm, setWelcomeForm] = useState<WelcomeData>({ workspaceName: '', industry: '', country: '' })
  const [welcomeErrors, setWelcomeErrors] = useState<Partial<Record<keyof WelcomeData, string>>>({})
  const [market, setMarket] = useState<OrgMarket>(defaultMarket ?? (i18n.language?.startsWith('zh') ? 'cn' : 'global'))
  const [marketTouched, setMarketTouched] = useState(false)
  const [facilityForm, setFacilityForm] = useState<FacilityData>({ name: '', location: '', type: 'factory', productionVolume: '' })
  const [facilityErrors, setFacilityErrors] = useState<Partial<Record<keyof FacilityData, string>>>({})
  const [picked, setPicked] = useState<Set<string>>(new Set(STARTER[market]))
  const [pickedTouched, setPickedTouched] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteDraft, setInviteDraft] = useState<{ email: string; role: PlatformRole }>({ email: '', role: 'data_contributor' })
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const countries = useCountries(i18n.language ?? 'en')
  const headingRef = useRef<HTMLHeadingElement>(null)

  // A mainland / HK country suggests the China market (until the user picks one).
  useEffect(() => {
    if (!marketTouched && welcomeForm.country) setMarket(isCnCountry(welcomeForm.country) ? 'cn' : 'global')
  }, [welcomeForm.country, marketTouched])
  // Recommended frameworks follow the market until the user edits the picks.
  useEffect(() => {
    if (!pickedTouched) setPicked(new Set(STARTER[market]))
  }, [market, pickedTouched])
  // Move focus to the new step's heading after the user changes step (not on first paint).
  const stepChanged = useRef(false)
  useEffect(() => {
    if (!stepChanged.current) return
    headingRef.current?.focus({ preventScroll: false })
  }, [step])

  const validate = <T,>(parse: () => T, setErr: (e: Record<string, string>) => void): T | null => {
    try {
      return parse()
    } catch (e) {
      if (e instanceof z.ZodError) {
        const out: Record<string, string> = {}
        for (const iss of e.issues) {
          const k = String(iss.path[0] ?? '_')
          out[k] = t(`onboarding.welcome.errors.${k}`, { defaultValue: iss.message })
        }
        setErr(out)
      }
      return null
    }
  }

  const go = (to: StepIdx) => { stepChanged.current = true; setDir(to > step ? 1 : -1); setStep(to) }
  const next = () => {
    if (step === 0 && !validate(() => welcomeSchema.parse(welcomeForm), setWelcomeErrors as (e: Record<string, string>) => void)) return
    if (step === 0) setWelcomeErrors({})
    if (step === 1 && !validate(() => facilitySchema.parse(facilityForm), setFacilityErrors as (e: Record<string, string>) => void)) return
    if (step === 1) setFacilityErrors({})
    go(Math.min(4, step + 1) as StepIdx)
  }
  const back = () => go(Math.max(0, step - 1) as StepIdx)

  const skip = () => {
    try { localStorage.setItem(doneKey(orgId), '1') } catch { /* ignore */ }
    navigate('/dashboard', { replace: true })
  }

  const addInvite = () => {
    if (!inviteSchema.safeParse(inviteDraft).success) { setInviteError(t('onboarding.welcome.invalidEmail')); return }
    if (invites.length >= 3) { setInviteError(t('onboarding.welcome.inviteLimit')); return }
    if (invites.some(i => i.email.toLowerCase() === inviteDraft.email.trim().toLowerCase())) { setInviteError(t('onboarding.welcome.inviteDuplicate')); return }
    setInvites(arr => [...arr, { email: inviteDraft.email.trim(), role: inviteDraft.role }])
    setInviteDraft({ email: '', role: 'data_contributor' })
    setInviteError(null)
  }

  const finish = async () => {
    setSubmitting(true)
    setServerError(null)
    try {
      // 1) Org tree: group + first site.
      const group = await orgStore.addEntity({
        type: 'group', name: welcomeForm.workspaceName, country: welcomeForm.country, industry: welcomeForm.industry, parentId: null,
      })
      await orgStore.addEntity({
        type: facilityForm.type === 'office' ? 'office' : 'plant', name: facilityForm.name, country: welcomeForm.country, parentId: group.id,
      })
      // 2) Frameworks, market and invites — best effort; a failure here never
      //    loses the org tree, and the hub shows what is still open.
      const results = await Promise.allSettled([
        ...[...picked].map(id => orgStore.enableFramework(id)),
        ...(market === 'cn' ? [orgSettings.update({ market: 'cn', data_residency_region: 'cn', timezone: 'Asia/Shanghai', currency: 'CNY' })] : []),
        ...invites.map(inv => orgStore.addMember({ userId: null, name: inv.email.split('@')[0], email: inv.email, role: inv.role, entityId: group.id })),
      ])
      try { localStorage.setItem('aeiforo_enabled_frameworks', JSON.stringify([...picked])) } catch { /* ignore */ }
      try { localStorage.setItem(doneKey(orgId), '1') } catch { /* ignore */ }
      invalidateSetup(); invalidateOrgMarket()
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed) notify.warning(t('onboarding.welcome.partial', { count: failed }), { description: t('onboarding.welcome.partialBody') })
      else notify.success(t('onboarding.welcome.created', { name: welcomeForm.workspaceName }))
      onFinished()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t('onboarding.welcome.saveFailed'))
      setSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] gap-6 lg:gap-8 items-start">
      {/* ── Left: the form ── */}
      <div className="min-w-0">
        <header className="mb-5">
          <p className="text-caption font-medium text-[var(--color-brand)]">{t('onboarding.welcome.eyebrow')}</p>
          <h1 className="type-h1 text-[var(--text-primary)] mt-1">{t('onboarding.welcome.title')}</h1>
          <p className="text-small text-[var(--text-secondary)] mt-1">{t('onboarding.welcome.subtitle')}</p>
        </header>

        <Stepper step={step} onJump={i => i < step && go(i as StepIdx)} />

        <div className="surface-paper mt-5 overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={reduce ? false : { opacity: 0, x: dir * 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: dir * -12 }}
              transition={transition.base}
              className="p-5 sm:p-6"
            >
              <h2 ref={headingRef} tabIndex={-1} className="type-h3 text-[var(--text-primary)] focus:outline-none focus-visible:outline-none">{t(`onboarding.welcome.stepTitles.${STEP_KEYS[step]}`)}</h2>
              <p className="text-small text-[var(--text-tertiary)] mt-1">{t(`onboarding.welcome.stepBodies.${STEP_KEYS[step]}`)}</p>
              <div className="mt-5">
                {step === 0 && (
                  <StepOrg value={welcomeForm} errors={welcomeErrors} countries={countries} onChange={setWelcomeForm}
                    market={market} onMarket={m => { setMarket(m); setMarketTouched(true) }} />
                )}
                {step === 1 && <StepSite value={facilityForm} errors={facilityErrors} onChange={setFacilityForm} />}
                {step === 2 && (
                  <StepFrameworks market={market} picked={picked} onToggle={id => {
                    setPickedTouched(true)
                    setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
                  }} />
                )}
                {step === 3 && (
                  <StepTeam invites={invites} draft={inviteDraft} draftError={inviteError} onDraftChange={setInviteDraft}
                    onAdd={addInvite} onRemove={i => setInvites(arr => arr.filter((_, k) => k !== i))} />
                )}
                {step === 4 && <StepReview welcome={welcomeForm} market={market} facility={facilityForm} picked={picked} invites={invites} serverError={serverError} />}
              </div>
            </motion.div>
          </AnimatePresence>

          <footer className="px-5 sm:px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 flex-wrap">
            {step > 0
              ? <Button variant="ghost" size="md" onClick={back} icon={<ArrowLeft className="w-4 h-4" />}>{t('common.back')}</Button>
              : <button type="button" onClick={() => setDemoOpen(true)} className="min-h-[40px] text-small font-medium text-[var(--color-brand)] hover:underline">{t('onboarding.welcome.useSample')}</button>}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="md" onClick={skip}>{t('onboarding.welcome.skip')}</Button>
              {step < 4
                ? <Button variant="primary" size="md" onClick={next} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">{t('onboarding.welcome.continue')}</Button>
                : <Button variant="primary" size="md" onClick={finish} loading={submitting} icon={<Check className="w-4 h-4" />}>{t('onboarding.welcome.create')}</Button>}
            </div>
          </footer>
        </div>
      </div>

      {/* ── Right: live preview ── */}
      <Preview step={step} welcome={welcomeForm} market={market} facility={facilityForm} picked={picked} invites={invites} />

      <AnimatePresence>
        {demoOpen && <DemoSeedModal onClose={() => setDemoOpen(false)} onCompleted={() => { invalidateSetup(); onFinished() }} />}
      </AnimatePresence>
    </div>
  )
}

function Stepper({ step, onJump }: { step: StepIdx; onJump: (i: number) => void }) {
  const { t } = useTranslation()
  return (
    <ol className="flex items-center gap-1.5" aria-label={t('onboarding.welcome.progressAria', { step: step + 1, total: 5 })}>
      {STEP_KEYS.map((k, i) => {
        const done = i < step
        const active = i === step
        return (
          <li key={k} className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={!done}
              aria-current={active ? 'step' : undefined}
              className="w-full text-left group disabled:cursor-default"
            >
              <span className="block h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <motion.span className="block h-full rounded-full bg-[var(--color-brand)]" initial={false} animate={{ width: done || active ? '100%' : '0%', opacity: active ? 1 : done ? 0.55 : 1 }} transition={transition.slow} />
              </span>
              <span className={`hidden sm:block mt-2 text-caption whitespace-nowrap truncate ${active ? 'text-[var(--text-primary)] font-semibold' : done ? 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                {t(`onboarding.welcome.stepLabels.${k}`)}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/* ── Steps ─────────────────────────────────────────────── */

function StepOrg({ value, errors, countries, onChange, market, onMarket }: {
  value: WelcomeData
  errors: Partial<Record<keyof WelcomeData, string>>
  countries: Array<{ value: string; label: string }>
  onChange: (v: WelcomeData) => void
  market: OrgMarket
  onMarket: (m: OrgMarket) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <Field label={t('onboarding.welcome.step1.workspaceName')} error={errors.workspaceName} id="wn">
        <input id="wn" value={value.workspaceName} onChange={e => onChange({ ...value, workspaceName: e.target.value })}
          aria-invalid={!!errors.workspaceName} aria-describedby={errors.workspaceName ? 'wn-err' : undefined}
          placeholder={t('auth.register.workspacePlaceholder')} className={inputCls(!!errors.workspaceName)} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('onboarding.welcome.step1.industry')} error={errors.industry} id="ind">
          <select id="ind" value={value.industry} onChange={e => onChange({ ...value, industry: e.target.value })}
            aria-invalid={!!errors.industry} aria-describedby={errors.industry ? 'ind-err' : undefined} className={inputCls(!!errors.industry)}>
            <option value="">{t('onboarding.welcome.step1.pickSector')}</option>
            {GICS_SECTORS.map(s => <option key={s} value={s}>{t(`onboarding.gics.${s}`, { defaultValue: s })}</option>)}
          </select>
        </Field>
        <Field label={t('onboarding.welcome.step1.country')} error={errors.country} id="cty">
          <select id="cty" value={value.country} onChange={e => onChange({ ...value, country: e.target.value })}
            aria-invalid={!!errors.country} aria-describedby={errors.country ? 'cty-err' : undefined} className={inputCls(!!errors.country)}>
            <option value="">{t('onboarding.welcome.step1.pickCountry')}</option>
            {countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </div>
      <fieldset>
        <legend className="block text-caption font-medium text-[var(--text-secondary)] mb-1.5">{t('onboarding.welcome.market.label')}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup">
          {(['global', 'cn'] as const).map(m => {
            const on = market === m
            return (
              <button key={m} type="button" role="radio" aria-checked={on} onClick={() => onMarket(m)}
                className={`relative text-left p-3.5 rounded-[var(--radius-lg)] border transition-colors duration-micro ${on ? 'border-[var(--color-brand)] bg-[var(--bg-hover)]' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'}`}>
                <span className="flex items-center gap-2">
                  {m === 'cn' ? <Landmark className="w-4 h-4 text-[var(--color-brand)]" aria-hidden /> : <Globe2 className="w-4 h-4 text-[var(--color-brand)]" aria-hidden />}
                  <span className="text-small font-semibold text-[var(--text-primary)]">{t(`onboarding.welcome.market.${m}.title`)}</span>
                  {on && <motion.span layoutId="market-check" className="ml-auto w-5 h-5 rounded-full bg-[var(--color-brand)] flex items-center justify-center" transition={spring.snappy}><Check className="w-3 h-3 text-[var(--bg-primary)]" aria-hidden /></motion.span>}
                </span>
                <span className="block text-caption text-[var(--text-tertiary)] mt-1">{t(`onboarding.welcome.market.${m}.body`)}</span>
              </button>
            )
          })}
        </div>
        <p className="text-caption text-[var(--text-tertiary)] mt-1.5">{t('onboarding.welcome.market.hint')}</p>
      </fieldset>
    </div>
  )
}

function StepSite({ value, errors, onChange }: { value: FacilityData; errors: Partial<Record<keyof FacilityData, string>>; onChange: (v: FacilityData) => void }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={t('onboarding.welcome.step2.name')} error={errors.name} id="fn">
        <input id="fn" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'fn-err' : undefined} placeholder={t('onboarding.welcome.step2.namePlaceholder')} className={inputCls(!!errors.name)} />
      </Field>
      <Field label={t('onboarding.welcome.step2.location')} error={errors.location} id="loc">
        <input id="loc" value={value.location} onChange={e => onChange({ ...value, location: e.target.value })} aria-invalid={!!errors.location}
          aria-describedby={errors.location ? 'loc-err' : undefined} placeholder={t('onboarding.welcome.step2.locationPlaceholder')} className={inputCls(!!errors.location)} />
      </Field>
      <Field label={t('onboarding.welcome.step2.type')} id="ft">
        <select id="ft" value={value.type} onChange={e => onChange({ ...value, type: e.target.value as FacilityData['type'] })} className={inputCls(false)}>
          {FACILITY_TYPES.map(ft => <option key={ft} value={ft}>{t(`onboarding.welcome.facilityTypes.${ft}`)}</option>)}
        </select>
      </Field>
      <Field label={t('onboarding.welcome.step2.volume')} hint={t('onboarding.welcome.step2.volumeHint')} id="pv">
        <input id="pv" value={value.productionVolume ?? ''} onChange={e => onChange({ ...value, productionVolume: e.target.value })}
          placeholder={t('onboarding.welcome.step2.volumePlaceholder')} className={inputCls(false)} />
      </Field>
    </div>
  )
}

function StepFrameworks({ market, picked, onToggle }: { market: OrgMarket; picked: Set<string>; onToggle: (id: string) => void }) {
  const { t, i18n } = useTranslation()
  const all = getActiveFrameworks()
  const recommended = new Set(STARTER[market])
  // Recommended first, then the CN set for CN orgs / everything else.
  const ordered = [...all].sort((a, b) => Number(recommended.has(b.id)) - Number(recommended.has(a.id)))
  return (
    <div className="space-y-4">
      {market === 'cn' && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 flex items-start gap-3">
          <Landmark className="w-4 h-4 mt-0.5 text-[var(--color-brand)] flex-shrink-0" aria-hidden />
          <div className="text-caption text-[var(--text-secondary)]">
            <p>{t('onboarding.welcome.cnGuidance')}</p>
            <div className="mt-2"><CnFactorLine /></div>
          </div>
        </div>
      )}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1 -mr-1">
        {ordered.map(f => {
          const checked = picked.has(f.id)
          return (
            <li key={f.id}>
              <label className={`flex items-start gap-3 px-3 py-2.5 min-h-[56px] rounded-[var(--radius-md)] border cursor-pointer transition-colors duration-micro ${checked ? 'border-[var(--color-brand)] bg-[var(--bg-hover)]' : 'border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'}`}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(f.id)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-small font-semibold text-[var(--text-primary)]">{f.code}</span>
                    {recommended.has(f.id) && <span className="nx-pill" data-tone="brand" data-size="sm">{t('onboarding.welcome.step3.recommended')}</span>}
                  </span>
                  <span className="block text-caption text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{frameworkName(f, i18n.language)}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StepTeam({ invites, draft, draftError, onDraftChange, onAdd, onRemove }: {
  invites: Invite[]
  draft: { email: string; role: PlatformRole }
  draftError: string | null
  onDraftChange: (v: { email: string; role: PlatformRole }) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div>
      <form className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-2" onSubmit={e => { e.preventDefault(); onAdd() }}>
        <label htmlFor="inv-email" className="sr-only">{t('onboarding.welcome.emailLabel')}</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
          <input id="inv-email" value={draft.email} onChange={e => onDraftChange({ ...draft, email: e.target.value })}
            placeholder="teammate@company.com" type="email" aria-invalid={!!draftError} aria-describedby={draftError ? 'invite-err' : undefined}
            className={`${inputCls(!!draftError)} pl-9`} />
        </div>
        <label htmlFor="inv-role" className="sr-only">{t('onboarding.welcome.roleLabel')}</label>
        <select id="inv-role" value={draft.role} onChange={e => onDraftChange({ ...draft, role: e.target.value as PlatformRole })} className={inputCls(false)}>
          {Object.values(ROLE_CATALOG).map(r => <option key={r.slug} value={r.slug}>{t(`shell.roles.${r.slug}.name`, { defaultValue: r.name })}</option>)}
        </select>
        <Button type="submit" variant="secondary" size="md" icon={<Plus className="w-4 h-4" />} disabled={!draft.email}>{t('onboarding.welcome.step4.add')}</Button>
      </form>
      {draftError && <p id="invite-err" role="alert" className="mt-1.5 text-caption text-[var(--status-danger)]">{draftError}</p>}
      <ul className="mt-4 space-y-1.5">
        <AnimatePresence initial={false}>
          {invites.map((inv, i) => (
            <motion.li key={inv.email} layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 16 }} transition={transition.base}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-secondary)]">
              <Avatar email={inv.email} />
              <span className="text-small text-[var(--text-primary)] truncate flex-1">{inv.email}</span>
              <StatusPill tone="brand" size="sm">{t(`shell.roles.${inv.role}.name`, { defaultValue: ROLE_CATALOG[inv.role].name })}</StatusPill>
              <button type="button" onClick={() => onRemove(i)} aria-label={t('onboarding.welcome.step4.remove', { email: inv.email })}
                className="w-9 h-9 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--bg-hover)] flex items-center justify-center">
                <X className="w-4 h-4" aria-hidden />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

function StepReview({ welcome, market, facility, picked, invites, serverError }: {
  welcome: WelcomeData; market: OrgMarket; facility: FacilityData; picked: Set<string>; invites: Invite[]; serverError: string | null
}) {
  const { t } = useTranslation()
  const frameworks = getActiveFrameworks().filter(f => picked.has(f.id))
  const rows: Array<[string, string]> = [
    [t('onboarding.welcome.step5.workspace'), welcome.workspaceName || t('onboarding.welcome.step5.notSet')],
    [t('onboarding.welcome.market.label'), t(`onboarding.welcome.market.${market}.title`)],
    [t('onboarding.welcome.step5.facility'), facility.name ? `${facility.name} · ${facility.location}` : t('onboarding.welcome.step5.notSet')],
    [t('onboarding.welcome.step5.frameworks'), frameworks.length ? frameworks.map(f => f.code).join(t('onboarding.welcome.listSep')) : t('onboarding.welcome.step5.noneSelected')],
    [t('onboarding.welcome.step5.invites'), invites.length ? t('onboarding.welcome.step5.teammates', { count: invites.length }) : t('onboarding.welcome.step5.none')],
  ]
  return (
    <>
      <dl className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-4 py-3">
            <dt className="text-caption text-[var(--text-tertiary)] flex-shrink-0">{k}</dt>
            <dd className="text-small font-medium text-[var(--text-primary)] text-right min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {market === 'cn' && <p className="text-caption text-[var(--text-tertiary)] mt-3">{t('onboarding.welcome.cnReviewNote')}</p>}
      {serverError && <div role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] p-3 text-caption text-[var(--status-danger)]">{serverError}</div>}
    </>
  )
}

/* ── Live preview ─────────────────────────────────────── */

function Preview({ step, welcome, market, facility, picked, invites }: {
  step: StepIdx; welcome: WelcomeData; market: OrgMarket; facility: FacilityData; picked: Set<string>; invites: Invite[]
}) {
  const { t } = useTranslation()
  const frameworks = getActiveFrameworks().filter(f => picked.has(f.id))
  const name = welcome.workspaceName.trim()
  return (
    <aside className="lg:sticky lg:top-[88px] surface-hero relative overflow-hidden rounded-[var(--radius-2xl)] p-5 sm:p-6" aria-label={t('onboarding.welcome.previewAria')}>
      <div aria-hidden className="pointer-events-none absolute inset-0 text-[var(--color-brand)] opacity-50">
        <ContourField anchor="bottom-right" rings={14} seed={11} className="w-full h-full" />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption font-medium text-[var(--text-tertiary)]">{t('onboarding.welcome.previewTitle')}</p>
          <span className="nx-pill" data-tone={market === 'cn' ? 'brand' : 'neutral'} data-size="sm">{t(`onboarding.welcome.market.${market}.short`)}</span>
        </div>
        <div className="flex justify-center my-3 h-[104px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={transition.base}>
              <Illustration name={STEP_ART[step]} size={130} />
            </motion.div>
          </AnimatePresence>
        </div>

        <LayoutGroup>
          <motion.div layout className="surface-paper p-4">
            <motion.div layout className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] text-[var(--color-brand)] flex items-center justify-center flex-shrink-0"><Landmark className="w-4 h-4" aria-hidden /></span>
              <span className="min-w-0">
                <span className={`block text-small font-semibold truncate ${name ? 'text-[var(--text-primary)]' : 'text-[var(--text-quaternary)]'}`}>{name || t('onboarding.welcome.previewGroup')}</span>
                <span className="block text-caption text-[var(--text-tertiary)] truncate">
                  {[welcome.industry && t(`onboarding.gics.${welcome.industry}`, { defaultValue: welcome.industry }), welcome.country].filter(Boolean).join(' · ') || t('onboarding.welcome.previewGroupHint')}
                </span>
              </span>
            </motion.div>
            <AnimatePresence>
              {(facility.name.trim() || step >= 1) && (
                <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring.gentle}
                  className="ml-4 pl-4 border-l border-dashed border-[var(--border-strong)] overflow-hidden">
                  <div className="flex items-center gap-2.5 pt-3">
                    <span className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] flex items-center justify-center flex-shrink-0">
                      {facility.type === 'office' ? <Building2 className="w-3.5 h-3.5" aria-hidden /> : <Factory className="w-3.5 h-3.5" aria-hidden />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-caption font-semibold truncate ${facility.name.trim() ? 'text-[var(--text-primary)]' : 'text-[var(--text-quaternary)]'}`}>{facility.name.trim() || t('onboarding.welcome.previewSite')}</span>
                      <span className="block text-caption text-[var(--text-tertiary)] truncate">{facility.location || t(`onboarding.welcome.facilityTypes.${facility.type}`)}</span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div layout className="mt-3">
            <p className="text-caption text-[var(--text-tertiary)] mb-1.5">{t('onboarding.welcome.step5.frameworks')}</p>
            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
              <AnimatePresence mode="popLayout" initial={false}>
                {frameworks.map((f, i) => (
                  <motion.span key={f.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ ...spring.snappy, delay: staggerDelay(i, 0.02) }}
                    className="nx-pill" data-tone={(CN_FRAMEWORKS as readonly string[]).includes(f.id) ? 'brand' : 'neutral'} data-size="sm">
                    {f.code}
                  </motion.span>
                ))}
              </AnimatePresence>
              {frameworks.length === 0 && <span className="text-caption text-[var(--text-quaternary)]">{t('onboarding.welcome.step5.noneSelected')}</span>}
            </div>
          </motion.div>

          {invites.length > 0 && (
            <motion.div layout className="mt-3">
              <p className="text-caption text-[var(--text-tertiary)] mb-1.5">{t('onboarding.welcome.step5.invites')}</p>
              <div className="flex -space-x-2">
                <AnimatePresence initial={false}>
                  {invites.map(inv => (
                    <motion.span key={inv.email} layout initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={spring.snappy}>
                      <Avatar email={inv.email} ring />
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </LayoutGroup>
      </div>
    </aside>
  )
}

/* ── Shared primitives ────────────────────────────────── */

function Avatar({ email, ring }: { email: string; ring?: boolean }) {
  return (
    <span className={`w-8 h-8 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-caption font-semibold flex items-center justify-center flex-shrink-0 ${ring ? 'ring-2 ring-[var(--bg-primary)]' : ''}`} aria-hidden>
      {email.slice(0, 2).toUpperCase()}
    </span>
  )
}

function Field({ label, error, hint, id, children }: { label: string; error?: string; hint?: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-caption font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
      {error
        ? <p id={`${id}-err`} role="alert" className="mt-1.5 text-caption text-[var(--status-danger)]">{error}</p>
        : hint ? <p className="mt-1.5 text-caption text-[var(--text-tertiary)]">{hint}</p> : null}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return `w-full h-10 px-3 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] text-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)] transition-colors duration-micro ${
    hasError ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)]'
  }`
}
