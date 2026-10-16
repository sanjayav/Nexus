import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FileUp, AlertTriangle, Check, ArrowLeft, Database, Cloud, Layers, X, Briefcase, Server, Zap,
  ChevronDown, Cpu, FileText, Users as UsersIcon, ArrowRight,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Card, Button } from '../design-system'
import { StateBoundary, StatusPill, SkeletonCard, SkeletonTable, notify, type PillTone } from '../components/ui'
import {
  connectors,
  type ConnectorTemplate, type ConnectorImportResult, type ConnectorImportSummary,
  type ConnectorAdapterInfo, type ConnectorConnectionRow, type ConnectorProvider,
} from '../lib/api'
import { readCsvFile } from '../lib/csv'
import { useFmt } from '../lib/fmt'
import { dur, ease } from '../motion/tokens'
import { stickyTh } from '../components/settings/admin-tables/shared'

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
 * fields the connector registry exposes: Simplified Chinese display copy, a
 * market marker ('cn' for mainland China systems) and a not-yet-live marker
 * for connectors that are listed but cannot be connected yet. Several
 * spellings of the not-live flag are accepted so the page stays correct
 * whichever one the registry uses.
 */
type AdapterView = ConnectorAdapterInfo & {
  nameZh?: string | null
  descriptionZh?: string | null
  market?: string | null
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

const CATEGORY_ICONS: Record<string, typeof Database> = {
  ERP: Database,
  HCM: UsersIcon,
  IoT: Cpu,
  Utilities: Zap,
  Metering: Zap,
  Energy: Zap,
  Regulatory: FileText,
  Cloud: Server,
  'Data Warehouse': Cloud,
}

function iconFor(a: AdapterView): typeof Database {
  return PROVIDER_ICONS[a.id as ConnectorProvider] ?? CATEGORY_ICONS[a.category] ?? Database
}

const IMPORT_TONE: Record<string, { tone: PillTone; dot?: boolean }> = {
  complete: { tone: 'success' },
  failed: { tone: 'danger' },
  processing: { tone: 'info', dot: true },
  pending: { tone: 'neutral', dot: true },
}

export default function Connectors() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const isZh = i18n.language?.startsWith('zh') ?? false
  const [allTemplates, setAllTemplates] = useState<ConnectorTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [adapters, setAdapters] = useState<ConnectorAdapterInfo[]>([])
  const [connections, setConnections] = useState<ConnectorConnectionRow[]>([])
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError] = useState<unknown>(null)
  const [oauthStartingFor, setOauthStartingFor] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<SourceKey | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ConnectorTemplate | null>(null)
  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ConnectorImportResult | null>(null)
  const [imports, setImports] = useState<ConnectorImportSummary[]>([])
  const [importsLoading, setImportsLoading] = useState(true)
  const [importsError, setImportsError] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  // Cancel handle for the in-flight import. Sonner is the secondary signal —
  // this primary "Cancel" button lives next to the spinner.
  const importAbortRef = useRef<AbortController | null>(null)
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadImports = useCallback(async () => {
    try {
      setImports(await connectors.imports())
      setImportsError(null)
    } catch (e) {
      setImportsError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setImportsLoading(false)
    }
  }, [])

  const loadLive = useCallback(async () => {
    setLiveLoading(true)
    setLiveError(null)
    try {
      const live = await connectors.list()
      setAdapters(live.adapters)
      setConnections(live.connections)
    } catch (e) {
      setLiveError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLiveLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingTemplates(true)
      try {
        const tpls = await connectors.templates()
        if (!cancelled) setAllTemplates(tpls)
      } catch (e) {
        if (!cancelled) setTemplatesError(e instanceof Error ? e.message : t('connectorsPage.errors.loadTemplates'))
      } finally {
        if (!cancelled) setLoadingTemplates(false)
      }
    })()
    void loadLive()
    void loadImports()
    return () => { cancelled = true }
  }, [loadImports, loadLive])

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
      notify.error(msg)
      setOauthStartingFor(null)
    }
  }

  const connectionByProvider = useMemo(() => {
    const map = new Map<string, ConnectorConnectionRow>()
    for (const c of connections) map.set(c.provider, c)
    return map
  }, [connections])

  // Mainland China systems that aren't live yet get their own roadmap
  // section; everything else stays in the integrations grid.
  const { liveAdapters, cnSoon } = useMemo(() => {
    const all = adapters as AdapterView[]
    return {
      liveAdapters: all.filter(a => !(a.market === 'cn' && isNotLive(a))),
      cnSoon: all.filter(a => a.market === 'cn' && isNotLive(a)),
    }
  }, [adapters])

  const sourceTemplates = useMemo(
    () => selectedSource ? allTemplates.filter(t => t.source === selectedSource) : [],
    [allTemplates, selectedSource]
  )

  const handleFile = (file: File) => {
    setParseError(null)
    setImportResult(null)
    // Detects the encoding first (UTF-8 ± BOM, or GB18030/GBK as saved by
    // Chinese Excel) so Chinese headers and values aren't garbled.
    readCsvFile(file)
      .then(result => {
        if (result.error) {
          setParseError(result.error)
          return
        }
        setCsv({ fileName: file.name, headers: result.headers, rows: result.rows.slice(0, 5000) })
      })
      .catch(err => setParseError(err instanceof Error ? err.message : String(err)))
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
      notify.warning(t('connectorsPage.toast.importSlow'))
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

  const sourceName = (key: SourceKey | null) => {
    const src = SOURCES.find(s => s.key === key)
    return src ? (src.nameKey ? t(src.nameKey) : src.name) : null
  }

  return (
    <div className="page-container space-y-10">
      <PageHeader title={t('connectorsPage.title')} subtitle={t('connectorsPage.subtitle')} />

      {error && (
        <div
          role="alert"
          className="-mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--status-danger-line)] bg-[var(--status-danger-soft)] px-4 py-3 text-small text-[var(--status-danger)]"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
          <div className="min-w-0 break-words">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label={t('connectorsPage.dismiss')}
            className="ml-auto -my-1 w-8 h-8 flex-shrink-0 inline-flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--bg-primary)]/60"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}

      {/* ─── Live integrations (OAuth + API key) ────────────────────── */}
      <section aria-labelledby="live-heading">
        <SectionHeading
          id="live-heading"
          title={t('connectorsPage.live.heading')}
          intro={t('connectorsPage.live.intro')}
          count={liveLoading || liveError ? undefined : t('connectorsPage.live.providers', { count: liveAdapters.length })}
        />
        <StateBoundary
          loading={liveLoading}
          error={liveError}
          onRetry={() => void loadLive()}
          hasData={adapters.length > 0}
          empty={adapters.length === 0}
          skeleton={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          }
          errorState={{ title: t('connectorsPage.live.errorTitle'), body: t('connectorsPage.live.errorBody') }}
          emptyState={{ art: 'connect', title: t('connectorsPage.live.emptyTitle'), body: t('connectorsPage.live.emptyBody'), framed: true, density: 'compact' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveAdapters.map(a => {
              const Icon = iconFor(a)
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
                <article key={a.id} className="surface-paper p-4 flex flex-col min-w-0">
                  <div className="flex items-start gap-3 mb-3">
                    <ProviderIcon icon={Icon} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-body font-semibold text-[var(--text-primary)] truncate">{displayName}</h3>
                      <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t(`connectorsPage.categories.${a.category}`, { defaultValue: a.category })}</p>
                    </div>
                    {status === 'connected' && <StatusPill tone="success" dot>{t('connectorsPage.live.connected')}</StatusPill>}
                    {status === 'error' && <StatusPill tone="danger">{t('connectorsPage.live.error')}</StatusPill>}
                    {status === 'disconnected' && <StatusPill tone="neutral">{t('connectorsPage.live.disconnected')}</StatusPill>}
                    {status === 'coming_soon' && <StatusPill tone="neutral">{t('connectorsPage.live.comingSoon')}</StatusPill>}
                  </div>
                  <p className="text-small text-[var(--text-secondary)] mb-3 line-clamp-2">{displayDescription}</p>
                  {conn?.last_sync_at && (
                    <p className="text-caption text-[var(--text-tertiary)] mb-3 whitespace-nowrap truncate">
                      {t('connectorsPage.live.lastSync', { date: f.dateTime(conn.last_sync_at) })}
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-2 flex-wrap">
                    {notLive ? (
                      <Button variant="secondary" size="sm" disabled title={t('connectorsPage.live.comingSoonHint')}>
                        {t('connectorsPage.live.notYetAvailable')}
                      </Button>
                    ) : conn ? (
                      <Link
                        to={`/data/connectors/${conn.id}`}
                        className="inline-flex items-center gap-1.5 h-10 sm:h-8 px-3 text-small font-medium rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        {t('connectorsPage.live.manage')} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
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
                        className="inline-flex items-center h-10 sm:h-8 px-3 text-small font-semibold rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] transition-colors"
                      >
                        {t('connectorsPage.live.configure')}
                      </Link>
                    )}
                    {!notLive && !a.serverConfigured && a.authType === 'oauth2' && (
                      <span className="text-caption text-[var(--text-tertiary)]">{t('connectorsPage.live.serverNotConfigured')}</span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {cnSoon.length > 0 && (
            <section aria-labelledby="cn-heading" className="mt-8">
              <SectionHeading
                id="cn-heading"
                level={3}
                title={t('connectorsPage.cn.heading')}
                intro={t('connectorsPage.cn.intro')}
                count={t('connectorsPage.cn.count', { count: cnSoon.length })}
              />
              <ul className="surface-paper divide-y divide-[var(--border-subtle)] overflow-hidden">
                {cnSoon.map(a => (
                  <ComingSoonRow key={a.id} adapter={a} isZh={isZh} />
                ))}
              </ul>
            </section>
          )}
        </StateBoundary>
      </section>

      {/* ─── CSV import templates ───────────────────────────────────── */}
      <section aria-labelledby="csv-heading">
        <SectionHeading id="csv-heading" title={t('connectorsPage.csv.heading')} intro={t('connectorsPage.csv.intro')} />

        {templatesError && (
          <p role="alert" className="mb-3 flex items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--status-danger-line)] bg-[var(--status-danger-soft)] px-4 py-3 text-small text-[var(--status-danger)]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
            <span className="min-w-0">{t('connectorsPage.errors.templatesUnavailable', { message: templatesError })}</span>
          </p>
        )}

        {!selectedSource && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SOURCES.map(s => {
              const Icon = s.icon
              const count = allTemplates.filter(tpl => tpl.source === s.key).length
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedSource(s.key)}
                  className="surface-paper p-4 text-left flex items-start gap-3 min-w-0 transition-[border-color,box-shadow] duration-150 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/40"
                >
                  <ProviderIcon icon={Icon} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-body font-semibold text-[var(--text-primary)]">{s.nameKey ? t(s.nameKey) : s.name}</span>
                    <span className="block text-small text-[var(--text-secondary)] mt-0.5">{t(s.subtitleKey)}</span>
                    <span className="chip mt-3">
                      {loadingTemplates ? t('connectorsPage.templatesLoading') : templatesError ? '—' : t('connectorsPage.templatesCount', { count })}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {selectedSource && !selectedTemplate && (
          <div>
            <Crumb onBack={() => setSelectedSource(null)} backLabel={t('connectorsPage.allSources')} current={sourceName(selectedSource)} />
            {loadingTemplates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : sourceTemplates.length === 0 ? (
              <div className="surface-paper p-4 text-small text-[var(--text-tertiary)]">{t('connectorsPage.noTemplates')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sourceTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl)}
                    className="surface-paper p-4 text-left min-w-0 transition-[border-color,box-shadow] duration-150 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/40"
                  >
                    <span className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-body font-semibold text-[var(--text-primary)]">{tpl.name}</span>
                      {tpl.scope !== null && <span className="chip">{t('connectorsPage.scope', { scope: tpl.scope })}</span>}
                    </span>
                    <span className="block text-small text-[var(--text-secondary)] mb-3">{tpl.description}</span>
                    <span className="block text-caption text-[var(--text-tertiary)] mb-1.5">{t('connectorsPage.requiredColumns')}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {tpl.required_columns.length === 0
                        ? <span className="text-caption text-[var(--text-tertiary)]">{t('connectorsPage.userDefined')}</span>
                        : tpl.required_columns.map(c => (
                            <code key={c} className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-secondary)] text-caption font-mono text-[var(--text-secondary)]">{c}</code>
                          ))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTemplate && (
          <div>
            <Crumb onBack={resetTemplate} backLabel={t('connectorsPage.backToTemplates')} current={selectedTemplate.name} />

            <Card variant="paper" className="mb-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="text-body font-semibold text-[var(--text-primary)]">{t('connectorsPage.uploadCsv')}</h3>
                  <p className="text-small text-[var(--text-secondary)] mt-0.5">{selectedTemplate.description}</p>
                </div>
                {selectedTemplate.scope !== null && <span className="chip">{t('connectorsPage.scope', { scope: selectedTemplate.scope })}</span>}
              </div>
              <label className="block">
                <span className="sr-only">{t('connectorsPage.chooseFile')}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  className="block w-full text-small text-[var(--text-secondary)] file:mr-3 file:h-10 file:px-3 file:rounded-[var(--radius-md)] file:border file:border-solid file:border-[var(--border-default)] file:bg-[var(--bg-secondary)] file:text-[var(--text-primary)] file:font-medium file:cursor-pointer hover:file:bg-[var(--bg-hover)]"
                />
              </label>
              {parseError && (
                <p role="alert" className="text-small text-[var(--status-danger)] mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden /> {parseError}
                </p>
              )}
            </Card>

            {csv && (
              <Card variant="paper" className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-body font-semibold text-[var(--text-primary)] truncate">{csv.fileName}</div>
                    <div className="text-small text-[var(--text-secondary)]">{t('connectorsPage.rowsParsed', { count: csv.rows.length })}</div>
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
                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-default)]">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {csv.headers.map(h => {
                          const mappedTo = Object.entries(selectedTemplate.mapping).find(([, src]) => src === h)?.[0]
                          return (
                            <th key={h} className="!normal-case !tracking-normal">
                              <div className="font-mono text-caption text-[var(--text-secondary)]">{h}</div>
                              {mappedTo && (
                                <div className="text-caption font-normal text-[var(--color-brand)] mt-0.5">→ {mappedTo}</div>
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {csv.rows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          {csv.headers.map(h => (
                            <td key={h} className="whitespace-nowrap !text-[var(--text-primary)] font-mono text-caption">{r[h] ?? ''}</td>
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
                    ? <Check className="w-5 h-5 text-[var(--status-success)] flex-shrink-0" aria-hidden />
                    : <AlertTriangle className="w-5 h-5 text-[var(--status-warning)] flex-shrink-0" aria-hidden />}
                  <div>
                    <div className="text-body font-semibold text-[var(--text-primary)]">{t('connectorsPage.importComplete')}</div>
                    <div className="text-small text-[var(--text-secondary)] mt-0.5 tabular-nums">
                      {t('connectorsPage.importSummary', { imported: f.number(importResult.imported), failed: f.number(importResult.failed), total: f.number(importResult.total) })}
                    </div>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-64 overflow-auto rounded-[var(--radius-md)] border border-[var(--border-default)]">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className={`${stickyTh} num`}>{t('connectorsPage.errorTable.row')}</th>
                          <th className={stickyTh}>{t('connectorsPage.errorTable.error')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((e, i) => (
                          <tr key={i}>
                            <td className="num font-mono !text-[var(--text-primary)]">{e.row}</td>
                            <td className="!text-[var(--status-danger)]">{e.error}</td>
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
      </section>

      {/* ─── Recent imports ─────────────────────────────────────────── */}
      <section aria-labelledby="recent-heading">
        <SectionHeading
          id="recent-heading"
          title={t('connectorsPage.recent.heading')}
          count={importsLoading || importsError ? undefined : t('connectorsPage.recent.count', { count: imports.length })}
        />
        <StateBoundary
          loading={importsLoading}
          error={importsError}
          onRetry={() => { setImportsLoading(true); void loadImports() }}
          hasData={imports.length > 0}
          empty={imports.length === 0}
          skeleton={<SkeletonTable rows={3} cols={6} framed />}
          errorState={{ title: t('connectorsPage.recent.errorTitle'), body: t('connectorsPage.recent.errorBody'), density: 'compact' }}
          emptyState={{ art: 'upload', title: t('connectorsPage.recent.emptyTitle'), body: t('connectorsPage.recent.emptyBody'), framed: true, density: 'compact' }}
        >
          <div className="surface-paper overflow-hidden">
            <div className="overflow-x-auto max-h-[480px]">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className={stickyTh}>{t('connectorsPage.recent.file')}</th>
                    <th className={`${stickyTh} hidden md:table-cell`}>{t('connectorsPage.recent.template')}</th>
                    <th className={`${stickyTh} num`}>{t('connectorsPage.recent.imported')}</th>
                    <th className={`${stickyTh} num hidden sm:table-cell`}>{t('connectorsPage.recent.failed')}</th>
                    <th className={stickyTh}>{t('connectorsPage.recent.status')}</th>
                    <th className={stickyTh}>{t('connectorsPage.recent.when')}</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map(im => {
                    const tone = IMPORT_TONE[im.status] ?? { tone: 'neutral' as PillTone }
                    return (
                      <tr key={im.id}>
                        <td className="!text-[var(--text-primary)] font-mono text-caption max-w-[240px] truncate" title={im.file_name}>{im.file_name}</td>
                        <td className="hidden md:table-cell">{im.template_name ?? '—'}</td>
                        <td className="num !text-[var(--text-primary)]">{f.number(im.rows_imported)}<span className="!text-[var(--text-tertiary)]">/{f.number(im.rows_total)}</span></td>
                        <td className={`num hidden sm:table-cell ${im.rows_failed > 0 ? '!text-[var(--status-danger)] font-medium' : ''}`}>{f.number(im.rows_failed)}</td>
                        <td>
                          <StatusPill tone={tone.tone} dot={tone.dot}>{t(`connectorsPage.importStatus.${im.status}`, { defaultValue: im.status })}</StatusPill>
                        </td>
                        <td className="whitespace-nowrap">{f.dateTime(im.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </StateBoundary>
      </section>
    </div>
  )
}

function SectionHeading({ id, title, intro, count, level = 2 }: { id: string; title: string; intro?: string; count?: string; level?: 2 | 3 }) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <H id={id} className={`${level === 2 ? 'type-h3' : 'text-body font-semibold'} text-[var(--text-primary)]`}>{title}</H>
        {intro && <p className="text-small text-[var(--text-secondary)] mt-0.5 max-w-2xl">{intro}</p>}
      </div>
      {count && <span className="text-caption text-[var(--text-tertiary)] whitespace-nowrap tabular-nums">{count}</span>}
    </div>
  )
}

function ProviderIcon({ icon: Icon }: { icon: typeof Database }) {
  return (
    <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0" aria-hidden>
      <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
    </span>
  )
}

function Crumb({ onBack, backLabel, current }: { onBack: () => void; backLabel: string; current: string | null }) {
  return (
    <div className="flex items-center gap-2 mb-4 min-w-0">
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
        {backLabel}
      </Button>
      <span className="text-small text-[var(--text-tertiary)]" aria-hidden>/</span>
      <span className="text-small text-[var(--text-primary)] font-medium truncate">{current}</span>
    </div>
  )
}

/** Mainland China roadmap entry: never connectable, planned mappings on expand. */
function ComingSoonRow({ adapter: a, isZh }: { adapter: AdapterView; isZh: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const Icon = iconFor(a)
  const primary = (isZh && a.nameZh) || a.name
  const secondary = isZh ? (a.nameZh ? a.name : null) : a.nameZh
  const description = (isZh && a.descriptionZh) || a.description
  const mappings = a.fieldMappings ?? []
  const panelId = `cn-map-${a.id}`

  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <ProviderIcon icon={Icon} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h4 className="text-body font-semibold text-[var(--text-primary)]">{primary}</h4>
              {secondary && <span className="text-caption text-[var(--text-tertiary)]">{secondary}</span>}
              <span className="chip !h-5 !px-2">{t(`connectorsPage.categories.${a.category}`, { defaultValue: a.category })}</span>
            </div>
            <p className="text-small text-[var(--text-secondary)] mt-0.5 line-clamp-2 lg:line-clamp-1" title={description}>{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-12 lg:pl-0 flex-shrink-0">
          {mappings.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-controls={panelId}
              className="inline-flex items-center gap-1 h-10 lg:h-8 px-2 rounded-[var(--radius-md)] text-caption font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition-colors whitespace-nowrap"
            >
              {t('connectorsPage.cn.mappings', { count: mappings.length })}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
          )}
          <StatusPill tone="neutral">{t('connectorsPage.live.comingSoon')}</StatusPill>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t('connectorsPage.live.comingSoonHint')}
            className="inline-flex items-center h-10 lg:h-8 px-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-small font-medium text-[var(--text-tertiary)] cursor-not-allowed whitespace-nowrap"
          >
            {t('connectorsPage.live.notYetAvailable')}
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && mappings.length > 0 && (
          <motion.div
            id={panelId}
            key="map"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className="overflow-hidden sm:pl-12"
          >
            <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-x-auto">
              <table className="data-table">
                <caption className="sr-only">{t('connectorsPage.cn.mappingsCaption', { name: primary })}</caption>
                <thead>
                  <tr>
                    <th>{t('connectorsPage.cn.source')}</th>
                    <th>{t('connectorsPage.cn.target')}</th>
                    <th className="hidden md:table-cell">{t('connectorsPage.cn.notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map(m => (
                    <tr key={`${m.source}-${m.target}`}>
                      <td className="font-mono text-caption !text-[var(--text-primary)]">{m.source}</td>
                      <td className="font-mono text-caption whitespace-nowrap">{m.target}</td>
                      <td className="hidden md:table-cell text-caption">{m.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-caption text-[var(--text-tertiary)]">{t('connectorsPage.cn.mappingsNote')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
