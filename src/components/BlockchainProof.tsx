import { useState } from 'react'
import { X, Shield, Clock, User, Hash, Link2, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BlockchainProofProps {
  isOpen: boolean
  onClose: () => void
  dataPoint?: string
  facility?: string
}

export default function BlockchainProof({ isOpen, onClose, dataPoint, facility }: BlockchainProofProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'proof' | 'chain'>('proof')

  if (!isOpen) return null

  const proof = {
    dataPoint: dataPoint || t('components.blockchain.sampleDataPoint'),
    facility: facility || 'Map Ta Phut Olefins',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    submittedAt: '2026-04-02 09:23:14 UTC',
    approver: 'Dr. Kannika Suthep',
    approverDID: 'did:nexus:gc:0x2c8d...9a1f',
    approvedAt: '2026-04-02 14:45:32 UTC',
    anchoredAt: '2026-04-02 14:46:01 UTC',
    merkleRoot: '0x3e7f1a9b8c2d4e6f8a1b3c5d7e9f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4',
    txHash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    blockNumber: 18945438,
    network: 'Polygon zkEVM',
    gasUsed: '47,293',
    status: t('components.blockchain.status'),
  }

  const chain = [
    { step: 1, label: t('components.blockchain.chain.submitted'), actor: proof.submitter, did: proof.submitterDID, time: proof.submittedAt, icon: User, color: 'blue' },
    { step: 2, label: t('components.blockchain.chain.review'), actor: proof.approver, did: proof.approverDID, time: proof.approvedAt, icon: CheckCircle2, color: 'amber' },
    { step: 3, label: t('components.blockchain.chain.anchored'), actor: t('components.blockchain.chain.system'), did: 'did:nexus:system:anchor', time: proof.anchoredAt, icon: Link2, color: 'accent' },
    { step: 4, label: t('components.blockchain.chain.included'), actor: t('components.blockchain.chain.reportEngine'), did: 'did:nexus:system:report', time: '2026-04-03 08:00:00 UTC', icon: Shield, color: 'teal' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-dark-900 border-l border-dark-600 shadow-card-lg flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600 bg-dark-850">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-500/15 border border-accent-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent-400" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-white">{t('components.blockchain.title')}</h3>
              <p className="text-xs text-dark-400">{t('components.blockchain.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={t('components.blockchain.closeAria')} title={t('common.close')} className="p-2 rounded-lg hover:bg-dark-700 transition-colors">
            <X className="w-4 h-4 text-dark-400" />
          </button>
        </div>

        {/* Verified badge */}
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
          <CheckCircle2 className="w-5 h-5 text-teal-400" />
          <div>
            <p className="text-sm font-semibold text-teal-400">{proof.status}</p>
            <p className="text-xs text-teal-400/70">{t('components.blockchain.verifiedBody')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-4 p-1 bg-dark-800 rounded-lg border border-dark-600">
          <button
            onClick={() => setActiveTab('proof')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${activeTab === 'proof' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-dark-300'}`}
          >
            {t('components.blockchain.tabProof')}
          </button>
          <button
            onClick={() => setActiveTab('chain')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${activeTab === 'chain' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-dark-300'}`}
          >
            {t('components.blockchain.tabChain')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'proof' ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <ProofRow label={t('components.blockchain.rows.dataPoint')} value={proof.dataPoint} />
                <ProofRow label={t('components.blockchain.rows.facility')} value={proof.facility} />
                <ProofRow label={t('components.blockchain.rows.submittedBy')} value={proof.submitter} sub={proof.submitterDID} />
                <ProofRow label={t('components.blockchain.rows.submittedAt')} value={proof.submittedAt} icon={Clock} />
                <ProofRow label={t('components.blockchain.rows.approvedBy')} value={proof.approver} sub={proof.approverDID} />
                <ProofRow label={t('components.blockchain.rows.approvedAt')} value={proof.approvedAt} icon={Clock} />
                <ProofRow label={t('components.blockchain.rows.anchoredAt')} value={proof.anchoredAt} icon={Clock} />
              </div>

              <div className="border-t border-dark-600 pt-4 space-y-3">
                <p className="text-micro font-semibold uppercase tracking-[0.06em] text-dark-400">{t('components.blockchain.onChain')}</p>
                <ProofRow label={t('components.blockchain.rows.merkleRoot')} value={proof.merkleRoot} mono icon={Hash} />
                <ProofRow label={t('components.blockchain.rows.txHash')} value={proof.txHash} mono icon={Hash} />
                <ProofRow label={t('components.blockchain.rows.blockNumber')} value={proof.blockNumber.toLocaleString()} />
                <ProofRow label={t('components.blockchain.rows.network')} value={proof.network} />
                <ProofRow label={t('components.blockchain.rows.gasUsed')} value={proof.gasUsed} />
              </div>

              <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
                <p className="text-xs font-semibold text-dark-300 mb-2">{t('components.blockchain.whatMeans')}</p>
                <p className="text-xs text-dark-400 leading-relaxed">
                  {t('components.blockchain.explanation')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {chain.map((step, i) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.color === 'blue' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                      step.color === 'amber' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                      step.color === 'accent' ? 'bg-accent-500/15 text-accent-400 border border-accent-500/20' :
                      'bg-teal-500/15 text-teal-400 border border-teal-500/20'
                    }`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    {i < chain.length - 1 && (
                      <div className="w-px h-full min-h-[48px] bg-dark-600" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                    <p className="text-xs text-dark-300 mt-0.5">{step.actor}</p>
                    <p className="text-caption text-dark-400 font-mono mt-0.5">{step.did}</p>
                    <p className="text-caption text-dark-400 mt-0.5">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

function ProofRow({
  label,
  value,
  sub,
  mono,
  icon: Icon,
}: {
  label: string
  value: string
  sub?: string
  mono?: boolean
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-dark-400 flex-shrink-0 pt-0.5">{label}</span>
      <div className="text-right">
        <span className={`text-xs text-dark-300 font-medium ${mono ? 'font-mono text-caption break-all text-accent-400/80' : ''}`}>
          {Icon && <Icon className="w-3 h-3 inline mr-1 text-dark-400" />}
          {value}
        </span>
        {sub && <p className="text-caption text-dark-400 font-mono">{sub}</p>}
      </div>
    </div>
  )
}
