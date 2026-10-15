import { useState } from 'react'
import { Eye, Link2, Search, UploadCloud, Tag, Calendar, AlertCircle, CheckCircle2, Shield, Database, FileSearch, ArrowUpRight } from 'lucide-react'
import clsx from 'clsx'
import { mockData } from '../data/mockData'
import { PageHeader, Card, CardHeader, Button, Badge, Tabs, EmptyState, inputClass, tableClass } from '../components/ui'
import { useFormat, useStrings } from '../i18n'
import { evidenceLibraryStrings } from '../i18n/pages/evidenceLibrary'

type StatusFilter = 'all' | 'linked' | 'orphaned' | 'expiring' | 'verified'

const fileType = (mime: string) => (mime.includes('spreadsheet') ? 'xlsx' : mime.includes('json') ? 'json' : 'pdf')

export default function EvidenceLibrary() {
  const s = useStrings(evidenceLibraryStrings)
  const f = useFormat()
  const { evidence } = mockData
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const term = searchTerm.trim().toLowerCase()
  const rows = evidence.filter(item => {
    if (term && !(item.id.toLowerCase().includes(term) || item.cid?.toLowerCase().includes(term) || 'emissions'.includes(term) || s.tags.emissions.includes(term))) return false
    if (statusFilter === 'linked') return !!item.linkedModule
    if (statusFilter === 'orphaned') return !item.linkedModule
    if (statusFilter === 'verified') return item.anchored
    if (statusFilter === 'expiring') return false
    return true
  })

  const selectClass = clsx(inputClass, 'lg:w-44 pr-8 cursor-pointer')

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={s.description}
      />

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
          <div className="mt-6 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
            <div className="pr-3">
              <div className="text-xl font-semibold text-zinc-900 tabular inline-flex items-center gap-1">
                {f.percent(67)} <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.reuseRate}</div>
            </div>
            <div className="px-3">
              <div className="text-xl font-semibold text-amber-600 tabular">{f.number(8)}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.orphaned}</div>
            </div>
            <div className="pl-3">
              <div className="text-xl font-semibold text-zinc-900 tabular">{f.percent(94)}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.coverage}</div>
            </div>
          </div>
        </Card>

        {/* Upload */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader icon={UploadCloud} title={s.uploadTitle} description={s.uploadDesc} className="mb-0" />
          </div>
          <Button variant="primary" className="w-full mt-5" icon={UploadCloud}>{s.bulkUpload}</Button>
        </Card>

        {/* Expiring alerts */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-zinc-500">{s.alerts}</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-3 text-[28px] font-semibold text-zinc-900 tabular leading-none">2</div>
            <p className="mt-2 text-[13px] text-zinc-500">{s.expiringSoon}</p>
          </div>
          <Button className="w-full mt-5" icon={Calendar}>{s.viewRenewals}</Button>
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
            <select className={selectClass} aria-label={s.moduleFilter}>
              <option>{s.allModules}</option>
              <option>GRI</option>
              <option>CSRD</option>
              <option>IFRS S1</option>
            </select>
            <select className={selectClass} aria-label={s.typeFilter}>
              <option>{s.allTypes}</option>
              <option>xlsx</option>
              <option>json</option>
              <option>pdf</option>
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
            action={<Button size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('all') }}>{s.clearFilters}</Button>}
          />
        ) : (
          <div className={tableClass.wrap}>
            <table className={tableClass.table}>
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
                {rows.map(item => (
                  <tr key={item.id} className={clsx(tableClass.tr, 'group')}>
                    <td className={tableClass.td}>
                      <div className="font-medium text-zinc-900 whitespace-nowrap">{item.id}</div>
                      <div className="font-mono text-xs text-zinc-400 mt-0.5 truncate max-w-[180px]" title={item.cid}>
                        CID: {item.cid?.slice(0, 12)}…
                      </div>
                    </td>
                    <td className={tableClass.td}>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge>GRI 305-1</Badge>
                        {item.id === 'EV-20251201-GRI305-003' && <Badge>IFRS S2</Badge>}
                      </div>
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
                        {[
                          { label: s.preview, icon: Eye },
                          { label: s.tagMap, icon: Tag },
                          { label: s.verifyProof, icon: Shield },
                        ].map(({ label, icon: Icon }) => (
                          <button
                            key={label}
                            type="button"
                            title={label}
                            aria-label={label}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </td>
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
