import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Copy, MailPlus, RefreshCw, Trash2 } from 'lucide-react'
import { fmt, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { Avatar, Badge, Button, Card, Dialog, EmptyState, ease } from '@/components/ui'
import { useAccess, useAccessActions, useDirectory } from '@/features/access/AccessContext'
import { assignableRoles, isExpired, type Member } from '@/features/access/model'
import { iamCenterStrings } from '@/features/admin/iamCenter.strings'
import { copyText, inviteLink, RoleSelect, RowMenu, useRelativeTime } from './shared'

/** Invitations not yet accepted, newest first; expired ones offer a fresh link. */
export function PendingPanel({ onResent }: { onResent: (m: Member) => void }) {
  const s = useStrings(iamCenterStrings)
  const rel = useRelativeTime()
  const { member: me } = useAccess()
  const { members } = useDirectory()
  const actions = useAccessActions()
  const [revoke, setRevoke] = useState<Member | null>(null)
  const invites = members.filter(m => m.status === 'invited').sort((x, y) => (y.invitedAt ?? '').localeCompare(x.invitedAt ?? ''))
  const nameOf = (id?: string) => members.find(m => m.id === id)?.name ?? '—'
  const allowed = me ? assignableRoles(me) : []

  const copy = async (m: Member) => m.token && (await copyText(inviteLink(m.token))) && toast(s.toasts.copied)
  const resend = (m: Member) => {
    const r = actions.resendInvite(m.id)
    if (!r.ok) return toast(s.errors[r.error], 'warning')
    toast(fmt(s.toasts.resent, { email: m.email }))
    onResent(r.value)
  }
  const confirmRevoke = () => {
    if (!revoke) return
    const r = actions.revokeInvite(revoke.id)
    toast(r.ok ? fmt(s.toasts.revoked, { email: revoke.email }) : s.errors[r.error], r.ok ? 'success' : 'warning')
    setRevoke(null)
  }

  if (!invites.length)
    return (
      <Card>
        <EmptyState icon={MailPlus} title={s.list.noPendingTitle} description={s.list.noPendingBody} />
      </Card>
    )

  return (
    <Card padded={false}>
      <ul className="divide-y divide-line">
        <AnimatePresence initial={false}>
          {invites.map(m => {
            const expired = isExpired(m)
            return (
              <motion.li
                key={m.id}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2, ease: ease.out }}
                aria-label={m.email}
                className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.6fr)_180px_auto_32px] items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={m.email} muted />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13.5px] font-medium text-zinc-900 truncate">{m.email}</span>
                      <Badge tone={expired ? 'warning' : 'info'} className="!h-5 !px-1.5 !text-[11px]">
                        {expired ? s.status.expired : s.status.invited}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {m.invitedAt && fmt(s.pending.invitedBy, { name: nameOf(m.invitedBy), when: rel(m.invitedAt) })}
                      {m.expiresAt && (
                        <span className={expired ? 'text-amber-700' : undefined}>
                          {' · '}
                          {fmt(expired ? s.pending.expired : s.pending.expires, { when: rel(m.expiresAt) })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-start-1 md:col-start-auto row-start-2 md:row-start-auto pl-11 md:pl-0">
                  <RoleSelect
                    value={m.role}
                    onChange={role => {
                      const r = actions.changeRole(m.id, role)
                      if (!r.ok) toast(s.errors[r.error], 'warning')
                    }}
                    allowed={allowed}
                    label={`${s.list.role}: ${m.email}`}
                    className="w-full max-w-[200px]"
                  />
                </div>

                <div className="hidden md:flex items-center gap-1.5">
                  {expired ? (
                    <Button size="sm" icon={RefreshCw} onClick={() => resend(m)}>
                      {s.pending.newLink}
                    </Button>
                  ) : (
                    <Button size="sm" icon={Copy} onClick={() => copy(m)}>
                      {s.pending.copy}
                    </Button>
                  )}
                </div>

                <div className="row-start-1 col-start-2 md:row-start-auto md:col-start-auto justify-self-end">
                  <RowMenu
                    label={fmt(s.list.actions, { name: m.email })}
                    actions={[
                      { label: s.pending.copy, icon: Copy, onSelect: () => copy(m), hidden: expired },
                      { label: expired ? s.pending.newLink : s.pending.resend, icon: RefreshCw, onSelect: () => resend(m) },
                      { label: s.pending.revoke, icon: Trash2, onSelect: () => setRevoke(m), danger: true },
                    ]}
                  />
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      <Dialog
        open={!!revoke}
        onClose={() => setRevoke(null)}
        title={revoke ? fmt(s.confirm.revokeTitle, { email: revoke.email }) : ''}
        description={s.confirm.revokeBody}
        footer={
          <>
            <Button onClick={() => setRevoke(null)}>{s.confirm.cancel}</Button>
            <Button variant="danger" onClick={confirmRevoke}>
              {s.confirm.revoke}
            </Button>
          </>
        }
      />
    </Card>
  )
}
