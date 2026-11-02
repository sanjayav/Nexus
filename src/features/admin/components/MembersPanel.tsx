import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Ban, History, Layers, RotateCcw, Search, UserMinus, Users } from 'lucide-react'
import { fmt, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { Avatar, Badge, Button, Card, Dialog, EmptyState, ease, inputClass } from '@/components/ui'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useFrameworkLabels } from '@/lib/i18n/shared/frameworkCatalog'
import { useAccess, useAccessActions, useDirectory } from '@/features/access/AccessContext'
import { accessStrings } from '@/features/access/access.strings'
import { assignableRoles, checkMemberChange, ROLE_ORDER, type Member, type RoleId } from '@/features/access/model'
import { iamCenterStrings } from '@/features/admin/iamCenter.strings'
import { Chip, RoleSelect, RowMenu, selectClass, useRelativeTime } from './shared'

type Confirm = { kind: 'suspend' | 'remove'; member: Member } | null

/** Active and suspended members with inline role changes and a per-row menu. */
export function MembersPanel({ onShowLog }: { onShowLog: (memberId: string) => void }) {
  const s = useStrings(iamCenterStrings)
  const a = useStrings(accessStrings)
  const fw = useFrameworkLabels()
  const rel = useRelativeTime()
  const { member: me } = useAccess()
  const { members, permissions } = useDirectory()
  const actions = useAccessActions()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleId | ''>('')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [scopeFor, setScopeFor] = useState<Member | null>(null)

  const people = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members
      .filter(m => m.status !== 'invited')
      .filter(m => !role || m.role === role)
      .filter(m => !q || `${m.name} ${m.email} ${m.title ?? ''}`.toLowerCase().includes(q))
      .sort(
        (x, y) =>
          Number(y.id === me?.id) - Number(x.id === me?.id) ||
          Number(x.status === 'suspended') - Number(y.status === 'suspended') ||
          ROLE_ORDER.indexOf(x.role) - ROLE_ORDER.indexOf(y.role) ||
          x.name.localeCompare(y.name),
      )
  }, [members, query, role, me?.id])

  const allowed = me ? assignableRoles(me) : []
  const block = (target: Member, next?: RoleId) => (me ? checkMemberChange(me, target, members, permissions, next) : 'forbidden')

  const changeRole = (m: Member, next: RoleId) => {
    const r = actions.changeRole(m.id, next)
    toast(r.ok ? fmt(s.toasts.roleChanged, { name: m.name, role: a.roles[next].name }) : s.errors[r.error], r.ok ? 'success' : 'warning')
  }
  const reactivate = (m: Member) => {
    const r = actions.setStatus(m.id, 'active')
    toast(r.ok ? fmt(s.toasts.reactivated, { name: m.name }) : s.errors[r.error], r.ok ? 'success' : 'warning')
  }
  const confirmAction = () => {
    if (!confirm) return
    const { kind, member: m } = confirm
    const r = kind === 'suspend' ? actions.setStatus(m.id, 'suspended') : actions.remove(m.id)
    setConfirm(null)
    toast(
      r.ok ? fmt(kind === 'suspend' ? s.toasts.suspended : s.toasts.removed, { name: m.name }) : s.errors[r.error],
      r.ok ? 'success' : 'warning',
    )
  }

  return (
    <Card padded={false}>
      <div className="flex flex-col sm:flex-row gap-2 p-4 sm:px-5 border-b border-line">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={s.list.search}
            aria-label={s.list.searchLabel}
            className={inputClass + ' pl-9'}
          />
        </div>
        <select
          value={role}
          onChange={e => setRole(e.target.value as RoleId | '')}
          aria-label={s.list.roleFilter}
          className={selectClass + ' !h-9 sm:w-48'}
        >
          <option value="">{s.list.allRoles}</option>
          {ROLE_ORDER.map(r => (
            <option key={r} value={r}>
              {a.roles[r].name}
            </option>
          ))}
        </select>
      </div>

      {people.length === 0 ? (
        <EmptyState
          icon={Users}
          title={s.list.emptyTitle}
          description={s.list.emptyBody}
          action={
            <Button size="sm" onClick={() => (setQuery(''), setRole(''))}>
              {s.list.clear}
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          <AnimatePresence initial={false}>
            {people.map(m => {
              const isMe = m.id === me?.id
              const roleBlock = block(m)
              const suspended = m.status === 'suspended'
              return (
                <motion.li
                  key={m.id}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, ease: ease.out }}
                  aria-label={m.name}
                  className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.6fr)_180px_minmax(0,1fr)_110px_32px] items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={m.name} muted={suspended} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={
                            suspended
                              ? 'text-[13.5px] font-medium text-zinc-500 truncate'
                              : 'text-[13.5px] font-medium text-zinc-900 truncate'
                          }
                        >
                          {m.name}
                        </span>
                        {isMe && <Badge className="!h-5 !px-1.5 !text-[11px]">{s.list.you}</Badge>}
                        {suspended && (
                          <Badge tone="danger" className="!h-5 !px-1.5 !text-[11px]">
                            {s.status.suspended}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {m.email}
                        {m.title && <span className="hidden sm:inline"> · {m.title}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="col-start-1 md:col-start-auto row-start-2 md:row-start-auto pl-11 md:pl-0">
                    <RoleSelect
                      value={m.role}
                      onChange={next => changeRole(m, next)}
                      allowed={allowed}
                      disabled={!!roleBlock}
                      label={`${s.list.role}: ${m.name}`}
                      title={roleBlock ? s.errors[roleBlock] : undefined}
                      className="w-full max-w-[200px]"
                    />
                  </div>

                  <div
                    className="hidden md:block min-w-0 text-xs text-zinc-600 truncate"
                    title={m.scope.map(id => fw.short(id)).join(' · ')}
                  >
                    {m.scope.length ? (
                      m.scope.map(id => fw.short(id)).join(' · ')
                    ) : (
                      <span className="text-zinc-400">{a.allFrameworks}</span>
                    )}
                  </div>

                  <div className="hidden md:block text-xs text-zinc-500 tabular whitespace-nowrap">
                    {m.lastActiveAt ? rel(m.lastActiveAt) : s.list.never}
                  </div>

                  <div className="row-start-1 col-start-2 md:row-start-auto md:col-start-auto justify-self-end">
                    <RowMenu
                      label={fmt(s.list.actions, { name: m.name })}
                      actions={[
                        { label: s.menu.frameworks, icon: Layers, onSelect: () => setScopeFor(m), hidden: roleBlock === 'outranked' },
                        { label: s.menu.activity, icon: History, onSelect: () => onShowLog(m.id) },
                        {
                          label: s.menu.reactivate,
                          icon: RotateCcw,
                          onSelect: () => reactivate(m),
                          hidden: !suspended || !!block(m, m.role),
                        },
                        {
                          label: s.menu.suspend,
                          icon: Ban,
                          onSelect: () => setConfirm({ kind: 'suspend', member: m }),
                          hidden: suspended || !!roleBlock,
                          danger: true,
                        },
                        {
                          label: s.menu.remove,
                          icon: UserMinus,
                          onSelect: () => setConfirm({ kind: 'remove', member: m }),
                          hidden: !!roleBlock,
                          danger: true,
                        },
                      ]}
                    />
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm ? fmt(confirm.kind === 'suspend' ? s.confirm.suspendTitle : s.confirm.removeTitle, { name: confirm.member.name }) : ''
        }
        description={
          confirm ? fmt(confirm.kind === 'suspend' ? s.confirm.suspendBody : s.confirm.removeBody, { name: confirm.member.name }) : ''
        }
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>{s.confirm.cancel}</Button>
            <Button variant="danger" onClick={confirmAction}>
              {confirm?.kind === 'suspend' ? s.confirm.suspend : s.confirm.remove}
            </Button>
          </>
        }
      />
      <ScopeDialog member={scopeFor} onClose={() => setScopeFor(null)} />
    </Card>
  )
}

function ScopeDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const s = useStrings(iamCenterStrings)
  const fw = useFrameworkLabels()
  const { region } = useWorkspace()
  const { setScope } = useAccessActions()
  const [draft, setDraft] = useState<string[] | null>(null)
  const scope = draft ?? member?.scope ?? []
  const close = () => (setDraft(null), onClose())

  const save = () => {
    if (!member) return
    const r = setScope(member.id, scope)
    toast(r.ok ? fmt(s.toasts.scope, { name: member.name }) : s.errors[r.error], r.ok ? 'success' : 'warning')
    close()
  }

  return (
    <Dialog
      open={!!member}
      onClose={close}
      title={member ? fmt(s.scope.title, { name: member.name }) : ''}
      description={s.scope.body}
      footer={
        <>
          <Button onClick={close}>{s.scope.cancel}</Button>
          <Button variant="primary" onClick={save}>
            {s.scope.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={s.scope.body}>
        <Chip on={scope.length === 0} onClick={() => setDraft([])}>
          {s.scope.all}
        </Chip>
        {region.frameworks.map(f => (
          <Chip key={f} on={scope.includes(f)} onClick={() => setDraft(scope.includes(f) ? scope.filter(x => x !== f) : [...scope, f])}>
            {fw.short(f)}
          </Chip>
        ))}
      </div>
    </Dialog>
  )
}
