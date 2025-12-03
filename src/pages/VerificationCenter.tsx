import { useState } from 'react'
import { CheckCircle2, XCircle, Download, FileText } from 'lucide-react'
import clsx from 'clsx'

export default function VerificationCenter() {
  const [activeTab, setActiveTab] = useState<'paste' | 'pick'>('paste')
  const [proofBundle, setProofBundle] = useState('')
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const handleVerify = () => {
    // Mock verification
    setTimeout(() => {
      setVerificationResult({
        verified: true,
        chainId: 'zkEVM',
        blockNumber: 12345678,
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        anchoredAt: '2024-11-08T14:30:00Z',
        periodId: 'FY2025',
        moduleId: 'GRI',
        submissionId: 'SUB-2024-001',
      })
    }, 1000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
        <h2 className="text-2xl font-bold mb-6">Verification Center</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-dark-border">
          <button
            onClick={() => setActiveTab('paste')}
            className={clsx(
              'px-6 py-3 font-medium transition-colors relative',
              activeTab === 'paste' ? 'text-accent' : 'text-gray-400 hover:text-white'
            )}
          >
            Paste Proof Bundle
            {activeTab === 'paste' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('pick')}
            className={clsx(
              'px-6 py-3 font-medium transition-colors relative',
              activeTab === 'pick' ? 'text-accent' : 'text-gray-400 hover:text-white'
            )}
          >
            Pick an Artifact
            {activeTab === 'pick' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        </div>

        {/* Paste Tab */}
        {activeTab === 'paste' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Proof Bundle (JSON)</label>
              <textarea
                value={proofBundle}
                onChange={(e) => setProofBundle(e.target.value)}
                placeholder='{"payloadCID": "bafybeig...", "merkleRoot": "0xB2...", "signatures": [...], ...}'
                className="w-full h-48 px-4 py-3 rounded-lg bg-dark-bg border border-dark-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
            <button
              onClick={handleVerify}
              className="w-full px-6 py-3 rounded-lg bg-accent text-dark-bg font-semibold hover:bg-accent/90 transition-colors"
            >
              Verify Proof
            </button>
          </div>
        )}

        {/* Pick Tab */}
        {activeTab === 'pick' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select from Evidence Library</label>
              <select className="w-full px-4 py-3 rounded-lg bg-dark-bg border border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option>Select evidence item...</option>
                <option>EV-2024-001 - emissions_data.xlsx</option>
                <option>EV-2024-002 - verification_report.json</option>
                <option>EV-2024-003 - sustainability_report.pdf</option>
              </select>
            </div>
            <button
              onClick={handleVerify}
              className="w-full px-6 py-3 rounded-lg bg-accent text-dark-bg font-semibold hover:bg-accent/90 transition-colors"
            >
              Verify Selected
            </button>
          </div>
        )}
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border animate-fade-in">
          <div
            className={clsx(
              'flex items-center gap-3 mb-6',
              verificationResult.verified ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {verificationResult.verified ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <XCircle className="w-8 h-8" />
            )}
            <h3 className="text-2xl font-bold">
              {verificationResult.verified ? 'Verified' : 'Verification Failed'}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">Chain ID</div>
              <div className="font-medium">{verificationResult.chainId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Block Number</div>
              <div className="font-medium">{verificationResult.blockNumber.toLocaleString()}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-400 mb-1">Transaction Hash</div>
              <div className="font-mono text-sm bg-dark-bg px-3 py-2 rounded border border-dark-border break-all">
                {verificationResult.txHash}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Anchored At</div>
              <div className="text-sm">
                {new Date(verificationResult.anchoredAt).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Period ID</div>
              <div className="font-medium">{verificationResult.periodId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Module ID</div>
              <div className="font-medium">{verificationResult.moduleId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Submission ID</div>
              <div className="font-medium">{verificationResult.submissionId}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dark-border hover:border-accent transition-colors">
              <Download className="w-5 h-5" />
              <span className="font-medium">Download JSON Proof</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dark-border hover:border-accent transition-colors">
              <FileText className="w-5 h-5" />
              <span className="font-medium">Download Signed PDF</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

