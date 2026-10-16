import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, Loader2, ChevronDown } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Button } from '../design-system'
import { StateBoundary, StatusPill, SkeletonTable, notify, useConfirm } from '../components/ui'
import SecretReveal, { CopyButton } from '../components/admin/SecretReveal'
import { ROW_ACTION } from '../components/admin/rowAction'
import { scim, type ScimToken, type ScimTokenCreated } from '../lib/api'
import { useFmt } from '../lib/fmt'
import { dur, ease, listItemMotion } from '../motion/tokens'

// Role slugs are API values; display labels come from scim.roles.<slug>.
const ROLE_OPTIONS = ['viewer', 'analyst', 'team-lead', 'auditor']

const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : '')

export default function ScimTokens() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const confirm = useConfirm()
  const roleLabel = (slug: string) => t(`scim.roles.${slug}`, { defaultValue: slug })
  const [tokens, setTokens] = useState<ScimToken[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [defaultRole, setDefaultRole] = useState('viewer')
  const [created, setCreated] = useState<ScimTokenCreated | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(true)

  /** `silent` refreshes keep the table on screen and report failures as a toast. */
  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true)
      setLoadError(null)
    }
    try {
      const list = await scim.list()
      setTokens(list)
      setLoadError(null)
    } catch (e) {
      const msg = errMsg(e) || i18n.t('scim.errors.load')
      if (opts?.silent) notify.error(i18n.t('scim.errors.refresh'), { description: msg })
      else setLoadError(msg)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
    // i18n.t (not t) so a language switch doesn't refetch the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const result = await scim.create(defaultRole)
      setCreated(result)
      notify.success(t('scim.toast.created'))
      void load({ silent: true })
    } catch (e) {
      notify.error(t('scim.errors.create'), { description: errMsg(e) || undefined })
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (tok: ScimToken) => {
    const ok = await confirm({
      title: t('scim.revokeSheet.title', { prefix: tok.prefix }),
      description: t('scim.confirmRevoke'),
      confirmLabel: t('scim.revokeSheet.confirm'),
      tone: 'destructive',
    })
    if (!ok) return
    setRevoking(tok.id)
    try {
      await scim.revoke(tok.id)
      setTokens(prev => prev.map(x => (x.id === tok.id ? { ...x, isActive: false } : x)))
      notify.success(t('scim.toast.revoked', { prefix: tok.prefix }))
      void load({ silent: true })
    } catch (e) {
      notify.error(t('scim.errors.revoke'), { description: errMsg(e) || undefined })
    } finally {
      setRevoking(null)
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const scimBaseUrl = `${baseUrl}/api/scim/v2`
  const activeCount = tokens.filter(x => x.isActive).length

  return (
    <div className="page-container space-y-6">
      <PageHeader title={t('scim.title')} subtitle={t('scim.subtitle')} />

      {/* One-time token reveal */}
      <AnimatePresence initial={false}>
        {created && (
          <SecretReveal
            key={created.id}
            title={t('scim.reveal.title')}
            warning={t('scim.reveal.body')}
            token={created.token}
            tokenLabel={t('scim.reveal.tokenLabel')}
            copyLabel={t('scim.reveal.copy')}
            copiedLabel={t('scim.reveal.copied')}
            copyFailedLabel={t('scim.reveal.copyFailed')}
            doneLabel={t('scim.reveal.dismiss')}
            onDone={() => setCreated(null)}
            meta={t('scim.reveal.role', { role: roleLabel(created.defaultRoleSlug) })}
          />
        )}
      </AnimatePresence>

      {/* Generate */}
      <section className="surface-paper p-5" aria-labelledby="scim-generate">
        <h2 id="scim-generate" className="text-h3 text-[var(--text-primary)]">{t('scim.generate.heading')}</h2>
        <p className="text-small text-[var(--text-secondary)] mt-1 max-w-[65ch]">{t('scim.generate.intro')}</p>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="block sm:w-[240px]">
            <span className="block text-small font-medium text-[var(--text-primary)] mb-1.5">{t('scim.generate.defaultRole')}</span>
            <select
              value={defaultRole}
              onChange={e => setDefaultRole(e.target.value)}
              className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)]"
            >
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </label>
          <Button variant="primary" size="lg" onClick={() => void handleCreate()} loading={creating} icon={<Plus className="w-4 h-4" />}>
            {t('scim.generate.button')}
          </Button>
        </div>
      </section>

      {/* Tokens table */}
      <section className="surface-paper overflow-hidden" aria-labelledby="scim-tokens-heading">
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border-subtle)]">
          <h2 id="scim-tokens-heading" className="text-h3 text-[var(--text-primary)]">{t('scim.table.heading')}</h2>
          {!loading && !loadError && tokens.length > 0 && (
            <span className="text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">
              {t('scim.table.count', { active: f.number(activeCount), total: f.number(tokens.length) })}
            </span>
          )}
        </header>
        <StateBoundary
          loading={loading}
          error={loadError}
          onRetry={() => void load()}
          empty={tokens.length === 0}
          compact
          skeleton={<div className="p-4"><SkeletonTable rows={2} cols={5} /></div>}
          errorState={{ title: t('scim.errors.loadTitle'), body: t('scim.errors.loadBody') }}
          emptyState={{
            art: 'connect',
            title: t('scim.table.emptyTitle'),
            body: t('scim.table.emptyBody'),
            cta: { label: t('scim.generate.button'), onClick: () => void handleCreate(), disabled: creating, icon: <Plus className="w-3.5 h-3.5" /> },
          }}
        >
          <div className="overflow-auto max-h-[min(60vh,560px)]">
            <table className="data-table min-w-[680px]">
              <thead>
                <tr>
                  <th className="sticky top-0 z-[1] !pl-5">{t('scim.table.prefix')}</th>
                  <th className="sticky top-0 z-[1]">{t('scim.table.defaultRole')}</th>
                  <th className="sticky top-0 z-[1]">{t('scim.table.status')}</th>
                  <th className="sticky top-0 z-[1]">{t('scim.table.lastUsed')}</th>
                  <th className="sticky top-0 z-[1]">{t('scim.table.created')}</th>
                  <th className="sticky top-0 z-[1] !pr-5 text-right"><span className="sr-only">{t('scim.table.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {tokens.map(tok => {
                    const busy = revoking === tok.id
                    return (
                      <motion.tr key={tok.id} layout {...listItemMotion} className="group">
                        <td className="!pl-5 font-mono text-caption text-[var(--text-primary)] whitespace-nowrap">{tok.prefix}…</td>
                        <td className="text-[var(--text-primary)] whitespace-nowrap">{roleLabel(tok.defaultRoleSlug)}</td>
                        <td>
                          {tok.isActive
                            ? <StatusPill tone="success" dot>{t('scim.table.active')}</StatusPill>
                            : <StatusPill tone="neutral">{t('scim.table.revoked')}</StatusPill>}
                        </td>
                        <td className="whitespace-nowrap">
                          {tok.lastUsedAt
                            ? <span title={f.dateTime(tok.lastUsedAt)}>{f.relative(tok.lastUsedAt)}</span>
                            : <span className="text-[var(--text-tertiary)]">{t('scim.table.never')}</span>}
                        </td>
                        <td className="whitespace-nowrap tabular-nums">{f.date(tok.createdAt)}</td>
                        <td className="!pr-5 text-right">
                          {tok.isActive && (
                            <button
                              type="button"
                              onClick={() => void handleRevoke(tok)}
                              disabled={busy}
                              aria-label={t('scim.table.revokeNamed', { prefix: tok.prefix })}
                              className={`${busy ? 'opacity-100' : ROW_ACTION} inline-flex items-center gap-1.5 h-10 sm:h-8 px-2.5 rounded-[var(--radius-md)] text-small font-medium text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] disabled:cursor-wait whitespace-nowrap`}
                            >
                              {busy
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                                : <Trash2 className="w-3.5 h-3.5" aria-hidden />}
                              {t('scim.table.revoke')}
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

      {/* IdP setup */}
      <section className="surface-paper overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSetup(s => !s)}
          aria-expanded={showSetup}
          aria-controls="scim-setup"
          className="flex items-center justify-between gap-4 w-full text-left px-5 py-4 hover:bg-[var(--bg-hover)] transition-colors duration-micro ease-out"
        >
          <div className="min-w-0">
            <h2 className="text-h3 text-[var(--text-primary)]">{t('scim.setup.heading')}</h2>
            <p className="text-small text-[var(--text-secondary)] mt-0.5">{t('scim.setup.intro')}</p>
          </div>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 text-[var(--text-tertiary)] transition-transform duration-fast ease-out ${showSetup ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {showSetup && (
            <motion.div
              id="scim-setup"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: dur.base, ease: ease.out }}
              className="overflow-hidden"
            >
              <dl className="px-5 pb-5 pt-1 grid gap-5 text-small text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
                <SetupItem label={t('scim.setup.baseUrl')}>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <code className="flex-1 min-w-0 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-default)] font-mono text-small text-[var(--text-primary)] break-all select-all">
                      {scimBaseUrl}
                    </code>
                    <CopyButton
                      value={scimBaseUrl}
                      label={t('scim.setup.copyUrl')}
                      copiedLabel={t('scim.reveal.copied')}
                      failedLabel={t('scim.reveal.copyFailed')}
                    />
                  </div>
                </SetupItem>
                <SetupItem label={t('scim.setup.authentication')}>{t('scim.setup.authBody')}</SetupItem>
                <SetupItem label={t('scim.setup.endpoints')}>
                  <ul className="space-y-1.5">
                    <li><Code>GET /ServiceProviderConfig</Code> · <Code>GET /ResourceTypes</Code> · <Code>GET /Schemas</Code></li>
                    <li><Code>GET, POST /Users</Code> {t('scim.setup.filterBy')} <Code>userName eq</Code> / <Code>externalId eq</Code>{t('scim.setup.filterClose')}</li>
                    <li><Code>GET, PUT, PATCH, DELETE /Users/{'{id}'}</Code> {t('scim.setup.softDelete')}</li>
                  </ul>
                </SetupItem>
                <div className="grid gap-5 md:grid-cols-2">
                  <SetupItem label={t('scim.setup.azureTitle')}>{t('scim.setup.azureBody')}</SetupItem>
                  <SetupItem label={t('scim.setup.oktaTitle')}>{t('scim.setup.oktaBody')}</SetupItem>
                </div>
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}

function SetupItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pt-4 first:pt-4">
      <dt className="text-small font-semibold text-[var(--text-primary)] mb-1.5">{label}</dt>
      <dd className="max-w-[75ch] text-pretty">{children}</dd>
    </div>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-caption px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] whitespace-nowrap">
      {children}
    </code>
  )
}
