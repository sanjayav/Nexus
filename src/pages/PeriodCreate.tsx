import { useMemo, useState, type ReactNode } from 'react'
import { Calendar, Globe, FileText, CheckCircle, ArrowRight, ArrowLeft, Check, LayoutDashboard, Layers, Plus, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Badge, Button, Card, CardHeader, Field, PageHeader, inputClass } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { periodCreateStrings } from '../i18n/pages/periodCreate'
import { useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useL10n, useMockData, useWorkspace } from '../workspace/WorkspaceContext'

const BOUNDARIES = ['Group', 'BU', 'Site', 'Asset']
const REGION_MODES = ['global', 'cn', 'cn+global']
const CURRENCY_CODES = ['CNY', 'USD', 'HKD', 'EUR']
const STEP_ICONS: LucideIcon[] = [Calendar, Globe, FileText, CheckCircle]

/** 'FY2026' → 2026. Reporting years are calendar years in both demo tenants. */
const yearOf = (reportingYear: string) => {
  const m = /(\d{4})/.exec(reportingYear)
  return m ? Number(m[1]) : new Date().getFullYear()
}

function Chip({ active, onClick, children, multi }: { active: boolean; onClick: () => void; children: ReactNode; multi?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center gap-2 h-9 px-3.5 rounded-[10px] text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
        active ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-line hover:border-zinc-300 hover:bg-zinc-50',
        multi && 'justify-between h-auto min-h-[44px] py-1.5 w-full',
      )}
    >
      {children}
      {multi && (
        <span className={clsx('w-4 h-4 rounded flex items-center justify-center border shrink-0', active ? 'bg-white border-white text-zinc-900' : 'border-zinc-300')}>
          {active && <Check className="w-3 h-3" />}
        </span>
      )}
    </button>
  )
}

/** Re-mount the wizard when the workspace changes so it re-seeds from the new tenant. */
export default function PeriodCreate() {
  const { workspace } = useWorkspace()
  const [run, setRun] = useState(0)
  return <PeriodWizard key={`${workspace.id}-${run}`} onRestart={() => setRun(n => n + 1)} />
}

