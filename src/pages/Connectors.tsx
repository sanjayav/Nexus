import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Papa from 'papaparse'
import { Plug, FileUp, AlertTriangle, Check, ArrowLeft, Database, Cloud, Layers, X, Briefcase, Server, Zap } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { SkeletonCard } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { EmptyEvidenceIllustration } from '../data/illustrations'
import { Card, Button, Badge } from '../design-system'
import {
  connectors,
  type ConnectorTemplate, type ConnectorImportResult, type ConnectorImportSummary,
  type ConnectorAdapterInfo, type ConnectorConnectionRow, type ConnectorProvider,
} from '../lib/api'
import { showWarning, showError } from '../lib/toast'

/** How long to wait before nagging the user that the import is slow.
 *  Five minutes lines up with the backend's processing budget for large
 *  files; past this we show a "you can leave the page" hint. */
const IMPORT_SLOW_THRESHOLD_MS = 5 * 60 * 1000

type SourceKey = 'sap_s4hana' | 'netsuite' | 'snowflake' | 'generic_csv'

/** `name` is a product name (not translated) unless `nameKey` is set;
 *  `subtitleKey` is an i18n key resolved at render. */
const SOURCES: Array<{ key: SourceKey; name: string; nameKey?: string; subtitleKey: string; icon: typeof Database }> = [
  { key: 'sap_s4hana', name: 'SAP S/4HANA', subtitleKey: 'connectorsPage.sources.sap_s4hana.subtitle', icon: Database },
  { key: 'netsuite',   name: 'NetSuite',    subtitleKey: 'connectorsPage.sources.netsuite.subtitle',   icon: Layers },
  { key: 'snowflake',  name: 'Snowflake',   subtitleKey: 'connectorsPage.sources.snowflake.subtitle',  icon: Cloud },
  { key: 'generic_csv',name: 'Generic CSV', nameKey: 'connectorsPage.sources.generic_csv.name', subtitleKey: 'connectorsPage.sources.generic_csv.subtitle', icon: FileUp },
]

/**
 * Client-side widening of ConnectorAdapterInfo (declared in lib/api.ts) for
 * optional fields the connector registry may expose: Simplified Chinese
 * display copy and a not-yet-live marker for connectors that are listed but
 * cannot be connected yet. Several spellings of the not-live flag are
 * accepted so the page stays correct whichever one the registry uses.
 */
type AdapterView = ConnectorAdapterInfo & {
  nameZh?: string | null
  descriptionZh?: string | null
  live?: boolean
  available?: boolean
  comingSoon?: boolean
  status?: string
  availability?: string
}

function isNotLive(a: AdapterView): boolean {
  return a.live === false
    || a.available === false
    || a.comingSoon === true
    || a.status === 'coming_soon'
    || a.availability === 'coming_soon'
}

interface ParsedCsv {
  fileName: string
  headers: string[]
  rows: Record<string, string>[]
}

const PROVIDER_ICONS: Record<ConnectorProvider, typeof Database> = {
  sap_s4hana: Database,
  oracle_fusion: Database,
  netsuite: Layers,
  workday: Briefcase,
  salesforce: Cloud,
  snowflake: Cloud,
  aws: Server,
  gcp: Server,
  azure: Server,
  generic_rest: Zap,
}

