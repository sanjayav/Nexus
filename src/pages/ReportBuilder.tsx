import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Package, CheckCircle, Download, Globe, Anchor, AlertCircle, ExternalLink, Shield, Archive, FileSpreadsheet } from 'lucide-react'
import { mockData } from '../data/mockData'
import clsx from 'clsx'

export default function ReportBuilder() {
  const { periodId } = useParams<{ periodId: string }>()
  const [selectedModules, setSelectedModules] = useState<string[]>(['GRI', 'MSX'])
  const [selectedPacks, setSelectedPacks] = useState<string[]>(['GRI', 'China ESG Pack'])
  const [reportMetadata, setReportMetadata] = useState({
    title: 'FY2025 Sustainability Report',
    languages: ['English', 'Arabic'],
    includeAnnexes: true,
  })

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const readinessChecks = {
    allApproved: mockData.modules.filter(m => selectedModules.includes(m.id)).every(m => m.state === 'Approved'),
    noCriticalGaps: true, // stub
    requiredEvidence: true, // stub
    integrityReady: true, // stub
  };

  const canPublish = selectedModules.length > 0 && readinessChecks.allApproved && readinessChecks.noCriticalGaps && readinessChecks.requiredEvidence;

  const selectedModulesData = mockData.modules.filter(m => selectedModules.includes(m.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Report Builder</h1>
          <p className="text-gray-400">Build and publish comprehensive reporting packs for {periodId || 'FY2025'}</p>
        </div>
      </div>

      {/* Readiness Checks (Gate 3) */}
      <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Gate 3 — Readiness Checks
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div className={clsx(
            'p-4 rounded-xl border',
            readinessChecks.allApproved ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
          )}>
            <div className="flex items-center gap-2 mb-1">
              {readinessChecks.allApproved ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={clsx(
                'text-sm font-medium',
                readinessChecks.allApproved ? 'text-emerald-300' : 'text-red-300'
              )}>
                All Approved
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {readinessChecks.allApproved ? 'All selected modules approved' : '2 modules pending approval'}
            </p>
          </div>
          <div className={clsx(
            'p-4 rounded-xl border',
            readinessChecks.noCriticalGaps ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
          )}>
            <div className="flex items-center gap-2 mb-1">
              {readinessChecks.noCriticalGaps ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={clsx(
                'text-sm font-medium',
                readinessChecks.noCriticalGaps ? 'text-emerald-300' : 'text-red-300'
              )}>
                No Critical Gaps
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {readinessChecks.noCriticalGaps ? 'All critical gaps resolved' : '3 critical gaps blocking'}
            </p>
          </div>
          <div className={clsx(
            'p-4 rounded-xl border',
            readinessChecks.requiredEvidence ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
          )}>
            <div className="flex items-center gap-2 mb-1">
              {readinessChecks.requiredEvidence ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={clsx(
                'text-sm font-medium',
                readinessChecks.requiredEvidence ? 'text-emerald-300' : 'text-red-300'
              )}>
                Evidence Attached
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {readinessChecks.requiredEvidence ? 'All required evidence linked' : '5 evidence files missing'}
            </p>
          </div>
          <div className={clsx(
            'p-4 rounded-xl border',
            readinessChecks.integrityReady ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'
          )}>
            <div className="flex items-center gap-2 mb-1">
              {readinessChecks.integrityReady ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span className={clsx(
                'text-sm font-medium',
                readinessChecks.integrityReady ? 'text-emerald-300' : 'text-amber-300'
              )}>
                Integrity Ready
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {readinessChecks.integrityReady ? 'Proof bundle ready' : 'Generating proofs...'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Select Framework Packs */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Select Framework Packs to Include</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['GRI', 'China ESG Pack', 'IFRS S1', 'IFRS S2', 'MSX', 'TCFD'].map((pack) => (
                <button
                  key={pack}
                  onClick={() => {
                    setSelectedPacks(prev =>
                      prev.includes(pack) ? prev.filter(p => p !== pack) : [...prev, pack]
                    )
                  }}
                  className={clsx(
                    'px-4 py-3 rounded-xl font-medium border transition-all text-left',
                    selectedPacks.includes(pack)
                      ? 'bg-accent/10 text-accent border-accent'
                      : 'bg-dark-bg border-dark-border text-gray-400 hover:border-gray-500'
                  )}
                >
                  {pack}
                </button>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Modules in Selected Packs</h3>
            <div className="space-y-3">
              {mockData.modules.map((module) => (
                <label
                  key={module.id}
                  className={clsx(
                    'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                    selectedModules.includes(module.id)
                      ? 'bg-accent/5 border-accent/30'
                      : 'bg-dark-bg border-dark-border hover:border-dark-border/50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(module.id)}
                    onChange={() => toggleModule(module.id)}
                    className="w-5 h-5 rounded border-dark-border bg-dark-bg checked:bg-accent checked:border-accent focus:ring-accent focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white">{module.title}</h3>
                      <div className={clsx(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        module.state === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        module.state === 'Published' ? 'bg-purple-500/10 text-purple-400' :
                        module.state === 'In Review' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-blue-500/10 text-blue-400'
                      )}>
                        {module.state}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{module.coverage}% coverage • {module.completedSections}/{module.questionnaireSections} sections</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Report Metadata */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Report Metadata</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Report Title</label>
                <input
                  type="text"
                  value={reportMetadata.title}
                  onChange={(e) => setReportMetadata({ ...reportMetadata, title: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Languages</label>
                <div className="flex gap-2">
                  {['English', 'Arabic', 'French'].map((lang) => (
                    <label key={lang} className="flex items-center gap-2 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg cursor-pointer hover:border-accent transition-colors">
                      <input
                        type="checkbox"
                        checked={reportMetadata.languages.includes(lang)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setReportMetadata({ ...reportMetadata, languages: [...reportMetadata.languages, lang] })
                          } else {
                            setReportMetadata({ ...reportMetadata, languages: reportMetadata.languages.filter(l => l !== lang) })
                          }
                        }}
                        className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-accent checked:border-accent"
                      />
                      <span className="text-sm text-white">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportMetadata.includeAnnexes}
                  onChange={(e) => setReportMetadata({ ...reportMetadata, includeAnnexes: e.target.checked })}
                  className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-accent checked:border-accent"
                />
                <span className="text-sm text-white">Include annexes (GRI Index, methodology notes)</span>
              </label>
            </div>
          </div>

          {/* Outputs */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Output Formats</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-blue-400" />
                  <h3 className="font-medium text-white">Report PDF</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Styled report with narrative, tables, and charts
                </p>
                <button className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <Download className="w-4 h-4" />
                  Generate PDF
                </button>
              </div>

              <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <ExternalLink className="w-6 h-6 text-purple-400" />
                  <h3 className="font-medium text-white">GRI Content Index</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Complete index table with page references
                </p>
                <button className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <Download className="w-4 h-4" />
                  Export Index
                </button>
              </div>

              <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-amber-400" />
                  <h3 className="font-medium text-white">Annexes + Methodology Notes</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Emission factors, boundary, calculation methods
                </p>
                <button className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <Download className="w-4 h-4" />
                  Generate Annexes
                </button>
              </div>

              <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Archive className="w-6 h-6 text-emerald-400" />
                  <h3 className="font-medium text-white">Evidence Pack ZIP</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  All linked evidence files for auditors
                </p>
                <button className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <Download className="w-4 h-4" />
                  Export Evidence Pack
                </button>
              </div>

              <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-6 h-6 text-accent" />
                  <h3 className="font-medium text-white">Integrity Receipts</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Proof bundle with CID, SHA, root anchors
                </p>
                <button className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <Download className="w-4 h-4" />
                  Download Receipts
                </button>
              </div>

              <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
                  <h3 className="font-medium text-white">Data Exports (JSON/CSV)</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Structured data for analysis and integration
                </p>
                <button className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Publish Panel */}
        <div className="space-y-6">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 sticky top-6">
            <h2 className="text-lg font-bold text-white mb-4">Publish Report</h2>
            
            {/* Publish Gate Checks */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                {selectedModules.length > 0 ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Modules Selected</div>
                  <div className="text-xs text-gray-400">{selectedModules.length} modules included</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {canPublish ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">All Approved</div>
                  <div className="text-xs text-gray-400">
                    {selectedModulesData.filter(m => m.state === 'Approved').length}/{selectedModules.length} approved
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">No Critical Findings</div>
                  <div className="text-xs text-gray-400">All validations passed</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Evidence Linked</div>
                  <div className="text-xs text-gray-400">All required evidence attached</div>
                </div>
              </div>
            </div>

            {/* Publish Actions */}
            <div className="space-y-3">
              <button
                disabled={!canPublish}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Anchor className="w-5 h-5" />
                Publish & Anchor Roll-up
              </button>

              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl font-medium hover:border-accent transition-colors"
              >
                <FileText className="w-5 h-5" />
                Preview Report
              </button>
            </div>

            {!canPublish && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400">
                    Some modules are not approved yet. Complete all approvals before publishing.
                  </p>
                </div>
              </div>
            )}

            {/* Publish Info */}
            <div className="mt-6 pt-6 border-t border-dark-border">
              <div className="text-xs text-gray-400 space-y-2">
                <div>
                  <span className="block mb-1">Index CID (after publish):</span>
                  <code className="text-accent">bafybei...</code>
                </div>
                <div>
                  <span className="block mb-1">Rollup Root (after anchor):</span>
                  <code className="text-emerald-400">0xA1...9F</code>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Modules Summary */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Selected Modules ({selectedModules.length})</h3>
            <div className="space-y-2">
              {selectedModulesData.map((module) => (
                <div key={module.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                  <span className="text-sm text-white">{module.title}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

