import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Filter, ChevronLeft, ChevronRight, ChevronDown, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { Card, Button } from '../design-system'
import { auditLog, users as usersApi, downloadAuditCsv, type AuditExplorerEntry, type ApiUser } from '../lib/api'
import SavedViewsBar from '../components/SavedViewsBar'

const PAGE_SIZE = 50

/**
 * Common values for the action filter. We seed with the actions written by
 * our helper today; the dropdown still accepts any custom value typed in.
 */
const KNOWN_ACTIONS = [
  'auth.login',
  'user.create',
  'user.update',
  'user.roles_change',
  'role.update',
  'assignment.create',
]
const KNOWN_RESOURCE_TYPES = ['user', 'role', 'assignment', 'organisation', 'report']

function formatTimestamp(s: string): string {
  try {
    const d = new Date(s)
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch {
    return s
  }
}

function targetFor(row: AuditExplorerEntry): string {
  // Synthesise a human-readable target. Prefer details.email/name; fall back
  // to resource_id; finally the resource_type itself.
  const d = row.details ?? {}
  const email = typeof d.email === 'string' ? d.email : null
  const name = typeof d.name === 'string' ? d.name : null
  if (name && email) return `${name} <${email}>`
  if (email) return email
  if (name) return name
  if (row.resource_id) return row.resource_id
  return row.resource_type
}

export default function AuditLog() {
  const [rows, setRows] = useState<AuditExplorerEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [users, setUsers] = useState<ApiUser[]>([])

  // Filter state
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [actorId, setActorId] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [resourceTypes, setResourceTypes] = useState<string[]>([])
  const [offset, setOffset] = useState(0)
  const [exporting, setExporting] = useState(false)

  const params = useMemo(() => ({
    from: from || undefined,
    to: to || undefined,
    actorId: actorId || undefined,
    actions: actions.length ? actions : undefined,
    resourceTypes: resourceTypes.length ? resourceTypes : undefined,
    limit: PAGE_SIZE,
    offset,
  }), [from, to, actorId, actions, resourceTypes, offset])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await auditLog.explore(params)
      setRows(res.rows)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    // Best-effort actor dropdown — fail silently if the caller can't list users.
    usersApi.list().then(setUsers).catch(() => setUsers([]))
  }, [])

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAction = (a: string) => {
    setOffset(0)
    setActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }
  const toggleResourceType = (a: string) => {
    setOffset(0)
    setResourceTypes(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await downloadAuditCsv({ from: from || undefined, to: to || undefined, actorId: actorId || undefined, actions: actions.length ? actions : undefined, resourceTypes: resourceTypes.length ? resourceTypes : undefined })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setFrom('')
    setTo('')
    setActorId('')
    setActions([])
    setResourceTypes([])
    setOffset(0)
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        subtitle="Immutable record of authentication, role, assignment and configuration events. Use the filters below to narrow the view; export filtered results as CSV for evidence packs."
        actions={
          <Button variant="secondary" icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      <SavedViewsBar
        page="audit-log"
        filters={{ from, to, actorId, actions, resourceTypes }}
        onApply={(f: { from?: string; to?: string; actorId?: string; actions?: string[]; resourceTypes?: string[] }) => {
          setOffset(0)
          if (typeof f.from === 'string') setFrom(f.from)
          if (typeof f.to === 'string') setTo(f.to)
          if (typeof f.actorId === 'string') setActorId(f.actorId)
          if (Array.isArray(f.actions)) setActions(f.actions)
          if (Array.isArray(f.resourceTypes)) setResourceTypes(f.resourceTypes)
        }}
      />

      <Card>
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-2 text-[var(--text-sm)] font-medium text-[var(--text-primary)]">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="block text-[var(--text-xs)] text-[var(--text-tertiary)]">
            From
            <input
              type="datetime-local"
              value={from}
              onChange={e => { setOffset(0); setFrom(e.target.value) }}
              className="mt-1 w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-sm)] text-[var(--text-primary)]"
            />
          </label>
          <label className="block text-[var(--text-xs)] text-[var(--text-tertiary)]">
            To
            <input
              type="datetime-local"
              value={to}
              onChange={e => { setOffset(0); setTo(e.target.value) }}
              className="mt-1 w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-sm)] text-[var(--text-primary)]"
            />
          </label>
          <label className="block text-[var(--text-xs)] text-[var(--text-tertiary)]">
            Actor
            <select
              value={actorId}
              onChange={e => { setOffset(0); setActorId(e.target.value) }}
              className="mt-1 w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-sm)] text-[var(--text-primary)]"
            >
              <option value="">Anyone</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </label>
          <div className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
            <div>Results</div>
            <div className="mt-1 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-sm)] text-[var(--text-primary)]">
              {loading ? 'Loading…' : `${total.toLocaleString()} event${total === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-1.5">Action type</div>
            <div className="flex flex-wrap gap-1.5">
              {KNOWN_ACTIONS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAction(a)}
                  className={`text-[var(--text-xs)] px-2 py-1 rounded-full border transition ${actions.includes(a)
                    ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-1.5">Resource type</div>
            <div className="flex flex-wrap gap-1.5">
              {KNOWN_RESOURCE_TYPES.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleResourceType(a)}
                  className={`text-[var(--text-xs)] px-2 py-1 rounded-full border transition ${resourceTypes.includes(a)
                    ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={clearFilters}
            className="text-[var(--text-xs)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Clear all filters
          </button>
        </div>
      </Card>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-red-50 text-red-700 text-[var(--text-sm)]">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[var(--text-sm)]">
            <thead className="bg-[var(--bg-secondary)] text-[var(--text-xs)] uppercase tracking-wide text-[var(--text-tertiary)]">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Resource</th>
                <th className="px-4 py-3 text-left">Target</th>
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--text-tertiary)]"><Loader2 className="w-5 h-5 animate-spin inline" /> Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-0 text-[var(--text-tertiary)]">
                  <EmptyState
                    icon={ShieldCheck}
                    title="No audit events match"
                    body="Try widening your date range or clearing filters. Every change in the workspace is recorded here for assurance."
                    density="compact"
                  />
                </td></tr>
              ) : rows.map(r => (
                <Fragment key={r.id}>
                  <tr className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{formatTimestamp(r.created_at)}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{r.user_name ?? r.user_email ?? <span className="text-[var(--text-tertiary)]">system</span>}</td>
                    <td className="px-4 py-3"><code className="text-[var(--text-xs)] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)]">{r.action}</code></td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{r.resource_type}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[260px] truncate" title={targetFor(r)}>{targetFor(r)}</td>
                    <td className="px-4 py-3 text-[var(--text-tertiary)] whitespace-nowrap"><code className="text-[var(--text-xs)]">{r.ip_address ?? '—'}</code></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(r.id)}
                        className="inline-flex items-center gap-1 text-[var(--text-xs)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded.has(r.id) ? 'rotate-180' : ''}`} />
                        {expanded.has(r.id) ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                  {expanded.has(r.id) && (
                    <tr className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                      <td colSpan={7} className="px-4 py-3">
                        <pre className="text-[var(--text-xs)] text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap">{JSON.stringify(r.details ?? {}, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-subtle)] text-[var(--text-xs)] text-[var(--text-tertiary)]">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0 || loading}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-subtle)] disabled:opacity-50 hover:bg-[var(--bg-tertiary)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              type="button"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total || loading}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-subtle)] disabled:opacity-50 hover:bg-[var(--bg-tertiary)]"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
