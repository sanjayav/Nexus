import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Copy, Check, Trash2, AlertTriangle, Plus, Loader2, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card, Button, Badge } from '../design-system'
import { apiKeys, type ApiKey, type ApiKeyCreated } from '../lib/api'

const DEFAULT_SCOPES = [
  'data.view',
  'data.upload',
  'data.approve',
  'reports.view',
  'reports.create',
  'analytics.view',
  'workflow.view',
]

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [standardScopes, setStandardScopes] = useState<string[]>(DEFAULT_SCOPES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)
  const [copied, setCopied] = useState(false)

  // Modal form state
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(['data.view']))
  const [expiresInDays, setExpiresInDays] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiKeys.list()
      setKeys(data.keys)
      if (data.standardScopes?.length) setStandardScopes(data.standardScopes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const resetModal = () => {
    setName('')
    setSelectedScopes(new Set(['data.view']))
    setExpiresInDays('')
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    if (selectedScopes.size === 0) { setError('Pick at least one scope'); return }
    setCreating(true)
    setError(null)
    try {
      const days = expiresInDays ? Number(expiresInDays) : undefined
      const result = await apiKeys.create({
        name: name.trim(),
        scopes: Array.from(selectedScopes),
        expiresInDays: days && Number.isFinite(days) ? days : undefined,
      })
      setCreated(result)
      setShowModal(false)
      resetModal()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create API key')
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
    } catch { /* clipboard blocked */ }
  }

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this key? Any client using it will lose access immediately.')) return
    setRevoking(id)
    try {
      await apiKeys.revoke(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke key')
    } finally {
      setRevoking(null)
    }
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => {
      const next = new Set(prev)
      if (next.has(scope)) next.delete(scope)
      else next.add(scope)
      return next
    })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Integrations"
        title="API keys"
        subtitle="Issue programmatic tokens for CI pipelines, BI tools, and ERP push connectors. Scopes follow the same permission model as user roles."
        actions={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            Generate key
          </Button>
        }
      />

      {error && (
        <Card variant="outlined" className="mb-4 border-[var(--accent-red-light)]">
          <div className="flex items-start gap-3 text-[13px] text-[var(--accent-red)]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        </Card>
      )}

      {/* One-time token reveal */}
      {created && (
        <Card variant="outlined" className="mb-5 border-[var(--accent-amber)]">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-[var(--accent-amber)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-primary)] text-[14px]">{created.key.name}</div>
              <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                {created.warning}
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
            <Button
              variant="secondary"
              size="md"
              onClick={handleCopy}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="mt-3 text-[12px] text-[var(--text-tertiary)]">
            Scopes: {created.key.scopes.join(', ') || '—'}
          </div>
        </Card>
      )}

      {/* Active keys table */}
      <Card variant="paper">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Active keys
          </h3>
          <Badge variant="gray">{keys.length}</Badge>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)] py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : keys.length === 0 ? (
          <div className="text-[13px] text-[var(--text-tertiary)] py-6">
            No API keys yet. Generate one to start pushing data programmatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Prefix</th>
                  <th className="py-2 pr-3">Scopes</th>
                  <th className="py-2 pr-3">Expires</th>
                  <th className="py-2 pr-3">Last used</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2.5 pr-3 text-[var(--text-primary)] font-medium">{k.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-[12px] text-[var(--text-primary)]">{k.prefix}…</td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.slice(0, 3).map(s => <Badge key={s} variant="gray">{s}</Badge>)}
                        {k.scopes.length > 3 && (
                          <span className="text-[11px] text-[var(--text-tertiary)]">+{k.scopes.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">
                      {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'never'}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'never'}
                    </td>
                    <td className="py-2.5 pr-3">
                      {k.isActive
                        ? <Badge variant="green">active</Badge>
                        : <Badge variant="gray">revoked</Badge>}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      {k.isActive && (
                        <Button
                          size="xs"
                          variant="danger"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          loading={revoking === k.id}
                          onClick={() => handleRevoke(k.id)}
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

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Generate API key</h2>
              <button
                onClick={() => { setShowModal(false); resetModal() }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. CI pipeline push"
                  className="w-full h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-2">Scopes</label>
                <div className="grid grid-cols-2 gap-2">
                  {standardScopes.map(scope => (
                    <label key={scope} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.has(scope)}
                        onChange={() => toggleScope(scope)}
                      />
                      <span className="font-mono text-[12px] text-[var(--text-primary)]">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Expires in (days)</label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={expiresInDays}
                  onChange={e => setExpiresInDays(e.target.value)}
                  placeholder="leave blank = never"
                  className="w-full h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-default)]">
              <Button variant="secondary" onClick={() => { setShowModal(false); resetModal() }}>Cancel</Button>
              <Button variant="primary" loading={creating} onClick={handleCreate}>Generate</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
