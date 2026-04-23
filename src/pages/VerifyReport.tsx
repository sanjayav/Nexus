import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, AlertCircle, BadgeCheck, Hash, Calendar, Building2, FileCheck, Clock, ArrowRight, Leaf, Copy } from 'lucide-react'
import { verifyReport, type VerifyReportResponse } from '../lib/orgStore'
import { SPRING } from '../components/motion'

/**
 * Public verification page — no auth. Anyone with a verification token can land
 * here and see the authoritative metadata for the report: SHA-256 hash, external
 * anchor, publish time, assurance status. This is what makes the QR on the cover
 * useful.
 */
export default function VerifyReport() {
  const { token = '' } = useParams<{ token: string }>()
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ok'; data: VerifyReportResponse } | { kind: 'error'; error: string }>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    verifyReport(token)
      .then(d => { if (!cancelled) setState({ kind: 'ok', data: d }) })
      .catch(e => { if (!cancelled) setState({ kind: 'error', error: e instanceof Error ? e.message : 'Verification failed' }) })
    return () => { cancelled = true }
  }, [token])

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(900px 500px at 10% -10%, rgba(27,107,123,0.08), transparent 60%), radial-gradient(800px 500px at 90% 110%, rgba(94,53,177,0.05), transparent 60%), var(--bg-secondary)',
      }}
    >
      <header className="px-8 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1B6B7B, #1e8e7a)', boxShadow: '0 4px 12px rgba(27,107,123,0.3)' }}>
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold tracking-[-0.02em] text-[15px]">Aeiforo</span>
        </a>
        <span className="chip">
          <ShieldCheck className="w-3 h-3" /> Public verification
        </span>
      </header>

      <main className="max-w-[860px] mx-auto px-6 py-10">
        {state.kind === 'loading' && (
          <div className="surface-paper p-16 text-center">
            <div className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-4" style={{ background: 'var(--gradient-brand-soft)' }}>
              <div className="w-6 h-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">Verifying…</div>
            <div className="text-[12.5px] text-[var(--text-tertiary)] mt-1">Looking up the report by its verification token.</div>
          </div>
        )}

        {state.kind === 'error' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="surface-paper p-12 text-center">
            <div className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-4" style={{ background: 'var(--accent-red-light)', color: 'var(--status-reject)' }}>
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="text-display text-[24px] text-[var(--text-primary)]">Verification failed</h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-2 max-w-md mx-auto leading-relaxed">
              {state.error === 'Unknown verification token'
                ? 'This verification token is not recognised. The link may be mistyped, or the report may have been withdrawn.'
                : state.error}
            </p>
          </motion.div>
        )}

        {state.kind === 'ok' && <VerifyResult data={state.data} />}
      </main>

      <footer className="text-center py-8 text-[11.5px] text-[var(--text-tertiary)]">
        Verified via Aeiforo ESG Platform · <a href="/" className="link-underline text-[var(--color-brand)] hover:text-[var(--color-brand-strong)]">aeiforo.com</a>
      </footer>
    </div>
  )
}