function PeriodWizard({ onRestart }: { onRestart: () => void }) {
  const s = useStrings(periodCreateStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const l10n = useL10n()
  const navigate = useNavigate()
  const { workspace, region } = useWorkspace()
  const mockData = useMockData()

  const moduleTitle = useMemo(() => new Map(mockData.modules.map(m => [m.id, m.title])), [mockData.modules])
  const tenantModules = useMemo(() => new Set(mockData.modules.map(m => m.id)), [mockData.modules])
  const packOptions = useMemo(() => {
    const ids = [...region.frameworks]
    for (const m of mockData.modules) if (!ids.includes(m.id)) ids.push(m.id)
    return ids
  }, [region.frameworks, mockData.modules])
  const currencies = useMemo(() => [region.currency, ...CURRENCY_CODES.filter(c => c !== region.currency)], [region.currency])

  const year = yearOf(workspace.reportingYear)
  const [step, setStep] = useState(1)
  const [created, setCreated] = useState(false)
  const [period, setPeriod] = useState(() => {
    const active = region.frameworks.filter(id => tenantModules.has(id))
    return {
      name: workspace.reportingYear,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      currency: region.currency as string,
      boundary: 'Group',
      regionMode: region.id as string,
      packs: active.length ? active : [...region.frameworks],
    }
  })

  const packLabel = (p: string) => fw.short(p, moduleTitle.get(p))
  const safeDate = (d: string) => {
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : f.date(dt)
  }
  const currencyLabel = (c: string) => `${c} · ${s.currencies[c] ?? c}`
  const total = s.steps.length

  const nameError = period.name.trim() === ''
  const rangeError = !!period.startDate && !!period.endDate && period.endDate <= period.startDate
  const packsError = period.packs.length === 0
  const stepValid = step === 1 ? !nameError && !rangeError && !!period.startDate && !!period.endDate : step === 3 ? !packsError : true

  if (created) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader title={s.title} description={s.description} />
        <Card className="text-center">
          <div className="py-6 sm:py-10 flex flex-col items-center animate-fade-up">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">{fmt(s.done.title, { name: period.name })}</h2>
            <p className="text-[13px] text-zinc-500 mt-1.5 max-w-md">
              {fmt(s.done.body, { count: period.packs.length, org: l10n(workspace.name) })}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {period.packs.map(p => <Badge key={p} tone="success">{packLabel(p)}</Badge>)}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button variant="primary" icon={LayoutDashboard} onClick={() => navigate('/executive')}>{s.done.dashboard}</Button>
              <Button variant="secondary" icon={Layers} onClick={() => navigate('/modules')}>{s.done.modules}</Button>
              <Button variant="ghost" icon={Plus} onClick={onRestart}>{s.done.another}</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow={fmt(s.orgContext, { org: l10n(workspace.name), listing: l10n(workspace.listing) })}
        title={s.title}
        description={s.description}
      />

      {/* Stepper */}
      <nav aria-label={fmt(s.stepOf, { current: step, total })}>
        <p className="sm:hidden text-[13px] text-zinc-500 mb-2">
          {fmt(s.stepOf, { current: step, total })} · <span className="font-medium text-zinc-900">{s.steps[step - 1]}</span>
        </p>
        <ol className="flex items-center gap-2">
          {s.steps.map((label, idx) => {
            const num = idx + 1
            const done = step > num
            const current = step === num
            return (
              <li key={label} className="flex items-center flex-1 min-w-0 gap-2">
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => setStep(num)}
                  className="flex items-center gap-2 min-w-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:cursor-default"
                >
                  <span
                    aria-current={current ? 'step' : undefined}
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 transition-colors',
                      done ? 'bg-zinc-900 text-white' : current ? 'bg-zinc-900 text-white ring-4 ring-zinc-900/10' : 'bg-white text-zinc-400 border border-line',
                    )}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : num}
                  </span>
                  <span className={clsx('hidden sm:block text-[13px] font-medium truncate', step >= num ? 'text-zinc-900' : 'text-zinc-400')}>{label}</span>
                </button>
                {idx < total - 1 && <div className={clsx('flex-1 h-px min-w-[12px]', done ? 'bg-zinc-900' : 'bg-line')} />}
              </li>
            )
          })}
        </ol>
      </nav>

      <Card>
        {step === 1 && (
          <>
            <CardHeader title={s.details.title} description={s.details.desc} icon={STEP_ICONS[0]} />
            <div className="space-y-5">
              <Field label={s.details.name} htmlFor="period-name" hint={nameError ? <span className="text-rose-600">{s.details.nameRequired}</span> : undefined}>
                <input
                  id="period-name"
                  type="text"
                  value={period.name}
                  onChange={e => setPeriod({ ...period, name: e.target.value })}
                  className={clsx(inputClass, nameError && 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400')}
                  placeholder={fmt(s.details.namePlaceholder, { year: workspace.reportingYear })}
                  aria-invalid={nameError}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={s.details.start} htmlFor="period-start">
                  <input
                    id="period-start"
                    type="date"
                    value={period.startDate}
                    onChange={e => setPeriod({ ...period, startDate: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={s.details.end} htmlFor="period-end">
                  <input
                    id="period-end"
                    type="date"
                    value={period.endDate}
                    min={period.startDate || undefined}
                    onChange={e => setPeriod({ ...period, endDate: e.target.value })}
                    className={clsx(inputClass, rangeError && 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400')}
                    aria-invalid={rangeError}
                  />
                </Field>
              </div>
              <p className={clsx('text-xs -mt-2', rangeError ? 'text-rose-600' : 'text-zinc-500')}>
                {rangeError
                  ? s.details.rangeError
                  : fmt(s.details.rangeHint, { year: workspace.reportingYear, start: safeDate(`${year}-01-01`), end: safeDate(`${year}-12-31`) })}
              </p>
              <Field label={s.details.currency} htmlFor="period-currency" hint={fmt(s.details.currencyHint, { code: region.currency })}>
                <select
                  id="period-currency"
                  value={period.currency}
                  onChange={e => setPeriod({ ...period, currency: e.target.value })}
                  className={inputClass}
                >
                  {currencies.map(c => <option key={c} value={c}>{currencyLabel(c)}</option>)}
                </select>
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader title={s.scope.title} description={s.scope.desc} icon={STEP_ICONS[1]} />
            <div className="space-y-6">
              <div>
                <div className="text-[13px] font-medium text-zinc-700 mb-2">{s.scope.boundary}</div>
                <div className="flex flex-wrap gap-2">
                  {BOUNDARIES.map(b => (
                    <Chip key={b} active={period.boundary === b} onClick={() => setPeriod({ ...period, boundary: b })}>
                      {s.boundaries[b] ?? b}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[13px] font-medium text-zinc-700 mb-2">{s.scope.region}</div>
                <div className="flex flex-wrap gap-2">
                  {REGION_MODES.map(r => (
                    <Chip key={r} active={period.regionMode === r} onClick={() => setPeriod({ ...period, regionMode: r })}>
                      {s.regions[r] ?? r}
                    </Chip>
                  ))}
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  {fmt(s.scope.regionHint, {
                    value: f.number(region.gridFactor.value, { maximumFractionDigits: 4 }),
                    unit: region.gridFactor.unit,
                    source: l10n(region.gridFactor.source),
                  })}
                </p>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader
              title={s.packs.title}
              description={s.packs.desc}
              icon={STEP_ICONS[2]}
              action={<Badge tone={packsError ? 'warning' : 'neutral'}>{fmt(s.packs.selected, { count: period.packs.length })}</Badge>}
            />
            <div className="flex items-center gap-1 -mt-2 mb-3">
              <Button size="sm" variant="ghost" onClick={() => setPeriod({ ...period, packs: [...packOptions] })}>{s.packs.selectAll}</Button>
              <Button size="sm" variant="ghost" onClick={() => setPeriod({ ...period, packs: [] })} disabled={packsError}>{s.packs.clear}</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {packOptions.map(pack => {
                const isActive = period.packs.includes(pack)
                return (
                  <Chip
                    key={pack}
                    multi
                    active={isActive}
                    onClick={() =>
                      setPeriod({
                        ...period,
                        packs: isActive ? period.packs.filter(p => p !== pack) : [...period.packs, pack],
                      })
                    }
                  >
                    <span className="min-w-0 text-left">
                      <span className="block truncate" title={fw.title(pack, moduleTitle.get(pack))}>{packLabel(pack)}</span>
                      <span className={clsx('block text-[11px] font-normal leading-tight', isActive ? 'text-white/60' : 'text-zinc-500')}>
                        {region.frameworks.includes(pack) ? s.packs.regionPack : s.packs.inUse}
                      </span>
                    </span>
                  </Chip>
                )
              })}
            </div>
            {packsError ? (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200/70 px-4 py-3">
                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[13px] text-amber-900">{s.packs.noneWarning}</p>
              </div>
            ) : (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200/70 px-4 py-3">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-[13px] text-emerald-900">{s.packs.autoNote}</p>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <CardHeader title={s.review.title} description={s.review.desc} icon={STEP_ICONS[3]} />
            <dl className="divide-y divide-line rounded-xl border border-line">
              <ReviewRow label={s.review.org}>{l10n(workspace.name)}</ReviewRow>
              <ReviewRow label={s.review.name} onEdit={() => setStep(1)} editLabel={s.review.edit}>{period.name}</ReviewRow>
              <ReviewRow label={s.review.range} onEdit={() => setStep(1)} editLabel={s.review.edit}>
                <span className="tabular">{fmt(s.review.rangeValue, { start: safeDate(period.startDate), end: safeDate(period.endDate) })}</span>
              </ReviewRow>
              <ReviewRow label={s.review.currency} onEdit={() => setStep(1)} editLabel={s.review.edit}>{currencyLabel(period.currency)}</ReviewRow>
              <ReviewRow label={s.review.boundary} onEdit={() => setStep(2)} editLabel={s.review.edit}>{s.boundaries[period.boundary] ?? period.boundary}</ReviewRow>
              <ReviewRow label={s.review.region} onEdit={() => setStep(2)} editLabel={s.review.edit}>{s.regions[period.regionMode] ?? period.regionMode}</ReviewRow>
              <ReviewRow label={s.review.packs} onEdit={() => setStep(3)} editLabel={s.review.edit}>
                {period.packs.length === 0 ? (
                  <span className="text-zinc-400">{s.review.none}</span>
                ) : (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {period.packs.map(p => <Badge key={p} tone="success">{packLabel(p)}</Badge>)}
                  </div>
                )}
              </ReviewRow>
            </dl>
            <div className="mt-5 rounded-xl bg-zinc-50 border border-line px-4 py-3">
              <p className="text-sm font-medium text-zinc-900">{s.review.readyTitle}</p>
              <p className="text-[13px] text-zinc-500 mt-0.5">{s.review.readyBody}</p>
            </div>
          </>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
          {s.back}
        </Button>
        {step < 4 ? (
          <Button variant="primary" iconRight={ArrowRight} onClick={() => setStep(step + 1)} disabled={!stepValid}>{s.continue}</Button>
        ) : (
          <Button variant="brand" icon={CheckCircle} onClick={() => setCreated(true)} disabled={nameError || rangeError || packsError}>
            {s.create}
          </Button>
        )}
      </div>
    </div>
  )
}

function ReviewRow({ label, children, onEdit, editLabel }: { label: string; children: ReactNode; onEdit?: () => void; editLabel?: string }) {
  return (
    <div className="flex items-start sm:items-center justify-between gap-4 px-4 py-3">
      <dt className="text-[13px] text-zinc-500 shrink-0 pt-0.5 sm:pt-0">{label}</dt>
      <dd className="flex items-center gap-3 min-w-0 text-sm font-medium text-zinc-900 text-right">
        <div className="min-w-0 break-words">{children}</div>
        {onEdit && <button type="button" onClick={onEdit} className="text-xs text-zinc-500 hover:text-zinc-900 shrink-0">{editLabel}</button>}
      </dd>
    </div>
  )
}
