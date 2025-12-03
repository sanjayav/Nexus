import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, XCircle, AlertTriangle, FileText, Shield, ExternalLink, Clock, User, MessageSquare } from 'lucide-react'
import { mockData } from '../data/mockData'
import clsx from 'clsx'

export default function ModuleReview() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'diffs' | 'findings' | 'proofs' | 'approvals'>('findings')
  const [approvalDecision, setApprovalDecision] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')

  const module = mockData.modules.find(m => m.id === moduleId)
  const versions = mockData.submissionVersions.filter(v => v.moduleId === moduleId)
  const currentVersion = versions[0]
  const previousVersion = versions[1]

  if (!module) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Module not found</h2>
        <button
          onClick={() => navigate('/modules')}
          className="text-accent hover:underline"
        >
          Back to modules
        </button>
      </div>
    )
  }

  // Mock validation findings
  const findings = [
    {
      severity: 'error',
      rule: 'GRI-2-27-REQ',
      message: 'Missing evidence attachment for compliance statement',
      field: 'GRI 2-27',
      suggestion: 'Upload compliance documentation or certificate',
    },
    {
      severity: 'warning',
      rule: 'GRI-3-3-MATERIAL',
      message: 'Material topic without complete DMA',
      field: 'GRI 3-3',
      suggestion: 'Complete all DMA sections for material topics',
    },
    {
      severity: 'info',
      rule: 'BEST-PRACTICE',
      message: 'Consider adding quantitative targets',
      field: 'GRI 2-22',
      suggestion: 'Enhance disclosure with measurable targets',
    },
  ]

  // Mock approval history
  const approvalHistory = [
    {
      did: 'did:ethr:0x1234...5678',
      role: 'Reviewer',
      decision: 'approved',
      comment: 'Data quality looks good, minor formatting issues fixed',
      timestamp: '2024-11-10T14:30:00Z',
      vcHash: '0xabcd...ef01',
    },
    {
      did: 'did:ethr:0xabcd...ef01',
      role: 'Analyst',
      decision: 'submitted',
      comment: 'Ready for review',
      timestamp: '2024-11-10T10:15:00Z',
      vcHash: '0x1234...5678',
    },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
      case 'info':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-5 h-5" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />
      case 'info':
        return <CheckCircle className="w-5 h-5" />
      default:
        return null
    }
  }

  const calculateSLA = () => {
    const reviewStart = new Date('2024-11-10T14:30:00Z')
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - reviewStart.getTime()) / (1000 * 60 * 60 * 24))
    return { days: diffInDays, overdue: diffInDays > 5 }
  }

  const sla = calculateSLA()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Review: {module.title}</h1>
          <p className="text-gray-400">Version {currentVersion?.version} • Submission {currentVersion?.submissionId}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={clsx(
            'px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-2',
            sla.overdue ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
          )}>
            <Clock className="w-4 h-4" />
            In review for {sla.days}d {sla.overdue && '(Overdue)'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-border">
        {[
          { id: 'findings', label: 'Findings', count: findings.length },
          { id: 'diffs', label: 'Validation Diffs', count: previousVersion ? 12 : 0 },
          { id: 'proofs', label: 'Proofs', count: 1 },
          { id: 'approvals', label: 'Approvals', count: approvalHistory.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              'px-4 py-3 font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-accent'
                : 'text-gray-400 hover:text-white'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={clsx(
                'ml-2 px-2 py-0.5 rounded text-xs',
                activeTab === tab.id ? 'bg-accent/20 text-accent' : 'bg-dark-surface text-gray-400'
              )}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Findings Tab */}
          {activeTab === 'findings' && (
            <>
              {findings.map((finding, index) => (
                <div
                  key={index}
                  className="bg-dark-surface border border-dark-border rounded-xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className={clsx('p-2 rounded-lg', getSeverityColor(finding.severity))}>
                      {getSeverityIcon(finding.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-white mb-1">{finding.message}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>Rule: {finding.rule}</span>
                            <span>•</span>
                            <span>Field: {finding.field}</span>
                          </div>
                        </div>
                        <div className={clsx('px-2 py-1 rounded text-xs font-medium border', getSeverityColor(finding.severity))}>
                          {finding.severity}
                        </div>
                      </div>
                      <div className="bg-dark-bg rounded-lg p-3 mt-3">
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-accent">Suggestion: </span>
                          {finding.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Diffs Tab */}
          {activeTab === 'diffs' && (
            <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">Changes from {previousVersion?.version}</h3>
              <div className="space-y-3">
                <div className="bg-dark-bg rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-white">GRI 2-1: Organization name</span>
                    <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded">Modified</span>
                  </div>
                  <div className="space-y-1 text-sm font-mono">
                    <div className="text-red-400">- Asyad Holdings</div>
                    <div className="text-emerald-400">+ Asyad Group</div>
                  </div>
                </div>
                <div className="bg-dark-bg rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-white">GRI 2-6: Value chain</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">Added</span>
                  </div>
                  <div className="text-sm text-emerald-400 font-mono">
                    + Complete value chain description added
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Proofs Tab */}
          {activeTab === 'proofs' && (
            <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">Cryptographic Proofs</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-bg rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Payload CID</div>
                    <code className="text-sm text-white break-all">{currentVersion?.payloadCID}</code>
                    <button className="mt-2 text-xs text-accent hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      View on IPFS
                    </button>
                  </div>
                  <div className="bg-dark-bg rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">SHA-256</div>
                    <code className="text-sm text-white break-all">{currentVersion?.sha256.slice(0, 32)}...</code>
                  </div>
                  <div className="bg-dark-bg rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Merkle Root</div>
                    <code className="text-sm text-emerald-400">{currentVersion?.merkleRoot}</code>
                  </div>
                  <div className="bg-dark-bg rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Transaction</div>
                    <code className="text-sm text-blue-400">0x1234...abcd</code>
                    <button className="mt-2 text-xs text-accent hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      View on Explorer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Approvals Tab */}
          {activeTab === 'approvals' && (
            <div className="space-y-3">
              {approvalHistory.map((approval, index) => (
                <div
                  key={index}
                  className="bg-dark-surface border border-dark-border rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{approval.role}</div>
                        <div className="text-xs text-gray-400">{approval.did}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={clsx(
                        'px-2 py-1 rounded text-xs font-medium',
                        approval.decision === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        approval.decision === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                      )}>
                        {approval.decision}
                      </div>
                      <Shield className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  {approval.comment && (
                    <div className="bg-dark-bg rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-300">{approval.comment}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{new Date(approval.timestamp).toLocaleString()}</span>
                    <code className="text-gray-500">VC: {approval.vcHash}</code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Panel */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 h-fit sticky top-6">
          <h3 className="font-bold text-white mb-4">Your Approval</h3>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setApprovalDecision('approve')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors',
                  approvalDecision === 'approve'
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50'
                    : 'bg-dark-bg border border-dark-border hover:border-emerald-500/30'
                )}
              >
                <CheckCircle className="w-5 h-5" />
                Approve
              </button>
              <button
                onClick={() => setApprovalDecision('reject')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors',
                  approvalDecision === 'reject'
                    ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                    : 'bg-dark-bg border border-dark-border hover:border-red-500/30'
                )}
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Comment
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Add your review comments..."
              />
            </div>

            <button
              disabled={!approvalDecision}
              className="w-full px-4 py-3 bg-accent text-dark-bg rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Decision
            </button>

            <div className="pt-4 border-t border-dark-border">
              <div className="text-xs text-gray-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Your DID:</span>
                  <code className="text-white">did:ethr:0x1234...5678</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Role:</span>
                  <span className="text-white">Approver</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>VC Hash:</span>
                  <code className="text-emerald-400">0xabcd...ef01</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

