import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Button } from '../design-system'
import { ConfirmSheet, StateBoundary, StatusPill, SkeletonTable, notify, useConfirm } from '../components/ui'
import SecretReveal from '../components/admin/SecretReveal'
import { ROW_ACTION } from '../components/admin/rowAction'
import { apiKeys, type ApiKey, type ApiKeyCreated } from '../lib/api'
import { useFmt } from '../lib/fmt'
import { listItemMotion } from '../motion/tokens'

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

const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : '')

export default function ApiKeys() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const confirm = useConfirm()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [standardScopes, setStandardScopes] = useState<string[]>(DEFAULT_SCOPES)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)

  // Create-sheet form state
  const [name, setName] = useState('')
  const [nameInvalid, setNameInvalid] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(['data.view']))
  const [expiresInDays, setExpiresInDays] = useState<string>('')

  /** `silent` refreshes keep the table on screen and report failures as a toast. */
  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true)
      setLoadError(null)
    }
    try {
      const data = await apiKeys.list()
      setKeys(data.keys)
      if (data.standardScopes?.length) setStandardScopes(data.standardScopes)
      setLoadError(null)
    } catch (e) {
      const msg = errMsg(e) || i18n.t('apiKeys.errors.load')
      if (opts?.silent) notify.error(i18n.t('apiKeys.errors.refresh'), { description: msg })
      else setLoadError(msg)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
    // i18n.t (not t) so a language switch doesn't refetch the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { void load() }, [load])

  const resetModal = () => {
    setName('')
    setNameInvalid(false)
    // Default to read-only data access; fall back to the first scope the server offers.
    setSelectedScopes(new Set([standardScopes.includes('data.view') ? 'data.view' : standardScopes[0] ?? 'data.view']))
    setExpiresInDays('')
  }

  const openCreate = () => {
    resetModal()
    setShowModal(true)
  }

  // Throwing keeps the sheet open and shows the message inside it.
  const handleCreate = async () => {
    if (!name.trim()) {
      setNameInvalid(true)
      throw new Error(t('apiKeys.errors.nameRequired'))
    }
    if (selectedScopes.size === 0) throw new Error(t('apiKeys.errors.pickScope'))
    const days = expiresInDays ? Number(expiresInDays) : undefined
    let result: ApiKeyCreated
    try {
      result = await apiKeys.create({
        name: name.trim(),
        scopes: Array.from(selectedScopes),
        expiresInDays: days && Number.isFinite(days) ? days : undefined,
      })
    } catch (e) {
      throw new Error(errMsg(e) || t('apiKeys.errors.create'))
    }
    setCreated(result)
    notify.success(t('apiKeys.toast.created', { name: result.key.name }))
    void load({ silent: true })
  }

  const handleRevoke = async (k: ApiKey) => {
    const ok = await confirm({
      title: t('apiKeys.revokeSheet.title', { name: k.name }),
      description: t('apiKeys.confirmRevoke'),
      confirmLabel: t('apiKeys.revokeSheet.confirm'),
      tone: 'destructive',
    })
    if (!ok) return
    setRevoking(k.id)
    try {
      await apiKeys.revoke(k.id)
      setKeys(prev => prev.map(x => (x.id === k.id ? { ...x, isActive: false } : x)))
      notify.success(t('apiKeys.toast.revoked', { name: k.name }))
      void load({ silent: true })
    } catch (e) {
      notify.error(t('apiKeys.errors.revoke'), { description: errMsg(e) || undefined })
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

  const now = Date.now()
  const isExpired = (k: ApiKey) => !!k.expiresAt && new Date(k.expiresAt).getTime() < now
  const activeCount = keys.filter(k => k.isActive && !isExpired(k)).length

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t('apiKeys.title')}
        subtitle={t('apiKeys.subtitle')}
        actions={
          <Button variant="primary" size="lg" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            {t('apiKeys.generateKey')}
          </Button>
        }
      />

      {/* One-time token reveal */}
      <AnimatePresence initial={false}>
        {created && (
          <SecretReveal
            key={created.key.id}
            title={t('apiKeys.reveal.title', { name: created.key.name })}
            warning={t('apiKeys.reveal.warning')}
            token={created.token}
            tokenLabel={t('apiKeys.reveal.tokenLabel')}
            copyLabel={t('apiKeys.reveal.copy')}
            copiedLabel={t('apiKeys.reveal.copied')}
            copyFailedLabel={t('apiKeys.reveal.copyFailed')}
            doneLabel={t('apiKeys.reveal.dismiss')}
            onDone={() => setCreated(null)}
            meta={
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <span>{t('apiKeys.reveal.scopesLabel')}</span>
                {created.key.scopes.length
                  ? created.key.scopes.map(s => <ScopeTag key={s}>{s}</ScopeTag>)
                  : <span>—</span>}
              </span>
            }
          />
        )}
      </AnimatePresence>

      {/* Keys table */}
      <section className="surface-paper overflow-hidden" aria-labelledby="api-keys-heading">
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border-subtle)]">
          <h2 id="api-keys-heading" className="text-h3 text-[var(--text-primary)]">{t('apiKeys.table.heading')}</h2>
          {!loading && !loadError && keys.length > 0 && (
            <span className="text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">
              {t('apiKeys.table.count', { active: f.number(activeCount), total: f.number(keys.length) })}
            </span>
          )}
        </header>
        <StateBoundary
          loading={loading}
          error={loadError}
          onRetry={() => void load()}
          empty={keys.length === 0}
          compact
          skeleton={<div className="p-4"><SkeletonTable rows={3} cols={6} /></div>}
          errorState={{ title: t('apiKeys.errors.loadTitle'), body: t('apiKeys.errors.loadBody') }}
          emptyState={{
            art: 'connect',
            title: t('apiKeys.table.emptyTitle'),
            body: t('apiKeys.table.emptyBody'),
            cta: { label: t('apiKeys.generateKey'), onClick: openCreate, icon: <Plus className="w-3.5 h-3.5" /> },
          }}
        >
          <div className="overflow-auto max-h-[min(70vh,640px)]">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th className="sticky top-0 z-[1] !pl-5">{t('apiKeys.table.name')}</th>
                  <th className="sticky top-0 z-[1]">{t('apiKeys.table.prefix')}</th>
                  <th className="sticky top-0 z-[1]">{t('apiKeys.table.scopes')}</th>
                  <th className="sticky top-0 z-[1]">{t('apiKeys.table.expires')}</th>
                  <th className="sticky top-0 z-[1]">{t('apiKeys.table.lastUsed')}</th>
                  <th className="sticky top-0 z-[1]">{t('apiKeys.table.status')}</th>
                  <th className="sticky top-0 z-[1] !pr-5 text-right"><span className="sr-only">{t('apiKeys.table.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {keys.map(k => {
                    const expired = isExpired(k)
                    const busy = revoking === k.id
                    return (
                      <motion.tr key={k.id} layout {...listItemMotion} className="group">
                        <td className="!pl-5 text-[var(--text-primary)] font-medium whitespace-nowrap">{k.name}</td>
                        <td className="font-mono text-caption text-[var(--text-primary)] whitespace-nowrap">{k.prefix}…</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {k.scopes.slice(0, 3).map(s => <ScopeTag key={s}>{s}</ScopeTag>)}
                            {k.scopes.length > 3 && (
                              <span className="text-caption text-[var(--text-tertiary)] self-center" title={k.scopes.slice(3).join(', ')}>
                                +{k.scopes.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap tabular-nums">
                          {k.expiresAt ? f.date(k.expiresAt) : <span className="text-[var(--text-tertiary)]">{t('apiKeys.table.noExpiry')}</span>}
                        </td>
                        <td className="whitespace-nowrap">
                          {k.lastUsedAt
                            ? <span title={f.dateTime(k.lastUsedAt)}>{f.relative(k.lastUsedAt)}</span>
                            : <span className="text-[var(--text-tertiary)]">{t('apiKeys.table.never')}</span>}
                        </td>
                        <td>
                          {!k.isActive
                            ? <StatusPill tone="neutral">{t('apiKeys.table.revoked')}</StatusPill>
                            : expired
                              ? <StatusPill tone="warning" dot>{t('apiKeys.table.expired')}</StatusPill>
                              : <StatusPill tone="success" dot>{t('apiKeys.table.active')}</StatusPill>}
                        </td>
                        <td className="!pr-5 text-right">
                          {k.isActive && (
                            <button
                              type="button"
                              onClick={() => void handleRevoke(k)}
                              disabled={busy}
                              aria-label={t('apiKeys.table.revokeNamed', { name: k.name })}
                              className={`${busy ? 'opacity-100' : ROW_ACTION} inline-flex items-center gap-1.5 h-10 sm:h-8 px-2.5 rounded-[var(--radius-md)] text-small font-medium text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] disabled:cursor-wait whitespace-nowrap`}
                            >
                              {busy
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                                : <Trash2 className="w-3.5 h-3.5" aria-hidden />}
                              {t('apiKeys.table.revoke')}
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </StateBoundary>
      </section>

      {/* Create sheet */}
      <ConfirmSheet
        open={showModal}
        onOpenChange={setShowModal}
        title={t('apiKeys.modal.title')}
        description={t('apiKeys.modal.intro')}
        confirmLabel={t('apiKeys.modal.generate')}
        cancelLabel={t('apiKeys.modal.cancel')}
        onConfirm={handleCreate}
        size="lg"
      >
        <CreateForm
          name={name}
          nameInvalid={nameInvalid}
          onName={v => { setName(v); if (v.trim()) setNameInvalid(false) }}
          scopes={standardScopes}
          selected={selectedScopes}
          onToggleScope={toggleScope}
          expiresInDays={expiresInDays}
          onExpires={setExpiresInDays}
        />
      </ConfirmSheet>
    </div>
  )
}

function ScopeTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center h-5 px-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono text-caption text-[var(--text-secondary)] whitespace-nowrap">
      {children}
    </span>
  )
}

function CreateForm({
  name, nameInvalid, onName, scopes, selected, onToggleScope, expiresInDays, onExpires,
}: {
  name: string
  nameInvalid: boolean
  onName: (v: string) => void
  scopes: string[]
  selected: Set<string>
  onToggleScope: (s: string) => void
  expiresInDays: string
  onExpires: (v: string) => void
}) {
  const { t } = useTranslation()
  const nameRef = useRef<HTMLInputElement>(null)
  // The sheet focuses its primary button on open; move focus to the first field just after.
  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => nameRef.current?.focus()) })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [])
  const field =
    'w-full h-10 px-3 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)] transition-colors'
  return (
    <div className="space-y-5">
      <label className="block">
        <span className="block text-small font-medium text-[var(--text-primary)] mb-1.5">{t('apiKeys.modal.name')}</span>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={e => onName(e.target.value)}
          placeholder={t('apiKeys.modal.namePlaceholder')}
          aria-invalid={nameInvalid || undefined}
          className={`${field} ${nameInvalid ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)]'}`}
        />
      </label>
      <fieldset>
        <legend className="block text-small font-medium text-[var(--text-primary)] mb-1">{t('apiKeys.modal.scopes')}</legend>
        <p className="text-caption text-[var(--text-tertiary)] mb-2.5">{t('apiKeys.modal.scopesHint')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {scopes.map(scope => {
            const on = selected.has(scope)
            return (
              <label
                key={scope}
                className={`flex items-center gap-2.5 h-10 px-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors duration-micro ease-out ${
                  on
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                    : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggleScope(scope)}
                  className="w-4 h-4 accent-[var(--color-brand)]"
                />
                <span className="font-mono text-small text-[var(--text-primary)]">{scope}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <label className="block">
        <span className="block text-small font-medium text-[var(--text-primary)] mb-1.5">{t('apiKeys.modal.expiresIn')}</span>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max="3650"
          value={expiresInDays}
          onChange={e => onExpires(e.target.value)}
          placeholder={t('apiKeys.modal.expiresPlaceholder')}
          className={`${field} border-[var(--border-default)] sm:max-w-[240px] tabular-nums`}
        />
      </label>
    </div>
  )
}
