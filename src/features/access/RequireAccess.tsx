import { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { fmt, useStrings } from '@/lib/i18n'
import { Avatar, Button, Card, FadeIn } from '@/components/ui'
import { useL10n, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useAccess, useDirectory } from './AccessContext'
import { HOME_PATH, isAdmin, requiredPermission, type Permission } from './model'
import { accessStrings } from './access.strings'

/** Renders the page only if the signed-in member holds the permission its route needs. */
export function RequireAccess({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { can } = useAccess()
  const needed = requiredPermission(pathname)
  if (needed && !can(needed)) return <NoAccess permission={needed} />
  return <>{children}</>
}

function NoAccess({ permission }: { permission: Permission }) {
  const s = useStrings(accessStrings)
  const l10n = useL10n()
  const navigate = useNavigate()
  const { workspace } = useWorkspace()
  const { role } = useAccess()
  const { members } = useDirectory()
  const admins = members.filter(m => isAdmin(m) && m.status === 'active').slice(0, 3)

  return (
    <FadeIn className="max-w-lg mx-auto pt-6 sm:pt-16">
      <Card className="p-6 sm:p-8">
        <div className="w-10 h-10 rounded-xl bg-zinc-900/[0.05] text-zinc-600 flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <p className="mt-5 text-xs font-medium text-zinc-500">{s.noAccess.eyebrow}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-[-0.015em] text-zinc-900">{s.noAccess.title}</h1>
        <p className="mt-2 text-[14px] text-zinc-600 leading-relaxed">
          {fmt(s.noAccess.body, {
            workspace: l10n(workspace.name),
            role: role ? s.roles[role].name : '—',
            permission: s.perms[permission],
          })}
        </p>
        {admins.length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-medium text-zinc-500 mb-2">{s.noAccess.admins}</div>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {admins.map(a => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={a.name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-zinc-900 truncate">{a.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{a.email}</div>
                  </div>
                  <a
                    href={`mailto:${a.email}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label={a.email}
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button variant="primary" className="mt-6" onClick={() => navigate(HOME_PATH)}>
          {s.noAccess.home}
        </Button>
      </Card>
    </FadeIn>
  )
}
