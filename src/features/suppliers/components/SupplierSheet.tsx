import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { AlertTriangle, BadgeCheck, CornerUpLeft, Send } from 'lucide-react'
import { Badge, Button, Eyebrow, FadeIn, Sheet, Stagger, StaggerItem, textareaClass } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { useL10n } from '@/features/workspace/WorkspaceContext'
import { TEMPLATES, type TemplateId } from '@/features/suppliers/data'
import type { EventKind, SupplierView } from '@/features/suppliers/store'
import { suppliersStrings } from '@/features/suppliers/suppliers.strings'
import { RISK_TONE, StatusBadge } from './shared'

const EVENT_DOT: Record<EventKind, string> = {
  invited: 'bg-sky-500',
  reminded: 'bg-sky-300',
  submitted: 'bg-zinc-900',
  verified: 'bg-emerald-500',
  returned: 'bg-amber-500',
}

export function SupplierSheet({
  supplier,
  onClose,
  onVerify,
  onReturn,
  onInvite,
}: {
  supplier: SupplierView | null
  onClose: () => void
  onVerify: (id: string) => void
  onReturn: (id: string, note: string) => void
  onInvite: (id: string) => void
}) {
  const s = useStrings(suppliersStrings)
  const [returning, setReturning] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    setReturning(false)
    setNote('')
  }, [supplier?.id, supplier?.status])

  const sp = supplier
  const canReview = sp?.status === 'submitted'
  const canReturn = sp?.status === 'submitted' || sp?.status === 'verified'
  const canInvite = sp && (sp.status === 'notInvited' || sp.status === 'invited' || sp.status === 'filling')

  const footer = sp ? (
    returning ? (
      <>
        <Button onClick={() => setReturning(false)}>{s.detail.cancel}</Button>
        <Button variant="primary" icon={CornerUpLeft} onClick={() => onReturn(sp.id, note.trim())}>
          {s.detail.confirmReturn}
        </Button>
      </>
    ) : (
      <>
        <Button className="mr-auto" onClick={onClose}>
          {s.detail.close}
        </Button>
        {canReturn && (
          <Button icon={CornerUpLeft} onClick={() => setReturning(true)}>
            {s.detail.return}
          </Button>
        )}
        {canReview && (
          <Button variant="primary" icon={BadgeCheck} onClick={() => onVerify(sp.id)}>
            {s.detail.verify}
          </Button>
        )}
        {canInvite && (
          <Button variant="primary" icon={Send} onClick={() => onInvite(sp.id)}>
            {sp.status === 'notInvited' ? s.detail.invite : s.detail.remind}
          </Button>
        )}
      </>
    )
  ) : undefined

  return (
    <Sheet
      open={!!sp}
      onClose={onClose}
      title={sp?.name ?? ''}
      description={sp ? `${s.tier[sp.tier]} · ${sp.category} · ${sp.region}` : undefined}
      footer={footer}
      width="max-w-[600px]"
    >
      {sp && (
        <div className="space-y-7">
          {returning && (
            <FadeIn className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <label htmlFor="sup-return" className="block text-[13px] font-medium text-zinc-800 mb-2">
                {s.detail.returnNote}
              </label>
              <textarea
                id="sup-return"
                data-autofocus
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={s.detail.returnPlaceholder}
                className={textareaClass}
              />
            </FadeIn>
          )}
          <Body sp={sp} />
        </div>
      )}
    </Sheet>
  )
}

