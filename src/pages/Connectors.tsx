import { useCallback, useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Plug, FileUp, AlertTriangle, Check, Loader2, ArrowLeft, Database, Cloud, Layers } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { Card, Button, Badge } from '../design-system'
import { connectors, type ConnectorTemplate, type ConnectorImportResult, type ConnectorImportSummary } from '../lib/api'

type SourceKey = 'sap_s4hana' | 'netsuite' | 'snowflake' | 'generic_csv'

const SOURCES: Array<{ key: SourceKey; name: string; subtitle: string; icon: typeof Database }> = [
  { key: 'sap_s4hana', name: 'SAP S/4HANA', subtitle: 'Cost-center energy + MM fuel POs', icon: Database },
  { key: 'netsuite',   name: 'NetSuite',    subtitle: 'Utility bills + Travel & expense', icon: Layers },
  { key: 'snowflake',  name: 'Snowflake',   subtitle: 'Generic activity-data passthrough', icon: Cloud },
  { key: 'generic_csv',name: 'Generic CSV', subtitle: 'Bring your own column mapping',     icon: FileUp },
]

interface ParsedCsv {
  fileName: string
  headers: string[]
  rows: Record<string, string>[]
}

export default function Connectors() {
  const [allTemplates, setAllTemplates] = useState<ConnectorTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [selectedSource, setSelectedSource] = useState<SourceKey | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ConnectorTemplate | null>(null)
  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ConnectorImportResult | null>(null)
  const [imports, setImports] = useState<ConnectorImportSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadImports = useCallback(async () => {
    try { setImports(await connectors.imports()) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingTemplates(true)
      try {
        const t = await connectors.templates()
        if (!cancelled) setAllTemplates(t)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load templates')
      } finally {
        if (!cancelled) setLoadingTemplates(false)
      }
    })()
    void loadImports()
    return () => { cancelled = true }
  }, [loadImports])

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
    try {
      const result = await connectors.import({
        templateId: selectedTemplate.id,
        fileName: csv.fileName,
        rows: csv.rows,
      })
      setImportResult(result)
      await loadImports()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const resetTemplate = () => {
    setSelectedTemplate(null)
    setCsv(null)
    setImportResult(null)
    setParseError(null)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Data ingestion"
        title="ERP connectors"
        subtitle="Pre-built CSV mapping templates for SAP S/4HANA, NetSuite, and Snowflake. Upload an export, preview the mapping, and ingest as draft activity data."
      />

      {error && (
        <Card variant="outlined" className="mb-4 border-[var(--accent-red-light)]">
          <div className="flex items-start gap-3 text-[13px] text-[var(--accent-red)]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        </Card>
      )}

      {!selectedSource && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {SOURCES.map(s => {
              const Icon = s.icon
              const count = allTemplates.filter(t => t.source === s.key).length
              return (
                <Card key={s.key} variant="paper" hover className="cursor-pointer" onClick={() => setSelectedSource(s.key)}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] text-[14px]">{s.name}</div>
                      <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">{s.subtitle}</div>
                      <div className="mt-3"><Badge variant="gray">{count} template{count === 1 ? '' : 's'}</Badge></div>
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
              All sources
            </Button>
            <span className="text-[13px] text-[var(--text-tertiary)]">/</span>
            <span className="text-[13px] text-[var(--text-primary)] font-medium">
              {SOURCES.find(s => s.key === selectedSource)?.name}
            </span>
          </div>
          {loadingTemplates ? (
            <div className="text-[13px] text-[var(--text-tertiary)] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
            </div>
          ) : sourceTemplates.length === 0 ? (
            <Card variant="paper"><div className="text-[13px] text-[var(--text-tertiary)]">No templates available for this source yet.</div></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sourceTemplates.map(t => (
                <Card key={t.id} variant="paper" hover className="cursor-pointer" onClick={() => setSelectedTemplate(t)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-semibold text-[var(--text-primary)] text-[14px]">{t.name}</div>
                    {t.scope !== null && <Badge variant="blue">Scope {t.scope}</Badge>}
                  </div>
                  <div className="text-[12.5px] text-[var(--text-secondary)] mb-3">{t.description}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Required columns</div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.required_columns.length === 0
                      ? <span className="text-[12px] text-[var(--text-tertiary)]">User-defined</span>
                      : t.required_columns.map(c => (
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
              Back to templates
            </Button>
            <span className="text-[13px] text-[var(--text-tertiary)]">/</span>
            <span className="text-[13px] text-[var(--text-primary)] font-medium">{selectedTemplate.name}</span>
          </div>

          <Card variant="paper" className="mb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">Upload CSV</div>
                <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">{selectedTemplate.description}</div>
              </div>
              {selectedTemplate.scope !== null && <Badge variant="blue">Scope {selectedTemplate.scope}</Badge>}
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
                  <div className="text-[12.5px] text-[var(--text-secondary)]">{csv.rows.length} row{csv.rows.length === 1 ? '' : 's'} parsed (preview of first 10)</div>
                </div>
                <Button variant="primary" onClick={handleImport} loading={importing} icon={<FileUp className="w-4 h-4" />}>
                  Import {csv.rows.length} rows
                </Button>
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
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">Import complete</div>
                  <div className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                    {importResult.imported} imported · {importResult.failed} failed · {importResult.total} total
                  </div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="overflow-x-auto max-h-64 overflow-y-auto border border-[var(--border-default)] rounded-md">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[var(--bg-secondary)]">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-[var(--text-secondary)] font-medium">Row</th>
                        <th className="px-2 py-1.5 text-left text-[var(--text-secondary)] font-medium">Error</th>
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
            <Plug className="w-4 h-4" /> Recent imports
          </h3>
          <Badge variant="gray">{imports.length}</Badge>
        </div>
        {imports.length === 0 ? (
          <EmptyState
            icon={Plug}
            title="No imports yet"
            body="Pick a source above and upload a CSV — Nexus will auto-map columns to the right disclosure fields."
            density="compact"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <th className="py-2 pr-3">File</th>
                  <th className="py-2 pr-3">Template</th>
                  <th className="py-2 pr-3">Imported</th>
                  <th className="py-2 pr-3">Failed</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">When</th>
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
                      <Badge variant={im.status === 'complete' ? 'green' : im.status === 'failed' ? 'red' : 'amber'}>{im.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{new Date(im.created_at).toLocaleString()}</td>
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
