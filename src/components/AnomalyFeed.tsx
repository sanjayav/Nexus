import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, AlertOctagon, Info, ArrowRight, Shield, X, RotateCw, Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { orgStore, type Anomaly, type AnomalyScanResult, type AnomalyScope, type AnomalySeverity, type AnomalyType } from '../lib/orgStore'
import { slideInLeft, SPRING } from './motion'

/**
 * Role-scoped anomaly feed.
 * Drop it on any page with a `scope` — everything else is handled inside.
 *
 *   <AnomalyFeed scope="mine"   />  → data-contributor view
 *   <AnomalyFeed scope="role"   />  → plant/subsidiary/SO view (server decides)
 *   <AnomalyFeed scope="all"    />  → admin / audit view
 */
export default function AnomalyFeed({
  scope = 'role',
  limit = 20,
  title = 'Anomalies flagged',
  variant = 'card',
}: {
  scope?: AnomalyScope
  limit?: number
  title?: string
  variant?: 'card' | 'embedded'
}) {
  const navigate = useNavigate()
  const [data, setData] = useState<AnomalyScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<AnomalySeverity | 'all'>('all')
  const [typeFilter] = useState<AnomalyType | 'all'>('all')
  const [showSuppressed, setShowSuppressed] = useState(false)
  const [supModal, setSupModal] = useState<Anomaly | null>(null)

  const load = async () => {
    setLoading(true); setErr(null)
    try {
      const d = await orgStore.anomalyScan(scope, { includeSuppressed: showSuppressed, limit })
      setData(d)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [scope, showSuppressed, limit])

  const anomalies = (data?.anomalies ?? []).filter(a => (filter === 'all' || a.severity === filter) && (typeFilter === 'all' || a.anomaly_type === typeFilter))

  const wrapperClass = variant === 'card' ? 'surface-paper overflow-hidden' : ''

  return (
    <div className={wrapperClass}>
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: data && data.summary.critical > 0 ? 'var(--accent-red-light)' : 'var(--accent-teal-subtle)', color: data && data.summary.critical > 0 ? 'var(--accent-red)' : 'var(--color-brand)' }}>
            {data && data.summary.critical > 0 ? <AlertOctagon className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
          </span>
          <div>
            <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{title}</h3>
            {data && (
              <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-2">
                {data.summary.critical > 0 && <span className="text-[var(--accent-red)] font-semibold">{data.summary.critical} critical</span>}
                {data.summary.critical > 0 && data.summary.warn > 0 && <span>·</span>}
                {data.summary.warn > 0 && <span className="text-[var(--accent-amber)] font-semibold">{data.summary.warn} warn</span>}
                {(data.summary.critical > 0 || data.summary.warn > 0) && data.summary.info > 0 && <span>·</span>}
                {data.summary.info > 0 && <span>{data.summary.info} info</span>}
                {data.summary.total === 0 && <span>No anomalies detected</span>}
                {data.summary.suppressed_total > 0 && (
                  <>
                    <span>·</span>
                    <button className="underline text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" onClick={() => setShowSuppressed(s => !s)}>
                      {showSuppressed ? 'hide' : 'show'} {data.summary.suppressed_total} suppressed
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {data && (
            <>
              <SeverityTab active={filter === 'all'} onClick={() => setFilter('all')} count={data.summary.total}>All</SeverityTab>
              <SeverityTab active={filter === 'critical'} onClick={() => setFilter('critical')} count={data.summary.critical} tone="critical">Crit</SeverityTab>
              <SeverityTab active={filter === 'warn'} onClick={() => setFilter('warn')} count={data.summary.warn} tone="warn">Warn</SeverityTab>
              <SeverityTab active={filter === 'info'} onClick={() => setFilter('info')} count={data.summary.info} tone="info">Info</SeverityTab>
            </>
          )}
          <button onClick={load} className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Refresh">
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="p-8 space-y-2">
          <div className="skeleton h-[16px] rounded" />
          <div className="skeleton h-[16px] w-[85%] rounded" />
          <div className="skeleton h-[16px] w-[75%] rounded" />
        </div>
      ) : err ? (
        <div className="p-8 text-center text-[12.5px] text-[var(--accent-red)]">{err}</div>
      ) : anomalies.length === 0 ? (
        <div className="p-10 text-center">
          <div className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-3" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)' }}>
            <Shield className="w-6 h-6" />
          </div>
          <div className="text-[14px] font-semibold text-[var(--text-primary)]">No anomalies {filter !== 'all' ? `at "${filter}"` : 'detected'}</div>
          <div className="text-[12px] text-[var(--text-tertiary)] mt-1 max-w-xs mx-auto">All values track within historical range and evidence is complete.</div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {anomalies.slice(0, limit).map((a, i) => (
            <AnomalyRow key={a.id} a={a} i={i} onOpen={() => navigate(`/data/entry/${a.assignment_id}`)} onSuppress={() => setSupModal(a)} onRestore={async () => { await orgStore.restoreAnomaly(a.assignment_id, a.anomaly_type); load() }} />
          ))}
          {anomalies.length > limit && (
            <li className="p-4 text-center">
              <button onClick={() => navigate('/analytics/anomalies')} className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline">
                See all {anomalies.length} anomalies <ArrowRight className="w-3 h-3" />
              </button>
            </li>
          )}
        </ul>
      )}

      <AnimatePresence>
        {supModal && (
          <SuppressModal
            anomaly={supModal}
            onClose={() => setSupModal(null)}
            onDone={() => { setSupModal(null); load() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function SeverityTab({ active, count, children, onClick, tone }: { active: boolean; count: number; children: React.ReactNode; onClick: () => void; tone?: 'critical' | 'warn' | 'info' }) {
  const baseColor =
    tone === 'critical' ? 'var(--accent-red)' :
    tone === 'warn' ? 'var(--accent-amber)' :
    tone === 'info' ? 'var(--accent-blue)' :
    'var(--text-secondary)'
  return (
    <button
      onClick={onClick}
      className="h-7 px-2.5 rounded-[6px] text-[11.5px] font-semibold inline-flex items-center gap-1.5 transition-all"
      style={{
        background: active ? 'var(--bg-secondary)' : 'transparent',
        color: active ? baseColor : 'var(--text-tertiary)',
        boxShadow: active ? 'inset 0 0 0 1px var(--border-default)' : 'none',
      }}
    >
      {children}
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  )
}

function AnomalyRow({ a, i, onOpen, onSuppress, onRestore }: { a: Anomaly; i: number; onOpen: () => void; onSuppress: () => void; onRestore: () => void }) {
  const color =
    a.severity === 'critical' ? { bg: 'var(--accent-red-light)', fg: 'var(--accent-red)', border: 'rgba(198,40,40,0.2)' }
    : a.severity === 'warn' ? { bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)', border: 'rgba(230,168,23,0.25)' }
    : { bg: 'var(--accent-blue-light)', fg: 'var(--accent-blue)', border: 'rgba(21,101,192,0.2)' }
  const Icon = a.severity === 'critical' ? AlertOctagon : a.severity === 'warn' ? AlertTriangle : Info

  return (
    <motion.li {...slideInLeft(i)} className={`px-5 py-3.5 flex items-start gap-3 hover:bg-[var(--bg-secondary)] transition-colors group ${a.suppressed ? 'opacity-60' : ''}`}>
      <span className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: color.bg, color: color.fg }}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: color.fg }}>
            {labelForType(a.anomaly_type)}
          </span>
          <span className="font-mono text-[10.5px] font-semibold text-[var(--color-brand)]">{a.gri_code}</span>
          <span className="text-[11.5px] text-[var(--text-tertiary)] truncate">{a.entity_name}</span>
        </div>
        <div className="text-[13px] font-semibold text-[var(--text-primary)] mt-1 tracking-[-0.005em] truncate">{a.headline}</div>
        <div className="text-[11.5px] text-[var(--text-secondary)] mt-0.5 leading-relaxed line-clamp-2">{a.detail}</div>
        {a.suppressed && (
          <div className="mt-2 text-[10.5px] text-[var(--text-tertiary)] italic">
            Suppressed by {a.suppressed.by}: "{a.suppressed.reason}"
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <button onClick={onOpen} className="text-[11px] text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Open disclosure">
          Open <Search className="w-3 h-3" />
        </button>
        {a.suppressed ? (
          <button onClick={onRestore} className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] inline-flex items-center gap-0.5" title="Restore — show this anomaly again">
            <RotateCw className="w-3 h-3" /> Restore
          </button>
        ) : (
          <button onClick={onSuppress} className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Suppress — mark as acknowledged with reason">
            <X className="w-3 h-3" /> Suppress
          </button>
        )}
      </div>
    </motion.li>
  )
}

function SuppressModal({ anomaly, onClose, onDone }: { anomaly: Anomaly; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (reason.trim().length < 10) { setError('Explain in at least 10 characters — this is the audit trail.'); return }
    setSubmitting(true); setError(null)
    try {
      await orgStore.suppressAnomaly(anomaly.assignment_id, anomaly.anomaly_type, reason.trim())
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppress failed')
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} transition={SPRING}
        onClick={e => e.stopPropagation()}
        className="surface-paper max-w-md w-full p-6"
      >
        <span className="kicker">Suppress anomaly</span>
        <h2 className="text-display text-[20px] text-[var(--text-primary)] mt-1">{anomaly.headline}</h2>
        <p className="text-[12.5px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          Nothing is deleted — the anomaly stays on record and is visible via "show suppressed". Your reason is logged in the audit chain.
        </p>

        <label className="block mt-4">
          <span className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">Reason *</span>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. 'Boundary expanded in FY2026 to include Plant D, values not directly comparable'"
            rows={3}
            className="w-full px-3 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none resize-none transition-all"
          />
          <div className="text-[10.5px] text-[var(--text-tertiary)] mt-1">{reason.trim().length}/10+ characters</div>
        </label>

        {error && <div className="mt-3 p-2.5 rounded-[8px] bg-[var(--accent-red-light)] text-[var(--accent-red)] text-[11.5px]">{error}</div>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-[8px] text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">Cancel</button>
          <button
            onClick={submit}
            disabled={submitting || reason.trim().length < 10}
            className="h-9 px-4 rounded-[8px] text-[13px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #E6A817, #D97706)' }}
          >
            {submitting ? 'Saving…' : 'Suppress'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function labelForType(t: AnomalyType): string {
  switch (t) {
    case 'yoy_spike': return 'YoY spike'
    case 'magnitude_jump': return 'Magnitude jump'
    case 'z_score_outlier': return 'Outlier'
    case 'trend_break': return 'Trend break'
    case 'unit_change': return 'Unit change'
    case 'missing_evidence': return 'No evidence'
    case 'late_submission': return 'Late'
    case 'narrative_gap': return 'Narrative gap'
    case 'peer_deviation': return 'Peer outlier'
  }
}
