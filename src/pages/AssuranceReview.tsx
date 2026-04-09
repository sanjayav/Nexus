import { useState, useMemo } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronRight,
  FileText,
  Link2,
  Shield,
} from 'lucide-react'
import { assuranceItems, AssuranceItem } from '../data/moduleData'

type StatusFilter = 'all' | 'not-started' | 'in-review' | 'findings' | 'cleared'

const STATUS_CONFIG = {
  'not-started': { label: 'Not Started', bg: 'bg-dark-700', text: 'text-dark-300', border: 'border-dark-500' },
  'in-review': { label: 'In Review', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  'findings-raised': { label: 'Findings Raised', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  'cleared': { label: 'Cleared', bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/20' },
  'ready-to-publish': { label: 'Ready to Publish', bg: 'bg-accent-500/15', text: 'text-accent-400', border: 'border-accent-500/20' },
}

export default function AssuranceReview() {
  const [items, setItems] = useState<AssuranceItem[]>(assuranceItems)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const pipelineCounts = useMemo(() => {
    const counts = { 'not-started': 0, 'in-review': 0, 'findings-raised': 0, 'cleared': 0, 'ready-to-publish': 0 }
    items.forEach(item => { counts[item.status]++ })
    return counts
  }, [items])

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return items
    if (statusFilter === 'findings') return items.filter(i => i.status === 'findings-raised')
    return items.filter(i => i.status === statusFilter)
  }, [items, statusFilter])

  const handleStartReview = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'in-review' as const } : item
    ))
    showToast('Review started successfully')
  }

  const handleClearForPublishing = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'ready-to-publish' as const } : item
    ))
    showToast('Item cleared for publishing')
  }

  const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'not-started', label: 'Not Started' },
    { id: 'in-review', label: 'In Review' },
    { id: 'findings', label: 'Findings' },
    { id: 'cleared', label: 'Cleared' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-500/15 text-teal-400 border border-teal-500/20 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
            </div>
            Assurance Review
          </h1>
          <p className="text-sm text-dark-300 mt-2">
            Third-party validation pipeline. Assurance teams review, raise findings, and clear data packages before they are published to frameworks.
          </p>
        </div>
        <span className="text-xs text-dark-400 bg-dark-800 border border-dark-600 px-3 py-2 rounded-xl font-mono">
          Reporting Year: FY 2026
        </span>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {([
          { key: 'not-started' as const, label: 'Not Started', color: 'dark', borderColor: 'border-dark-600', textColor: 'text-white' },
          { key: 'in-review' as const, label: 'In Review', color: 'blue', borderColor: 'border-blue-500/20', textColor: 'text-blue-400' },
          { key: 'findings-raised' as const, label: 'Findings Raised', color: 'amber', borderColor: 'border-amber-500/20', textColor: 'text-amber-400' },
          { key: 'cleared' as const, label: 'Cleared', color: 'teal', borderColor: 'border-teal-500/20', textColor: 'text-teal-400' },
          { key: 'ready-to-publish' as const, label: 'Ready to Publish', color: 'accent', borderColor: 'border-accent-500/20', textColor: 'text-accent-400' },
        ]).map(stage => (
          <div key={stage.key} className={`bg-dark-800 rounded-2xl border ${stage.borderColor} p-4`}>
            <p className={`text-[10px] ${stage.key === 'not-started' ? 'text-dark-400' : stage.textColor} uppercase tracking-wider font-semibold`}>
              {stage.label}
            </p>
            <p className={`text-3xl font-heading font-bold ${stage.textColor} mt-1`}>
              {pipelineCounts[stage.key]}
            </p>
            <p className="text-xs text-dark-400 mt-0.5">data packages</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Main Table */}
      <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-heading font-semibold text-white">Assurance Pipeline</h2>
            <span className="bg-blue-500/15 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/20">
              {items.length} total
            </span>
          </div>
          <div className="flex rounded-lg border border-dark-500 overflow-hidden">
            {filterTabs.map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f.id
                    ? 'bg-accent-500/15 text-accent-400'
                    : 'bg-dark-700 text-dark-400 hover:text-dark-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Header */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-600">
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider w-8" />
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Data Package</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Scope</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Entity</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Period</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Reviewer</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Status</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Findings</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, i) => {
                const isExpanded = expandedRow === item.id
                const statusCfg = STATUS_CONFIG[item.status]

                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={i}
                    isExpanded={isExpanded}
                    statusCfg={statusCfg}
                    onToggle={() => setExpandedRow(isExpanded ? null : item.id)}
                    onStartReview={() => handleStartReview(item.id)}
                    onClearForPublishing={() => handleClearForPublishing(item.id)}
                  />
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-10">
            <CheckCircle2 className="w-10 h-10 text-teal-400/50 mx-auto mb-3" />
            <p className="text-sm text-dark-300">No items match the current filter.</p>
          </div>
        )}
      </div>

      {/* Methodology Footer */}
      <div className="bg-dark-800 rounded-2xl border border-dark-600 shadow-card p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-heading font-semibold text-white mb-1">Assurance Process</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div className="text-xs text-dark-300 leading-relaxed">
                <p className="font-semibold text-dark-200 mb-1">Data Integrity Check</p>
                <p>Blockchain-anchored records are verified against source submissions. Any hash mismatch triggers an automatic finding.</p>
              </div>
              <div className="text-xs text-dark-300 leading-relaxed">
                <p className="font-semibold text-dark-200 mb-1">Third-Party Review</p>
                <p>LRQA Thailand or Internal Audit reviews each data package against GHG Protocol, ISO 14064, and framework-specific requirements.</p>
              </div>
              <div className="text-xs text-dark-300 leading-relaxed">
                <p className="font-semibold text-dark-200 mb-1">Clear & Publish</p>
                <p>Once all findings are resolved, cleared packages are released to the Report Publishing module for final disclosure generation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ItemRow({
  item,
  index,
  isExpanded,
  statusCfg,
  onToggle,
  onStartReview,
  onClearForPublishing,
}: {
  item: AssuranceItem
  index: number
  isExpanded: boolean
  statusCfg: { label: string; bg: string; text: string; border: string }
  onToggle: () => void
  onStartReview: () => void
  onClearForPublishing: () => void
}) {
  return (
    <>
      <tr
        className={`${index % 2 === 0 ? 'bg-dark-750' : ''} hover:bg-dark-700 transition-colors cursor-pointer`}
        onClick={onToggle}
      >
        <td className="py-3 px-4">
          {isExpanded
            ? <ChevronDown className="w-4 h-4 text-dark-400" />
            : <ChevronRight className="w-4 h-4 text-dark-400" />
          }
        </td>
        <td className="py-3 px-4 text-dark-200 font-medium">{item.dataPackage}</td>
        <td className="py-3 px-4 text-dark-300 text-xs">{item.scope}</td>
        <td className="py-3 px-4 text-dark-300 text-xs">{item.entity}</td>
        <td className="py-3 px-4 text-dark-400 text-xs font-mono">{item.period}</td>
        <td className="py-3 px-4 text-dark-300 text-xs">{item.reviewer}</td>
        <td className="py-3 px-4 text-center">
          <span className={`inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}>
            {statusCfg.label}
          </span>
        </td>
        <td className="py-3 px-4 text-center">
          {item.findings.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
              <AlertTriangle className="w-3 h-3" />
              {item.findings.length}
            </span>
          ) : (
            <span className="text-dark-500 text-xs">0</span>
          )}
        </td>
        <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
          {item.status === 'not-started' && (
            <button
              onClick={onStartReview}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-semibold rounded-lg border border-blue-500/20 transition-colors ml-auto"
            >
              <Eye className="w-3 h-3" />
              Start Review
            </button>
          )}
          {item.status === 'cleared' && (
            <button
              onClick={onClearForPublishing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-500/15 hover:bg-accent-500/25 text-accent-400 text-xs font-semibold rounded-lg border border-accent-500/20 transition-colors ml-auto"
            >
              <CheckCircle2 className="w-3 h-3" />
              Clear for Publishing
            </button>
          )}
        </td>
      </tr>

      {/* Expanded Row */}
      {isExpanded && (
        <tr>
          <td colSpan={9} className="bg-dark-850 border-t border-dark-600 p-5">
            <div className="space-y-4">
              {/* Findings */}
              {item.findings.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Findings ({item.findings.length})
                  </h4>
                  <div className="space-y-2">
                    {item.findings.map(finding => (
                      <div key={finding.id} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <span className={`inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-0.5 ${
                            finding.severity === 'major'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          }`}>
                            {finding.severity}
                          </span>
                          <div className="flex-1">
                            <p className="text-xs text-dark-300 leading-relaxed">{finding.description}</p>
                            {finding.resolution && (
                              <div className="mt-2 bg-teal-500/10 border border-teal-500/20 rounded-lg p-2.5">
                                <p className="text-[10px] font-semibold text-teal-400 mb-0.5">Resolution</p>
                                <p className="text-xs text-teal-300/80">{finding.resolution}</p>
                                {finding.resolvedDate && (
                                  <p className="text-[10px] text-dark-400 mt-1">Resolved: {finding.resolvedDate}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {item.linkedAnomalyIds.length > 0 && (
                  <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      Linked Anomalies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {item.linkedAnomalyIds.map(aid => (
                        <span key={aid} className="text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg">
                          {aid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {item.linkedBlockchainIds.length > 0 && (
                  <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5 text-blue-400" />
                      Blockchain Anchors
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {item.linkedBlockchainIds.map(bid => (
                        <span key={bid} className="text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg">
                          {bid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {item.findings.length === 0 && item.linkedAnomalyIds.length === 0 && item.linkedBlockchainIds.length === 0 && (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                  <p className="text-xs text-dark-400">No findings, anomalies, or blockchain anchors linked yet.</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
