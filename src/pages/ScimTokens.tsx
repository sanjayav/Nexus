import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Copy, Check, Trash2, AlertTriangle, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card, Button, Badge } from '../design-system'
import { scim, type ScimToken, type ScimTokenCreated } from '../lib/api'

const ROLE_OPTIONS = ['viewer', 'analyst', 'team-lead', 'auditor']

export default function ScimTokens() {
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
      setError(e instanceof Error ? e.message : 'Failed to load SCIM tokens')
    } finally {
      setLoading(false)
    }
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
      setError(e instanceof Error ? e.message : 'Failed to create SCIM token')
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
    if (!window.confirm('Revoke this token? Any IdP using it will lose access immediately.')) return
    setRevoking(id)
    try {
      await scim.revoke(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke token')
    } finally {
      setRevoking(null)
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const scimBaseUrl = `${baseUrl}/api/scim/v2`

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Identity"
        title="SCIM provisioning"
        subtitle="Issue a SCIM 2.0 bearer token so an identity provider (Azure AD, Okta, OneLogin) can sync users into this workspace automatically."
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
              <div className="font-semibold text-[var(--text-primary)] text-[14px]">Token generated</div>
              <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                This is the only time you will see this token. Copy it now and paste it into your IdP. We store only a hash.
              </div>
            </div>
            <button onClick={() => setCreated(null)} className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              Dismiss
            </button>
          </div>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[12px] font-mono text-[var(--text-primary)] break-all">
              {created.token}
            </code>
            <Button variant="secondary" size="md" onClick={handleCopy} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </Card>
      )}

      <Card variant="paper" className="mb-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Generate a new SCIM token</h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-1">
              New users provisioned via this token get the role you choose here by default.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[200px]">
            <label className="block text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Default role</label>
            <select
              value={defaultRole}
              onChange={e => setDefaultRole(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)]"
            >
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={creating}
            icon={<Plus className="w-4 h-4" />}
          >
            Generate token
          </Button>
        </div>
      </Card>

      <Card variant="paper" className="mb-5">
        <button
          onClick={() => setShowSetup(s => !s)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">IdP setup instructions</h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-1">SCIM 2.0 base URL and configuration for Azure AD, Okta, and OneLogin.</p>
          </div>
          {showSetup ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
        </button>
        {showSetup && (
          <div className="mt-4 space-y-3 text-[12.5px] text-[var(--text-secondary)]">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">SCIM Base URL</div>
              <code className="block px-3 py-2 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[12px] font-mono text-[var(--text-primary)]">
                {scimBaseUrl}
              </code>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Authentication</div>
              <div>Bearer token (paste the value shown when generating).</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Supported endpoints</div>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><code className="font-mono">GET /ServiceProviderConfig</code> · <code className="font-mono">GET /ResourceTypes</code> · <code className="font-mono">GET /Schemas</code></li>
                <li><code className="font-mono">GET, POST /Users</code> (filter by <code className="font-mono">userName eq</code> / <code className="font-mono">externalId eq</code>)</li>
                <li><code className="font-mono">GET, PUT, PATCH, DELETE /Users/{'{id}'}</code> (DELETE soft-deactivates the user)</li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Azure AD</div>
              <div>Enterprise applications → your app → Provisioning. Set "Tenant URL" to the base URL above and paste the token into "Secret Token". Test connection then start provisioning.</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Okta</div>
              <div>Application → Provisioning → Integration. Enable API integration, paste the base URL into "SCIM connector base URL" and the token under "OAuth Bearer Token".</div>
            </div>
          </div>
        )}
      </Card>

      <Card variant="paper">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Active tokens
          </h3>
          <Badge variant="gray">{tokens.length}</Badge>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)] py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-[13px] text-[var(--text-tertiary)] py-6">No SCIM tokens yet. Generate one above to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <th className="py-2 pr-3">Prefix</th>
                  <th className="py-2 pr-3">Default role</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Last used</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(t => (
                  <tr key={t.id} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2.5 pr-3 font-mono text-[12px] text-[var(--text-primary)]">{t.prefix}…</td>
                    <td className="py-2.5 pr-3 text-[var(--text-primary)]">{t.defaultRoleSlug}</td>
                    <td className="py-2.5 pr-3">
                      {t.isActive
                        ? <Badge variant="green">active</Badge>
                        : <Badge variant="gray">revoked</Badge>}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">
                      {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : 'never'}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {t.isActive && (
                        <Button
                          size="xs"
                          variant="danger"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          loading={revoking === t.id}
                          onClick={() => handleRevoke(t.id)}
                        >
                          Revoke
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
