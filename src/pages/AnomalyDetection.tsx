import { Fragment, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertOctagon, AlertTriangle, Info, Shield, TrendingUp,
  CheckCircle2, FileText, Activity, Filter, RotateCw, Eye, XCircle, CircleDot,
  Sparkles, Copy, Check, Loader2, Lock,
} from 'lucide-react'
import { orgStore, type AnomalyScanResult, type AnomalyType, type AnomalyStatusValue, type Anomaly, type AnomalySeverity } from '../lib/orgStore'
import { ai, isUnconfiguredError, type AiAnomalyListItem } from '../lib/api'
import { useIntegrationStatus } from '../lib/integrations'
import { useAuth } from '../auth/AuthContext'
import { resolveRole } from '../lib/rbac'
import PageHeader from '../components/PageHeader'
import SectionHeader from '../design-system/components/SectionHeader'
import AnomalyFeed from '../components/AnomalyFeed'
import SavedViewsBar from '../components/SavedViewsBar'
import { SkeletonCard } from '../design-system/components/Skeleton'
import { popIn, riseIn } from '../components/motion'

/**
 * Anomaly Detection — full-page. Everyone can see this, but the scope defaults
 * to their role (data contributor sees their own, plant manager sees their plant,
 * SO/admin sees the whole org). Suppressions are tracked with reason + actor.
 */
type StatusFilter = 'all' | AnomalyStatusValue
type SeverityFilter = 'all' | AnomalySeverity

