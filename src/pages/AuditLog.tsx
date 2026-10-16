import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Download, ChevronLeft, ChevronRight, ChevronDown, Loader2, FilterX } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { Button } from '../design-system'
import { StateBoundary, SkeletonTable, notify } from '../components/ui'
import { auditLog, users as usersApi, downloadAuditCsv, type AuditExplorerEntry, type ApiUser } from '../lib/api'
import SavedViewsBar from '../components/SavedViewsBar'
import { useFmt } from '../lib/fmt'
import { dur, ease } from '../motion/tokens'

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

const inputCls =
  'mt-1.5 w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)] transition-colors'

export default function AuditLog() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const [rows, setRows] = useState<AuditExplorerEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
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

  /** Humanised label for an action/resource key when the locale has one; the raw key otherwise. */
  const actionLabel = (a: string) => (i18n.exists(`auditLogPage.actions.${a}`) ? t(`auditLogPage.actions.${a}`) : null)
  const resourceLabel = (r: string) => (i18n.exists(`auditLogPage.resources.${r}`) ? t(`auditLogPage.resources.${r}`) : r)

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
      setLoaded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('auditLogPage.errors.load'))
    } finally {
      setLoading(false)
    }
  }, [params, i18n])

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
      notify.success(t('auditLogPage.exported', { count: total, formattedCount: f.number(total) }))
    } catch (e) {
      notify.error(t('auditLogPage.errors.export'), { description: e instanceof Error ? e.message : undefined })
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

  const filtersActive = Boolean(from || to || actorId || actions.length || resourceTypes.length)
  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : offset + 1
  const rangeEnd = Math.min(offset + rows.length, total)

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t('auditLogPage.title')}
        description={t('auditLogPage.description')}
        actions={
          <Button
            variant="secondary"
            size="lg"
            icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            onClick={() => void handleExport()}
            disabled={exporting || !!error || (loaded && total === 0)}
            title={loaded && total === 0 ? t('auditLogPage.exportNothing') : undefined}
            aria-busy={exporting || undefined}
          >
            {exporting ? t('auditLogPage.exporting') : t('auditLogPage.exportCsv')}
          </Button>
        }
      />

      <SavedViewsBar
        page="audit-log"
        filters={{ from, to, actorId, actions, resourceTypes }}
        onApply={(v: { from?: string; to?: string; actorId?: string; actions?: string[]; resourceTypes?: string[] }) => {
          setOffset(0)
          if (typeof v.from === 'string') setFrom(v.from)
          if (typeof v.to === 'string') setTo(v.to)
          if (typeof v.actorId === 'string') setActorId(v.actorId)
          if (Array.isArray(v.actions)) setActions(v.actions)
          if (Array.isArray(v.resourceTypes)) setResourceTypes(v.resourceTypes)
        }}
      />

      {/* Filters */}
      <section className="surface-paper" aria-labelledby="audit-filters">
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 id="audit-filters" className="text-h3 text-[var(--text-primary)]">{t('auditLogPage.filters.title')}</h2>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 h-10 sm:h-8 px-2.5 -mr-2.5 rounded-[var(--radius-md)] text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-micro ease-out"
            >
              <FilterX className="w-3.5 h-3.5" aria-hidden /> {t('auditLogPage.filters.clearAll')}
            </button>
          )}
        </div>
        <div className="px-5 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block text-small font-medium text-[var(--text-secondary)]">
            {t('auditLogPage.filters.from')}
            <input
              type="datetime-local"
              value={from}
              onChange={e => { setOffset(0); setFrom(e.target.value) }}
              className={inputCls}
            />
          </label>
          <label className="block text-small font-medium text-[var(--text-secondary)]">
            {t('auditLogPage.filters.to')}
            <input
              type="datetime-local"
              value={to}
              onChange={e => { setOffset(0); setTo(e.target.value) }}
              className={inputCls}
            />
          </label>
          <label className="block text-small font-medium text-[var(--text-secondary)] sm:col-span-2 lg:col-span-1">
            {t('auditLogPage.filters.actor')}
            <select
              value={actorId}
              onChange={e => { setOffset(0); setActorId(e.target.value) }}
              className={inputCls}
            >
              <option value="">{t('auditLogPage.filters.anyone')}</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChipGroup
            label={t('auditLogPage.filters.actionType')}
            options={KNOWN_ACTIONS}
            selected={actions}
            onToggle={toggleAction}
            labelFor={a => actionLabel(a) ?? a}
          />
          <ChipGroup
            label={t('auditLogPage.filters.resourceType')}
            options={KNOWN_RESOURCE_TYPES}
            selected={resourceTypes}
            onToggle={toggleResourceType}
            labelFor={resourceLabel}
          />
        </div>
      </section>

      {/* Events */}
      <section className="surface-paper overflow-hidden" aria-labelledby="audit-events">
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border-subtle)]">
          <h2 id="audit-events" className="text-h3 text-[var(--text-primary)]">{t('auditLogPage.events')}</h2>
          <span className="text-caption text-[var(--text-tertiary)] tabular-nums whitespace-nowrap" aria-live="polite">
            {error ? null : !loaded ? t('auditLogPage.filters.loading') : t('auditLogPage.filters.events', { count: total, formattedCount: f.number(total) })}
          </span>
        </header>
        <StateBoundary
          loading={loading}
          hasData={loaded && rows.length > 0}
          error={error}
          onRetry={() => void load()}
          empty={rows.length === 0}
          compact
          skeleton={<div className="p-4"><SkeletonTable rows={8} cols={6} /></div>}
          errorState={{ title: t('auditLogPage.errors.loadTitle'), body: t('auditLogPage.errors.loadBody') }}
          emptyState={
            filtersActive
              ? { variant: 'filtered', title: t('auditLogPage.empty.title'), body: t('auditLogPage.empty.body'), onClearFilters: clearFilters }
              : { title: t('auditLogPage.empty.noneTitle'), body: t('auditLogPage.empty.noneBody') }
          }
        >
          <div className={`overflow-auto max-h-[calc(100vh-220px)] min-h-[200px] transition-opacity duration-fast ${loading ? 'opacity-60' : ''}`} aria-busy={loading || undefined}>
            <table className="data-table min-w-[960px]">
              <thead>
                <tr>
                  <th className="sticky top-0 z-[1] !pl-5">{t('auditLogPage.table.timestamp')}</th>
                  <th className="sticky top-0 z-[1]">{t('auditLogPage.table.actor')}</th>
                  <th className="sticky top-0 z-[1]">{t('auditLogPage.table.action')}</th>
                  <th className="sticky top-0 z-[1]">{t('auditLogPage.table.resource')}</th>
                  <th className="sticky top-0 z-[1]">{t('auditLogPage.table.target')}</th>
                  <th className="sticky top-0 z-[1]">{t('auditLogPage.table.ip')}</th>
                  <th className="sticky top-0 z-[1] !pr-5 text-right">{t('auditLogPage.table.details')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const open = expanded.has(r.id)
                  const label = actionLabel(r.action)
                  const detailsId = `audit-details-${r.id}`
                  return (
                    <Fragment key={r.id}>
                      <tr className={open ? 'bg-[var(--bg-hover)]' : ''}>
                        <td className="!pl-5 whitespace-nowrap tabular-nums" title={r.created_at}>
                          {f.dateTime(r.created_at, { seconds: true })}
                        </td>
                        <td className="text-[var(--text-primary)] whitespace-nowrap">
                          {r.user_name ?? r.user_email ?? <span className="text-[var(--text-tertiary)]">{t('auditLogPage.table.system')}</span>}
                        </td>
                        <td>
                          {label ? (
                            <span className="flex flex-col">
                              <span className="text-[var(--text-primary)] whitespace-nowrap">{label}</span>
                              <code className="font-mono text-caption text-[var(--text-tertiary)]">{r.action}</code>
                            </span>
                          ) : (
                            <code className="font-mono text-caption px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">{r.action}</code>
                          )}
                        </td>
                        <td className="whitespace-nowrap">{resourceLabel(r.resource_type)}</td>
                        <td className="max-w-[260px] truncate" title={targetFor(r)}>{targetFor(r)}</td>
                        <td className="whitespace-nowrap font-mono text-caption text-[var(--text-tertiary)]">{r.ip_address ?? '—'}</td>
                        <td className="!pr-5 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(r.id)}
                            aria-expanded={open}
                            aria-controls={detailsId}
                            className="inline-flex items-center gap-1 h-10 sm:h-8 px-2 rounded-[var(--radius-md)] text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] whitespace-nowrap transition-colors duration-micro ease-out"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-fast ease-out ${open ? 'rotate-180' : ''}`} aria-hidden />
                            {open ? t('auditLogPage.table.hide') : t('auditLogPage.table.show')}
                          </button>
                        </td>
                      </tr>
                      <AnimatePresence initial={false}>
                        {open && (
                          <tr id={detailsId} className="bg-[var(--bg-subtle)] hover:!bg-[var(--bg-subtle)]">
                            <td colSpan={7} className="!p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: dur.base, ease: ease.out }}
                                className="overflow-hidden"
                              >
                                <pre className="px-5 py-3 font-mono text-caption text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap break-words">
                                  {JSON.stringify(r.details ?? {}, null, 2)}
                                </pre>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-[var(--border-subtle)] text-small text-[var(--text-tertiary)]">
            <span className="tabular-nums">
              {t('auditLogPage.pagination.range', { start: f.number(rangeStart), end: f.number(rangeEnd), total: f.number(total) })}
              <span className="hidden sm:inline"> · {t('auditLogPage.pagination.pageOf', { page, total: totalPages })}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0 || loading}
                className="btn-secondary !h-10 sm:!h-8 !px-3"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden /> {t('auditLogPage.pagination.prev')}
              </button>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total || loading}
                className="btn-secondary !h-10 sm:!h-8 !px-3"
              >
                {t('auditLogPage.pagination.next')} <ChevronRight className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
          </footer>
        </StateBoundary>
      </section>
    </div>
  )
}

function ChipGroup({
  label, options, selected, onToggle, labelFor,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  labelFor: (v: string) => string
}) {
  return (
    <fieldset>
      <legend className="text-small font-medium text-[var(--text-secondary)] mb-2">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
          const on = selected.includes(o)
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={on}
              title={o}
              className={`chip !h-8 [@media(hover:none)]:!h-10 ${on ? 'chip-active' : ''}`}
            >
              {labelFor(o)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
