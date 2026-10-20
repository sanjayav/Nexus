import { FormEvent, useId, useState } from 'react'
import clsx from 'clsx'
import { Button, Field, Sheet, inputClass } from '@/components/ui'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { carbonAssetsStrings } from '@/features/carbon-assets/carbonAssets.strings'
import { CONTRACT_STATUSES, type Contract, type ContractStatus, type InstrumentType } from '@/features/carbon-assets/data'
import type { CarbonAssetsView } from '@/features/carbon-assets/hooks'
import { reconcileScope2 } from '@/features/carbon-assets/model'
import { useCarbonAssetsActions } from '@/features/carbon-assets/store'

const selectClass = clsx(inputClass, 'pr-8 cursor-pointer')
const errorHint = (msg?: string) => (msg ? <span className="text-rose-600">{msg}</span> : undefined)

/** The Sheet mounts its body only while open, so the form starts fresh on every open and keeps its values during the exit animation. */
export function AddContractSheet({ open, onClose, view }: { open: boolean; onClose: () => void; view: CarbonAssetsView }) {
  const s = useStrings(carbonAssetsStrings)
  const formId = useId()
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={s.form.title}
      description={s.form.desc}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {s.form.cancel}
          </Button>
          <Button variant="primary" type="submit" form={formId}>
            {s.form.save}
          </Button>
        </>
      }
    >
      <ContractForm formId={formId} view={view} onDone={onClose} />
    </Sheet>
  )
}

type Errors = Partial<Record<'counterparty' | 'mwh' | 'period', string>>

function ContractForm({ formId, view, onDone }: { formId: string; view: CarbonAssetsView; onDone: () => void }) {
  const s = useStrings(carbonAssetsStrings)
  const t = s.form
  const f = useFormat()
  const { workspace } = useWorkspace()
  const { addContract } = useCarbonAssetsActions()
  const year = workspace.reportingYear.replace(/\D/g, '') || String(new Date().getFullYear())

  const [type, setType] = useState<InstrumentType>(view.instrumentTypes[0])
  const [counterparty, setCounterparty] = useState('')
  const [site, setSite] = useState(view.sites[0] ?? '')
  const [mwh, setMwh] = useState('')
  const [start, setStart] = useState(`${year}-10-01`)
  const [end, setEnd] = useState(`${year}-12-31`)
  const [certIds, setCertIds] = useState('')
  const [status, setStatus] = useState<ContractStatus>('signed')
  const [errors, setErrors] = useState<Errors>({})

  const mwhNum = Number(mwh)
  const draft: Omit<Contract, 'id' | 'userAdded'> = {
    type,
    counterparty: counterparty.trim(),
    site,
    mwh: mwhNum > 0 ? mwhNum : 0,
    start,
    end,
    certIds: certIds.trim(),
    status,
  }
  // Plain text preview: typing feedback is not animated.
  const after = reconcileScope2(view.location, view.factor, [...view.contracts, { ...draft, id: 'draft' }])
  const delta = after.market - view.scope2.market

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    if (!draft.counterparty) next.counterparty = t.errCounterparty
    if (!(mwhNum > 0)) next.mwh = t.errMwh
    if (start && end && end < start) next.period = t.errPeriod
    setErrors(next)
    if (Object.keys(next).length > 0) return
    addContract(draft)
    toast(fmt(t.added, { value: f.number(Math.round(after.market)) }))
    onDone()
  }

  const ids = {
    type: `${formId}-type`,
    cp: `${formId}-cp`,
    site: `${formId}-site`,
    mwh: `${formId}-mwh`,
    start: `${formId}-start`,
    end: `${formId}-end`,
    cert: `${formId}-cert`,
    status: `${formId}-status`,
  }

  return (
    <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t.type} htmlFor={ids.type}>
          <select id={ids.type} value={type} onChange={e => setType(e.target.value as InstrumentType)} className={selectClass}>
            {view.instrumentTypes.map(it => (
              <option key={it} value={it}>
                {s.types[it]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.status} htmlFor={ids.status}>
          <select id={ids.status} value={status} onChange={e => setStatus(e.target.value as ContractStatus)} className={selectClass}>
            {CONTRACT_STATUSES.map(st => (
              <option key={st} value={st}>
                {s.status[st]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t.counterparty} htmlFor={ids.cp} hint={errorHint(errors.counterparty)}>
        <input
          id={ids.cp}
          value={counterparty}
          onChange={e => setCounterparty(e.target.value)}
          placeholder={t.counterpartyPlaceholder}
          aria-invalid={!!errors.counterparty}
          className={clsx(inputClass, errors.counterparty && 'border-rose-300')}
          data-autofocus
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t.site} htmlFor={ids.site}>
          <select id={ids.site} value={site} onChange={e => setSite(e.target.value)} className={selectClass}>
            {view.sites.map(st => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.mwh} htmlFor={ids.mwh} hint={errorHint(errors.mwh)}>
          <input
            id={ids.mwh}
            type="number"
            inputMode="decimal"
            min={0}
            value={mwh}
            onChange={e => setMwh(e.target.value)}
            aria-invalid={!!errors.mwh}
            className={clsx(inputClass, 'tabular', errors.mwh && 'border-rose-300')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label={t.start} htmlFor={ids.start}>
          <input id={ids.start} type="date" value={start} onChange={e => setStart(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t.end} htmlFor={ids.end} hint={errorHint(errors.period)}>
          <input
            id={ids.end}
            type="date"
            value={end}
            onChange={e => setEnd(e.target.value)}
            aria-invalid={!!errors.period}
            className={clsx(inputClass, errors.period && 'border-rose-300')}
          />
        </Field>
      </div>

      <Field label={t.certIds} htmlFor={ids.cert}>
        <input
          id={ids.cert}
          value={certIds}
          onChange={e => setCertIds(e.target.value)}
          placeholder={t.certIdsPlaceholder}
          className={clsx(inputClass, 'font-mono text-[13px]')}
        />
      </Field>

      <div className="rounded-xl border border-line bg-zinc-50/70 p-4">
        <div className="text-xs text-zinc-500">{t.preview}</div>
        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="display text-2xl font-semibold text-zinc-900 tabular">{f.number(Math.round(after.market))}</span>
          <span className="text-xs text-zinc-500">tCO₂e</span>
          {delta !== 0 && (
            <span className="text-xs font-medium text-emerald-700 tabular">
              {fmt(t.previewDelta, { delta: f.number(Math.round(delta), { signDisplay: 'exceptZero' }) })}
            </span>
          )}
        </div>
        {type === 'self' && <p className="mt-2 text-xs text-zinc-500">{t.selfNote}</p>}
      </div>
    </form>
  )
}
