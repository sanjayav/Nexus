import { useState, type ReactNode } from 'react'
import { Calendar, Globe, FileText, CheckCircle, ArrowRight, ArrowLeft, Check, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Badge, Button, Card, CardHeader, Field, PageHeader, inputClass } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { periodCreateStrings } from '../i18n/pages/periodCreate'

const BOUNDARIES = ['Group', 'BU', 'Site', 'Asset']
const REGIONS = ['Global', 'India', 'GCC', 'China', 'India + Global', 'GCC + Global', 'Global + China']
const PACKS = ['GRI', 'IFRS S1', 'IFRS S2', 'MSX', 'BRSR Core', 'China ESG Pack', 'TCFD']
const STEP_ICONS: LucideIcon[] = [Calendar, Globe, FileText, CheckCircle]

function Chip({ active, onClick, children, multi }: { active: boolean; onClick: () => void; children: ReactNode; multi?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center gap-2 h-9 px-3.5 rounded-[10px] text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
        active ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-line hover:border-zinc-300 hover:bg-zinc-50',
        multi && 'justify-between h-11 w-full',
      )}
    >
      {children}
      {multi && (
        <span className={clsx('w-4 h-4 rounded flex items-center justify-center border', active ? 'bg-white border-white text-zinc-900' : 'border-zinc-300')}>
          {active && <Check className="w-3 h-3" />}
        </span>
      )}
    </button>
  )
}

export default function PeriodCreate() {
  const s = useStrings(periodCreateStrings)
  const f = useFormat()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [period, setPeriod] = useState({
    name: 'FY2025',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    boundary: 'Group',
    regionMode: 'Global + China',
    packs: ['GRI', 'China ESG Pack'],
  })

  const handleCreate = () => {
    navigate('/executive')
  }

  const packLabel = (p: string) => (p === 'China ESG Pack' ? s.packs.chinaPack : p)
  const safeDate = (d: string) => {
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : f.date(dt)
  }
  const total = s.steps.length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title={s.title} description={s.description} />

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
                <div className="flex items-center gap-2 min-w-0">
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
                </div>
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
              <Field label={s.details.name} htmlFor="period-name">
                <input
                  id="period-name"
                  type="text"
                  value={period.name}
                  onChange={e => setPeriod({ ...period, name: e.target.value })}
                  className={inputClass}
                  placeholder={s.details.namePlaceholder}
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
                    onChange={e => setPeriod({ ...period, endDate: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
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
                  {REGIONS.map(r => (
                    <Chip key={r} active={period.regionMode === r} onClick={() => setPeriod({ ...period, regionMode: r })}>
                      {s.regions[r] ?? r}
                    </Chip>
                  ))}
                </div>
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
              action={<Badge tone="neutral">{fmt(s.packs.selected, { count: period.packs.length })}</Badge>}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {PACKS.map(pack => {
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
                    {packLabel(pack)}
                  </Chip>
                )
              })}
            </div>
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200/70 px-4 py-3">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[13px] text-emerald-900">{s.packs.autoNote}</p>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <CardHeader title={s.review.title} description={s.review.desc} icon={STEP_ICONS[3]} />
            <dl className="divide-y divide-line rounded-xl border border-line">
              <ReviewRow label={s.review.name} onEdit={() => setStep(1)} editLabel={s.review.edit}>{period.name}</ReviewRow>
              <ReviewRow label={s.review.range} onEdit={() => setStep(1)} editLabel={s.review.edit}>
                <span className="tabular">{fmt(s.review.rangeValue, { start: safeDate(period.startDate), end: safeDate(period.endDate) })}</span>
              </ReviewRow>
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
          <Button variant="primary" iconRight={ArrowRight} onClick={() => setStep(step + 1)}>{s.continue}</Button>
        ) : (
          <Button variant="brand" icon={CheckCircle} onClick={handleCreate}>{s.create}</Button>
        )}
      </div>
    </div>
  )
}

function ReviewRow({ label, children, onEdit, editLabel }: { label: string; children: ReactNode; onEdit: () => void; editLabel: string }) {
  return (
    <div className="flex items-start sm:items-center justify-between gap-4 px-4 py-3">
      <dt className="text-[13px] text-zinc-500 shrink-0 pt-0.5 sm:pt-0">{label}</dt>
      <dd className="flex items-center gap-3 min-w-0 text-sm font-medium text-zinc-900 text-right">
        <div className="min-w-0">{children}</div>
        <button type="button" onClick={onEdit} className="text-xs text-zinc-500 hover:text-zinc-900 shrink-0">{editLabel}</button>
      </dd>
    </div>
  )
}
