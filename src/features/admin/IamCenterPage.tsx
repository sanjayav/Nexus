import { useState } from 'react'
import { History, KeyRound, LogIn, MailPlus, ShieldCheck, Users } from 'lucide-react'
import { fmt, useFormat, useStrings } from '@/lib/i18n'
import { PageHeader, StatCard, Tabs } from '@/components/ui'
import { useDirectory } from '@/features/access/AccessContext'
import { isAdmin, isExpired, type Member } from '@/features/access/model'
import { iamCenterStrings } from './iamCenter.strings'
import { AccessLog } from './components/AccessLog'
import { IdentityPanel } from './components/IdentityPanel'
import { InviteComposer } from './components/InviteComposer'
import { InviteLinksDialog } from './components/InviteLinksDialog'
import { MembersPanel } from './components/MembersPanel'
import { PendingPanel } from './components/PendingPanel'
import { RolesPanel } from './components/RolesPanel'

type Tab = 'members' | 'pending' | 'roles' | 'identity' | 'log'

/** People and access: invitations, members, roles and permissions, sign-in and the access log. */
export default function IamCenterPage() {
  const s = useStrings(iamCenterStrings)
  const f = useFormat()
  const { members, policy } = useDirectory()
  const [tab, setTab] = useState<Tab>('members')
  const [links, setLinks] = useState<Member[]>([])
  const [logFor, setLogFor] = useState<string | null>(null)

  const active = members.filter(m => m.status === 'active')
  const invites = members.filter(m => m.status === 'invited')
  const expired = invites.filter(m => isExpired(m)).length

  return (
    <div>
      <PageHeader title={s.title} description={s.description} />

      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={s.stats.members}
            icon={Users}
            value={f.number(active.length)}
            deltaLabel={fmt(s.stats.membersSub, { count: members.filter(m => m.status === 'suspended').length })}
          />
          <StatCard
            label={s.stats.pending}
            icon={MailPlus}
            value={f.number(invites.length)}
            deltaLabel={fmt(s.stats.pendingSub, { count: expired })}
          />
          <StatCard label={s.stats.admins} icon={KeyRound} value={f.number(active.filter(isAdmin).length)} deltaLabel={s.stats.adminsSub} />
          <StatCard
            label={s.stats.fourEyes}
            icon={ShieldCheck}
            value={policy.fourEyes ? s.stats.on : s.stats.off}
            deltaLabel={s.stats.fourEyesSub}
          />
        </div>

        <InviteComposer
          onInvited={invited => {
            setLinks(invited)
            setTab('pending')
          }}
        />

        <Tabs
          value={tab}
          onChange={t => (setTab(t), t !== 'log' && setLogFor(null))}
          items={[
            {
              value: 'members',
              label: (
                <>
                  <Users className="w-3.5 h-3.5" />
                  {s.tabs.members}
                </>
              ),
              count: members.length - invites.length,
            },
            {
              value: 'pending',
              label: (
                <>
                  <MailPlus className="w-3.5 h-3.5" />
                  {s.tabs.pending}
                </>
              ),
              count: invites.length,
            },
            {
              value: 'roles',
              label: (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  {s.tabs.roles}
                </>
              ),
            },
            {
              value: 'identity',
              label: (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  {s.tabs.identity}
                </>
              ),
            },
            {
              value: 'log',
              label: (
                <>
                  <History className="w-3.5 h-3.5" />
                  {s.tabs.log}
                </>
              ),
            },
          ]}
        />

        {tab === 'members' && <MembersPanel onShowLog={id => (setLogFor(id), setTab('log'))} />}
        {tab === 'pending' && <PendingPanel onResent={m => setLinks([m])} />}
        {tab === 'roles' && <RolesPanel />}
        {tab === 'identity' && <IdentityPanel />}
        {tab === 'log' && <AccessLog memberId={logFor} onClearMember={() => setLogFor(null)} />}
      </div>

      <InviteLinksDialog invited={links} onClose={() => setLinks([])} />
    </div>
  )
}