function VerifyResult({ data }: { data: VerifyReportResponse }) {
  const copy = (s: string) => { navigator.clipboard.writeText(s) }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-5">
      {/* Hero verification banner */}
      <div className="surface-hero p-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-[14px] flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10B981, #2E7D32)', boxShadow: '0 6px 16px rgba(46,125,50,0.3)' }}>
            <BadgeCheck className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="kicker">Verified</span>
            <h1 className="text-display text-[30px] text-[var(--text-primary)] mt-1">{data.organisation}</h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
              This is an authentic sustainability report, published by <strong>{data.published.by}</strong> on{' '}
              <strong>{new Date(data.published.at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
              The document hash was anchored to a public timestamp calendar at publication time.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="chip"><Building2 className="w-3 h-3" /> {data.framework.toUpperCase()}</span>
              <span className="chip"><Calendar className="w-3 h-3" /> {data.period.label}</span>
              <span className="chip">Version {data.published.version}</span>
              {data.published.is_draft ? (
                <span className="chip" style={{ background: 'var(--accent-amber-light)', color: 'var(--status-draft)', borderColor: 'rgba(230,168,23,0.3)' }}>
                  UNAUDITED DRAFT
                </span>
              ) : (
                <span className="chip" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)', borderColor: 'rgba(46,125,50,0.3)' }}>
                  ASSURED
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hash + anchor detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel icon={<Hash className="w-4 h-4" />} title="Document hash">
          <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)]">SHA-256</div>
          <div className="mt-1 font-mono text-[12px] text-[var(--text-primary)] break-all leading-relaxed">{data.pdf.sha256}</div>
          <button onClick={() => copy(data.pdf.sha256)} className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] link-underline">
            <Copy className="w-3 h-3" /> Copy hash
          </button>
          <div className="hairline my-4" />
          <div className="text-[11px] text-[var(--text-tertiary)]">
            File size: {(data.pdf.size / 1024).toFixed(1)} KB
            {data.pdf.pages && <> · {data.pdf.pages} pages</>}
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-2 leading-relaxed">
            Compute <code className="font-mono bg-[var(--bg-secondary)] px-1 rounded">sha256sum</code> on the PDF you received — it must equal the hash above. If it differs, the document has been modified.
          </p>
        </Panel>

        <Panel icon={<ShieldCheck className="w-4 h-4" />} title="External timestamp">
          {data.anchor ? (
            <>
              <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)]">Anchor</div>
              <div className="mt-1 text-[12.5px] text-[var(--text-primary)]">OpenTimestamps · <span className="text-[var(--status-ok)] font-semibold">Anchored</span></div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-1">Anchored on {new Date(data.anchor.anchored_at).toLocaleString()}</div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Calendar: <a href={data.anchor.calendar} className="link-underline text-[var(--color-brand)]" target="_blank" rel="noreferrer">{data.anchor.calendar}</a></div>
              <div className="hairline my-4" />
              <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                {data.anchor.note}
              </p>
            </>
          ) : (
            <p className="text-[12.5px] text-[var(--text-tertiary)]">No external anchor on record. The document hash was stored server-side only.</p>
          )}
        </Panel>
      </div>

      {/* Assurance */}
      <div className="surface-paper p-6">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: data.assurance ? 'var(--accent-green-light)' : 'var(--accent-amber-light)', color: data.assurance ? 'var(--status-ok)' : 'var(--status-draft)' }}>
            {data.assurance ? <BadgeCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </span>
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
              {data.assurance ? 'Independent assurance statement' : 'Assurance pending'}
            </div>
            {data.assurance ? (
              <div className="text-[12.5px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                Signed by <strong>{data.assurance.signed_by}</strong>{data.assurance.firm ? ` of ${data.assurance.firm}` : ''} on {new Date(data.assurance.signed_at).toLocaleDateString()}.{' '}
                {data.assurance.opinion === 'reasonable' ? 'Reasonable assurance' : 'Limited assurance'}{data.assurance.standard ? ` per ${data.assurance.standard}` : ''}.
              </div>
            ) : (
              <div className="text-[12.5px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                This report was published without third-party assurance. The figures are management's representation. The document hash is still timestamped — integrity of the file is guaranteed — but independent opinion on the figures is not yet available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How to verify manually */}
      <div className="surface-paper p-6">
        <div className="flex items-center gap-2.5 mb-3">
          <FileCheck className="w-4 h-4 text-[var(--color-brand)]" />
          <h3 className="font-display text-[14px] font-semibold text-[var(--text-primary)]">How to verify this report yourself</h3>
        </div>
        <ol className="text-[12.5px] text-[var(--text-secondary)] space-y-2.5 leading-relaxed">
          <li className="flex gap-3">
            <span className="text-[var(--color-brand)] font-bold">1.</span>
            <span>Open a terminal and run <code className="font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-[4px] text-[11.5px]">sha256sum report.pdf</code> (or <code className="font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-[4px] text-[11.5px]">shasum -a 256 report.pdf</code> on macOS). Compare the output to the hash above — they must match.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[var(--color-brand)] font-bold">2.</span>
            <span>Install the OpenTimestamps client: <code className="font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-[4px] text-[11.5px]">pip install opentimestamps-client</code>. This lets you independently confirm the anchor against the Bitcoin blockchain.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-[var(--color-brand)] font-bold">3.</span>
            <span>If the hashes match and the OpenTimestamps receipt upgrades to a full Bitcoin proof, this report has not been modified since it was published.</span>
          </li>
        </ol>
      </div>

      <div className="text-center pt-2">
        <a href="/" className="text-[12px] text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline">
          Go to Aeiforo platform <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </motion.div>
  )
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="surface-paper p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>{icon}</span>
        <h3 className="font-display text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{title}</h3>
      </div>
      {children}
    </div>
  )
}
