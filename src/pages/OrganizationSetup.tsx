import { ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Globe, Database, Languages, Building2, Users, FileText, Calculator, Save, CheckCircle, Check, ChevronRight, Plus, Coins, X, RotateCcw, Landmark,
} from 'lucide-react'
import clsx from 'clsx'
import { fmt, useFormat, useStrings } from '../i18n'
import { organizationSetupStrings } from '../i18n/pages/organizationSetup'
import { useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useLanguage } from '../contexts/LanguageContext'
import { useL10n, useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import { PageHeader, Card, CardHeader, Button, Badge, Field, inputClass } from '../components/ui'
import { useToast } from '../components/useToast'

const REGION_MODES = ['global', 'cn', 'cn+global'] as const
const RESIDENCIES = ['CN-only', 'Global', 'Hybrid'] as const
const LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'zh', native: '简体中文' },
  { code: 'hi', native: 'हिंदी' },
  { code: 'ar', native: 'العربية' },
] as const
/** Region currency first, then the currencies commonly needed for cross-listed groups. */
const CURRENCY_CODES = ['CNY', 'USD', 'HKD', 'EUR', 'GBP', 'OMR', 'INR'] as const
const TIMEZONES = ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Muscat', 'Asia/Kolkata', 'Europe/London', 'UTC']
const ROLES = ['Contributor', 'Reviewer', 'Approver', 'Auditor', 'Admin'] as const
const BASE_LEVELS = ['Group', 'BU', 'Site', 'Asset']
const LIBS = [
  { id: 'units', count: 248 },
  { id: 'factors', count: 1842 },
  { id: 'boundary', count: 0 },
] as const

type LangCode = (typeof LANGUAGES)[number]['code']

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'h-9 px-3.5 rounded-[10px] text-sm font-medium border transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        selected ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-line hover:border-zinc-300 hover:bg-zinc-50',
      )}
    >
      {selected && <Check className="w-3.5 h-3.5" />}
      {children}
    </button>
  )
}

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-3 border-t border-line first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
      <div className="text-[13px] text-zinc-500">{label}</div>
      <div className="text-sm font-medium text-zinc-900 mt-0.5 break-words">{value}</div>
    </div>
  )
}

/** Re-mount the form whenever the workspace changes so every field re-seeds from the new tenant. */
export default function OrganizationSetup() {
  const { workspace } = useWorkspace()
  const [resetCount, setResetCount] = useState(0)
  return <OrganizationSetupForm key={`${workspace.id}-${resetCount}`} onReset={() => setResetCount(n => n + 1)} />
}

