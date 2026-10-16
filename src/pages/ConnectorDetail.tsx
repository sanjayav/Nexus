import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RefreshCw, Trash2, AlertTriangle, Check } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card, Button, Badge } from '../design-system'
import { connectors, type ConnectorConnectionRow, type ConnectorSyncRun } from '../lib/api'
import { showError, showSuccess } from '../lib/toast'

/**
 * Per-connector detail page.
 *
 * Shows metadata (status, last-sync, scopes), exposes a "Sync now" button, and
 * renders the last 20 sync runs as a history table. Disconnect clears the
 * encrypted tokens server-side but keeps the row + history.
 */
export default function ConnectorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('zh') ? 'zh-CN' : i18n.language?.startsWith('th') ? 'th-TH' : undefined
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(dateLocale)
  const [connection, setConnection] = useState<ConnectorConnectionRow | null>(null)
  const [runs, setRuns] = useState<ConnectorSyncRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await connectors.get(id)
      setConnection(res.connection)
      setRuns(res.runs)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('connectorDetail.errors.load'))
    } finally {
      setLoading(false)
    }
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
      showSuccess(t('connectorDetail.toast.syncResult', { imported: result.rowsImported, fetched: result.rowsFetched, failed: result.rowsFailed }))
      await load()
    } catch (e) {
      showError(e instanceof Error ? e.message : t('connectorDetail.errors.sync'))
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!id) return
    try {
      await connectors.disconnect(id)
      showSuccess(t('connectorDetail.toast.disconnected'))
      navigate('/data/connectors')
    } catch (e) {
      showError(e instanceof Error ? e.message : t('connectorDetail.errors.disconnect'))
    }
  }

  if (loading) {
    return <div className="page-container"><div className="text-[13px] text-[var(--text-tertiary)]">{t('connectorDetail.loading')}</div></div>
  }
  if (error || !connection) {
    return (
      <div className="page-container">
        <Link to="/data/connectors" className="inline-flex items-center gap-1 text-[12.5px] text-[var(--text-secondary)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> {t('connectorDetail.allConnectors')}
        </Link>
        <Card variant="outlined" className="border-[var(--accent-red-light)]">
          <div className="flex items-start gap-3 text-[13px] text-[var(--accent-red)]">
            <AlertTriangle className="w-4 h-4" />
            <div>{error ?? t('connectorDetail.errors.notFound')}</div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('connectorDetail.breadcrumbs.data'), to: '/data' },
          { label: t('connectorDetail.breadcrumbs.connectors'), to: '/data/connectors' },
          { label: connection.display_name },
        ]}
        eyebrow={t('connectorDetail.eyebrow')}
        title={connection.display_name}
        subtitle={`${connection.provider} · ${t(`connectorDetail.authTypes.${connection.auth_type}`, { defaultValue: connection.auth_type })}`}
      />

      <Card variant="paper" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
          <div>
            <div className="text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-1">{t('connectorDetail.fields.status')}</div>
            <Badge variant={connection.status === 'active' ? 'green' : connection.status === 'error' ? 'red' : 'gray'}>
              {t(`connectorDetail.connectionStatus.${connection.status}`, { defaultValue: connection.status })}
            </Badge>
          </div>
          <div>
            <div className="text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-1">{t('connectorDetail.fields.lastSync')}</div>
            <div className="text-[var(--text-primary)]">
              {connection.last_sync_at ? fmtDateTime(connection.last_sync_at) : t('connectorDetail.fields.never')}
            </div>
            {connection.last_sync_status && (
              <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">{t(`connectorDetail.runStatus.${connection.last_sync_status}`, { defaultValue: connection.last_sync_status })}</div>
            )}
          </div>
          <div>
            <div className="text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-1">{t('connectorDetail.fields.account')}</div>
            <div className="text-[var(--text-primary)] font-mono text-[12px] truncate">
              {connection.instance_url ?? connection.base_url ?? connection.account_id ?? '—'}
            </div>
          </div>
        </div>
        {connection.last_sync_error && (
          <div className="mt-3 text-[12.5px] text-[var(--accent-red)] flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
            <div>{connection.last_sync_error}</div>
          </div>
        )}
      </Card>

      <Card variant="paper" className="mb-4">
        <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">{t('connectorDetail.sync.heading')}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <label className="text-[12.5px]">
            <span className="block text-[var(--text-secondary)] mb-1">{t('connectorDetail.sync.fromDate')}</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
            />
          </label>
          <label className="text-[12.5px]">
            <span className="block text-[var(--text-secondary)] mb-1">{t('connectorDetail.sync.toDate')}</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
            />
          </label>
          <div className="flex items-end">
            <Button variant="primary" loading={syncing} onClick={handleSync} icon={<RefreshCw className="w-4 h-4" />}>
              {t('connectorDetail.sync.syncNow')}
            </Button>
          </div>
        </div>
        <div className="text-caption text-[var(--text-tertiary)]">
          {t('connectorDetail.sync.helpBefore')}<code className="font-mono">draft</code>{t('connectorDetail.sync.helpAfter')}
        </div>
      </Card>

      <Card variant="paper" className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-semibold text-[var(--text-primary)]">{t('connectorDetail.history.heading')}</div>
          <Badge variant="gray">{runs.length}</Badge>
        </div>
        {runs.length === 0 ? (
          <div className="text-[12.5px] text-[var(--text-tertiary)]">{t('connectorDetail.history.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <th className="py-2 pr-3">{t('connectorDetail.history.started')}</th>
                  <th className="py-2 pr-3">{t('connectorDetail.history.status')}</th>
                  <th className="py-2 pr-3">{t('connectorDetail.history.fetched')}</th>
                  <th className="py-2 pr-3">{t('connectorDetail.history.imported')}</th>
                  <th className="py-2 pr-3">{t('connectorDetail.history.failed')}</th>
                  <th className="py-2 pr-3">{t('connectorDetail.history.error')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 pr-3 text-[var(--text-primary)]">{fmtDateTime(r.started_at)}</td>
                    <td className="py-2 pr-3">
                      {r.status === 'complete' ? <Badge variant="green">{t('connectorDetail.runStatus.complete')}</Badge>
                        : r.status === 'failed' ? <Badge variant="red">{t('connectorDetail.runStatus.failed')}</Badge>
                          : <Badge variant="amber">{t(`connectorDetail.runStatus.${r.status}`, { defaultValue: r.status })}</Badge>}
                    </td>
                    <td className="py-2 pr-3 text-[var(--text-primary)] font-mono">{r.rows_fetched}</td>
                    <td className="py-2 pr-3 text-[var(--text-primary)] font-mono">{r.rows_imported}</td>
                    <td className="py-2 pr-3 font-mono text-[var(--accent-red)]">{r.rows_failed}</td>
                    <td className="py-2 pr-3 text-[var(--accent-red)] truncate max-w-xs" title={r.error ?? ''}>{r.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card variant="paper">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">{t('connectorDetail.disconnect.heading')}</div>
            <div className="text-[12.5px] text-[var(--text-secondary)]">
              {t('connectorDetail.disconnect.body')}
            </div>
          </div>
          {confirmDisconnect ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDisconnect(false)}>{t('connectorDetail.disconnect.cancel')}</Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Check className="w-3.5 h-3.5" />}
                onClick={handleDisconnect}
                className="!bg-[var(--accent-red)]"
              >
                {t('connectorDetail.disconnect.confirm')}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setConfirmDisconnect(true)}>
              {t('connectorDetail.disconnect.button')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
