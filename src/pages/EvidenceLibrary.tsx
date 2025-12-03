import { useState } from 'react'
import { ExternalLink, Eye, Link2, Search, Filter, UploadCloud, Tag, Calendar, AlertCircle, CheckCircle2, Shield } from 'lucide-react'
import { mockData } from '../data/mockData'

export default function EvidenceLibrary() {
  const { evidence } = mockData
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Evidence Vault</h1>
          <p className="text-sm text-gray-400">
            Central library for all evidence files with integrity tracking, expiry alerts, and reuse suggestions
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors">
          <UploadCloud className="w-4 h-4" />
          Bulk Upload
        </button>
      </div>

      {/* Side Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="text-sm text-gray-400 mb-2">Evidence Re-use Rate</div>
          <div className="text-3xl font-bold">67%</div>
          <div className="text-xs text-emerald-400 mt-2">↗ +12% from last period</div>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="text-sm text-gray-400 mb-2">Orphaned Evidence</div>
          <div className="text-3xl font-bold">8</div>
          <div className="text-xs text-amber-400 mt-2">Items not linked to submissions</div>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="text-sm text-gray-400 mb-2">Certificates Expiring</div>
          <div className="text-3xl font-bold">2</div>
          <div className="text-xs text-rose-400 mt-2">Within 30 days</div>
        </div>
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="text-sm text-gray-400 mb-2">Evidence Coverage</div>
          <div className="text-3xl font-bold">94%</div>
          <div className="text-xs text-gray-400 mt-2">Disclosures with evidence</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Evidence ID, disclosure, CID, SHA, uploader, or expiry date..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <select className="px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option>All Modules</option>
            <option>GRI</option>
            <option>MSX</option>
            <option>IFRS S1</option>
            <option>IFRS S2</option>
          </select>
          <select className="px-4 py-2 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option>All Types</option>
            <option>xlsx</option>
            <option>json</option>
            <option>pdf</option>
            <option>csv</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === 'all'
                ? 'border-accent text-accent bg-accent/10'
                : 'border-dark-border text-gray-400 hover:border-gray-500'
            } transition-colors`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('linked')}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === 'linked'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                : 'border-dark-border text-gray-400 hover:border-gray-500'
            } transition-colors flex items-center gap-1`}
          >
            <Link2 className="w-3 h-3" />
            Linked
          </button>
          <button
            onClick={() => setStatusFilter('orphaned')}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === 'orphaned'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                : 'border-dark-border text-gray-400 hover:border-gray-500'
            } transition-colors flex items-center gap-1`}
          >
            <AlertCircle className="w-3 h-3" />
            Orphaned
          </button>
          <button
            onClick={() => setStatusFilter('expiring')}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === 'expiring'
                ? 'border-rose-500 text-rose-300 bg-rose-500/10'
                : 'border-dark-border text-gray-400 hover:border-gray-500'
            } transition-colors flex items-center gap-1`}
          >
            <Calendar className="w-3 h-3" />
            Expiring (&lt; 30d)
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1.5 rounded-full border ${
              statusFilter === 'verified'
                ? 'border-accent text-accent bg-accent/10'
                : 'border-dark-border text-gray-400 hover:border-gray-500'
            } transition-colors flex items-center gap-1`}
          >
            <Shield className="w-3 h-3" />
            Integrity Verified
          </button>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border bg-dark-bg text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 text-gray-400">
                  Evidence ID
                </th>
                <th className="text-left px-4 py-3 text-gray-400">Linked To</th>
                <th className="text-left px-4 py-3 text-gray-400">Type</th>
                <th className="text-left px-4 py-3 text-gray-400">Tags</th>
                <th className="text-left px-4 py-3 text-gray-400">Expiry</th>
                <th className="text-left px-4 py-3 text-gray-400">Integrity</th>
                <th className="text-left px-4 py-3 text-gray-400">Uploader</th>
                <th className="text-left px-4 py-3 text-gray-400">Added</th>
                <th className="text-left px-4 py-3 text-gray-400">Reuse</th>
                <th className="text-left px-4 py-3 text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <tr key={item.id} className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-sm text-white">{item.id}</div>
                    <div className="font-mono text-xs text-gray-500 mt-0.5 truncate max-w-[180px]" title={item.cid}>
                      CID: {item.cid?.slice(0, 12)}...
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded text-[11px]">
                        GRI 305-1
                      </span>
                      {item.id === 'EV-20251201-GRI305-003' && (
                        <>
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded text-[11px]">
                            GRI 305-2
                          </span>
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded text-[11px]">
                            IFRS S2
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-500/10 border border-gray-500/30 text-gray-300 font-mono">
                      {item.mime.includes('spreadsheet')
                        ? 'xlsx'
                        : item.mime.includes('json')
                        ? 'json'
                        : 'pdf'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 border border-purple-500/30 text-purple-300">
                        <Tag className="w-3 h-3 inline mr-1" />
                        emissions
                      </span>
                      {item.id === 'EV-20251201-GRI305-003' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 border border-purple-500/30 text-purple-300">
                          energy
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.id === 'EV-20251201-GRI305-001' ? (
                      <span className="text-xs text-rose-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        2025-12-15 (14d)
                      </span>
                    ) : item.id === 'EV-20251201-GRI305-002' ? (
                      <span className="text-xs text-amber-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        2026-03-01
                    </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.anchored ? (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-500/10 border border-gray-500/30 text-gray-400">
                        <AlertCircle className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-300">{item.addedBy.slice(0, 20)}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-400">
                      {new Date(item.addedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.id === 'EV-20251201-GRI305-003' ? (
                      <div className="text-xs text-emerald-400 font-medium">
                        Used in 3 disclosures
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">—</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded-full hover:bg-dark-bg border border-transparent hover:border-accent transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4 text-gray-400 hover:text-accent" />
                      </button>
                      <button
                        className="p-1.5 rounded-full hover:bg-dark-bg border border-transparent hover:border-accent transition-colors"
                        title="Tag & Map"
                      >
                        <Tag className="w-4 h-4 text-gray-400 hover:text-accent" />
                      </button>
                      <button
                        className="p-1.5 rounded-full hover:bg-dark-bg border border-transparent hover:border-accent transition-colors"
                        title="View Proof"
                      >
                        <Shield className="w-4 h-4 text-gray-400 hover:text-accent" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

