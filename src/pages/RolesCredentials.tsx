import { Users, Shield, CheckCircle2, XCircle, Search, KeyRound, Network, UserPlus, Ban, RotateCcw, ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { fmt, useFormat, useStrings } from '../i18n'
import { rolesCredentialsStrings } from '../i18n/pages/rolesCredentials'
import { PageHeader, Card, CardHeader, Badge, Button, StatCard, EmptyState, inputClass, tableClass, Tone } from '../components/ui'
import { useL10n, useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import { useToast } from '../components/useToast'

const ROLE_TONE: Record<string, Tone> = { Approver: 'success', Reviewer: 'info' }

export default function RolesCredentials() {
  const s = useStrings(rolesCredentialsStrings)
  const f = useFormat()
  const l10n = useL10n()
  const navigate = useNavigate()
  const mockData = useMockData()
  const { region, workspace } = useWorkspace()
  const { toast, show } = useToast()
  const { rolesCredentials } = mockData
  const [showMyApprovals, setShowMyApprovals] = useState(false)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  // Local revocation overrides (demo): did -> revoked
  const [revokedOverride, setRevokedOverride] = useState<Record<string, boolean>>({})

  const network = l10n(region.chain.network)
  const explorer = region.chain.explorer.replace(/\/$/, '')

  const creds = useMemo(
    () => rolesCredentials.map(c => ({ ...c, revoked: revokedOverride[c.did] ?? c.revoked })),
    [rolesCredentials, revokedOverride],
  )

  const roleOptions = useMemo(() => Array.from(new Set(rolesCredentials.map(c => c.role))), [rolesCredentials])
  const roleLabel = (r: string) => s.roles[r as keyof typeof s.roles] ?? r
  const totalActions = creds.reduce((sum, cred) => sum + cred.actionsCount, 0)
  const roleCount = roleOptions.length
  const revokedCount = creds.filter(c => c.revoked).length

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return creds.filter(c => {
      if (showMyApprovals && c.role !== 'Approver') return false
      if (roleFilter !== 'all' && c.role !== roleFilter) return false
      if (q && !c.did.toLowerCase().includes(q) && !c.vcHash.toLowerCase().includes(q)) return false
      return true
    })
  }, [creds, query, roleFilter, showMyApprovals])

  const toggleRevoke = (did: string, revoked: boolean) => {
    setRevokedOverride(prev => ({ ...prev, [did]: !revoked }))
    show(fmt(revoked ? s.reinstatedToast : s.revokedToast, { network }), revoked ? 'success' : 'warning')
  }

  const clearFilters = () => {
    setQuery('')
    setRoleFilter('all')
    setShowMyApprovals(false)
  }

  return (
    <div>
      {toast}
      <PageHeader
        title={s.title}
        description={s.description}
        actions={<Button variant="primary" icon={UserPlus} onClick={() => navigate('/iam')}>{s.issueCredential}</Button>}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label={s.activeDids} value={f.number(creds.length - revokedCount)} icon={Users} deltaLabel={fmt(s.byRole, { count: roleCount })} />
          <StatCard label={s.vcHashes} value={f.number(creds.length)} icon={Shield} deltaLabel={s.verifiable} />
          <StatCard
            label={s.lastRevocation}
            value={f.number(revokedCount)}
            icon={XCircle}
            deltaLabel={revokedCount === 0 ? s.noRevocations : fmt(s.revocationsOn, { network })}
          />
          <StatCard label={s.totalActions} value={f.number(totalActions)} icon={CheckCircle2} deltaLabel={s.anchorsApprovals} />
        </div>

        {/* Trust registry: where credentials are issued and their status is anchored */}
        <Card className="!p-4 sm:!p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                <Network className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-zinc-900">{s.registry}</div>
                <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">
                  {fmt(s.registryBody, { issuer: l10n(workspace.name), network, kind: l10n(region.chain.kind) })}
                </p>
              </div>
            </div>
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              className="sm:ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700 hover:text-emerald-700 whitespace-nowrap"
            >
              {fmt(s.openExplorer, { network })}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </Card>

        <Card>
          <CardHeader icon={KeyRound} title={s.credentials} description={s.credentialsSub} />

          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
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
              action={<Button size="sm" onClick={clearFilters}>{s.clearFilters}</Button>}
            />
          ) : (
            <div className={tableClass.wrap}>
              <table className={clsx(tableClass.table, 'min-w-[880px]')}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>{s.th.did}</th>
                    <th className={tableClass.th}>{s.th.role}</th>
                    <th className={tableClass.th}>{s.th.vcHash}</th>
                    <th className={tableClass.th}>{s.th.issuedAt}</th>
                    <th className={tableClass.th}>{s.th.status}</th>
                    <th className={tableClass.th + ' text-right'}>{s.th.actions}</th>
                    <th className={tableClass.th}>{s.th.lastActivity}</th>
                    <th className={tableClass.th + ' text-right'}>{s.th.manage}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(c => (
                    <tr key={c.did} className={clsx(tableClass.tr, c.revoked && 'opacity-70')}>
                      <td className={tableClass.td + ' font-mono text-[13px] text-zinc-900 whitespace-nowrap'}>{c.did}</td>
                      <td className={tableClass.td}>
                        <Badge tone={ROLE_TONE[c.role] ?? 'neutral'}>{roleLabel(c.role)}</Badge>
                      </td>
                      <td className={tableClass.td + ' font-mono text-xs text-zinc-500 whitespace-nowrap'}>
                        <a
                          href={`${explorer}/tx/${c.vcHash}`}
                          target="_blank"
                          rel="noreferrer"
                          title={fmt(s.viewOn, { network })}
                          className="inline-flex items-center gap-1 hover:text-emerald-700 transition-colors"
                        >
                          {c.vcHash}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
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
                      <td className={tableClass.td + ' text-right whitespace-nowrap'}>
                        <Button
                          size="sm"
                          variant={c.revoked ? 'secondary' : 'ghost'}
                          icon={c.revoked ? RotateCcw : Ban}
                          className={c.revoked ? undefined : 'hover:text-rose-600'}
                          onClick={() => toggleRevoke(c.did, c.revoked)}
                        >
                          {c.revoked ? s.reinstate : s.revoke}
                        </Button>
                      </td>
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