export default function AnomalyDetection() {
  const { user } = useAuth()
  const role = resolveRole(user)
  const defaultScope = role === 'data_contributor' ? 'mine' : role === 'platform_admin' ? 'all' : 'role'
  const [scope, setScope] = useState<'mine' | 'role' | 'all'>(defaultScope)
  const [data, setData] = useState<AnomalyScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [statuses, setStatuses] = useState<Record<string, AnomalyStatusValue>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  // Suppress-with-reason modal — the brief calls for a captured rationale on
  // every dismissal so reviewers can audit why a flag was waved through.
  const [dismissTarget, setDismissTarget] = useState<Anomaly | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setErr(null)
    orgStore.anomalyScan(scope, { includeSuppressed: true, limit: 400 })
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setErr(e instanceof Error ? e.message : 'Load failed'); setLoading(false) } })
    return () => { cancelled = true }
  }, [scope, refreshNonce])

  // Update status for an anomaly — uses POST /api/org action update-anomaly-status.
  // Stores result locally so the UI flips immediately; the next scan will
  // also reflect persisted state. Dismiss takes a reason; the others don't.
  const setStatus = async (a: Anomaly, status: AnomalyStatusValue, note?: string) => {
    const key = `${a.assignment_id}|${a.anomaly_type}`
    setBusyKey(key)
    try {
      await orgStore.updateAnomalyStatus(key, status, note)
      setStatuses(s => ({ ...s, [key]: status }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Status update failed')
    } finally {
      setBusyKey(null)
    }
  }

  const handleDismiss = async (a: Anomaly, reason: string) => {
    await setStatus(a, 'dismissed', reason)
    setDismissTarget(null)
  }

  const filteredAnomalies = useMemo(() => {
    if (!data) return [] as Anomaly[]
    return data.anomalies.filter(a => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      const key = `${a.assignment_id}|${a.anomaly_type}`
      const status = statuses[key] ?? 'open'
      if (statusFilter !== 'all' && status !== statusFilter) return false
      return true
    })
  }, [data, severityFilter, statusFilter, statuses])

  const byType = useMemo(() => {
    if (!data) return [] as Array<{ type: AnomalyType; count: number }>
    const entries = Object.entries(data.summary.by_type) as Array<[AnomalyType, number]>
    return entries.map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
  }, [data])

  const topEntities = useMemo(() => {
    if (!data) return [] as Array<{ entity: string; count: number; critical: number }>
    const map = new Map<string, { count: number; critical: number }>()
    for (const a of data.anomalies) {
      const cur = map.get(a.entity_name) ?? { count: 0, critical: 0 }
      cur.count += 1
      if (a.severity === 'critical') cur.critical += 1
      map.set(a.entity_name, cur)
    }
    return Array.from(map.entries()).map(([entity, v]) => ({ entity, ...v })).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [data])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-[120px] rounded-[18px] skeleton" />
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: 'Data', to: '/data' },
          { label: 'Anomalies' },
        ]}
        eyebrow="Quality"
        title="Anomalies"
        description="Nine statistical and integrity rules running live across every disclosure in scope. Findings are severity-ranked, traceable to the disclosure, and fully dismissable with an audit-logged reason."
        actions={
          <div className="flex items-center gap-1.5">
            <ScopeTab active={scope === 'mine'} onClick={() => setScope('mine')}>Mine</ScopeTab>
            <ScopeTab active={scope === 'role'} onClick={() => setScope('role')}>My scope</ScopeTab>
            {(role === 'platform_admin' || role === 'group_sustainability_officer' || role === 'auditor') && (
              <ScopeTab active={scope === 'all'} onClick={() => setScope('all')}>Org-wide</ScopeTab>
            )}
            <button
              type="button"
              onClick={() => setRefreshNonce(n => n + 1)}
              className="chip inline-flex items-center gap-1"
              title="Re-run the anomaly scan"
            >
              <RotateCw className="w-3 h-3" /> Scan now
            </button>
          </div>
        }
      />

      <SavedViewsBar
        page="anomalies"
        filters={{ scope, severityFilter, statusFilter }}
        onApply={(f: { scope?: 'mine' | 'role' | 'all'; severityFilter?: SeverityFilter; statusFilter?: StatusFilter }) => {
          if (f.scope) setScope(f.scope)
          if (f.severityFilter) setSeverityFilter(f.severityFilter)
          if (f.statusFilter) setStatusFilter(f.statusFilter)
        }}
      />

      <div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Anomaly filters">
        <span className="text-[11px] uppercase tracking-[0.1em] font-bold text-[var(--text-tertiary)]">Severity</span>
        {(['all', 'critical', 'warn', 'info'] as SeverityFilter[]).map(s => (
          <button
            key={s}
            className={`chip ${severityFilter === s ? 'chip-active' : ''}`}
            onClick={() => setSeverityFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="mx-2 w-px h-4 bg-[var(--border-default)]" />
        <span className="text-[11px] uppercase tracking-[0.1em] font-bold text-[var(--text-tertiary)]">Status</span>
        {(['all', 'open', 'investigating', 'resolved', 'dismissed'] as StatusFilter[]).map(s => (
          <button
            key={s}
            className={`chip ${statusFilter === s ? 'chip-active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {err && <div className="surface-paper p-4 text-[var(--accent-red)]">{err}</div>}

      {data && (
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <HeadlineCard icon={<AlertOctagon className="w-5 h-5" />} accent="red" label="Critical" count={data.summary.critical} hint="Almost certainly errors" index={0} />
          <HeadlineCard icon={<AlertTriangle className="w-5 h-5" />} accent="amber" label="Warn" count={data.summary.warn} hint="Reviewer should look" index={1} />
          <HeadlineCard icon={<Info className="w-5 h-5" />} accent="blue" label="Info" count={data.summary.info} hint="Worth noting" index={2} />
          <HeadlineCard icon={<Shield className="w-5 h-5" />} accent="green" label="Suppressed" count={data.summary.suppressed_total} hint="Acknowledged with reason" index={3} />
        </section>
      )}

      {data && (
        <section>
          <SectionHeader kicker="Distribution" title="Where the flags are" subtitle="Which rule types fire most, and which entities carry the load." />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div {...popIn(0)} className="surface-paper p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
                  <Filter className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">By rule type</h3>
              </div>
              {byType.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-[var(--text-tertiary)]">No anomalies in scope.</div>
              ) : (
                <ul className="space-y-2.5">
                  {byType.map((r, i) => {
                    const max = byType[0]?.count ?? 1
                    const pct = Math.round((r.count / max) * 100)
                    return (
                      <li key={r.type}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">{labelForType(r.type)}</span>
                          <span className="text-[12px] font-bold tabular-nums text-[var(--text-primary)]">{r.count}</span>
                        </div>
                        <div className="h-[5px] rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full"
                            style={{ background: 'var(--color-brand)' }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </motion.div>

            <motion.div {...popIn(1)} className="surface-paper p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
                  <Activity className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">Top entities by flag count</h3>
              </div>
              {topEntities.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-[var(--text-tertiary)]">No anomalies in scope.</div>
              ) : (
                <ul className="space-y-2">
                  {topEntities.map((e, i) => {
                    const max = topEntities[0]?.count ?? 1
                    const pct = Math.round((e.count / max) * 100)
                    return (
                      <motion.li key={e.entity} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.03 }}>
                        <div className="flex items-baseline justify-between mb-1 gap-3">
                          <span className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">{e.entity}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {e.critical > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums" style={{ background: 'var(--accent-red-light)', color: 'var(--accent-red)' }}>{e.critical} crit</span>}
                            <span className="text-[12px] font-bold tabular-nums text-[var(--text-primary)]">{e.count}</span>
                          </div>
                        </div>
                        <div className="h-[4px] rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.03 }} className="h-full rounded-full" style={{ background: e.critical > 0 ? 'var(--accent-red)' : 'var(--color-brand)' }} />
                        </div>
                      </motion.li>
                    )
                  })}
                </ul>
              )}
            </motion.div>
          </div>
        </section>
      )}

      <section>
        <SectionHeader kicker="Method" title="The nine rules" subtitle="Every check here is one an external auditor would run by hand. No black boxes, no AI hype — just statistically sound industry-standard checks." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {RULES.map((r, i) => (
            <motion.div key={r.type} {...riseIn(i)} className="surface-paper p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: r.bg, color: r.fg }}>
                  <r.icon className="w-3.5 h-3.5" />
                </span>
                <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-[var(--text-tertiary)]">{r.severity}</div>
              </div>
              <h4 className="text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{r.title}</h4>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          kicker="Triage"
          title="Investigation queue"
          subtitle="Per-anomaly workflow: investigate, resolve, or dismiss. Status changes are logged to the audit trail."
        />
        <div className="surface-paper overflow-hidden">
          {filteredAnomalies.length === 0 ? (
            <div className="py-12 text-center text-[12.5px] text-[var(--text-tertiary)]">
              No anomalies match these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[820px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2 sticky left-0 bg-[var(--bg-primary)] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">Title</th>
                  <th className="px-3 py-2">Facility</th>
                  <th className="px-3 py-2">Metric</th>
                  <th className="px-3 py-2 text-right">Expected → Actual</th>
                  <th className="px-3 py-2 text-right">Δ%</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnomalies.slice(0, 50).map(a => {
                  const key = `${a.assignment_id}|${a.anomaly_type}`
                  const status = statuses[key] ?? 'open'
                  const sev = a.severity
                  const sevBg =
                    sev === 'critical' ? 'var(--accent-red-light)' :
                    sev === 'warn' ? 'var(--accent-amber-light)' : 'var(--accent-blue-light)'
                  const sevFg =
                    sev === 'critical' ? 'var(--accent-red)' :
                    sev === 'warn' ? 'var(--accent-amber)' : 'var(--accent-blue)'
                  const isBusy = busyKey === key
                  return (
                    <tr key={key} className="group/row border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2">
                        <span className="chip" style={{ background: sevBg, color: sevFg, fontWeight: 600 }}>{sev}</span>
                      </td>
                      <td className="px-3 py-2 sticky left-0 bg-[var(--bg-primary)] group-hover/row:bg-[var(--bg-secondary)] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                        <div className="font-semibold text-[var(--text-primary)]">{a.headline}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">{labelForType(a.anomaly_type)}</div>
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{a.entity_name}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{a.gri_code}</span>
                        <div className="text-[var(--text-secondary)]">{a.line_item}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                        {a.prior !== null ? a.prior.toLocaleString() : '—'} → {a.current !== null ? a.current.toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {a.delta_pct === null ? '—' : `${a.delta_pct > 0 ? '+' : ''}${a.delta_pct.toFixed(1)}%`}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill value={status} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            disabled={isBusy}
                            onClick={() => setStatus(a, 'investigating')}
                            className="chip inline-flex items-center gap-1"
                            title="Mark as investigating"
                          >
                            <Eye className="w-3 h-3" /> Investigate
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => setStatus(a, 'resolved')}
                            className="chip inline-flex items-center gap-1"
                            title="Mark as resolved"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Resolve
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => setDismissTarget(a)}
                            className="chip inline-flex items-center gap-1"
                            title="Dismiss with a reason"
                          >
                            <XCircle className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </section>

      <section>
        <PersistedAnomaliesPanel />
      </section>

      <section>
        <SectionHeader kicker="Feed" title="Live anomaly feed" subtitle="Sorted by severity. Open any flag to land on the disclosure. Suppress with a reason to mark acknowledged." />
        <AnomalyFeed scope={scope} limit={100} title="All flagged disclosures" />
      </section>

      {dismissTarget && (
        <DismissWithReasonModal
          anomaly={dismissTarget}
          onCancel={() => setDismissTarget(null)}
          onConfirm={(reason) => handleDismiss(dismissTarget, reason)}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Dismiss-with-reason modal — captured rationale gets stored as the
// `note` on /api/org action=update-anomaly-status, audit-logged server-side.
// Reviewers must enter ≥10 chars so dismissals are never silent.
// ──────────────────────────────────────────────────────────────
function DismissWithReasonModal({
  anomaly, onCancel, onConfirm,
}: {
  anomaly: Anomaly
  onCancel: () => void
  onConfirm: (reason: string) => Promise<void> | void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const tooShort = reason.trim().length < 10

  const submit = async () => {
    if (tooShort || busy) return
    setBusy(true); setErr(null)
    try {
      await onConfirm(reason.trim())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not dismiss')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onCancel}>
      <div className="surface-paper w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-amber-light)', color: 'var(--accent-amber)' }}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">Dismiss anomaly</h3>
              <p className="text-[11.5px] text-[var(--text-tertiary)]">{anomaly.headline}</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"><XCircle className="w-4 h-4" /></button>
        </header>
        <div className="p-5 space-y-3">
          <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
            Reviewers must record why this anomaly can be ignored. The reason is logged to the audit
            trail and attached to the persisted status row.
          </p>
          <label className="block">
            <span className="block text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)] mb-1.5">Reason (minimum 10 characters)</span>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              autoFocus
              placeholder="e.g. Spike caused by acquisition of new subsidiary in Q3; confirmed legitimate"
              className="w-full px-3.5 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)] resize-none"
            />
            <span className={`block text-[11px] mt-1 ${tooShort ? 'text-[var(--accent-amber)]' : 'text-[var(--text-tertiary)]'}`}>
              {reason.trim().length} / 10 chars min
            </span>
          </label>
          {err && (
            <div className="p-2 rounded-[8px] bg-red-500/10 border border-red-500/30 text-red-300 text-[11.5px]">{err}</div>
          )}
        </div>
        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)]">
          <button onClick={onCancel} disabled={busy} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer disabled:opacity-60">Cancel</button>
          <button onClick={submit} disabled={tooShort || busy} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--status-reject)] text-white text-[13px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Dismiss with reason
          </button>
        </footer>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Persisted anomalies + AI explanation panel
//
// Pulls the DB-stored `anomalies` rows (long-lived, UUID-keyed) and lets the
// caller request a Claude-generated narrative for any row. Narrative is
// cached server-side on the row, so re-opening the panel is free.
// ──────────────────────────────────────────────────────────────

function PersistedAnomaliesPanel() {
  const [rows, setRows] = useState<AiAnomalyListItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const integrations = useIntegrationStatus()
  const aiUnavailable = !integrations.loading && !integrations.ai
  // Per-row narrative cache: { [id]: { text, generatedAt, loading, error } }
  const [narratives, setNarratives] = useState<Record<string, { text: string; generatedAt: string | null; loading: boolean; error: string | null; cached: boolean }>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ai.listAnomaliesForNarration()
      .then(r => { if (!cancelled) { setRows(r.anomalies); setLoading(false) } })
      .catch(e => { if (!cancelled) { setErr(e instanceof Error ? e.message : 'Load failed'); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  // Hydrate already-cached narratives from the list response so the panel
  // shows instantly with no extra round-trip.
  useEffect(() => {
    if (!rows) return
    setNarratives(prev => {
      const next = { ...prev }
      for (const r of rows) {
        if (r.ai_narrative && !next[r.id]) {
          next[r.id] = { text: r.ai_narrative, generatedAt: r.ai_narrative_generated_at, loading: false, error: null, cached: true }
        }
      }
      return next
    })
  }, [rows])

  const handleExplain = async (anomalyId: string, regenerate = false) => {
    setOpenId(anomalyId)
    const existing = narratives[anomalyId]
    if (existing && !regenerate && !existing.error) return
    setNarratives(s => ({ ...s, [anomalyId]: { text: existing?.text ?? '', generatedAt: existing?.generatedAt ?? null, loading: true, error: null, cached: existing?.cached ?? false } }))
    try {
      const r = await ai.narrateAnomaly(anomalyId, regenerate)
      setNarratives(s => ({ ...s, [anomalyId]: { text: r.narrative, generatedAt: r.generatedAt, loading: false, error: null, cached: r.cached } }))
      // Also reflect on the row so the "Last updated" hint is fresh.
      setRows(rs => rs ? rs.map(row => row.id === anomalyId ? { ...row, ai_narrative: r.narrative, ai_narrative_generated_at: r.generatedAt } : row) : rs)
    } catch (e) {
      const errMsg = isUnconfiguredError(e)
        ? 'AI is not configured. Ask an admin to set ANTHROPIC_API_KEY.'
        : e instanceof Error ? e.message : 'AI request failed'
      setNarratives(s => ({ ...s, [anomalyId]: { text: '', generatedAt: null, loading: false, error: errMsg, cached: false } }))
    }
  }

  const handleCopy = async (anomalyId: string) => {
    const n = narratives[anomalyId]
    if (!n?.text) return
    try {
      await navigator.clipboard.writeText(n.text)
      setCopiedId(anomalyId)
      setTimeout(() => setCopiedId(cur => cur === anomalyId ? null : cur), 1500)
    } catch {
      // Clipboard API can be unavailable in some browsers / sandboxes — silently
      // ignore so the rest of the panel keeps working.
    }
  }

  return (
    <>
      <SectionHeader
        kicker="AI"
        title="Explain with AI"
        subtitle="Persisted anomalies with optional Claude-generated narratives. Click the sparkle to expand a plain-English explanation grounded in the underlying activity data."
      />
      {err && <div className="surface-paper p-4 text-[var(--accent-red)]">{err}</div>}
      {aiUnavailable && (
        <div className="surface-paper p-3 flex items-start gap-2 border-l-2 border-amber-400/40 bg-amber-400/5 mb-2" role="status">
          <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-[12.5px] text-amber-300 leading-relaxed">
            <span className="font-semibold">AI narration is disabled.</span>{' '}
            Ask an admin to set <code className="font-mono">ANTHROPIC_API_KEY</code> in the server environment to
            generate plain-English explanations. Previously-generated narratives below remain viewable.
          </div>
        </div>
      )}
      <div className="surface-paper overflow-hidden">
        {loading ? (
          <div className="py-8 text-center text-[12.5px] text-[var(--text-tertiary)]">Loading anomalies…</div>
        ) : !rows || rows.length === 0 ? (
          <div className="py-12 text-center text-[12.5px] text-[var(--text-tertiary)]">No persisted anomalies in this workspace.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[720px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2 sticky left-0 bg-[var(--bg-primary)] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">Title / Facility</th>
                <th className="px-3 py-2">Metric</th>
                <th className="px-3 py-2 text-right">Expected → Actual</th>
                <th className="px-3 py-2 text-right">Δ%</th>
                <th className="px-3 py-2 text-right">AI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const sev = r.severity
                const sevBg = sev === 'critical' ? 'var(--accent-red-light)' : sev === 'warning' ? 'var(--accent-amber-light)' : 'var(--accent-blue-light)'
                const sevFg = sev === 'critical' ? 'var(--accent-red)' : sev === 'warning' ? 'var(--accent-amber)' : 'var(--accent-blue)'
                const isOpen = openId === r.id
                const n = narratives[r.id]
                return (
                  <Fragment key={r.id}>
                    <tr className="group/persisted border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                      <td className="px-3 py-2">
                        <span className="chip" style={{ background: sevBg, color: sevFg, fontWeight: 600 }}>{sev}</span>
                      </td>
                      <td className="px-3 py-2 sticky left-0 bg-[var(--bg-primary)] group-hover/persisted:bg-[var(--bg-secondary)] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                        <div className="font-semibold text-[var(--text-primary)]">{r.title}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">{r.facility_name ?? 'No facility'} · Scope {r.scope ?? '—'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{r.metric ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                        {(() => {
                          const ev = r.expected_value == null ? null : Number(r.expected_value)
                          const av = r.actual_value == null ? null : Number(r.actual_value)
                          const left = ev == null || !Number.isFinite(ev) ? '—' : ev.toLocaleString()
                          const right = av == null || !Number.isFinite(av) ? '—' : av.toLocaleString()
                          return `${left} → ${right}`
                        })()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(() => {
                          const d = r.deviation_pct == null ? null : Number(r.deviation_pct)
                          if (d == null || !Number.isFinite(d)) return '—'
                          return `${d > 0 ? '+' : ''}${d.toFixed(1)}%`
                        })()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(() => {
                          // When AI is unconfigured and there's no cached narrative on this row,
                          // disable the trigger entirely (with tooltip). Cached narratives can
                          // still be opened so existing explanations remain accessible.
                          const hasCached = !!r.ai_narrative
                          const disabledForAi = aiUnavailable && !hasCached
                          return (
                            <button
                              type="button"
                              className="chip inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => {
                                if (isOpen) { setOpenId(null); return }
                                handleExplain(r.id, false)
                              }}
                              disabled={disabledForAi}
                              aria-expanded={isOpen}
                              aria-controls={`ai-panel-${r.id}`}
                              title={disabledForAi ? 'AI is not configured. Ask an admin to set ANTHROPIC_API_KEY.' : 'Explain with AI'}
                              aria-label={disabledForAi ? 'AI is not configured. Ask an admin to set ANTHROPIC_API_KEY.' : 'Explain with AI'}
                            >
                              {disabledForAi ? <Lock className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                              {disabledForAi ? 'AI off' : isOpen ? 'Hide' : 'Explain'}
                            </button>
                          )
                        })()}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-[var(--border-subtle)]">
                        <td colSpan={6} className="p-0">
                          <div
                            id={`ai-panel-${r.id}`}
                            className="p-4 m-3 rounded-[10px]"
                            style={{
                              background: 'var(--accent-purple-light, rgba(120,85,200,0.08))',
                              borderLeft: '3px solid var(--accent-purple, #7855c8)',
                            }}
                          >
                            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] font-bold" style={{ color: 'var(--accent-purple, #7855c8)' }}>
                                <Sparkles className="w-3.5 h-3.5" /> AI explanation
                              </div>
                              <div className="flex items-center gap-2">
                                {n?.text && !n.loading && (
                                  <button
                                    type="button"
                                    className="chip inline-flex items-center gap-1"
                                    onClick={() => handleCopy(r.id)}
                                    title="Copy narrative"
                                  >
                                    {copiedId === r.id ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                                  </button>
                                )}
                                {n?.text && !n.loading && (
                                  <button
                                    type="button"
                                    className="chip inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleExplain(r.id, true)}
                                    disabled={aiUnavailable}
                                    title={aiUnavailable ? 'AI is not configured. Ask an admin to set ANTHROPIC_API_KEY.' : 'Regenerate narrative'}
                                  >
                                    {aiUnavailable ? <Lock className="w-3 h-3" /> : <RotateCw className="w-3 h-3" />}
                                    Regenerate
                                  </button>
                                )}
                              </div>
                            </div>
                            {n?.loading ? (
                              <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating narrative…
                              </div>
                            ) : n?.error ? (
                              <div className="text-[12.5px] text-[var(--accent-red)]">{n.error}</div>
                            ) : n?.text ? (
                              <>
                                <p className="text-[13px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">{n.text}</p>
                                <div className="mt-2 text-[10.5px] text-[var(--text-tertiary)] italic">
                                  Generated by Claude. Verify before sharing.
                                  {n.generatedAt && <> · Last updated {formatRelative(n.generatedAt)}</>}
                                </div>
                              </>
                            ) : (
                              <div className="text-[12.5px] text-[var(--text-secondary)]">No narrative yet.</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  )
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (!isFinite(then)) return ''
  const diffMs = Date.now() - then
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function StatusPill({ value }: { value: AnomalyStatusValue }) {
  const map: Record<AnomalyStatusValue, { bg: string; fg: string; label: string }> = {
    open:          { bg: 'var(--bg-tertiary)',      fg: 'var(--text-secondary)', label: 'Open' },
    investigating: { bg: 'var(--accent-blue-light)',fg: 'var(--accent-blue)',    label: 'Investigating' },
    resolved:      { bg: 'var(--accent-green-light)',fg: 'var(--status-ok)',     label: 'Resolved' },
    dismissed:     { bg: 'var(--bg-tertiary)',      fg: 'var(--text-tertiary)',  label: 'Dismissed' },
  }
  const s = map[value]
  return (
    <span className="chip inline-flex items-center gap-1" style={{ background: s.bg, color: s.fg }}>
      <CircleDot className="w-3 h-3" /> {s.label}
    </span>
  )
}

function HeadlineCard({ icon, accent, label, count, hint, index }: { icon: React.ReactNode; accent: 'red' | 'amber' | 'blue' | 'green'; label: string; count: number; hint: string; index: number }) {
  const palette = {
    red: { bg: 'var(--accent-red-light)', fg: 'var(--accent-red)' },
    amber: { bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' },
    blue: { bg: 'var(--accent-blue-light)', fg: 'var(--accent-blue)' },
    green: { bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' },
  }[accent]
  return (
    <motion.div {...popIn(index)} className="surface-paper p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: palette.bg, color: palette.fg }}>
          {icon}
        </span>
        <span className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: palette.fg }}>{label}</span>
      </div>
      <div className="text-[34px] leading-none font-bold tabular-nums text-[var(--text-primary)] tracking-[-0.02em]">{count}</div>
      <div className="text-[11.5px] text-[var(--text-tertiary)] mt-1.5">{hint}</div>
    </motion.div>
  )
}

function ScopeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`chip ${active ? 'chip-active' : ''}`}>{children}</button>
  )
}

function labelForType(t: AnomalyType): string {
  switch (t) {
    case 'yoy_spike': return 'YoY variance spike'
    case 'magnitude_jump': return 'Magnitude jump'
    case 'z_score_outlier': return 'Statistical outlier'
    case 'trend_break': return 'Trend break'
    case 'unit_change': return 'Unit mismatch'
    case 'missing_evidence': return 'Missing evidence'
    case 'late_submission': return 'Late submission'
    case 'narrative_gap': return 'Narrative gap'
    case 'peer_deviation': return 'Peer deviation'
  }
}

const RULES: Array<{ type: AnomalyType; title: string; desc: string; severity: string; icon: typeof AlertOctagon; bg: string; fg: string }> = [
  { type: 'yoy_spike',       title: 'Year-over-year variance',  desc: 'Current value vs the most recent historical filing. Warns above ±20%, critical above ±50%.',                                      severity: 'Critical / Warn', icon: TrendingUp,     bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'magnitude_jump',  title: 'Magnitude jump',           desc: '8×+ (or ≤0.125×) the 4-year historical average — catches unit typos (tonnes vs kg, m³ vs litres).',                             severity: 'Critical',        icon: AlertOctagon,   bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'z_score_outlier', title: 'Statistical outlier',      desc: 'Z-score against 4-year baseline. Warn at |z|>2, critical at |z|>3.',                                                             severity: 'Critical / Warn', icon: Activity,       bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'trend_break',     title: 'Trend break',              desc: 'Reverses a 3-year monotonic direction by more than 10%. Worth a narrative explanation.',                                         severity: 'Info / Warn',     icon: TrendingUp,     bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' },
  { type: 'unit_change',     title: 'Unit mismatch',            desc: 'Current unit string differs from the unit used in historical filings. Confirm conversion.',                                     severity: 'Warn',            icon: AlertTriangle,  bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' },
  { type: 'missing_evidence',title: 'Missing evidence',         desc: 'Submitted, reviewed, or approved numeric entry with no evidence file attached. Audit fails without this.',                        severity: 'Critical / Warn', icon: FileText,       bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'late_submission', title: 'Late submission',          desc: 'Submitted after the recorded due date. Tracked for process improvement.',                                                         severity: 'Info / Warn',     icon: CheckCircle2,   bg: 'var(--accent-blue-light)',  fg: 'var(--accent-blue)' },
  { type: 'narrative_gap',   title: 'Narrative gap',            desc: 'Narrative disclosure approved with empty narrative_body. Disclosure will not appear in the published report.',                    severity: 'Critical',        icon: FileText,       bg: 'var(--accent-red-light)',   fg: 'var(--accent-red)' },
  { type: 'peer_deviation',  title: 'Peer plant deviation',     desc: 'Plant value sits >2σ from sibling plants for the same disclosure — boundary or operating difference.',                            severity: 'Warn',            icon: Activity,       bg: 'var(--accent-amber-light)', fg: 'var(--accent-amber)' },
]
