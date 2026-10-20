import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Check, Send } from 'lucide-react'
import { Button, Field, Sheet, inputClass } from '@/components/ui'
import { fmt, useStrings } from '@/lib/i18n'
import { useL10n } from '@/features/workspace/WorkspaceContext'
import { pick } from '@/config/regions'
import { TEMPLATES, type Channel, type TemplateId } from '@/features/suppliers/data'
import type { SupplierView } from '@/features/suppliers/store'
import { suppliersStrings } from '@/features/suppliers/suppliers.strings'
import { StatusBadge } from './shared'

export interface InviteRequest {
  ids: string[]
  template: TemplateId
  channels: Channel[]
  deadline: string
}

const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

export function InviteSheet({
  open,
  initialIds,
  initialTemplate,
  suppliers,
  channels,
  tenantLocale,
  company,
  message,
  onClose,
  onSend,
}: {
  open: boolean
  initialIds: string[]
  initialTemplate?: TemplateId
  suppliers: SupplierView[]
  channels: Channel[]
  /** The tenant's language: the message goes to suppliers in it, whatever the UI language. */
  tenantLocale: 'en' | 'zh'
  company: string
  message: string
  onClose: () => void
  onSend: (req: InviteRequest) => void
}) {
  const s = useStrings(suppliersStrings)
  const l10n = useL10n()
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [template, setTemplate] = useState<TemplateId>('esg')
  const [picked, setPicked] = useState<Channel[]>([])
  const [deadline, setDeadline] = useState(plusDays(30))

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!open) return
    setIds(new Set(initialIds))
    setTemplate(initialTemplate ?? 'esg')
    setPicked(channels.slice(0, 2))
    setDeadline(plusDays(30))
  }, [open, initialIds, initialTemplate, channels])

  // Verified suppliers are done; everyone else can be invited or reminded.
  const candidates = useMemo(
    () =>
      suppliers
        .filter(sp => sp.status !== 'verified' || initialIds.includes(sp.id))
        .sort((a, b) => Number(initialIds.includes(b.id)) - Number(initialIds.includes(a.id))),
    [suppliers, initialIds],
  )
  const chosen = candidates.filter(sp => ids.has(sp.id))
  const first = chosen[0]

  const toggle = (id: string) =>
    setIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleChannel = (c: Channel) => setPicked(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))

  // Dates in the message follow the tenant's language, like the rest of the message.
  const tenantDate = new Intl.DateTimeFormat(tenantLocale === 'zh' ? 'zh-CN' : 'en-GB', { dateStyle: 'long' }).format(
    new Date(`${deadline}T00:00:00`),
  )
  const templateName = (id: TemplateId) => TEMPLATES.find(t => t.id === id)!.name
  const preview = first
    ? fmt(message, { supplier: first.name, company, template: pick(templateName(template), tenantLocale), deadline: tenantDate })
    : ''

  const canSend = chosen.length > 0 && picked.length > 0 && !!deadline

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={s.invite_.title}
      description={s.invite_.description}
      width="max-w-[600px]"
      footer={
        <>
          {chosen.length > 0 && picked.length === 0 && <span className="mr-auto text-xs text-rose-600">{s.invite_.needChannel}</span>}
          <Button onClick={onClose}>{s.invite_.cancel}</Button>
          <Button
            variant="primary"
            icon={Send}
            disabled={!canSend}
            onClick={() => onSend({ ids: chosen.map(c => c.id), template, channels: picked, deadline })}
          >
            {fmt(s.invite_.send, { count: chosen.length })}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Recipients */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[13px] font-medium text-zinc-700">
              {s.invite_.recipients}
              <span className="ml-2 text-zinc-500 font-normal tabular">{fmt(s.invite_.recipientsCount, { count: chosen.length })}</span>
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setIds(new Set(candidates.map(c => c.id)))}>
                {s.invite_.selectAll}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIds(new Set())}>
                {s.invite_.selectNone}
              </Button>
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto rounded-xl border border-line divide-y divide-line">
            {candidates.map(sp => {
              const on = ids.has(sp.id)
              return (
                <li key={sp.id}>
                  <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-zinc-50">
                    <input type="checkbox" checked={on} onChange={() => toggle(sp.id)} className="w-4 h-4 accent-zinc-900" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-zinc-900 truncate">{sp.name}</span>
                      <span className="block text-xs text-zinc-500 truncate">{sp.category}</span>
                    </span>
                    <StatusBadge status={sp.status} />
                  </label>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Template */}
        <section>
          <div className="text-[13px] font-medium text-zinc-700 mb-2">{s.invite_.template}</div>
          <div role="radiogroup" aria-label={s.invite_.template} className="space-y-2">
            {TEMPLATES.map(t => {
              const on = template === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTemplate(t.id)}
                  className={clsx(
                    'w-full text-left rounded-xl border px-4 py-3 transition-[border-color,box-shadow,background-color] duration-150 flex items-start gap-3',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                    on ? 'border-zinc-900 bg-zinc-900/[0.02] shadow-card' : 'border-line hover:border-zinc-300',
                  )}
                >
                  <span
                    className={clsx(
                      'mt-0.5 w-4 h-4 rounded-full ring-1 ring-inset flex items-center justify-center shrink-0',
                      on ? 'bg-zinc-900 ring-zinc-900' : 'ring-zinc-300',
                    )}
                  >
                    {on && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-zinc-900">{l10n(t.name)}</span>
                    <span className="block mt-0.5 text-xs text-zinc-500 leading-relaxed">{l10n(t.description)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Channel + deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[13px] font-medium text-zinc-700 mb-2">{s.invite_.channel}</div>
            <div className="flex flex-wrap gap-2">
              {channels.map(c => {
                const on = picked.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleChannel(c)}
                    className={clsx(
                      'h-8 px-3 rounded-lg text-[13px] font-medium inline-flex items-center gap-1.5 ring-1 ring-inset transition-colors duration-150',
                      on ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-line hover:ring-zinc-300',
                    )}
                  >
                    {on && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    {s.channels[c]}
                  </button>
                )
              })}
            </div>
          </div>
          <Field label={s.invite_.deadline} htmlFor="inv-deadline">
            <input
              id="inv-deadline"
              type="date"
              value={deadline}
              min={plusDays(1)}
              onChange={e => setDeadline(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Preview */}
        <section>
          <div className="text-[13px] font-medium text-zinc-700 mb-2">{s.invite_.preview}</div>
          {first ? (
            <>
              <div className="rounded-xl bg-zinc-50 border border-line p-4 text-[13px] text-zinc-700 leading-relaxed whitespace-pre-line">
                {preview}
              </div>
              <p className="mt-2 text-xs text-zinc-500">{fmt(s.invite_.previewNote, { name: first.name })}</p>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-line p-4 text-[13px] text-zinc-500">{s.invite_.previewEmpty}</p>
          )}
        </section>
      </div>
    </Sheet>
  )
}
