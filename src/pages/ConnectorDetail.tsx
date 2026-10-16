import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RefreshCw, Unplug, AlertTriangle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Button } from '../design-system'
import { StateBoundary, StatusPill, SkeletonCard, SkeletonTable, notify, useConfirm, type PillTone } from '../components/ui'
import { connectors, type ConnectorConnectionRow, type ConnectorSyncRun } from '../lib/api'
import { useFmt } from '../lib/fmt'
import { inputClass, labelClass, stickyTh } from '../components/settings/admin-tables/shared'

/**
 * Per-connector detail page.
 *
 * Shows metadata (status, last-sync, scopes), exposes a "Sync now" button, and
 * renders the last 20 sync runs as a history table. Disconnect clears the
 * encrypted tokens server-side but keeps the row + history.
 */
const CONNECTION_TONE: Record<string, { tone: PillTone; dot?: boolean }> = {
  active: { tone: 'success', dot: true },
  error: { tone: 'danger' },
  pending: { tone: 'info', dot: true },
  disabled: { tone: 'neutral' },
}
const RUN_TONE: Record<string, { tone: PillTone; dot?: boolean }> = {
  complete: { tone: 'success' },
  failed: { tone: 'danger' },
  running: { tone: 'info', dot: true },
  cancelled: { tone: 'neutral' },
}

