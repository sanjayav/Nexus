import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
      setError(e instanceof Error ? e.message : 'Failed to load connection')
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
      showSuccess(`Imported ${result.rowsImported} of ${result.rowsFetched} rows (${result.rowsFailed} failed)`)
      await load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!id) return
    try {
      await connectors.disconnect(id)
      showSuccess('Disconnected. Tokens cleared from storage.')
      navigate('/data/connectors')
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Disconnect failed')
    }
  }

  if (loading) {
    return <div className="page-container"><div className="text-[13px] text-[var(--text-tertiary)]">Loading…</div></div>
  }
  if (error || !connection) {
    return (
      <div className="page-container">
        <Link to="/data/connectors" className="inline-flex items-center gap-1 text-[12.5px] text-[var(--text-secondary)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> All connectors
        </Link>
        <Card variant="outlined" className="border-[var(--accent-red-light)]">
          <div className="flex items-start gap-3 text-[13px] text-[var(--accent-red)]">
            <AlertTriangle className="w-4 h-4" />
            <div>{error ?? 'Connection not found'}</div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: 'Data', to: '/data' },
          { label: 'Connectors', to: '/data/connectors' },
          { label: connection.display_name },
        ]}
        eyebrow="Live integration"
        title={connection.display_name}
        subtitle={`${connection.provider} · ${connection.auth_type}`}
      />

      <Card variant="paper" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Status</div>
            <Badge variant={connection.status === 'active' ? 'green' : connection.status === 'error' ? 'red' : 'gray'}>
              {connection.status}
            </Badge>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Last sync</div>
            <div className="text-[var(--text-primary)]">
              {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}
            </div>
            {connection.last_sync_status && (
              <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">{connection.last_sync_status}</div>
            )}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Account / Instance</div>
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
        <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">Sync</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <label className="text-[12.5px]">
            <span className="block text-[var(--text-secondary)] mb-1">From date</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
            />
          </label>
          <label className="text-[12.5px]">
            <span className="block text-[var(--text-secondary)] mb-1">To date</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
            />
          </label>
          <div className="flex items-end">
            <Button variant="primary" loading={syncing} onClick={handleSync} icon={<RefreshCw className="w-4 h-4" />}>
              Sync now
            </Button>
          </div>
        </div>
        <div className="text-[11.5px] text-[var(--text-tertiary)]">
          Leave dates empty to pull the last 12 months. Rows land in activity_data as <code className="font-mono">draft</code> and need approval before they roll up into reports.
        </div>
      </Card>

      <Card variant="paper" className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-semibold text-[var(--text-primary)]">Sync history</div>
          <Badge variant="gray">{runs.length}</Badge>
        </div>
        {runs.length === 0 ? (
          <div className="text-[12.5px] text-[var(--text-tertiary)]">No syncs yet. Click "Sync now" to fetch your first batch.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <th className="py-2 pr-3">Started</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Fetched</th>
                  <th className="py-2 pr-3">Imported</th>
                  <th className="py-2 pr-3">Failed</th>
                  <th className="py-2 pr-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 pr-3 text-[var(--text-primary)]">{new Date(r.started_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      {r.status === 'complete' ? <Badge variant="green">complete</Badge>
                        : r.status === 'failed' ? <Badge variant="red">failed</Badge>
                          : <Badge variant="amber">{r.status}</Badge>}
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
            <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">Disconnect</div>
            <div className="text-[12.5px] text-[var(--text-secondary)]">
              Clears the encrypted access &amp; refresh tokens. Sync history is preserved. You can re-connect at any time.
            </div>
          </div>
          {confirmDisconnect ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Check className="w-3.5 h-3.5" />}
                onClick={handleDisconnect}
                className="!bg-[var(--accent-red)]"
              >
                Confirm
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setConfirmDisconnect(true)}>
              Disconnect
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
