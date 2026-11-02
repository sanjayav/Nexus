import { useMemo, useState } from 'react'
import {
  Ban,
  KeyRound,
  LogIn,
  MailPlus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { fmt, useStrings } from '@/lib/i18n'
import { Button, Card, EmptyState, Tabs } from '@/components/ui'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useDirectory } from '@/features/access/AccessContext'
import { accessStrings } from '@/features/access/access.strings'
import type { AccessEvent, AccessEventKind } from '@/features/access/store'
import { iamCenterStrings } from '@/features/admin/iamCenter.strings'
import { useRelativeTime } from './shared'

type Filter = 'all' | 'changes' | 'signIns'

const ICON: Record<AccessEventKind, { icon: LucideIcon; tone: string }> = {
  invite: { icon: MailPlus, tone: 'text-sky-600 bg-sky-50' },
  invite_resent: { icon: MailPlus, tone: 'text-sky-600 bg-sky-50' },
  invite_revoked: { icon: UserMinus, tone: 'text-zinc-500 bg-zinc-100' },
  invite_accepted: { icon: UserCheck, tone: 'text-emerald-600 bg-emerald-50' },
  role_changed: { icon: Users, tone: 'text-zinc-600 bg-zinc-100' },
  scope_changed: { icon: Users, tone: 'text-zinc-600 bg-zinc-100' },
  suspended: { icon: Ban, tone: 'text-rose-600 bg-rose-50' },
  reactivated: { icon: RotateCcw, tone: 'text-emerald-600 bg-emerald-50' },
  removed: { icon: UserMinus, tone: 'text-rose-600 bg-rose-50' },
  permission_granted: { icon: KeyRound, tone: 'text-amber-700 bg-amber-50' },
  permission_revoked: { icon: KeyRound, tone: 'text-amber-700 bg-amber-50' },
  permissions_reset: { icon: KeyRound, tone: 'text-amber-700 bg-amber-50' },
  policy_changed: { icon: ShieldCheck, tone: 'text-amber-700 bg-amber-50' },
  sign_in: { icon: LogIn, tone: 'text-zinc-500 bg-zinc-100' },
  sign_in_failed: { icon: ShieldAlert, tone: 'text-rose-600 bg-rose-50' },
}

const SIGN_IN: AccessEventKind[] = ['sign_in', 'sign_in_failed']

/** Persisted record of every access change and sign-in in this workspace. */
export function AccessLog({ memberId, onClearMember }: { memberId: string | null; onClearMember: () => void }) {
  const s = useStrings(iamCenterStrings)
  const a = useStrings(accessStrings)
  const rel = useRelativeTime()
  const { region } = useWorkspace()
  const { members, events } = useDirectory()
  const [filter, setFilter] = useState<Filter>('all')
  const nameOf = (id?: string) =>
    id ? (members.find(m => m.id === id)?.name ?? members.find(m => m.id === id)?.email ?? id) : s.log.system
  const focus = members.find(m => m.id === memberId)

  const rows = useMemo(
    () =>
      events
        .filter(e => filter === 'all' || (filter === 'signIns') === SIGN_IN.includes(e.kind))
        .filter(e => !focus || e.actorId === focus.id || e.target === focus.id || e.target === focus.email),
    [events, filter, focus],
  )

  const describe = (e: AccessEvent) =>
    fmt(s.log.events[e.kind], {
      actor: nameOf(e.actorId),
      target: nameOf(e.target),
      role: e.role ? a.roles[e.role].name : '',
      from: e.from ? a.roles[e.from].name : '',
      permission: e.permission ? a.perms[e.permission] : '',
    })

  return (
    <Card padded={false}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 border-b border-line">
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold text-zinc-900">{s.log.title}</h2>
          <p className="mt-0.5 text-[13px] text-zinc-500">{focus ? fmt(s.log.showingFor, { name: focus.name }) : s.log.body}</p>
        </div>
        {focus ? (
          <Button size="sm" onClick={onClearMember}>
            {s.log.showAll}
          </Button>
        ) : (
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: s.log.all },
              { value: 'changes', label: s.log.changes },
              { value: 'signIns', label: s.log.signIns },
            ]}
          />
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={s.log.empty} />
      ) : (
        <ol className="divide-y divide-line">
          {rows.slice(0, 100).map(e => {
            const { icon: Icon, tone } = ICON[e.kind]
            return (
              <li key={e.id} className="flex items-start gap-3 px-5 sm:px-6 py-3">
                <span className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', tone)}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <p className="flex-1 min-w-0 text-[13px] text-zinc-800 leading-relaxed pt-0.5">{describe(e)}</p>
                <time dateTime={e.at} className="shrink-0 text-xs text-zinc-500 tabular pt-1">
                  {rel(e.at)}
                </time>
              </li>
            )
          })}
        </ol>
      )}
      {region.id === 'cn' && <p className="px-5 sm:px-6 py-3 border-t border-line text-xs text-zinc-500">{s.log.pipl}</p>}
    </Card>
  )
}
