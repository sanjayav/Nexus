import { Users, Shield, CheckCircle2, XCircle, Search, KeyRound } from 'lucide-react'
import { mockData } from '../data/mockData'
import { useMemo, useState } from 'react'
import { fmt, useFormat, useStrings } from '../i18n'
import { rolesCredentialsStrings } from '../i18n/pages/rolesCredentials'
import { PageHeader, Card, CardHeader, Badge, Button, StatCard, EmptyState, inputClass, tableClass, Tone } from '../components/ui'

const ROLE_TONE: Record<string, Tone> = { Approver: 'success', Reviewer: 'info' }

export default function RolesCredentials() {
  const s = useStrings(rolesCredentialsStrings)
  const f = useFormat()
  const { rolesCredentials } = mockData
  const [showMyApprovals, setShowMyApprovals] = useState(false)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const roleOptions = ['Approver', 'Reviewer', 'Analyst']
  const roleLabel = (r: string) => s.roles[r as keyof typeof s.roles] ?? r
  const totalActions = rolesCredentials.reduce((sum, cred) => sum + cred.actionsCount, 0)
  const roleCount = new Set(rolesCredentials.map(c => c.role)).size

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rolesCredentials.filter(c => {
      if (roleFilter !== 'all' && c.role !== roleFilter) return false
      if (q && !c.did.toLowerCase().includes(q) && !c.vcHash.toLowerCase().includes(q)) return false
      return true
    })
  }, [rolesCredentials, query, roleFilter])

  return (
    <div>
      <PageHeader title={s.title} description={s.description} />

      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label={s.activeDids} value={f.number(rolesCredentials.length)} icon={Users} deltaLabel={fmt(s.byRole, { count: roleCount })} />
          <StatCard label={s.vcHashes} value={f.number(rolesCredentials.length)} icon={Shield} deltaLabel={s.verifiable} />
          <StatCard label={s.lastRevocation} value={f.number(0)} icon={XCircle} deltaLabel={s.noRevocations} />
          <StatCard label={s.totalActions} value={f.number(totalActions)} icon={CheckCircle2} deltaLabel={s.anchorsApprovals} />
        </div>

        <Card>
          <CardHeader icon={KeyRound} title={s.credentials} description={s.credentialsSub} />

          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={s.searchPlaceholder}
                aria-label={s.searchLabel}
                className={inputClass + ' pl-9'}
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              aria-label={s.roleFilterLabel}
              className={inputClass + ' md:w-44 cursor-pointer'}
            >
              <option value="all">{s.allRoles}</option>
              {roleOptions.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 h-9 px-3 rounded-[10px] border border-line bg-white shadow-sm cursor-pointer hover:bg-zinc-50 transition-colors">
              <input
                type="checkbox"
                checked={showMyApprovals}
                onChange={e => setShowMyApprovals(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-brand-500/40"
              />
              <span className="text-sm text-zinc-700 whitespace-nowrap">{s.showMyApprovals}</span>
            </label>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={Search}
              title={s.emptyTitle}
              description={s.emptyBody}
              action={<Button size="sm" onClick={() => { setQuery(''); setRoleFilter('all') }}>{s.clearFilters}</Button>}
            />
          ) : (
            <div className={tableClass.wrap}>
              <table className={tableClass.table}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>{s.th.did}</th>
                    <th className={tableClass.th}>{s.th.role}</th>
                    <th className={tableClass.th}>{s.th.vcHash}</th>
                    <th className={tableClass.th}>{s.th.issuedAt}</th>
                    <th className={tableClass.th}>{s.th.status}</th>
                    <th className={tableClass.th + ' text-right'}>{s.th.actions}</th>
                    <th className={tableClass.th}>{s.th.lastActivity}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(c => (
                    <tr key={c.did} className={tableClass.tr}>
                      <td className={tableClass.td + ' font-mono text-[13px] text-zinc-900 whitespace-nowrap'}>{c.did}</td>
                      <td className={tableClass.td}>
                        <Badge tone={ROLE_TONE[c.role] ?? 'neutral'}>{roleLabel(c.role)}</Badge>
                      </td>
                      <td className={tableClass.td + ' font-mono text-xs text-zinc-500 whitespace-nowrap'}>{c.vcHash}</td>
                      <td className={tableClass.td + ' whitespace-nowrap tabular'}>{f.date(c.issuedAt)}</td>
                      <td className={tableClass.td}>
                        {c.revoked ? (
                          <Badge tone="danger" icon={XCircle}>{s.revoked}</Badge>
                        ) : (
                          <Badge tone="success" icon={CheckCircle2}>{s.valid}</Badge>
                        )}
                      </td>
                      <td className={tableClass.td + ' text-right tabular font-medium text-zinc-900'}>{f.number(c.actionsCount)}</td>
                      <td className={tableClass.td + ' whitespace-nowrap tabular'}>{f.date(c.lastActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