export default function ConnectorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const f = useFmt()
  const confirm = useConfirm()
  const [connection, setConnection] = useState<ConnectorConnectionRow | null>(null)
  const [runs, setRuns] = useState<ConnectorSyncRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await connectors.get(id)
      setConnection(res.connection)
      setRuns(res.runs)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('connectorDetail.errors.load'))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => { void load() }, [load])

  const handleSync = async () => {
    if (!id) return
    setSyncing(true)
    try {
      const result = await connectors.sync(id, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })
      const msg = t('connectorDetail.toast.syncResult', {
        imported: f.number(result.rowsImported),
        fetched: f.number(result.rowsFetched),
        failed: f.number(result.rowsFailed),
      })
      if (result.rowsFailed > 0) notify.warning(msg)
      else notify.success(msg)
      await load()
    } catch (e) {
      notify.error(t('connectorDetail.errors.sync'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!id || !connection) return
    const ok = await confirm({
      title: t('connectorDetail.disconnect.confirmTitle', { name: connection.display_name }),
      description: t('connectorDetail.disconnect.body'),
      confirmLabel: t('connectorDetail.disconnect.button'),
      tone: 'destructive',
    })
    if (!ok) return
    try {
      await connectors.disconnect(id)
      notify.success(t('connectorDetail.toast.disconnected'))
      navigate('/data/connectors')
    } catch (e) {
      notify.error(t('connectorDetail.errors.disconnect'), { description: e instanceof Error ? e.message : undefined })
    }
  }

  const backLink = (
    <Link
      to="/data/connectors"
      className="inline-flex items-center gap-1.5 h-10 sm:h-8 -ml-2 px-2 mb-2 rounded-[var(--radius-md)] text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden /> {t('connectorDetail.allConnectors')}
    </Link>
  )

  const notFound = !loading && !error && !connection

  return (
    <div className="page-container">
      {backLink}
      <StateBoundary
        loading={loading}
        error={error}
        onRetry={() => void load()}
        hasData={!!connection}
        empty={notFound}
        skeleton={
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonTable rows={3} cols={6} framed />
          </div>
        }
        errorState={{ title: t('connectorDetail.errors.loadTitle'), body: t('connectorDetail.errors.loadBody') }}
        emptyState={{
          art: 'connect',
          title: t('connectorDetail.errors.notFound'),
          body: t('connectorDetail.errors.notFoundBody'),
          cta: { label: t('connectorDetail.allConnectors'), to: '/data/connectors' },
        }}
      >
        {() => connection && (
          <>
            <PageHeader
              title={connection.display_name}
              subtitle={`${connection.provider} · ${t(`connectorDetail.authTypes.${connection.auth_type}`, { defaultValue: connection.auth_type })}`}
            />

            <section className="surface-paper overflow-hidden mb-6" aria-label={t('connectorDetail.fields.summary')}>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--border-subtle)]">
                <div className="bg-[var(--bg-primary)] px-5 py-4 min-w-0">
                  <dt className="text-caption text-[var(--text-tertiary)] mb-1.5">{t('connectorDetail.fields.status')}</dt>
                  <dd>
                    <StatusPill tone={(CONNECTION_TONE[connection.status] ?? { tone: 'neutral' }).tone} dot={CONNECTION_TONE[connection.status]?.dot}>
                      {t(`connectorDetail.connectionStatus.${connection.status}`, { defaultValue: connection.status })}
                    </StatusPill>
                  </dd>
                </div>
                <div className="bg-[var(--bg-primary)] px-5 py-4 min-w-0">
                  <dt className="text-caption text-[var(--text-tertiary)] mb-1.5">{t('connectorDetail.fields.lastSync')}</dt>
                  <dd className="text-small font-medium text-[var(--text-primary)] whitespace-nowrap">
                    {connection.last_sync_at ? f.dateTime(connection.last_sync_at) : t('connectorDetail.fields.never')}
                    {connection.last_sync_status && (
                      <span className="ml-2 align-middle">
                        <StatusPill size="sm" tone={(RUN_TONE[connection.last_sync_status] ?? { tone: 'neutral' }).tone}>
                          {t(`connectorDetail.runStatus.${connection.last_sync_status}`, { defaultValue: connection.last_sync_status })}
                        </StatusPill>
                      </span>
                    )}
                  </dd>
                </div>
                <div className="bg-[var(--bg-primary)] px-5 py-4 min-w-0">
                  <dt className="text-caption text-[var(--text-tertiary)] mb-1.5">{t('connectorDetail.fields.account')}</dt>
                  <dd className="text-small text-[var(--text-primary)] font-mono truncate" title={connection.instance_url ?? connection.base_url ?? connection.account_id ?? undefined}>
                    {connection.instance_url ?? connection.base_url ?? connection.account_id ?? '—'}
                  </dd>
                </div>
              </dl>
              {connection.last_sync_error && (
                <p role="alert" className="flex items-start gap-2 px-5 py-3 border-t border-[var(--status-danger-line)] bg-[var(--status-danger-soft)] text-small text-[var(--status-danger)]">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
                  <span className="min-w-0 break-words">{connection.last_sync_error}</span>
                </p>
              )}
            </section>

            <section className="surface-paper p-5 mb-6" aria-labelledby="sync-heading">
              <h2 id="sync-heading" className="type-h3 text-[var(--text-primary)]">{t('connectorDetail.sync.heading')}</h2>
              <p className="text-small text-[var(--text-secondary)] mt-1 max-w-2xl">
                {t('connectorDetail.sync.helpBefore')}<code className="font-mono text-caption px-1 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-secondary)]">draft</code>{t('connectorDetail.sync.helpAfter')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mt-4 items-end">
                <label className="block min-w-0">
                  <span className={labelClass}>{t('connectorDetail.sync.fromDate')}</span>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={inputClass} />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>{t('connectorDetail.sync.toDate')}</span>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={inputClass} />
                </label>
                <Button variant="primary" loading={syncing} onClick={handleSync} icon={<RefreshCw className="w-4 h-4" />}>
                  {t('connectorDetail.sync.syncNow')}
                </Button>
              </div>
            </section>

            <section className="mb-6" aria-labelledby="history-heading">
              <div className="flex items-end justify-between gap-3 mb-3">
                <h2 id="history-heading" className="type-h3 text-[var(--text-primary)]">{t('connectorDetail.history.heading')}</h2>
                <span className="text-caption text-[var(--text-tertiary)] tabular-nums">{t('connectorDetail.history.count', { count: runs.length })}</span>
              </div>
              {runs.length === 0 ? (
                <div className="surface-paper px-5 py-6 text-small text-[var(--text-tertiary)]">{t('connectorDetail.history.empty')}</div>
              ) : (
                <div className="surface-paper overflow-hidden">
                  <div className="overflow-x-auto max-h-[480px]">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className={stickyTh}>{t('connectorDetail.history.started')}</th>
                          <th className={stickyTh}>{t('connectorDetail.history.status')}</th>
                          <th className={`${stickyTh} num`}>{t('connectorDetail.history.fetched')}</th>
                          <th className={`${stickyTh} num`}>{t('connectorDetail.history.imported')}</th>
                          <th className={`${stickyTh} num`}>{t('connectorDetail.history.failed')}</th>
                          <th className={stickyTh}>{t('connectorDetail.history.error')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runs.map(r => {
                          const tone = RUN_TONE[r.status] ?? { tone: 'neutral' as PillTone }
                          return (
                            <tr key={r.id}>
                              <td className="whitespace-nowrap !text-[var(--text-primary)]">{f.dateTime(r.started_at)}</td>
                              <td>
                                <StatusPill tone={tone.tone} dot={tone.dot}>
                                  {t(`connectorDetail.runStatus.${r.status}`, { defaultValue: r.status })}
                                </StatusPill>
                              </td>
                              <td className="num !text-[var(--text-primary)]">{f.number(r.rows_fetched)}</td>
                              <td className="num !text-[var(--text-primary)]">{f.number(r.rows_imported)}</td>
                              <td className={`num ${r.rows_failed > 0 ? '!text-[var(--status-danger)] font-medium' : ''}`}>{f.number(r.rows_failed)}</td>
                              <td className="!text-[var(--status-danger)] truncate max-w-xs" title={r.error ?? ''}>{r.error ?? ''}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            <section className="surface-paper p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" aria-labelledby="disconnect-heading">
              <div className="min-w-0">
                <h2 id="disconnect-heading" className="type-h3 text-[var(--text-primary)]">{t('connectorDetail.disconnect.heading')}</h2>
                <p className="text-small text-[var(--text-secondary)] mt-1 max-w-2xl">{t('connectorDetail.disconnect.body')}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-md)] border border-[var(--status-danger-line)] text-small font-semibold text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] transition-colors whitespace-nowrap flex-shrink-0"
              >
                <Unplug className="w-4 h-4" aria-hidden /> {t('connectorDetail.disconnect.button')}
              </button>
            </section>
          </>
        )}
      </StateBoundary>
    </div>
  )
}
