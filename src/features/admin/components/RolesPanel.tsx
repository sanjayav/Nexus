import { Fragment } from 'react'
import { Check, Lock, RotateCcw, ShieldCheck, X } from 'lucide-react'
import clsx from 'clsx'
import { fmt, useStrings } from '@/lib/i18n'
import { toast } from '@/lib/hooks/useToast'
import { Badge, Button, Card, CardHeader, Switch, type Tone } from '@/components/ui'
import { useAccessActions, useDirectory } from '@/features/access/AccessContext'
import { accessStrings } from '@/features/access/access.strings'
import {
  LOCKED_GRANTS,
  PERMISSION_GROUPS,
  permissionsFor,
  ROLE_ORDER,
  type Permission,
  type RoleId,
  type Risk,
} from '@/features/access/model'
import { iamCenterStrings } from '@/features/admin/iamCenter.strings'

const RISK_TONE: Record<Risk, Tone> = { low: 'neutral', medium: 'warning', high: 'danger' }

/** Approval policy, role summaries and the editable permission matrix. */
export function RolesPanel() {
  const s = useStrings(iamCenterStrings)
  const a = useStrings(accessStrings)
  const { members, permissions, policy } = useDirectory()
  const actions = useAccessActions()
  const customised = Object.keys(permissions).length > 0

  const toggle = (role: RoleId, perm: Permission, granted: boolean) => {
    const r = actions.setPermission(role, perm, granted)
    if (!r.ok) toast(s.errors[r.error], 'warning')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader icon={ShieldCheck} title={s.roles.policyTitle} />
        <label className="flex items-start justify-between gap-4 rounded-xl border border-line p-4">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-zinc-900">{s.roles.fourEyes}</span>
            <span className="block mt-0.5 text-[13px] text-zinc-500 leading-relaxed">{s.roles.fourEyesBody}</span>
          </span>
          <Switch checked={policy.fourEyes} onChange={fourEyes => actions.setPolicy({ fourEyes })} label={s.roles.fourEyes} />
        </label>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {ROLE_ORDER.map(role => {
          const count = members.filter(m => m.role === role && m.status !== 'invited').length
          return (
            <Card key={role} as="article" aria-label={a.roles[role].name} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">{a.roles[role].name}</h3>
                {permissions[role] && <Badge tone="info">{s.roles.customised}</Badge>}
              </div>
              <p className="mt-1 text-[13px] text-zinc-500 leading-relaxed flex-1">{a.roles[role].description}</p>
              <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500 tabular">
                <span>{fmt(s.roles.members, { n: count })}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                <span>{fmt(s.roles.permissions, { n: permissionsFor(role, permissions).length })}</span>
              </div>
            </Card>
          )
        })}
      </div>

      <Card padded={false}>
        <div className="flex flex-col lg:flex-row lg:items-start gap-3 px-5 sm:px-6 py-4 border-b border-line">
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-zinc-900">{s.roles.matrixTitle}</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500 leading-relaxed">{s.roles.matrixBody}</p>
          </div>
          <Button
            size="sm"
            icon={RotateCcw}
            disabled={!customised}
            onClick={() => {
              const r = actions.resetPermissions()
              toast(r.ok ? s.toasts.reset : s.errors[r.error], r.ok ? 'success' : 'warning')
            }}
          >
            {s.roles.reset}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-50 text-left text-xs font-medium text-zinc-500 px-5 sm:px-6 py-3 border-b border-r border-line min-w-[220px]">
                  {s.roles.permission}
                </th>
                {ROLE_ORDER.map(r => (
                  <th
                    key={r}
                    scope="col"
                    className="px-2 py-3 text-center text-xs font-medium text-zinc-700 border-b border-line bg-zinc-50/60 min-w-[92px] align-bottom"
                  >
                    <div className="leading-tight">{a.roles[r].name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map(group => (
                <Fragment key={group.id}>
                  <tr>
                    <th
                      scope="rowgroup"
                      colSpan={ROLE_ORDER.length + 1}
                      className="text-left px-5 sm:px-6 py-2 text-xs font-semibold text-zinc-700 bg-zinc-50/80 border-b border-line"
                    >
                      <span className="sticky left-5">{a.groups[group.id]}</span>
                    </th>
                  </tr>
                  {group.perms.map(perm => (
                    <tr key={perm.id} className="hover:bg-zinc-50/50 transition-colors">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-white text-left font-normal px-5 sm:px-6 py-2.5 border-b border-r border-line"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[13px] font-medium text-zinc-900">{a.perms[perm.id]}</span>
                          <Badge tone={RISK_TONE[perm.risk]} className="!h-5">
                            <span className="sr-only">{s.roles.riskLabel[perm.risk]}</span>
                            <span aria-hidden>{s.roles.risk[perm.risk]}</span>
                          </Badge>
                        </div>
                      </th>
                      {ROLE_ORDER.map(role => {
                        const granted = permissionsFor(role, permissions).includes(perm.id)
                        const locked = !!LOCKED_GRANTS[role]?.includes(perm.id)
                        return (
                          <td key={role} className="px-2 py-2.5 text-center border-b border-line">
                            <button
                              type="button"
                              onClick={() => !locked && toggle(role, perm.id, !granted)}
                              disabled={locked}
                              aria-pressed={granted}
                              aria-label={fmt(s.roles.toggle, { role: a.roles[role].name, permission: a.perms[perm.id] })}
                              title={locked ? s.roles.locked : granted ? s.roles.granted : s.roles.notGranted}
                              className={clsx(
                                'w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                                granted
                                  ? locked
                                    ? 'bg-zinc-100 text-zinc-500 cursor-not-allowed'
                                    : 'bg-zinc-900 text-white hover:bg-zinc-700'
                                  : 'border border-line text-zinc-300 hover:border-zinc-400 hover:text-zinc-500',
                              )}
                            >
                              {granted ? (
                                locked ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
