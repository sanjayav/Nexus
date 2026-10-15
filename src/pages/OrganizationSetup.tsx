import { ReactNode, useState } from 'react'
import { Globe, Database, Languages, Building2, Users, FileText, Calculator, Save, CheckCircle, Check, ChevronRight, Plus, Coins } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useFormat, useStrings } from '../i18n'
import { organizationSetupStrings } from '../i18n/pages/organizationSetup'
import { useLanguage } from '../contexts/LanguageContext'
import { PageHeader, Card, CardHeader, Button, Badge } from '../components/ui'

const REGION_MODES = ['Global', 'India', 'GCC', 'China', 'India + Global', 'GCC + Global', 'Global + China'] as const
const RESIDENCIES = ['CN-only', 'Global', 'Hybrid'] as const
const LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'zh', native: '简体中文' },
  { code: 'hi', native: 'हिंदी' },
  { code: 'ar', native: 'العربية' },
] as const
const CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'CNY', label: 'CNY (¥)' },
  { code: 'INR', label: 'INR (₹)' },
  { code: 'OMR', label: 'OMR' },
  { code: 'AED', label: 'AED' },
  { code: 'SAR', label: 'SAR' },
] as const
const ROLES = ['Contributor', 'Reviewer', 'Approver', 'Auditor', 'Admin'] as const
const PACKS = ['GRI', 'IFRS S1', 'IFRS S2', 'MSX', 'BRSR Core', 'China ESG Pack', 'TCFD']
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

export default function OrganizationSetup() {
  const s = useStrings(organizationSetupStrings)
  const f = useFormat()
  const { locale } = useLanguage()

  const [config, setConfig] = useState<{
    regionMode: string
    dataResidency: string
    defaultLanguage: LangCode
    defaultCurrency: string
    entityHierarchy: string[]
    frameworkPacks: string[]
  }>({
    regionMode: 'Global',
    dataResidency: 'Global',
    defaultLanguage: locale === 'zh' ? 'zh' : 'en',
    defaultCurrency: 'USD',
    entityHierarchy: ['Group', 'BU', 'Site', 'Asset'],
    frameworkPacks: ['GRI', 'IFRS S1', 'IFRS S2'],
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const regionLabel = (m: string) => s.regions[m as keyof typeof s.regions] ?? m
  const residencyLabel = (r: string) => s.residencies[r as keyof typeof s.residencies] ?? r
  const levelLabel = (l: string) => s.levels[l as keyof typeof s.levels] ?? l
  const packLabel = (p: string) => s.packs[p as keyof typeof s.packs] ?? p
  const currentLang = LANGUAGES.find(l => l.code === config.defaultLanguage)!

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <Button variant="primary" icon={saved ? CheckCircle : Save} onClick={handleSave}>
            {saved ? s.saved : s.save}
          </Button>
        }
      />

      <div className="space-y-6">
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
          </Card>

          {/* Default language */}
          <Card>
            <CardHeader icon={Languages} title={s.defaultLanguage} description={s.defaultLanguageSub} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LANGUAGES.map(lang => {
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
            {config.entityHierarchy.map((level, idx) => (
              <div key={level} className="flex items-center gap-2">
                <span className="h-9 px-3.5 inline-flex items-center rounded-[10px] bg-zinc-50 border border-line text-sm font-medium text-zinc-800">
                  <span className="text-xs text-zinc-400 tabular mr-2">{idx + 1}</span>
                  {levelLabel(level)}
                </span>
                {idx < config.entityHierarchy.length - 1 && <ChevronRight className="w-4 h-4 text-zinc-300" />}
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon={Plus} className="mt-4 -ml-2">{s.addLevel}</Button>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Default currency */}
          <Card>
            <CardHeader icon={Coins} title={s.defaultCurrency} description={s.defaultCurrencySub} />
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map(c => (
                <Chip key={c.code} selected={config.defaultCurrency === c.code} onClick={() => setConfig({ ...config, defaultCurrency: c.code })}>
                  {c.label}
                </Chip>
              ))}
            </div>
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
            <Button variant="ghost" size="sm" className="mt-4 -ml-2" iconRight={ChevronRight}>{s.configureRoles}</Button>
          </Card>
        </div>

        {/* Framework packs */}
        <Card>
          <CardHeader
            icon={FileText}
            title={s.frameworks}
            description={s.frameworksSub}
            action={<Badge tone="neutral"><span className="tabular">{config.frameworkPacks.length}/{PACKS.length}</span></Badge>}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PACKS.map(pack => {
              const active = config.frameworkPacks.includes(pack)
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
                  <span>{packLabel(pack)}</span>
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
          </div>
          <Button variant="ghost" size="sm" className="mt-4 -ml-2" iconRight={ChevronRight}>{s.manageMethods}</Button>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader title={s.summary} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <SummaryItem label={s.regionMode} value={regionLabel(config.regionMode)} />
            <SummaryItem label={s.dataResidency} value={residencyLabel(config.dataResidency)} />
            <SummaryItem label={s.defaultLanguage} value={s.languages[currentLang.code] === currentLang.native ? currentLang.native : `${currentLang.native} · ${s.languages[currentLang.code]}`} />
            <SummaryItem label={s.defaultCurrency} value={config.defaultCurrency} />
            <SummaryItem
              label={s.frameworks}
              value={config.frameworkPacks.length ? config.frameworkPacks.map(packLabel).join(locale === 'zh' ? '、' : ', ') : s.none}
            />
          </div>
          <p className="mt-4 pt-4 border-t border-line text-[13px] text-zinc-500 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            {s.summaryNote}
          </p>
        </Card>
      </div>
    </div>
  )
}
