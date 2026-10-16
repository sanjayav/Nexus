import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, Copy, Check, Trash2, AlertTriangle, Plus, ChevronDown, ChevronUp, Shield } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { Card, Button, Badge } from '../design-system'
import { scim, type ScimToken, type ScimTokenCreated } from '../lib/api'

// Role slugs are API values; display labels come from scim.roles.<slug>.
const ROLE_OPTIONS = ['viewer', 'analyst', 'team-lead', 'auditor']

export default function ScimTokens() {
  const { t, i18n } = useTranslation()
  // Keep the browser-default locale for English; switch only for zh.
  const dateLocale = i18n.language?.startsWith('zh') ? 'zh-CN' : undefined
  const roleLabel = (slug: string) => t(`scim.roles.${slug}`, { defaultValue: slug })
  const [tokens, setTokens] = useState<ScimToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [defaultRole, setDefaultRole] = useState('viewer')
  const [created, setCreated] = useState<ScimTokenCreated | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await scim.list()
      setTokens(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('scim.errors.load'))
    } finally {
      setLoading(false)
    }
    // i18n.t (not t) so a language switch doesn't refetch the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const result = await scim.create(defaultRole)
      setCreated(result)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('scim.errors.create'))
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const handleRevoke = async (id: string) => {
    if (!window.confirm(t('scim.confirmRevoke'))) return
    setRevoking(id)
    try {
      await scim.revoke(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('scim.errors.revoke'))
    } finally {
      setRevoking(null)
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const scimBaseUrl = `${baseUrl}/api/scim/v2`

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('scim.breadcrumbAdmin') },
          { label: t('scim.breadcrumb') },
        ]}
        eyebrow={t('scim.eyebrow')}
        title={t('scim.title')}
        subtitle={t('scim.subtitle')}
      />

      {error && (
        <Card variant="outlined" className="mb-4 border-[var(--accent-red-light)]">
          <div className="flex items-start gap-3 text-[13px] text-[var(--accent-red)]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        </Card>
      )}

      {created && (
        <Card variant="outlined" className="mb-5 border-[var(--accent-amber)]">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-[var(--accent-amber)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-primary)] text-[14px]">{t('scim.reveal.title')}</div>
              <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                {t('scim.reveal.body')}
              </div>
            </div>
            <button onClick={() => setCreated(null)} className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              {t('scim.reveal.dismiss')}
            </button>
          </div>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[12px] font-mono text-[var(--text-primary)] break-all">
              {created.token}
            </code>
            <Button variant="secondary" size="md" onClick={handleCopy} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
              {copied ? t('scim.reveal.copied') : t('scim.reveal.copy')}
            </Button>
          </div>
        </Card>
      )}

      <Card variant="paper" className="mb-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{t('scim.generate.heading')}</h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-1">
              {t('scim.generate.intro')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[200px]">
            <label className="block text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t('scim.generate.defaultRole')}</label>
            <select
              value={defaultRole}
              onChange={e => setDefaultRole(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)]"
            >
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </div>
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={creating}
            icon={<Plus className="w-4 h-4" />}
          >
            {t('scim.generate.button')}
          </Button>
        </div>
      </Card>

      <Card variant="paper" className="mb-5">
        <button
          onClick={() => setShowSetup(s => !s)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{t('scim.setup.heading')}</h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-1">{t('scim.setup.intro')}</p>
          </div>
          {showSetup ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
        </button>
        {showSetup && (
          <div className="mt-4 space-y-3 text-[12.5px] text-[var(--text-secondary)]">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t('scim.setup.baseUrl')}</div>
              <code className="block px-3 py-2 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[12px] font-mono text-[var(--text-primary)]">
                {scimBaseUrl}
              </code>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t('scim.setup.authentication')}</div>
              <div>{t('scim.setup.authBody')}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t('scim.setup.endpoints')}</div>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><code className="font-mono">GET /ServiceProviderConfig</code> · <code className="font-mono">GET /ResourceTypes</code> · <code className="font-mono">GET /Schemas</code></li>
                <li><code className="font-mono">GET, POST /Users</code> {t('scim.setup.filterBy')} <code className="font-mono">userName eq</code> / <code className="font-mono">externalId eq</code>{t('scim.setup.filterClose')}</li>
                <li><code className="font-mono">GET, PUT, PATCH, DELETE /Users/{'{id}'}</code> {t('scim.setup.softDelete')}</li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t('scim.setup.azureTitle')}</div>
              <div>{t('scim.setup.azureBody')}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t('scim.setup.oktaTitle')}</div>
              <div>{t('scim.setup.oktaBody')}</div>
            </div>
          </div>
        )}
      </Card>

      <Card variant="paper">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> {t('scim.table.heading')}
          </h3>
          <Badge variant="gray">{tokens.length}</Badge>
        </div>
        {loading ? (
          <SkeletonTable rows={3} cols={5} />
        ) : tokens.length === 0 ? (
          <EmptyState
            icon={Shield}
            title={t('scim.table.emptyTitle')}
            body={t('scim.table.emptyBody')}
            density="compact"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <th className="py-2 pr-3">{t('scim.table.prefix')}</th>
                  <th className="py-2 pr-3">{t('scim.table.defaultRole')}</th>
                  <th className="py-2 pr-3">{t('scim.table.status')}</th>
                  <th className="py-2 pr-3">{t('scim.table.lastUsed')}</th>
                  <th className="py-2 pr-3">{t('scim.table.created')}</th>
                  <th className="py-2 pr-3 text-right">{t('scim.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(tok => (
                  <tr key={tok.id} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2.5 pr-3 font-mono text-[12px] text-[var(--text-primary)]">{tok.prefix}…</td>
                    <td className="py-2.5 pr-3 text-[var(--text-primary)]">{roleLabel(tok.defaultRoleSlug)}</td>
                    <td className="py-2.5 pr-3">
                      {tok.isActive
                        ? <Badge variant="green">{t('scim.table.active')}</Badge>
                        : <Badge variant="gray">{t('scim.table.revoked')}</Badge>}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">
                      {tok.lastUsedAt ? new Date(tok.lastUsedAt).toLocaleString(dateLocale) : t('scim.table.never')}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{new Date(tok.createdAt).toLocaleDateString(dateLocale)}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {tok.isActive && (
                        <Button
                          size="xs"
                          variant="danger"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          loading={revoking === tok.id}
                          onClick={() => handleRevoke(tok.id)}
                        >
                          {t('scim.table.revoke')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
