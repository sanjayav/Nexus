import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Plus, Send, X } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { Button, Card, ease, inputClass } from '@/components/ui'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { useAccess, useAccessActions } from '@/features/access/AccessContext'
import { accessStrings } from '@/features/access/access.strings'
import { assignableRoles, INVITE_TTL_DAYS, splitEmails, type InviteError, type Member, type RoleId } from '@/features/access/model'
import { iamCenterStrings } from '@/features/admin/iamCenter.strings'
import { Chip, RoleSelect } from './shared'

type Row = { key: number; email: string; role: RoleId }

let nextKey = 1
const blank = (role: RoleId): Row => ({ key: nextKey++, email: '', role })

/** Inline invitation form: one row per person, a shared framework scope, one send. */
export function InviteComposer({ onInvited }: { onInvited: (members: Member[]) => void }) {
  const s = useStrings(iamCenterStrings)
  const a = useStrings(accessStrings)
  const fw = useFrameworkLabels()
  const { region } = useWorkspace()
  const { member } = useAccess()
  const { invite } = useAccessActions()
  const allowed = member ? assignableRoles(member) : []
  const defaultRole: RoleId = allowed.includes('data_contributor') ? 'data_contributor' : allowed[allowed.length - 1]
  const [rows, setRows] = useState<Row[]>(() => [blank(defaultRole)])
  const [scope, setScope] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<number, InviteError>>({})
  const id = useId()

  const filled = rows.filter(r => r.email.trim())
  const update = (key: number, patch: Partial<Row>) => {
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)))
    setErrors(({ [key]: _cleared, ...rest }) => rest)
  }

  /** Pasting "a@x.com, b@y.com" into one field fans out into rows; typing never does. */
  const onPaste = (row: Row, e: React.ClipboardEvent<HTMLInputElement>) => {
    const parts = splitEmails(row.email + e.clipboardData.getData('text'))
    if (parts.length < 2) return
    e.preventDefault()
    setRows(rs => {
      const i = rs.findIndex(r => r.key === row.key)
      const added = parts.slice(1).map(email => ({ ...blank(row.role), email }))
      return [...rs.slice(0, i), { ...row, email: parts[0] }, ...added, ...rs.slice(i + 1)]
    })
  }

  const toggleScope = (fwId: string) => setScope(sc => (sc.includes(fwId) ? sc.filter(x => x !== fwId) : [...sc, fwId]))

  const send = () => {
    const result = invite(filled.map(r => ({ email: r.email, role: r.role, scope })))
    if (!result.ok) return toast(s.errors[result.error], 'warning')
    const { errors: rowErrors, invited } = result.value
    if (rowErrors.some(Boolean)) {
      setErrors(Object.fromEntries(filled.flatMap((r, i) => (rowErrors[i] ? [[r.key, rowErrors[i]!]] : []))))
      return
    }
    toast(invited.length === 1 ? fmt(s.toasts.invited, { email: invited[0].email }) : fmt(s.toasts.invitedMany, { n: invited.length }))
    setRows([blank(defaultRole)])
    setScope([])
    onInvited(invited)
  }

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-5 sm:px-6 pt-5">
        <h2 className="text-[15px] font-semibold text-zinc-900">{s.composer.title}</h2>
        <p className="mt-0.5 text-[13px] text-zinc-500">{fmt(s.composer.body, { days: INVITE_TTL_DAYS })}</p>
      </div>

      <div className="px-5 sm:px-6 pt-4 pb-5 space-y-2">
        <div className="hidden sm:flex gap-2 text-xs font-medium text-zinc-500">
          <label htmlFor={`${id}-email-0`} className="flex-1">
            {s.composer.email}
          </label>
          <span className="w-[200px]">{s.composer.role}</span>
          <span className="w-8" />
        </div>
        <AnimatePresence initial={false}>
          {rows.map((row, i) => {
            const err = errors[row.key]
            return (
              <motion.div
                key={row.key}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: ease.out }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-2">
                    <input
                      id={`${id}-email-${i}`}
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      value={row.email}
                      onChange={e => update(row.key, { email: e.target.value })}
                      onPaste={e => onPaste(row, e)}
                      onKeyDown={e => e.key === 'Enter' && filled.length && send()}
                      placeholder={s.composer.emailPlaceholder}
                      aria-label={s.composer.email}
                      aria-invalid={!!err}
                      aria-describedby={err ? `${id}-err-${row.key}` : undefined}
                      className={clsx(inputClass, 'sm:flex-1', err && 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/15')}
                    />
                    <RoleSelect
                      value={row.role}
                      onChange={role => update(row.key, { role })}
                      allowed={allowed}
                      label={s.composer.role}
                      title={s.composer.roleHint}
                      className="!h-9 w-full sm:w-[200px] shrink-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRows(rs => (rs.length > 1 ? rs.filter(r => r.key !== row.key) : [blank(defaultRole)]))}
                    className="mt-0.5 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-900/[0.05] hover:text-zinc-700"
                    aria-label={fmt(s.composer.removeRow, { email: row.email || s.composer.email })}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {err && (
                  <p id={`${id}-err-${row.key}`} role="alert" className="mt-1 flex items-center gap-1.5 text-xs text-rose-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {s.composer.errors[err]}
                  </p>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            className="-ml-2"
            onClick={() => setRows(rs => [...rs, blank(rs[rs.length - 1]?.role ?? defaultRole)])}
          >
            {s.composer.addRow}
          </Button>
          <p className="text-xs text-zinc-400">{s.composer.paste}</p>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-4 border-t border-line bg-zinc-50/60 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-zinc-500 mb-1.5">{s.composer.frameworks}</div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={s.composer.frameworks}>
            <Chip on={scope.length === 0} onClick={() => setScope([])}>
              {a.allFrameworks}
            </Chip>
            {region.frameworks.map(f => (
              <Chip key={f} on={scope.includes(f)} onClick={() => toggleScope(f)}>
                {fw.short(f)}
              </Chip>
            ))}
          </div>
        </div>
        <Button variant="primary" icon={Send} onClick={send} disabled={!filled.length} className="self-end lg:self-auto">
          {filled.length > 1 ? fmt(s.composer.sendMany, { n: filled.length }) : s.composer.send}
        </Button>
      </div>
    </Card>
  )
}