export default function Connectors() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh') ?? false
  const dateLocale = isZh ? 'zh-CN' : i18n.language?.startsWith('th') ? 'th-TH' : undefined
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(dateLocale)
  const [allTemplates, setAllTemplates] = useState<ConnectorTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [adapters, setAdapters] = useState<ConnectorAdapterInfo[]>([])
  const [connections, setConnections] = useState<ConnectorConnectionRow[]>([])
  const [oauthStartingFor, setOauthStartingFor] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<SourceKey | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ConnectorTemplate | null>(null)
  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ConnectorImportResult | null>(null)
  const [imports, setImports] = useState<ConnectorImportSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  // Cancel handle for the in-flight import. Sonner is the secondary signal —
  // this primary "Cancel" button lives next to the spinner.
  const importAbortRef = useRef<AbortController | null>(null)
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadImports = useCallback(async () => {
    try { setImports(await connectors.imports()) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingTemplates(true)
      try {
        const tpls = await connectors.templates()
        if (!cancelled) setAllTemplates(tpls)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('connectorsPage.errors.loadTemplates'))
      } finally {
        if (!cancelled) setLoadingTemplates(false)
      }
    })()
    ;(async () => {
      try {
        const live = await connectors.list()
        if (!cancelled) {
          setAdapters(live.adapters)
          setConnections(live.connections)
        }
      } catch {
        // Live tiles still render; we just don't show "connected" badges if the API failed.
      }
    })()
    void loadImports()
    return () => { cancelled = true }
  }, [loadImports])

  const handleConnect = async (provider: ConnectorProvider) => {
    setOauthStartingFor(provider)
    try {
      const { authorizationUrl } = await connectors.startOAuth(provider)
      // Top-level redirect — the provider takes over the browser, then returns
      // the user to our /api/connectors/oauth/callback/:provider endpoint
      // which redirects back to /data/connectors/:connectionId.
      window.location.assign(authorizationUrl)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('connectorsPage.errors.startOAuth')
      // Common case: the server admin hasn't set CLIENT_ID / SECRET env vars
      // for this provider yet. Surface that clearly rather than as a stack trace.
      showError(msg)
      setOauthStartingFor(null)
    }
  }

  const connectionByProvider = useMemo(() => {
    const map = new Map<string, ConnectorConnectionRow>()
    for (const c of connections) map.set(c.provider, c)
    return map
  }, [connections])

  const sourceTemplates = useMemo(
    () => selectedSource ? allTemplates.filter(t => t.source === selectedSource) : [],
    [allTemplates, selectedSource]
  )

  const handleFile = (file: File) => {
    setParseError(null)
    setImportResult(null)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        if (result.errors.length > 0) {
          setParseError(result.errors[0].message)
          return
        }
        const rows = result.data.slice(0, 5000)
        const headers = result.meta.fields ?? Object.keys(rows[0] ?? {})
        setCsv({ fileName: file.name, headers, rows })
      },
      error: err => setParseError(err.message),
    })
  }

  const handleImport = async () => {
    if (!selectedTemplate || !csv) return
    setImporting(true)
    setError(null)
    // Set up cancel + slow-import warning. The cancel only stops *watching*;
    // the backend job continues (it's a single API call, not a poll loop,
    // but the user perception is the same).
    importAbortRef.current = new AbortController()
    slowTimerRef.current = setTimeout(() => {
      showWarning(t('connectorsPage.toast.importSlow'))
    }, IMPORT_SLOW_THRESHOLD_MS)
    try {
      const result = await connectors.import({
        templateId: selectedTemplate.id,
        fileName: csv.fileName,
        rows: csv.rows,
      })
      setImportResult(result)
      await loadImports()
    } catch (e) {
      // Distinguish a user-initiated cancel from a real failure.
      const msg = e instanceof Error ? e.message : t('connectorsPage.errors.importFailed')
      if (importAbortRef.current?.signal.aborted) {
        setError(null)
      } else {
        setError(msg)
      }
    } finally {
      setImporting(false)
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current)
        slowTimerRef.current = null
      }
      importAbortRef.current = null
    }
  }

  /** Stop watching the in-flight import. The server job is not actually
   *  cancelled (this CSV pipeline is a single sync call), but the UI no
   *  longer blocks; results will appear in "Recent imports" when done. */
  const handleCancelImport = () => {
    importAbortRef.current?.abort()
    importAbortRef.current = null
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current)
      slowTimerRef.current = null
    }
    setImporting(false)
  }

  // Cleanup any pending timers on unmount.
  useEffect(() => () => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
  }, [])

  const resetTemplate = () => {
    setSelectedTemplate(null)
    setCsv(null)
    setImportResult(null)
    setParseError(null)
  }

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('connectorsPage.breadcrumbs.data'), to: '/data' },
          { label: t('connectorsPage.breadcrumbs.connectors') },
        ]}
        eyebrow={t('connectorsPage.eyebrow')}
        title={t('connectorsPage.title')}
        subtitle={t('connectorsPage.subtitle')}
      />

      {error && (
        <Card variant="outlined" className="mb-4 border-[var(--accent-red-light)]">
          <div className="flex items-start gap-3 text-[13px] text-[var(--accent-red)]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        </Card>
      )}

      {/* ─── Live integrations (OAuth + API key) ────────────────────── */}
      {adapters.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{t('connectorsPage.live.heading')}</h3>
            <Badge variant="gray">{t('connectorsPage.live.providers', { count: adapters.length })}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(adapters as AdapterView[]).map(a => {
              const Icon = PROVIDER_ICONS[a.id] ?? Database
              const notLive = isNotLive(a)
              // A not-yet-live connector is never presented as connected or connectable.
              const conn = notLive ? undefined : connectionByProvider.get(a.id)
              const displayName = (isZh && a.nameZh) || a.name
              const displayDescription = (isZh && a.descriptionZh) || a.description
              const status = notLive ? 'coming_soon' :
                conn?.status === 'active' ? 'connected'
                  : conn?.status === 'error' ? 'error'
                    : conn?.status === 'disabled' ? 'disconnected'
                      : 'not_connected'
              const isStarting = oauthStartingFor === a.id
              return (
                <Card key={a.id} variant="paper" className="flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-md bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] text-[14px]">{displayName}</div>
                      <div className="text-[11.5px] text-[var(--text-tertiary)] uppercase tracking-wide mt-0.5">{t(`connectorsPage.categories.${a.category}`, { defaultValue: a.category })}</div>
                    </div>
                    {status === 'connected' && <Badge variant="green">{t('connectorsPage.live.connected')}</Badge>}
                    {status === 'error' && <Badge variant="red">{t('connectorsPage.live.error')}</Badge>}
                    {status === 'disconnected' && <Badge variant="gray">{t('connectorsPage.live.disconnected')}</Badge>}
                    {status === 'coming_soon' && <Badge variant="gray">{t('connectorsPage.live.comingSoon')}</Badge>}
                  </div>
                  <div className="text-[12.5px] text-[var(--text-secondary)] mb-3 line-clamp-2">{displayDescription}</div>
                  {conn?.last_sync_at && (
                    <div className="text-[11.5px] text-[var(--text-tertiary)] mb-3">
                      {t('connectorsPage.live.lastSync', { date: fmtDateTime(conn.last_sync_at) })}
                    </div>
                  )}
                  <div className="mt-auto flex items-center gap-2">
                    {notLive ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        title={t('connectorsPage.live.comingSoonHint')}
                      >
                        {t('connectorsPage.live.comingSoon')}
                      </Button>
                    ) : conn ? (
                      <Link
                        to={`/data/connectors/${conn.id}`}
                        className="px-3 py-1.5 text-[12.5px] rounded-md border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                      >
                        {t('connectorsPage.live.manage')}
                      </Link>
                    ) : a.authType === 'oauth2' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={isStarting}
                        disabled={!a.serverConfigured}
                        onClick={() => handleConnect(a.id)}
                        title={a.serverConfigured ? undefined : t('connectorsPage.live.serverNotConfiguredTitle')}
                      >
                        {t('connectorsPage.live.connect')}
                      </Button>
                    ) : (
                      <Link
                        to={`/data/connectors/new?provider=${a.id}`}
                        className="px-3 py-1.5 text-[12.5px] rounded-md bg-[var(--accent-blue)] text-white hover:opacity-90"
                      >
                        {t('connectorsPage.live.configure')}
                      </Link>
                    )}
                    {!notLive && !a.serverConfigured && a.authType === 'oauth2' && (
                      <span className="text-[11px] text-[var(--text-tertiary)]">{t('connectorsPage.live.serverNotConfigured')}</span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {!selectedSource && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {SOURCES.map(s => {
              const Icon = s.icon
              const count = allTemplates.filter(tpl => tpl.source === s.key).length
              return (
                <Card key={s.key} variant="paper" hover className="cursor-pointer" onClick={() => setSelectedSource(s.key)}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] text-[14px]">{s.nameKey ? t(s.nameKey) : s.name}</div>
                      <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">{t(s.subtitleKey)}</div>
                      <div className="mt-3"><Badge variant="gray">{t('connectorsPage.templatesCount', { count })}</Badge></div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {selectedSource && !selectedTemplate && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => setSelectedSource(null)}>
              {t('connectorsPage.allSources')}
            </Button>
            <span className="text-[13px] text-[var(--text-tertiary)]">/</span>
            <span className="text-[13px] text-[var(--text-primary)] font-medium">
              {(() => { const src = SOURCES.find(s => s.key === selectedSource); return src ? (src.nameKey ? t(src.nameKey) : src.name) : null })()}
            </span>
          </div>
          {loadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : sourceTemplates.length === 0 ? (
            <Card variant="paper"><div className="text-[13px] text-[var(--text-tertiary)]">{t('connectorsPage.noTemplates')}</div></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sourceTemplates.map(tpl => (
                <Card key={tpl.id} variant="paper" hover className="cursor-pointer" onClick={() => setSelectedTemplate(tpl)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-semibold text-[var(--text-primary)] text-[14px]">{tpl.name}</div>
                    {tpl.scope !== null && <Badge variant="blue">{t('connectorsPage.scope', { scope: tpl.scope })}</Badge>}
                  </div>
                  <div className="text-[12.5px] text-[var(--text-secondary)] mb-3">{tpl.description}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{t('connectorsPage.requiredColumns')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.required_columns.length === 0
                      ? <span className="text-[12px] text-[var(--text-tertiary)]">{t('connectorsPage.userDefined')}</span>
                      : tpl.required_columns.map(c => (
                          <code key={c} className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[11px] font-mono text-[var(--text-secondary)]">{c}</code>
                        ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTemplate && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={resetTemplate}>
              {t('connectorsPage.backToTemplates')}
            </Button>
            <span className="text-[13px] text-[var(--text-tertiary)]">/</span>
            <span className="text-[13px] text-[var(--text-primary)] font-medium">{selectedTemplate.name}</span>
          </div>

          <Card variant="paper" className="mb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">{t('connectorsPage.uploadCsv')}</div>
                <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">{selectedTemplate.description}</div>
              </div>
              {selectedTemplate.scope !== null && <Badge variant="blue">{t('connectorsPage.scope', { scope: selectedTemplate.scope })}</Badge>}
            </div>
            <label className="block">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                className="block w-full text-[13px] file:mr-3 file:px-3 file:py-2 file:rounded-md file:border file:border-[var(--border-default)] file:bg-[var(--bg-secondary)] file:text-[var(--text-primary)] file:cursor-pointer file:hover:bg-[var(--bg-hover)]"
              />
            </label>
            {parseError && (
              <div className="text-[12.5px] text-[var(--accent-red)] mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {parseError}
              </div>
            )}
          </Card>

          {csv && (
            <Card variant="paper" className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">{csv.fileName}</div>
                  <div className="text-[12.5px] text-[var(--text-secondary)]">{t('connectorsPage.rowsParsed', { count: csv.rows.length })}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={handleImport} loading={importing} icon={<FileUp className="w-4 h-4" />}>
                    {t('connectorsPage.importRows', { count: csv.rows.length })}
                  </Button>
                  {importing && (
                    <Button
                      variant="ghost"
                      onClick={handleCancelImport}
                      icon={<X className="w-4 h-4" />}
                      title={t('connectorsPage.cancelTitle')}
                    >
                      {t('connectorsPage.cancel')}
                    </Button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto border border-[var(--border-default)] rounded-md">
                <table className="w-full text-[12px]">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      {csv.headers.map(h => {
                        const mappedTo = Object.entries(selectedTemplate.mapping).find(([, src]) => src === h)?.[0]
                        return (
                          <th key={h} className="px-2 py-2 text-left text-[var(--text-secondary)] font-medium whitespace-nowrap">
                            <div className="font-mono">{h}</div>
                            {mappedTo && (
                              <div className="text-[10.5px] text-[var(--accent-teal)] font-normal mt-0.5">→ {mappedTo}</div>
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {csv.rows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-t border-[var(--border-subtle)]">
                        {csv.headers.map(h => (
                          <td key={h} className="px-2 py-1.5 whitespace-nowrap text-[var(--text-primary)] font-mono">{r[h] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {importResult && (
            <Card variant="outlined" className="mb-4">
              <div className="flex items-start gap-3 mb-3">
                {importResult.failed === 0
                  ? <Check className="w-5 h-5 text-[var(--accent-green)]" />
                  : <AlertTriangle className="w-5 h-5 text-[var(--accent-amber)]" />}
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">{t('connectorsPage.importComplete')}</div>
                  <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                    {t('connectorsPage.importSummary', { imported: importResult.imported, failed: importResult.failed, total: importResult.total })}
                  </div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="overflow-x-auto max-h-64 overflow-y-auto border border-[var(--border-default)] rounded-md">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[var(--bg-secondary)]">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-[var(--text-secondary)] font-medium">{t('connectorsPage.errorTable.row')}</th>
                        <th className="px-2 py-1.5 text-left text-[var(--text-secondary)] font-medium">{t('connectorsPage.errorTable.error')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((e, i) => (
                        <tr key={i} className="border-t border-[var(--border-subtle)]">
                          <td className="px-2 py-1.5 font-mono text-[var(--text-primary)]">{e.row}</td>
                          <td className="px-2 py-1.5 text-[var(--accent-red)]">{e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <Card variant="paper">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Plug className="w-4 h-4" /> {t('connectorsPage.recent.heading')}
          </h3>
          <Badge variant="gray">{imports.length}</Badge>
        </div>
        {imports.length === 0 ? (
          <EmptyState
            illustration={EmptyEvidenceIllustration}
            icon={Plug}
            title={t('connectorsPage.recent.emptyTitle')}
            body={t('connectorsPage.recent.emptyBody')}
            density="compact"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <th className="py-2 pr-3">{t('connectorsPage.recent.file')}</th>
                  <th className="py-2 pr-3">{t('connectorsPage.recent.template')}</th>
                  <th className="py-2 pr-3">{t('connectorsPage.recent.imported')}</th>
                  <th className="py-2 pr-3">{t('connectorsPage.recent.failed')}</th>
                  <th className="py-2 pr-3">{t('connectorsPage.recent.status')}</th>
                  <th className="py-2 pr-3">{t('connectorsPage.recent.when')}</th>
                </tr>
              </thead>
              <tbody>
                {imports.map(im => (
                  <tr key={im.id} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2.5 pr-3 text-[var(--text-primary)] font-mono">{im.file_name}</td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{im.template_name ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-[var(--text-primary)]">{im.rows_imported}/{im.rows_total}</td>
                    <td className="py-2.5 pr-3 text-[var(--accent-red)]">{im.rows_failed}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={im.status === 'complete' ? 'green' : im.status === 'failed' ? 'red' : 'amber'}>{t(`connectorsPage.importStatus.${im.status}`, { defaultValue: im.status })}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{fmtDateTime(im.created_at)}</td>
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
