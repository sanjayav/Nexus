import { useEffect, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Clock, Hash, Link2, Shield, User, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFmt } from '../lib/fmt'
import SealCheck from './ui/SealCheck'
import { dur, spring, staggerDelay, transition } from '../motion/tokens'

interface BlockchainProofProps {
  isOpen: boolean
  onClose: () => void
  dataPoint?: string
  facility?: string
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Side sheet with the tamper-evidence record for one data point: who
 * submitted and approved it, when it was anchored, and the on-chain receipt.
 * Esc and the backdrop close it; focus is trapped while open.
 */
export default function BlockchainProof({ isOpen, onClose, dataPoint, facility }: BlockchainProofProps) {
  const { t } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const [tab, setTab] = useState<'proof' | 'chain'>('proof')
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const prev = document.activeElement as HTMLElement | null
    const raf = requestAnimationFrame(() => closeRef.current?.focus())
    return () => { cancelAnimationFrame(raf); prev?.focus?.() }
  }, [isOpen])

  if (typeof document === 'undefined') return null

  const proof = {
    dataPoint: dataPoint || t('components.blockchain.sampleDataPoint'),
    facility: facility || 'Map Ta Phut Olefins',
    submitter: 'Somchai Prasert',
    submitterDID: 'did:nexus:gc:0x7a3b...4f2e',
    submittedAt: '2026-04-02T09:23:14Z',
    approver: 'Dr. Kannika Suthep',
    approverDID: 'did:nexus:gc:0x2c8d...9a1f',
    approvedAt: '2026-04-02T14:45:32Z',
    anchoredAt: '2026-04-02T14:46:01Z',
    merkleRoot: '0x3e7f1a9b8c2d4e6f8a1b3c5d7e9f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4',
    txHash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    blockNumber: 18945438,
    network: 'Polygon zkEVM',
    gasUsed: 47293,
  }
  const when = (iso: string) => f.dateTime(iso, { timeZone: 'UTC', seconds: true })

  const chain: Array<{ label: string; actor: string; did: string; time: string; icon: ComponentType<{ className?: string }> }> = [
    { label: t('components.blockchain.chain.submitted'), actor: proof.submitter, did: proof.submitterDID, time: proof.submittedAt, icon: User },
    { label: t('components.blockchain.chain.review'), actor: proof.approver, did: proof.approverDID, time: proof.approvedAt, icon: CheckCircle2 },
    { label: t('components.blockchain.chain.anchored'), actor: t('components.blockchain.chain.system'), did: 'did:nexus:system:anchor', time: proof.anchoredAt, icon: Link2 },
    { label: t('components.blockchain.chain.included'), actor: t('components.blockchain.chain.reportEngine'), did: 'did:nexus:system:report', time: '2026-04-03T08:00:00Z', icon: Shield },
  ]

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
    if (e.key !== 'Tab') return
    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (!nodes.length) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end" onKeyDown={onKeyDown}>
          <motion.div
            className="absolute inset-0"
            style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bc-proof-title"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={spring.gentle}
            className="relative w-full max-w-lg h-full bg-[var(--bg-elevated)] border-l border-[var(--border-default)] shadow-[var(--shadow-overlay)] flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-6 h-16 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 id="bc-proof-title" className="type-small font-semibold text-[var(--text-primary)]">{t('components.blockchain.title')}</h3>
                  <p className="text-caption text-[var(--text-tertiary)]">{t('components.blockchain.subtitle')}</p>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t('components.blockchain.closeAria')}
                className="w-9 h-9 rounded-[var(--radius-md)] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mx-6 mt-5 flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] bg-[var(--status-success-soft)]">
              <SealCheck size={28} delay={0.2} />
              <div className="min-w-0">
                <p className="type-small font-semibold text-[var(--status-success)]">{t('components.blockchain.status')}</p>
                <p className="text-caption text-[var(--text-secondary)]">{t('components.blockchain.verifiedBody')}</p>
              </div>
            </div>

            <div role="tablist" className="flex gap-1 mx-6 mt-5 p-1 rounded-[var(--radius-md)] bg-[var(--bg-secondary)]">
              {(['proof', 'chain'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`relative flex-1 h-9 rounded-[calc(var(--radius-md)-2px)] text-small font-semibold transition-colors ${tab === k ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
                >
                  {tab === k && <motion.span layoutId="bc-tab" transition={spring.snappy} className="absolute inset-0 rounded-[calc(var(--radius-md)-2px)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)]" aria-hidden />}
                  <span className="relative">{k === 'proof' ? t('components.blockchain.tabProof') : t('components.blockchain.tabChain')}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'proof' ? (
                <div className="space-y-5">
                  <dl className="space-y-3">
                    <ProofRow label={t('components.blockchain.rows.dataPoint')} value={proof.dataPoint} />
                    <ProofRow label={t('components.blockchain.rows.facility')} value={proof.facility} />
                    <ProofRow label={t('components.blockchain.rows.submittedBy')} value={proof.submitter} sub={proof.submitterDID} />
                    <ProofRow label={t('components.blockchain.rows.submittedAt')} value={when(proof.submittedAt)} icon={Clock} />
                    <ProofRow label={t('components.blockchain.rows.approvedBy')} value={proof.approver} sub={proof.approverDID} />
                    <ProofRow label={t('components.blockchain.rows.approvedAt')} value={when(proof.approvedAt)} icon={Clock} />
                    <ProofRow label={t('components.blockchain.rows.anchoredAt')} value={when(proof.anchoredAt)} icon={Clock} />
                  </dl>
                  <div className="pt-5 border-t border-[var(--border-subtle)]">
                    <h4 className="text-caption font-semibold text-[var(--text-secondary)] mb-3">{t('components.blockchain.onChain')}</h4>
                    <dl className="space-y-3">
                      <ProofRow label={t('components.blockchain.rows.merkleRoot')} value={proof.merkleRoot} mono icon={Hash} />
                      <ProofRow label={t('components.blockchain.rows.txHash')} value={proof.txHash} mono icon={Hash} />
                      <ProofRow label={t('components.blockchain.rows.blockNumber')} value={f.number(proof.blockNumber)} />
                      <ProofRow label={t('components.blockchain.rows.network')} value={proof.network} />
                      <ProofRow label={t('components.blockchain.rows.gasUsed')} value={f.number(proof.gasUsed)} />
                    </dl>
                  </div>
                  <div className="rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] p-4">
                    <p className="type-small font-semibold text-[var(--text-primary)] mb-1">{t('components.blockchain.whatMeans')}</p>
                    <p className="type-small text-[var(--text-secondary)]">{t('components.blockchain.explanation')}</p>
                  </div>
                </div>
              ) : (
                <ol>
                  {chain.map((step, i) => (
                    <motion.li
                      key={i}
                      initial={reduce ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...transition.base, delay: staggerDelay(i, 0.05) }}
                      className="flex gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
                          <step.icon className="w-4 h-4" />
                        </span>
                        {i < chain.length - 1 && <span className="w-px flex-1 min-h-[40px] bg-[var(--border-default)]" aria-hidden />}
                      </div>
                      <div className="pb-6 min-w-0">
                        <p className="type-small font-semibold text-[var(--text-primary)]">{step.label}</p>
                        <p className="text-caption text-[var(--text-secondary)] mt-0.5">{step.actor}</p>
                        <p className="text-caption font-mono text-[var(--text-tertiary)] mt-0.5 break-all">{step.did}</p>
                        <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{when(step.time)}</p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ProofRow({ label, value, sub, mono, icon: Icon }: {
  label: string
  value: string
  sub?: string
  mono?: boolean
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] gap-4 items-start">
      <dt className="text-caption text-[var(--text-tertiary)] pt-0.5">{label}</dt>
      <dd className="text-right min-w-0">
        <span className={`inline-flex items-start gap-1 ${mono ? 'font-mono text-caption break-all text-[var(--text-primary)]' : 'type-small text-[var(--text-primary)]'}`}>
          {Icon && <Icon className="w-3 h-3 mt-1 flex-shrink-0 text-[var(--text-tertiary)]" />}
          <span className="min-w-0">{value}</span>
        </span>
        {sub && <p className="text-caption font-mono text-[var(--text-tertiary)] break-all">{sub}</p>}
      </dd>
    </div>
  )
}
