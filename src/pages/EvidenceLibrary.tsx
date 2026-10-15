import { Fragment, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Link2, Search, UploadCloud, Tag, Calendar, AlertCircle, CheckCircle2, Shield, Database, FileSearch, ArrowUpRight, Server } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader, Card, CardHeader, Button, Badge, Tabs, EmptyState, inputClass, tableClass } from '../components/ui'
import { fmt, useFormat, useStrings } from '../i18n'
import { evidenceLibraryStrings } from '../i18n/pages/evidenceLibrary'
import { moduleIdOf, useFrameworkLabels } from '../i18n/pages/moduleCatalog'
import { useL10n, useMockData, useWorkspace } from '../workspace/WorkspaceContext'
import { useToast } from '../components/useToast'

type StatusFilter = 'all' | 'linked' | 'orphaned' | 'expiring' | 'verified'
type FileType = 'xlsx' | 'json' | 'pdf'

const fileType = (mime: string): FileType => (mime.includes('spreadsheet') ? 'xlsx' : mime.includes('json') ? 'json' : 'pdf')

export default function EvidenceLibrary() {
  const s = useStrings(evidenceLibraryStrings)
  const f = useFormat()
  const fw = useFrameworkLabels()
  const l10n = useL10n()
  const navigate = useNavigate()
  const mockData = useMockData()
  const { region } = useWorkspace()
  const { toast, show } = useToast()
  const { evidence } = mockData
  const uploadRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | FileType>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const network = l10n(region.chain.network)
  const storage = l10n(region.storage.provider)

  // Framework options: tenant modules in the region's display order (unknown ids last).
  const moduleOptions = useMemo(() => {
    const order = (id: string) => {
      const i = region.frameworks.indexOf(id)
      return i === -1 ? Number.MAX_SAFE_INTEGER : i
    }
    return [...mockData.modules].sort((a, b) => order(a.id) - order(b.id)).map(m => ({ id: m.id, label: fw.short(m.id, m.title) }))
  }, [mockData, region.frameworks, fw])

  const term = searchTerm.trim().toLowerCase()
  const rows = evidence.filter(item => {
    const linked = item.linkedModule ? moduleIdOf(item.linkedModule) : null
    if (
      term &&
      !(
        item.id.toLowerCase().includes(term) ||
        item.cid?.toLowerCase().includes(term) ||
        item.sha256?.toLowerCase().includes(term) ||
        (linked && fw.short(linked).toLowerCase().includes(term)) ||
        s.tags.emissions.toLowerCase().includes(term)
      )
    )
      return false
    if (moduleFilter !== 'all' && linked !== moduleFilter) return false
    if (typeFilter !== 'all' && fileType(item.mime) !== typeFilter) return false
    if (statusFilter === 'linked') return !!linked
    if (statusFilter === 'orphaned') return !linked
    if (statusFilter === 'verified') return item.anchored
    if (statusFilter === 'expiring') return false
    return true
  })

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setModuleFilter('all')
    setTypeFilter('all')
  }

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    show(fmt(s.uploadQueued, { count: files.length, storage }))
    if (uploadRef.current) uploadRef.current.value = ''
  }

  const selectClass = clsx(inputClass, 'lg:w-44 pr-8 cursor-pointer')

  return (
    <div className="space-y-6">
      {toast}
      <PageHeader title={s.title} description={fmt(s.description, { network })} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Vault summary */}
        <Card className="md:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-zinc-500 inline-flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-400" /> {s.vault}
            </span>
            <Badge tone="success" icon={CheckCircle2}>{s.verified}</Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[40px] font-semibold tracking-[-0.03em] text-zinc-900 tabular leading-none">{f.number(142)}</span>
            <span className="text-sm text-zinc-500">{s.totalArtifacts}</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500 inline-flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {fmt(s.storageLine, { storage, mode: l10n(region.storage.mode), network })}
          </p>
          <div className="mt-6 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
            <div className="pr-3">
              <div className="text-xl font-semibold text-zinc-900 tabular inline-flex items-center gap-1">
                {f.percent(67)} <ArrowUpRight className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.reuseRate}</div>
            </div>
            <button type="button" className="px-3 text-left group" onClick={() => setStatusFilter('orphaned')}>
              <div className="text-xl font-semibold text-amber-600 tabular">{f.number(8)}</div>
              <div className="text-xs text-zinc-500 mt-0.5 group-hover:text-zinc-900 transition-colors">{s.orphaned}</div>
            </button>
            <div className="pl-3">
              <div className="text-xl font-semibold text-zinc-900 tabular">{f.percent(94)}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.coverage}</div>
            </div>
          </div>
        </Card>

        {/* Upload */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader icon={UploadCloud} title={s.uploadTitle} description={fmt(s.uploadDesc, { storage })} className="mb-0" />
          </div>
          <input ref={uploadRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={e => onFiles(e.target.files)} />
          <Button variant="primary" className="w-full mt-5" icon={UploadCloud} onClick={() => uploadRef.current?.click()}>
            {s.bulkUpload}
          </Button>
        </Card>

        {/* Expiring alerts */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-zinc-500">{s.alerts}</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-3 text-[28px] font-semibold text-zinc-900 tabular leading-none">{f.number(2)}</div>
            <p className="mt-2 text-[13px] text-zinc-500">{s.expiringSoon}</p>
          </div>
          <Button className="w-full mt-5" icon={Calendar} onClick={() => setStatusFilter('expiring')}>{s.viewRenewals}</Button>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={s.searchPlaceholder}
              aria-label={s.searchLabel}
              className={clsx(inputClass, 'pl-9')}
            />
          </div>
          <div className="grid grid-cols-2 lg:flex gap-3">
            <select className={selectClass} aria-label={s.moduleFilter} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
              <option value="all">{s.allModules}</option>
              {moduleOptions.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <select className={selectClass} aria-label={s.typeFilter} value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | FileType)}>
              <option value="all">{s.allTypes}</option>
              <option value="xlsx">{s.fileTypes.xlsx}</option>
              <option value="json">{s.fileTypes.json}</option>
              <option value="pdf">{s.fileTypes.pdf}</option>
            </select>
          </div>
        </div>

        <Tabs<StatusFilter>
          className="mb-4"
          value={statusFilter}
          onChange={setStatusFilter}
          items={[
            { value: 'all', label: s.statusTabs.all },
            { value: 'linked', label: <><Link2 className="w-3.5 h-3.5" />{s.statusTabs.linked}</> },
            { value: 'orphaned', label: <><AlertCircle className="w-3.5 h-3.5" />{s.statusTabs.orphaned}</> },
            { value: 'expiring', label: <><Calendar className="w-3.5 h-3.5" />{s.statusTabs.expiring}</> },
            { value: 'verified', label: <><Shield className="w-3.5 h-3.5" />{s.statusTabs.verified}</> },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title={s.emptyTitle}
            description={s.emptyDesc}
            action={<Button size="sm" onClick={clearFilters}>{s.clearFilters}</Button>}
          />
        ) : (
          <div className={tableClass.wrap}>
            <table className={clsx(tableClass.table, 'min-w-[760px]')}>
              <thead>
                <tr>
                  <th className={tableClass.th}>{s.colId}</th>
                  <th className={tableClass.th}>{s.colLinked}</th>
                  <th className={tableClass.th}>{s.colType}</th>
                  <th className={tableClass.th}>{s.colTags}</th>
                  <th className={tableClass.th}>{s.colIntegrity}</th>
                  <th className={clsx(tableClass.th, 'text-right')}>{s.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(item => {
                  const linked = item.linkedModule ? moduleIdOf(item.linkedModule) : null
                  const isOpen = expanded === item.id
                  const actions = [
                    { label: isOpen ? s.hidePreview : s.preview, icon: Eye, onClick: () => setExpanded(isOpen ? null : item.id), pressed: isOpen },
                    {
                      label: s.tagMap,
                      icon: Tag,
                      onClick: () => navigate(linked ? `/modules/${encodeURIComponent(linked)}/questionnaire` : '/modules'),
                    },
                    { label: s.verifyProof, icon: Shield, onClick: () => navigate('/verify') },
                  ]
                  return (
                    <Fragment key={item.id}>
                      <tr className={clsx(tableClass.tr, 'group', isOpen && 'bg-zinc-50/70')}>
                        <td className={tableClass.td}>
                          <div className="font-medium text-zinc-900 whitespace-nowrap">{item.id}</div>
                          <div className="font-mono text-xs text-zinc-400 mt-0.5 truncate max-w-[180px]" title={item.cid}>
                            CID: {item.cid?.slice(0, 12)}…
                          </div>
                        </td>
                        <td className={tableClass.td}>
                          {linked ? (
                            <Badge>
                              <span title={fw.title(linked)}>{fw.short(linked)}</span>
                            </Badge>
                          ) : (
                            <Badge tone="warning" dot>{s.statusTabs.orphaned}</Badge>
                          )}
                        </td>
                        <td className={tableClass.td}>
                          <span className="font-mono text-xs text-zinc-600 bg-zinc-100 rounded px-1.5 py-0.5">{fileType(item.mime)}</span>
                        </td>
                        <td className={tableClass.td}>
                          <span className="inline-flex items-center gap-1 text-[13px] text-zinc-600 whitespace-nowrap">
                            <Tag className="w-3.5 h-3.5 text-zinc-400" /> {s.tags.emissions}
                          </span>
                        </td>
                        <td className={tableClass.td}>
                          {item.anchored ? (
                            <Badge tone="success" icon={CheckCircle2}>{s.integrity.verified}</Badge>
                          ) : (
                            <Badge tone="warning" icon={AlertCircle}>{s.integrity.pending}</Badge>
                          )}
                        </td>
                        <td className={clsx(tableClass.td, 'text-right')}>
                          <div className="flex items-center justify-end gap-0.5">
                            {actions.map(({ label, icon: Icon, onClick, pressed }) => (
                              <button
                                key={label}
                                type="button"
                                title={label}
                                aria-label={label}
                                aria-pressed={pressed}
                                onClick={onClick}
                                className={clsx(
                                  'w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors',
                                  pressed && 'bg-zinc-100 text-zinc-900',
                                )}
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-zinc-50/70">
                          <td colSpan={6} className="px-5 sm:px-6 pb-4 pt-1 border-b border-line">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                              <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-zinc-500">{s.detail.sha256}</dt>
                                <dd className="font-mono text-xs text-zinc-700 break-all mt-0.5">{item.sha256}</dd>
                              </div>
                              <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-zinc-500">{s.detail.cid}</dt>
                                <dd className="font-mono text-xs text-zinc-700 break-all mt-0.5">{item.cid}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium text-zinc-500">{s.detail.addedBy}</dt>
                                <dd className="font-mono text-xs text-zinc-700 mt-0.5 break-all">{item.addedBy}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium text-zinc-500">{s.detail.addedAt}</dt>
                                <dd className="text-zinc-700 mt-0.5 tabular">{f.date(item.addedAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium text-zinc-500">{s.detail.storage}</dt>
                                <dd className="text-zinc-700 mt-0.5">{storage}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium text-zinc-500">{s.detail.anchor}</dt>
                                <dd className="text-zinc-700 mt-0.5">
                                  {item.anchored ? fmt(s.detail.anchoredOn, { network }) : s.detail.notAnchored}
                                </dd>
                              </div>
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