function Body({ sp }: { sp: SupplierView }) {
  const s = useStrings(suppliersStrings)
  const f = useFormat()
  const l10n = useL10n()
  const templateName = (id?: TemplateId) => (id ? l10n(TEMPLATES.find(t => t.id === id)!.name) : '')
  const data = sp.submitted
  const events = [...sp.events].reverse()

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge status={sp.status} />
        <Badge tone={RISK_TONE[sp.risk]}>{fmt(s.detail.riskBadge, { level: s.riskLevel[sp.risk] })}</Badge>
        <Badge tone={sp.pcf ? 'success' : 'neutral'}>{fmt(s.detail.pcfBadge, { value: sp.pcf ? s.table.yes : s.table.no })}</Badge>
      </div>

      <section>
        <Eyebrow>{s.detail.profile}</Eyebrow>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
          <Item label={s.detail.region} value={sp.region} />
          <Item label={s.detail.contact} value={sp.contact} />
          <Item label={s.detail.spend} value={sp.spendShare === null ? s.table.noSpend : f.percent(sp.spendShare, 1)} />
          <Item label={s.detail.emissions} value={`${f.number(sp.emissions)} tCO₂e`} />
          <Item
            label={s.detail.scope3}
            value={sp.scope3Cat === null ? s.detail.scope3Tier1 : fmt(s.detail.scope3Value, { n: sp.scope3Cat })}
          />
          <Item label={s.detail.esg} value={sp.esgScore === null ? s.table.noScore : f.number(sp.esgScore)} />
        </dl>
      </section>

      <section>
        <Eyebrow>{s.detail.submitted}</Eyebrow>
        {data && (sp.status === 'submitted' || sp.status === 'verified' || sp.status === 'filling') ? (
          <div className={clsx('mt-3 rounded-xl border border-line p-4', sp.status === 'filling' && 'opacity-70')}>
            <div className="text-sm font-medium text-zinc-900">{data.product}</div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              <div className="col-span-2">
                <dt className="text-zinc-500">{s.detail.pcf}</dt>
                <dd className="mt-0.5">
                  {data.pcf ? (
                    <span className="flex items-baseline gap-1.5">
                      <span className="display text-xl font-semibold text-zinc-900">
                        {f.number(data.pcf.value, { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-zinc-500">{data.pcf.unit}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400">{s.detail.pcfNone}</span>
                  )}
                </dd>
              </div>
              {data.pcf && <Item label={s.detail.standard} value={data.pcf.standard} />}
              <Item label={s.detail.greenPower} value={data.greenPower === undefined ? s.table.noScore : f.percent(data.greenPower)} />
              <Item label={s.detail.target} value={data.target ?? s.detail.targetNone} wide />
              <Item label={s.detail.period} value={data.period} />
            </dl>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-zinc-500">{s.detail.notSubmitted}</p>
        )}
      </section>

      <section>
        <Eyebrow>{s.detail.riskFlags}</Eyebrow>
        {sp.reasons.length === 0 ? (
          <p className="mt-2 text-[13px] text-zinc-500">{s.detail.noRisk}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sp.reasons.map(r => (
              <li key={r} className="flex items-start gap-2.5 rounded-xl bg-zinc-50 px-3 py-2.5">
                <AlertTriangle className={clsx('w-4 h-4 mt-0.5 shrink-0', sp.risk === 'high' ? 'text-rose-500' : 'text-amber-500')} />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-zinc-900">{s.reasons[r]}</div>
                  <p className="text-xs text-zinc-600 leading-relaxed mt-0.5">{s.reasonDetail[r]}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <Eyebrow>{s.detail.timeline}</Eyebrow>
        {events.length === 0 ? (
          <p className="mt-2 text-[13px] text-zinc-500">{s.detail.noTimeline}</p>
        ) : (
          <Stagger key={events.length} as="ul" className="mt-3">
            {events.map((e, i) => {
              const meta = [
                e.channels?.length ? fmt(s.detail.via, { channels: e.channels.map(c => s.channels[c]).join(s.invite_.listSep) }) : '',
                e.deadline ? fmt(s.detail.dueBy, { date: f.date(e.deadline) }) : '',
                e.actor ? fmt(s.detail.by, { actor: e.actor }) : '',
              ].filter(Boolean)
              return (
                <StaggerItem as="li" key={e.id} className="relative pl-6 pb-4 last:pb-0">
                  {i < events.length - 1 && <span className="absolute left-[4px] top-3 bottom-0 w-px bg-line" aria-hidden />}
                  <span
                    className={clsx('absolute left-0 top-1.5 w-[9px] h-[9px] rounded-full ring-[3px] ring-white', EVENT_DOT[e.kind])}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-[13px] font-medium text-zinc-900">
                      {fmt(s.detail.events[e.kind], { template: templateName(e.template) })}
                    </span>
                    <time dateTime={e.at} className="text-xs text-zinc-500 tabular">
                      {f.date(e.at)}
                    </time>
                  </div>
                  {meta.length > 0 && <div className="mt-0.5 text-xs text-zinc-500">{meta.join(' · ')}</div>}
                  {e.note && <p className="mt-1.5 text-xs text-zinc-700 rounded-lg bg-zinc-50 px-2.5 py-1.5 leading-relaxed">{e.note}</p>}
                </StaggerItem>
              )
            })}
          </Stagger>
        )}
      </section>
    </>
  )
}

function Item({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={clsx('min-w-0', wide && 'col-span-2')}>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900 break-words">{value}</dd>
    </div>
  )
}