function OrganizationSetupForm({ onReset }: { onReset: () => void }) {
  const s = useStrings(organizationSetupStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const l10n = useL10n()
  const navigate = useNavigate()
  const { locale } = useLanguage()
  const { workspace, region } = useWorkspace()
  const mockData = useMockData()
  const { toast, show } = useToast()

  // Region packs first, then any module the tenant runs that the region list doesn't cover.
  const packs = useMemo(() => {
    const ids = [...region.frameworks]
    for (const m of mockData.modules) if (!ids.includes(m.id)) ids.push(m.id)
    return ids
  }, [region.frameworks, mockData.modules])
  const moduleTitle = useMemo(() => new Map(mockData.modules.map(m => [m.id, m.title])), [mockData.modules])
  const tenantModules = useMemo(() => new Set(mockData.modules.map(m => m.id)), [mockData.modules])

  const currencies = useMemo(() => [region.currency, ...CURRENCY_CODES.filter(c => c !== region.currency)], [region.currency])
  const timezones = useMemo(() => [region.timezone, ...TIMEZONES.filter(t => t !== region.timezone)], [region.timezone])
  const languages = useMemo(
    () => (region.id === 'cn' ? LANGUAGES.filter(l => l.code === 'zh' || l.code === 'en') : LANGUAGES),
    [region.id],
  )

  // Profile text fields: `undefined` means "show the workspace value in the current UI language".
  const [profile, setProfile] = useState<{ name?: string; industry?: string; listing?: string; reportingYear?: string }>({})
  const [config, setConfig] = useState<{
    regionMode: string
    dataResidency: string
    timezone: string
    defaultLanguage: LangCode
    defaultCurrency: string
    entityHierarchy: string[]
    frameworkPacks: string[]
  }>(() => {
    const active = region.frameworks.filter(id => tenantModules.has(id))
    return {
      regionMode: region.id,
      dataResidency: region.id === 'cn' ? 'CN-only' : 'Global',
      timezone: region.timezone,
      defaultLanguage: region.id === 'cn' ? 'zh' : locale === 'zh' ? 'zh' : 'en',
      defaultCurrency: region.currency,
      entityHierarchy: BASE_LEVELS,
      frameworkPacks: active.length ? active : [...region.frameworks],
    }
  })
  const [customCount, setCustomCount] = useState(0)
  const [saved, setSaved] = useState(false)

  const orgName = profile.name ?? l10n(workspace.name)
  const industry = profile.industry ?? l10n(workspace.industry)
  const listing = profile.listing ?? l10n(workspace.listing)
  const reportingYear = profile.reportingYear ?? workspace.reportingYear

  const handleSave = () => {
    setSaved(true)
    show(fmt(s.savedToast, { org: orgName || l10n(workspace.name) }))
    setTimeout(() => setSaved(false), 2000)
  }

  const regionLabel = (m: string) => s.regionModes[m] ?? m
  const residencyLabel = (r: string) => s.residencies[r] ?? r
  const levelLabel = (l: string) => {
    const custom = /^custom-(\d+)$/.exec(l)
    return custom ? fmt(s.customLevel, { n: custom[1] }) : s.levels[l] ?? l
  }
  const packLabel = (p: string) => fw.title(p, moduleTitle.get(p))
  const currencyLabel = (c: string) => s.currencies[c] ?? c
  const tzLabel = (tz: string) => s.timezones[tz] ?? tz
  const currentLang = LANGUAGES.find(l => l.code === config.defaultLanguage)!
  const sep = locale === 'zh' ? '、' : ', '

  const addLevel = () => {
    const n = customCount + 1
    setCustomCount(n)
    setConfig(c => ({ ...c, entityHierarchy: [...c.entityHierarchy, `custom-${n}`] }))
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <>
            <Button
              variant="ghost"
              icon={RotateCcw}
              onClick={() => {
                onReset()
                show(fmt(s.resetToast, { org: l10n(workspace.name) }), 'info')
              }}
            >
              {s.reset}
            </Button>
            <Button variant="primary" icon={saved ? CheckCircle : Save} onClick={handleSave}>
              {saved ? s.saved : s.save}
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {/* Organisation profile */}
        <Card>
          <CardHeader icon={Landmark} title={s.profile} description={s.profileSub} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label={s.orgName} htmlFor="org-name">
              <input id="org-name" className={inputClass} value={orgName} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label={s.industry} htmlFor="org-industry">
              <input id="org-industry" className={inputClass} value={industry} onChange={e => setProfile(p => ({ ...p, industry: e.target.value }))} />
            </Field>
            <Field label={s.listing} htmlFor="org-listing">
              <input id="org-listing" className={inputClass} value={listing} onChange={e => setProfile(p => ({ ...p, listing: e.target.value }))} />
            </Field>
            <Field label={s.reportingYear} htmlFor="org-year">
              <input id="org-year" className={inputClass} value={reportingYear} onChange={e => setProfile(p => ({ ...p, reportingYear: e.target.value }))} />
            </Field>
            <Field label={s.timezone} htmlFor="org-tz" hint={s.timezoneHint}>
              <select id="org-tz" className={inputClass} value={config.timezone} onChange={e => setConfig({ ...config, timezone: e.target.value })}>
                {timezones.map(tz => (
                  <option key={tz} value={tz}>
                    {tzLabel(tz)}
                    {tz === region.timezone ? ` · ${s.workspaceDefault}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        {/* Region mode */}
        <Card>
          <CardHeader icon={Globe} title={s.regionMode} description={s.regionModeSub} />
          <div className="flex flex-wrap gap-2">
            {REGION_MODES.map(mode => (
              <Chip key={mode} selected={config.regionMode === mode} onClick={() => setConfig({ ...config, regionMode: mode })}>
                {regionLabel(mode)}
              </Chip>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-zinc-500">{fmt(s.regionModeHint, { region: l10n(region.label) })}</p>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data residency */}
          <Card>
            <CardHeader icon={Database} title={s.dataResidency} description={s.dataResidencySub} />
            <div className="flex flex-wrap gap-2">
              {RESIDENCIES.map(r => (
                <Chip key={r} selected={config.dataResidency === r} onClick={() => setConfig({ ...config, dataResidency: r })}>
                  {residencyLabel(r)}
                </Chip>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-zinc-500 leading-relaxed">
              {fmt(s.residencyHint, { provider: l10n(region.hosting.provider), residency: l10n(region.hosting.residency), privacy: l10n(region.privacy) })}
            </p>
          </Card>

          {/* Default language */}
          <Card>
            <CardHeader icon={Languages} title={s.defaultLanguage} description={s.defaultLanguageSub} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {languages.map(lang => {
                const selected = config.defaultLanguage === lang.code
                return (
                  <button
                    key={lang.code}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setConfig({ ...config, defaultLanguage: lang.code })}
                    className={clsx(
                      'flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-[10px] border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                      selected ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900' : 'border-line bg-white hover:border-zinc-300 hover:bg-zinc-50',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-900">{lang.native}</span>
                      {s.languages[lang.code] !== lang.native && <span className="block text-xs text-zinc-500">{s.languages[lang.code]}</span>}
                    </span>
                    {selected && <Check className="w-4 h-4 text-zinc-900 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Entity hierarchy */}
        <Card>
          <CardHeader icon={Building2} title={s.entityHierarchy} description={s.entityHierarchySub} />
          <div className="flex flex-wrap items-center gap-2">
            {config.entityHierarchy.map((level, idx) => {
              const custom = level.startsWith('custom-')
              return (
                <div key={level} className="flex items-center gap-2">
                  <span className="h-9 pl-3.5 pr-2 inline-flex items-center gap-1 rounded-[10px] bg-zinc-50 border border-line text-sm font-medium text-zinc-800">
                    <span className="text-xs text-zinc-400 tabular mr-1">{idx + 1}</span>
                    {levelLabel(level)}
                    {custom ? (
                      <button
                        type="button"
                        aria-label={fmt(s.removeLevel, { name: levelLabel(level) })}
                        title={fmt(s.removeLevel, { name: levelLabel(level) })}
                        onClick={() => setConfig(c => ({ ...c, entityHierarchy: c.entityHierarchy.filter(l => l !== level) }))}
                        className="w-5 h-5 rounded-md inline-flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/70"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="w-1.5" />
                    )}
                  </span>
                  {idx < config.entityHierarchy.length - 1 && <ChevronRight className="w-4 h-4 text-zinc-300" />}
                </div>
              )
            })}
          </div>
          <Button variant="ghost" size="sm" icon={Plus} className="mt-4 -ml-2" onClick={addLevel}>{s.addLevel}</Button>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Default currency */}
          <Card>
            <CardHeader icon={Coins} title={s.defaultCurrency} description={s.defaultCurrencySub} />
            <div className="flex flex-wrap gap-2">
              {currencies.map(c => (
                <Chip key={c} selected={config.defaultCurrency === c} onClick={() => setConfig({ ...config, defaultCurrency: c })}>
                  <span className="tabular">{c}</span>
                  <span className={clsx('font-normal', config.defaultCurrency === c ? 'text-white/70' : 'text-zinc-500')}>{currencyLabel(c)}</span>
                </Chip>
              ))}
            </div>
            {config.defaultCurrency !== region.currency && (
              <p className="mt-3 text-[13px] text-zinc-500">
                {s.workspaceDefault}: {region.currency} · {currencyLabel(region.currency)}
              </p>
            )}
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader icon={Users} title={s.roles} description={s.rolesSub} />
            <div className="flex flex-wrap gap-2">
              {ROLES.map(role => (
                <span key={role} className="h-9 px-3.5 inline-flex items-center rounded-[10px] bg-zinc-50 border border-line text-sm font-medium text-zinc-800">
                  {s.roleNames[role]}
                </span>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-4 -ml-2" iconRight={ChevronRight} onClick={() => navigate('/roles')}>
              {s.configureRoles}
            </Button>
          </Card>
        </div>

        {/* Framework packs */}
        <Card>
          <CardHeader
            icon={FileText}
            title={s.frameworks}
            description={s.frameworksSub}
            action={<Badge tone="neutral"><span className="tabular">{config.frameworkPacks.length}/{packs.length}</span></Badge>}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {packs.map(pack => {
              const active = config.frameworkPacks.includes(pack)
              const inRegion = region.frameworks.includes(pack)
              return (
                <button
                  key={pack}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setConfig({
                      ...config,
                      frameworkPacks: active ? config.frameworkPacks.filter(p => p !== pack) : [...config.frameworkPacks, pack],
                    })
                  }
                  className={clsx(
                    'flex items-center justify-between gap-3 px-3.5 py-3 rounded-[10px] border text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                    active ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 text-zinc-900' : 'border-line bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate" title={packLabel(pack)}>{fw.short(pack, moduleTitle.get(pack))}</span>
                    <span className="block text-xs font-normal text-zinc-500 mt-0.5">
                      {inRegion ? s.regionPack : s.tenantModule}
                      {inRegion && tenantModules.has(pack) ? ` · ${s.tenantModule}` : ''}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      'w-4 h-4 rounded flex items-center justify-center shrink-0 border',
                      active ? 'bg-zinc-900 border-zinc-900 text-white' : 'border-zinc-300 bg-white',
                    )}
                  >
                    {active && <Check className="w-3 h-3" />}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Method libraries */}
        <Card>
          <CardHeader icon={Calculator} title={s.methods} description={s.methodsSub} />
          <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
            {LIBS.map(lib => {
              const t = s.libs[lib.id]
              return (
                <div key={lib.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50/70 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900">{t.name}</div>
                    <div className="text-[13px] text-zinc-500 mt-0.5">{fmt(t.count, { count: f.number(lib.count) })}</div>
                  </div>
                  <Badge tone="success" dot>{s.active}</Badge>
                </div>
              )
            })}
            <div className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50/70 transition-colors">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900">{s.gridLib.name}</div>
                <div className="text-[13px] text-zinc-500 mt-0.5">
                  {fmt(s.gridLib.count, {
                    value: f.number(region.gridFactor.value, { maximumFractionDigits: 4 }),
                    unit: region.gridFactor.unit,
                    source: l10n(region.gridFactor.source),
                  })}
                </div>
              </div>
              <Badge tone="success" dot>{s.active}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="mt-4 -ml-2" iconRight={ChevronRight} onClick={() => navigate('/carbon')}>
            {s.manageMethods}
          </Button>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader title={s.summary} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <SummaryItem label={s.orgName} value={orgName || s.none} />
            <SummaryItem label={s.reportingYear} value={reportingYear || s.none} />
            <SummaryItem label={s.listing} value={listing || s.none} />
            <SummaryItem label={s.timezone} value={tzLabel(config.timezone)} />
            <SummaryItem label={s.regionMode} value={regionLabel(config.regionMode)} />
            <SummaryItem label={s.dataResidency} value={residencyLabel(config.dataResidency)} />
            <SummaryItem label={s.defaultLanguage} value={s.languages[currentLang.code] === currentLang.native ? currentLang.native : `${currentLang.native} · ${s.languages[currentLang.code]}`} />
            <SummaryItem label={s.defaultCurrency} value={`${config.defaultCurrency} · ${currencyLabel(config.defaultCurrency)}`} />
            <SummaryItem
              label={s.frameworks}
              value={config.frameworkPacks.length ? config.frameworkPacks.map(p => fw.short(p, moduleTitle.get(p))).join(sep) : s.none}
            />
          </div>
          <p className="mt-4 pt-4 border-t border-line text-[13px] text-zinc-500 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            {s.summaryNote}
          </p>
        </Card>
      </div>
      {toast}
    </div>
  )
}
