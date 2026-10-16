import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, Copy, Check, Trash2, AlertTriangle, Plus, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { Card, Button, Badge } from '../design-system'
import { apiKeys, type ApiKey, type ApiKeyCreated } from '../lib/api'

// Scope identifiers are API values — shown verbatim (monospace), never translated.
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
  const { t, i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh') ?? false
  // Keep the browser-default locale for English; switch only for zh.
  const dateLocale = isZh ? 'zh-CN' : undefined
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
      setError(e instanceof Error ? e.message : i18n.t('apiKeys.errors.load'))
    } finally {
      setLoading(false)
    }
    // i18n.t (not t) so a language switch doesn't refetch the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { void load() }, [load])

  const resetModal = () => {
    setName('')
    setSelectedScopes(new Set(['data.view']))
    setExpiresInDays('')
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError(t('apiKeys.errors.nameRequired')); return }
    if (selectedScopes.size === 0) { setError(t('apiKeys.errors.pickScope')); return }
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
      setError(e instanceof Error ? e.message : t('apiKeys.errors.create'))
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
    if (!window.confirm(t('apiKeys.confirmRevoke'))) return
    setRevoking(id)
    try {
      await apiKeys.revoke(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('apiKeys.errors.revoke'))
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
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('apiKeys.breadcrumbAdmin') },
          { label: t('apiKeys.breadcrumb') },
        ]}
        eyebrow={t('apiKeys.eyebrow')}
        title={t('apiKeys.title')}
        subtitle={t('apiKeys.subtitle')}
        actions={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            {t('apiKeys.generateKey')}
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
                {isZh ? t('apiKeys.reveal.warning') : created.warning}
              </div>
            </div>
            <button onClick={() => setCreated(null)} className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              {t('apiKeys.reveal.dismiss')}
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
              {copied ? t('apiKeys.reveal.copied') : t('apiKeys.reveal.copy')}
            </Button>
          </div>
          <div className="mt-3 text-[12px] text-[var(--text-tertiary)]">
            {t('apiKeys.reveal.scopes', { scopes: created.key.scopes.join(', ') || '—' })}
          </div>
        </Card>
      )}

      {/* Active keys table */}
      <Card variant="paper">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> {t('apiKeys.table.heading')}
          </h3>
          <Badge variant="gray">{keys.length}</Badge>
        </div>
        {loading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : keys.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title={t('apiKeys.table.emptyTitle')}
            body={t('apiKeys.table.emptyBody')}
            density="compact"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <th className="py-2 pr-3">{t('apiKeys.table.name')}</th>
                  <th className="py-2 pr-3">{t('apiKeys.table.prefix')}</th>
                  <th className="py-2 pr-3">{t('apiKeys.table.scopes')}</th>
                  <th className="py-2 pr-3">{t('apiKeys.table.expires')}</th>
                  <th className="py-2 pr-3">{t('apiKeys.table.lastUsed')}</th>
                  <th className="py-2 pr-3">{t('apiKeys.table.status')}</th>
                  <th className="py-2 pr-3 text-right">{t('apiKeys.table.actions')}</th>
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
                      {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString(dateLocale) : t('apiKeys.table.never')}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString(dateLocale) : t('apiKeys.table.never')}
                    </td>
                    <td className="py-2.5 pr-3">
                      {k.isActive
                        ? <Badge variant="green">{t('apiKeys.table.active')}</Badge>
                        : <Badge variant="gray">{t('apiKeys.table.revoked')}</Badge>}
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
                          {t('apiKeys.table.revoke')}
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
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{t('apiKeys.modal.title')}</h2>
              <button
                onClick={() => { setShowModal(false); resetModal() }}
                aria-label={t('apiKeys.modal.close')}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t('apiKeys.modal.name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('apiKeys.modal.namePlaceholder')}
                  className="w-full h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-2">{t('apiKeys.modal.scopes')}</label>
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
                <label className="block text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t('apiKeys.modal.expiresIn')}</label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={expiresInDays}
                  onChange={e => setExpiresInDays(e.target.value)}
                  placeholder={t('apiKeys.modal.expiresPlaceholder')}
                  className="w-full h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-default)]">
              <Button variant="secondary" onClick={() => { setShowModal(false); resetModal() }}>{t('apiKeys.modal.cancel')}</Button>
              <Button variant="primary" loading={creating} onClick={handleCreate}>{t('apiKeys.modal.generate')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
