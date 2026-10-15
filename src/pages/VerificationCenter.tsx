import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  Shield, CheckCircle2, Lock, FileText, Download,
  Fingerprint, Box, Cpu, Activity, Database, Key, ChevronRight,
} from 'lucide-react'
import { PageHeader, Card, CardHeader, Button, Tabs, inputClass } from '../components/ui'
import { useStrings } from '../i18n'
import { verificationCenterStrings } from '../i18n/pages/verificationCenter'

const ARTIFACTS = [
  { id: 'EV-2024-001', key: 'ledger' },
  { id: 'REP-FY25-Q1', key: 'report' },
  { id: 'AUD-992-DK', key: 'signoff' },
] as const

interface VerifyResult {
  status: 'verified'
  chainId: string
  blockNumber: string
  txHash: string
  merkleRoot: string
  anchoredAt: string
  signerDid: string
  signerRole: 'seniorAuditor'
}

export default function PremiumVerificationCenter() {
  const s = useStrings(verificationCenterStrings)
  const [activeTab, setActiveTab] = useState<'paste' | 'pick'>('pick')
  const [selected, setSelected] = useState<string>(ARTIFACTS[0].id)
  const [isVerifying, setIsVerifying] = useState(false)
  const [stage, setStage] = useState(-1)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const timer = useRef<ReturnType<typeof setInterval>>()
  const stageCount = s.stages.length

  useEffect(() => () => clearInterval(timer.current), [])

  const handleVerify = () => {
    setIsVerifying(true)
    setStage(0)
    setResult(null)

    let currentStage = 0
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      currentStage++
      if (currentStage >= stageCount) {
        clearInterval(timer.current)
        setIsVerifying(false)
        setResult({
          status: 'verified',
          chainId: 'Polygon zkEVM',
          blockNumber: '14,092,118',
          txHash: '0x94f...c3a8e2',
          merkleRoot: '0x8b12a...991cd',
          anchoredAt: new Date().toISOString(),
          signerDid: 'did:nexus:0x44fa...11c',
          signerRole: 'seniorAuditor',
        })
      } else {
        setStage(currentStage)
      }
    }, 800)
  }

  const details = [
    { label: s.network, value: result?.chainId, icon: Database },
    { label: s.block, value: result?.blockNumber, icon: Box, mono: true },
    { label: s.signerDid, value: result?.signerDid, icon: Fingerprint, mono: true },
    { label: s.signerRole, value: result ? s.roles[result.signerRole] : undefined, icon: Key },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} description={s.description} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: input & trigger */}
        <Card className="lg:col-span-5 flex flex-col">
          <Tabs
            className="w-full mb-5 [&>button]:flex-1 [&>button]:justify-center"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { value: 'pick', label: s.tabs.pick },
              { value: 'paste', label: s.tabs.paste },
            ]}
          />

          {activeTab === 'pick' ? (
            <fieldset>
              <legend className="text-[13px] font-medium text-zinc-700 mb-3">{s.selectArtifact}</legend>
              <div className="space-y-2">
                {ARTIFACTS.map(item => {
                  const text = s.artifacts[item.key]
                  const checked = selected === item.id
                  return (
                    <label
                      key={item.id}
                      className={clsx(
                        'flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors',
                        checked ? 'border-zinc-900 bg-zinc-50' : 'border-line bg-white hover:border-zinc-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="artifact"
                        className="w-4 h-4 accent-zinc-900"
                        checked={checked}
                        onChange={() => setSelected(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900">{text.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          <span className="font-mono">{item.id}</span> · {text.type}
                        </p>
                      </div>
                      <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="zk-payload" className="block text-[13px] font-medium text-zinc-700">{s.rawPayload}</label>
              <textarea
                id="zk-payload"
                placeholder={s.payloadPlaceholder}
                className={clsx(inputClass, 'h-48 py-3 font-mono text-xs resize-none')}
                defaultValue='{"payloadCID": "bafybeig...","merkleRoot": "0xB2..."}'
              />
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={handleVerify}
            disabled={isVerifying}
            className="mt-6 w-full"
          >
            {isVerifying ? <Cpu className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            {isVerifying ? s.verifying : s.verify}
          </Button>
        </Card>

        {/* Right: console & result */}
        <div className="lg:col-span-7 flex flex-col gap-6 min-w-0">
          <div className="rounded-card border border-zinc-800 bg-zinc-950 p-5 sm:p-6 min-h-[220px] shadow-card">
            <h3 className="text-[13px] font-medium text-zinc-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> {s.console}
            </h3>
            <div className="space-y-2.5 font-mono text-xs leading-relaxed">
              {!isVerifying && !result && <div className="text-zinc-500">{s.waiting}</div>}
              {(isVerifying || result) &&
                s.stages.slice(0, result ? stageCount : stage + 1).map((line, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" />
                    <span className={clsx(isVerifying && i === stage ? 'text-white' : 'text-zinc-500')}>{line}</span>
                  </div>
                ))}
              {result && (
                <div className="mt-4 inline-flex items-center gap-2 text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg ring-1 ring-inset ring-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" /> {s.success}
                </div>
              )}
            </div>
          </div>

          <Card className={clsx('transition-opacity duration-500', !result && 'opacity-60')}>
            <CardHeader
              title={result ? s.resultTitle : s.resultPendingTitle}
              description={result ? s.resultDesc : s.resultPendingDesc}
              action={
                <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', result ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400')}>
                  {result ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
              }
            />

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {details.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-xl border border-line bg-zinc-50/60 p-3.5 min-w-0">
                    <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1">
                      <Icon className="w-3.5 h-3.5 text-zinc-400" /> {item.label}
                    </dt>
                    <dd className={clsx('text-sm font-medium text-zinc-900 truncate', item.mono && 'font-mono text-[13px]')}>{item.value || '—'}</dd>
                  </div>
                )
              })}
              <div className="sm:col-span-2 rounded-xl border border-line bg-zinc-50/60 p-3.5">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1.5">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" /> {s.txHash}
                </dt>
                <dd className="font-mono text-xs text-zinc-700 bg-white border border-line rounded-lg px-3 py-2 break-all">{result?.txHash || '—'}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button variant="brand" disabled={!result} icon={Download} className="flex-1">{s.saveCert}</Button>
              <Button disabled={!result} icon={FileText} className="flex-1">{s.viewReport}</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
