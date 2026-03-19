import { useState } from 'react'
import clsx from 'clsx'
import {
  Shield, CheckCircle2, Lock, FileText, Download,
  Fingerprint, Box, Cpu, Activity, Database, Key
} from 'lucide-react'

// Mock verification stages
const VERIFICATION_STAGES = [
  'Extracting payload CID from IPFS...',
  'Verifying Approver Verifiable Credential (DID)...',
  'Reconstructing Merkle Tree for Period FY2025...',
  'Validating zkEVM Zero-Knowledge Proof...',
  'Cryptographic consensus achieved.'
]

export default function PremiumVerificationCenter() {
  const [activeTab, setActiveTab] = useState<'paste' | 'pick'>('pick')
  const [isVerifying, setIsVerifying] = useState(false)
  const [stage, setStage] = useState(-1)
  const [result, setResult] = useState<any>(null)

  const handleVerify = () => {
    setIsVerifying(true)
    setStage(0)
    setResult(null)

    let currentStage = 0
    const interval = setInterval(() => {
      currentStage++
      if (currentStage >= VERIFICATION_STAGES.length) {
        clearInterval(interval)
        setIsVerifying(false)
        setResult({
          status: 'verified',
          chainId: 'Polygon zkEVM',
          blockNumber: '14,092,118',
          txHash: '0x94f...c3a8e2',
          merkleRoot: '0x8b12a...991cd',
          anchoredAt: new Date().toISOString(),
          signerDid: 'did:nexus:0x44fa...11c',
          signerRole: 'Senior Env Auditor'
        })
      } else {
        setStage(currentStage)
      }
    }, 800)
  }

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500 bg-white/40 p-1 rounded-[2rem]">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 bg-white/60 backdrop-blur-xl border border-black/5 p-8 rounded-[2rem] shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
              <Shield className="w-6 h-6 text-indigo-500" />
            </div>
            Cryptographic Trust Center
          </h1>
          <p className="text-sm font-medium text-black/60 mt-4 max-w-3xl leading-relaxed">
            Verify the immutability and origin of any ESG data point. Unlike legacy systems, Nexus uses Zero-Knowledge proofs and Verifiable Credentials to prove data integrity without revealing underlying trade secrets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-4">

        {/* LEFT COLUMN: Input & Trigger */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white/60 backdrop-blur-xl border border-black/5 rounded-[2rem] p-2 shadow-sm">
            <div className="flex">
              <button
                onClick={() => setActiveTab('pick')}
                className={clsx(
                  'flex-1 py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all',
                  activeTab === 'pick' ? 'bg-white text-indigo-500 shadow-md border border-black/5' : 'text-black/50 hover:text-black hover:bg-black/5'
                )}
              >
                Pick from Library
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={clsx(
                  'flex-1 py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all',
                  activeTab === 'paste' ? 'bg-white text-indigo-500 shadow-md border border-black/5' : 'text-black/50 hover:text-black hover:bg-black/5'
                )}
              >
                Paste Hex Proof
              </button>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-black/5 rounded-[2rem] p-8 shadow-sm flex-1 flex flex-col">
            {activeTab === 'pick' ? (
              <div className="flex-1 space-y-6">
                <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-4">Select Data Artifact</label>
                <div className="space-y-3">
                  {[
                    { id: 'EV-2024-001', name: 'Scope 1 Emissions Ledger', type: 'Dataset', verified: true, color: 'text-emerald-500' },
                    { id: 'REP-FY25-Q1', name: 'GRI Interim Report', type: 'PDF Report', verified: true, color: 'text-indigo-500' },
                    { id: 'AUD-992-DK', name: 'External Auditor Sign-off', type: 'Signature', verified: true, color: 'text-cyan-500' },
                  ].map((item, i) => (
                    <label key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-black/5 bg-white shadow-sm cursor-pointer hover:border-black/20 hover:shadow-md transition-all group">
                      <input type="radio" name="artifact" className="text-indigo-500 bg-white border-black/20 focus:ring-indigo-500/50 w-4 h-4" defaultChecked={i === 0} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-black group-hover:text-indigo-600 transition-colors">{item.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mt-1">{item.id} · {item.type}</p>
                      </div>
                      <Shield className={`w-5 h-5 ${item.color} opacity-80`} />
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-6">
                <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-4">Raw zk-Proof Payload</label>
                <textarea
                  placeholder="Paste 0x... hex string or JSON verification payload here"
                  className="w-full h-56 px-5 py-4 bg-white border border-black/10 rounded-2xl text-xs font-mono font-medium text-black focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 resize-none shadow-inner"
                  defaultValue='{"payloadCID": "bafybeig...","merkleRoot": "0xB2..."}'
                />
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="mt-8 w-full py-4 bg-black text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isVerifying ? <Cpu className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4 text-indigo-400" />}
              {isVerifying ? 'Running Layer 2 Verification...' : 'Verify Cryptographic Proof'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Terminal & Results */}
        <div className="lg:col-span-7 flex flex-col gap-6 relative">

          {/* Glowing background effects for the terminal side */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] pointer-events-none -z-10 rounded-full" />

          {/* Terminal Output (Light Theme adaptation: dark blue/black background still looks good for code) */}
          <div className="bg-[#050510] border border-black/10 rounded-[2rem] p-8 h-72 overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
            <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Verification Console
            </h3>

            <div className="space-y-4 font-mono text-[11px] leading-relaxed">
              {!isVerifying && !result && (
                <div className="text-white/40 font-medium">Waiting for verification request...</div>
              )}
              {isVerifying && VERIFICATION_STAGES.slice(0, stage + 1).map((s, i) => (
                <div key={i} className="flex items-start gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <span className="text-indigo-400 font-bold mt-0.5">❯</span>
                  <span className={clsx("font-bold", i === stage ? 'text-white' : 'text-white/40')}>{s}</span>
                </div>
              ))}
              {result && (
                <div className="flex items-center gap-3 text-emerald-400 animate-in fade-in slide-in-from-left-4 duration-300 mt-6 font-bold bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 inline-flex">
                  <CheckCircle2 className="w-4 h-4" /> Proof successfully verified against ledger.
                </div>
              )}
            </div>
          </div>

          {/* Result Card */}
          <div className={clsx(
            "flex-1 bg-white border border-black/5 rounded-[2rem] p-10 shadow-xl transition-all duration-700 ease-out relative overflow-hidden",
            result ? "opacity-100 translate-y-0" : "opacity-30 translate-y-8 pointer-events-none grayscale"
          )}>
            {result && <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />}

            <div className="flex items-center gap-6 mb-10 relative z-10">
              <div className={clsx(
                "w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm",
                result ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-black/5 border-black/10 text-black/40"
              )}>
                {result ? <CheckCircle2 className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-black mb-1">Cryptographically Valid</h2>
                <p className="text-sm font-medium text-black/60">The data exactly matches the on-chain representation.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-10 gap-y-8 relative z-10">
              {[
                { label: 'Network', value: result?.chainId, icon: Database, color: 'text-indigo-500' },
                { label: 'Block', value: result?.blockNumber, icon: Box, color: 'text-cyan-500' },
                { label: 'Signer DID', value: result?.signerDid, icon: Fingerprint, mono: true, color: 'text-emerald-500' },
                { label: 'Signer Role', value: result?.signerRole, icon: Key, color: 'text-rose-500' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="bg-black/[0.02] p-4 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-2 text-[10px] text-black/40 font-bold uppercase tracking-widest mb-2">
                      <Icon className={`w-3.5 h-3.5 ${item.color}`} /> {item.label}
                    </div>
                    <div className={clsx("text-sm font-bold text-black", item.mono && "font-mono text-indigo-600")}>
                      {item.value || '—'}
                    </div>
                  </div>
                )
              })}

              <div className="col-span-2 bg-black/[0.02] p-5 rounded-2xl border border-black/5">
                <div className="text-[10px] text-black/40 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-black/60" /> Anchored Transaction Hash
                </div>
                <div className="text-xs font-mono font-bold text-black/70 bg-white border border-black/5 p-4 rounded-xl break-all shadow-inner">
                  {result?.txHash || '—'}
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4 relative z-10">
              <button disabled={!result} className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100">
                <Download className="w-4 h-4" /> Save Certificate
              </button>
              <button disabled={!result} className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 bg-white border border-black/10 text-black hover:bg-black/5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-sm disabled:opacity-50">
                <FileText className="w-4 h-4 text-indigo-500" /> View Report
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
